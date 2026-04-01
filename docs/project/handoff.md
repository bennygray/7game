# 7game-lite — 会话交接文档

> **上次更新**：2026-04-01 | **上次会话主题**：Phase I-alpha SGE — 因果引擎编码实施 + Gate 3 CONDITIONAL PASS
> **当前活跃 Phase**：Phase I-alpha 完成，待启动 I-beta
> **Phase 状态**：I-alpha: SPM ✅ (Gate 1) SGA ✅ (Gate 2) SGE ✅ (Gate 3 CONDITIONAL PASS)

---

## 当前断点

- **Phase I-alpha SGE 完成** — Gate 3 CONDITIONAL PASS (0 BLOCK / 2 WARN)
  - Gate 1 (SPM): CONDITIONAL PASS — 1 BLOCK fixed / 4 WARN
  - Gate 2 (SGA): CONDITIONAL PASS — 0 BLOCK / 5 WARN
  - Gate 3 (SGE): CONDITIONAL PASS — 0 BLOCK / 2 WARN
  - **审查报告**：`docs/pipeline/phaseI-alpha/review-g{1,2,3}.md`
  - **过程资产**：`docs/pipeline/phaseI-alpha/{spm-analysis,task,walkthrough}.md`

### I-alpha SGE 交付成果

- **5 新文件 + 13 修改文件**
- **6 条因果规则** (C1-C6): 挑衅/赠礼/窃取/嫉妒/闭关/道风冲突
- **3 种高级标签**: mentor (修炼×1.2) / grudge (冲突 75%) / admirer (正面情绪+0.2)
- **Handler 14→15**：+causal-tick (TickPhase 612:0)
- **GameState v6 不变**，零迁移，运行时 Map 不持久化
- **验证**: tsc 0 / lint 0 / regression 64/64 / 专项 30/30 / Monte Carlo avg 4.0 events/30min

### Gate 3 WARN (tech debt)

1. `causal-evaluator.ts` L319 `state as LiteGameState` 绕过 Readonly (C5 GoalManager)
2. `soul-event.handler.ts` L94 `spiritStones - 20` 硬编码

### 下一步（新 session 接手）

1. **Phase I-beta**：道风转折 + 宗门冲突 + 社交事件（扩展因果规则 C7-C10）
2. **Phase I-gamma**：T2 幕后 NPC（30-50 个 NPC + 行为循环）

### Phase I-alpha 关键文档

| 文档 | 路径 | 状态 |
|------|------|:----:|
| Phase I-alpha PRD | `docs/features/phaseI-alpha-PRD.md` | ✅ v1.1 |
| Phase I-alpha TDD | `docs/design/specs/phaseI-alpha-TDD.md` | ✅ v1.2 |
| Phase I-alpha User Stories | `docs/design/specs/phaseI-alpha-user-stories.md` | ✅ v1.0 |
| Phase I-alpha SPM 分析 | `docs/pipeline/phaseI-alpha/spm-analysis.md` | ✅ |
| Phase I-alpha Gate 1 Review | `docs/pipeline/phaseI-alpha/review-g1.md` | ✅ |
| Phase I-alpha Gate 2 Review | `docs/pipeline/phaseI-alpha/review-g2.md` | ✅ |
| Phase I-alpha Gate 3 Review | `docs/pipeline/phaseI-alpha/review-g3.md` | ✅ |
| Phase I-alpha Task | `docs/pipeline/phaseI-alpha/task.md` | ✅ |
| Phase I-alpha Walkthrough | `docs/pipeline/phaseI-alpha/walkthrough.md` | ✅ |
| Phase I-alpha 专项测试 | `scripts/verify-phaseI-alpha-causal.ts` | ✅ |

### J-Goal 已完成（上一会话）

- **3 新文件** + **11 修改文件** + **1 验证脚本**
- **GameState v5→v6**：`goals: PersonalGoal[]` 空数组
- **Pipeline**: 14 handlers（+goal-tick 500:20）
- **行为权重**: 4 层→5 层（+Layer 5 目标乘数）
- **事件驱动触发**: 3 个触发器（breakthrough/revenge/friendship）+ 3 个守卫
- **验证**: 66/66 专项 + 64/64 回归 + tsc 0 errors

### Phase IJ 关键文档

