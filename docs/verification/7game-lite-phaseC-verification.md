# Phase C 集成验证检查清单 — Step 9

> 验证日期：2026-03-28
> 每一行严格按 **IDENTIFY→RUN→READ→VERIFY→CLAIM** 五步执行。

---

## 一、功能验证（基于 Step 6 的 AC）

### Story 1: GameState v3 + 存档迁移

| AC# | 验证方式 | 命令/操作 | 预期结果 | 实际结果 | 状态 |
|-----|---------|----------|---------|---------|------|
| 1 | 自动 | `verify-phaseC.ts` Test 9 | v2→v3 迁移后含全部新字段 | version=3, breakthroughBuff/cultivateBoostBuff/pillsConsumed/breakthroughFailed 均正确 | ✅ |
| 2 | 自动 | `tsc --noEmit` + 代码审查 | `createDefaultLiteGameState()` 返回 v3 含默认值 | version=3, breakthroughBuff={pillsConsumed:[],totalBonus:0}, cultivateBoostBuff=null, 统计字段=0 | ✅ |
| 3 | 自动 | `verify-phaseC.ts` Test 9 | v3 存档不触发迁移 | migrateSave 中 `version < 3` 守卫跳过 migrateV2toV3 | ✅ |
| 4 | 自动 | `verify-phaseC.ts` Test 10 | v1→v2→v3 链式迁移 | 全链路通过：fields/alchemy 删除 + pills/farmPlots 添加 + buff 字段添加 | ✅ |

### Story 2: 灵脉密度 + 灵气速率扩展

| AC# | 验证方式 | 命令/操作 | 预期结果 | 实际结果 | 状态 |
|-----|---------|----------|---------|---------|------|
| 1 | 自动 | `verify-phaseC.ts` Test 5+6 | 炼气1密度=1.0 | getSpiritVeinDensity(1,1)=1.0, calculateAuraRate(1,1,0)=1.0 | ✅ |
| 2 | 自动 | `verify-phaseC.ts` Test 5 | 炼气5密度=1.2 | getSpiritVeinDensity(1,5)=1.2 | ✅ |
| 3 | 自动 | `verify-phaseC.ts` Test 5+6 | 筑基1密度=2.0 | getSpiritVeinDensity(2,1)=2.0, rate=800.0 | ✅ |
| 4 | 自动 | `verify-phaseC.ts` Test 6 | 修速丹×2 | calculateAuraRate(1,5,1,1.2,2.0)=36.0 | ✅ |
| 5 | 自动 | `verify-phaseC.ts` Test 6 | 无修速丹=1.0 | calculateAuraRate(1,1,0)=1.0 | ✅ |

### Story 3: 丹药消费引擎

| AC# | 验证方式 | 命令/操作 | 预期结果 | 实际结果 | 状态 |
|-----|---------|----------|---------|---------|------|
| 1 | 代码审查 | pill-consumer.ts L87-101 | 无buff→自动服最低品质修速丹 | tickCultivateBoost 逻辑验证通过 | ✅ |
| 2 | 代码审查 | pill-consumer.ts L92 | buff存在→跳过 | 硬跳过守卫确认 | ✅ |
| 3 | 代码审查 | pill-consumer.ts L113-133 | 破镜丹追加到pillsConsumed | push + totalBonus 累加确认 | ✅ |
| 4 | 代码审查 | pill-consumer.ts L112 | 3颗上限 | BREAKTHROUGH_PILL_MAX_COUNT 短路确认 | ✅ |
| 5 | 代码审查 | pill-consumer.ts L62-63 | 无库存→null | filter 为空→return null 确认 | ✅ |
| 6 | 代码审查 | idle-engine.ts | 非突破不服回灵丹 | consumeHealPillsForBreakthrough 仅在 executeBreakthrough 中调用 | ✅ |
| 7 | 自动 | `verify-phaseC.ts` Test 7 | >85%不吃破镜丹 | 炼气2→3(90%) > 0.85 → 不吃 | ✅ |

### Story 4: 概率突破引擎

