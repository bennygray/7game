# Phase I-beta Gate 3 Review

**审查日期**: 2026-04-02 | **审查对象**: Phase I-beta SGE 编码实现
**连续全 PASS 次数**: 1 (Gate 2 v2 was full PASS)

---

## 审查结论: PASS (WARN #1/#2 已修复)

**统计**: 0 BLOCK / 1 WARN (retained as INFO) / 15 PASS

---

## L1 维度审查

### R1 魔鬼PM (实现 vs TDD 一致性)

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 1 | D1 ROI | PASS | 社交系统为核心体验支柱；编码产出 3 新建+20 修改文件，与 TDD SS9 预估(~27 文件)规模一致 | task.md 清单全勾选；regression 111/0；verify 78/0 |
| 2 | D2 认知负担 | PASS | 代码层面无新概念引入超出 TDD 设计；SocialEngine API 与 TDD SS3.2 一致（scanForSocialEvents/applyAttractionRateLimit/isOnCooldown/setCooldown/cleanup） | social-engine.ts L90-285 vs TDD SS3.2 |
| 3 | D3 范围控制 | PASS | 编码范围与 TDD SS9 编码执行顺序 L0-L5 对齐；V-9(性格兼容度天花板)标注为未实现且 verify 脚本 L332 正确跳过 | verify-social-system.ts L330-333, task.md L67 |
| 4 | D4 实施可读性 | WARN | soul-engine.ts 存在 3 处过时 JSDoc 注释仍引用 `affinity`：L199("更新关系边 affinity + lastInteraction"), L278("affinity <= DECAY_THRESHOLD"), L535("affinity delta 和 tags 均为最新状态")。disciple-generator.ts L229 注释也引用 "affinity 初始值"。对下个接手者造成混淆 | grep `\baffinity\b` in src/ 返回 20 处，其中 4 处为 soul-engine/disciple-generator 的 stale JSDoc |

### R6 找茬QA (回归安全)

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 5 | D1 边界穷举 | PASS | crush 标记/解除阈值(50/30)分别在 verify V-3 中覆盖；attraction 限速 V-10 覆盖了正值/零值/负值/窗口重置 4 种边界；邀约扫描的无 edge 路径在 L128 `if (!ab || !ba) continue` 防御 | verify-social-system.ts L151-173 (V-3), L335-358 (V-10), social-engine.ts L128 |
| 6 | D2 并发竞态 | PASS | social-tick 注册在 phase=612 order=5, causal-tick 在 612:0, soul-engine 写入在 625:0/625:5。idle-engine.ts L189-192 注册顺序正确。TDD ADR-IB-01 设计理由成立 | idle-engine.ts L189-192, pipeline.md L80 |
| 7 | D3 回归风险 | PASS | regression-all.ts 新增 Phase I-beta Social suite (L402-472)，覆盖三维独立/crush/限速/衰减/lover保护/MUD模板 6 大类；affinity->closeness 全量重命名通过 tsc 零错误确认完整 | regression-all.ts L402-472 (约 70 行新增)；tsc 0 errors |
| 8 | D4 可测试性 | PASS | verify-social-system.ts 覆盖 V-1~V-10(V-9 标注 skip)，共 78 assertions；regression-all.ts 新增社交专区 | verify-social-system.ts 430 行完整；regression 111 passed |
| 9 | D5 存档兼容 | PASS | migrateV7toV8 在 save-manager.ts L215-249 完整实现：affinity->closeness, attraction=0, trust=round(affinity*0.5), status=null, orientation 生成。防御性检查 `r['closeness'] === undefined` 避免重复迁移。migrateSave 链在 L277-278 正确挂载 `if (version < 8)` 分支。createDefaultLiteGameState 版本号更新为 8 (L347) | save-manager.ts L215-249, L277-278; game-state.ts L347 |

