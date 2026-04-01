# Trinity Pipeline 流程审计报告

> **审计日期**: 2026-04-01
> **审计范围**: Phase J-Goal + Phase I-alpha 全流程执行合规性
> **触发原因**: 用户在执行 Phase J 过程中发现多项流程异常
> **审计方法**: 逐文件比对协议定义 vs 实际产出

---

## 一、审计发现

### F1: 重审循环被跳过（P0 严重）

**协议要求**（SPM SKILL.md L287-305 / SGA L209-223 / SGE L250-264）:
```
BLOCK 发现 → 修复 → 重新调用 @doc-reviewer 执行完整四层防线 → 产出 review-gX-v(N+1).md
迭代上限 3 轮。报告版本递增: review-g1.md → review-g1-v2.md → review-g1-v3.md
```

**实际执行比对**:

| Phase | Gate | 报告判定 | 统计 | 重审文件 | 合规？ |
|-------|------|---------|------|---------|:-----:|
| IJ | G1/G2/G3 | BLOCKED→迭代 | 多轮 BLOCK | review-g1-v3.md 等 | **合规** |
| J-Goal | G2 | "CONDITIONAL PASS" | 1 BLOCK / 5 WARN | 无 v2 | **违规** |
| I-alpha | G1 | "CONDITIONAL PASS" | "1 BLOCK 已修复" | 无 v2 | **违规** |

**核心违规详情**:

1. **Phase J-Goal Gate 2** (`docs/pipeline/phaseJ-goal/review-g2.md`):
   - 头部 L12 写 "CONDITIONAL PASS"，但 L13 统计为 "1 BLOCK / 5 WARN"
   - review-protocol.md L117-118 明确定义: CONDITIONAL PASS = WARN > 0 且 BLOCK = 0; BLOCKED = BLOCK > 0
   - **判定与统计逻辑矛盾**: 一个 active BLOCK（R6-D2: revenge 事件类型 `'encounter'` 不存在于 SoulEventType 枚举）未经重审直接穿透门禁
   - 目录下无 review-g2-v2.md，证明未执行重审循环

2. **Phase I-alpha Gate 1** (`docs/pipeline/phaseI-alpha/review-g1.md`):
   - L3 标注 "轮次：1（修复后）"，L12 写 "1 BLOCK 已修复"
   - BLOCK 被内联修复后自行改判为 CONDITIONAL PASS
   - 协议要求修复后必须重新调用 @doc-reviewer 产出独立 v2 文件
   - 目录下无 review-g1-v2.md，证明修复后未重新审查

**根因分析**: 协议文本是声明式的（"必须重新执行"），缺乏结构性防护。Phase IJ 执行正确是因为当时更严格地遵循了流程，后续 Phase 逐渐松弛。没有机械性检查阻止"自审自判"。

---

### F2: Subagent 上下文不足（P1）

**协议现状**: @doc-reviewer 调用模板（三个 SKILL.md）仅提供:
- 审查对象路径（PRD / TDD / User Stories）
- 角色配置（必选 + 按需角色）

**未提供的关键上下文**:

| 缺失上下文 | 影响 | 证据 |
|-----------|------|------|
| 架构索引 (MASTER-ARCHITECTURE) | reviewer 不知道有哪些系统存在 | — |
| GameState 拓扑 (gamestate.md) | 无法验证字段读写冲突 | — |
| Pipeline 架构 (pipeline.md) | 无法验证 Handler 时序 | J-Goal G2: goal-tick(500) vs encounter(610) 时序问题被 reviewer 主动发现 |
| 依赖矩阵 (dependencies.md) | 无法评估影响链长度 | I-alpha G2: behavior-tree 影响链长度=3 |
| 存档版本 (schema.md) | 无法验证 SAVE_VERSION 同步 | J-Goal G2 WARN-5: createDefault version 未对齐 |
| 技术债务 (tech-debt.md) | 无法识别累积模式 | processSoulEvent 参数膨胀趋势未被系统性识别 |
| 需求债务 (feature-backlog.md) | 无法交叉验证已知缺陷 | — |

**结论**: reviewer 能否发现跨系统问题完全依赖其主动性（是否自行 grep），不是协议保证。J-Goal G2 的 revenge 事件类型 BLOCK 被发现是因为 reviewer 碰巧 grep 了 soul.ts，而非协议要求它必须读取 soul.ts。

---

### F3: SGA Step 5 影响分析类目不完整（P1）

**Step 5 现有覆盖**:
- 5.1 类型扩展引用追踪（Record<T,...> / : T[] 模式）
- 5.2 函数签名影响扫描
- 5.3 PRD 副作用→执行位置映射
- 5.4 Handler 联动验证
- 5.5 产出与文件清单校验

