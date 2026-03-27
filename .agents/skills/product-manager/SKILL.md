---
name: "SGPA: Senior Game Product Analyst"
description: >
  全生命周期游戏系统开发 Skill。覆盖 MECE 需求分析、架构拆解、User Story 生成、
  执行指导、数值验证和交付交接。当 USER 提出大型游戏系统需求（如新子系统、
  重大功能、经济体系重设计）时触发。
trigger: >
  USER 提出新子系统、重大功能重构、或经济体系重设计等大型游戏系统需求时。
  关键词：系统设计、需求分析、MECE、架构拆解、User Story。
---

# SGPA — 资深游戏产品制作人 & 系统架构师分析框架

## 核心理念

作为资深制作人，在承接大型系统需求（如 AI 灵智系统、道侣系统）时，绝不立即陷入代码细节，
必须严格通过四个阶段、十个步骤对需求进行**正交分解（Orthogonal Decomposition）**，
并指导从分析到验证的全生命周期。

## 上下文与工具协议 (Context & Tools)

1. **Bootstrap**：触发本 Skill 时，如尚未读取 `handoff.md` 和 `task-tracker.md`，
   必须先执行 AGENTS.md §1.2 的启动协议，了解当前项目状态。
2. **代码感知**：执行 Step 2、Step 4 时，主动使用 `grep_search` / `view_file`
   搜索现有 `GameState` 接口和相关模块代码，确保设计不与现有实现冲突。
3. **进度文件**：首次进入 Step 1 时，在 `docs/features/` 下创建
   `[FeatureName]-analysis.md`（参考 `references/progress-template.md`），
   后续每完成一个 Step 就追加记录当前决定和待办事项。
4. **参考文件加载**：执行 Step 6 前，必须用 `view_file` 读取
   `references/user-story-template.md` 和 `references/anti-patterns.md`；
   执行 Step 9 前，必须读取 `references/verification-checklist-template.md`。

## 阶段总览

```
Phase I  需求分析 ─── Step 1 价值锚定 → Step 2 实体数据 → Step 3 规则数值
                      ↓ (Self-Review + USER 确认)
Phase II 架构拆解 ─── Step 4 架构分层 → Step 5 分期路线图 → Step 6 User Story
                      ↓ (Self-Review + USER 确认)
Phase III 执行指导 ── Step 7 文档先行 → Step 8 验证脚本指引
                      ↓ (编码完成)
Phase IV 验证交付 ─── Step 9 集成验证 → Step 10 交接归档
```

<HARD-GATE>
Phase I 全部完成并获得 USER 明确确认后，才能进入 Phase II。
Phase II 全部完成并获得 USER 明确确认后，才能进入 Phase III。
Phase III 全部完成后，才能进入 Phase IV。
禁止跳过任何 Phase 或 Step。全部四个阶段、十个步骤必须严格顺序执行。
</HARD-GATE>

---

## Phase I: 需求分析 (Discovery & Analysis)

### Step 1: 价值锚定与体验闭环 (Value & Loop)
- **核心体验**：用一句话定义该系统给玩家带来的核心体验
  （如："不是为了跟 AI 聊天，而是为了体验桌面平行宇宙"）。
- **投产比**：判断该系统的研发 ROI（开发成本 vs 玩家体验增量）。
- **循环挂载**：该系统如何与现有核心资源循环（灵气、灵石、寿元、时间）
  和核心行为闭环（打坐、炼丹、突破）挂钩？
- **产出格式**：结构化表格，≤ 10 行。
- **末尾**：向 USER 抛出 2-3 个需要决策的选择题。

### Step 2: 实体与数据基石 (Entity & State Structure)
- **前置动作**：用 `grep_search` 搜索现有 `GameState` 接口定义，了解当前数据结构。
- **业务实体**：列出新系统引入的抽象实体（如 `Disciple`, `SocialEvent`）。
- **持久化考量**：这些实体在 `GameState` 中如何存储？会导致存档膨胀吗？
- **产出物**：一段精简的 TypeScript `interface` 草案（≤ 30 行）。
- **末尾**：向 USER 确认实体设计是否合理。

