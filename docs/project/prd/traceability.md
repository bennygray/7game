# 需求追溯链

> **来源**：MASTER-PRD 拆分 | **维护者**：/SPM
> **索引入口**：[MASTER-PRD.md](../MASTER-PRD.md) §6.5
> **数据来源**：INDEX.md Trinity 分析进度 + User Stories + 验证脚本

---

## §1 Phase × PRD × User Stories × 验证脚本

| Phase | 系统 | PRD 文件 | User Stories | 验证脚本 | 测试数 |
|-------|------|---------|-------------|---------|:------:|
| A | 修炼引擎 + 行为树 + MUD + AI台词 | `7game-lite-analysis.md` | `7game-lite-user-stories-phaseA.md` | `regression-all.ts` | 64 |
| B-α | 灵田 + 炼丹 | `7game-lite-phaseB-analysis.md` | `7game-lite-user-stories-phaseB-alpha.md` | `verify-phaseB-alpha.ts` | 6 |
| C | 突破 + 灵脉 + 丹药消费 | `7game-lite-phaseC-analysis.md` | `7game-lite-user-stories-phaseC.md` | `verify-phaseC.ts` | 10 |
| D | Intent 重构 + 对话 + 日志 | `phaseD-PRD.md` | `7game-lite-user-stories-phaseD.md` | `verify-phaseD-intent.ts` | 29 |
| E | NPC 灵魂系统 | `phaseE-PRD.md` | `7game-lite-user-stories-phaseE.md` | `verify-phaseE.ts` | 47 |
| F | 灵魂闭环（四层权重） | `phaseF-PRD.md` | `phaseF-user-stories.md` | `verify-phaseF.ts` | 12 |
| F0-α | 碰面世界（地点·碰面·道风） | `phaseF0-alpha-PRD.md` | `phaseF0-alpha-user-stories.md` | `verify-phaseF0-alpha.ts` | 52 |
| F0-β | 活世界（事件池·漏斗·Storyteller） | `phaseF0-beta-PRD.md` | `phaseF0-beta-user-stories.md` | `verify-phaseF0-beta.ts` | 108 |
| G | AI 觉醒（async 缓冲·独白·决策） | `phaseG-PRD.md` | `phaseG-user-stories.md` | — | — |
| H-α | MUD 世界呈现（look/分级/状态栏） | `phaseH-alpha-PRD.md` | — | — | — |
| H-β | 世界缝合（统一管线/inspect/sect） | `phaseH-beta-PRD.md` | `phaseH-beta-user-stories.md` | — | — |
| H-γ | 掌门裁决（STORM/judge/道风漂移） | `phaseH-gamma-PRD.md` | `phaseH-gamma-user-stories.md` | — | — |
| X-α | 掌门视界（CSS+拆分+布局+日志） | `phaseX-alpha-PRD.md` | — | — | — |
| X-β | 命令增强（Tab/别名/图标/闪烁） | `phaseX-beta-PRD.md` | — | — | — |
| X-γ | 面板系统（浮层+可点击+内存修复） | `phaseX-gamma-PRD.md` | `phaseX-gamma-user-stories.md` | `verify-ui-formatter.ts` | 65 |
| IJ-PoC | 关系上下文 PoC（0.8B/2B 验证） | `phaseIJ-poc-PRD.md` | — | — | — |
| IJ | NPC 深智（关系记忆·叙事·L2/L6） | `phaseIJ-PRD.md` | — | `verify-phaseIJ-relationship-memory.ts` | 38 |
| J-Goal | 个人目标（GoalType·Layer 5·触发） | `phaseJ-goal-PRD.md` | `phaseJ-goal-user-stories.md` | `verify-phaseJ-goal.ts` | 66 |
| I-alpha | 因果引擎 + 高级关系标签 | `phaseI-alpha-PRD.md` | `phaseI-alpha-user-stories.md` | `verify-phaseI-alpha-causal.ts` | 30 |
| Y | ESLint + 代码质量基础设施 | — | — | `verify-ui-formatter.ts` | 65 |
| Z | AI 通信架构统一 | — | — | — | — |
| TG-1 | 重审执行保障（判定校验+禁止自审） | `phaseTG-1-PRD.md` | `phaseTG-1-user-stories.md` | — | — |
| TG-2 | 审查上下文交付 + 影响审计扩展 | `phaseTG-2-PRD.md` | `phaseTG-2-user-stories.md` | — | — |

---

## §2 统计

- **已实现 Phase**：23 个（A ~ TG-2，含 Y/Z 基础设施 Phase）
- **有验证脚本的 Phase**：12 个
- **累计专项测试数**：463+
- **全局回归测试**：64 组（`regression-all.ts`）

---

## §3 说明

- PRD 路径前缀：`docs/features/`
- User Stories 路径前缀：`docs/design/specs/`
- 验证脚本路径前缀：`scripts/`
- Phase A~C 使用旧 SGPA 十步分析格式，D+ 使用 Trinity 三文件格式
- "—" 表示该 Phase 无对应资产（部分 Phase 为纯文档/UI 变更，无专项测试）

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-04-02 | Phase TG-3 新建，覆盖 A~TG-2 全部 21 个 Phase |
