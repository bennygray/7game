# 完整运行演示：从需求到交付

> 场景：你要实现 "Phase Z: 统一 SoulEvaluator 通信路径"
> 假设：M3 已完成，FIX-01~04 已完成

---

## 形态一：M3 现实版（推荐，SPM 手动 + SGA/SGE 自动）

### 第 1 步：你手动完成 SPM（交互模式，~30 分钟）

这一步和你现在的日常开发完全一样：

```
你在 Claude Code / Antigravity 中：
> /SPM Phase Z: 统一 SoulEvaluator 通信路径

Claude 交互式地和你讨论：
  - 5-Why 分析
  - 向你抛出 2-3 个决策选择题（你回答）
  - 确认数值边界
  - 生成 PRD → docs/features/phaseZ-PRD.md
  - 生成 User Stories → docs/design/specs/phaseZ-user-stories.md

你确认 GATE 1，签章完成。
```

**这一步为什么不自动化**：SPM SKILL.md 设计上就需要人类参与决策，自动化收益低、风险高。

---

### 第 2 步：你启动 Python 编排器（一条命令）

```powershell
PS D:\7game> python scripts/multi-agent/orchestrator.py `
  --start-from sga `
  --prd docs/features/phaseZ-PRD.md `
  --complexity medium
```

然后你就可以**去喝杯咖啡**了。编排器会自动进行 SGA 和 SGE 的辩论循环。

---

### 第 3 步：编排器自动执行 SGA 阶段（你看到的终端输出）

```
╔══════════════════════════════════════════════════╗
║  Trinity Pipeline Orchestrator v1.0              ║
║  Phase: Z | Task: 统一 SoulEvaluator 通信路径      ║
║  Complexity: medium (max 3 rounds per stage)     ║
╚══════════════════════════════════════════════════╝

[SGA] Stage 1/2: Architecture Design
─────────────────────────────────────

[SGA] Building context...
  ✓ Read PRD: docs/features/phaseZ-PRD.md (2,847 chars)
  ✓ Read MASTER-ARCH summary: docs/design/MASTER-ARCHITECTURE.md (1,200 chars, compressed)
  ✓ Read gamestate: docs/design/arch/gamestate.md (3,105 chars)
  ✓ Read pipeline: docs/design/arch/pipeline.md (2,890 chars)
  ✓ Read dependencies: docs/design/arch/dependencies.md (1,450 chars)
  📊 Total context: 11,492 chars (~3,800 tokens) ← within budget

[SGA] Round 1/3
  🔵 Generator (Claude Opus)...
     Prompt: 15,230 chars → stdin pipe → claude -p
     ⏱ Waiting... (45s)
     ✓ Output: 4,521 chars → .reviews/phaseZ-sga-r1-generator.md

  🔴 Evaluator (Codex o3)...
     Prompt: 8,340 chars → stdin pipe → codex exec
     ⏱ Waiting... (30s)
     ✓ Output: 1,205 chars → .reviews/phaseZ-sga-r1-evaluator.md
     📊 Score: 0.65 | Verdict: NEEDS_IMPROVEMENT
     📝 Feedback: "缺少 GameState 变更的迁移策略；
                   Pipeline Phase 605 的挂载点未与 Phase 401 对齐"

[SGA] Round 2/3
  🔵 Generator (Claude Opus)...
     Prompt: 16,100 chars (含 Round 1 反馈 compaction: 380 chars)
     ⏱ Waiting... (50s)
     ✓ Output: 5,102 chars → .reviews/phaseZ-sga-r2-generator.md

  🔴 Evaluator (Codex o3)...
     ⏱ Waiting... (28s)
     ✓ Output: 890 chars → .reviews/phaseZ-sga-r2-evaluator.md
     📊 Score: 0.88 | Verdict: PASS ✅

[SGA] ✅ Architecture design complete after 2 rounds

