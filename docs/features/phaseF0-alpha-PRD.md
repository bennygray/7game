# Phase F0-α: 碰面世界 — PRD

> **版本**：v1.0 | **维护者**：/SPM | **日期**：2026-03-30
> **状态**：GATE 1 审阅中
> **关联里程碑**：SOUL-VISION-ROADMAP V3.1 · Phase F0-α
> **前置**：Phase E ✅（存档 v4，灵魂事件总线 EventBus，soul-engine）

---

## §1 系统不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | **地点是行为的纯函数派生，不独立持久化** — `location = f(behavior)`，弟子切换行为时地点自动切换 | 若独立存储则可能出现行为与地点不一致（"在丹房种田"） |
| I2 | **碰面检定不改变任何 GameState** — 仅产出事件到 EventBus + 输出 MUD 日志 | 若碰面直接写 affinity，会与 Phase F（灵魂闭环）耦合，违反分层原则 |
| I3 | **碰面扫描复杂度 O(N²) 但 N 恒 ≤ 8**（lite 范围弟子上限）— 不需要空间索引优化 | 若未来 N 放大至 T2 级别需重新评估，但 F0-α 不考虑 |
| I4 | **道风/门规 `[-100, +100]` 闭区间，写入时必须 clamp** | 若无 clamp 则数值溢出，象限标签计算错误 |
| I5 | **F0-α 只做碰面事件的"产出"和道风的"存储"** — 碰面后果（affinity 变更）属于 Phase F；道风漂移属于 Phase H（裁决→漂移） | 越界会导致跨 Phase 功能耦合 |

---

## §2 价值锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | 玩家看到日志"张清风与李墨染在后山偶遇，互相挖苦了几句"——第一次感知到弟子之间真的会碰面 |
| **5-Why 根因** | 最低成本制造社交场景，作为灵魂系统的**验证基础设施** |
| **最小组件** | 碰面事件产出（encounter-tick handler） |
| **ROI** | 成本 **S~M** · 体验增量 **4/5** |
| **循环挂载** | 产出 → 碰面事件（EventBus）→ 被 soul-event handler 消费（Phase F）→ 产出情绪/独白；消耗 → 无新资源消耗 |

### 需求债务关联

| FB# | 关联性 | 处理 |
|-----|--------|------|
| FB-010 | 行为结算断层 — 碰面引擎是走通结算的第一步 | 部分清偿（碰面事件可被 soul-engine 消费） |
| FB-012 | 对话实体缺失 — 碰面 MUD 文案是"对外发声"起点 | 部分清偿（碰面 fallback 文案进入 MUD 日志） |

---

## §3 规则与数值边界

### 3.1 业务实体 (C1)

#### R-F0α-E1: 地点标签 LocationTag（6 个成员）

| # | ID | 中文名 | 说明 | 对应行为 |
|---|-----|--------|------|---------|
| 1 | `SECT_HALL` | 宗门大殿 | 宗门内部公共区域 | REST, IDLE |
| 2 | `DAN_ROOM` | 丹房 | 炼丹专区 | ALCHEMY |
| 3 | `LING_TIAN` | 灵田 | 种植区域 | FARM |
| 4 | `BACK_MOUNTAIN` | 后山 | 修炼场所 | MEDITATE |
| 5 | `LING_SHOU_SHAN` | 灵兽山 | 门外历练区域 | EXPLORE |
| 6 | `BOUNTY_FIELD` | 悬赏任务区 | 执行悬赏的外出区域 | BOUNTY |

#### R-F0α-E2: 碰面结果 EncounterResult（3 个有效成员 + 1 个空结果）

| # | ID | 中文名 | 说明 | 五级事件分级 |
|---|-----|--------|------|:----------:|
| 1 | `chat` | 闲聊 | 友好或中性的交谈 | Lv.1 涟漪 |
| 2 | `discuss` | 论道 | 深入交流修炼心得 | Lv.2 浪花 |
| 3 | `conflict` | 冲突 | 言语冲突或肢体摩擦 | Lv.2 浪花 |
| 4 | `none` | 无事 | 擦肩而过，无互动 | 不产出事件 |

#### R-F0α-E3: 碰面事件类型 SoulEventType 扩展（3 个新成员）

在现有 7 个 `SoulEventType` 基础上新增：

