# Phase H-γ 掌门裁决 — 完成总结

> **日期**：2026-03-31 | **版本**：v0.4.6

---

## 变更清单

### 新增文件（2 个）

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/shared/types/ruling.ts` | 91 | 裁决类型定义（RulingDef/RulingOption/ActiveRuling/RulingResolution） |
| `src/shared/data/ruling-registry.ts` | 181 | 裁决注册表（12 定义）+ findRulingOptions() |

### 修改文件（5 个）

| 文件 | 变更 | 说明 |
|------|------|------|
| `src/engine/tick-pipeline.ts` | +2 行 | TickContext 新增 `pendingStormEvent?: WorldEventPayload` |
| `src/engine/handlers/world-event-tick.handler.ts` | +4 行 | STORM 事件标记 `ctx.pendingStormEvent` |
| `src/engine/idle-engine.ts` | +~120 行 | 裁决管理：createRuling/resolveRuling/checkRulingTimeout/applyEthosDrift + 回调 |
| `src/ui/mud-formatter.ts` | +~50 行 | formatRulingWindow() + formatRulingResult() |
| `src/main.ts` | +~25 行 | judge 命令解析 + 裁决回调注册 + help 更新 |

### 零变更

- GameState 结构不变（sect.ethos/discipline 已存在）
- 存档版本 v5 不变
- Handler 数量 13 不变
- 回归测试 64 条不变

---

## 验证结果

| 验证项 | 结果 |
|--------|------|
| TypeScript 编译（`npx tsc --noEmit`） | 0 错误 |
| 回归测试（`npm run test:regression`） | 64/64 通过 |
| Party Review | CONDITIONAL PASS（2 WARN / 0 BLOCK） |

### Party Review 汇总

| # | 角色 | 维度 | 判定 | 说明 |
|---|------|------|:----:|------|
| 1 | R1 魔鬼PM | D1-D4 | ✅ | 全部通过 |
| 2 | R6 找茬QA | D4 可测试性 | ⚠️ | 裁决系统缺自动化脚本 → TD-020 |
| 3 | R7 程序员 | D4 重复代码 | ⚠️ | eventText 渲染逻辑与 world-event-tick 重复 → TD-021 |

---

## 技术债务变更

- **新增**：TD-020（裁决可测试性）、TD-021（eventText 渲染去重）
- **清偿**：无

## 需求债务变更

- **清偿**：FB-011（玩家干预权缺失 → judge 命令裁决 STORM 事件）

---

## ADR 索引

| ADR | 决策 |
|-----|------|
| ADR-Hγ-01 | TickContext.pendingStormEvent 信号方案（同 dialogueTriggers 模式） |
| ADR-Hγ-02 | ActiveRuling 不持久化（同 StorytellerState 模式） |