╔══════════════════════════════════════════════════╗
║  🔶 GATE 2 CHECKPOINT — Human Review Required   ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  TDD output: .reviews/phaseZ-sga-r2-generator.md ║
║  Eval score: 0.88 (PASS)                         ║
║  Rounds used: 2/3                                ║
║                                                  ║
║  Key decisions in TDD:                           ║
║  • GameState.soulEvaluator → GameState.soul      ║
║  • Pipeline Phase 605 挂载到 Phase 401 之后         ║
║  • 新增 ISoulChannel interface                    ║
║                                                  ║
║  [Enter] Accept & continue to SGE                ║
║  [e]     Edit TDD before continuing              ║
║  [r]     Re-run SGA stage                        ║
║  [q]     Quit                                    ║
╚══════════════════════════════════════════════════╝
>
```

**你的选择**：
- 按 **Enter** → 继续 SGE （最常见）
- 按 **e** → 用编辑器打开 TDD 手动修改，改完后继续
- 按 **r** → 从头重跑 SGA（如果方向完全不对）
- 按 **q** → 中止

---

### 第 4 步：你按 Enter，编排器自动执行 SGE 阶段

```
[SGE] Stage 2/2: Code Implementation
─────────────────────────────────────

[SGE] Building context...
  ✓ Read TDD: .reviews/phaseZ-sga-r2-generator.md (5,102 chars)
  ✓ Read User Stories: docs/design/specs/phaseZ-user-stories.md (2,340 chars)
  ✓ Read tech-debt (active items only): 3 items (890 chars)
  ✓ Read target source: src/engine/soul-evaluator.ts (4,200 chars)
  📊 Total context: 12,532 chars (~4,100 tokens) ← within budget

[SGE] Round 1/3
  🔵 Generator (Claude Sonnet)...
     ⏱ Waiting... (60s)
     ✓ Output: 8,450 chars → .reviews/phaseZ-sge-r1-generator.md
     📦 Contains: 3 file changes (soul-evaluator.ts, soul-channel.ts, tick-handler.ts)

  🔴 Evaluator (Codex o3)...
     ⏱ Waiting... (35s)
     ✓ Output: 1,340 chars → .reviews/phaseZ-sge-r1-evaluator.md
     📊 Score: 0.72 | Verdict: NEEDS_IMPROVEMENT
     📝 Feedback: "soul-channel.ts 中 EventBus 订阅缺少 unsubscribe；
                   tick-handler.ts 的 Phase 编号错误 (605→604)"

[SGE] Round 2/3
  🔵 Generator (Claude Sonnet)...
     ⏱ Waiting... (55s)
     ✓ Output: 8,920 chars → .reviews/phaseZ-sge-r2-generator.md

  🔴 Evaluator (Codex o3)...
     ⏱ Waiting... (32s)
     📊 Score: 0.91 | Verdict: PASS ✅

[SGE] ✅ Code implementation complete after 2 rounds

[SGE] Applying code changes...
  ✓ Written: src/engine/soul-evaluator.ts (modified, 12 lines changed)
  ✓ Written: src/engine/soul-channel.ts (new file, 45 lines)
  ✓ Written: src/engine/tick-handler.ts (modified, 8 lines changed)

╔══════════════════════════════════════════════════╗
║  🔶 GATE 3 CHECKPOINT — Human Review Required   ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  Files changed: 3 (2 modified, 1 new)            ║
║  Eval score: 0.91 (PASS)                         ║
║  Rounds used: 2/3                                ║
║                                                  ║
║  [Enter] Accept & finalize                       ║
║  [e]     Review code changes before accepting    ║
║  [r]     Re-run SGE stage                        ║
║  [q]     Quit (code changes remain on disk)      ║
╚══════════════════════════════════════════════════╝
>
```

---

### 第 5 步：你按 Enter，编排器生成最终报告

```
[DONE] ✅ Pipeline complete!

📋 Summary:
  Phase: Z
  Task: 统一 SoulEvaluator 通信路径
  Total rounds: 4 (SGA: 2, SGE: 2)
  Total time: ~8 minutes
  Total CLI calls: 8 (4 Generator + 4 Evaluator)