| 新增值 | 事件极性 | 说明 |
|--------|:-------:|------|
| `encounter-chat` | `positive` | 弟子碰面闲聊 |
| `encounter-discuss` | `positive` | 弟子碰面论道 |
| `encounter-conflict` | `negative` | 弟子碰面冲突 |

#### R-F0α-E4: 宗门道风初始化选项 SectAlignmentPreset（3 个成员）

| # | ID | 显示名 | 初始道风 `ethos` | 初始门规 `discipline` | 画风描述 |
|---|-----|--------|:-------:|:-------:|---------|
| 1 | `ren_dao` | 🌿 仁道 | -40 | +20 | 初始弟子偏温和，偏济世扶弱 |
| 2 | `zhong_yong` | ⚔️ 中庸 | 0 | 0 | 弟子性格多样，事件均衡 |
| 3 | `ba_dao` | 🔥 霸道 | +40 | -20 | 弟子偏激进，偏弱肉强食 |

#### R-F0α-E5: SectState 新增字段

| 字段 | 类型 | 范围 | 默认值（迁移） | 说明 |
|------|------|------|:------:|----|
| `ethos` | `number` | `[-100, +100]` | `0` | 道风轴：-100=仁 ↔ +100=霸 |
| `discipline` | `number` | `[-100, +100]` | `0` | 门规轴：-100=放 ↔ +100=律 |

#### R-F0α-E6: 碰面事件负载结构 EncounterEventPayload

碰面事件通过 EventBus 发送时，`SoulEvent.metadata` 需包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `partnerId` | `string` | 碰面对方弟子 ID |
| `partnerName` | `string` | 碰面对方弟子姓名 |
| `location` | `LocationTag` | 碰面地点 |
| `encounterResult` | `EncounterResult` | 碰面结果类型（不含 none） |
| `avgAffinity` | `number` | 双方平均好感度（用于调试/日志） |

> **注意**：碰面事件为**双向对称发射** — A 遇到 B 时，对 A 和 B 各发射一条 SoulEvent（actorId 分别为 A 和 B，partnerId 分别为 B 和 A）。

---

### 3.2 产源与消耗

| 资源 | 产出来源 | 消耗去向 | 漏斗平衡 |
|------|---------|---------|:--------:|
| 碰面事件 | encounter-tick handler 产出 → EventBus | soul-event handler 消费（Phase F 才真正处理） | ✅ 纯信息流，无通胀风险 |
| 道风/门规 | 开局初始化一次 | F0-α 中无消耗/漂移（Phase H 裁决漂移） | ✅ 静态存储 |

**结论**：F0-α 不引入任何新的经济资源，不影响现有产出→消耗漏斗。

---

### 3.3 核心公式 (C3)

#### F-F0α-01: 地点推导

```
getDiscipleLocation(behavior: DiscipleBehavior) → LocationTag
```

| 输入 `behavior` | 输出 `LocationTag` |
|:---:|:---:|
| `MEDITATE` | `BACK_MOUNTAIN` |
| `ALCHEMY` | `DAN_ROOM` |
| `FARM` | `LING_TIAN` |
| `EXPLORE` | `LING_SHOU_SHAN` |
| `BOUNTY` | `BOUNTY_FIELD` |
| `REST` | `SECT_HALL` |
| `IDLE` | `SECT_HALL` |

- **纯函数**：无副作用，无持久化
- **完全覆盖**：7 个行为 → 6 个地点，映射完全穷尽（DIP compliant）

#### F-F0α-02: 碰面触发判定

```
shouldEncounter(lastEncounterTime, now, baseChance) → boolean
```

**常量参数**：

| 参数 | 值 | 说明 |
|------|------|------|
| `ENCOUNTER_SCAN_INTERVAL_SEC` | `5` | 每 5 秒（5 个 tick）扫描一次 |
| `ENCOUNTER_COOLDOWN_SEC` | `60` | 同一对弟子碰面冷却 60 秒 |
| `BASE_ENCOUNTER_CHANCE` | `0.20` | 同地点且冷却已过的触发概率 20% |

**判定流程**：

