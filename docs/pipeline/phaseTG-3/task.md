# Phase TG-3 执行追踪 — 文档关系梳理 + 交叉索引 + 追溯链

> **Phase**: TG-3 | **日期**: 2026-04-02 | **执行者**: SGE
> **来源**: plan.md (14 个任务)

---

## 任务状态

| # | 任务 | 状态 | 备注 |
|---|------|:----:|------|
| T0 | CLAUDE.md 瘦身 + AGENTS.md 保持完整 | ✅ | CLAUDE.md 324→82 行，AGENTS.md 不变 |
| T0b | handoff.md 瘦身 + 历史归档 | ✅ | handoff 335→60 行，新建 handoff-archive.md |
| T0c | MASTER-ARCHITECTURE 过期数据修正 | ✅ | Data 22→20, Handler 13→15, v1.7→v1.8 |
| T0d | MASTER-PRD 范围冲突修复 | ✅ | 天劫/悬赏/丹毒标注"⏸ 暂缓，见 FB-013~015" |
| T1 | INDEX.md Quick Orient + 注册 | ✅ | +权责表(7文档) +角色路径(5角色) +Skills +TG-3 |
| T2 | 新建 cross-index.md | ✅ | 27 系统行 |
| T3 | 新建 traceability.md | ✅ | 21 Phase 覆盖 |
| T4 | MASTER-ARCHITECTURE 交叉索引指针 | ✅ | §4.5 指针 + detail 互引 |
| T5 | MASTER-PRD 瘦身 + 追溯链指针 | ✅ | §2 Mermaid→文字, §6.5 指针, 164→149 行 |
| T6 | project.yaml 注册新路径 | ✅ | +arch_cross_index, +prd_traceability, +skills_dir |
| T7 | 启动协议更新 | ✅ | +INDEX Quick Orient step; ROADMAP→Level 2 |
| T8 | review-protocol.md 触发模式检查表 | ✅ | §0.1 含 7 变更模式→检查项 |
| T9 | detail 文件同级交叉引用 | ✅ | gamestate↔schema, pipeline↔dependencies |

---

## 统计

- **总任务**: 14（含 T0 系列 4 + T1~T9 共 10）
- **完成**: 14 | **跳过**: 0 | **阻塞**: 0
- **文件变更**: 3 新建 + 12 修改 = 15 个文件
