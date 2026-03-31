> **SUPERSEDED** — 本方案已被 `trinity-guardian-plan.md` 方案 B 取代。保留为历史参考。

# 多智能体自辩论系统 - 实施计划

> **创建日期**：2026-03-31 | **最后更新**：2026-03-31 v6（架构重构）
> **状态**：规划中（方案设计完成，待环境验证）
> **定位**：跨 Phase 基础设施，非游戏功能
> **理论基础**：
> 1. Anthropic《Building Effective Agents》（2024-12-19，持续更新）- 6 种模式
> 2. Anthropic《How we built our multi-agent research system》（2025-06-13）- 生产级经验
> 3. Anthropic《Effective context engineering for AI agents》（2025-09-29）- 上下文工程

---

## 一、核心架构——三层模型

### 1.1 架构总览

```
第 1 层：人 ↔ Claude Opus（交互 CLI）
         ├── 需求对话（SPM）：来回讨论、5-Why、决策
         ├── Claude 调 codex exec 审查 PRD
         ├── GATE 1 通过后——
         └── Claude 启动 Python：
               $ python orchestrator.py --prd phaseZ-PRD.md --complexity medium
                                │
第 2 层：Python 编排器 ◄────────┘
         ├── SGA Loop：claude -p 写 TDD → codex exec 审查 → 循环
         ├── gate-check.py 验证 GATE 2
         ├── 暂停 → 人确认
         ├── SGE Loop：claude -p 写代码 → codex exec 审查 → 循环
         ├── gate-check.py 验证 GATE 3
         └── 暂停 → 人确认 → 完成
                                │
第 3 层：CLI 工具 ◄─────────────┘
         ├── claude -p（via stdin 管道）— 无状态生成器
         └── codex exec（via stdin 管道）— 无状态审查器
```

### 1.2 为什么是三层

| 层 | 做什么 | 为什么不能合并 |
|---|--------|--------------|
| **第 1 层 Claude 交互** | SPM 需求对话 + PRD 审查 | 需求阶段需要真正的来回对话，不能自动化 |
| **第 2 层 Python 编排** | SGA/SGE 的 Eval-Opt 循环 + Gate 检查 | 机械性循环不需要对话，自动化节省时间 |
| **第 3 层 CLI 工具** | 单次生成/审查 | 无状态工具，被上层调用 |

### 1.3 Python 的两个角色

| 角色 | 功能 | 为什么不能让 Claude 做 |
|------|------|---------------------|
| **编排器** | SGA/SGE 的 Eval-Opt 自动循环 | Claude 交互模式一步步做太慢，需要自动化运行 |
| **Gate 守门人** | 确定性文件/格式/分数检查 | 做事的人不能当裁判，防止"橡皮图章" |

### 1.4 技术约束

| 约束 | 影响 | 应对 |
|------|------|------|
| CLI `-p` 是无状态单次调用 | 每轮需重新注入上下文 | Python 做 JIT 上下文组装（按阶段筛选文件） |
| Context rot（token 越多注意力越分散） | 不能全量注入项目文档 | 精确上下文清单 + Compaction |
| SPM 需要人类参与决策 | 不能全自动化 SPM | SPM 在 Claude 交互模式中完成 |

---

## 二、完整运行流程

### 场景：你要实现 "Phase Z: 统一 SoulEvaluator 通信路径"

#### 阶段 1：SPM——人 ↔ Claude Opus 交互（~30 分钟）

```
你: "我想统一 SoulEvaluator 的通信路径"

Claude Opus 和你对话讨论：
  - 5-Why 分析："为什么需要统一？目前有几条路径？"
  - Invariant 声明
  - 核心体验锚定 + ROI
  - 决策选择题（2-3 个）→ 你回答
  - 规则与数值边界
  - C1~C6 自检
  - User Story 生成

Claude Opus: "PRD 写好了，我先让 Codex 审查一下。"
  → Claude 调用: codex exec < review_prompt.md
  
Codex 返回: Score 0.72, NEEDS_IMPROVEMENT
  "C3 公式缺少 DECAY_RATE 边界值"

Claude Opus: "Codex 发现问题：[展示反馈]。你觉得边界应该是多少？"
你: "0.01 到 0.5"

Claude Opus: 修正 PRD → 再调 Codex
Codex 返回: Score 0.91, PASS ✅

Claude Opus: "PRD 通过审查。确认 GATE 1？"
你: "确认"
Claude Opus: 签 GATE 1

Claude Opus: "好的，我来启动自动化。"
  → $ python scripts/multi-agent/orchestrator.py \
       --prd docs/features/phaseZ-PRD.md \
       --complexity medium
```

