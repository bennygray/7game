# /SSA Skill 完整设计计划（v3 — 融合六方法论 + 行业调研）

> **版本**：v3.0
> **日期**：2026-04-02
> **变更**：v2 → v3 融入 Spec Interview 对话模式、Self-Interview 质量检查、IntentSpec Stop Rules、Living Spec 回更机制

---

## 一、调研基础

### 核心方法论绑定

| SSA Step | 主方法论 | 增强方法论（v3 新增） |
|----------|---------|-------------------|
| Step 1 愿景对齐 | Lean Inception · Product Vision + Assumption Mapping | + **Spec Interview 对话模式**（AI 问 USER 答，不是 AI 独白） |
| Step 2 形态探索 | Lean Inception · Is/Isn't/Does/Doesn't + Shape Up · Appetite | + **Spec Interview 对话模式** |
| Step 3 望远镜收缩 | Jeff Patton · Walking Skeleton + Release Slices | + **Spec Interview 对话模式** |
| Step 4 Gap 对比 | Gap Analysis 三栏法 + 代码 grep 验证 | + **Logical Certificate 证据要求**（每个判定附 grep 证据） |
| Step 5 Phase 规划 | DAG + Scope Hammering + Feature Sequencer | + **Self-Interview 质量检查**（产出后自省） |
| Step 6 Phase Brief | Shape Up · Pitch | + **IntentSpec Stop Rules / Health Metrics** |
| 跨步 | — | + **Living Spec 回更机制**（Phase 完成后回更计划） |

### 来源汇总

| 方法论 | 来源 | 核心贡献 |
|--------|------|---------|
| Lean Inception | Paulo Caroli | Product Vision 模板 + Is/Isn't + Feature Sequencer |
| Shape Up | Basecamp · Ryan Singer | Appetite 投资思维 + Pitch 格式 + Scope Hammering |
| User Story Mapping | Jeff Patton | Walking Skeleton + Release Slices 横切法 |
| Assumption Mapping | David Bland | 重要性×确定性 2×2 矩阵 → 识别最高风险假设 |
| Spec Interview | 2026 Agentic Dev 社区 | AI-问-USER-答的多轮对话模式，替代 AI 独白 |
| Self-Interview | 2026 Agentic Dev 社区 | 产出后用 5 维度自省发现遗漏 |
| Intent Specification | Pathmode.io IntentSpec | Stop Rules + Health Metrics 补全"什么时候停" |
| Logical Certificate | Meta Research | 每个判定必须附带推理链和证据锚点 |
| Living Spec | Augment Code Intent | 规格文档在生命周期持续双向更新 |
| Gap Analysis | 行业标准 | Current/Target/Delta 三栏法 |

---

## 二、定位与 Pipeline 集成

### 解决什么问题

| 痛点 | SSA 怎么解决 | 靠哪个 Step + 方法 |
|------|-------------|:---------:|
| USER 自己心算 gap | AI 自动对比已有 vs 需要 | Step 4（Gap Analysis + Logical Certificate） |
| AI 拿到一句话就写 PRD | 先对齐愿景再展开 | Step 1（Lean Inception + Spec Interview） |
| 做了才发现范围大 | 动手前暴露完整范围 | Step 2~3（Is/Isn't + Walking Skeleton） |
| Phase 边界不清 | 每个 Phase 有 IN/OUT/Stop Rules | Step 5+6（Scope Hammering + IntentSpec） |
| 做完一个 Phase 计划就过时 | Phase 计划随执行持续更新 | Living Spec 回更机制 |
| AI 产出看似完整实则遗漏 | 产出后强制自省 | Step 5（Self-Interview） |

### Pipeline 位置

```
USER 有新想法
      ↓
  /SSA（本 Skill）
      │ 执行模式：Spec Interview（AI 问 USER 答）
      ├── Step 1：愿景对齐
      ├── Step 2：形态探索
      ├── Step 3：望远镜收缩
      ├── Step 4：Gap 对比
      ├── Step 5：Phase 规划 + Self-Interview 自省
      └── Step 6：Phase Brief（含 Stop Rules）
               ↓
           /SPM（读取 Brief 作为输入）
               ↓
           /SGA → /SGE
               ↓
           完成后回更 SSA Phase 计划（Living Spec）
```

### 短期 vs 长期

```
短期: SSA → (SPM → SGA → SGE) × N → 每完成一个回更 Phase 计划
中期: SSA → 全量 US → (SGA → SGE) × N
长期: SSA → 全量 US + 全量设计 → SGE × N
```