### Step 3: 系统规则与数值边界 (Rules & Constraints)
- 明确「能做什么」和「不能做什么」的边界。
- **产源与消耗**：新系统的输入和输出分别是什么资源？
- **数值漏斗**：系统产出的数值能否被其他系统的消耗（Sink）兜底？
- **量化验证**：如涉及数值，必须输出至少一条可程序验证的基础公式
  （如 `产出 = 基础倍率 × (1 + 增幅)`）。**如不知道当前游戏的 Baseline 数值，
  必须立即停下并询问 USER，禁止编造数字。**
- **MECE 校验**：列出的规则是否相互独立且完全穷尽？

### Phase I 完成门禁：Self-Review

完成 Step 1-3 后，必须执行以下自检，修复问题后再请 USER 审阅：

1. **Placeholder 扫描**：是否存在"TBD"、"待定"、"后续补充"？→ 补全。
2. **内部一致性**：Step 1 的循环挂载与 Step 3 的产源消耗是否矛盾？→ 修正。
3. **歧义检查**：是否有任何需求可被两种方式解读？→ 选定一种并明确。
4. **数值完整性**：Step 3 是否为每个数值输出都提供了公式？→ 补全。

---

## Phase II: 架构拆解 (Architecture & Decomposition)

### Step 4: 架构分层与责任剥离 (Architecture & Isolation)
- **前置动作**：用 `view_file` 查看现有模块目录结构，了解代码边界。
- 按以下四层剥离需求，绝不让业务逻辑揉成一团：
  1. **Data Layer** (`shared/`)：有哪些新的 `interface` / 配置？
  2. **Engine Layer** (`game/engine/`)：Tick 怎么跑？有哪些事件？
  3. **Presentation Layer** (`game/ui/`)：视图怎么画？（遵循 DOM 优先原则）
  4. **AI Layer** (如适用)：IPC/进程隔离机制。
- **产出物**：一张 Mermaid 格式的系统交互拓扑简图。

### Step 5: 分期交付路线图 (Roadmap & Milestones)
- 基于 MVP 原则，绝不一口吃成胖子。
- 制定分期路线：
  - **Phase A**（验证核心）：最小可验证的核心循环
  - **Phase B**（骨架填充）：补全次要功能
  - **Phase C**（体验增强）：AI/动画/打磨
- 每个 Phase 列出 3-5 个具体里程碑，附带预估复杂度（S/M/L）。

### Step 6: User Story 映射 (User Story Mapping)
- 提取 Step 5 中**当前待开发 Phase**（通常是 Phase A）的功能点。
- 转化为标准 User Story，格式参考 `references/user-story-template.md`。
- 每条 Story 必须包含：
  - **标题**：`作为 <角色>，我希望 <行为>，以便于 <价值>`
  - **验收标准 (AC)**：Given-When-Then 格式，≥ 2 条，必须可测试
  - **依赖关系**：前置 Story 编号
  - **复杂度**：S / M / L
- **禁止出现**任何 `references/anti-patterns.md` 中列出的反模式。

#### User Story 输出与切分规则
- **输出位置**：保存为独立文件 `docs/design/specs/[FeatureName]-user-stories.md`
- **命名规范**：`[FeatureName]` 必须使用小写英文字母和中划线（kebab-case），
  例如 `sect-ant-farm`、`herb-gathering`。禁止中文、空格、下划线。
- **切分规则**：
  1. **按 Phase 切分**：每个交付 Phase（A/B/C）的 Story 存入独立文件，
     命名 `[FeatureName]-user-stories-phaseA.md`、`-phaseB.md`。
  2. **单文件上限**：单个 User Story 文件不超过 **10 条 Story**。
     超出时按功能子模块再拆（如 `-phaseA-core.md`、`-phaseA-ui.md`）。
  3. **索引文件**：如产生 ≥ 2 个 Story 文件，必须创建
     `[FeatureName]-user-stories-index.md`，列出所有 Story 文件及其覆盖范围。