| 文档 | 路径 | 状态 |
|------|------|:----:|
| Phase IJ PRD | `docs/features/phaseIJ-PRD.md` | ✅ |
| Phase IJ TDD | `docs/design/specs/phaseIJ-TDD.md` | ✅ |
| Phase IJ-PoC PRD | `docs/features/phaseIJ-poc-PRD.md` | ✅ |
| Phase IJ SPM 分析 | `docs/pipeline/phaseIJ/spm-analysis.md` | ✅ |
| Phase IJ 实施计划 | `docs/pipeline/phaseIJ/plan.md` | ✅ |
| Phase IJ SGA Review (v2.0) | `docs/pipeline/phaseIJ/review.md` | ✅ |
| Phase IJ Gate 1 Review (v3.0) | `docs/pipeline/phaseIJ/review-g1-v3.md` | ✅ |
| Phase IJ Gate 2 Review (v3.0) | `docs/pipeline/phaseIJ/review-g2-v3.md` | ✅ |
| Phase IJ Gate 3 Review (v3.0) | `docs/pipeline/phaseIJ/review-g3-v3.md` | ✅ |
| Phase IJ 专项测试 | `scripts/verify-phaseIJ-relationship-memory.ts` | ✅ |
| Phase IJ-PoC SPM 分析 | `docs/pipeline/phaseIJ-poc/spm-analysis.md` | ✅ |
| Phase IJ-PoC Review | `docs/pipeline/phaseIJ-poc/review.md` | ✅ |
| Phase IJ-PoC T1-T5 详细报告 | `docs/pipeline/phaseIJ-poc/detail-T{1-5}.md` | ✅ |
| Phase IJ-PoC 实验脚本 | `docs/pipeline/phaseIJ-poc/scripts/poc-ij-relationship-test.ts` | ✅ |
| Phase IJ-PoC 报告生成脚本 | `docs/pipeline/phaseIJ-poc/scripts/poc-ij-export-details.ts` | ✅ |
| Phase IJ-PoC 原始数据 | `docs/pipeline/phaseIJ-poc/logs/poc-ij-raw-*.json` / `poc-ij-metrics-*.json` | ✅ |

### Phase IJ 架构要点（v3.0）

- **6 新文件 + 5 修改文件**（+narrative-snippet-builder.ts）
- **核心数据**：`RelationshipMemory` 按 pairKey (`sourceId:targetId`) 索引 + `narrativeSnippet` 字段
- **双写策略**：旧路径不变 + 新 `RelationshipMemoryManager` 并行
- **不改存档**：运行时 Map，页面刷新清空
- **不新增 handler**：关系事件记录嵌入现有写入点，Pipeline 13 handlers 不变
- **Prompt 注入**：L2（好感+标签+1事件）/ L6（+narrative snippet+近况），按事件等级切换
- **NarrativeSnippetBuilder**：三层降级（AI预生成→规则拼接→模板），规则拼接含 7 框架短语 + 因果串联 + 5 归纳定性
- **9 个 ADR**：ADR-IJ-01~06（继承）+ ADR-IJ-07/08/09（v3.0 新增）

### Phase Y 交付物总览

| 交付物 | 说明 | 文件 | 状态 |
|--------|------|------|:----:|
| Y-1 ESLint 配置 | flat config + strictTypeChecked + 5 zone 边界 | `eslint.config.js` | ✅ |
| Y-2 npm lint 脚本 | `lint` / `lint:fix` / `test:ui` | `package.json` | ✅ |
| Y-3 Claude Code Hook | PostToolUse 自动 lint on Edit/Write | `.claude/settings.json` | ✅ |
| Y-4+Y-10 SGE Quality Gate | 前端 + 后端 Code Quality Checklist | `.agents/skills/engineer/SKILL.md` | ✅ |
| Y-5 前端存量修复 | Phase X-α 已修复全部 P0+P1（零 as any） | — | ✅ (已修) |
| Y-6 mud-formatter 单元测试 | 65 组断言（8 个纯函数） | `scripts/verify-ui-formatter.ts` | ✅ |
| Y-7+Y-8 后端修复 | V0.4.9 已修 11/15 项 | — | ✅ (V0.4.9) |
| Y-9 ESLint 后端覆盖 | server/ 专用配置块 + 独立 tsconfig | `server/tsconfig.json` | ✅ |
| 代码修复 | 4 个 lint error（unsafe-*, prefer-as-const, useless-assign, preserve-caught-error） | 4 files | ✅ |

### ESLint 规则配置