```
1. 若 tickCount % ENCOUNTER_SCAN_INTERVAL_SEC !== 0 → 跳过本 tick
2. 按 location 分组所有弟子
3. 对每个有 ≥2 人的地点，枚举所有无序对 (A, B)（A.id < B.id 去重）
4. 对每对 (A, B)：
   a. 计算 pairKey = `${A.id}:${B.id}`
   b. 查找 lastEncounterTime[pairKey]
   c. 若 (now - lastEncounterTime[pairKey]) < ENCOUNTER_COOLDOWN_SEC × 1000
      → 冷却中，跳过
   d. 掷骰 random() < BASE_ENCOUNTER_CHANCE
      → 通过 → 进入结果判定
      → 未通过 → 跳过
```

- **冷却存储**：运行时 Map（不持久化到存档），重启后重置
- **性能**：8 弟子 → 最多 C(8,2) = 28 对 → 每 5 秒检查 28 次 < 0.1ms

#### F-F0α-03: 碰面结果判定

```
decideEncounterResult(avgAffinity: number) → EncounterResult
```

**前置计算**：

```
avgAffinity = (affinity(A→B) + affinity(B→A)) / 2
```

其中 `affinity(X→Y)` = 已有 `RelationshipEdge` 中 `sourceId=X, targetId=Y` 的 `affinity` 值。

**结果概率表 (C2 + C4 完整映射)**：

| 好感度分档 | 区间 | `discuss` | `chat` | `conflict` | `none` | 合计 |
|:----------|:----:|:---------:|:------:|:----------:|:------:|:----:|
| **挚友带** | `avg_aff >= 60` | 50% | 50% | 0% | 0% | 100% |
| **敌对带** | `avg_aff <= -60` | 0% | 10% | 60% | 30% | 100% |
| **路人带** | `-60 < avg_aff < 60` | 5% | 30% | 5% | 60% | 100% |

**掷骰方法**：加权随机 — `random() × 100`，落在各概率区间的累积范围中选定结果。

示例（路人带）：
- `[0, 5)` → `discuss`
- `[5, 35)` → `chat`
- `[35, 40)` → `conflict`
- `[40, 100)` → `none`

---

### 3.4 MECE 校验

| 维度 | 独立性 | 穷尽性 |
|------|--------|--------|
| 行为→地点映射 | ✅ 每个行为恰好映射一个地点 | ✅ 7 个行为全覆盖 |
| 碰面结果 | ✅ 4 种结果互斥 | ✅ 概率和 = 100% |
| 好感度分档 | ✅ 3 个区间无重叠 | ✅ `[-100, +100]` 完全覆盖 |
| 道风初始化 | ✅ 3 个选项互斥 | ✅ 开局只选一个 |

---

### 3.5 持久化考量

| 数据 | 是否持久化 | 说明 |
|------|:---------:|------|
| `SectState.ethos` | ✅ 是 | 存档 v5 新增字段 |
| `SectState.discipline` | ✅ 是 | 存档 v5 新增字段 |
| 弟子地点 `location` | ❌ 否 | 运行时纯函数派生 |
| 碰面冷却 Map | ❌ 否 | 运行时临时状态，重启重置 |
| 存档版本 | `v4 → v5` | 迁移仅新增 SectState 字段默认值 |

---

## §4 Fallback 文案库 (C5)

### 4.1 地点中文映射表

| LocationTag | 中文名 |
|-------------|--------|
| `SECT_HALL` | 宗门大殿 |
| `DAN_ROOM` | 丹房 |
| `LING_TIAN` | 灵田 |
| `BACK_MOUNTAIN` | 后山 |
| `LING_SHOU_SHAN` | 灵兽山 |
| `BOUNTY_FIELD` | 悬赏任务区 |

### 4.2 碰面 Fallback 模板（每类 ≥3 条）

占位符说明：`{A}` = 弟子A姓名，`{B}` = 弟子B姓名，`{LOC}` = 地点中文名

#### `chat` 闲聊（Lv.1 普通日志）

| # | 模板 |
|---|------|
| 1 | `{A}在{LOC}遇到了{B}，两人有一搭没一搭地聊了几句。` |
| 2 | `{B}路过{LOC}，{A}叫住了对方，闲谈片刻。` |
| 3 | `{A}和{B}在{LOC}不期而遇，随口聊了几句宗门琐事。` |

#### `discuss` 论道（Lv.2 高亮日志）

| # | 模板 |
|---|------|
| 1 | `{A}与{B}在{LOC}席地而坐，交流起修炼心得。` |
| 2 | `{A}和{B}就某个功法的诀窍辩论了起来，两人都有所领悟。` |
| 3 | `{B}向{A}请教了一个难题，{A}倾囊相授，一时相谈甚欢。` |