#### 阶段 2：SGA——Python 编排器自动运行

```
╔══════════════════════════════════════════════════╗
║  Trinity Pipeline Orchestrator                   ║
║  Phase: Z | Complexity: medium (max 3 rounds)    ║
╚══════════════════════════════════════════════════╝

[SGA] Building context...
  ✓ PRD: docs/features/phaseZ-PRD.md (2,847 chars)
  ✓ MASTER-ARCH (summary): 1,200 chars
  ✓ gamestate.md: 3,105 chars
  ✓ pipeline.md: 2,890 chars
  📊 Total: ~11K chars

[SGA] Round 1/3
  🔵 Generator (Claude -p via stdin)... ✓ → .reviews/phaseZ-sga-r1-generator.md
  🔴 Evaluator (Codex exec)...          ✓ → .reviews/phaseZ-sga-r1-evaluator.md
     Score: 0.65 | NEEDS_IMPROVEMENT
     "Pipeline 挂载点未与 Phase 401 对齐"

[SGA] Round 2/3
  🔵 Generator... ✓ (含 Round 1 反馈 compaction)
  🔴 Evaluator... ✓ Score: 0.88 | PASS ✅

[SGA] Gate Check...
  $ python gate-check.py --gate 2 --phase Z
  ✓ TDD 文件存在
  ✓ Codex 评分 ≥ 0.8
  ✓ Interface 定义已包含
  ✓ GATE 2 签章格式正确
  GATE 2 PASS ✅

╔══════════════════════════════════════════╗
║  🔶 GATE 2 — 需要你确认                  ║
║  [Enter] 继续 SGE / [e] 编辑 / [q] 中止  ║
╚══════════════════════════════════════════╝
```

#### 阶段 3：SGE——Python 编排器继续自动运行

```
[SGE] Round 1/3
  🔵 Generator (Claude Sonnet -p)... ✓ → 3 个文件变更
  🔴 Evaluator (Codex exec)...       ✓ Score: 0.72 | NEEDS_IMPROVEMENT
     "EventBus 订阅缺少 unsubscribe"

[SGE] Round 2/3
  🔵 Generator... ✓
  🔴 Evaluator... ✓ Score: 0.91 | PASS ✅

[SGE] Applying code changes...
  ✓ src/engine/soul-evaluator.ts (modified)
  ✓ src/engine/soul-channel.ts (new)
  ✓ src/engine/tick-handler.ts (modified)

[SGE] Gate Check...
  $ python gate-check.py --gate 3 --phase Z
  GATE 3 PASS ✅

[DONE] ✅ Pipeline complete!
  Total rounds: 4 (SGA: 2, SGE: 2)
  Artifacts: .reviews/gates/phaseZ-gate-report.md
```

---

## 三、角色分配

| 角色 | 谁 | 在哪个阶段 | 做什么 |
|------|-----|----------|--------|
| **需求分析师** | Claude Opus（交互模式） | SPM | 和人对话、5-Why、写 PRD |
| **PRD 审查员** | Codex（Claude 交互模式调用） | SPM | 异构审查 PRD 完整性 |
| **架构师** | Claude Opus/Sonnet（-p 模式） | SGA | 读 PRD → 生成 TDD |
| **TDD 审查员** | Codex（Python 编排器调用） | SGA | 异构审查架构合理性 |
| **编码工程师** | Claude Sonnet（-p 模式） | SGE | 读 TDD → 生成代码 |
| **代码审查员** | Codex（Python 编排器调用） | SGE | 异构审查代码质量 |
| **Gate 守门人** | Python gate-check.py | 每个 GATE | 确定性文件/格式/分数检查 |
| **最终裁决者** | 人类 | 每个 GATE | 确认或否决 |

**每个阶段的产物都经过 Codex 异构审查**：

| 阶段 | 产物 | 审查触发方 |
|------|------|-----------|
| SPM → PRD | PRD + User Stories | Claude 交互模式直接调 codex exec |
| SGA → TDD | TDD + Interface | Python 编排器自动调 codex exec |
| SGE → Code | 源代码 | Python 编排器自动调 codex exec |

---

## 四、文件系统通信协议

### 4.1 审查记录命名规范