| 级别 | 规则 | 严重度 |
|------|------|:---:|
| 🔴 MUST | `no-explicit-any` + `no-unsafe-*` ×5 + `import-x/no-restricted-paths` (5 zone) | error |
| 🟡 SHOULD | `cognitive-complexity` ≤15 + `no-identical-functions` + `assign-timer-id` | warn |
| 🟢 NICE | `no-magic-numbers` (ignore 0,1,-1,2,100) | warn |

### ADR 决策

- **ADR-Y-01**: ESLint v9 flat config + strictTypeChecked + projectService
- **ADR-Y-02**: eslint-plugin-import-x 替代 eslint-plugin-import（flat config 兼容）
- **ADR-Y-03**: server/tsconfig.json 独立配置（Node.js vs Vite/Browser）

### Phase Z 已交付 — AI 通信架构统一

| 系统 | 状态 | 验证 |
|------|------|---------|
| callLlamaServer 通用化（payload 签名） | ✅ | tsc 零错误 |
| /api/infer 结构化补全分支 | ✅ | tsc 零错误 |
| SoulEvaluator 路由统一（→ ai-server:3001） | ✅ | grep 确认无 8080/v1 |
| Call1/Call2 超时放宽（+100ms buffer） | ✅ | regression 64/64 |
| Timeout (504) 错误处理 | ✅ | tsc 零错误 |

- 2 修改文件，零存档迁移
- ADR-Z-01（callLlamaServer 通用化），ADR-Z-02（超时放宽策略）

### Phase X-β 已交付 — 命令增强 + 视觉反馈

| 系统 | 状态 | 验证 |
|------|------|---------| 
| 命令别名（s=status, j=judge, h=help） | ✅ | tsc 零错误 |
| Tab 自动补全（命令名 + 弟子名，循环/反向） | ✅ | tsc 零错误 |
| 行为图标前缀（7 行为 × emoji） | ✅ | tsc 零错误 |
| 突破全屏闪烁（成功金色 2s / 失败红色 1s） | ✅ | tsc 零错误 |
| help 输出更新（别名 + Tab 提示） | ✅ | tsc 零错误 |

- 0 新文件 + 4 修改文件，零存档迁移
- ADR-Xβ-01（Tab 补全内联策略）、ADR-Xβ-02（突破闪烁触发点）
- FB-016 已清偿

### Phase X-α 已交付 — 掌门视界

| 系统 | 状态 | 验证 |
|------|------|---------|
| CSS 主题抽离（mud-theme.css：变量+class） | ✅ | tsc 零错误 |
| main.ts 巨石拆分（606→114行） | ✅ | tsc 零错误 |
| 布局重排（输入框底部+日志区 flex-grow） | ✅ | 浏览器验证 |
| 日志分区（13 条路由规则：主事件流+系统消息条） | ✅ | 浏览器验证 |
| 命令历史（↑/↓ 翻阅+命令回显） | ✅ | 浏览器验证 |
| mud-formatter class 化改造 | ✅ | tsc 零错误 |

- 5 新文件 + 3 修改文件，零存档迁移
- Presentation 层 2→7 文件
- TD-022 新增（环境呼吸定时器清理，Electron 迁移时需注意）

### Phase H-γ 已交付 — 掌门裁决

| 系统 | 状态 | 验证 |
|------|------|---------|
| 裁决类型系统（ruling.ts：RulingDef/ActiveRuling/RulingResolution） | ✅ | tsc 零错误 |
| 裁决注册表（12 定义：3 专属 WE-B04 + 9 通用池） | ✅ | tsc 零错误 |
| TickContext.pendingStormEvent 信号（ADR-Hγ-01） | ✅ | regression 64/64 |
| world-event-tick STORM 标记 | ✅ | regression 64/64 |
| IdleEngine 裁决管理（create/resolve/timeout/applyDrift） | ✅ | regression 64/64 |
| judge 命令 + MUD 裁决窗口/结果渲染 | ✅ | 待浏览器手动验证 |

- 2 新文件 + 5 修改文件，零存档迁移
- TD-020/TD-021 新增
- FB-011 已清偿（玩家干预权 — judge 命令裁决 STORM 事件）
- ADR-Hγ-01（pendingStormEvent 信号方案）、ADR-Hγ-02（ActiveRuling 不持久化）

### Phase H-β 已交付 — 世界缝合

