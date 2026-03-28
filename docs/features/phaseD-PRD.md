# Phase D — AI 深化 + Log 系统 + Intent 重构 (PRD)

> **Phase**: D (v0.4) | **文档格式**: Trinity PRD (新格式)
> **状态**: **GATE 1 待签 — 等待 USER 审阅**
> **范围**: AI 深化(D1) + Log 系统(D2) + Intent 重构(D3/TD-003) + FB-001 清偿
> **Story 文件**: [`7game-lite-user-stories-phaseD.md`](../design/specs/7game-lite-user-stories-phaseD.md)

---

## 1. 产品定位

### 1.1 核心诉求

| 系统 | 核心体验 | ROI |
|------|---------|-----|
| **D1 AI 深化** | 弟子从"各自独白"进化到"双向对话"，涌现宗门生活感 | M成本 / 体验4.5分 |
| **D2 Log 系统** | 开发者按类别+级别追踪事件，快速定位问题 | S成本 / 体验3分(开发) |
| **D3 Intent 重构** | 行为树从副作用模式→Intent模式，解锁多弟子协调 | M成本 / 体验0分(架构) |

### 1.2 债务清偿

| # | 来源 | 描述 | 处置 |
|---|------|------|------|
| TD-003 | Phase A 设计 | behavior-tree 副作用→Intent 模式 | ✅ 本次清偿（D3） |
| FB-001 | Phase A 预留 | 弟子间对话交互 | ✅ 本次清偿（D1） |

### 1.3 新增债务

| # | 描述 | 来源 | 排期 |
|---|------|------|------|
| FB-004 | 关系系统：好感度/好友/仇敌，事件驱动对话过滤 | Phase D Q1 讨论 | 待定 |

---

## 2. Invariant（不变量）

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | AI 只负责表现层（台词/对话），不决定数值 | 数值被幻觉污染 |
| I2 | AI 不可用时游戏功能完整（fallback 路径必存在） | 游戏卡死 |
| I3 | Log 不影响游戏逻辑（纯观察者） | 系统耦合 |
| I4 | Intent 不可跨 tick 持久化 | 存档膨胀 |
| I5 | 弟子间对话不影响行为决策 | 行为树失控 |

---

## 3. USER 决策记录

| Q | 决策 | 说明 |
|---|------|------|
| Q1 | **B** — 行为结束触发旁观评论 | "周围弟子"=同宗门全体（4人）|
| Q2 | **B** — 双向对话，最多2轮 | 测试重点：A事件→B评论→A回应 |
| Q3 | **B** — Logger + 文件持久化 + 日志量控制 | rotation + 限流 |
| Q4 | **A** — MUD 面板暂不改 | — |
| Q5 | **50%** — 对话触发概率 | 测试阶段调高 |
| Q6 | **A** — 新增旁观评论模板池 | 5场景 x 5+条模板 |
| Q7 | **B** — IndexedDB 持久化 | 结构化数据 |

---

## 4. 业务实体

### 4.1 BehaviorIntent（D3 Intent 重构）

```typescript
export interface BehaviorIntent {
  type: 'start-behavior' | 'end-behavior' | 'continue';
  discipleId: string;
  newBehavior?: DiscipleBehavior;
  duration?: number;
  oldBehavior?: DiscipleBehavior;
  auraReward?: number;
  sideEffectLogs?: string[];
}
```

### 4.2 DialogueTrigger + DialogueExchange（D1 对话系统）

```typescript
export interface DialogueTrigger {
  type: 'behavior-end';
  sourceId: string;
  eventDescription: string;
  behavior: DiscipleBehavior;
  outcomeTag: string;  // 'alchemy-success' | 'alchemy-fail' | 'harvest' | 'meditation' | 'explore-return'
}

export interface DialogueRound {
  speakerId: string;
  line: string;
  round: 1 | 2;
}

export interface DialogueExchange {
  triggerId: string;
  responderId: string;
  trigger: DialogueTrigger;
  rounds: DialogueRound[];
  timestamp: number;
}
```

### 4.3 GameLogger（D2 Log 系统）

```typescript
export enum LogLevel { DEBUG = 0, INFO = 1, WARN = 2, ERROR = 3 }
export enum LogCategory { ENGINE = 'ENGINE', DISCIPLE = 'DISCIPLE', AI = 'AI', SYSTEM = 'SYSTEM', ECONOMY = 'ECONOMY' }

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface GameLogger {
  debug(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;
  info(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;
  warn(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;
  error(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;
  flush(): LogEntry[];
  setLevel(level: LogLevel): void;
}
```

---

## 5. 规则与数值

### 5.1 对话触发（R1）

| 规则 | 数值 |
|------|------|
| R-D1a 触发概率 | **50%**（测试阶段） |
| R-D1b responder 冷却 | **60s** |
| R-D1c 单tick最多对话 | **1组** |
| R-D1d 附近弟子定义 | 全宗门（排除自身） |
| R-D1e responder选择 | 随机1名非冷却弟子 |
| R-D1f 最大轮次 | **2轮**（B评论+A回应） |
| R-D1g AI单轮超时 | **5s** |
| R-D1h 超时fallback | 旁观模板台词 |

