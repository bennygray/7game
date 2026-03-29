# 7game-lite — 全局进度追踪

> **最后更新**：2026-03-28

---

## Phase 状态总览

| Phase | 版本 | 主题 | SPM | SGA | SGE | 状态 |
|-------|------|------|:---:|:---:|:---:|:----:|
| A | v0.1 | 核心循环（修炼+弟子+MUD） | ✅ | ✅ | ✅ | 🟢 完成 |
| B-α | v0.2 | 灵田+炼丹 | ✅ | ✅ | ✅ | 🟢 完成 |
| C | v0.3 | 突破+灵脉+丹药使用 | ✅ | ✅ | ✅ | 🟢 完成 |
| D | v0.4 | AI对话+日志+Intent重构 | ✅ | ✅ | ✅ | 🟢 完成 |
| **E** | **v0.5** | **NPC灵魂（道德×特性×关系）** | 🔄 | — | — | 🟡 SPM |

---

## 当前 Phase 详情

**Phase E** — NPC 灵魂系统：道德 × 特性 × 关系

- **性质**：预研型 Phase（PoC 验证优先）
- **SPM 状态**：Step 1-2 完成（第一性原理分析 + 规则数值），等待 Q1-Q4 USER 决策
- **过程资产**：[`pipeline/phaseE/`](../pipeline/phaseE/)
- **PRD**：待创建（SPM 完成后）

---

## 累计统计

| 指标 | 数值 |
|------|------|
| 已实现系统 | 12 个（修炼、弟子×8、MUD、灵田、炼丹、突破、灵脉、丹药消费、AI对话、结构化日志、Intent、Tick Pipeline） |
| 回归测试 | 56 组全通过 |
| 技术债务 | TD-001~TD-007（2 个已清偿：TD-001 Pipeline 重构、TD-003 Intent） |
| 需求债务 | FB-001~FB-004（1 个已清偿：FB-001 弟子对话） |
| GameState 版本 | v3 |
| 弟子数量 | 8 人（4 初始 + 4 Phase D 新增） |
| AI 模型 | Qwen3.5-0.8B（llama-server 子进程） |

---

## Phase 文档索引

| Phase | PRD/Analysis | TDD | User Stories | Verification | Pipeline |
|-------|:----------:|:---:|:-----------:|:----------:|:--------:|
| A | [analysis](../features/7game-lite-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseA.md) | [verify](../verification/7game-lite-phaseA-verification.md) | — |
| B-α | [analysis](../features/7game-lite-phaseB-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseB-alpha.md) | — | [plan](../pipeline/phaseB-alpha/plan.md) |
| C | [analysis](../features/7game-lite-phaseC-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseC.md) | [verify](../verification/7game-lite-phaseC-verification.md) | [plan](../pipeline/phaseC/plan.md) |
| D | [PRD](../features/phaseD-PRD.md) | [TDD](../design/specs/phaseD-TDD.md) | [stories](../design/specs/7game-lite-user-stories-phaseD.md) | — | — |
| **E** | 待创建 | — | — | — | [spm-analysis](../pipeline/phaseE/spm-analysis.md) |

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-28 | 初始创建，回填 Phase A-D 历史状态 |