| 系统 | 状态 | 验证 |
|------|------|---------|
| S0 统一日志管线（flush→onMudLog→routeLogEntryToMud） | ✅ | regression 64/64 + tsc 零错误 |
| S1 碰面事件 MUD 可见（自动，零额外代码） | ✅ | 待浏览器手动验证 |
| S2 AI 独白 MUD 可见（自动，零额外代码） | ✅ | 待浏览器手动验证 |
| S3 inspect 命令（弟子灵魂档案：情绪/道德/特性/关系） | ✅ | 待浏览器手动验证 |
| S4 sect 命令（宗门道风总览 + ASCII 刻度尺） | ✅ | 待浏览器手动验证 |

- 4 文件修改，+231 行，零存档迁移
- TD-015/TD-016 新增
- FB-005 部分清偿（inspect 命令提供弟子关系查看入口）
- ADR-Hβ-01（统一管线方案选择）、ADR-Hβ-02（flush 持久化兼容策略）

### Phase G 已交付 — AI 觉醒

| 系统 | 状态 | 验证 |
|------|------|---------|
| AsyncAIBuffer（异步 AI 缓冲区） | ✅ | 代码审查 + regression |
| AI 情绪评估接入（severity 路由） | ✅ | 代码审查 |
| 宗门道风 Prompt 注入 | ✅ | 代码审查 |
| 特性 aiHint 注入 | ✅ | 代码审查 |
| 反派偏置修复（三管齐下） | ✅ | 代码审查 |
| Lv.2 AI 独白渲染 | ✅ | 代码审查 |
| Lv.3 AI 双阶段行为决策 | ✅ | 代码审查（P95 需实游验证） |
| ai-result-apply handler (625:5) | ✅ | regression 64/64 |

- 6 新文件 + 6 修改文件，零存档迁移
- Handler 12→13，TickContext +asyncAIBuffer
- TD-006 部分清偿（AI 延迟通过异步缓冲区解决）

### Phase H-α 已交付 — MUD 世界呼吸如异

| 系统 | 状态 | 验证 |
|------|------|---------|
| `look` 命令（宗门总览 + 弟子档案） | ✅ | USER 浏览器手动验证 |
| 日志分级显示（EventSeverity → 颜色） | ✅ | 代码审查 + regression |
| 固定状态栏（sticky header） | ✅ | USER 浏览器手动验证 |
| 环境呼吸（25~45s 随机触发） | ✅ | 代码审查 |

- 零引擎改动，零存档迁移
- 新增文件：`zone-descriptions.ts`（Data）+ `ui/mud-formatter.ts`（Presentation）

### Phase F 已交付 — 灵魂闭环

- **新增系统**：灵魂闭环（四层行为权重叠加）
  - Layer 1: 基础五维性格权重（不变）
  - Layer 2: 特性 behavior-weight 乘法叠加（14 条效果）
  - Layer 3: 关系标签 friend/rival 同地点乘数（3 条规则）
  - Layer 4: 短期情绪状态→行为权重（11 条映射 + 衰减）
- **运行时状态**：emotionMap（IdleEngine 实例属性，ADR-F-01），不持久化
- **存档 v5 不变**（无新持久化字段）
- 专项验证：12/12 通过

### Phase F0-α 已交付 — 碰面世界

| 系统 | 状态 | 验证结果 |
|------|------|---------|
| 地点标签系统（7 个 Zone） | ✅ | 行为→地点映射全覆盖 |
| 碰面检定引擎（encounter-tick） | ✅ | 同地碰面→关系/性格→结果判定 |
| 宗门道风系统（ethos×discipline 双轴） | ✅ | 开局三选一 + 持久化 |
| 存档 v5 迁移（migrateV4toV5） | ✅ | v1→v2→v3→v4→v5 迁移链 |
| SoulEventType +3（encounter 相关） | ✅ | EventBus + emotion-pool 接入 |
| 碰面文案模板（encounter-templates） | ✅ | 3 类碰面结果 × Fallback 文案 |

- 专项验证：52/52 通过

### Phase F0-β 已交付 — 活世界

| 系统 | 状态 | 验证结果 |
|------|------|---------|
| 世界事件类型系统（world-event.ts） | ✅ | 5 级事件定义 |
| 世界事件注册表（12 事件 × 36 文案） | ✅ | 事件池完整 |
| Storyteller 节奏器 | ✅ | 戏剧张力指数 + 波峰波谷控制 |
| world-event-tick Handler（605:0） | ✅ | Pipeline 集成 |
| emotion-pool + soul-prompt-builder 扩展 | ✅ | world-event 情绪映射 |

- 专项验证：108/108 通过
- BUG-01 修复：Storyteller lastStormTimestamp 初始值
- BUG-02 修复：soul-prompt-builder 缺少 world-event 映射