### 5.2 触发场景（R2）

| outcomeTag | 场景 | 不触发 |
|------------|------|--------|
| `alchemy-success` | 炼丹成功 | REST |
| `alchemy-fail` | 炼丹失败 | IDLE |
| `harvest` | 灵田收获 | BOUNTY |
| `meditation` | 修炼结束 | |
| `explore-return` | 探索归来 | |

### 5.3 Intent 规则（R3）

| 规则 | 说明 |
|------|------|
| R-D3a | tickDisciple 变纯函数，禁止修改 state |
| R-D3b | Intent 按弟子顺序生成，统一执行 |
| R-D3c | FARM/ALCHEMY 副作用仅在 executeIntents 中 |
| R-D3d | executeIntents 返回 DiscipleBehaviorEvent[]（兼容） |
| R-D3e | 对话触发在 executeIntents 之后 |

### 5.4 Log 规则（R4）

| 规则 | 数值 |
|------|------|
| R-D4a 缓冲区上限 | 500条 |
| R-D4b 持久化间隔 | 30s |
| R-D4c 单次写盘 | 200条 |
| R-D4d 存储限制 | 1MB（rotate删旧50%） |
| R-D4e 默认级别 | DEV=DEBUG / PROD=INFO |
| R-D4f 持久化方案 | IndexedDB `7game-logs` |

### 5.5 持久化

> **Phase D 不需要存档版本升级（保持 v3）**。
> Intent/DialogueExchange/Log 均不纳入 GameState 存档。

---

## 6. User Story 映射

| Story | 复杂度 | 标题 | 依赖 |
|-------|--------|------|------|
| #1 | S | Logger 基础设施（GameLogger + IndexedDB） | 无 |
| #2 | M | Intent 重构（TD-003 清偿） | #1 |
| #3 | S | 旁观评论 Fallback 台词池 | 无 |
| #4 | M | AI 对话系统（DialogueCoordinator + 双向对话） | #2, #3 |
| #5 | S | 全局 Logger 迁移 + 集成测试 | #1, #2, #4 |

**总预估**: ~4 天

---

## 7. Party Review 报告

### 角色激活

| 类型 | 角色 | 激活原因 |
|------|------|---------|
| 必选 | R1 魔鬼PM | 默认 |
| **按需** | **R2 资深玩家** | 涉及核心体验变更（新增弟子间对话交互） |
| 必选 | R3 数值策划 | 默认 |
| 必选 | R5 偏执架构师 | 默认 |

### R1 魔鬼PM 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 ROI | ✅ | D1(M/4.5)=优秀; D2(S/3)=合理; D3(M/0)=纯架构但为D1前提且清偿TD-003; 总体ROI合理 |
| D2 认知负担 | ✅ | 玩家零新概念（对话自动发生，无需学习新操作）; 开发者新增Logger API但符合行业标准 |
| D3 范围控制 | ✅ | IN/OUT 清晰: IN=对话+Log+Intent; OUT=关系系统(FB-004)/MUD面板改造; 5条Story全覆盖 |

### R2 资深玩家 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 30秒乐趣 | ⚠️ WARN | 弟子对话依赖AI后端（fallback时仅1轮模板台词），首次体验可能因延迟等待5s感到困惑。**缓解**: fallback即时响应，AI结果异步追加 |
| D2 数字感知 | ✅ | Phase D不涉及数值，对话是纯文字体验，不影响数字膨胀 |
| D3 操作动机 | ✅ | 对话完全自动，零操作成本; 玩家天然好奇弟子互动; 50%高概率保证频繁触发 |
| D4 挫败感管控 | ✅ | 对话无失败/惩罚机制，纯正反馈 |

**L2 CoVe 验证（R2-D1 WARN）**：
1. 问: AI 延迟真的会导致5s空白吗？答: 当前 SmartLLMAdapter 已有异步机制，AI台词延迟到达后追加到MUD日志，期间游戏不阻塞
2. 问: fallback台词是否足够有趣？答: Story #3 新增旁观评论专用池，非复用行为台词，质量可保证
3. **结论**: 维持 ⚠️ WARN — AI延迟体验风险真实存在，但有缓解措施。记入技术债务追踪。

### R3 数值策划 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 漏斗平衡 | ✅ | Phase D不新增资源类型，不影响资源漏斗 |
| D2 极端模拟 | ✅ | 对话50%概率+60s冷却: 24h最坏=无AI后端全fallback(功能不降级); 24h最好=约720次对话(IO可控) |
| D3 公式验证 | ✅ | 触发概率50%、冷却60s、超时5s全部是硬编码常量，无复合公式需验证 |
| D4 Sink完备 | ✅ | 无新资源引入 |
| D5 二阶效应 | ✅ | 对话不产出任何资源，不存在乘法叠加链 |

