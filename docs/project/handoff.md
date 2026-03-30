# 7game-lite — 会话交接文档

> **上次更新**：2026-03-30 | **上次会话主题**：Phase G AI 觉醒
> **当前活跃 Phase**：Phase G ✅ 完成
> **Phase 状态**：SPM+SGA+SGE 全流程通过，存档 v5 不变，13 个 Handler，64条回归全通过

---

## 当前断点

- Phase G 的 SPM GATE 1、SGA GATE 2、SGE GATE 3 均已通过
- **下一步**：待 USER 确认后进入下一 Phase（Roadmap 参考）
- 回归验证：64/64 通过

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
| 关系数值参数未经模拟验证 | 中 | TD-012，需 Monte Carlo 模拟 |
| AI 路径接入需处理 async 竞态 | 中 | 已升级为 Phase G 的 G0（最高优先级子项） |
| 13 条技术债务活跃 | 低 | 见 tech-debt.md |
| 经济系统三件套暂缓 | 低 | 天劫/悬赏/丹毒已注册为 FB-013~015，不影响灵魂/世界验证 |