📁 Artifacts generated:
  .reviews/phaseZ-sga-r1-generator.md
  .reviews/phaseZ-sga-r1-evaluator.md
  .reviews/phaseZ-sga-r2-generator.md
  .reviews/phaseZ-sga-r2-evaluator.md   ← GATE 2 PASS
  .reviews/phaseZ-sge-r1-generator.md
  .reviews/phaseZ-sge-r1-evaluator.md
  .reviews/phaseZ-sge-r2-generator.md
  .reviews/phaseZ-sge-r2-evaluator.md   ← GATE 3 PASS

📝 Gate report saved to: .reviews/gates/phaseZ-gate-report.md

⚠️  Next steps (manual):
  1. Run regression tests: node scripts/run-tests.js
  2. Review code changes in your editor
  3. If satisfied, commit with: git add -A && git commit -m "Phase Z: 统一 SoulEvaluator"
```

---

### 幕后：Python 编排器在每一步到底做了什么

```
Step 1: 读取配置
  ├── 解析命令行参数 (--start-from sga, --prd, --complexity)
  ├── 读取 roles.json (Medium → max_rounds=3)
  └── 读取 project.yaml (获取文件路径)

Step 2: SGA Round 1
  ├── build_context("sga"):
  │   ├── 读取 PRD 文件 → 全文
  │   ├── 读取 MASTER-ARCHITECTURE → 只取前 1200 字符（摘要压缩）
  │   ├── 读取 gamestate.md → 全文
  │   ├── 读取 pipeline.md → 全文
  │   └── 读取 dependencies.md → 全文
  │
  ├── assemble_prompt("sga_generator"):
  │   ├── 读取 prompts/sga_generator.md (模板)
  │   ├── 用上下文 + 任务描述替换模板占位符
  │   └── 写入 .reviews/_prompt.md
  │
  ├── cli_call("claude", "-p"):
  │   ├── subprocess.run(stdin=open("_prompt.md"))
  │   ├── 捕获 stdout → 写入 phaseZ-sga-r1-generator.md
  │   └── 验证输出非空 + 格式正确
  │
  ├── assemble_prompt("sga_evaluator"):
  │   ├── 读取 prompts/sga_evaluator.md (模板)
  │   ├── 嵌入原始任务 + Generator 输出
  │   └── 写入 .reviews/_prompt.md
  │
  ├── cli_call("codex", "exec"):
  │   ├── subprocess.run(stdin=open("_prompt.md"))
  │   ├── 捕获 stdout → 写入 phaseZ-sga-r1-evaluator.md
  │   └── 解析 XML: <score>, <evaluation>, <feedback>
  │
  └── decide():
      ├── score=0.65, evaluation=NEEDS_IMPROVEMENT
      ├── round(1) < max_rounds(3) → 继续
      └── compact_feedback(feedback) → 压缩到 ~400 chars
          （保留关键改进项，删除修辞和重复）

Step 3: SGA Round 2
  ├── assemble_prompt 加入 compacted_feedback:
  │   <context>
  │     <previous_feedback>
  │       Round 1 (score 0.65): 缺少迁移策略；Pipeline 挂载未对齐
  │     </previous_feedback>
  │   </context>
  │
  ├── cli_call → Generator output
  ├── cli_call → Evaluator: score=0.88, PASS
  └── checkpoint_save("sga", 2, "pass")

Step 4: Human checkpoint (GATE 2)
  ├── 打印 TDD 摘要
  ├── input("Press Enter to continue...")
  └── 人类按 Enter

Step 5-7: SGE Round 1-2 (同理)
  特殊步骤: apply_code_changes():
  ├── 解析 Generator 输出中的代码块
  ├── 识别 ```文件路径 标记
  └── 写入对应的 src/ 文件

Step 8: 生成 Gate 报告
  └── 汇总所有 .reviews/ 文件 → gates/phaseZ-gate-report.md
```

---

### 文件系统变化一览

运行前：
```
d:\7game\
  docs/features/phaseZ-PRD.md              ← 你已手动完成
  docs/design/specs/phaseZ-user-stories.md  ← 你已手动完成
  .reviews/                                 ← 空目录
```