```
.reviews/
  {phase}-{stage}-r{round}-{role}.md

示例：
  phaseZ-spm-r1-evaluator.md     # SPM Codex 第 1 轮审查（Claude 交互调用）
  phaseZ-sga-r1-generator.md     # SGA 第 1 轮 TDD（Python 编排器调用）
  phaseZ-sga-r1-evaluator.md     # SGA 第 1 轮审查
  phaseZ-sge-r2-generator.md     # SGE 第 2 轮代码
  gates/
    phaseZ-gate-report.md        # 完整 Gate 报告
```

### 4.2 上下文注入（Python 编排器负责 JIT 组装）

| Stage | 注入的文件 | 预估大小 | 压缩策略 |
|-------|----------|:---:|---------|
| SGA | PRD + MASTER-ARCH(摘要) + gamestate + pipeline + dependencies | ~15K 字符 | MASTER 只取摘要 |
| SGE | TDD + User Stories + tech-debt(活跃项) + 目标源文件 | ~20K 字符 | tech-debt 只取活跃项 |

CLI `-p` 无法自主探索文件，JIT 由 Python 编排器执行：按阶段读取精确的文件清单，组装后通过 stdin 传给 CLI。

### 4.3 Git 策略

- `.reviews/*.md` → Git 管理（审计追溯）
- `.reviews/_prompt.md` → `.gitignore`（临时文件）

---

## 五、官方洞见汇总（三篇文章）

### 第一篇（2024-12，持续更新）: Building Effective Agents

| 洞见 | 采纳方式 |
|------|---------|
| Evaluator-Optimizer 循环 | SGA/SGE 的核心模式（Python 编排） |
| Gate 检查点 | Trinity GATE 1/2/3 天然匹配 |
| Evaluator 不做修改，只评估 | Codex 只输出 PASS/NEEDS_IMPROVEMENT + feedback |
| ACI 设计 = HCI 设计 | prompt 模板精心设计 |

### 第二篇（2025-06）: How we built our multi-agent research system

| 洞见 | 采纳方式 |
|------|---------|
| Subagent 输出到文件系统 | .reviews/ 命名规范 |
| Effort scaling | roles.json 中 max_rounds 配置 |
| LLM-as-judge（0.0-1.0 分） | Evaluator 接口含 score 字段 |
| 检查点恢复 | 基于 .reviews/ 文件状态恢复 |
| 精细化委派指令 | prompt 模板含输出格式+边界+禁止事项 |

### 第三篇（2025-09）: Effective context engineering for AI agents

| 洞见 | 采纳方式 |
|------|---------|
| Context rot（注意力稀释） | 精确上下文清单，不全量注入 |
| 最小高信号集 | 每 Stage 严格定义需要读哪些文件 |
| JIT 上下文 | Python 编排器按阶段组装，不预加载 |
| Compaction | 多轮循环中历史反馈做压缩后再传入 |
| 结构化笔记 | .reviews/ 文件即跨轮次持久化记忆 |
| Prompt Right Altitude | 不太具体（脆弱），不太模糊（缺信号） |
| Sub-agent 输出压缩 | Evaluator 反馈控制在 500-1000 字符 |

---

## 六、文档整改清单（前置条件）

### 第一优先级（阻碍系统运行）

- [ ] **FIX-01** 统一 GATE 签章格式（2h）
- [ ] **FIX-02** 合并非规范文件名（1h）
- [ ] **FIX-03** 编写 gate-check.py（2h）
- [ ] **FIX-04** Pipeline 文件添加 YAML frontmatter（2h）

### 第二优先级（提升追溯性）

- [ ] **FIX-05** 回填 Phase A-D walkthrough
- [ ] **FIX-06** INDEX.md / task-tracker 同步
- [ ] **FIX-07** handoff.md 瘦身
- [ ] **FIX-08** 补全 verification 记录

---

## 七、里程碑计划

> **核心原则**：每个 M 完成后都是可用的系统，可以随时停。

### M0: 环境验证（1 天）

**目标**：确认所有 CLI 工具可用 + stdin 管道可行

| # | 检查项 | 命令 | 验证点 |
|---|--------|------|--------|
| 0.1 | Python | `python --version` | 版本 |
| 0.2 | Claude CLI | `claude --version` | 存在 |
| 0.3 | Codex CLI | `codex --version` | 存在 |
| 0.4 | Claude 非交互 | `claude -p "hello"` | stdout 返回 |
| 0.5 | Claude stdin 管道 | `echo "hello" \| claude -p` | 长 prompt 可行性 |
| 0.6 | Claude 文件管道 | `claude -p < prompt.txt` | 文件输入可行性 |
| 0.7 | Codex 非交互 | `codex exec "hello"` | stdout 返回 |
| 0.8 | Codex stdin 管道 | `echo "review" \| codex exec` | 需验证 |
| 0.9 | subprocess | Python 脚本测试 | 引号/编码 |