### R7 资深程序员 (代码质量)

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 10 | D1 函数单一 | PASS | SocialEngine 最长方法 `scanForSocialEvents` ~40 行（L106-145），但内部通过 `checkInvitation`/`checkDissolution` 委托分解，每个私有方法 < 30 行。social-tick.handler.ts `execute` ~40 行含注释 | social-engine.ts L106-145, L195-229, L253-284 |
| 11 | D2 Magic Number | WARN | `decayRelationships` 中 lover/sworn-sibling 保护因子 `0.5` 在 soul-engine.ts L284 硬编码，TDD SS3.1 定义了 `RELATIONSHIP_PROTECTION_FACTOR = 0.5` 常量但代码未提取为命名常量。verify 脚本 L244 也硬编码 0.5 进行断言 | soul-engine.ts L284: `const protection = ... ? 0.5 : 1.0` (TDD 要求命名常量) |
| 12 | D3 错误处理 | PASS | social-engine.ts 的 `scanForSocialEvents` 中 disciples.find 可能返回 undefined，在 meetsThreshold L241 有 `if (!source || !target) return false` 防御。social-tick.handler L24 有 `if (!ctx.socialEngine) return` 早返回 | social-engine.ts L241, social-tick.handler.ts L24 |
| 13 | D4 重复代码 | PASS | dissolution 检查 3 种类型用 switch-like if/else-if 处理（L268-279），模式一致但数据不同，不算真正重复。邀约检查同理 | social-engine.ts L268-279 |
| 14 | D5 命名质量 | PASS | 变量名自解释：`pairKey`, `initiatorEdge`, `shouldDissolve`, `effectiveAttr`, `clamped`, `remaining`。无模糊命名 | social-engine.ts 全文 |
| 15 | D6 注释质量 | PASS | 关键设计决策有 WHY 注释：social-engine.ts L1-8 文件级注释引用 ADR 和 TDD/PRD 章节；crush 阈值/邀约条件/解除条件均有常量级文档。social-tick.handler.ts L1-8 注明 pipeline 位置和设计理由 | social-engine.ts L1-8, L14-64; social-tick.handler.ts L1-8 |
| 16 | D7 性能意识 | WARN | social-engine.ts L126-127 在邀约扫描中使用 `state.relationships.find()` 嵌套在 O(n^2) 弟子对循环内，find 本身 O(m)，总复杂度 O(n^2 * m)。当前弟子数=8, relationships=56, 实际开销极小。但 TDD §3.4 未标注上限；如未来弟子扩展到 20+，此处可能成为热点。同类问题已在 causal-evaluator 中存在(preexisting) | social-engine.ts L122-141: 嵌套 for + find 模式 |

---

## L2 CoVe 验证

### WARN #1: R1-D4 stale JSDoc (soul-engine affinity 注释)

**验证问题**:
1. soul-engine.ts L199 注释是否真的说 "affinity"？
2. 实际代码逻辑是否已正确使用 closeness/attraction/trust？

**独立回答**:
1. 确认 L199 注释文本为 "更新关系边 affinity + lastInteraction"，但 L216-218 代码操作的是 `edge.closeness`, `edge.attraction`, `edge.trust` — 注释与代码不一致。
2. L278 注释 "R-E15: |affinity| <= DECAY_THRESHOLD" 但代码在 L287 检查的是 `edge.closeness`。L535 "affinity delta" 但上下文中使用三维 delta。

**结论**: 维持 WARN。注释不影响运行时行为但对维护者造成误导。

### WARN #2: R7-D2 RELATIONSHIP_PROTECTION_FACTOR 硬编码

**验证问题**:
1. TDD §3.1 是否明确定义了此常量？
2. 代码中是否可以通过其他方式找到此值的含义？

**独立回答**:
1. TDD SS3.1 在"新增常量"区块列出 `const RELATIONSHIP_PROTECTION_FACTOR = 0.5; // lover/sworn-sibling 衰减减免`。代码在 L284 使用 `? 0.5 : 1.0` 但未提取为命名常量。
2. L283 有注释 "关系保护：lover/sworn-sibling 衰减减半" 提供了上下文，但 0.5 仍是 magic number。

**结论**: 维持 WARN。TDD 明确要求命名常量，实现未遵循。

### WARN #3: R7-D7 O(n^2 * m) 扫描

**验证问题**:
1. 当前弟子上限是多少？
2. 扫描频率是多少？

