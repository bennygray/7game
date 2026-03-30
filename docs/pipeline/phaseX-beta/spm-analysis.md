# Phase X-β SPM 分析 — 命令增强 + 视觉反馈

> **Phase**：X-β "掌门视界·命令增强"
> **创建日期**：2026-03-31
> **SPM 状态**：Step 1~3 完成
> **来源**：FB-016（Phase X-α PRD §5 OUT）

---

## §1 需求来源

### 需求债务匹配

FB-016 — **展现层增强 X-β**：Tab 自动补全弟子名/命令、突破全屏闪烁效果、行为图标前缀、命令别名系统（l=look, i=inspect, s=status）

> 来源：Phase X-α PRD §5 OUT，于 2026-03-31 登记。

### 现有架构（Phase X-α 交付基线）

| 文件 | 行数 | 职责 |
|------|:----:|------|
| `src/main.ts` | 114 | 入口 — 初始化 + 模块连接 + 启动 |
| `src/ui/command-handler.ts` | 278 | 命令解析 + 路由 + 命令历史（↑/↓） |
| `src/ui/engine-bindings.ts` | 212 | 引擎回调 + 消息路由 R-01~R-13 |
| `src/ui/log-manager.ts` | ~50 | 双区日志（mainLog + systemBar） |
| `src/ui/layout.ts` | ~90 | DOM 结构构建 |
| `src/ui/mud-formatter.ts` | 414 | 纯函数格式化 |
| `src/styles/mud-theme.css` | 307 | CSS 变量 + class 体系 |

### 命令清单（10 个命令 + 2 别名已存在）

| 命令 | 已有别名 | 功能 |
|------|:--------:|------|
| `look [弟子]` | `l` | 宗门总览 / 弟子档案 |
| `inspect <弟子>` | `i` | 灵魂档案 |
| `sect` | — | 宗门道风 |
| `judge [N]` | — | 裁决窗口 |
| `status` | — | 宗主状态 |
| `bt` / `breakthrough` | `bt` | 尝试突破 |
| `clear` | — | 清空日志 |
| `reset` | — | 清除存档 |
| `ai` | — | 连接 AI 后端 |
| `help` | — | 帮助 |

> **注意**：`look`/`l` 和 `inspect`/`i` 的别名已在 X-α command-handler.ts 中实现，但缺少 `s=status`、`j=judge`、`h=help` 等。

### 行为类型（7 个，带中文标签）

| 行为 | 标签 | 图标建议 |
|------|------|---------|
| `idle` | 发呆 | 💤 |
| `meditate` | 打坐修炼 | 🧘 |
| `explore` | 外出历练 | ⚔️ |
| `rest` | 休息 | 😴 |
| `alchemy` | 炼丹 | 🔥 |
| `farm` | 照料灵田 | 🌿 |
| `bounty` | 执行悬赏 | 📜 |

---

## §2 约束与边界

### 硬约束（继承 X-α）

| # | 约束 | 来源 |
|---|------|------|
| HC-1 | 不引入重 DOM 框架 | X-α I4 继承 |
| HC-2 | 零 Engine/AI/Data 层改动 | X-α I1 继承 |
| HC-3 | 零 GameState 变更，零存档迁移 | X-α I2 继承 |
| HC-4 | main.ts 保持 ≤150 行 | X-α M-04 |
| HC-5 | 回归 64/64 持续通过 | X-α I3 继承 |

### 新增约束

| # | 约束 | 理由 |
|---|------|------|
| HC-6 | Tab 补全不引入外部库 | 自研轻量实现，避免依赖膨胀 |
| HC-7 | 突破闪烁效果 ≤3s，可通过 CSS animation 实现 | 不阻塞交互，纯视觉 |
| HC-8 | 图标前缀使用 Unicode emoji，不引入图标字体 | 最小依赖 |
