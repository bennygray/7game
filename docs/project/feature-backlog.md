# 需求债务登记簿（Feature Backlog）

> **维护者**：/SPM
> **规则**：来自 Review 降级、USER 暂缓、或 Phase 范围裁剪的需求条目。清偿时标记日期。
> **索引入口**：[docs/INDEX.md](../INDEX.md)

---

## 活跃需求债务

| # | 需求描述 | 来源 | 优先级 | 关联系统 | 计划排期 |
|---|---------|------|:------:|---------|---------|
| FB-001 | ~~弟子间对话交互（A 炼丹成功 → B 旁观评论）~~ | Phase A 设计预留 | ~~P2~~ | behavior-tree, AI 层 | ✅ **Phase D 已实现** — DialogueCoordinator + bystander-lines |
| FB-002 | 悬赏系统完整实现 | Phase A 骨架预留 | P2 | bounty-board | Phase D |
| FB-003 | 道基品质获取机制（当前固定 NONE） | Phase A 设计预留 | P3 | breakthrough-engine | 待定 |
| ~~FB-004~~ | ~~关系系统：好感度/好友/仇敌关系，通过事件/需求触发对话过滤~~ | Phase D Q1 讨论 | ~~P2~~ | behavior-tree, AI, relationships | ✅ **Phase E 清偿中** — 升级为完整 NPC 灵魂系统 |
| FB-005 | 关系面板 UI（非 MUD 日志的主动查看入口，显示弟子间 affinity/tags） | Phase E Review W1 | P3 | ui, relationships | 后续 Phase |
| FB-006 | 特性专属剧情事件（特性触发独家故事线） | Phase E PRD §4 OUT | P3 | traits, event-bus | 后续 Phase |
| FB-007 | **关系衰减分层**：不同 affinity 阈值区间应有不同的衰减速度（如高好感衰减慢、低好感衰减快），当前统一 ×0.98 过于粗糙 | Phase E PRD USER 反馈 | P2 | relationship-handler | 后续 Phase（专项数值优化） |
| FB-008 | **关系确认/非确认机制**：区分「已确认的关系」（如互为好友）和「未确认的单向好感」，确认后的关系应有更强的稳定性 | Phase E PRD USER 反馈 | P2 | relationship-handler, soul-engine | 后续 Phase（关系系统深化） |
| FB-009 | **关系标签效果乘数调优**：当前 ×1.3/×1.5/×0.5 等参数未经模型验证，需通过模拟跑批或 PoC 进行参数敏感度测试 | Phase E PRD USER 反馈 | P2 | soul-engine, verify-phaseE.ts | Phase E 集成验证时 |

---

## 已清偿

| # | 需求描述 | 清偿日期 | 实现 Phase |
|---|---------|---------|-----------|
| FB-001 | 弟子间对话交互 | 2026-03-28 | Phase D |