**Gate 准出**：
- [ ] 0.1~0.9 全部通过
- [ ] Claude + Codex stdin 管道可传入 > 5000 字符
- [ ] stdout UTF-8 中文正常

### M1: 技术管道验证（2 天）

**目标**：验证 subprocess → stdin → stdout → XML 解析 → 文件写入 全管道

**交付物**：
- `scripts/multi-agent/util.py` — CLI 封装（stdin 管道 + XML 解析）
- `scripts/multi-agent/eval_opt.py` — 最简 Eval-Opt 循环
- `.reviews/` — 目录结构 + 命名规范

**接口合约**：
```
Generator:
  输入: <task>任务</task><context>上轮反馈（如有）</context>
  输出: <thoughts>思考</thoughts><response>结果</response>

Evaluator:
  输入: <task>原始任务</task><content>待评估内容</content>
  输出: <score>0.0-1.0</score><evaluation>PASS|NEEDS_IMPROVEMENT</evaluation><feedback>反馈</feedback>
```

**Gate 准出**：
- [ ] subprocess → stdin → stdout 管道跑通
- [ ] XML 解析成功
- [ ] 结果写入 `.reviews/` 文件（命名规范正确）
- [ ] `cli_call()` 对 Claude + Codex 都可靠

### M1.5: 异构对抗验证（2 天）

**目标**：**验证核心假设——异构审查是否比同模型审查更有效**

**实验**：3 份已有代码/文档，分别让 Claude 和 Codex 审查，对比差异。

**Gate 准出**：
- [ ] 至少 1 个案例中异构审查发现同模型遗漏的问题
- [ ] 如果 0 差异 → 降级方案：
  - A: 同模型 + 结构化 checklist
  - B: 人工按需调用
  - C: 暂停等更好的工具

### M2: SGA/SGE 自动化编排器（3-5 天）

**目标**：Python 编排器可自动运行 SGA + SGE 的 Eval-Opt 循环

**交付物**：
- `scripts/multi-agent/orchestrator.py` — 编排器（多轮循环 + checkpoint + effort scaling）
- `scripts/multi-agent/gate_check.py` — 确定性 Gate 验证
- `scripts/multi-agent/roles.json` — 角色配置
- `scripts/multi-agent/prompts/` — 各阶段 prompt 模板

**effort scaling**：
```json
{
  "simple":  {"max_rounds": 1, "desc": "简单修复/重命名"},
  "medium":  {"max_rounds": 3, "desc": "功能实现/重构"},
  "complex": {"max_rounds": 5, "desc": "架构变更/新系统"}
}
```

**SGE 编码模式**：
CLI `-p` 无法直接写文件。两个方案：
- A: Claude 输出代码到 stdout → Python 解析并写入文件
- B: SGE 的 Generator 改用 Claude Code 交互模式（可直接写文件）

**Gate 准出**：
- [ ] 一条命令完成 SGA → SGE 两阶段
- [ ] 每阶段有人类确认暂停点
- [ ] gate-check.py 确定性验证每个 GATE
- [ ] 3+ 轮循环稳定运行
- [ ] checkpoint 恢复可用
- [ ] effort scaling 按复杂度调整

### M3: SPM 集成（2-3 天）

**目标**：Claude 交互模式完成 SPM 后能无缝启动 Python 编排器

**交付物**：
- 更新 SKILL.md：SPM 末尾增加"调用 codex exec 审查 PRD"步骤
- 更新 SKILL.md：GATE 1 后增加"启动 orchestrator.py"步骤
- SPM 的 Codex 审查 prompt 模板
- 端到端集成测试

**Gate 准出**：
- [ ] Claude 交互模式完成 SPM → 调 Codex 审查 PRD → GATE 1
- [ ] Claude 启动 Python 编排器 → SGA/SGE 自动完成
- [ ] 全流程端到端可用

### M4: 生产化（持续）

- 大文件分段审查
- 多维度并行审查（安全/性能/架构分视角）
- Token 消耗追踪
- 审查历史统计分析

---

## 八、gate-check.py 设计

