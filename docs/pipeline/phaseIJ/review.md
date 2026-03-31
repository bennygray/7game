# Phase IJ — SGA Gate Review 报告

> **日期**：2026-03-31 | **角色**：/SGA Party Review
> **版本**：v2.0（对齐 RelationshipMemory 模型）
> **协议**：按 `_shared/review-protocol.md` 四层防线执行（L0 跳过，L1+L2 完成）

---

## L0：Content Traceability

> SGA (TDD 审查) 跳过 L0，直接进入 L1。

---

## L1：维度穷举签字

### R4 项目经理

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 范围蔓延 | ✅ | TDD §1: 4 子系统交付深度明确（关系记忆=设计+PoC，其余=仅设计）。5新+5改均在 PRD §2 范围内。对照 CLAUDE.md IN 列确认 NPC 灵魂系统在范围内。 |
| D2 工期评估 | ✅ | §11: 12 任务（T1-T12），多为 S 级。唯一 M 级是 T3 RelationshipMemoryManager。不超 8h。 |
| D3 依赖阻塞 | ✅ | 零外部依赖。内部依赖均已验证存在：game-state.ts:161-170（RelationshipEdge）、soul.ts:173（RelationshipTag）、tick-pipeline.ts:78-105（TickContext）。 |
| D4 路线图冲突 | ✅ | Phase IJ 已列入 SOUL-VISION-ROADMAP V4.0。不影响后续 Phase。 |
| D5 交付验证 | ✅ | T11 回归+专项测试。T10 debug 命令。每个集成任务可通过 regression 64/64 验证。 |

**BLOCK**: 无

### R5 偏执架构师

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 耦合度 | ✅ | RelationshipMemoryManager 通过 TickContext 可选字段注入（与 asyncAIBuffer 模式一致，tick-pipeline.ts:103）。依赖方向单向 engine/ → shared/types/。 |
| D2 扩展性 | ✅ | 新增 RelationshipTag 仅改 soul.ts（1 文件）。新增 keyEvent 记录点仅追加一行 recordEvent()（1 文件）。 |
| D3 状态污染 | ✅ | 零 GameState 新字段。运行时 Map 唯一写入者是 Manager 自身。§7 明确"不改存档 schema"。 |
| D4 性能预警 | ✅ | Map.get O(1)，keyEvents O(k) k≤10，摘要排序 O(k log k) k≤10。远低于红线。 |
| D5 命名一致 | ⚠️ | TDD §3.1 `import type { RelationshipTag } from './game-state'` 错误。实际 RelationshipTag 定义在 soul.ts:173，game-state.ts 未 re-export。 |
| D1 延伸 | ⚠️ | `buildRelationshipSummary(sourceId, targetId, targetName)` 声称内部调用 syncFromEdge()，但签名无 edge/state 参数。API 缺口。 |

**BLOCK**: 无 | **WARN**: 2

### R6 找茬QA

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 边界穷举 | ⚠️ | §4.3 双写表将 `soul-engine.ts updateRelationshipTags()` 列为 recordEvent() 调用点。但 updateRelationshipTags()（soul-engine.ts:193-208）不计算 affinityDelta，它只读 affinity 分配 tags。实际 delta 产生在 applyEvaluationResult()（soul-engine.ts:164-186）。 |
| D2 并发竞态 | ✅ | Pipeline 阶段顺序：encounter(610) → soul-event(625) → dialogue(650)。所有双写点在不同阶段，无同阶段多写者。 |
| D3 回归风险 | ✅ | 全部 additive：新增可选 TickContext 字段、新增双写、新增 prompt 段（有则注入，无则不变）。不修改现有函数签名或返回值。 |
| D4 可测试性 | ✅ | RelationshipMemoryManager 独立类，可 new 后直接单元测试。recordEvent/矛盾覆盖/摘要构建全部可自动化。 |
| D5 存档兼容 | ✅ | v5 不变。零新持久化字段。Map 纯运行时。旧 shortTermMemory 和 RelationshipEdge 不受影响。 |

**BLOCK**: 无 | **WARN**: 1

---

## L2：CoVe 证据验证

### W1: R5-D5 — RelationshipTag import 路径

| 步骤 | 内容 |
|------|------|
| 验证问题 | ① RelationshipTag 在哪个文件定义？② game-state.ts 是否 re-export？ |
| 独立回答 | ① soul.ts:173 / ② 未 re-export |
| 结论 | **维持 WARN**。SGE 编码时按实际路径 import 即可。 |

### W2: R5-D1 — buildRelationshipSummary API 缺口

| 步骤 | 内容 |
|------|------|
| 验证问题 | ① syncFromEdge 可否外部调用？② Manager 持有 state.relationships 引用是否违反模块边界？ |
| 独立回答 | ① 可以但增加使用复杂度 / ② engine 可读 shared，不违反，但绑定生命周期 |
| 结论 | **维持 WARN**。推荐方案：buildRelationshipSummary 增加 edges 参数。 |

### W3: R6-D1 — 双写调用点错误

| 步骤 | 内容 |
|------|------|
| 验证问题 | ① updateRelationshipTags 能否获得 delta？② applyEvaluationResult 是否覆盖所有 affinity 变更路径？ |
| 独立回答 | ① 不能（只读 affinity） / ② 是主路径，其他路径 SGE 实施时需排查 |
| 结论 | **维持 WARN**。§4.3 双写表需修正。 |

### W4（降级）: encounter-tick Invariant I2

| 步骤 | 内容 |
|------|------|
| 验证问题 | ① I2 精确措辞？② 运行时 Map 写入算"写 GameState"？ |
| 独立回答 | ① "碰面不写 GameState，仅 emit EventBus + MUD log" / ② 不算 |
| 结论 | **降级为建议**。运行时统计不违反 I2。代码注释说明即可。 |

---

## Review 汇总

| 角色 | 类型 | 结果 |
|------|------|:----:|
| R4 项目经理 | 必选 | ✅ PASS |
| R5 偏执架构师 | 必选 | ✅ PASS (2 WARN) |
| R6 找茬QA | 必选 | ✅ PASS (1 WARN) |

## BLOCK: 0

## WARN: 3

| # | 来源 | 内容 | 处理建议 |
|---|------|------|---------|
| W1 | R5-D5 | RelationshipTag import 路径应为 `./soul` | SGE 编码时按实际路径 import |
| W2 | R5-D1 | buildRelationshipSummary 缺 edges 参数 | 增加 `edges: RelationshipEdge[]` 参数 |
| W3 | R6-D1 | recordEvent 调用点应为 applyEvaluationResult | 修正 TDD §4.3 双写表 |

## GATE 2

```
[x] GATE 2 PASSED (CONDITIONAL) — 2026-03-31
3 WARN 均不阻塞设计方向，SGE 编码时处理。
```
