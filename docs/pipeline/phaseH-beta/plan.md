# Phase H-β 实施计划

> **日期**：2026-03-30 | **角色**：/SGA
> **TDD**：[phaseH-beta-TDD.md](../../design/specs/phaseH-beta-TDD.md)

---

## 实施顺序

```
Step A: game-logger.ts flush 变更          ← 独立
Step B: idle-engine.ts 回调 + getter       ← 依赖 A
Step C: mud-formatter.ts 新增格式化函数     ← 独立，与 A/B 并行
Step D: main.ts 路由 + 命令               ← 依赖 B + C
Step E: 回归测试 + 手动验证               ← 依赖 D
Step F: 文档更新                          ← 依赖 E
```

## 文件变更

| # | 文件 | Step | 变更内容 |
|---|------|------|---------|
| 1 | `src/engine/game-logger.ts` | A | flush() 增加 fire-and-forget writeLogs |
| 2 | `src/engine/idle-engine.ts` | B | +MudLogCallback, +setOnMudLog(), +getEmotionState(), tick() flush 分发 |
| 3 | `src/ui/mud-formatter.ts` | C | +formatDiscipleInspect(), +formatSectProfile() |
| 4 | `src/main.ts` | D | +routeLogEntryToMud(), +setOnMudLog 注册, +inspect/i/sect 命令 |

## 验证清单

- [ ] `npm run test:regression` 64/64
- [ ] 浏览器 15 分钟：碰面/世界事件/AI独白可见
- [ ] `inspect <名>` 输出完整
- [ ] `sect` 输出完整
- [ ] DevTools IndexedDB 日志持久化正常