---

## 三、全局执行模式：Spec Interview

> **v3 核心变更**：Step 1~3 的执行模式从"AI 产出 → USER 确认"
> 改为"AI 提问 → USER 回答 → 多轮迭代 → AI 整理产出"。

### 执行规则

```markdown
### SSA 对话纪律（适用 Step 1~3）

1. **一次只问 1 个问题** — 禁止一次丢 5 个问题给 USER
2. **先问后整理** — 不得先输出大段分析再让 USER 确认
3. **聚焦 USER 没主动提到的维度** — 禁止纯确认性提问
   - ❌ "你说的执法堂就是审判系统对吗？"
   - ✅ "审判有时间限制吗？卷宗放 3 天不处理会怎样？"
4. **允许"不确定"** — 标记为 [待决]，不强迫 USER 当场给答案
5. **每个 Step 至少 3 轮问答**（简单需求）或 5 轮（复杂需求）
6. **苏格拉底增强**（仅 Step 2）：
   - 对 USER 选定的形态追问 1-2 个假设：
     "如果这个假设是错的呢？有没有更简单的方式？"
   - 禁止连续追问同一假设超过 2 轮（避免审讯感）
7. 每个 Step 对话结束后，AI 整理结构化产出 → USER 审阅确认
```

### 复杂度分级（控制访谈深度）

| 判定条件 | 命中 0 个 | 命中 1-2 个 | 命中 3 个 |
|---------|:-:|:-:|:-:|
| C1 涉及新 GameState 字段 | | | |
| C2 涉及 ≥2 个现有系统交互 | | | |
| C3 涉及 AI 决策/数值/概率 | | | |
| → 访谈深度 | **Lite**（每步 2-3 轮） | **Standard**（每步 3-5 轮） | **Full**（每步 5+ 轮 + 苏格拉底） |

---

## 四、Step 1：愿景对齐（Vision Alignment）

**方法论**：Lean Inception · Product Vision + Assumption Mapping + Spec Interview

### 输入

- USER 的高层想法（可以很模糊）
- MASTER-PRD、SOUL-VISION-ROADMAP、gap-analysis.md、handoff.md、feature-backlog.md

### 执行（Spec Interview 模式）

**1.1 AI 静默读取**（不输出给 USER）：

```
读取：project.yaml → MASTER-PRD → roadmap → gap-analysis → handoff → feature-backlog
内部形成对项目当前状态的理解
```

**1.2 愿景对齐对话**（和 USER 交互）：

```
第 1 轮：
AI: "我理解当前的核心假设是 [从 MASTER-PRD 提取]。
     你提出的 [USER 想法]，你觉得它和这个核心假设是什么关系？
     A) 直接延伸  B) 做了更好的补充  C) 新方向"

第 2 轮：
AI: "你说是 [A/B/C]。那我想确认一下，你这次的目标是
     [AI 的理解]，还是有不同的期望？"

第 3 轮+：
AI: 根据 USER 的回答，追问未覆盖的关键维度
    例："这个想法的成功标准是什么？你怎么判断它做成了？"
```

**1.3 假设映射**（Assumption Mapping）：

对话结束后，AI 整理假设表：

```markdown
### 假设映射

| # | 假设 | 重要性 | 确定性 | 风险等级 |
|---|------|:-----:|:-----:|:------:|
| 1 | [从对话中提取的假设] | 高 | 高 | 低 |
| 2 | [假设2] | 高 | 低 | ⚠️ 高 |
| 3 | [假设3] | 低 | 低 | 中 |

⚠️ 高风险项（高重要性 × 低确定性）= 需要早期验证（PoC Phase）

向 USER 确认："这些假设你同意吗？有遗漏的吗？"
```

### 产出

- 愿景对齐声明（1 段话）
- 假设映射表（含风险标注）

### 硬约束

- 必须有 USER 明确输入，不得 AI 自行决定
- 冲突必须显式标注
- 假设表的每一项必须可追溯到对话中的具体交流

---

## 五、Step 2：形态探索（Shape Exploration）

**方法论**：Lean Inception · Is/Isn't/Does/Doesn't + Shape Up · Appetite + Spec Interview + 苏格拉底假设挑战

### 执行（Spec Interview 模式）

**2.1 对话阶段**：

