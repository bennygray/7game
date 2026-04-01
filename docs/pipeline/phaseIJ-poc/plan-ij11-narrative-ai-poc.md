# IJ-11: Narrative Snippet AI 预生成 PoC — 实施计划

> **来源**: Phase IJ task.md T15（⏭️ 跳过 → 现在实施）
> **PRD 引用**: §4.5 R-M07 层级 1 / §9 IJ-11 / §11 A-5, A-6
> **日期**: 2026-04-01
> **执行环境**: Antigravity（非 Claude Code）

---

## 背景

Phase IJ v3.0 已实现 Narrative Snippet 三层降级的层级 2（规则拼接）和层级 3（模板插值），
但层级 1（AI 预生成）当前是空实现。本 PoC 验证两个核心假设：

| 假设 | 验证内容 | 成功标准 |
|------|---------|---------|
| **A-5** | 规则拼接 vs AI 预生成叙事质量 | AI 叙事更自然，负面叙事含判定词 |
| **A-6** | AI 预生成延迟 | P95 ≤ 2000ms |

## 实施方案

### 阶段 1：实现 `buildByAI()` 核心逻辑

**修改文件**: `src/ai/narrative-snippet-builder.ts`

1. 新增 AI 服务器配置常量（URL, timeout 2000ms, max_tokens 100）
2. 定义 AI snippet JSON Schema（`{ snippet: string, maxLength: 80 }`）
3. 实现 `buildByAI()` — 构造 prompt → fetch `/api/infer` → 解析结果 → 截断保护
4. 实现 `triggerAIPregenerate()` — 异步调用 buildByAI + 缓存写入

**Prompt 设计**:
- System: 修仙世界叙事器，≤80字，古典仙侠文风，第三人称
- User: 角色名 + 好感度 + 标签 + top-3 事件
- Output: JSON `{ snippet: "..." }`

**API 路径**: 复用 `/api/infer` 结构化补全（与 SoulEvaluator 共用）

### 阶段 2：PoC 测试脚本

**新文件**: `scripts/poc-ij11-narrative-ai.ts`

| # | 测试项 | 场景 | 通过标准 |
|---|--------|------|---------|
| T1 | 正面关系 | affinity=70, friend, 3 正面事件 | 非空、≤80字、正面叙事 |
| T2 | 负面关系 | affinity=-45, rival, 3 负面事件 | 非空、≤80字、含负面判定词 |
| T3 | 中性关系 | affinity=5, 无标签, 1 事件 | 非空、≤80字、无强烈情感词 |
| T4 | 无事件 | affinity=-65, grudge, 0 事件 | 非空、≤80字、不虚构事件 |
| T5 | 延迟基准 | S2 重复 20 次 | **P95 ≤ 2000ms** |
| T6 | 质量对比 | S2 AI vs 规则拼接 | 人工审查 |
| T7 | 集成测试 | triggerAIPregenerate → 缓存 → getSnippet | 缓存命中 |

### 阶段 3：PROTECT bias 对比验证（延后执行）

> **状态**: 📋 待执行（阶段 1+2 完成后根据结果决定）

复用 V4 T4 场景（张清风 vs 李沐阳妖兽围困决策），3 组对比：
- A: 规则拼接叙事 → 统计 OBSERVE/IGNORE 命中率
- B: AI 预生成叙事 → 统计 OBSERVE/IGNORE 命中率
- C: 无叙事对照组 → 统计 PROTECT/FIGHT 默认率

每组 10 次决策评估，总计 30 次 AI 调用。

## 文件修改清单

| 文件 | 类型 | 说明 |
|------|:----:|------|
| `src/ai/narrative-snippet-builder.ts` | MODIFY | buildByAI + triggerAIPregenerate |
| `scripts/poc-ij11-narrative-ai.ts` | NEW | PoC 测试脚本 |

## 验证计划

```bash
npx tsx scripts/poc-ij11-narrative-ai.ts          # PoC 测试
npx tsx scripts/verify-phaseIJ-relationship-memory.ts  # 回归
npx tsc --noEmit                                   # 类型检查
```

## 通过标准

| 验证项 | 标准 |
|--------|------|
| T1-T4 质量 | 4/4 非空、≤80 字符、风格正确 |
| T5 延迟 | P95 ≤ 2000ms |
| T7 集成 | 缓存写入 + 命中 |
| 回归 | 64/64 + 38/38 |
| tsc | 零错误 |
