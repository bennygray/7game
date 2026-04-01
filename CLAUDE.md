# 7game-lite — Claude Code 项目配置

> **本文件是 `.agents/AGENTS.md` 的 Claude Code 适配层。**
> 规则冲突时以 AGENTS.md 为准。完整规范请查阅 AGENTS.md。
>
> **项目定位**: 从 7waygame 衍生的最简验证版。核心玩法：纯文字 MUD + AI 灵智弟子经营模拟。
> **当前状态**: 查阅 `docs/project/handoff.md` 获取版本号、活跃 Phase 和断点信息。
> **核心假设**: 「纯文字 MUD + AI 灵智弟子 + 活世界」能否独立构成核心乐趣。
> **最高优先级**: 以「验证核心乐趣」为决策准则，拒绝任何增加范围的诱惑。

---

## 会话启动协议

任何涉及代码变更、需求变更、项目规划、Bug 修复、代码审查的任务，必须先读文档：

```
Level 1（永远读）：
  0. .agents/project.yaml                 ← 所有文档路径（最先读取）
  1. docs/project/MASTER-PRD.md           ← 产品索引（~120行）
  2. docs/design/MASTER-ARCHITECTURE.md   ← 架构索引（~100行）
  3. docs/project/handoff.md              ← 当前断点 + 接手指南
  4. docs/project/SOUL-VISION-ROADMAP.md  ← 灵魂远景路线图
  5. 确认当前活跃 Phase + 读对应 PRD/TDD 文件
  6. 读 docs/pipeline/phaseX/ 过程资产

Level 2（按需读 detail）：
  根据任务类型读对应 detail 文件（见下方路径映射表）
  涉及世界/事件/NPC/道风设计时，读 docs/project/soul-vision-rethinking/06~09
```

简单问答（技术概念、语法等）可跳过启动协议。

---

## Trinity Pipeline Skill 体系

本项目使用三角色 Skill 流程控制开发，定义在 `.agents/skills/` 下：

| Skill | 角色 | 职责 | Gate |
|-------|------|------|------|
| `/SPM` | 资深产品经理 | What/Why — 需求分析、PRD、User Story | GATE 1 |
| `/SGA` | 资深游戏架构师 | Where/How — TDD、Interface、Pipeline挂载 | GATE 2 |
| `/SGE` | 资深游戏工程师 | Build/Verify — 编码、验证、回归、交接 | GATE 3 |

**路由规则**：
- SPM 是默认入口，任何新功能想法先走 /SPM
- SGA 前置条件：PRD.md 存在 + `[x] GATE 1 PASSED`
- SGE 前置条件：TDD.md 存在 + `[x] GATE 2 PASSED`
- 不确定时走 /SPM

**Claude Code 执行方式**：
当用户输入 `/SPM`、`/SGA` 或 `/SGE` 时，读取对应 SKILL.md 并严格遵循其流程：
- `/SPM` → 读 `.agents/skills/product-manager/SKILL.md`
- `/SGA` → 读 `.agents/skills/architect/SKILL.md`
- `/SGE` → 读 `.agents/skills/engineer/SKILL.md`
- 共享模块 → `.agents/skills/_shared/`（Review协议、评审角色、模板等）

### 任务类型路由

| 任务类型 | 必读文档 | 推荐 Skill |
|----------|---------|:-----------:|
| 需求分析 | MASTER-PRD → 当前 Phase 文件 | /SPM |
| 架构决策 | MASTER-ARCHITECTURE → 对应 TDD | /SGA |
| 编码实施 | TDD → User Stories → 对应代码 | /SGE |
| 需求变更 | MASTER-PRD → 涉及的 PRD/TDD | /SPM |
| Bug 修复 | MASTER-ARCHITECTURE → 对应代码 | /SGE |

---

## 编码前置条件（硬约束）

```
步骤 1：更新文档   → 更新对应的设计文档或 User Story
步骤 2：用户确认   → 获得用户明确确认
步骤 3：编写代码   → 按已更新的文档编码
步骤 4：完成联动   → 更新当前 Phase 对应文件
```

唯一例外：紧急热修复可先修复后补文档，同一会话内完成。

### 完成任务检查清单

1. 在当前 Phase 的 PRD/analysis 文件中更新进度
2. 如涉及新文件，在 `docs/INDEX.md` 中同步
3. 如完成了 User Story，在 Story 文件中标记完成
4. 如涉及新挂载/新资源，更新对应 detail 文件（见下方写入路径映射表）

---

## 性能红线

### 前端（浏览器 Tab）

| 指标 | 上限 | 说明 |
|------|------|------|
| CPU 占用（挂机） | ≤ 3% | 引擎 tick 不得占用主线程 |
| 内存占用 | ≤ 200MB | V8 heap，含 DOM + GameState |
| 首屏加载 | < 3 秒 | Vite dev / 生产构建 |
| localStorage 存档 | ≤ 5MB | 单个存档序列化后体积 |
| MUD 日志行数 | ≤ 200 行 | 超出自动裁剪最早日志 |

