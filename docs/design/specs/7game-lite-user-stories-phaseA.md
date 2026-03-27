# 7game-lite User Stories — Phase A: 核心循环验证

> **生成日期**：2026-03-27
> **覆盖里程碑**：A1 脚手架 → A2 修炼引擎 → A3 MUD 面板 → A4 弟子行为树 → A5 AI 灵智
> **Story 数量**：5 条

---

## Story 1 `[S]` — 项目脚手架与精简 GameState

> 作为开发者，我希望初始化 Vite + TypeScript 项目并建立精简 LiteGameState，以便于后续所有系统建立在统一的数据基座上。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 项目目录 `d:\7game` 为空 | 运行 `npm run dev` | Vite dev server 启动成功，浏览器显示空白页面无报错 |
| 2 | `LiteGameState` 调用 `createDefaultLiteGameState()` | 检查返回对象 | 包含 `aura=0`, `spiritStones=200`, `realm=1`, `subRealm=1`, `fields[2]`, `disciples[4]`, `aiContexts={}` 等全部 25 个字段 |
| 3 | 调用 `saveGame(state)` 后关闭浏览器 | 重新打开页面调用 `loadGame()` | 返回的 state 与存储的 state 全字段一致（localStorage 序列化/反序列化无损） |

**依赖**：无（首个 Story）

---

## Story 2 `[M]` — 修炼引擎 Tick 循环

> 作为宗主，我希望灵气、悟性、灵石随时间自动产出，以便于感受到修炼进度的持续增长。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 宗主境界为炼气一层(`realm=1, subRealm=1`) | 引擎 tick 执行 1 秒 | `aura` 增加 1，`comprehension` 增加 0.05，`spiritStones` 增加 0.005 |
| 2 | 宗主境界为炼气九层(`subRealm=9`) | 引擎 tick 执行 1 秒 | `aura` 增加 24（`ceil(9^1.35)=24`） |
| 3 | `aura >= 60`（炼气一层升级所需），玩家选择突破 | 执行突破 | `subRealm` 变为 2，`aura` 扣减 60，基础灵气速率提升至 `ceil(2^1.35)=3` |
| 4 | `subRealm=9, aura >= 150000` | 玩家选择突破炼气九层 | 系统提示"突破需进入天劫"（天劫系统在 Phase B 实现，此处仅校验条件并阻断） |

**依赖**：Story #1

---

## Story 3 `[M]` — MUD 文字面板

> 作为宗主，我希望看到滚动的 MUD 文字日志，以便于实时了解宗门内发生的一切事件。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 页面已加载，引擎正在运行 | 每次 tick 产出灵气 | MUD 面板底部新增一行日志，格式为 `[仙历X年X月] 宗主打坐入定，灵气 +N` |
| 2 | MUD 面板已有 100+ 行日志 | 新日志写入 | 面板自动滚动到最底部，旧日志可上滑查看，最多保留 200 行（超出上限自动裁剪最早的日志） |
| 3 | 玩家在命令输入框输入 `status` 并按回车 | 系统接收命令 | MUD 面板输出宗主当前状态摘要：境界、灵气、灵石、弟子数量 |
| 4 | 玩家输入空字符串或未知命令 | 按回车 | 面板输出 `[系统] 未知指令，输入 'help' 查看可用命令`，不产生报错 |

**依赖**：Story #1

---

## Story 4 `[M]` — 弟子行为树（无 AI）

> 作为宗主，我希望 4 名弟子自主决策行为（打坐/修炼/休息/闲逛等），以便于体验宗门自动运转的"蚁巢"氛围。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 游戏初始化，4 名弟子状态为 IDLE | 引擎 tick 触发弟子决策 | 每名弟子根据性格权重选择一个行为（MEDITATE/EXPLORE/REST/IDLE/ALCHEMY/FARM/BOUNTY），`behavior` 字段更新，MUD 面板输出 `[弟子名] 开始打坐修炼` 等行为日志 |
| 2 | 弟子 A 正在 MEDITATE，`behaviorTimer` 倒计时至 0 | 行为结束 | 弟子 A 获得灵气奖励，`behavior` 重置为 IDLE，下次决策 tick 重新选择行为 |
| 3 | 4 名弟子同时运行 10 分钟 | 观察 MUD 日志 | 至少出现 5 种不同的行为类型日志（满足多样性要求） |

**依赖**：Story #1, Story #3

---

## Story 5 `[L]` — AI 灵智接入

> 作为宗主，我希望弟子在行为变更时说出 AI 生成的个性化台词，以便于感受到每个弟子是有灵魂的独立个体。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | Node.js 后端已启动，Qwen 模型已加载 | 弟子 A 行为从 IDLE 变更为 MEDITATE（事件触发） | 后端收到推理请求，在 ≤5 秒内返回一句个性化台词（如"闭关修炼去了，谁也别打扰本座"），MUD 面板输出 `[弟子A] "台词内容"` |
| 2 | 弟子 A 的 `AISoulContext.shortTermMemory` 已有 3 条记录 | 新行为变更触发推理 | prompt 包含弟子当前状态 + 短期记忆 + 性格特质，生成台词与弟子性格一致（如 aggressive 高的弟子台词更凶狠） |
| 3 | 后端未启动或模型加载失败 | 弟子行为变更触发推理 | 前端 fallback 到预设模板台词（如"……"），MUD 面板正常输出，不报错不阻塞引擎 tick |
| 4 | 弟子 A 的 `shortTermMemory` 已达到上限（10 条） | 新记忆写入 | 最早的记录被移除（FIFO），数组长度始终 ≤10 |

**依赖**：Story #1, Story #3, Story #4
