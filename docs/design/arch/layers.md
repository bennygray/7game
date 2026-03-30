# 分层架构详情

> **来源**：MASTER-ARCHITECTURE 拆分 | **维护者**：/SGA
> **索引入口**：[MASTER-ARCHITECTURE.md](../MASTER-ARCHITECTURE.md) §1

---

## §1 四层架构 Mermaid 图

```mermaid
graph TB
    subgraph Presentation["④ Presentation Layer<br>src/main.ts"]
        MAIN["main.ts<br>MUD 命令 + 日志 + UI"]
    end
    subgraph AI["③ AI Layer<br>src/ai/"]
        LLM["llm-adapter.ts"]
        PROMPT["prompt-builder.ts"]
        PROMPTS["prompts/"]
    end
    subgraph Engine["② Engine Layer<br>src/engine/"]
        TP["tick-pipeline.ts<br>Pipeline 框架"]
        IE["idle-engine.ts<br>核心 Tick"]
        subgraph Handlers["handlers/"]
            H1["boost-countdown"]
            H2["breakthrough-aid"]
            H3["auto-breakthrough"]
            H4["farm-tick"]
            H5["disciple-tick"]
            H6["cultivate-boost"]
        end
        BT["behavior-tree.ts<br>弟子行为树"]
        IE2["intent-executor.ts<br>Intent 执行器"]
        DC["dialogue-coordinator.ts<br>对话协调"]
        GL["game-logger.ts<br>结构化日志"]
        FE["farm-engine.ts<br>灵田引擎"]
        AE["alchemy-engine.ts<br>炼丹引擎"]
        BE["breakthrough-engine.ts<br>突破引擎"]
        PC["pill-consumer.ts<br>丹药消费"]
        SM["save-manager.ts<br>存档管理"]
        DG["disciple-generator.ts<br>弟子生成"]
    end
    subgraph Data["① Data Layer<br>src/shared/"]
        GS["types/game-state.ts<br>LiteGameState v4"]
        AI_SOUL["types/ai-soul.ts<br>AISoulContext"]
        DLG_T["types/dialogue.ts<br>DialogueTrigger/Exchange"]
        LOG_T["types/logger.ts<br>LogLevel/Category"]
        SOUL_T["types/soul.ts<br>MoralAlignment/EmotionTag"]
        IF["formulas/idle-formulas.ts<br>灵气/悟性/灵石公式"]
        RF["formulas/realm-formulas.ts<br>突破/境界公式"]
        AF["formulas/alchemy-formulas.ts<br>炼丹/选种公式"]
        RD["formulas/realm-display.ts<br>境界显示"]
        RT["data/realm-table.ts<br>境界表+突破率+灵脉"]
        RCT["data/recipe-table.ts<br>丹方表+常量"]
        ST["data/seed-table.ts<br>种子表"]
        TR["data/trait-registry.ts<br>特性注册表"]
        EP["data/emotion-pool.ts<br>情绪候选池"]
    end
    MAIN --> IE
    MAIN --> LLM
    IE --> TP
    TP --> Handlers
    H1 & H6 --> PC
    H2 --> PC
    H3 --> BE
    H4 --> FE
    H5 --> BT
    IE --> BT & FE & PC & BE
    BT --> FE & AE
    IE & BT & FE & AE & BE & PC & SM & DG --> GS
    IE --> IF & RT
    BE --> RF & PC & RD
    FE --> ST & RCT & AF
    AE --> RCT & AF
    PC --> RCT & RF
    IF --> RF & RT
    RF --> RT & RCT
```

---

## §2 层级职责与文件清单

| 层级 | 职责 | 文件数 | 文件列表 |
|------|------|:------:|---------| 
| **① Data** | 类型定义 + 公式 + 数据表（所有层的只读依赖） | 15 | `game-state.ts`, `ai-soul.ts`, `dialogue.ts`, `logger.ts`, `soul.ts`, `idle-formulas.ts`, `realm-formulas.ts`, `alchemy-formulas.ts`, `realm-display.ts`, `realm-table.ts`, `recipe-table.ts`, `seed-table.ts`, `trait-registry.ts`, `emotion-pool.ts`, `emotion-behavior-modifiers.ts` |
| **② Engine** | 游戏引擎逻辑（tick / 行为树 / 存档 / 日志 / 对话 / 灵魂） | 22 | `idle-engine.ts`, `tick-pipeline.ts`, `event-bus.ts`, `soul-engine.ts`, `handlers/boost-countdown.handler.ts`, `handlers/breakthrough-aid.handler.ts`, `handlers/auto-breakthrough.handler.ts`, `handlers/farm-tick.handler.ts`, `handlers/soul-tick.handler.ts`, `handlers/disciple-tick.handler.ts`, `handlers/soul-event.handler.ts`, `handlers/dialogue-tick.handler.ts`, `handlers/cultivate-boost.handler.ts`, `behavior-tree.ts`, `intent-executor.ts`, `dialogue-coordinator.ts`, `game-logger.ts`, `farm-engine.ts`, `alchemy-engine.ts`, `breakthrough-engine.ts`, `pill-consumer.ts`, `save-manager.ts`, `disciple-generator.ts` |
| **③ AI** | AI 适配层（LLM 调用 / prompt 构建 / fallback / 灵魂评估） | 5+ | `llm-adapter.ts`, `prompt-builder.ts`, `soul-prompt-builder.ts`, `prompts/` 目录, `fallback-lines.ts`, `bystander-lines.ts` |
| **④ Presentation** | DOM 组件 / 命令系统 / MUD 面板 | 1 | `main.ts`（含 UI 初始化、命令系统、引擎回调、AI 集成） |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-ARCHITECTURE.md §1 拆出 |
| 2026-03-28 | Phase 4 重构: 新增 tick-pipeline.ts + handlers/ 目录（6 文件），Engine 层 8→15 文件 |
| 2026-03-28 | Phase D: Data +2 (dialogue.ts, logger.ts), Engine +4 (intent-executor, dialogue-coordinator, game-logger, dialogue-tick.handler), AI +1 (bystander-lines); Engine 15→19, Data 9→11, AI 3→4+ |
| 2026-03-28 | Phase D Hotfix: BehaviorIntent 新增 timerDelta 字段; SmartLLMAdapter 移除自动重试改为手动 tryConnect; FallbackLLMAdapter 对话改 2 轮; 弟子 4→8 人 + 新性格(孤傲/恐懦); reset 命令实装 |
| 2026-03-29 | Phase E: Data +3 (soul.ts, trait-registry.ts, emotion-pool.ts), Engine +3 (event-bus, soul-engine, soul-tick.handler, soul-event.handler), AI +1 (soul-prompt-builder); GameState v3→v4; Data 11→14, Engine 19→22, AI 4+→5+ |
| 2026-03-30 | Phase F: Data +1 (emotion-behavior-modifiers.ts), soul.ts +DiscipleEmotionState; Data 14→15; behavior-tree +getEnhancedPersonalityWeights; tick-pipeline TickContext +emotionMap; idle-engine +emotionMap |