### 后端（Node.js AI 推理服务）

| 指标 | 上限 | 说明 |
|------|------|------|
| CPU 占用（空闲） | ≤ 5% | 模型待机状态 |
| 内存占用 | ≤ 1GB | 含 Qwen 0.8B GGUF 模型（~800MB） |
| AI 推理延迟 | P95 ≤ 5,000ms | 单次弟子台词生成 |
| 并发推理 | ≤ 1 | 串行队列，禁止并发推理 |

---

## 代码规范

- TypeScript strict 模式，禁止 `any`（用 `unknown` + 类型守卫）
- 优先 `interface` 而非 `type`（除非联合类型）
- 所有导出函数/类必须有 JSDoc
- **台词和 UI 文案用中文**，代码注释和变量名用英文
- 文档和代码分开提交：`docs:` 和 `feat:` 不混在同一个 commit
- Git 提交规范详见 `.agents/workflows/git-workflow.md`

### Git 分支策略

```
main        → 稳定发布版
dev         → 开发主线
feature/*   → 功能分支（如 feature/mud-panel）
fix/*       → 修复分支
```

---

## 模块边界（禁止越界）

```
src/shared/    → 类型定义 + 公式 + 数据表（所有层的只读依赖）
src/engine/    → 游戏引擎逻辑（tick / 行为树 / MUD 日志）
src/ai/        → AI 适配层（LLMAdapter / prompt 构建 / 上下文管理）
src/ui/        → DOM 组件（MUD 面板 / 命令输入 / 状态 HUD）
server/        → Node.js 后端（AI 推理端点 + 模型管理）
```

- 禁止在 `src/ui/` 中直接修改 GameState（通过 Engine 层）
- 禁止在 `src/ui/` 中直接调用 `server/` API（通过 `src/ai/llm-adapter.ts`）
- 公式只能写在 `src/shared/formulas/`，禁止在 Engine 或 UI 层重复实现

### 前端 ↔ 后端通信约束

| 规则 | 说明 |
|------|------|
| 接口隔离 | 前端通过 `LLMAdapter` 接口调用后端，UI 层不得直接 `fetch` |
| 端点限制 | 后端仅暴露 `/api/infer` 端点，禁止暴露 GameState 操作端点 |
| CORS | 后端仅接受 `localhost` 来源请求 |
| 请求超时 | 前端 fetch 超时 = 10 秒，超时后 fallback 到模板台词 |

---

## 版本边界

| IN（lite 范围内） | OUT（lite 范围外） |
|:---|:---|
| 修炼引擎（炼气1 → 筑基圆满） | 金丹及以上境界 |
| 弟子行为树（8人 × 7态） | 弟子招募/动态扩展 |
| AI 灵智台词 + 事件决策 + 独白渲染 | 图形渲染/PixiJS/Canvas |
| MUD 文字面板 + 命令输入 | 云存档/多设备同步 |
| 灵田(2格) + 炼丹(3丹方) | 废丹回收/丹毒/宅邸灵气 |
| 天劫（炼气→筑基，3道雷） | 结丹天劫及以上 |
| 悬赏（D~B级） | Electron 壳（后期迁移） |
| NPC 灵魂系统（道德/特性/关系/情绪） | 完整 MMORPG 社交 |
| 世界事件系统（轻量地点+事件池+五级漏斗） | 完整拓扑地图/寻路 |
| 宗门道风（仁/霸×律/放） | 多宗门全面战争 |
| localStorage 存档 | — |

禁止实现 OUT 列中任何功能的实际代码（可保留空目录作为结构预留）。

---

## AI 层专项约束

| 规则 | 说明 |
|------|------|
| 模型规格 | Qwen3.5-2B（推荐）/ 0.8B（降级），GGUF Q4_K_M，llama-server 子进程 |
| 推理预算 | 输��� ≤ 256 tokens，prompt ≤ 1024 tokens |
| 上下文管理 | `AISoulContext.shortTermMemory` FIFO 上限 10 条 |
| Fallback | 后端不可用时 fallback 到模板台词，不阻塞引擎 tick |
| Prompt 版本化 | 所有 prompt 在 `src/ai/prompts/`，禁止硬编码 |
| 推理触发 | 事件驱动，禁止定时轮询 |
| 超时 | 前端 10 秒未响应 → fallback 台词 |

### Prompt 模板管理

- 每个 prompt 文件头部标注版本号和最后更新日期
- 修改 prompt 必须通过 Git 提交，禁止运行时动态修改
- 新增 prompt 模板前必须与用户确认

---

## 数值验证（硬约束）

凡涉及游戏数值公式的代码变更，必须同步产出验证脚本：

