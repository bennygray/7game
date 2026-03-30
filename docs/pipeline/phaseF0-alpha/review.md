# Phase F0-α — SGA Review 报告

> **执行角色**：/SGA | **日期**：2026-03-30
> **审查对象**：[phaseF0-alpha-TDD.md](../../design/specs/phaseF0-alpha-TDD.md)

---

## R4 项目经理 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 范围蔓延 | ✅ | 严格限制在 PRD F0-α 范围：3 个新文件 + 4 个修改文件。无"顺便"功能。道风漂移/碰面后果/AI prompt 注入均明确标注为 OUT |
| D2 工期评估 | ✅ | 修改量：新文件 3 个（encounter.ts/encounter-templates.ts/encounter-tick.handler.ts）+ 修改 4 个（soul.ts/game-state.ts/save-manager.ts/tick-pipeline.ts/idle-engine.ts）。复杂度 S~M，估时 2~3 天 |
| D3 依赖阻塞 | ✅ | 无外部依赖。全部使用现有 TickPipeline + EventBus + GameState 基础设施 |
| D4 路线图冲突 | ✅ | 完全对齐 Roadmap V3.1 Phase F0-α |
| D5 交付验证 | ✅ | TDD §3.5 明确列出回归测试范围：64 条原有断言 + 新增迁移链断言 + Monte Carlo 密度统计 |

## R5 偏执架构师 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 耦合度 | ✅ | 单向依赖链：encounter.ts(Data) ← encounter-tick.handler(Engine)。无循环依赖。Handler 只读 state + emit EventBus，不直接写 GameState |
| D2 扩展性 | ✅ | 新增地点 = LocationTag 枚举 + BEHAVIOR_LOCATION_MAP + LOCATION_LABEL 各加 1 行。新增碰面结果 = EncounterResult + 概率表 + 文案各加 1 条。改 ≤3 文件 |
| D3 状态污染 | ✅ | 新增 SectState.ethos/discipline，唯一写入者 = 初始化函数（F0-α 中无运行时写入者）。cooldownMap 为模块闭包变量，不进入 GameState |
| D4 性能预警 | ✅ | O(N²) N≤8，每 5 秒一次，max 28 对比较 < 0.1ms。无 tick 热循环性能风险 |
| D5 命名一致 | ✅ | LocationTag/EncounterResult 遵循 `const + as const` 枚举模式（同 DiscipleBehavior/Realm/DaoFoundation）；handler 命名 `encounter-tick` 遵循 kebab-case；文件路径遵循 `handlers/*.handler.ts` |

## R6 找茬QA 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 边界穷举 | ⚠️ WARN | **弟子数为 0 时**（理论不可能但 defensively）：disciples 空数组 → 分组后所有地点为空 → 无配对 → handler 直接 return。安全。**RelationshipEdge 不存在时**（某对弟子无关系边）：avgAffinity 应 fallback 为 0 → 路人带。**需要 SGE 实现时确保 fallback** |
| D2 并发竞态 | ✅ | encounter-tick(610) 在 disciple-tick(600) 之后、soul-event(625) 之前。单 tick 内顺序执行，无并发。encounter-tick 只读 state + emit EventBus，不写入 GameState → 无竞态风险 |
| D3 回归风险 | ✅ | SoulEventType 扩展为联合类型追加 → 现有 switch/if 兼容（有 default）。SectState 新增仅追加字段 → 不影响现有读取。SAVE_VERSION 递增 → 迁移链已规划 |
| D4 可测试性 | ⚠️ WARN | getDiscipleLocation 纯函数 → 完全可测试。碰面概率掷骰 → 需要 Monte Carlo 统计（N≥1000）而非确定性断言。**建议**：SGE 提供注入 random 的接口或 seed 支持 |
| D5 存档兼容 | ✅ | v4→v5 迁移函数完整：sect.ethos 默认 0、sect.discipline 默认 0。defaults 兜底浅合并可覆盖。迁移链 v1→v2→v3→v4→v5 完整 |

---

## L2 CoVe 对 WARN 项验证

### WARN-1（R6-D1：RelationshipEdge 不存在时 avgAffinity 计算）

**验证问题**：
1. 现有代码中是否所有弟子对都有 RelationshipEdge？→ 是，`generateInitialRelationships` 为每对弟子生成双向边
2. 如果未来弟子数变化导致边缺失？→ SGE 应写 `findRelationshipEdge()` helper 并 fallback 为 0
3. 是否需要 BLOCK？→ 否，当前 8 弟子全覆盖，fallback 设计可在 SGE 实现

**CoVe 结论**：WARN 维持。SGE 须实现 affinity 查找的 fallback。

### WARN-2（R6-D4：碰面概率的可测试性）

**验证问题**：
1. 能否通过 seed 化随机实现确定性测试？→ 可以注入 `randomFn` 参数
2. 是否需要 BLOCK？→ 否，Monte Carlo 统计 N=1000 可以验证分布符合预期

**CoVe 结论**：WARN 维持。SGE 实现时注入 randomFn 参数。

---

## 最终判定

| 统计 | 数量 |
|------|:----:|
| ✅ PASS | 13 |
| ⚠️ WARN | 2 |
| 🔴 BLOCK | 0 |

### ⚠️ **CONDITIONAL PASS** — 可进入 GATE 2 签章

WARN 项传递给 SGE：
1. **WARN-1**：affinity 查找 helper 须有 fallback 为 0 的防御性设计
2. **WARN-2**：碰面掷骰函数须支持注入 randomFn 以实现 seed 化测试
