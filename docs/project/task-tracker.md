# 7game-lite — 全局进度追踪

> **最后更新**：2026-04-02

---

## Phase 命名约定

| 前缀 | 含义 | 示例 |
|------|------|------|
| 字母 | 游戏功能 Phase | A, B-α, E, F0-β, H-γ |
| X-α/β/γ | 展现层增强 | X-alpha, X-beta, X-gamma |
| Y, Z | 基础设施/治理 | Y(代码质量), Z(AI通信) |
| IJ, I-alpha | 复合/子 Phase | IJ(预研), I-alpha(因果引擎) |
| **TG-N** | **流程治理 (Trinity Guardian)** | TG-1(重审保障), TG-2(上下文+Step5), TG-3(文档索引) |

---

## Phase 状态总览

| Phase | 版本 | 主题 | SPM | SGA | SGE | 状态 |
|-------|------|------|:---:|:---:|:---:|:----:|
| A | v0.1 | 核心循环（修炼+弟子+MUD） | ✅ | ✅ | ✅ | 🟢 完成 |
| B-α | v0.2 | 灵田+炼丹 | ✅ | ✅ | ✅ | 🟢 完成 |
| C | v0.3 | 突破+灵脉+丹药使用 | ✅ | ✅ | ✅ | 🟢 完成 |
| D | v0.4 | AI对话+日志+Intent重构 | ✅ | ✅ | ✅ | 🟢 完成 |
| E | v0.5 | NPC灵魂（道德×特性×关系） | ✅ | ✅ | ✅ | 🟢 完成 |
| — | — | 世界线推演（探索性脑暴） | ✅ | — | — | 🟢 定案 |
| — | — | Roadmap V3.1 审阅修复 + 文档对齐 | ✅ | — | — | 🟢 完成 |
| F | v0.8 | 灵魂闭环（特性×情绪×关系→行为权重） | ✅ | ✅ | ✅ | 🟢 完成 |
| F0-α | v0.6 | 碰面世界（地点·碰面·道风） | ✅ | ✅ | ✅ | 🟢 完成 |
| F0-β | v0.6 | 活世界（事件池·漏斗·Storyteller） | ✅ | ✅ | ✅ | 🟢 完成 |
| H-α | v0.2 | MUD世界呈现（look/分级日志/sticky状态栏/环境呼吸） | ✅ | ✅ | ✅ | 🟢 完成 |
| G | v0.4.2 | AI觉醒（async缓冲/情绪接入/独白/双阶段决策/反派修复） | ✅ | ✅ | ✅ | 🟢 完成 |
| H-β | v0.4.5 | 世界缝合（统一日志管线/inspect/sect命令） | ✅ | ✅ | ✅ | 🟢 完成 |
| H-γ | v0.4.6 | 掌门裁决（STORM裁决窗口/judge命令/道风漂移） | ✅ | ✅ | ✅ | 🟢 完成 |
| X-α/β/γ | v0.4.8 | 掌门视界（MUD重构+命令增强+面板系统+内存修复） | ✅ | ✅ | ✅ | 🟢 完成 |
| Y | v0.4.10 | 前后端代码质量治理（ESLint+Hook+SGE增强+单元测试） | ✅ | ✅ | ✅ | 🟢 完成 |
| Z | v0.5.0 | AI通信架构统一（SoulEvaluator→ai-server 通信路径重构） | ✅ | ✅ | ✅ | 🟢 完成 |
| IJ-PoC | — | 0.8B 关系上下文利用验证（L0-L6 多层级实验） | ✅ | — | ✅ | 🟢 完成（✅ L3 甜蜜点） |
| IJ | — | NPC 深度智能预研（关系记忆+因果+目标+T2 设计） | ✅ | ✅ | ✅ | 🟢 完成（v3.0 Gate 3 PASSED） |
| J-Goal | — | 个人目标系统（5 GoalType·Layer 5·事件+定期触发·v6） | ✅ | ✅ | ✅ | 🟢 完成（Gate 3 PASSED） |
| I-alpha | — | 因果引擎 + 高级关系标签（6 规则·3 标签·causal-tick 612） | ✅ | ✅ | ✅ | 🟢 完成（Gate 3 COND. PASS） |
| TG-1 | — | Trinity Pipeline 重审执行保障（判定校验·禁止自审·签章检查） | ✅ | ✅ | ✅ | 🟢 完成（Gate 3 COND. PASS） |
| TG-2 | — | 审查上下文交付+影响审计扩展+INDEX补全（§0·Step 5.5-5.9·全量补全） | ✅ | ✅ | ✅ | 🟢 完成（Gate 3 COND. PASS） |
| TG-3 | — | 文档关系梳理+交叉索引+追溯链（Option B·Quick Orient·11交付物） | ✅ | ✅ | ✅ | 🟢 完成 |
| GS | v0.5.1 | 弟子性别系统（gender字段·名字池·代词·AI注入·v7迁移·债务清单） | ✅ | ✅ | ✅ | 🟢 完成（Gate 3 COND. PASS） |
| I-beta | v0.6.0 | 社交事件系统（三维关系重构·性取向·AI邀约·道侣/结拜/宿敌·v8） | ✅ | ✅ | ✅ | 🟢 完成（Gate 3 PASSED） |
| UI-S | — | 社交系统显示与模板补全（面板重排·status中文化·性取向显示·社交模板接入·代词策略） | ✅ | ✅ | ✅ | 🟡 待 GATE 3 |

