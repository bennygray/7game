# Phase X-α 实施计划

> **创建日期**：2026-03-31
> **前置**：PRD GATE 1 ✅ | TDD GATE 2 待签

---

## 实施顺序

```
Step 1: CSS 主题文件（Story #0）
  ↓
Step 2: mud-formatter class 化改造（Story #0 续）
  ↓
Step 3: UI 模块拆分——layout.ts / log-manager.ts（Story #1 + #2）
  ↓
Step 4: command-handler.ts 拆分 + 命令历史（Story #1 + #4）
  ↓
Step 5: engine-bindings.ts + 消息路由（Story #1 + #3）
  ↓
Step 6: main.ts 瘦身 + 集成（Story #1 完成）
  ↓
Step 7: 回归验证（Story #5）
```

---

## 风险清单

| # | 风险 | 概率 | 影响 | 缓解 |
|---|------|:----:|:----:|------|
| 1 | formatter CSS class 拼写不一致导致样式丢失 | 中 | 低 | Step 2 完成后立即浏览器验证 |
| 2 | 拆分后模块间 import 循环 | 低 | 中 | ADR-Xα-03 依赖注入模式避免循环 |
| 3 | 日志分区路由错误导致重要事件丢失 | 低 | 高 | Step 5 逐条对照 R-01~R-13 验证 |
