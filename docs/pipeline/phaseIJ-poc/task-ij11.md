# IJ-11 PoC 执行追踪

> **开始日期**：2026-04-01 | **模型**: Qwen3.5-2B (1222MB)
> **计划文档**: `docs/pipeline/phaseIJ-poc/plan-ij11-narrative-ai-poc.md`

---

## 阶段 1：实现 buildByAI ✅

- [x] 新增 AI 配置常量 + JSON Schema
- [x] 实现 `buildByAI()` 方法（v2 prompt 含极性约束+人名强制+温度0.5）
- [x] 实现 `triggerAIPregenerate()` 方法
- [x] `tsc --noEmit` 通过

## 阶段 2：PoC 测试（严格 6 维评估）✅

- [x] v1 测试：AI 通过率 50%，发现 4 类失败模式
- [x] v2 prompt 优化：AI 通过率 **92%**
- [x] T5 延迟 P95=**338ms** ≤ 2000ms ✅ (A-6 通过)
- [x] 回归测试 38/38 通过

## 阶段 3：PROTECT bias 验证 ✅

- [x] 3v1: 三组对比（AI/规则/无叙事），结论：叙事转移 bias 方向（PROTECT→FIGHT）但不消除
- [x] 3v2: 4 变体 prompt 工程对比
  - V1 行动描述重构: bias 80%→60% (+20pp)
  - V2 反 bias 系统提示: bias 80%→30% (**+50pp**)
  - V3 去英雄化身份: bias 80%→50% (+30pp)
  - **V4 全部组合: bias 80%→0% (✅ 100% 正确率)**

## 假设验证终结

| 假设 | 结论 | 关键数据 |
|------|:----:|---------|
| **A-6** 延迟 ≤ 2000ms | ✅ 通过 | P95=338ms |
| **A-5** 叙事质量 | ✅ 通过（需组合 prompt） | V4 组合=100% 正确率 |

## 全部产出

| 文件 | 用途 |
|------|------|
| `plan-ij11-narrative-ai-poc.md` | 实施计划 |
| `review-ij11-narrative-ai-poc.md` | 阶段2 质量评估 |
| `review-ij11-protect-bias.md` | 阶段3v1 bias 三组对比 |
| `review-ij11-bias-v2.md` | 阶段3v2 prompt 工程 5 变体对比 |
| `logs/poc-ij11-*.json/.txt` | 全部原始数据+日志 |
| `scripts/poc-ij11-*.ts` | 3 个测试脚本 |
| `src/ai/narrative-snippet-builder.ts` | 源码变更 |
