# Phase TG-3 Walkthrough — 文档关系梳理 + 交叉索引 + 追溯链

> **日期**：2026-04-02 | **执行者**：SGE
> **PRD**: `docs/features/phaseTG-3-PRD.md` v1.0 | **TDD**: `docs/design/specs/phaseTG-3-TDD.md` v1.0

---

## 交付总结

**11 个交付物 / 3 新建 + 12 修改 = 15 个文件**，零代码变更。

### 关键决策反转

- **Option C → Option B**：Gate 2 审查发现 W4（16+ 引用 AGENTS.md §N 会断）→ 用户要求反转
- **最终方案**：AGENTS.md 保持完整主规范（跨项目可移植），CLAUDE.md 瘦身为 82 行适配层

### 交付物清单

| # | 交付物 | 状态 | 关键数据 |
|---|--------|:----:|---------|
| D1 | CLAUDE.md 瘦身 + AGENTS.md 保持 | ✅ | CLAUDE.md 324→82 行；AGENTS.md 不变 |
| D2 | handoff 瘦身 + 历史归档 | ✅ | handoff 335→60 行；handoff-archive.md 新建 |
| D3 | MASTER-ARCHITECTURE 修正 | ✅ | Data 22→20, Handler 13→15, v1.7→v1.8 |
| D4 | MASTER-PRD 修正+瘦身 | ✅ | §2 Mermaid→文字, 暂缓标注 FB-013~015, 164→149 行 |
| D5 | INDEX Quick Orient + 注册 | ✅ | +权责表(7 文档) +角色路径(5 角色) +Skills +TG-3 |
| D6 | 系统交叉索引 | ✅ | cross-index.md 27 系统行 |
| D7 | 需求追溯链 | ✅ | traceability.md 21 Phase 覆盖 |
| D8 | project.yaml 注册 | ✅ | +arch_cross_index, +prd_traceability, +skills_dir |
| D9 | 启动协议更新 | ✅ | +INDEX Quick Orient step; ROADMAP→Level 2 |
| D10 | review-protocol 触发表 | ✅ | §0.1 含 7 变更模式→检查项 |
| D11 | Detail 互引 | ✅ | gamestate↔schema, pipeline↔dependencies |

### 验证清单

| # | 验证项 | 结果 |
|---|--------|------|
| V1 | CLAUDE.md 对齐 AGENTS.md（引用指针） | ✅ 19 处引用 |
| V2 | cross-index ≥ 20 系统 | ✅ 27 系统 |
| V3 | traceability 覆盖全部 Phase | ✅ 21 Phase (A~TG-2) |
| V4 | 所有新文件注册到 INDEX.md | ✅ cross-index/traceability/archive/TG-3/Skills |
| V5 | MASTER-PRD ≤ 150 / MASTER-ARCH ≤ 150 | ✅ 149 / 140 |
| V6 | handoff ≤ 100 行 | ✅ 60 行 |
| V7 | 零断链 | ✅ 已验证 |

---

## 文件变更清单

### 新建文件（3）
1. `docs/design/arch/cross-index.md` — 系统交叉索引
2. `docs/project/prd/traceability.md` — 需求追溯链
3. `docs/project/handoff-archive.md` — 历史归档

### 修改文件（12）
1. `CLAUDE.md` — 瘦身为 82 行适配层
2. `docs/design/MASTER-ARCHITECTURE.md` — v1.8 修正 + §4.5 指针
3. `docs/project/MASTER-PRD.md` — v2.1 瘦身 + §6.5 指针
4. `docs/INDEX.md` — Quick Orient + 全面注册
5. `docs/project/handoff.md` — 瘦身至 60 行
6. `.agents/project.yaml` — +3 路径条目
7. `.agents/skills/_shared/review-protocol.md` — +§0.1 触发表
8. `docs/design/arch/gamestate.md` — +互引 schema.md
9. `docs/design/arch/schema.md` — +互引 gamestate.md
10. `docs/design/arch/pipeline.md` — +互引 dependencies.md
11. `docs/design/arch/dependencies.md` — +互引 pipeline.md
12. `docs/features/phaseTG-3-PRD.md` — Option B 决策反转更新

### Pipeline 过程资产
- `docs/pipeline/phaseTG-3/spm-analysis.md`
- `docs/pipeline/phaseTG-3/plan.md`
- `docs/pipeline/phaseTG-3/review-g1.md`
- `docs/pipeline/phaseTG-3/review-g2.md`
- `docs/pipeline/phaseTG-3/walkthrough.md`（本文件）