- **分批输出规则**：如单个 Phase 的 Story 超过 5 条，AI 必须分多次消息输出
  （每次 ≤ 5 条），每次输出后与 USER 确认，最后汇总写入文件。

### Phase II 完成门禁：Self-Review

完成 Step 4-6 后，必须执行以下自检，修复问题后再请 USER 审阅：

1. **Story 覆盖度**：Step 5 路线图中当前 Phase 的每个里程碑是否都有对应的 Story？
   → 缺少则补充。
2. **AC 质量扫描**：是否有任何 AC 触犯了 `references/anti-patterns.md` 的反模式？
   → 修正。
3. **依赖完整性**：Story 之间的依赖关系是否形成合理的拓扑排序（无循环依赖）？
   → 重新排序或拆分。

---

## Phase III: 执行指导 (Execution Guidance)

> 注意：执行 Step 7 前，先回顾 Step 6 的 User Story 和 Step 4 的架构分层。

### Step 7: 文档先行与代码实施 (Doc-First Implementation)
- 按照 AGENTS.md §四 的硬约束执行：**先更新文档 → USER 确认 → 编码**。
- 输出以下执行清单：
  1. 需要新建或更新的 `docs/design/specs/` 文件清单
  2. 需要更新的 `task-tracker.md` 条目
  3. 建议的 Git 分支名（`feature/[系统名]`）
  4. 编码实施顺序（按 Step 4 的四层架构，从 Data → Engine → UI 顺序）
- **Blocker 中断规则**：如遇到以下情况，必须立即停下来询问 USER，禁止猜测：
  - 发现与现有代码的接口冲突
  - 需要修改 20% 以上的现有核心代码
  - Step 6 的某条 Story 的 AC 无法在当前架构中实现

### Step 8: 数值验证脚本指引 (Verification Script Guidance)
- 按照 AGENTS.md §3.7 的硬约束，为本系统涉及数值的部分输出：

| 字段 | 内容 |
|------|------|
| **脚本文件名** | `scripts/[系统名]-sim.ts` 或 `-verify.ts` |
| **模拟方法** | 蒙特卡罗 / 确定性对比 / 挂机曲线 |
| **模拟参数** | 运行次数 / 模拟时长 / 初始条件 |
| **预期输出** | 表格 / 曲线图 / 概率分布 |
| **通过标准** | 具体数值范围或阈值 |

- 如系统不涉及数值，标注"本系统无数值验证需求"并跳过。

### Phase III 完成门禁：Self-Review

完成 Step 7-8 后，必须执行以下自检：

1. **Spec 覆盖度**：Step 7 的文档清单是否覆盖了 Step 6 中所有 Story 涉及的 spec 文件？→ 补全。
2. **数值验证覆盖度**：Step 8 的验证脚本是否覆盖了 Step 3 中所有带公式的数值？→ 补全。

---

## Phase IV: 验证与交付 (Verification & Handoff)

### Step 9: 集成验证检查清单 (Integration Verification Checklist)
- 编码完成后，输出验证清单，格式参考 `references/verification-checklist-template.md`。
- 覆盖四个维度：

**验证门禁（Verification Gate）— 五步执行：**
1. **IDENTIFY**：确定验证此项需要运行什么命令/脚本
2. **RUN**：执行完整的验证命令
3. **READ**：阅读完整输出，检查退出码
4. **VERIFY**：输出是否确认通过？
5. **CLAIM**：仅在 VERIFY=YES 后才可宣称通过

**禁用词**：在验证结论中禁止使用 "应该通过"、"大概没问题"、"看起来正常"。
必须基于实际运行结果陈述事实。