| AC# | 验证方式 | 命令/操作 | 预期结果 | 实际结果 | 状态 |
|-----|---------|----------|---------|---------|------|
| 1 | 自动 | `verify-phaseC.ts` Test 2+3 | 85%判定 | rng=0.1→成功, rng=0.99→失败, penalty=750 | ✅ |
| 2 | 自动 | `verify-phaseC.ts` Test 2 | 3×中品→0.99 cap | min(0.60+0.45,0.99)=0.99 | ✅ |
| 3 | 自动 | `verify-phaseC.ts` Test 2 | 筑基1→2 3×中品→0.70 | min(0.25+0.45,0.99)=0.70 | ✅ |
| 4 | 代码审查 | breakthrough-engine.ts L135-143 | 失败→buff清零+扣灵气 | 逻辑确认 | ✅ |
| 5 | 代码审查 | breakthrough-engine.ts L121-134 | 成功→buff清零+境界升 | 逻辑确认 | ✅ |
| 6 | 代码审查 | breakthrough-engine.ts L90-95 | 灵气不足→回灵丹补 | consumeHealPillsForBreakthrough 调用确认 | ✅ |
| 7 | 自动 | `verify-phaseC.ts` Test 4 | 炼气9→需天劫 | blockReason='tribulation-required' | ✅ |
| 8 | 自动 | `verify-phaseC.ts` Test 4 | 筑基3→上限 | blockReason='max-realm' | ✅ |

### Story 5: Tick 扩展 + MUD 日志集成

| AC# | 验证方式 | 命令/操作 | 预期结果 | 实际结果 | 状态 |
|-----|---------|----------|---------|---------|------|
| 1 | 代码审查 | idle-engine.ts L138-141 | buff倒计时+到期清除 | tickBoostCountdown 逻辑确认 | ✅ |
| 2 | 代码审查 | idle-engine.ts L147-158 | 自动突破含CR-A1冷却 | breakthroughCooldown 3 tick 确认 | ✅ |
| 3 | 代码审查 | main.ts L217-232 | status显示全部新字段 | 灵脉密度/修速丹/破镜丹/统计 确认 | ✅ |
| 4 | 代码审查 | idle-engine.ts + main.ts | UI速率含密度+修速丹 | getCurrentAuraRate 正确调用确认 | ✅ |
| 5 | 待运行时 | DevTools Profile | tick < 5ms | — | ⏳ |

---

## 二、数值验证（基于 Step 8 脚本）

| 验证脚本 | 运行命令 | 通过标准 | 实际输出 | 状态 |
|---------|---------|---------|---------|------|
| verify-phaseC.ts | `npx tsx scripts/verify-phaseC.ts` | 全部 ✅ | **10 组全通过，0 失败** | ✅ |

覆盖：F-C1a/b/c, F-C3, F-C4, Fix C, Monte Carlo(N=10k, 偏差<5%)

---

## 三、性能验证

| 指标 | 红线 | 测量方式 | 实际值 | 状态 |
|------|------|---------|-------|------|
| TypeScript 编译 | 零错误 | `npx tsc --noEmit` | **0 errors** | ✅ |
| tick 耗时 | ≤ 5ms | 待运行时 Profile | — | ⏳ |
| localStorage 存档 | ≤ 10MB | 待运行时检查 | — | ⏳ |

---

## 四、回归验证

| 已有系统 | 验证方式 | 实际输出 | 状态 |
|---------|---------|---------|------|
| Phase B-α 灵田+炼丹 | `npx tsx scripts/verify-phaseB-alpha.ts` | 6 组全通过 | ✅ |
| TypeScript 类型系统 | `npx tsc --noEmit` | 0 errors | ✅ |
| Code Review | 10 项 CR issue | 9 修复 + 1 无需修改 | ✅ |

---

## 验证门禁判定

| 维度 | 总项 | 通过 | 待运行时 | 失败 |
|------|------|------|---------|------|
| 功能验证 | 24 AC | 23 | 1 | 0 |
| 数值验证 | 10 组 | 10 | 0 | 0 |
| 性能验证 | 3 项 | 1 | 2 | 0 |
| 回归验证 | 3 项 | 3 | 0 | 0 |

> **结论：Step 9 通过。** 仅剩 2 项运行时性能指标需浏览器实测，不阻塞 Step 10 交接。
