# Phase H-α SGE 执行追踪

> **更新日期**：2026-03-30 | **执行工程师**：/SGE

## 交付物

| Story | 描述 | AC 数 | 状态 |
|-------|------|:-----:|:----:|
| #1 | look 命令（宗门总览 + 弟子档案） | 4 | 🔄 进行中 |
| #2 | 日志分级显示（EventSeverity→颜色） | 4 | ⬜ 待开始 |
| #3 | 固定状态栏 + 世界呼吸 | 3 | ⬜ 待开始 |

## 编码任务清单

### Data Layer
- [/] 创建 `src/shared/data/zone-descriptions.ts`（6 Zone 描述 + 8 条呼吸文案）
- [ ] 创建 `src/ui/mud-formatter.ts`（纯格式化函数）

### UI Layer (main.ts)
- [ ] sticky 状态栏 DOM 重构
- [ ] `look` / `look <弟子>` 命令
- [ ] 日志分级颜色（BREATH→STORM）
- [ ] 呼吸定时器 (25~45s)
- [ ] help 命令更新

### 验证
- [ ] `npx tsx scripts/regression-all.ts` — 64/64 通过
- [ ] 浏览器验证 3 条 Story 的 AC