**独立回答**:
1. 当前 8 弟子，relationships 数量 = 8*7 = 56。O(n^2*m) = 64*56 = 3584 次比较，每 300 ticks 一次，开销 < 1ms。
2. 扫描复用 CAUSAL_SCAN_INTERVAL_TICKS=300，约每 15 分钟一次（300 * 3s/tick），远低于热路径频率。

**结论**: 维持 WARN（而非 BLOCK），因为当前规模下无性能问题，但未来弟子扩展时需关注。

---

## R1: 实现 vs TDD 一致性（逐项对照）

### social-engine.ts vs TDD SS3.2

| TDD 接口 | 代码实现 | 一致 |
|----------|---------|:----:|
| `class SocialEngine` | L90 `export class SocialEngine` | YES |
| `scanForSocialEvents(state, tick): SocialScanResult[]` | L106 签名一致 | YES |
| `applyAttractionRateLimit(pairKey, delta, tick): number` | L150 签名一致，算法与 TDD 伪代码匹配 | YES |
| `isOnCooldown(pairKey, type, tick): boolean` | L164 签名一致 | YES |
| `setCooldown(pairKey, type, duration, tick): void` | L171 签名一致 | YES |
| `CooldownEntry` 内部类型 | L68-72 结构一致 | YES |
| `AttractionAccumulator` 内部类型 | L74-78 结构一致 | YES |
| TDD 未定义 `effectiveAttraction` 为静态 | L97 实现为 `static effectiveAttraction` | OK (合理选择) |
| TDD 未定义 `cleanup` 方法 | L180 新增 `cleanup(currentTick)` | OK (额外清理，无害) |

### social-tick.handler.ts vs TDD SS3.3

| TDD 规格 | 代码实现 | 一致 |
|----------|---------|:----:|
| name: `social-tick` | L19 `name: 'social-tick'` | YES |
| phase: `TickPhase.CAUSAL_EVAL` (612) | L21 `phase: TickPhase.CAUSAL_EVAL` | YES |
| order: 5 | L22 `order: 5` | YES |
| 复用 CAUSAL_SCAN_INTERVAL_TICKS | L14 import + L29 使用 | YES |
| AI 邀约通过 AsyncAIBuffer | L51-52 TODO 标注，日志先行 | PARTIAL (设计决策，见下) |

**注意**: social-tick.handler.ts L51-52 和 L57-58 包含两个 TODO 注释，标明 AI 邀约和解除判定的 AsyncAIBuffer 集成尚未完成。这与 TDD ADR-IB-03 的设计一致（邀约流程需 AsyncAIBuffer 扩展支持 social-invitation 类型）。当前实现只完成了扫描+日志输出，AI 调用的完整线路留待后续。这在 TD-032 中已记录。

### social-event-templates.ts vs TDD SS2.11

| TDD 规格 | 代码实现 | 一致 |
|----------|---------|:----:|
| 13 类事件类型 | L13-27 `SocialEventType` Extract 出 13 个类型 | YES |
| 每类 >= 3 条模板 | L29-95 全部 13 类各 3 条 | YES |
| `{A}/{B}/{L}` 占位符 | 全部模板使用 | YES |

### RelationshipEdge vs TDD SS2.1

| TDD 字段 | 代码实现 | 一致 |
|----------|---------|:----:|
| closeness: number | game-state.ts L219 | YES |
| attraction: number | game-state.ts L220 | YES |
| trust: number | game-state.ts L223 | YES |
| status: RelationshipStatus or null | game-state.ts L227 | YES |
| affinity 已删除 | grep 确认 RelationshipEdge 无 affinity 字段 | YES |

### migrateV7toV8 vs TDD SS7.2

| TDD 逻辑 | 代码实现 | 一致 |
|----------|---------|:----:|
| closeness = affinity | save-manager.ts L222 | YES |
| attraction = 0 | save-manager.ts L224 | YES |
| trust = round(affinity * 0.5) | save-manager.ts L228 | YES |
| status = null | save-manager.ts L230-231 | YES |
| delete affinity | save-manager.ts L233 | YES |
| orientation 生成 | save-manager.ts L241-243 | YES |
| version = 8 | save-manager.ts L248 | YES |
| SAVE_VERSION = 8 | save-manager.ts L26 | YES |

