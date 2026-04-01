# Party Review 四层防线执行协议

> **版本**：v1.3 | **适用场景**：SPM / SGA / SGE 各阶段 Review Gate
> **引用方**：各 Skill 的 Party Review Gate 段落

---

## §0：上下文交付清单（调用方必读）

> **此段面向调用 @doc-reviewer 的父 agent**。
> doc-reviewer 在独立上下文中启动，无法访问父 agent 已加载的文件。
> 在发起审查前，**必须**将以下文件交付给 doc-reviewer。
> 缺失文件 → **停止调用**，向 USER 报告缺失项。

### Gate 1 (SPM → doc-reviewer)

| # | 交付内容 | 路径 |
|---|---------|------|
| 1 | 审查协议（本文件） | `.agents/skills/_shared/review-protocol.md` |
| 2 | 角色定义 | `.agents/skills/_shared/personas/` 下本次激活的角色文件 |
| 3 | PRD 文件 | `${paths.features_dir}/[name]-PRD.md` |
| 4 | User Stories | `${paths.specs_dir}/[name]-user-stories.md` |
| 5 | 项目约束摘要 | CLAUDE.md §版本边界 + §模块边界（≤30 行摘要） |
| 6 | 前置 review（如有） | 上一 Phase 的 review 报告（延续 WARN 追踪时） |

### Gate 2 (SGA → doc-reviewer)

| # | 交付内容 | 路径 |
|---|---------|------|
| 1 | 审查协议（本文件） | `.agents/skills/_shared/review-protocol.md` |
| 2 | 角色定义 | `.agents/skills/_shared/personas/` 下本次激活的角色文件 |
| 3 | TDD 文件 | `${paths.specs_dir}/[name]-TDD.md` |
| 4 | PRD 文件（已签章） | `${paths.features_dir}/[name]-PRD.md` |
| 5 | 架构索引 | `${paths.master_arch}` |
| 6 | Pipeline + 依赖 | `${paths.arch_pipeline}` + `${paths.arch_dependencies}` |
| 7 | Gate 1 review | `${paths.pipeline_dir}/phaseX/review-g1.md` |

### Gate 3 (SGE → doc-reviewer)

| # | 交付内容 | 路径 |
|---|---------|------|
| 1 | 审查协议（本文件） | `.agents/skills/_shared/review-protocol.md` |
| 2 | 角色定义 | `.agents/skills/_shared/personas/` 下本次激活的角色文件 |
| 3 | TDD 文件 | `${paths.specs_dir}/[name]-TDD.md` |
| 4 | 代码变更清单 | 文件名 + 变更摘要（由 SGE 编译） |
| 5 | 验证脚本输出 | tsc / lint / regression / 专项测试结果摘要 |
| 6 | Gate 2 review | `${paths.pipeline_dir}/phaseX/review-g2.md` |

> **已知限制**：`.agents/` 路径在 project.yaml 中无 paths 条目，使用硬编码路径。
> 这是可接受的 — `.agents/` 目录结构在项目间固定。

---

## 执行流程

```
L0 Content Traceability → L1 维度穷举签字 → L2 CoVe 证据验证（仅 WARN/BLOCK）→ L3 结构化辩论（仅评审者矛盾）
```

---

## §0.1：变更模式→检查项速查

> 审查时先识别变更模式，再按对应检查项逐一验证。

| 变更模式 | 必检项 |
|---------|-------|
| 新增 enum/union 成员 | 运行时穷举（switch/includes）是否遗漏新值 |
| 新增 GameState 字段 | 存档迁移 + createDefault + schema.md 注册 |
| 修改函数签名 | 全量调用方 grep，确认全部适配 |
| 新增 Handler | pipeline.md 注册 + dependencies.md 依赖行 |
| 引入运行时数据结构 | init→write→read→cleanup→persist 生命周期完整性 |
| 修改现有逻辑 | 向后兼容 + 旧调用方行为验证 |
| 新增 API 参数 | 参数数 ≥6 → 建议 options 对象重构 |

---

## L0：Content Traceability Pre-Check（必执行）

> **在 L1 维度审查之前，必须先执行此步骤。**
> 此步骤是客观验证（查文件），不依赖主观判断。
> **适用条件**：仅当审查对象包含 User Story（含 Data Anchor 列）时执行。SGA（TDD 审查）和 SGE（代码审查）跳过 L0，直接进入 L1。

1. 列出本次 Review 对象（PRD + User Stories）中所有 **Data Anchor 引用**
2. 对每个引用，执行追溯：
   - `PRD §X.X` → 打开 PRD 对应章节，确认内容为完整数据表（≥3 行实际数据）
   - `内联` → 确认 AC Then 列中包含完整枚举
   - `脚本 Case #N` → 确认脚本文件存在且包含对应断言
3. 追溯失败的条目直接标记为 🔴 BLOCK（不进入 L1）
4. 检查 User Story 中**引用可枚举数据但缺少 Data Anchor**的 AC → 标记为 🔴 BLOCK

**产出**：Content Traceability 检查表