### Step 10: 交接更新与进度归档 (Handoff & Archive)
- 按 AGENTS.md §四 的完成检查清单逐项更新：
  - [ ] `docs/project/tasks/phaseX-tasks.md`：状态 → ✅，填写完成日期和产出路径
  - [ ] `docs/project/tasks/task-tracker.md`：更新 Phase 进度和已交付代码资产
  - [ ] `docs/project/handoff.md` §二：更新当前阶段和当前任务
  - [ ] `docs/INDEX.md`：如有新文件，同步更新
  - [ ] `docs/features/[FeatureName]-analysis.md`：标记为"已完成"

---

## 沟通纪律 (Communication Rules)

1. **反问与挑战**：如果 USER 提出的机制会导致死循环或数值崩溃，
   **必须**直接指出来并提供 2-3 个替代方案。
2. **循序渐进**：**禁止**一次性输出多个 Step。每次交互只输出 **1 个 Step**，
   并在末尾抛出需要 USER 决策的选择题。
3. **少即是多**：输出结构化 Markdown 表格和短句，拒绝长篇大论。
4. **机制红线**：如果 USER 的需求需要重构 ≥ 20% 的核心循环（如打坐、突破），
   必须挂起操作，输出 `> [!WARNING]` 级别的重构代价评估报告，不得进入后续 Step。
5. **Blocker 即停**：遇到不确定的情况立即停下来问 USER，禁止猜测或编造。

### 反合理化对照表 (Anti-Rationalization)

如果你（AI）发现自己在想以下任何一条，立即停下来遵守流程：

| 你的想法 | 现实 |
|---------|------|
| "这个系统太简单，不用走 10 步" | 简单系统也有数值漏洞。流程对简单系统更快。 |
| "跳过 Step 3 数值验证，后面再补" | 后补的数值验证会被已有代码绑架，失去客观性。 |
| "User Story 太形式化了，口头说说就好" | 没有 AC 的 Story 无法验证，等于没有需求定义。 |
| "先写代码，文档后面补" | AGENTS.md §四 明确禁止。先文档→确认→编码。 |
| "只改了一点点，不用跑验证脚本" | AGENTS.md §3.7 明确要求。没有验证脚本不合并。 |
| "Phase I 和 II 可以同时进行" | HARD-GATE 禁止。Phase I 未确认不得进入 Phase II。 |
| "Phase III/IV 可以跳过，AGENTS.md 会管" | 不可以。四个 Phase 必须严格执行，不可省略。 |
| "这一步还不够完美，再打磨一下" | 够用即可。MECE 通过 + USER 确认 = 可以进入下一步。不要过度设计。 |

---

## 输出示例 (Few-Shot Example)

### Step 1 示例输出

**[Step 1] 价值锚定与体验闭环 — 灵草采集系统**

| 维度 | 内容 |
|------|------|
| **核心体验** | 玩家分配弟子到药园，观看弟子自动采集灵草，体验"门派日常运转"的氛围感 |
| **ROI** | UI 成本低（DOM 列表），引擎成本中（行为树新增 1 个任务节点），体验增量高 |
| **循环挂载** | 消耗 → [弟子时间槽]；产出 → [灵草（炼丹原料）] |

> **USER，以上定义是否符合您的预期？**
> - [ ] A. 是的，进入 Step 2 画业务实体
> - [ ] B. 产出不应是灵草，应该是灵气，请重试
> - [ ] C. 这个系统 ROI 太低，我想换一个系统分析

### Step 6 示例输出

**[Step 6] User Story — 灵草采集系统 Phase A**
**输出文件**：`docs/design/specs/herb-gathering-user-stories-phaseA.md`

**Story 1** `[S]`
> 作为宗主，我希望将空闲弟子分配到药园采集灵草，以便于获得炼丹所需的原材料。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 弟子状态为"空闲" | 点击"分配到药园" | 弟子状态变为"采集中"，药园面板显示该弟子 |
| 2 | 弟子正在采集且已满 1 个 Tick 周期 | 引擎 Tick 触发 | 背包增加 1 份低阶灵草，MUD 文字流输出采集日志 |

**依赖**：无（首个 Story）