```python
# Gate 1 (SPM → SGA)：
def check_gate_1(phase):
    return all([
        file_exists(f"docs/features/{phase}-PRD.md"),
        file_exists(f"docs/design/specs/{phase}-user-stories.md"),
        has_gate_signature(prd_path, gate=1),
        codex_review_exists(f".reviews/{phase}-spm", min_score=0.8),
        prd_completeness(prd_path),  # C1~C4 非空验证
    ])

# Gate 2 (SGA → SGE)：
def check_gate_2(phase):
    return all([
        gate_1_passed(phase),  # 前置门必须已通过
        file_exists(f"docs/design/specs/{phase}-TDD.md"),
        has_gate_signature(tdd_path, gate=2),
        codex_review_exists(f".reviews/{phase}-sga", min_score=0.8),
    ])

# Gate 3 (SGE → 完成)：
def check_gate_3(phase):
    return all([
        gate_2_passed(phase),
        codex_review_exists(f".reviews/{phase}-sge", min_score=0.8),
        # no_lint_errors(), regression_tests_pass() — 可选
    ])
```

---

## 九、Gate 依赖矩阵

```
FIX-01~04 ----+
              |
M0 -----------+---- M1 ---- M1.5 ---- M2 ---- M3 ---- M4
(环境验证)  (并行)  (管道验证) (异构验证) (编排器) (SPM集成) (生产化)
                       |
                 如果异构无价值
                 → 降级，不继续
```

---

## 十、技术风险

| 风险 | 可能性 | 影响 | 缓解 |
|------|:---:|:---:|------|
| stdin/文件管道不工作 | 中 | **致命** | M0 第一个验证 |
| Windows PowerShell 编码 | 高 | 高 | M0 验证；备选 Git Bash |
| Context rot | 高 | 高 | 精确上下文清单 + Compaction |
| 上下文超 token 限制 | 高 | 高 | JIT 按需加载 + 文件引用 |
| 异构对抗无增量价值 | 中 | **致命** | M1.5 验证 |
| Claude 交互模式无法调 codex | 低 | 高 | SPM 退化为手动调用 |
| Evaluator 反馈过长致失焦 | 中 | 中 | 反馈 Compaction（限 1000 字符） |

---

## 十一、文件结构

```
d:\7game\
+-- scripts/
|   +-- multi-agent/
|   |   +-- util.py                  # CLI 封装（stdin + XML 解析）
|   |   +-- eval_opt.py              # Eval-Opt 循环引擎
|   |   +-- orchestrator.py          # SGA/SGE 编排器
|   |   +-- gate_check.py            # 确定性 Gate 验证
|   |   +-- roles.json               # 角色 + effort scaling
|   |   +-- prompts/
|   |       +-- sga_generator.md
|   |       +-- sga_evaluator.md
|   |       +-- sge_generator.md
|   |       +-- sge_evaluator.md
|   |       +-- spm_evaluator.md     # Claude 交互模式用
|   +-- m0-env-check.py              # M0 环境验证
+-- .reviews/                         # 审查记录（Git 管理）
|   +-- {phase}-{stage}-r{N}-{role}.md
|   +-- gates/
+-- docs/project/
    +-- multi-agent-plan.md           # 本文件
```

---

## 十二、参考资料

### Anthropic 官方文章

| # | 标题 | URL | 日期 |
|---|------|-----|------|
| 1 | Building Effective Agents | https://www.anthropic.com/research/building-effective-agents | 2024-12-19（持续更新） |
| 2 | How we built our multi-agent research system | https://www.anthropic.com/engineering/multi-agent-research-system | 2025-06-13 |
| 3 | Effective context engineering for AI agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | 2025-09-29 |

### 官方 Cookbook / SDK

| # | 内容 | URL |
|---|------|-----|
| 4 | Evaluator-Optimizer 模式实现 | https://platform.claude.com/cookbook/patterns-agents-basic-workflows |
| 5 | Claude Agent SDK | https://platform.claude.com/docs/en/agent-sdk/overview |
| 6 | Memory & Context Management | https://platform.claude.com/cookbook/tool-use-memory-cookbook |

### 项目内文档

| # | 内容 | 路径 |
|---|------|------|
| 7 | 文档体系审计报告 | [doc_audit_report.md](file:///d:/7game/docs/project/multi-agent/doc_audit_report.md) |
| 8 | 计划深度反思 | [plan_reflection.md](file:///d:/7game/docs/project/multi-agent/plan_reflection.md) |
| 9 | 计划自审查报告 | [plan_self_review.md](file:///d:/7game/docs/project/multi-agent/plan_self_review.md) |
| 10 | 完整运行演示 | [complete_runtime_demo.md](file:///d:/7game/docs/project/multi-agent/complete_runtime_demo.md) |
| 11 | 6 种模式深度解析 | [anthropic_agents_full_analysis.md](file:///d:/7game/docs/project/multi-agent/anthropic_agents_full_analysis.md) |
