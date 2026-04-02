# Phase GS — SGE 任务追踪

> **Phase**: GS（弟子性别系统）
> **日期**: 2026-04-02
> **角色**: /SGE

---

## 编码任务清单

| # | 任务 | 文件 | 状态 |
|---|------|------|------|
| 1a | Gender type + utils + field | `src/shared/types/game-state.ts` | ✅ |
| 1b | 名字池重构 + 性别生成 | `src/engine/disciple-generator.ts` | ✅ |
| 1c | 存档迁移 v6→v7 | `src/engine/save-manager.ts` | ✅ |
| 1d | goal-tick 代词替换 | `src/engine/handlers/goal-tick.handler.ts` | ✅ |
| 1e | soul-engine 代词替换 + import | `src/engine/soul-engine.ts` | ✅ |
| 1f | AI prompt 性别注入 | `src/ai/soul-prompt-builder.ts` | ✅ |
| 1g | MUD look 性别符号 | `src/ui/mud-formatter.ts` (formatLookOverview) | ✅ |
| 1h | MUD profile 性别标签 | `src/ui/mud-formatter.ts` (formatDiscipleProfile) | ✅ |
| 1i | MUD inspect 性别标签 | `src/ui/mud-formatter.ts` (formatDiscipleInspect) | ✅ |
| 2 | 回归测试 Suite 5 | `scripts/regression-all.ts` | ✅ |
| 3 | 架构文档更新 | gamestate/schema/systems/backlog/handoff | ✅ |

---

## 验证结果

- **tsc**: 0 errors
- **eslint**: 0 new warnings（所有 warn 为已有 magic-number 等）
- **回归测试**: 81/81 passed（+17 新 Phase GS 测试）

---

## 变更文件清单

| 文件 | 变更类型 |
|------|---------|
| `src/shared/types/game-state.ts` | M — +Gender type, +3 utils, +gender field, version 6→7 |
| `src/engine/disciple-generator.ts` | M — MALE/FEMALE name pools, FEMALE_RATIO, gender generation |
| `src/engine/save-manager.ts` | M — +migrateV6toV7, SAVE_VERSION 6→7 |
| `src/engine/handlers/goal-tick.handler.ts` | M — +getPronoun import, pronoun dynamic |
| `src/engine/soul-engine.ts` | M — +getPronoun import, pronoun dynamic |
| `src/ai/soul-prompt-builder.ts` | M — gender desc in identity block |
| `src/ui/mud-formatter.ts` | M — +gender imports, look/profile/inspect gender display |
| `scripts/regression-all.ts` | M — +Suite 5 Phase GS (17 tests) |
| `docs/design/arch/gamestate.md` | M — v7, +gender field |
| `docs/design/arch/schema.md` | M — +v7 entry, +§8 |
| `docs/project/prd/systems.md` | M — +Phase GS row |
| `docs/project/feature-backlog.md` | M — FB-018 ✅ 清偿 |
| `docs/project/handoff.md` | M — Phase GS 断点 |
