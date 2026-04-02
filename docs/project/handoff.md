# 7game-lite — 会话交接文档

> **上次更新**：2026-04-02 | **上次会话主题**：Phase UI-S 编码完成
> **当前活跃 Phase**：UI-S（社交系统显示与模板补全）— SGE 编码完成，待 GATE 3 审查
> **Phase 状态**：UI-S: SPM ✅ SGA ✅ SGE ✅（待 GATE 3）
> **详细历史**：见 [handoff-archive.md](handoff-archive.md)

---

## 当前断点

- **Phase UI-S ✅ 编码完成（待 GATE 3）** — 社交系统显示与模板补全
  - Status 中文化（crush→倾慕, lover→道侣, sworn-sibling→金兰, nemesis→宿敌）
  - Orientation 显示（inspect header：男·慕异 格式）
  - `relationships` 命令补全（edge.status + orientation + 统一中点分隔符）
  - 关系区双行布局（行1: 名字+status badge，行2: 亲·引·信·[标签]）
  - 社交模板接入（pickSocialTemplate+fillSocialTemplate wired to social-tick.handler）
  - 代词占位符（{P_A}/{P_B} 加入两套模板，合并 FB-026）
  - 共享标签工具（social-labels.ts 消除重复）
  - 新文件：`src/shared/utils/social-labels.ts`
  - 变更 8 文件 + 1 新建
  - tsc 0 errors / 回归 111/0 / social verify 78/0
  - **ADR**：ADR-UIS-01 (保持 {LOC} vs {L} 不统一), ADR-UIS-02 (追加可选参数而非 options 对象)

### 下一步

1. **Phase UI-S GATE 3 审查** — 走 doc-reviewer 审查
2. **Phase I** 深度世界：T2 幕后 NPC + 因果关系事件 + 道风转折

---

## 上一 Phase 摘要

- **Phase I-beta** ✅ — 社交事件系统（v0.6.0）
  - 三维关系重构（affinity→closeness/attraction/trust）+ 性取向系统
  - 离散关系状态：crush/lover/sworn-sibling/nemesis + invitation/dissolution 扫描
  - social-engine.ts + social-tick.handler.ts + social-event-templates.ts
  - 存档 v7→v8 迁移；4 ADR；回归 111/0 + social verify 78/0

---

## 关键决策（最近 3 条）

| 日期 | 决策 | 上下文 |
|------|------|--------|
| 2026-04-02 | **ADR-Iβ-01: social-tick sole writer of edge.status** | 避免多 handler 竞争写入关系状态 |
| 2026-04-02 | **ADR-Iβ-02: one-shot affinity→closeness rename** | 三维关系重构，affinity 语义不再准确 |
| 2026-04-02 | **ADR-Iβ-03: AsyncAIBuffer reuse for invitations** | 复用现有异步 AI 缓冲架构，避免新增通信通道 |
| 2026-04-02 | **ADR-Iβ-04: single closenessDelta in KeyRelationshipEvent** | 简化事件结构，单一 delta 足够 |

---

## 接手指南

1. 读 `.agents/project.yaml` → `docs/INDEX.md` Quick Orient 区
2. 读 `docs/project/MASTER-PRD.md` + `docs/design/MASTER-ARCHITECTURE.md`
3. 读本文件（当前断点 + 关键决策）
4. 运行 `npx tsx scripts/regression-all.ts` — 验证系统完整性（111 组）

---

## 遗留风险

| 风险 | 严重度 | 说明 |
|------|:------:|------|
| 关系数值参数未经模拟验证 | 中 | TD-012，需 Monte Carlo 模拟 |
| 19 条技术债务活跃 | 低 | 见 tech-debt.md（TD-028/029 新增于 TG-3） |
| 经济系统三件套暂缓 | 低 | 天劫/悬赏/丹毒已注册为 FB-013~015 |
| ~~弟子性别系统缺失~~ | ~~低~~ | ✅ FB-018 Phase GS 已清偿 |