### R5 偏执架构师 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 耦合度 | ⚠️ WARN | DialogueCoordinator 需要同时访问 LLMAdapter + AISoulContext + DiscipleState。形成三角依赖。**缓解**: 通过接口注入而非直接import |
| D2 扩展性 | ✅ | 新增对话场景只需添加 outcomeTag+模板台词，无需修改核心代码; Logger类别通过 enum 扩展 |
| D3 状态污染 | ✅ | Phase D不新增GameState字段; Intent/DialogueExchange/Log全部为瞬态或独立存储 |
| D4 性能预警 | ⚠️ WARN | AI双向对话(2轮)最坏延迟 = 2x5s = 10s 异步等待。虽不阻塞引擎，但MUD日志可能出现"幽灵对话"（10s后突然冒出来）。**缓解**: 对话完成后一次性输出全部轮次 |
| D5 命名一致 | ✅ | BehaviorIntent/DialogueTrigger/GameLogger 遵循项目命名约定; 文件路径遵循分层架构 |

**L2 CoVe 验证（R5-D1 WARN）**：
1. 问: DialogueCoordinator 的三角依赖是否可避免？答: 协调器天然需要知道"谁(弟子)说了什么(LLM)并记住(记忆)"，三角依赖是职责所在。通过构造器注入可解耦
2. **结论**: 维持 ⚠️ WARN — 依赖合理但需通过DI注入，记入实施约束

**L2 CoVe 验证（R5-D4 WARN）**：
1. 问: "幽灵对话"是否影响游戏体验？答: MUD日志本身就是滚动流，10s后追加对话反而更自然（像异步聊天）。但需确保时间戳正确
2. **结论**: 降为 ✅ PASS — "幽灵对话"实际上是合理的异步体验，与MUD日志流契合

### 汇总

| # | 角色 | 维度 | 判定 | 说明 | CoVe 结果 |
|---|------|------|:----:|------|-----------|
| 1 | R1 魔鬼PM | D1-D3 | ✅ | 全部PASS | — |
| 2 | R2 资深玩家 | D1 30秒乐趣 | ⚠️ | AI延迟可能影响首次体验 | 维持 WARN |
| 3 | R3 数值策划 | D1-D5 | ✅ | 全部PASS | — |
| 4 | R5 偏执架构师 | D1 耦合度 | ⚠️ | 三角依赖需DI注入 | 维持 WARN |
| 5 | R5 偏执架构师 | D4 性能预警 | ✅ | 幽灵对话实为合理异步 | 降为 PASS |

### 最终判定

> ⚠️ **CONDITIONAL PASS**: 存在 2 个 WARN 但无 BLOCK。可进入 SGA。
> - WARN-1 (R2-D1): AI 延迟体验 → 记入技术债务 TD-006
> - WARN-2 (R5-D1): DialogueCoordinator 依赖注入 → 记入实施约束

---

## 8. Pre-Mortem 分析

### 假设

> 假设 Phase D（弟子间对话系统）已上线 3 个月，结果**彻底失败**。

| # | 最可能的失败原因 | 预警信号 | 缓解措施 | 风险 |
|---|----------------|---------|---------|:----:|
| 1 | AI 推理延迟导致对话体验割裂，玩家觉得"弟子反应迟钝" | MUD日志中对话出现时间与事件间隔>5s | fallback即时响应+AI结果异步追加; 后续优化本地小模型 | 🟡 |
| 2 | Fallback 台词重复率高，玩家觉得弟子"NPC味太重" | 同一台词连续出现2次以上 | 每种场景5+条模板+性格前缀组合; 后续AI接入后自然缓解 | 🟢 |
| 3 | 对话过于频繁(50%)导致MUD日志被对话淹没 | 关键系统日志（突破/炼丹）被对话推走 | 概率可配置; MUD面板后续加分类过滤(FB-005) | 🟡 |

### 行动项

- 🟡 风险 #1: 已有 fallback 缓解，记入 TD-006
- 🟡 风险 #3: 50% 是测试值，上线前回调至 30%；考虑在 feature-backlog 中记录 MUD 日志过滤需求

---

## 9. Assumption Audit

| # | 假设 | 如果错误的后果 | 风险 | 验证方式 | 何时验证 |
|---|------|--------------|:----:|---------|---------| 
| A1 | 4名弟子=同宗门=全部"附近" | 未来扩展到多场景/外出时仍触发不合理对话 | 🟢 | 游戏当前只有宗门场景 | Phase E 加场景时 |
| A2 | AI 后端5s超时足够 | 本地小模型首次推理可能>5s(模型加载) | 🟡 | 本地 AI 压力测试 | Story #4 实施时 |
| A3 | IndexedDB 在所有目标浏览器可用 | 日志持久化静默失败 | 🟢 | 主流浏览器均支持; 提供 localStorage fallback | Story #1 实施时 |
| A4 | Intent 重构不影响现有行为树数值 | 回归测试失败 | 🟡 | 56条回归测试全部通过 | Story #2 实施时 |
| A5 | 50%对话概率在测试阶段合适 | 日志过多或以过少 | 🟢 | 运行120s观察对话频率 | Story #5 集成时 |

---

## USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] Party Review 无 BLOCK 项 (CONDITIONAL PASS: 2 WARN, 0 BLOCK)

签章：`[x] GATE 1 PASSED` — 2026-03-28

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 初始创建，SPM Step 0-3 + Party Review 完成 |