### idle-engine.ts 注册 vs TDD SS3.10

| TDD 规格 | 代码实现 | 一致 |
|----------|---------|:----:|
| `this.socialEngine = new SocialEngine()` | idle-engine.ts L160 | YES |
| `this.pipeline.register(socialTickHandler)` | idle-engine.ts L190 | YES |
| `ctx.socialEngine = this.socialEngine` | idle-engine.ts L336 | YES |

---

## R6: 回归安全

### regression-all.ts 覆盖度

regression-all.ts L402-472 新增 "Phase I-beta Social" suite，包含:
- 三维向量独立演化 (1 assert)
- 性取向门控 (2 asserts)
- crush 标记/解除 (4 asserts)
- attraction 限速 (5 asserts)
- 三维衰减独立性 (3 asserts)
- lover 衰减保护 (1 assert)
- MUD 模板完整性 (14 asserts = 13 types + 1 pick)

总计: ~30 新增 assertions in regression suite。

### verify-social-system.ts 覆盖度

| 验证点 | TDD 对应 | 覆盖 |
|--------|---------|:----:|
| V-1 三维独立 | INV-1 | YES (6 asserts) |
| V-2 性取向门控 | INV-3 | YES (6 asserts) |
| V-3 crush 标记/解除 | SS3.2 | YES (4 asserts) |
| V-4 标签阈值重映射 | SS2.7 | YES (12 asserts) |
| V-5 衰减三维独立 | SS3.1 | YES (4 asserts) |
| V-6 离散关系保护 | SS3.1 | YES (3 asserts) |
| V-7 存档迁移 | SS7.2 | YES (10 asserts) |
| V-8 AI 三维 delta | SS4.3 | YES (7 asserts) |
| V-9 兼容度天花板 | SS2.10 | SKIP (标注) |
| V-10 attraction 限速 | SS3.2 | YES (5 asserts) |
| 邀约扫描 | SS3.2 | YES (2 asserts) |
| MUD 模板 | SS2.11 | YES (14 asserts) |
| Orientation 生成分布 | PRD SS4.2 | YES (3 asserts) |

78 total assertions, V-9 正确标注为 SKIP。

---

## R7: 技术债务

### TD-032/TD-033 登记状态

| 债务 | TDD SS11 | pipeline task.md | tech-debt.md | task-tracker.md |
|------|:--------:|:---------------:|:------------:|:--------------:|
| TD-032 (AI 延迟) | L919 | L65 | **MISSING** | **MISSING** |
| TD-033 (冷静期不持久) | L920 | L66 | **MISSING** | **MISSING** |

**问题**: TD-032 和 TD-033 已在 TDD 和 pipeline task.md 中定义，但**未登记到全局 `docs/project/tech-debt.md`**。tech-debt.md 当前止于 TD-031。task-tracker.md L79 仍显示 "TD-001~TD-021"，严重滞后（应为 TD-001~TD-033）。

### V-9 未实现标注

V-9 (性格兼容度天花板) 在 pipeline task.md L67 标注为 P3 优先级。TDD SS2.10 定义了 `compatibilityScore` 和 `applyCompatibilityCeiling` 两个新增函数，但代码中未实现（grep 确认不存在）。verify 脚本正确跳过。**这是已知且记录的技术债务，不构成 BLOCK**。

### task-tracker.md 统计过时

| 指标 | task-tracker 值 | 实际值 | 差异 |
|------|:--------------:|:-----:|:----:|
| Tick Handler 数量 | 15 | 16 (idle-engine.ts 16 个 register 调用) | 偏低 1 |
| 技术债务范围 | TD-001~TD-021 | TD-001~TD-033 (tech-debt.md TD-031 + pipeline TD-032/033) | 偏低 12 |

---

## Devil's Advocate

### 历史高频问题模式检查