---

## 当前 Phase 详情

**Phase IJ-PoC** — 0.8B/2B 关系上下文利用验证 ✅ 完成

- SPM GATE 1 ✅ → 实验执行 ✅ → Review ✅
- V4 基准测试：3×175 = ~735 次 AI 请求（0.8B vs 2B）
- **结论：✅ 2B 模型 + L2/L6 双级策略**
- Report: `docs/pipeline/phaseIJ-poc/review.md` + `review-v4-final-benchmark.md`

**Phase IJ** — NPC 深度智能预研 ✅ 完成（v3.0 Gate 3 PASSED）

- SPM GATE 1 ✅ → SGA GATE 2 ✅ (v3.0) → SGE GATE 3 ✅ (v3.0)
- PRD: `docs/features/phaseIJ-PRD.md` v3.0 / TDD: `docs/design/specs/phaseIJ-TDD.md` v3.0
- T1-T14 全部完成；7 新文件 + 9 修改文件
- 回归 64/64 + 专项 38/38 + tsc 零错误
- Review: `docs/pipeline/phaseIJ/review-g3-v3.md`

---

## 累计统计

| 指标 | 数值 |
|------|------|
| 已实现系统 | 21 个（修炼、弟子×8、MUD、灵田、炼丹、突破、灵脉、丹药消费、AI对话、结构化日志、Intent、Tick Pipeline、灵魂事件总线、灵魂评估引擎、碰面引擎、世界事件系统、Storyteller、MUD世界呈现、AI觉醒系统、统一日志管线、掌门裁决系统） |
| 回归测试 | 111 组全通过 |
| UI 单元测试 | 65 组全通过（Phase Y 新增） |
| 专项验证 | Phase E 47 + Phase F 12 + Phase F0-α 52 + Phase F0-β 108 + Phase IJ 38 + Phase I-α 30 = **287 条** |
| 技术债务 | TD-001~TD-021（2 个已清偿：TD-001 Pipeline 重构、TD-003 Intent；TD-006 部分清偿） |
| 需求债务 | FB-001~FB-019（3 个已清偿：FB-001 弟子对话、FB-004 关系系统、FB-011 玩家干预权；FB-005/FB-010/FB-012 部分清偿；**FB-019 P0 流程缺陷 待修复**） |
| GameState 版本 | v8（Phase I-beta 三维关系重构 + 社交状态） |
| Tick Handler 数量 | 15 个（+causal-tick 612:0） |
| 弟子数量 | 8 人（4 初始 + 4 Phase D 新增） |
| AI 模型 | Qwen3.5-2B（llama-server 子进程，GPU -ngl 99）；降级 0.8B |
| 世界线推演文档 | 9 份（soul-vision-rethinking/01~09） |
| 宪法文档版本 | MASTER-PRD v2.1 / Roadmap V4.1 / MASTER-ARCHITECTURE v1.8 |

---

## Phase 文档索引