运行后：
```
d:\7game\
  .reviews/
    _prompt.md                              ← 临时文件（.gitignore）
    phaseZ-sga-r1-generator.md              ← SGA 第 1 轮架构草稿
    phaseZ-sga-r1-evaluator.md              ← SGA 第 1 轮审查（FAIL, 0.65）
    phaseZ-sga-r2-generator.md              ← SGA 第 2 轮修正版（最终 TDD）
    phaseZ-sga-r2-evaluator.md              ← SGA 第 2 轮审查（PASS, 0.88）
    phaseZ-sge-r1-generator.md              ← SGE 第 1 轮代码
    phaseZ-sge-r1-evaluator.md              ← SGE 第 1 轮审查（FAIL, 0.72）
    phaseZ-sge-r2-generator.md              ← SGE 第 2 轮代码（最终版）
    phaseZ-sge-r2-evaluator.md              ← SGE 第 2 轮审查（PASS, 0.91）
    gates/
      phaseZ-gate-report.md                 ← 完整审查报告
  src/engine/
    soul-evaluator.ts                       ← 修改（12 行变更）
    soul-channel.ts                         ← 新文件（45 行）
    tick-handler.ts                         ← 修改（8 行变更）
```

---

## 形态二：M4 完整版（SPM 也半自动化）

唯一的区别是第 1 步也由 Python 编排器协助：

```powershell
# 完全自动化（M4 版）
PS D:\7game> python scripts/multi-agent/orchestrator.py `
  --task "Phase Z: 统一 SoulEvaluator 通信路径" `
  --complexity medium
```

```
[SPM] Stage 0/2: Requirements Analysis
───────────────────────────────────────

[SPM] Round 1/3
  🔵 Generator (Claude Opus)...
     ✓ Output → .reviews/phaseZ-spm-r1-generator.md
     📝 Generated PRD draft + 3 decision questions for human:

╔══════════════════════════════════════════════════╗
║  🔶 SPM DECISION REQUIRED                       ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  Claude generated a PRD draft with 3 open        ║
║  questions that need your input:                 ║
║                                                  ║
║  Q1: SoulEvaluator 是否需要保持对旧版 EventBus    ║
║      协议的向后兼容？                              ║
║      [a] 是，保持 1 个版本周期的兼容               ║
║      [b] 否，直接切换                             ║
║                                                  ║
║  Q2: ISoulChannel 接口的粒度:                     ║
║      [a] 粗粒度（一个 evaluate() 方法）            ║
║      [b] 细粒度（分 sense/decide/act 三步）        ║
║                                                  ║
║  Q3: 性能目标:                                    ║
║      [a] 每 Tick ≤ 5ms                           ║
║      [b] 每 Tick ≤ 10ms                          ║
║                                                  ║
╚══════════════════════════════════════════════════╝
> Your answers (e.g. "b a a"):
```

你输入 `b b a` 后，编排器将你的决策整合到 PRD，然后继续 SGA → SGE。

---

## 两种形态对比

| 维度 | M3 现实版 | M4 完整版 |
|------|----------|----------|
| SPM | 人类手动（交互模式） | 半自动（生成草稿 + 暂停等人） |
| SGA | ✅ 全自动 Eval-Opt | ✅ 全自动 Eval-Opt |
| SGE | ✅ 全自动 Eval-Opt | ✅ 全自动 Eval-Opt |
| 人类介入点 | GATE 1(手动) + GATE 2 + GATE 3 | SPM决策 + GATE 1 + GATE 2 + GATE 3 |
| 启动命令 | `--start-from sga --prd ...` | `--task "..."` |
| 前置条件 | 已有 PRD | 无 |
| 推荐场景 | **日常开发** | 完全新功能的全流程 |

> **我的建议**：M3 已经覆盖了 90% 的实际价值。SPM 需要深度人类参与（5-Why 分析、数值决策），
> 自动化的收益有限。先做好 M3，M4 视实际需求再决定。
