# IJ-11 Prompt 真实数据映射分析

> **目的**：确认哪些 prompt 字段能由引擎运行时提供，哪些需要后续编码补充

---

## 一、引擎现有 Lv.3 双阶段 Pipeline 的实际 Prompt

### Call1 System Message（L287-290 soul-evaluator.ts）

```
你是修仙世界NPC行为决策器。根据角色性格和当前处境，从候选行动中选出最合理的一个。
只需选择行动，不需要解释。角色的道德立场决定了他的选择——邪恶角色会做邪恶的事。
候选行动：【FIGHT(挺身迎战) / PROTECT(保护弱小同门) / FLEE(趁乱逃跑) / LOOT(趁乱捡拾战利品) / HIDE(躲起来观望)】
```

### Call1 User Message（L292-295）

```
【事件】宗门发生了一件异事
【角色】张清风 | 性格：温和坚毅 | 特点：心软易动摇 | 道德偏善，恪守规矩
【宗门】宗门以仁义为本，扶危济困，门规森严
```

### Call2 System（L350）

```
你是修仙世界的文学渲染器。根据角色性格和所选行动，生成内心独白并选择情绪。中国古典仙侠风。
```

### Call2 User（L332-336）

```
【角色】张清风（温和坚毅）。心软易动摇
【事件】宗门发生了一件异事
【选择的行动】FIGHT（挺身迎战）
【候选情绪】anger、fear、worry、contempt、neutral
请为张清风生成此刻的内心独白（20-80字），并选择一种情绪。
```

---

## 二、关键发现：Call1 缺少关系上下文

| Pipeline | 关系数据注入 | 来源 |
|----------|:-----------:|------|
| `evaluateEmotion()` Lv.1 | ✅ 有 | L144-168 `buildRelationshipSummary` |
| `evaluateMonologue()` Lv.2 | ❌ 无 | |
| `evaluateDecisionAndMonologue()` Lv.3 | **❌ 无** | 只有角色+事件+宗门 |

**这就是测试与生产的最大差距**：我们在 PoC 测试中给了丰富的关系上下文，但 Lv.3 决策 pipeline 实际上根本不注入关系数据！

---

## 三、引擎运行时可用数据字段盘点

### ✅ 已有且已注入 Call1

| 字段 | 数据源 | 格式 |
|------|--------|------|
| 角色名 | `subject.name` | `张清风` |
| 性格名 | `subject.personalityName` | `温和坚毅` |
| 特性描述 | `traits[].defId → TraitDef.aiHint` | `心软易动摇；好学不倦` |
| 道德描述 | `moral.goodEvil + lawChaos → describeMoral()` | `道德偏善，恪守规矩` |
| 宗门道风 | `sect.ethos + discipline → describeEthos()` | `以仁义为本，门规森严` |
| 事件描述 | `SoulEventType → getEventDescription()` | `宗门发生了一件异事` |
| 行动候选池 | `buildActionPool(eventType, eventDefId, goodEvil)` | `FIGHT/PROTECT/FLEE/LOOT/HIDE` |

### ⚠️ 数据存在但未注入 Call1（需补充代码）

| 字段 | 数据源 | 当前状态 | 补充工作量 |
|------|--------|---------|:---------:|
| 好感度 | `RelationshipEdge.affinity` | Lv.1 有注入，Lv.3 缺 | 小 |
| 关系标签 | `RelationshipEdge.tags` (friend/rival/mentor/admirer/grudge) | 同上 | 小 |
| 关键事件 | `RelationshipMemory.keyEvents[].content + delta` | 同上 | 小 |
| 叙事片段 | `RelationshipMemory.narrativeSnippet` | 同上 | 小 |
| 对方名字 | `event.actorId → disciples.find().name` | 已有变量 `actorName` | 极小 |

### ⚠️ 数据不完整（需扩展）

| 字段 | 当前限制 | 需要什么 |
|------|---------|---------|
| 关系标签中文 | 只有5种英文 tag | 加映射表 `friend→好友, rival→宿敌, mentor→恩师` |
| 世界事件描述 | `world-event` 固定"宗门发生了一件异事" | 读取 eventDefId 的 description 字段 |
| 关系标签种类 | 缺 lover/enemy/stranger | 扩展 RelationshipTag 并设阈值 |

### ❌ 引擎无法提供

| 字段 | 说明 |
|------|------|
| "你们已私定终身" | 关系阶段性总结，无数据源。可由 narrativeSnippet 替代 |
| "师傅年事已高" | NPC 属性描述，无年龄/状态字段。可由 trait 替代 |

---

## 四、可用的真实 Prompt 模板

### 补充关系注入后的 Call1 User（最小改动版）

```
【事件】宗门遭妖兽来袭，波及王灵均
【角色】张清风 | 性格：温和坚毅 | 特点：心软易动摇 | 道德偏善
【宗门】以仁义为本，门规森严
【与王灵均的关系】
好感：-45（rival）
关键经历：曾被当众羞辱(-30)；因争夺破境草翻脸(-20)；在灵兽山被暗算(-10)
张清风与王灵均素来针锋相对，昔日积怨难消。
```

### 对应的真实 Action Pool（COMBAT，goodEvil=30）

```
FIGHT(挺身迎战) / PROTECT(保护弱小同门) / FLEE(趁乱逃跑) / HIDE(躲起来观望)
```

（G3过滤: goodEvil>30 移除了 LOOT）

---

## 五、结论

| 维度 | 状态 | 工作量 |
|------|------|:------:|
| Call1 核心数据 | ✅ 已有 | 0 |
| Call1 关系注入 | ⚠️ 数据存在但未接入 Lv.3 | **小**（复用 Lv.1 逻辑） |
| 关系标签中文映射 | ⚠️ 需新增查找表 | **极小** |
| 世界事件描述丰富化 | ⚠️ 需读取 eventDef | **小** |
| RelationshipTag 扩充 | ⚠️ 需新增类型 | **中** |
| Action Pool | ✅ 已完整实现 | 0 |
| 二段 Pipeline | ✅ 已生产代码 | 0 |