| 规则 | 说明 |
|------|------|
| 脚本位置 | `scripts/` 目录下 |
| 脚本命名 | `lite-{系统名}-sim.ts` 或 `lite-{系统名}-verify.ts` |
| 覆盖范围 | `src/shared/formulas/` 下的每个公式文件至少有一个对应验证脚本 |
| 输出要求 | 必须输出可读的验证结果（表格/曲线），不能仅返回 pass/fail |
| 蒙特卡罗 | 涉及概率的公式必须跑 ≥ 1,000 次模拟 |
| 回归验证 | 修改已有公式时先运行既有脚本确认无回归 |

---

## 测试脚本管理

| 规则 | 说明 |
|------|------|
| AI 后端测试 | `server/tests/` 目录，命名 `ai-{功能名}-test.ts` |
| 测试数据 | `server/tests/fixtures/` — JSON payload、mock 数据等 |
| 数值验证 | `scripts/` 目录（见上方数值验证章节） |
| npm 脚本 | 常用测试添加到 `package.json` 的 `scripts` 中 |
| 禁止遗留 | 所有测试脚本必须纳入版本管理，禁止遗留在临时位置 |

---

## 回归测试

```bash
npm run test:regression    # 64 组回归测试，必须全部通过
```

修改 Tick Pipeline 挂载阶段时必须运行回归。

### Tick Pipeline 挂载协议

新系统挂载到引擎 Tick Pipeline 时：
- 确定挂载阶段（参考 `docs/design/arch/pipeline.md`）
- 更新依赖矩阵（`docs/design/arch/dependencies.md`）
- 确保无跨阶段因果依赖冲突
- 全局回归通过（`npm run test:regression`）

---

## 文档模块化规则

MASTER 索引文件（≤150行）只存摘要和链接，detail 文件（≤400行）存具体内容。

**写入路径映射表**：

| 变更类型 | 写入文件 |
|---------|---------|
| 新增资源/消耗 | `docs/project/prd/economy.md` |
| 新增系统 | `docs/project/prd/systems.md` |
| 新增公式/数据表 | `docs/project/prd/formulas.md` |
| 新增代码文件 | `docs/design/arch/layers.md` |
| 新增 GameState 字段 | `docs/design/arch/gamestate.md` |
| 新增 Pipeline Handler | `docs/design/arch/pipeline.md` |
| 新增依赖 | `docs/design/arch/dependencies.md` |
| 新增存档版本/迁移 | `docs/design/arch/schema.md` |
| Pipeline 过程资产 | `docs/pipeline/phaseX/{spm-analysis,plan,task,review,walkthrough}.md` |

---

## Pipeline 过程资产规范

所有 Pipeline 过程文档必须写入 `docs/pipeline/phaseX/`：
- `spm-analysis.md` — SPM 分析过程
- `plan.md` — 实施计划
- `task.md` — 执行追踪
- `review.md` — Gate Review 报告
- `walkthrough.md` — 完成总结

已创建的过程资产禁止删除（只增不删）。禁止将这些资产遗留在临时目录中。

---

## 交接文档

每次会话结束前必须更新：
- `docs/project/handoff.md` — 当前断点 + 接手指南 + 关键决策 + 遗留风险
- `docs/project/task-tracker.md` — Phase 级进度（Phase 完成/新建/Gate 变化时）

---

## 跨项目复用约束

- 从 7waygame 复制代码，不做 npm link/monorepo
- 复制后可精简，禁止添加 7waygame 不存在的数值公式
- lite 公式必须与 7waygame `shared/formulas/` 数值完全一致
- 复用的文件保持原文件名，新增的文件加 `lite-` 前缀
- 完整复用文件清单见 AGENTS.md §八

---

## 常用命令

```bash
npm run dev              # Vite dev server :5173
npm run build            # 生产构建（tsc + vite build）
npm run ai               # AI 后端 :3001
npm run download-model   # 下载 Qwen 0.8B GGUF
npm run test:regression  # 64 组回归测试
npm run test:ai-stress   # AI 压力测试
```

---

## 禁止事项

1. 未读 MASTER 文档就开始编码或规划
2. 一个 commit 中混合文档和代码变更
3. 实现版本边界 OUT 列中的功能
4. UI 层直接调用 AI 后端或修改 GameState
5. Engine/UI 层重复实现 shared/formulas 的公式
6. AI 后端暴露除 `/api/infer` 以外的端点
7. 硬编码 AI prompt 字符串
8. AI 推理传入完整 GameState
9. 添加 7waygame 公式库中不存在的数值公式
10. 数值公式代码变更不附带验证脚本
11. 未更新文档并获确认就开始编码
12. 修改 Pipeline 挂载阶段而不更新 `docs/design/arch/pipeline.md`
13. 向 MASTER 索引追加大段内容（必须写入 detail 文件）
14. 将 Pipeline 过程资产遗留在临时目录（必须写入 `docs/pipeline/phaseX/`）
