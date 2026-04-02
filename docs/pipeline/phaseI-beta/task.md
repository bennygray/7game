# Phase I-beta: SGE 任务追踪

> Phase I-beta — 社交事件系统 (Social Event System)
> 日期: 2026-04-02

## Gate 状态

- [x] GATE 1 PASSED (SPM) — PRD + User Stories
- [x] GATE 2 PASSED (SGA) — TDD v1.1 + 4 ADRs + Impact Audit
- [x] GATE 3 编码完成 — 待 Party Review

## SGE 编码清单

### L0: 数据层类型变更
- [x] game-state.ts: Orientation 接口, RelationshipEdge 三维化, version 7→8
- [x] soul.ts: 13 SoulEventType, RelationshipStatus, 三维 delta, +trust 标签阈值
- [x] causal-event.ts: affinity-threshold → closeness-threshold, +social-invitation/dissolution
- [x] encounter.ts: +flirt, AffinityBand→ClosenessBand, +crush-lover 概率行
- [x] relationship-memory.ts: affinity→closeness/attraction/trust

### L1-L3: 下游适配 (20+ 文件)
- [x] relationship-formulas.ts: 全6函数 affinity→closeness+trust
- [x] causal-rule-registry.ts: CR-01/02 triggerType 重映射
- [x] encounter-templates.ts: +flirt 模板
- [x] emotion-pool.ts: +13 社交事件情绪候选
- [x] soul-engine.ts: 三维衰减/关系保护/标签更新
- [x] disciple-generator.ts: +generateOrientation, 三维关系初始化
- [x] save-manager.ts: SAVE_VERSION=8, migrateV7toV8
- [x] relationship-memory-manager.ts: 三维同步
- [x] causal-evaluator.ts, goal-manager.ts, action-executor.ts: 字段重映射

### L4: Handler 层
- [x] encounter-tick.handler.ts: crush-lover 检测, flirt 映射
- [x] ai-result-apply.handler.ts: 三维 delta 矫正

### L5: AI + UI 层
- [x] soul-prompt-builder.ts: 三维 JSON schema, 13 社交事件描述
- [x] few-shot-examples.ts: 三维 delta 格式
- [x] soul-evaluator.ts: 三维解析
- [x] narrative-snippet-builder.ts: affinity→closeness
- [x] mud-formatter.ts: 三维关系显示
- [x] command-handler.ts: 字段重映射

### L6: 新建文件
- [x] social-event-templates.ts: 13 事件类型 × 3+ MUD 模板
- [x] social-engine.ts: SocialEngine 类 (邀约/解除/crush/限速/冷却)
- [x] social-tick.handler.ts: pipeline 612:5 社交扫描

### Pipeline 注册
- [x] tick-pipeline.ts: +socialEngine? to TickContext
- [x] idle-engine.ts: SocialEngine 实例 + socialTickHandler 注册

## 验证结果

| 项目 | 结果 |
|------|------|
| tsc --noEmit | 0 errors |
| regression-all.ts | 111 passed / 0 failed |
| verify-social-system.ts | 78 passed / 0 failed |

## 技术债务

| # | 描述 | 优先级 |
|---|------|:------:|
| TD-032 | 社交邀约 AI 调用延迟 2-3 ticks (AsyncAIBuffer 间接异步) | P4 |
| TD-033 | 冷静期数据不持久化，重启后清零 | P4 |
| V-9 | 性格兼容度天花板未实现 | P3 |