```
第 1 轮：
AI: "在开始想具体方案之前，先明确一下边界。
     [需求名] 一定要做的事是什么？一定不做的事是什么？"

第 2 轮：
AI: "你提到它要做 [X]。那 [Y] 呢？
     是本期需要还是可以留给后面？"

第 3 轮（苏格拉底，仅 Standard/Full 模式）：
AI: "你假设了 [Z] 是必须的。但如果不做 [Z]，
     核心体验还成立吗？"
```

**2.2 整理产出**：

```markdown
### Is / Isn't / Does / Doesn't 四象限

| 维度 | IS | ISN'T |
|------|-----|-------|
| **DOES** | [它做的事] | [它不做的事] |
| **IS** | [它是什么] | [它不是什么] |
```

```markdown
### 形态选项

**Appetite（你愿意投入多少？）**
→ 需要在对话中向 USER 确认

#### 形态 A：[名称]（小投入）
- 包含：[子系统列表]
- 体验：[玩家感受到什么]

#### 形态 B：[名称]（中投入）
- 在 A 基础上增加：[什么]
- 体验差异：[和 A 的区别]

#### 形态 C：[名称]（大投入 / 如适用）
- ...

#### 远期终极形态
- [不考虑限制的最终状态]
- 和本期关系：[子集/原型/方向不同]
```

### 硬约束

- 至少 2 种形态（防锁定偏差）
- 必须含远期终极形态
- 不做详细规则设计——只定义"形状"
- 苏格拉底追问不超过 2 轮（防审讯感）

---

## 六、Step 3：望远镜收缩（Telescope Scoping）

**方法论**：Jeff Patton · Walking Skeleton + Release Slices + Spec Interview

### 执行（Spec Interview 模式）

**3.1 对话：铺用户旅程骨架**

```
AI: "我们来走一遍用户的完整流程。
     玩家第一步做什么？"
USER: "[回答]"
AI: "然后呢？做完 [第一步] 之后系统会发生什么？"
USER: "[回答]"
（直到走完整条旅程）
```

**3.2 AI 整理骨架**：

```markdown
### 用户旅程骨架

[触发] → [操作1] → [操作2] → [结果] → [后续影响]
```

**3.3 对话：逐步分层**

```
AI: "骨架确认了。现在来分层。
     [操作1] 这一步，最简单的实现是什么？
     比如硬编码一种情况够不够？"
USER: "[回答]"
AI: "那什么时候需要做完整版的 [操作1]？
     完整版需要支持什么？"
```

**3.4 整理产出：分层表**

```markdown
### 分层切片

| 骨架步骤 | 层 0（Walking Skeleton） | 层 1（基础体验） | 层 2（目标形态） |
|---------|------------------------|----------------|----------------|
| [步骤1] | [最简实现] | [加什么] | [完整版] |
| [步骤2] | [最简实现] | [加什么] | [完整版] |
| ... | | | |

每层独立可验证：
- 层 0 验证：[端到端能跑通]
- 层 1 验证：[玩家能感受到意义]
- 层 2 验证：[完整目标体验]
```

**3.5 向 USER 征询**：做到哪一层算本期达标？

### 关键原则（来自 Patton）

- Walking Skeleton 必须**端到端覆盖所有骨架步骤**
- 层间关系是**加厚不是重做**
- 每层独立可验证

---

## 七、Step 4：Gap 对比（Gap Reconciliation）

**方法论**：Gap Analysis 三栏法 + **Logical Certificate 证据要求**

### 执行

**4.1 能力清单提取**

从 Step 3 的分层表中，提取"目标层"需要的所有能力。

**4.2 逐项验证（Logical Certificate 要求）**

对每项能力：
1. 查文档 → 判断来自哪个 Phase
2. **用 `grep` 搜索代码确认是否真实存在**
3. 分类 + 附带证据

```markdown
### Gap 对比 — [需求名] · 目标层 [X]

#### ✅ 已有（可复用）
| 能力 | 来源 Phase | 验证证据 | 可直接用/需微调 |
|------|-----------|---------|:---:|
| SoulEvent 总线 | Phase E | `grep "EventBus" src/` → 命中 soul-event.handler.ts:L12 | ✅ |
| 道风漂移接口 | Phase F0-α | `grep "applyDrift" src/` → 命中 idle-engine.ts:L340 | ⚠️ 需扩展 |

#### ⚠️ 部分存在
| 能力 | 有什么 | 差什么 | 扩展规模 |
|------|--------|--------|:---:|
| 道风漂移 | 碰面事件触发 | 审判事件触发 | S |

#### ❌ 完全缺失
| 能力 | 描述 | 规模 | 依赖 |
|------|------|:---:|------|
| 卷宗数据结构 | 违规记录的存储和检索 | M | GameState 扩展 |

#### 🔄 可顺带清偿的债务
| 编号 | 描述 | 关联 |
|------|------|------|
| FB-011 | 玩家干预权 | judge 命令扩展直接覆盖 |
```

