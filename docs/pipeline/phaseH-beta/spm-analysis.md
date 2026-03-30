# Phase H-β SPM 分析过程

> **日期**：2026-03-30 | **角色**：/SPM

---

## 需求来源

用户在完成 Phase G（AI觉醒）后，询问"离完整世界联动还有多远"。
分析发现后端系统（灵魂/碰面/事件/AI）运转正常，但因**日志管线断裂**导致玩家完全看不到。

## 关键发现：双管线断裂

项目存在两条日志管线：
1. **管线 A**（Phase A~D）：专用回调 → MUD 显示 ✅
2. **管线 B**（Phase H-α/F0/G）：ctx.logger → IndexedDB ❌ 不通 MUD

受影响 handler：
- `world-event-tick`（12 种世界事件）
- `encounter-tick`（碰面事件）
- `ai-result-apply`（AI 独白/决策）
- `soul-event`（灵魂评估）

## 5-Why 根因

需要缝合层 → 后端运转但玩家看不到 → handler 日志只到 IndexedDB → Phase F0/G 使用新管线 B → 管线 B 未接 MUD 显示 → **各 Phase 聚焦系统正确性，表现层留到 Phase H**

## 方案选择

| 方案 | 描述 | 优劣 |
|------|------|------|
| **A 统一管线** ✅ | tick 后 flush logger → 新回调 → main.ts 路由 | 一劳永逸，后续 handler 自动受益 |
| B 专用回调 | 为 encounter/AI 各加回调 | 与现有模式一致但回调数继续增长 |

选择方案 A，用户确认。

## PoC 结论

四项缝合均技术可行：
- S1/S2：后端已有文案+日志，补管线后零额外代码
- S3：新命令，数据已有，唯一缺口 emotionMap 需暴露 getter
- S4：新命令，数据和标签函数全部已有

## 需求债务关联

- FB-005（关系面板 UI）：inspect 命令部分清偿
- FB-012（对话实体缺失）：AI 独白可见后部分清偿

## Review 结果

- R1 魔鬼PM：PASS（0 BLOCK）
- R3 数值策划：PASS（0 BLOCK）
- R5 偏执架构师：PASS（1 WARN：flush 持久化时序）