```markdown
| Story# | AC# | Data Anchor | 追溯结果 | 状态 |
|--------|-----|-------------|---------|------|
| 1 | 3 | PRD §5.3 TRAIT_REGISTRY | 12 个完整 TraitDef 定义 | ✅ |
| 1 | 5 | 脚本 Case #7 | 断言存在且覆盖迁移逻辑 | ✅ |
| 3 | 2 | PRD §5.4 映射表 | 仅有概要，无完整映射 | 🔴 |
| 3 | 1 | — (缺失) | AC 引用了候选情绪但无锚定 | 🔴 |
```

> L0 有任意 🔴 → 整体 Review 判定为 **BLOCKED**，要求补全后重新提交。

---

## L1：维度穷举签字

1. 根据当前 Skill 的 **必选 + 按需角色配置**，加载对应 `personas/*.md`
2. 每个角色按自身维度清单**逐条**审查产出物
3. 每条维度输出判定：

| 判定 | 含义 | 后续动作 |
|:----:|------|---------|
| ✅ PASS | 无问题 | 无需后续 |
| ⚠️ WARN | 存在风险但不阻塞 | 进入 L2 CoVe |
| 🔴 BLOCK | 存在硬伤必须修复 | 进入 L2 CoVe → 修复后重新审查 |

4. 所有角色审查完毕后，汇总全部 WARN 和 BLOCK 条目

### 审查独立性要求

> 对抗"自编自审"场景下的确认偏误。

1. **PASS 需要证据**：每个 ✅ PASS 判定的说明栏必须包含至少一个
   **证据锚点**（代码行号 / 文档章节号 / grep 结果 / 量化数据）。
   "没发现问题"不是证据——"检查了 X 文件 L42-L58，确认有 fallback 处理"才是。

2. **禁止复述作者结论**：审查说明不得照搬 SPM/SGA/SGE 步骤中
   已产出的分析文本。必须用审查者自己的话重新表述判断。

---

## L2：CoVe 证据验证

> **仅对 WARN / BLOCK 条目触发**，PASS 条目不进入此层

执行 `_shared/cove-protocol.md` 中的四步法：
1. 还原原始产出（被审查的内容）
2. 对该条 WARN/BLOCK 生成 2-3 个验证问题
3. **独立回答**验证问题（不参考原结论）
4. 对比独立答案与原结论，判定：
   - 一致 → 维持原判定
   - 矛盾 → 升级判定（WARN→BLOCK 或 BLOCK 确认）
   - **无证据支撑** → 移除该发现（降为 PASS）
   - **降级要求**：将 WARN 降为 PASS 时，必须提供证伪原 WARN 的具体证据（代码/数据），"影响可控""概率很低"等主观判断不构成降级依据

---

## L3：结构化辩论

> **仅在评审者之间出现矛盾时触发**
> 例：R1 魔鬼PM 判定 PASS，R3 数值策划判定 BLOCK

执行流程：
1. 列出矛盾双方的判定和理由
2. 各自提供**代码/数据级证据**支撑自己的立场
3. 以证据强度判定最终结果：
   - 有代码实锤的一方胜出
   - 双方均有证据 → 取较严格判定（BLOCK > WARN > PASS）
   - 双方均无证据 → 标注 `⚠️ INCONCLUSIVE`，提交 USER 决策

---

## 汇总输出格式

```markdown
## Party Review 报告

| # | 角色 | 维度 | 判定 | 说明 | CoVe 结果 |
|---|------|------|:----:|------|-----------|
| 1 | R1 魔鬼PM | ROI | ✅ | [证据锚点 + 分析] | — |
| 2 | R3 数值策划 | 漏斗平衡 | ⚠️ | [具体问题] | 维持 WARN |
| 3 | R5 偏执架构师 | 耦合度 | 🔴 | [具体问题] | 确认 BLOCK |

### 最终判定

- ✅ **PASS**：所有条目均为 PASS → 可进入下一阶段
- ⚠️ **CONDITIONAL PASS**：存在 WARN 但无 BLOCK → 可进入下一阶段，WARN 项记入技术债务
- 🔴 **BLOCKED**：存在 BLOCK → 必须修复后重新执行 Review
```

---

## 判定完整性校验（硬约束）

> 此步骤在写入审查报告文件**之前**必须执行。违反此约束的报告**无效**，必须重写。

1. 统计所有 L1 维度判定中 BLOCK / WARN / PASS 的数量
2. 根据统计结果确定唯一合法判定：

| 统计结果 | 唯一合法判定 |
|---------|------------|
| BLOCK > 0 | 🔴 BLOCKED |
| BLOCK = 0, WARN > 0 | ⚠️ CONDITIONAL PASS |
| BLOCK = 0, WARN = 0 | ✅ PASS |

3. 写入前自检 — 以下任一情况出现则报告无效：
   - 头部判定为 "CONDITIONAL PASS" 但统计行 BLOCK > 0
   - 头部判定为 "PASS" 但统计行 WARN > 0
   - 统计数字与 L1 表格中实际 BLOCK/WARN 行数不一致

---

## 按需角色激活规则

具体激活条件由各 Skill 定义。通用原则：

| 条件 | 激活角色 |
|------|---------|
| 涉及核心体验变更（新操作/改反馈/改惩罚） | R2 资深玩家 |
| 涉及跨版本影响（新资源/改路线图/L 复杂度） | R4 项目经理 |