| Phase | PRD/Analysis | TDD | User Stories | Verification | Pipeline |
|-------|:----------:|:---:|:-----------:|:----------:|:--------:|
| A | [analysis](../features/7game-lite-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseA.md) | [verify](../verification/7game-lite-phaseA-verification.md) | — |
| B-α | [analysis](../features/7game-lite-phaseB-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseB-alpha.md) | — | [plan](../pipeline/phaseB-alpha/plan.md) |
| C | [analysis](../features/7game-lite-phaseC-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseC.md) | [verify](../verification/7game-lite-phaseC-verification.md) | [plan](../pipeline/phaseC/plan.md) |
| D | [PRD](../features/phaseD-PRD.md) | [TDD](../design/specs/phaseD-TDD.md) | [stories](../design/specs/7game-lite-user-stories-phaseD.md) | — | — |
| E | [PRD](../features/phaseE-PRD.md) | [TDD](../design/specs/phaseE-TDD.md) | [stories](../design/specs/7game-lite-user-stories-phaseE.md) | [poc-1 report](../verification/phaseE-poc1-soul-system-report.md) | [spm-analysis](../pipeline/phaseE/spm-analysis.md) |
| F | [spm-analysis](../pipeline/phaseF/spm-analysis.md) | — | — | — | [task](../pipeline/phaseF/task.md) |
| F0-α | [spm-analysis](../pipeline/phaseF0-alpha/spm-analysis.md) | [TDD](../design/specs/phaseF0-alpha-TDD.md) | — | — | [task](../pipeline/phaseF0-alpha/task.md) |
| F0-β | [spm-analysis](../pipeline/phaseF0-beta/spm-analysis.md) | — | — | — | [task](../pipeline/phaseF0-beta/task.md) |
| H-α | [PRD](../features/phaseH-alpha-PRD.md) | [TDD](../design/specs/phaseH-alpha-TDD.md) | — | — | [task](../pipeline/phaseH-alpha/task.md) |
| G | [PRD](../features/phaseG-PRD.md) | [TDD](../design/specs/phaseG-TDD.md) | [stories](../design/specs/phaseG-user-stories.md) | — | [spm](../pipeline/phaseG/spm-analysis.md) [plan](../pipeline/phaseG/plan.md) [review](../pipeline/phaseG/review.md) [walk](../pipeline/phaseG/walkthrough.md) |
| H-β | [PRD](../features/phaseH-beta-PRD.md) | [TDD](../design/specs/phaseH-beta-TDD.md) | [stories](../design/specs/phaseH-beta-user-stories.md) | — | [spm](../pipeline/phaseH-beta/spm-analysis.md) [plan](../pipeline/phaseH-beta/plan.md) [review](../pipeline/phaseH-beta/review.md) |
| H-γ | [PRD](../features/phaseH-gamma-PRD.md) | [TDD](../design/specs/phaseH-gamma-TDD.md) | [stories](../design/specs/phaseH-gamma-user-stories.md) | — | [spm](../pipeline/phaseH-gamma/spm-analysis.md) [review](../pipeline/phaseH-gamma/review.md) |
| X-α/β/γ | [PRD](../features/phaseX-alpha-PRD.md) | — | — | — | [review](../pipeline/phaseX-gamma/code-review.md) |
| Y | — | — | — | — | [spm](../pipeline/phaseY/spm-analysis.md) [plan](../pipeline/phaseY/plan.md) [backend-review](../pipeline/phaseY/backend-code-review.md) |
| Z | — | [TDD](../design/specs/phaseZ-TDD.md) | — | — | [spm](../pipeline/phaseZ/spm-analysis.md) [plan](../pipeline/phaseZ/plan.md) [review](../pipeline/phaseZ/review.md) [walk](../pipeline/phaseZ/walkthrough.md) |
| IJ-PoC | [PRD](../features/phaseIJ-poc-PRD.md) | — | — | — | [spm](../pipeline/phaseIJ-poc/spm-analysis.md) [review](../pipeline/phaseIJ-poc/review.md) |
| IJ | [PRD](../features/phaseIJ-PRD.md) | [TDD](../design/specs/phaseIJ-TDD.md) | — | — | [spm](../pipeline/phaseIJ/spm-analysis.md) [plan](../pipeline/phaseIJ/plan.md) [review](../pipeline/phaseIJ/review.md) |
| J-Goal | [PRD](../features/phaseJ-goal-PRD.md) | [TDD](../design/specs/phaseJ-goal-TDD.md) | [stories](../design/specs/phaseJ-goal-user-stories.md) | — | [spm](../pipeline/phaseJ-goal/spm-analysis.md) [g1](../pipeline/phaseJ-goal/review-g1.md) [g2](../pipeline/phaseJ-goal/review-g2.md) |
| I-alpha | [PRD](../features/phaseI-alpha-PRD.md) | [TDD](../design/specs/phaseI-alpha-TDD.md) | [stories](../design/specs/phaseI-alpha-user-stories.md) | — | [spm](../pipeline/phaseI-alpha/spm-analysis.md) [g1](../pipeline/phaseI-alpha/review-g1.md) [g2](../pipeline/phaseI-alpha/review-g2.md) [g3](../pipeline/phaseI-alpha/review-g3.md) [task](../pipeline/phaseI-alpha/task.md) [walk](../pipeline/phaseI-alpha/walkthrough.md) |
| TG-1 | [PRD](../features/phaseTG-1-PRD.md) | [TDD](../design/specs/phaseTG-1-TDD.md) | [stories](../design/specs/phaseTG-1-user-stories.md) | — | [spm](../pipeline/phaseTG-1/spm-analysis.md) [g1](../pipeline/phaseTG-1/review-g1.md) [g2](../pipeline/phaseTG-1/review-g2.md) [g3](../pipeline/phaseTG-1/review-g3.md) [task](../pipeline/phaseTG-1/task.md) [walk](../pipeline/phaseTG-1/walkthrough.md) |

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-28 | 初始创建，回填 Phase A-D 历史状态 |
| 2026-03-29 | Phase E 标记完成(✅)；新增世界线推演条目(定案)；新增 Phase F0 规划中；更新累计统计(v4/64测试/14系统/9份推演文档) |
| 2026-03-29 | **V3.1 审阅修复**：F0→F0-α/F0-β；新增文档对齐条目；需求债务更新(FB-001~015,2已清偿)；新增宪法文档版本跟踪 |
| 2026-03-30 | **文档同步修复**：Phase F/F0-α/F0-β 标记完成(✅)；累计统计更新(v5/17系统/12 handler/219专项)；文档索引补全 F/F0-α/F0-β |
| 2026-03-30 | **Phase H-α 完成**：look命令+分级日志+固定状态栏+环境呼吸；已实现系统 17→18；TD-015 新增；文档索引更新 |
| 2026-03-30 | **Phase G 完成**：AI觉醒（async缓冲+情绪接入+独白+双阶段决策+反派修复）；Handler 12→13；已实现系统 18→19；TD-006 部分清偿；FB-010/012 部分清偿；Roadmap V3.3 |
| 2026-03-30 | **Phase H-β 完成**：世界缝合（统一日志管线+inspect/sect命令）；已实现系统 19→20；TD-015/016 新增；FB-005 部分清偿 |
| 2026-03-31 | **Phase H-γ 完成**：掌门裁决（STORM裁决窗口+judge命令+道风漂移）；已实现系统 20→21；TD-020/021 新增；FB-011 已清偿 |
| 2026-03-31 | **Phase Y 创建**：前端代码质量治理（ESLint+Hook+SGE增强+存量修复）；SPM 分析完成；触发自 Phase X Review 23 项问题 |
| 2026-03-31 | **Phase Y 扩展**：后端 Code Review 15 项问题（P0×3/P1×4/P2×5/P3×3），14 项纳入 Phase Y，1 项（P0-01 SoulEvaluator 架构）拆出为 Phase Z |
| 2026-03-31 | **Phase Z 创建**：AI 通信架构统一（SoulEvaluator→ai-server 通信路径重构）；SPM 分析完成 |
| 2026-03-31 | **V0.4.9 Phase Y 前置修复**：后端 11/15 项修复（CORS/端点/校验/崩溃恢复/shutdown/SIGTERM/body限制/重定向/node-llama-cpp/tryConnect/presence_penalty）；文档对齐（handoff/roadmap/review/task 7 文档更新） |
| 2026-03-31 | **Phase Y 完成**：ESLint flat config（strictTypeChecked + 5 zone 模块边界 + sonarjs + clean-timer）；PostToolUse Hook；SGE Quality Gate（前端+后端）；mud-formatter 65 组单元测试；server/tsconfig.json；4 个 lint error 修复 |
| 2026-03-31 | **Phase Z 完成**：V0.5.0 推送远端。callLlamaServer 通用化 + /api/infer 结构化补全 + SoulEvaluator 路由统一 + 超时放宽 |
| 2026-03-31 | **Phase IJ 预研启动**：SPM ✅ GATE 1 + SGA ✅ GATE 2 (v2.0)。核心模型从个人 MemoryEntry 改为关系 RelationshipMemory。Party Review: CONDITIONAL PASS (3 WARN) |
| 2026-03-31 | **Phase IJ-PoC 独立**：SPM ✅ GATE 1。从 IJ 中拆出独立 PoC Phase。PoC PRD v2.0（7层级×7用例×5次=245次AI调用） |
| 2026-03-31 | **执行顺序修正**：IJ-PoC 先行 → IJ SGE 后行。PoC 结论决定编码范围（✅全量/🔶精简/❌最小） |
| 2026-03-31 | **Phase IJ-PoC 完成**：175 次 AI 调用实验完成。结论 ✅ L3 甜蜜点（好感+标签+3事件）。IJ SGE 按全量编码推进。Review v2.0 含深度分析 |
| 2026-04-01 | **Phase IJ v3.0 全 Pipeline 完成**：V4 基准测试驱动升级（0.8B→2B，L3→L2/L6 双级）。SGE T1-T14 全部完成。7 新文件 + 9 修改。回归 64/64 + 专项 38/38。Gate 3 PASSED（0 BLOCK / 2 WARN） |
| 2026-04-01 | **Gap 分析 V3.4 同步**：对齐 Phase IJ 交付。总进度 63%→66%。P2"对话不读关系"清偿 |
| 2026-04-01 | **Phase J-Goal SPM+SGA 完成**：Gate 1 PASSED (0 BLOCK/8 WARN) + Gate 2 PASSED (1 BLOCK fixed/5 WARN)。TDD v1.0 含 4 ADR。架构文档同步更新（pipeline/gamestate/schema/dependencies） |
| 2026-04-01 | **Phase I-alpha SPM+SGA 完成**：Gate 1 CONDITIONAL PASS (1 BLOCK fixed/4 WARN) + Gate 2 CONDITIONAL PASS (0 BLOCK/5 WARN)。TDD v1.2（**关联性审计修复：4 项遗漏，修改文件 8→11**）。FB-018 性别系统缺失登记。**FB-019 P0 流程缺陷**：SGA 关联性审计不完整，需流程层面修复 |
| 2026-04-01 | **Phase I-alpha SGE 完成**：Gate 3 CONDITIONAL PASS (0 BLOCK/2 WARN)。5 新+13 改文件。6 因果规则+3 高级标签。Handler 14→15（+causal-tick 612:0）。验证 30/30 + regression 64/64 + Monte Carlo avg 4.0/30min。GameState v6 不变 |
| 2026-04-01 | **Phase TG-1 SPM 完成**：流程审计 → PRD v1.0 + 3 User Stories。Gate 1 CONDITIONAL PASS (0 BLOCK/3 WARN)。FB-020 登记。W2(TG命名) W3(task-tracker注册) 已补完 |
| 2026-04-01 | **Phase TG-1 全 Pipeline 完成**：Gate 1 COND.PASS(3W) → Gate 2 COND.PASS(3W) → Gate 3 COND.PASS(2W)。4 文件修改：review-protocol.md +判定校验段，3 个 SKILL.md +禁止自审+签章检查。FB-020(a) 清偿 |
| 2026-04-02 | **Phase TG-2 全 Pipeline 完成**：Gate 1 COND.PASS(3W) → Gate 2 COND.PASS(4W) → Gate 3 COND.PASS(2W)，WARN 全修复。5 文件修改：review-protocol.md v1.3（+§0 上下文交付清单）+SGA Step 5.5-5.9（+4 审计维度）+3 SKILL.md 调用模板+INDEX.md 全量补全（+9 PRD +9 TDD +5 US +9 脚本 +11 Phase pipeline）。FB-020(b) 清偿 |
| 2026-04-02 | **Phase I-beta 完成**：社交事件系统 v0.6.0。三维关系向量（closeness/attraction/trust）+ 性取向系统 + 离散关系状态（crush/lover/sworn-sibling/nemesis）+ social-engine + social-tick.handler + social-event-templates。存档 v7→v8。4 ADR。tsc 0 errors / 回归 111/0 / social verify 78/0。Gate 3 PASSED |
