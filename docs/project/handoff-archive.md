# 7game-lite — 会话交接历史归档

> **来源**：从 `handoff.md` 迁移的历史详情
> **用途**：保留完整历史上下文，供回溯查阅
> **排序**：按 Phase 倒序排列

---

## Phase TG-2 — 审查上下文交付 + 影响审计扩展 + INDEX 补全

- Gate 1 (SPM): CONDITIONAL PASS — 0 BLOCK / 3 WARN（全修复）
- Gate 2 (SGA): CONDITIONAL PASS — 0 BLOCK / 4 WARN（全修复）
- Gate 3 (SGE): CONDITIONAL PASS — 0 BLOCK / 2 WARN（全修复）
- **审查报告**：`docs/pipeline/phaseTG-2/review-g{1,2,3}.md`
- **修改文件**: review-protocol.md v1.3（+§0）+ 3 个 SKILL.md（调用模板+Step 5 扩展）+ INDEX.md（全量补全）
- **FB-020(b) 已清偿**

## Phase TG-1 — 流程治理（判定校验 + 禁止自审 + 签章检查）

- Gate 1/2/3 全部 CONDITIONAL PASS
- **审查报告**：`docs/pipeline/phaseTG-1/review-g{1,2,3}.md`
- **FB-020(a) 已清偿**

## Phase I-alpha — 因果引擎 + 高级关系标签

- Gate 1: CONDITIONAL PASS — 1 BLOCK fixed / 4 WARN
- Gate 2: CONDITIONAL PASS — 0 BLOCK / 5 WARN
- Gate 3: CONDITIONAL PASS — 0 BLOCK / 2 WARN
- **5 新文件 + 13 修改文件**
- **6 条因果规则** (C1-C6): 挑衅/赠礼/窃取/嫉妒/闭关/道风冲突
- **3 种高级标签**: mentor / grudge / admirer
- **Handler 14→15**：+causal-tick (TickPhase 612:0)
- Gate 3 WARN: `causal-evaluator.ts` L319 unsafe cast + `soul-event.handler.ts` L94 硬编码

## Phase J-Goal — 个人目标系统

- **3 新文件 + 11 修改文件 + 1 验证脚本**
- **GameState v5→v6**：`goals: PersonalGoal[]` 空数组
- **Pipeline**: 14 handlers（+goal-tick 500:20）
- **行为权重**: 4 层→5 层（+Layer 5 目标乘数）
- **验证**: 66/66 专项 + 64/64 回归

## Phase IJ — NPC 深智预研（关系记忆·叙事·L2/L6）

- **6 新文件 + 5 修改文件**（+narrative-snippet-builder.ts）
- **双写策略**：旧路径不变 + RelationshipMemoryManager 并行
- **不改存档**：运行时 Map，页面刷新清空
- **Prompt 注入**：L2/L6 按事件等级切换
- **9 个 ADR**：ADR-IJ-01~09

## Phase X-γ — 面板系统（浮层+可点击弟子+内存修复）

- BUG-Xγ-01 P0 修复：log-manager.ts 全量 innerHTML 替换导致内存暴涨

## Phase X-β — 命令增强 + 视觉反馈

- 0 新文件 + 4 修改文件，零存档迁移
- ADR-Xβ-01（Tab 补全）、ADR-Xβ-02（突破闪烁）
- FB-016 已清偿

## Phase X-α — 掌门视界

- 5 新文件 + 3 修改文件
- main.ts 巨石拆分（606→114行）
- Presentation 层 2→7 文件
- TD-022 新增

## Phase H-γ — 掌门裁决

- 2 新文件 + 5 修改文件，零存档迁移
- 裁决注册表（12 定义：3 专属 + 9 通用）
- ADR-Hγ-01（pendingStormEvent 信号）、ADR-Hγ-02（ActiveRuling 不持久化）
- FB-011 已清偿

## Phase H-β — 世界缝合

- 4 文件修改，+231 行，零存档迁移
- S0~S4 五个交付物完成
- ADR-Hβ-01/02
- FB-005 部分清偿

## Phase H-α — MUD 世界呼吸

- 零引擎改动，零存档迁移
- 新增：`zone-descriptions.ts` + `ui/mud-formatter.ts`

## Phase G — AI 觉醒

- 6 新文件 + 6 修改文件，零存档迁移
- Handler 12→13，TickContext +asyncAIBuffer
- TD-006 部分清偿

## Phase F0-β — 活世界

- 世界事件类型系统 + 注册表（12 事件 × 36 文案）+ Storyteller
- 专项验证：108/108 通过

## Phase F0-α — 碰面世界

- 地点标签 + 碰面检定 + 宗门道风 + 存档 v5 迁移
- 专项验证：52/52 通过

## Phase F — 灵魂闭环

- 四层行为权重叠加（基础/特性/关系/情绪）
- 专项验证：12/12 通过

## Phase E — NPC 灵魂系统

- 存档 v4（moral/traits/affinity/tags）
- 灵魂事件总线 EventBus + soul-tick + soul-event
- 47 专项测试通过

## 世界线推演定案（2026-03-29）

| 主题 | 定案 |
|------|------|
| 空间系统 | A1 轻量地点标签（7 个 Zone） |
| 事件来源 | 全层（事件池 + 因果 + Storyteller） |
| 事件分级 | 五级漏斗：呼吸→涟漪→浪花→风暴→天劫 |
| NPC 分层 | T1 可见 + T2 幕后 |
| 宗门立场 | 道风(仁/霸)×门规(律/放)双轴四象限 |

## Phase Y — ESLint + 代码质量基础设施

- ESLint v9 flat config + strictTypeChecked + 5 zone 边界
- Claude Code Hook: PostToolUse 自动 lint
- 65 组 mud-formatter 单元测试
- ADR-Y-01/02/03

## Phase Z — AI 通信架构统一

- callLlamaServer 通用化 + /api/infer 结构化补全
- 2 修改文件，零存档迁移
- ADR-Z-01/02
