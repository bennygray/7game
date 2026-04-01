# Phase IJ — SPM 分析过程

> **日期**：2026-03-31 | **角色**：/SPM

---

## 1. 需求来源

- 用户要求对 NPC 记忆系统进行预研，借鉴 Supermemory 理念
- 同时将 Phase I（深度世界）和 Phase J（涌现与深度）内容纳入统一预研
- 三系统互相关联：记忆↔因果事件↔个人目标

## 2. 需求债务检查

与本次预研相关的 Feature Backlog 条目：

| FB# | 关联 | 处理 |
|-----|------|------|
| FB-006 | 特性专属剧情事件 | 因果事件 R-C01 部分覆盖 |
| FB-007 | 关系衰减分层 | 记忆系统可为分层提供数据依据 |
| FB-008 | 关系确认/非确认 | 个人目标 friendship 类型间接相关 |
| FB-010 | 行为结算断层 | 因果事件系统直接回应此需求 |

## 3. 5-Why 根因分析

根因：记忆/事件/目标是三位一体的 NPC 智能基础设施，需先统一设计再分步实施。

## 4. 关键决策

| 决策点 | 用户选择 | 替代方案 |
|--------|---------|---------|
| 交付深度 | 设计定案 + 核心 PoC | ①完整实施记忆 ②三系统全量实施 |
| T2 NPC | 仅架构设计 | ①设计+最小PoC(3-5个) ②跳过 |
| 存档迁移 | 预研不做迁移 | 直接做 v6 迁移 |
| 0.8B 验证 | **独立为 Phase IJ-PoC** | 包含在 IJ 内 |

## 5. Party Review 汇总

- **BLOCK**: 0
- **WARN**: 3（IJ-07 验证标准→已独立为 Phase / TTL 参数→PoC 验证 / Layer 5 权重→cap ×2.0）
- **参与角色**: R1 魔鬼PM + R3 数值策划 + R4 项目经理 + R5 偏执架构师
- **R2 资深玩家**: 跳过（预研阶段无 UI 变更）

## 6. GATE 1 (v2.0)

```
[x] GATE 1 PASSED — 2026-03-31
```

---

## 7. V3.0 重走分析（2026-04-01）

### 触发原因

V4 基准测试报告（`docs/pipeline/phaseIJ-poc/review-v4-final-benchmark.md`）提供了 0.8B vs 2B 的 3 次完整对照实验数据，结论与 v2.0 PRD 假设有实质差异。

### 核心变更

| 维度 | v2.0 | v3.0 |
|------|------|------|
| 推荐模型 | Qwen3.5-0.8B | Qwen3.5-2B（0.8B 降级） |
| 甜蜜点 | L3 单级 | L6（决策）/ L2（日常）双级 |
| Narrative Snippet | 不存在 | 三层降级（AI预生成/规则拼接/模板） |
| Token 上限 | 512 | 1024 |
| 新增 User Stories | — | IJ-08~IJ-11（4 个） |
| 移除 User Stories | — | IJ-07（V4 已完成） |

### 用户决策

1. L2/L6 切换策略：按事件等级（Lv.0-1→L2, Lv.2+→L6）
2. Narrative Snippet：AI 预生��（首选，需 PoC）→ 规则拼接（备选）→ 模板（降级）
3. Token ��限：放宽到 1024
4. 宪法变更：需同步更新 CLAUDE.md + MASTER-PRD

### Party Review

- **首次审查**：BLOCKED（B1 性格维度术语不匹配 + B2 宪法冲突）
- **修复后**：B1 映射到实际五维 + enemy→grudge；B2 添加宪法变更声明 §1.6
- **WARN 处理**：W2 补充矛盾覆盖"同类型"定义；W3 删除未定义的"随机扰动"；W5 待路线图同步
- **报告**：`docs/pipeline/phaseIJ/review-g1-v3.md`

### 需求债务变化

与本次相关的 FB 条目无变化（FB-006/007/008/010 继续适用）��

## 8. GATE 1 (v3.0)

```
[x] GATE 1 PASSED — 2026-04-01（修复 B1/B2 后重审通过）
```

## 9. GATE 2 (v3.0)

### Party Review

- **BLOCK**: 0
- **WARN**: 2（W1 modelSize 获取机制→修正为 /api/health 查询 / W2 边界行为→补充空事件+snippet 缺失说明）
- **参与角色**: R4 项目经理 + R5 偏执架构师 + R6 找茬QA
- **改进建议落实**: PRD 补充 admirer 归纳短语 + 截断保护 + snippet 时序明确化
- **报告**：`docs/pipeline/phaseIJ/review-g2-v3.md`

```
[x] GATE 2 PASSED — 2026-04-01（修复 W1/W2 后签章）
```

## 10. GATE 3 (v3.0)

### SGE 编码实施

- **T1-T14 全部完成**（T15 AI PoC 为 optional，登记为未来任务）
- **新增文件**: 7（relationship-memory.ts, causal-event.ts, personal-goal.ts, t2-npc.ts, relationship-memory-manager.ts, narrative-snippet-builder.ts, verify-phaseIJ-relationship-memory.ts）
- **修改文件**: 9（tick-pipeline, idle-engine, dialogue-coordinator, soul-engine, soul-event.handler, encounter-tick.handler, soul-prompt-builder, soul-evaluator, command-handler）
- **验证**: 回归 64/64 + 专项 38/38 + tsc 零错误

### Party Review

- **BLOCK**: 0
- **WARN**: 2（W1 RelationshipMemoryManager 纯内存不持久化[已知 PoC 设计] / W2 模板分支未完全覆盖[低风险]）
- **参与角色**: R7 偏执架构师 + R8 找茬QA + R9 安全审查
- **报告**：`docs/pipeline/phaseIJ/review-g3-v3.md`

```
[x] GATE 3 PASSED — 2026-04-01
```