### 硬约束

- **"已有" 判定必须附带 grep 证据**（Logical Certificate 要求）
- "部分存在" 必须说清"差什么"
- 禁止凭记忆或文档声称判定能力存在

---

## 八、Step 5：Phase 规划 + Self-Interview

**方法论**：DAG 拓扑排序 + Shape Up · Scope Hammering + Lean Inception · Feature Sequencer + **Self-Interview 质量检查**

### 执行

**5.1 构建依赖图**

```
从 Step 4 的 ⚠️ + ❌ 项提取依赖关系 → DAG
```

**5.2 分 Phase（Scope Hammering + Feature Sequencer 规则）**

- 无依赖项排最前
- 单 Phase 工时 ≤ appetite（超标就继续切 — Scope Hammering）
- 每 Phase 最多 3 个功能块（Feature Sequencer 容量控制）
- 高风险假设（Step 1 标 ⚠️ 的）对应的 Phase 排前面

**5.3 产出 Phase 计划**

```markdown
### Phase 执行计划 — [需求名]（Living Document）

**总计**：N 个 Phase | **目标层**：层 X | **预估总工时**：X 天
**关键路径**：Phase 1 → 2 → 3

| # | Phase 名 | IN | OUT | 依赖 | 规模 | 验证 | 状态 |
|---|---------|-----|-----|------|:---:|------|:---:|
| 1 | [名称] | [做什么] | [不做什么] | — | S | [验证方式] | 📋 待做 |
| 2 | [名称] | [做什么] | [不做什么] | #1 | M | [验证方式] | 📋 待做 |

### 路线图更新建议
- 插入位置：[在 roadmap 的哪里]
- 依赖/冲突：[与已规划 Phase 的关系]
```

**5.4 Self-Interview 质量检查**（★ v3 新增）

Phase 计划产出后，AI **必须**执行以下自省：

```markdown
### Phase 计划 Self-Interview

1. **遗漏检查**：
   Step 2 Is/Does 中列出的每个要做的事，是否都在某个 Phase 的 IN 中？
   - [逐项核对，标注 ✅/❌]

2. **依赖完整性**：
   有没有哪个 Phase 的前置依赖不在计划内？
   - [检查每个 Phase 的依赖列]

3. **风险对齐**：
   Step 1 标注的 ⚠️ 高风险假设，是否有对应的验证 Phase 排在前面？
   - [核对假设表 vs Phase 顺序]

4. **规模合理性**：
   有没有哪个 Phase 标了 S 但 IN 列表超过 3 项？
   - [重新审视，必要时拆分]

5. **OUT 项去向**：
   所有标为 OUT 的项，是否都有归宿（后续 Phase 或 feature-backlog）？
   - [逐项核对]

**发现的问题**：
- [问题1] → [修正措施]
- [问题2] → [修正措施]

> 发现问题后立即修正 Phase 计划，修正后再向 USER 展示。
```

### 硬约束

- Self-Interview 必须在向 USER 展示前完成
- Self-Interview 发现的问题必须修正后再展示（不是展示后再修）

---

## 九、Step 6：Phase Brief（含 IntentSpec 增强）

**方法论**：Shape Up · Pitch + **IntentSpec Stop Rules / Health Metrics**

### 产出格式

```markdown
### Phase Brief — [Phase 名称]

**Problem**（要解决什么）：
[一句话]

**Appetite**（投资多少）：
[S/M/L — 对应 X 天]

**Solution**（核心方案）：
- [要做的事 1]
- [要做的事 2]
- [要做的事 3]

**Rabbit Holes**（已知陷阱）：
- [陷阱 1]：[为什么是陷阱 + 建议绕法]
- [陷阱 2]：[...]

**No Gos**（明确不做）：
- [不做 1]（→ 留给 Phase [X]）
- [不做 2]（→ 登记 feature-backlog）

**Stop Rules**（★ v3 新增 — 什么时候喊停）：
- 如果实现中发现需要新增 2 个以上未计划的 handler → 停，回到 SSA 重评
- 如果工时超过 appetite 的 150% → 执行 Scope Hammering，从 Solution 列表砍
- 如果需要修改已完成 Phase 的架构 → 停，触发 BLOCKER-REPORT

**Health Metrics**（★ v3 新增 — 不可降级指标）：
- 回归测试必须全通过（`npm run test:regression` 退出码 0）
- 已有系统的功能不能被破坏：[列出关键系统]
- tsc 零错误

**验证标准**：
- [做完后怎么判定成功]

**SSA 上下文**：
- 愿景对齐：[引用 Step 1]
- 目标层级：层 [X]（共 N 层）
- Phase 计划位置：第 M/N 个
- 高风险假设：[从 Step 1 引用]

> ✅ USER 确认后 → 作为 /SPM 的输入
```

