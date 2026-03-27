# 7game-lite 需求分析进度

> 创建日期：2026-03-27
> 状态：进行中
> 项目定位：从 7waygame 衍生的最简版本子项目。核心玩法：模拟经营文字 MUD + AI 融入。

## Phase I: 需求分析

### Step 1: 价值锚定 — [✅]
- **核心体验**：一句话——"用最低成本验证'文字 MUD + AI 灵智弟子'是否能独立构成核心乐趣"
- **ROI 判断**：极高。复用 7waygame 引擎逻辑，仅做减法（砍掉 Electron/窗口/图形），聚焦纯文字 MUD + AI 对话
- **循环挂载**：灵气→弟子行为→MUD 输出→AI 台词→玩家决策→灵气消耗
- **USER 决策记录**：
  - Q1: ✅ 纯 Web（浏览器），后期再移植 Electron
  - Q2: ✅ AI 首发核心，弟子开局就有 AI 灵智
  - Q3: ✅ 骨架集（6 系统：修炼+弟子+MUD+灵田+炼丹+天劫）

### Step 2: 实体数据 — [✅]
- **实体清单**：LiteGameState (25 字段) + AISoulContext (新增) + LiteDiscipleState (精简版)
- **interface 草案位置**：Step 2 对话输出
- **USER 决策记录**：
  - Q1: ✅ 轻量级 AISoulContext（短期记忆+目标+摘要），后续完善三层架构
  - Q2: ✅ 精简版 DiscipleState（砍掉 salary/lastSalaryTime/paidThisPeriod）

### Step 3: 规则数值 — [✅]
- **规则清单**：6 系统边界已定义（能做/不能做）
- **数值公式**：7 条可验证公式（F1~F7），全部来自 7waygame 基线
- **MECE 校验结果**：✅ 通过（⚠️ 灵石微通胀风险已标注，lite 可控）
- **USER 决策记录**：
  - Q1: ✅ AI 推理按事件触发（弟子行为变更时推理）
  - Q2: ✅ 止步筑基圆满

### Phase I Self-Review — [✅]
- Placeholder 扫描：✅ 通过，无 TBD/待定
- 内部一致性：✅ 通过。Step 1 循环挂载（灵气→弟子→MUD→AI）与 Step 3 产源消耗一致
- 歧义检查：✅ 通过。AI 推理触发时机已明确为"事件驱动"
- 数值完整性：✅ 通过。7 条公式全部有明确来源和可验证标准

## Phase II: 架构拆解

### Step 4: 架构分层 — [✅]
- **四层划分**：Data (`src/shared/`) → Engine (`src/engine/`) → AI (`src/ai/`) → Presentation (`src/ui/`)
- **AI 运行时**：✅ B 方案 — node-llama-cpp 后端 API，LLMAdapter 接口抽象（HTTP→IPC 迁移零成本）
- **Mermaid 拓扑图**：已在 Step 4 对话输出
- **砍掉模块**：Electron 壳、mode-manager、loyalty-engine、paper-doll、renderer、ads

### Step 5: 分期路线图 — [✅]
- **Phase A**：A1 脚手架[S] → A2 修炼引擎[M] → A3 MUD面板[M] → A4 弟子行为树[M] → A5 AI灵智[L]
- **Phase B**：B1 灵田+炼丹[M] → B2 灵脉+悬赏[M] → B3 天劫+筑基[M] → B4 AI深化[M]
- **Phase C**：C1 MUD打磨[S] → C2 存档+设置[S] → C3 Electron迁移[M]
- **总预估**：~12 天

### Step 6: User Story — [✅]
- **Story 文件**：`docs/design/specs/7game-lite-user-stories-phaseA.md`
- **Story 数量**：5 条（覆盖 Phase A 全部 5 个里程碑）
- **依赖拓扑**：#1→#2, #1→#3→#4→#5（无循环）

### Phase II Self-Review — [✅]
- Story 覆盖度：✅ Phase A 路线图 5 个里程碑（A1~A5）全部有对应 Story
- AC 质量扫描：✅ 全部 AC 使用 Given-When-Then 格式，无模糊动词，含边界 AC
- 依赖完整性：✅ 拓扑排序合理，无循环依赖

## Phase III: 执行指导

### Step 7: 文档先行 — [✅]
- **代码文件清单**：17 文件（Data 6 + Engine 5 + AI 2 + UI 3 + Backend 1）
- **Git 分支**：`feature/7game-lite-phase-a`
- **实施顺序**：4 Sprints × 5 天（Data→Engine→AI→UI）

### Step 8: 验证脚本指引 — [/]
### Phase III Self-Review — [⬜]

## Phase IV: 验证交付

### Step 9: 集成验证 — [⬜]
### Step 10: 交接归档 — [⬜]
