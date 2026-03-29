# 7game-lite — 会话交接文档

> **上次更新**：2026-03-29 | **上次会话主题**：Roadmap V3 审阅修复 + 文档对齐冲刺
> **当前活跃 Phase**：Phase E (v0.5) ✅ 完成 → 准备启动 Phase F0-α
> **Phase 状态**：Roadmap V3.1 定案，下一步进入 Phase F0-α（碰面世界）

---

## 当前断点

- Phase E 的 SPM GATE 1、SGA GATE 2、SGE GATE 3 均已通过
- **世界线推演已完成**（06~09 号文档），所有结论已沉淀到 Roadmap V3.1 和 Gap Analysis V3
- **Roadmap V3.1 审阅修复已完成**：F0 拆分为 F0-α/F0-β；Phase F 并行策略精确化；Phase G 重排；工时修正
- **MASTER-PRD 升级到 v2.0**：对齐新愿景 + 版本路线 + 弟子数量 + 经济系统暂缓
- **下一步**：启动 Phase F0-α 规划（地点标签 / 碰面引擎 / 宗门道风），同时可并行启动 Phase F 的 F1+F2
- 回归验证：64/64 通过（含 v3→v4 迁移链 8 条新增断言）

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
