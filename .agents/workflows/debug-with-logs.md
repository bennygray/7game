---
description: 调试和验证时应优先使用日志系统和脚本，而非浏览器截图
---

# 调试优先级规则

## 核心原则

**调试和验证必须优先使用日志系统（GameLogger）和诊断脚本，浏览器仅作为最后手段。**

## 何时用脚本/日志

- ✅ 行为系统是否正常切换 → `scripts/diagnose-phaseD.ts`
- ✅ 对话系统是否触发 → `scripts/diagnose-dialogue.ts`
- ✅ 数值公式是否正确 → `scripts/verify-*.ts`
- ✅ 引擎 tick 流水线是否按序执行 → 模拟 tick 脚本
- ✅ 回归测试 → `npm run test:regression`
- ✅ 编译检查 → `npx tsc --noEmit`
- ✅ 日志输出分析 → `GameLogger.flush()` 读取缓冲区

## 何时用浏览器

- 🔍 CSS/布局问题（纯视觉）
- 🔍 用户交互流程测试（命令输入、按钮点击）
- 🔍 需要用户亲眼确认的 UI 效果演示

## 禁止行为

- ❌ 用浏览器截图调试逻辑 bug
- ❌ 用浏览器截图验证引擎/AI 系统是否工作
- ❌ 反复启动浏览器 subagent 只为了"看一眼"
- ❌ 用浏览器代替已有的诊断脚本

## 诊断脚本编写规范

1. 脚本应模拟完整的引擎流水线（planIntent → executeIntents → DialogueCoordinator）
2. 使用 `GameLogger` 记录关键节点
3. 输出结构化汇总（行为切换次数、触发次数、对话次数等）
4. 以退出码 0/1 表示通过/失败
5. 放在 `scripts/` 目录下