**Review 中后发现但 Step 5 未覆盖的类目**:

| 缺失类目 | 证据来源 | 具体案例 |
|---------|---------|---------|
| **Enum/Union 运行时穷举** | J-Goal G2 BLOCK (R6-D2) | TDD 写 `event.type === 'encounter'`，但 SoulEventType 中不存在裸 `encounter`，实际为 `encounter-chat/discuss/conflict`。5.1 只覆盖 `Record<T,...>` 编译时模式，不覆盖运行时字符串匹配 |
| **存档版本同步** | J-Goal G2 WARN (R6-D5) | TDD 提到 createDefault 但未显式列出 SAVE_VERSION 5→6 和 version 字段变更。三处必须同步: SAVE_VERSION 常量 + migrateVNtoVN+1 + createDefault version |
| **向后兼容/行为变更** | I-alpha G2 WARN (R6-D3) | updateRelationshipTags 从"保留非 friend/rival 标签"变为"管理全部 5 个标签"——语义变化，现有调用方依赖旧行为。当前安全（mentor/grudge/admirer 未被手动赋值）但语义变更未被标记 |
| **API 表面积膨胀** | J-Goal G2 WARN (R5-D1) | processSoulEvent 从 Phase E 的 4 参数增长到 8 参数（含 5 optional）。无累积预算，每个 Phase 各加一个参数 |
| **数据生命周期** | J-Goal G2 WARN (R6-D1) | goal TTL 的 init→decrement→cleanup→persist 链缺少 revenge 完成条件的详设伪码。checkCompletions 在 goal-tick(500) 运行但 encounter 在 610 才执行 |

---

### F4: 文档索引系统缺陷（P2）

**现状评估**:
- Bootstrap 效率良好: 85% 上下文可在 ~800 行内获取
- Master 索引文件（MASTER-PRD, MASTER-ARCHITECTURE）内容准确
- Zero broken links（所有引用链均有效）

**缺失项**:

| 缺失 | 严重度 | 说明 |
|------|:-----:|------|
| 单一着陆页 (START-HERE) | 高 | 新会话必须先读 project.yaml 找路径，再读 MASTER-PRD，再读 MASTER-ARCHITECTURE，再读 handoff——无统一入口 |
| INDEX.md 注册缺失 | 中 | tech-debt.md, feature-backlog.md, 探索性文档（multi-agent-plan 等）共 6+ 文件未注册 |
| 需求分解追溯链 | 中 | 无 System → Phase → PRD → User Story → 验证脚本 的全局映射 |
| 系统×文件×Phase 交叉索引 | 中 | 了解某系统由哪个 Phase 引入需逐个读 PRD |
| Phase Y/Z 缺 PRD | 低 | task-tracker 已登记但无 PRD 文档 |

---

## 二、改进方案

### Phase 1: 紧急修复（下次 Gate Review 前）

#### 1.1 判定完整性校验规则
**修改文件**: `.agents/skills/_shared/review-protocol.md`（~L119 后新增）

在"汇总输出格式"节之后添加硬约束段:
- 写入报告前必须校验 BLOCK/WARN 计数与判定标签一致性
- BLOCK > 0 → 判定 = BLOCKED（不论 WARN 数量）
- 头部判定与统计行矛盾 → 报告无效，必须重写
- 禁止: "CONDITIONAL PASS" + BLOCK > 0、"PASS" + WARN > 0、统计数字与表格行数不一致

#### 1.2 禁止自审 + 文件命名硬约束
**修改文件**: 三个 SKILL.md（SPM ~L291 / SGA ~L209 / SGE ~L250）评审循环协议段

在步骤 2b 之后添加:
1. **禁止自审**: 修复后的重新审查必须再次调用 @doc-reviewer 执行完整四层防线。禁止在同一轮报告中标记"已修复"并自行改判
2. **文件命名递增**: 第 N+1 轮必须产出新文件 `review-gX-v(N+1).md`。父 agent 写入前检查上一版文件是否存在
3. **修复 ≠ 审查**: 修复是作者行为，审查是独立评审行为，二者不可合并

#### 1.3 签章前文件完整性检查
**修改文件**: 三个 SKILL.md 签章清单段

新增 checklist item:
- `[ ] 评审文件完整性: 如第 1 轮有 BLOCK，则 review-gX-v2.md（或更高版本）必须存在`

---

### Phase 2: 流程增强（下次完整 Pipeline 前）

#### 2.1 扩展 @doc-reviewer 调用模板
**修改文件**: 三个 SKILL.md 的 @doc-reviewer 调用段

各 Gate 补充必读上下文路径:

**Gate 1 (SPM)**: `${paths.master_prd}`, `${paths.prd_systems}`, `${paths.prd_formulas}`, `${paths.tech_debt}`, `${paths.feature_backlog}`

**Gate 2 (SGA)**: `${paths.master_arch}`, `${paths.arch_gamestate}`, `${paths.arch_pipeline}`, `${paths.arch_dependencies}`, `${paths.arch_schema}`, `${paths.tech_debt}`

**Gate 3 (SGE)**: `${paths.master_arch}`, `${paths.arch_layers}`, `${paths.arch_pipeline}`, `${paths.arch_gamestate}`, `${paths.tech_debt}`

#### 2.2 审查上下文声明
**修改文件**: `.agents/skills/_shared/review-protocol.md`（L1 之前新增）

要求 reviewer 报告开头声明实际读取的上下文文件 + 每个文件的关键发现。未读的必读文件须标注原因。全部标注"未读"视为审查无效。

#### 2.3 SGA Step 5 扩展（5.5 - 5.9）
**修改文件**: `.agents/skills/architect/SKILL.md` Step 5 段

| 新步骤 | 检查内容 | 触发条件 |
|-------|---------|---------|
| 5.5 Enum 运行时穷举 | grep `=== '字面量'` / switch / `.includes()` / `.startsWith()` | 新增 enum/union 成员 |
| 5.6 存档版本同步 | SAVE_VERSION + migrateVNtoVN+1 + createDefault version | 新增 GameState 字段 |
| 5.7 向后兼容检查 | 行为变更点 + 调用方依赖旧行为 + 零输入回归断言 | 修改现有函数行为逻辑 |
| 5.8 API 表面积 | 参数计数 >=6 → WARN + 建议 options 对象 | 添加函数参数 |
| 5.9 数据生命周期 | init→write→read→cleanup→persist 完整性 | 引入运行时数据结构 |

原 5.5 "产出与校验" 重编号为 5.10。

#### 2.4 INDEX.md 补全
**修改文件**: `docs/INDEX.md`

注册缺失文件: tech-debt.md, feature-backlog.md, phaseIJ/I-alpha/J-Goal pipeline 条目。新增"探索性文档"分区。

---

### Phase 3: 系统完善（下一可用窗口）

#### 3.1 创建 START-HERE.md
**新建文件**: `docs/START-HERE.md`（~150 行）

30 秒定位表 + 文档层级图 + 当前状态指针

#### 3.2 Reviewer 跨维度检查提示
**修改文件**: `.agents/skills/_shared/review-protocol.md`

添加触发模式→检查项映射表

#### 3.3 MASTER-ARCHITECTURE 交叉索引
**修改文件**: `docs/design/MASTER-ARCHITECTURE.md`

新增系统×核心文件×引入 Phase×依赖系统交叉表

#### 3.4 MASTER-PRD 需求追溯链
**修改文件**: `docs/project/MASTER-PRD.md`

新增 System → Phase → PRD § → User Stories → 验证脚本追溯表

---

## 三、涉及的关键文件

| 文件 | 变更类型 | Phase |
|------|---------|:-----:|
| `.agents/skills/_shared/review-protocol.md` | 修改（判定校验 + 上下文声明 + 跨维度提示） | 1+2+3 |
| `.agents/skills/product-manager/SKILL.md` | 修改（禁止自审 + 调用模板 + 签章检查） | 1+2 |
| `.agents/skills/architect/SKILL.md` | 修改（禁止自审 + 调用模板 + Step 5.5-5.9 + 签章检查） | 1+2 |
| `.agents/skills/engineer/SKILL.md` | 修改（禁止自审 + 调用模板 + 签章检查） | 1+2 |
| `docs/INDEX.md` | 修改（补全缺失注册） | 2 |
| `docs/START-HERE.md` | 新建 | 3 |
| `docs/design/MASTER-ARCHITECTURE.md` | 修改（交叉索引） | 3 |
| `docs/project/MASTER-PRD.md` | 修改（追溯链） | 3 |

---

## 四、验证方法

1. **判定校验**: 下一次 Gate Review 报告头部判定与 BLOCK/WARN 计数一致
2. **重审循环**: 如有 BLOCK 则产出 review-gX-v2.md 文件
3. **上下文声明**: 新报告包含"审查上下文声明"段
4. **Step 5 覆盖**: 下一次 SGA 执行后 TDD 包含 5.5-5.9 输出
5. **INDEX 完整性**: tech-debt.md 和 feature-backlog.md 已注册
6. **端到端**: 人为注入 enum 不匹配场景，验证 5.5 和 reviewer 能否同时捕获
