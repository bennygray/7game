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
| ~~FB-004~~ | ~~关系系统：好感度/好友/仇敌关系，通过事件/需求触发对话过滤~~ | Phase D Q1 讨论 | ~~P2~~ | behavior-tree, AI, relationships | ✅ **Phase E 已清偿** — 升级为 NPC 灵魂系统 affinity/tags | |
| FB-005 | 关系面板 UI（非 MUD 日志的主动查看入口，显示弟子间 affinity/tags） | Phase E Review W1 | P3 | ui, relationships | 🔶 **Phase H-β 部分清偿**：`inspect` 命令提供弟子关系查看入口（含好感值+标签）；未来可做独立面板 |
| FB-006 | 特性专属剧情事件（特性触发独家故事线） | Phase E PRD §4 OUT | P3 | traits, event-bus | 后续 Phase |
| FB-007 | **关系衰减分层**：不同 affinity 阈值区间应有不同的衰减速度（如高好感衰减慢、低好感衰减快），当前统一 ×0.98 过于粗糙 | Phase E PRD USER 反馈 | P2 | relationship-handler | 后续 Phase（专项数值优化） |
| FB-008 | **关系确认/非确认机制**：区分「已确认的关系」（如互为好友）和「未确认的单向好感」，确认后的关系应有更强的稳定性 | Phase E PRD USER 反馈 | P2 | relationship-handler, soul-engine | 后续 Phase（关系系统深化） |
| FB-009 | **关系标签效果乘数调优**：当前 ×1.3/×1.5/×0.5 等参数未经模型验证，需通过模拟跑批或 PoC 进行参数敏感度测试 | Phase E PRD USER 反馈 | P2 | soul-engine, verify-phaseE.ts | Phase E 集成验证时 |
| FB-010 | **行为结算断层 (Execution Gap)**：AI 决策后缺乏世界层的状态结算（如真实的扣血、物品真实转移），导致决策为空转 | SPM 远景 Gap 推演 | P1 | event-executor | 混合决策架构时 |
| ~~FB-011~~ | ~~**玩家干预权缺失 (Gameplay Gap)**：剧烈的 AI 社交冲突（如互下杀手、抢夺同门）目前缺乏向玩家（掌门）发送”裁决弹窗”的触达途径~~ | SPM 远景 Gap 推演 | ~~P2~~ | ui, game-loop | ✅ **Phase H-γ 已清偿** — STORM 事件触发裁决窗口 + judge 命令 |
| FB-012 | **对话实体缺失 (Physical Dialogue Gap)**：NPC 的行为需要伴随可被宗门大厅听到的对外发声，而不能只停留在唯心独白中 | SPM 远景 Gap 推演 | P2 | dialogue-coordinator | 表现层 Phase |
| FB-013 | **天劫系统（经济闭环暂缓）**：炼气→筑基天劫机制，原计划 Phase D，因优先级让位于灵魂/世界系统而暂缓 | MASTER-PRD v2.0 对齐 | P3 | breakthrough-engine | Phase H 或 I |
| FB-014 | **悬赏任务完整实现（经济闭环暂缓）**：D~B 级悬赏完善，骨架已有（bounty-board），包含 FB-002 | MASTER-PRD v2.0 对齐 | P3 | bounty-board | Phase H |
| FB-015 | **丹毒系统（经济闭环暂缓）**：炼丹副作用系统，原计划 Phase E，因优先级让位而暂缓 | MASTER-PRD v2.0 对齐 | P3 | alchemy-engine, pill-consumer | Phase H 或 I |
| ~~FB-016~~ | ~~**展现层增强 X-β**：Tab 自动补全弟子名/命令、突破全屏闪烁效果、行为图标前缀、命令别名系统（l=look, i=inspect, s=status）~~ | ~~Phase X-α PRD §5 OUT~~ | ~~P2~~ | ~~ui/command-handler, ui/engine-bindings~~ | ✅ **Phase X-β 已清偿** — Tab补全+别名+图标+闪烁 |
| FB-017 | **展现层面板 X-γ**：look/inspect 浮层面板（不随日志滚走）、STORM 裁决弹窗居中面板、sect 面板化、ESC 关闭交互 | Phase X-α PRD §5 OUT | P2 | ui/, styles/ | Phase X-γ（依赖 X-β） |
| FB-018 | **弟子性别系统缺失**：当前所有弟子隐性为男性，缺少 gender 字段。影响范围广：弟子生成（disciple-generator 姓名池）、LiteDiscipleState 类型（+gender 字段）、关系叙事（碰面/因果/独白模板需区分性别称谓）、AI prompt（性别描述注入）、MUD 文案（"他/她"代词）、inspect/look 命令输出、存档迁移（+gender 字段）。需独立 Phase 规划，预估 M~L 规模。 | Phase I-alpha SPM 用户反馈 | **P1** | disciple-generator, game-state, encounter-templates, soul-prompt-builder, mud-formatter, zone-descriptions, save-manager, AI prompt 层 | 独立 Phase（建议 I-alpha 之后、I-beta 之前） |
| ~~FB-019~~ | ~~**SGA 关联性审计缺陷（流程 P0）**~~ | Phase I-alpha SGA 用户发现 | ~~**P0**~~ | `.agents/skills/architect/SKILL.md` | ✅ **已清偿** — SGA SKILL.md +Step 5 关联性影响审计（5.1 类型引用追踪 + 5.2 签名影响面 + 5.3 副效果映射 + 5.4 Handler 联动） |
---

## 已清偿

| # | 需求描述 | 清偿日期 | 实现 Phase |
|---|---------|---------|-----------|
| FB-001 | 弟子间对话交互 | 2026-03-28 | Phase D |
| FB-004 | 关系系统（好感度/仇敌） | 2026-03-29 | Phase E（合并入 NPC 灵魂系统 affinity/tags） |
| FB-011 | 玩家干预权（掌门裁决弹窗） | 2026-03-31 | Phase H-γ（STORM 裁决窗口 + judge 命令） |
| FB-016 | 展现层增强 X-β（Tab补全+别名+图标+闪烁） | 2026-03-31 | Phase X-β（命令增强 + 视觉反馈） |
| FB-019 | SGA 关联性审计流程缺陷 | 2026-04-01 | SGA SKILL.md +Step 5（4 项强制审计） |
