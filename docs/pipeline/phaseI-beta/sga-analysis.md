# Phase I-beta SGA 分析过程资产

> **日期**：2026-04-02 | **角色**：/SGA

---

## 1. 全局对齐结果

- **架构层归属**：Data 层（类型+常量）+ Engine 层（social-engine + social-tick handler）
- **GameState 拓扑变更**：`relationships[].{closeness,attraction,trust,status}` 替代 `affinity`；`disciples[].orientation` 新增
- **Pipeline 变更**：+social-tick handler (612:5)
- **存档版本**：v7 → v8

## 2. Grep 证据摘要

| 符号 | 引用文件数 | 总引用数 | 状态 |
|------|:---------:|:-------:|:----:|
| `affinity` (全量) | 21 | 99 | 全部需迁移 |
| `RelationshipEdge` | 6 | 13 | 接口变更 |
| `RelationshipTag` | 7 | 13 | 保留，阈值迁移 |
| `SoulEvaluationResult` | 5 | 12 | delta 格式变更 |
| `SoulEventType` | 7 | 16 | +13 新成员 |
| `RelationshipMemory` | 8 | 25+ | 三维适配 |
| `orientation` | 0 | 0 | 净新增 |

## 3. ADR 摘要

| ADR | 决策 | 核心理由 |
|-----|------|---------|
| ADR-Iβ-01 | 新建 social-tick handler（非复用 causal-tick） | 邀约需异步 AI，非简单条件→事件 |
| ADR-Iβ-02 | 一次性全量重命名 affinity→closeness | 别名增加维护成本，tsc+regression 保障完整性 |
| ADR-Iβ-03 | 复用 AsyncAIBuffer 处理邀约 AI 调用 | 避免同步阻塞 tick，复用现有基础设施 |
| ADR-Iβ-04 | KeyRelationshipEvent 保持单值 closenessDelta | 节省 prompt token，closeness 是主轴 |

## 4. 影响范围

- **修改文件**：~24 个
- **新建文件**：3 个（social-engine.ts, social-tick.handler.ts, social-event-templates.ts）
- **新建脚本**：1 个（verify-social-system.ts）
- **文档更新**：9 个架构/项目文档

## 5. 风险评估

| 风险 | 级别 | 缓解 |
|------|:----:|------|
| 99 处 affinity 重命名遗漏 | 中 | tsc --noEmit 强制检查 + regression |
| 三维 delta AI 格式不稳定 | 中 | 重试机制 + 降级策略（INV-5） |
| social-tick 与 soul-engine 写入竞争 | 低 | Pipeline 时序隔离（612 vs 625） |