#### `conflict` 冲突（Lv.2 高亮日志）

| # | 模板 |
|---|------|
| 1 | `气氛有些紧张，{A}和{B}在{LOC}发生了言语上的冲突。` |
| 2 | `{A}见到{B}后冷哼一声，两人互相挖苦了几句。` |
| 3 | `{A}与{B}在{LOC}差点动起手来，幸好旁人拉住了。` |

### 4.3 行为日志地点增强模板（每种行为 1 条）

现有行为日志在 F0-α 中增强为带地点信息：

| 行为 | 增强模板 |
|------|---------|
| `MEDITATE` | `{D}在后山静坐修炼。` |
| `ALCHEMY` | `{D}在丹房潜心炼丹。` |
| `FARM` | `{D}在灵田忙着农活。` |
| `EXPLORE` | `{D}前往灵兽山历练去了。` |
| `BOUNTY` | `{D}出发前往悬赏任务区。` |
| `REST` | `{D}在宗门大殿歇息。` |
| `IDLE` | `{D}在宗门大殿闲逛。` |

---

## §5 User Stories 索引

| 文件 | Phase | Story 数 | 覆盖范围 |
|------|:-----:|:--------:|---------:|
| `phaseF0-alpha-user-stories.md` | F0-α | 5 | 地点推导 + 碰面引擎 + MUD文案 + 道风状态 + 存档迁移 |

---

## §6 Pre-Mortem 分析

| # | 失败原因 | 预警信号 | 缓解措施 | 风险 |
|---|---------|---------|---------|:----:|
| 1 | 碰面事件刷屏——8 弟子产出过多碰面日志 | 5 分钟内超过 20 条碰面日志 | 60 秒/对冷却 + 路人带 60% none 率；若仍过多可调高冷却或降低 base chance | 🟡 |
| 2 | 碰面事件太少——玩家感知不到"弟子会碰面" | 5 分钟内 0 条碰面日志 | 8 弟子中修炼行为占比高，BACK_MOUNTAIN 是热点，理论上不会太少；若确实太少可降低冷却或提高 base chance | 🟢 |
| 3 | 道风字段加入导致旧存档迁移失败 | v4→v5 迁移后 sect 字段缺失或 NaN | 迁移函数硬编码默认值 0；回归测试覆盖 v1→v2→v3→v4→v5 全链 | 🟢 |
| 4 | 碰面冷却 Map 内存泄漏 | 运行数小时后 Map 条目持续增长 | C(8,2)=28 对，Map 最多 28 条，不可能泄漏 | 🟢 |

---

## §7 假设审计

| # | 假设 | 错误后果 | 风险 | 验证方式 | 何时验证 |
|---|------|---------|:----:|---------|---------:|
| 1 | 弟子行为选择足够均匀，同地碰面概率非退化 | 若所有弟子永远修炼，只在后山碰面 | 🟡 | 运行 15 分钟观察各地点碰面分布 | SGE 集成测试 |
| 2 | 5 秒扫描间隔 + 20% base + 60 秒冷却的组合产出合理密度 | 过多或过少 | 🟡 | 运行 15 分钟统计碰面事件数/分钟 | SGE 集成测试 |
| 3 | 现有 EventBus 每 tick 重建的设计可承载碰面事件 | 碰面事件发射后被下一 tick 的 drain 消费前丢失 | 🟡 | 确认 encounter-tick 在 soul-event handler 之前执行 | SGA TDD |
| 4 | 宗门道风在 F0-α 中仅存储不影响任何游戏逻辑 | 若有意外耦合 | 🟢 | grep 搜索 ethos/discipline 引用 | SGE 代码审查 |

---

## §8 Party Review 报告

*（待 Step 2.5 自检 + Step 3 User Stories 完成后执行）*

---

## §9 USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] Party Review 无 BLOCK 项（CONDITIONAL PASS：23 PASS / 2 WARN / 0 BLOCK）

签章：`[x] GATE 1 PASSED` — 2026-03-30

---

## 变更日志

| 日期 | 级别 | 变更内容 | 影响范围 | 批准人 |
|------|------|---------|---------|--------|
| 2026-03-30 | 初版 | /SPM 完成 Phase F0-α PRD v1.0 | — | — |