---

## 十、Living Spec 回更机制（★ v3 新增）

### 触发时机

每完成一个 Phase（SGE GATE 3 通过后），回更 SSA 的 Phase 计划。

### 回更内容

```markdown
### Phase 计划回更 — Phase [X] 完成后

| 更新项 | 更新内容 |
|--------|---------|
| Phase [X] 状态 | 📋 → ✅ |
| 计划 vs 实际 | 计划 [S] / 实际 [M] — 偏差原因：[...] |
| 新发现的 Gap | [如果执行中发现了新需求，追加到计划] |
| Phase 计划调整 | [后续 Phase 的 IN/OUT 是否需要因此调整] |
| 风险更新 | [Step 1 假设表中的项，哪些已验证，哪些仍不确定] |
```

### 谁来做？

- SGE Step 4（交接更新）新增一条：**更新 SSA Phase 计划**
- 或 USER 在下一次调用 /SSA 时触发重新评估

---

## 十一、触发与路由

| 场景 | 路由 |
|------|------|
| 新的系统级想法 | → /SSA |
| "重新规划接下来的工作" | → /SSA |
| "开始做 Phase X"（Brief 已存在） | → /SPM |
| 小功能/小改动 | → /SPM（直接） |
| 不确定时 | → /SSA |
| Phase 完成后发现新 Gap 需要重评 | → /SSA（Living Spec 回更） |

---

## 十二、产出物归档

| 产出物 | 路径 |
|--------|------|
| SSA 完整报告（Step 1~5） | `docs/project/scope/[name]-scope.md` |
| Phase 计划（Living Document） | `docs/project/scope/[name]-phases.md` |
| Phase Brief | `docs/pipeline/phaseX/phase-brief.md` |
| 路线图更新 | `${paths.roadmap}` |
| Gap 分析更新 | `gap-analysis.md` |
| 需求债务 | `${paths.feature_backlog}` |

---

## 十三、Gate 设计

SSA **不需要 Party Review**。

质量保证方式：
1. **Spec Interview**：每步都有 USER 参与和确认（不是 AI 独白）
2. **Self-Interview**：Step 5 产出后强制自省
3. **Logical Certificate**：Step 4 的判定必须附证据
4. **Living Spec**：Phase 完成后回更计划，防止计划腐化

```
Step 1 → USER 确认愿景 + 假设表
Step 2 → USER 选定形态 + Is/Isn't 确认
Step 3 → USER 选定目标层
Step 5 → Self-Interview → 修正 → USER 确认 Phase 计划
Step 6 → USER 确认 Phase Brief → 进入 /SPM
```

---

## 十四、与现有 Skill 的衔接改动

### SPM 需要改什么
- Bootstrap 新增：读取 `phase-brief.md`
- Step 1 的 5-Why 基于 Brief 展开
- Brief 的 No Gos 作为范围硬约束
- Brief 的 Stop Rules 作为执行中的停止条件

### SGE 需要改什么
- Step 4（交接更新）新增：回更 SSA Phase 计划（Living Spec）

### AGENTS.md 需要改什么
- Skill 路由表新增 SSA
- 项目结构图新增 `docs/project/scope/`

---

## 十五、长期演进路线

```
短期: SSA → (SPM → SGA → SGE → 回更 Phase 计划) × N
中期: SSA → 全量 US → (SGA → SGE → 回更) × N
长期: SSA → 全量 US + 全量设计 → (SGE → 回更) × N
```

---

## 十六、开放问题

1. **命名**：`/SSA`（Senior Scope Architect）？或 `/scope`？

2. **Step 2 单形态场景**：简单需求标注"单形态跳过"还是仍要求 ≥2 种？

3. **soul-vision-rethinking 作为 reference example**：06~09 文档是否作为 SSA 的参考示例？

4. **Phase Brief 和 PRD 的关系**：嵌入 PRD 第一章还是独立文件引用？

5. **项目空间**：放 7game `.agents/skills/` 还是独立可复用 skill 库？