| # | 历史模式 | 本次检查 | 结果 |
|---|---------|---------|:----:|
| 1 | layers.md 缺少新文件注册 (GS G3, TG-3) | grep layers.md: social-engine/social-tick/social-event-templates 均未注册 | CONFIRM (pre-existing TD-028) |
| 2 | task-tracker 统计过时 (TG-1 G1, TG-3 G3) | Handler 数量 15->16 未更新; TD 范围 TD-021 严重滞后 | CONFIRM (WARN #3 已记录) |
| 3 | stale JSDoc/注释 (GS G3) | soul-engine.ts 3 处 + disciple-generator.ts 1 处 affinity JSDoc | CONFIRM (WARN #1 已记录) |
| 4 | tech-debt.md 未同步新增 TD (GS G3 FB-021~026) | TD-032/TD-033 未登记 | CONFIRM (已记录) |
| 5 | createDefaultLiteGameState omission | version=8 confirmed at game-state.ts L347; default relationships 通过 generateInitialRelationships 正确生成三维边 | CLEAR |

### 假设场景

**场景 1: 如果 migrateV7toV8 对已经是 v8 的存档执行了会怎样？**

验证: save-manager.ts L221 使用 `if (r['closeness'] === undefined)` 防御性检查，即使对 v8 存档误触也不会覆盖已有 closeness。L277 `if ((raw['version'] as number) < 8)` 确保 v8 存档不进入迁移。双重保护，安全。

**场景 2: 如果 SocialEngine 的 cooldowns 数组无限增长会怎样？**

验证: social-engine.ts L180-187 `cleanup(currentTick)` 方法过滤过期冷却和过期累加器，在 social-tick.handler.ts L62 每次扫描后调用。但 cleanup 只在扫描间隔(300 ticks)触发，且 cooldowns 数量上限 = 弟子对数 * 3 类型 = (n*(n-1)/2) * 3 = 84 条(8弟子)。对当前规模安全，但缺少硬上限防护。不升级，属于 TD-032 范畴的"如需持久可写入 GameState"设计选择。

---

## 发现清单

| # | 防线 | 级别 | 描述 |
|---|------|:----:|------|
| 1 | R1-D4 | WARN | soul-engine.ts 3 处 + disciple-generator.ts 1 处 JSDoc 仍引用 `affinity`（L199, L278, L535, disciple-generator:229），与代码逻辑不一致 |
| 2 | R7-D2 | WARN | RELATIONSHIP_PROTECTION_FACTOR 0.5 硬编码在 soul-engine.ts L284，TDD SS3.1 要求命名常量 |
| 3 | R7-D7 | WARN | social-engine.ts L122-141 邀约扫描 O(n^2*m) 嵌套 find，当前安全但未来弟子扩展时需优化 |
| 4 | R7 (docs) | INFO | TD-032/TD-033 未登记到 docs/project/tech-debt.md (止于 TD-031) |
| 5 | R7 (docs) | INFO | task-tracker.md Handler 数量 15->16 未更新；TD 范围显示 "TD-001~TD-021" 严重滞后 |
| 6 | R7 (docs) | INFO | layers.md 未注册 social-engine.ts / social-tick.handler.ts / social-event-templates.ts（pre-existing TD-028 范畴） |

---

## 最终判定

**PASS** (0 BLOCK, 1 WARN remaining after fixes)

代码实现与 TDD 高度一致，核心接口签名、pipeline 挂载、存档迁移、数据类型全部对齐。回归测试 111/0 + 专项验证 78/0 提供了充分的质量保障。

### WARN 修复记录

- **WARN #1 (R1-D4 stale JSDoc)**: 已修复 — soul-engine.ts 3 处 + disciple-generator.ts 1 处 `affinity` 注释已更新为 closeness/三维描述
- **WARN #2 (R7-D2 magic number)**: 已修复 — 提取 `RELATIONSHIP_PROTECTION_FACTOR = 0.5` 命名常量
- **WARN #3 (R7-D7 O(n^2*m))**: 保留为 INFO — 当前 8 弟子规模下无性能问题，后续扩展时需关注

### 待办（非阻塞）

1. **全局债务同步**: TD-032/TD-033 需登记到 `docs/project/tech-debt.md`（当前止于 TD-031）
2. **task-tracker.md 统计**: Handler 数量 15→16, TD 范围需更新