## 世界线推演关键定案（2026-03-29 晚间）

| 主题 | 定案 | 文档 |
|------|------|------|
| 空间系统 | A1 轻量地点标签（7 个 Zone） | 06 |
| 事件来源 | 全层（事件池 + 因果 + Storyteller） | 06 |
| 事件分级 | 五级漏斗：呼吸→涟漪→浪花→风暴→天劫 | 07 |
| AI 参与 | Lv.2+ 才调 AI（~18 次/h，仅占 0.15% 算力） | 07+08 |
| NPC 分层 | T1 可见（弟子+标记角色） + T2 幕后（AI 闲时排队） | 08 |
| 宗门立场 | 道风(仁/霸)×门规(律/放)双轴四象限 | 09 |
| 漂移规则 | 日常裁决 ±1~2 微调；Lv.4 事件 ±10~20 大改；无闭关惩罚 | 09 |
| 玩家介入 | 5分钟黄金窗口（实时） + 执法堂卷宗（事后） | 06 |
| 验证阻塞 | 世界事件系统是验证基础设施，非远期功能 | 06 §6.1 |

## Phase E 已交付

| 系统 | 状态 | 验证结果 |
|------|------|---------| 
| 存档 v4（moral/traits/affinity/tags） | ✅ | 迁移链 v1→v2→v3→v4 全覆盖 |
| 灵魂事件总线 EventBus | ✅ | ADR-E01 |
| soul-tick Handler (500:10) | ✅ | 关系衰减 + 道德漂移 + 后天特性 |
| soul-event Handler (625:0) | ✅ | EventBus 消费 + 灵魂评估 |
| Fallback 规则引擎 | ✅ | 47 专项测试通过 |
| AI Prompt 构建器 (soul-prompt-builder) | ✅ | JSON Schema + 候选池约束 |
| 突破事件接入 EventBus | ✅ | auto-breakthrough 已 emit |

## 关键决策

| 日期 | 决策 | 上下文 |
|------|------|--------|
| 2026-03-28 | Phase E 定位为预研型 Phase（PoC 优先） | AI 驱动 NPC 灵魂是高风险创新 |
| 2026-03-28 | 三脑协同架构（规则层 + AI 评估器 + AI 叙事器） | AI 是建议者不是决策者 |
| 2026-03-29 | ADR-E01~E03 事件总线架构 | 解耦 intent-executor ↔ soul-engine |
| 2026-03-29 | **世界事件系统是验证基础设施** | 没有事件源，灵魂系统是死代码 |
| 2026-03-29 | **Roadmap V3 重构** | 新增 Phase F0 为最高优先级 |
| 2026-03-29 | **Roadmap V3.1 审阅修复** | F0→F0-α/F0-β；Phase F 并行策略；Phase G 重排；工时修正 |
| 2026-03-29 | **MASTER-PRD v2.0** | 宪法文档对齐新愿景，天劫/悬赏/丹毒标记暂缓 |
| 2026-03-29 | **文档对齐冲刺** | systems.md/feature-backlog/game-state.ts 同步修复 |
| 2026-03-30 | **Phase F/F0-α/F0-β 交付** | 灵魂闭环 + 碰面世界 + 活世界一日交付 |

## 接手指南

1. 读 `docs/project/SOUL-VISION-ROADMAP.md` — 路线图 V3（最新）
2. 读 `docs/project/soul-vision-gap-analysis.md` — 六层 Gap 分析 V3
3. 读 `docs/project/soul-vision-rethinking/06~09` — 世界线推演定案细节
4. 运行 `npx tsx scripts/regression-all.ts` — 验证当前系统完整性

## 遗留风险

| 风险 | 严重度 | 说明 |
|------|:------:|------|
| ~~SGA 关联性审计流程缺陷~~ | ~~高~~ | ~~FB-019 P0~~ ✅ 已清偿 — SGA SKILL.md +Step 5 关联性影响审计 |
| 关系数值参数未经模拟验证 | 中 | TD-012，需 Monte Carlo 模拟 |
| 17 条技术债务活跃 | 低 | 见 tech-debt.md（TD-020/021 新增于 H-γ） |
| 经济系统三件套暂缓 | 低 | 天劫/悬赏/丹毒已注册为 FB-013~015，不影响灵魂/世界验证 |
| 旧回调管线冗余 | 低 | TD-015：farmLogs/systemLogs/discipleEvents 可迁移到统一管线 |
