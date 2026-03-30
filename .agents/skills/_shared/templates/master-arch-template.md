# {{PROJECT_NAME}} — 全局架构文档 (MASTER-ARCHITECTURE)

> **版本**：v1.0 | **最后更新**：{{DATE}}
> **文档角色**：宪法层索引 - 全局架构约束与决策总纲
> **阅读策略**：本文件为索引，永远在 Bootstrap 时读取。按需阅读 detail 文件。

---

## §1 架构原则

| # | 原则 | 说明 |
|---|------|------|
| 1 | 分层解耦 | 各层通过接口通信，禁止跨层直接引用 |
| 2 | 文档先行 | 先设计后编码，interface 确认后不可擅改 |
| 3 | 可验证性 | 每个数值公式必须有对应验证脚本 |

---

## §2 分层架构 → [detail](arch/layers.md)

> 代码文件分层归属。新增文件时必读。

---

## §3 数据拓扑 → [detail](arch/gamestate.md)

> 核心状态结构。新增字段时必读。

---

## §4 Pipeline 架构 → [detail](arch/pipeline.md)

> Tick Pipeline 阶段定义。新增 handler 时必读。

---

## §5 依赖矩阵 → [detail](arch/dependencies.md)

> 模块间因果依赖。新增依赖时必读。

---

## §6 数据版本与迁移 → [detail](arch/schema.md)

> 存档版本演进。新增版本时必读。

---

## Detail 文件清单

| 文件 | 内容 | 维护 Skill |
|------|------|-----------| 
| [`arch/layers.md`](arch/layers.md) | 代码文件分层 | /SGA, /SGE |
| [`arch/gamestate.md`](arch/gamestate.md) | 状态结构 | /SGA |
| [`arch/pipeline.md`](arch/pipeline.md) | Pipeline 阶段 | /SGA |
| [`arch/dependencies.md`](arch/dependencies.md) | 依赖矩阵 | /SGA |
| [`arch/schema.md`](arch/schema.md) | 存档版本 | /SGA |

---

## 变更日志

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| {{DATE}} | v1.0 | 初始创建 |
