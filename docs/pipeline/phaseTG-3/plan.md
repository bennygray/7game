# Phase TG-3 实施计划 — 文档关系梳理 + 交叉索引 + 追溯链

> **Phase**: TG-3 | **来源**: FB-020(c) | **日期**: 2026-04-02
> **前置**: TG-1 ✅ + TG-2 ✅ | **SPM 分析**: `spm-analysis.md`

---

## 用户决策

- **D1**: ~~选项 C~~ → **选项 B**：AGENTS.md 保持完整主规范，CLAUDE.md 瘦身为适配层（Gate 2 后因 W4 可移植性风险反转）
- **D2**: handoff.md 历史归档到 `docs/project/handoff-archive.md`（选项 B）
- **D3**: 审计发现的 8 个问题全部纳入 TG-3

---

## 变更清单（14 个任务）

### 结构性重构（原计划遗漏）

#### T0: CLAUDE.md 瘦身 + AGENTS.md 保持完整
- **AGENTS.md**: 保持完整主规范（466 行不变），仅修正 SLO 差异
- **CLAUDE.md**: 瘦身为 ~80 行适配层，保持"本文件是 AGENTS.md 的适配层"声明，删除重复段落，替换为 `→ 见 AGENTS.md §X` 引用
- 理由：16+ 处引用 AGENTS.md §N；`.agents/` 目录需跨项目可移植

#### T0b: handoff.md 瘦身 + 历史归档
- 新建 `docs/project/handoff-archive.md`：迁入 Phase E~TG-2 历史详情（~250 行）
- handoff.md 瘦身至 ~100 行：仅保留当前断点 + 上一 Phase 摘要 + 接手指南 + 遗留风险

#### T0c: MASTER-ARCHITECTURE 过期数据修正
- §1 表：Data 22→20，Handler 13→15
- C-1 描述：13→15 Handler
- 版本号 v1.7→v1.8

#### T0d: MASTER-PRD ↔ feature-backlog 范围冲突修复
- §4.1 IN/OUT 表中天劫/悬赏/丹毒标注"⏸ 暂缓，见 FB-013~015"

### 原计划任务（扩展）

#### T1: INDEX.md — 吸收 START-HERE + 注册孤立内容
- Quick Orient 区（权责表 + 按角色阅读路径）
- 注册 .agents/skills/ 三个 SKILL.md
- 注册 pipeline/README.md 回链
- soul-vision-rethinking 01-05 标注"（历史）"

#### T2: 新建 `docs/design/arch/cross-index.md`
系统×引入 Phase×核心文件×Handler×依赖 交叉表

#### T3: 新建 `docs/project/prd/traceability.md`
System → Phase → PRD → User Stories → 验证脚本 追溯表

#### T4: MASTER-ARCHITECTURE — 交叉索引指针 + detail 同级互引声明
- 插入 §4.5 交叉索引指针
- Detail 清单注册 cross-index.md
- 添加 detail 互引建议注释

#### T5: MASTER-PRD — 瘦身 + 追溯链指针
- §2 Mermaid（19 行）→ 文字（2 行）
- 插入 §6.5 追溯链指针
- 目标 ≤ 150 行

#### T6: project.yaml — 注册新路径
- `arch_cross_index`, `prd_traceability`
- `skills_dir: ".agents/skills"`

#### T7: 启动协议更新
- CLAUDE.md Level 1 插入 INDEX.md 为 step 1
- SOUL-VISION-ROADMAP 降级到 Level 2
- 标注路径以 project.yaml 为准

#### T8: review-protocol.md — 触发模式检查表

### Detail 文件同级互引（新增）

#### T9: detail 文件添加同级交叉引用
- `arch/gamestate.md` → "版本迁移见 schema.md"
- `arch/schema.md` → "字段定义见 gamestate.md"
- `arch/pipeline.md` → "影响分析见 dependencies.md"
- `arch/dependencies.md` → "执行顺序见 pipeline.md"

---

## 收尾

- `docs/pipeline/phaseTG-3/walkthrough.md`
- `docs/INDEX.md` — 注册所有新文件 + phaseTG-3 pipeline 条目
- `docs/project/feature-backlog.md` — FB-020(c) ✅
- `docs/project/handoff.md` — 更新断点（瘦身后）
- `docs/project/task-tracker.md` — TG-3 状态

---

## 验证清单

1. [ ] AGENTS.md 保持完整主规范（~466 行），CLAUDE.md 瘦身为适配层（≤100 行）
2. [ ] CLAUDE.md SLO 与 AGENTS.md 一致（无差异，以 AGENTS.md 为准）
3. [ ] handoff.md ≤ 100 行，历史在 handoff-archive.md
4. [ ] MASTER-PRD ≤ 150 行，天劫/悬赏/丹毒标"⏸ 暂缓"
5. [ ] MASTER-ARCHITECTURE Handler=15, Data=20, version=v1.8
6. [ ] cross-index.md ≥ 20 系统行
7. [ ] traceability.md 覆盖全部已实现 Phase
8. [ ] INDEX.md Quick Orient 权责表 + skills/pipeline-README 已注册
9. [ ] soul-vision-rethinking 01-05 标注历史
10. [ ] detail 文件含同级互引
11. [ ] project.yaml 含 skills_dir + 2 新路径
12. [ ] review-protocol §0.1 含 7 触发模式
13. [ ] FB-020 (a)(b)(c) 全部清偿
14. [ ] 零断链
