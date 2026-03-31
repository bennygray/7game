# 多智能体审查系统 - 方案 B：Claude Code 原生方案

> **创建日期**：2026-03-31 | **版本**：v1
> **状态**：规划中
> **定位**：跨 Phase 基础设施，非游戏功能
> **与方案 A 的关系**：完全独立的技术路线，目标相同（异构对抗审查），实现方式不同
> **方案 A**：[multi-agent-plan.md](file:///d:/7game/docs/project/multi-agent-plan.md)（Python 编排器 + CLI 调用）

---

## 一、核心思路

### 1.1 一句话

**不写 Python 编排器。用 Claude Code 原生的 Subagent + Hooks 机制实现全部功能。**

### 1.2 方案 A vs 方案 B

| 维度 | 方案 A（Python 编排器） | 方案 B（Claude Code 原生） |
|------|---------------------|------------------------|
| 编排器 | Python orchestrator.py | Claude Code 父 agent 自身 |
| 审查器 | Python 调 codex exec | Subagent 用 Bash 调 codex exec |
| Gate 检查 | Python gate-check.py | Hooks 自动调 gate-check.py |
| 上下文管理 | Python 做 JIT 组装 | Subagent 自己用 Read/Grep 按需读取 |
| Eval-Opt 循环 | Python 控制循环逻辑 | 父 agent 根据 Subagent 返回结果决定 |
| 审查记忆 | .reviews/ 文件 | Subagent persistent memory + .reviews/ |
| 新代码量 | ~500 行 Python | ~0 行（只有配置文件 + gate-check.py） |
| 异构审查 | ✅ Codex | ✅ Codex（Subagent 内调用） |

### 1.3 为什么方案 B 可能更好

1. **代码量极小**：不需要写 orchestrator.py、eval_opt.py、util.py，只需要几个 `.md` 定义文件
2. **Subagent 有工具能力**：可以自主读文件、grep 搜索，比 CLI `-p` 的"盲审"更深入
3. **Persistent Memory**：审查员 subagent 跨会话积累经验，越用越好
4. **Hooks 自动化 Gate**：不需要人手动跑 gate-check.py
5. **天然集成**：不需要"从交互模式切换到 Python"这个断裂点

### 1.4 潜在风险

| 风险 | 可能性 | 影响 | 缓解 |
|------|:---:|:---:|------|
| Subagent 内的 Bash 调 codex exec 不可靠 | 中 | 致命 | M0 验证 |
| 同一 Claude 模型的 Subagent 审查=橡皮图章 | 中 | 高 | Subagent 内调 Codex 实现异构 |
| Subagent 不能 spawn Subagent（官方限制） | 已确认 | 中 | 单层 Subagent 足够 |
| Hooks 的 gate-check 被绕过 | 低 | 中 | gate-check 也写入 .reviews/ 留痕 |
| Antigravity（非 Claude Code CLI）不支持 Subagent | **待验证** | 致命 | M0 第一个验证 |

---

## 二、系统架构

### 2.1 组件总览

```
Claude Code（父 agent，交互模式）
  │
  ├── 你和 Claude 对话（SPM 需求讨论）
  │
  ├── Claude 写 PRD → 调用 @trinity-reviewer 审查
  │   └── trinity-reviewer（Subagent）:
  │       ├── 自己读 PRD 文件（Read 工具）
  │       ├── grep 查一致性（Grep 工具）
  │       ├── 调 codex exec 获取异构审查（Bash 工具）
  │       ├── 综合评分 → 返回摘要给父 agent
  │       └── 更新 persistent memory
  │
  ├── Hooks: SubagentStop → 自动跑 gate-check.py
  │
  ├── Claude 写 TDD → 调用 @trinity-reviewer 审查
  │   └── （同上）
  │
  └── Claude 写代码 → 调用 @trinity-reviewer 审查
      └── （同上）
```

### 2.2 文件结构

```
d:\7game\
├── .claude/
│   ├── agents/
│   │   ├── trinity-reviewer.md      # 异构审查 Subagent
│   │   └── gate-keeper.md           # Gate 检查 Subagent（可选）
│   ├── settings.json                # Hooks 配置（SubagentStop → gate-check）
│   └── agent-memory/
│       └── trinity-reviewer/
│           └── MEMORY.md            # 审查经验积累（自动维护）
├── scripts/
│   └── gate-check.py                # 确定性 Gate 验证（唯一的 Python 代码）
├── .reviews/                        # 审查记录（Git 管理）
│   ├── {phase}-{stage}-r{N}-{role}.md
│   └── gates/
└── docs/project/
    ├── multi-agent-plan.md           # 方案 A
    └── multi-agent-plan-b.md         # 本文件（方案 B）
```

---

## 三、核心组件设计

### 3.1 trinity-reviewer.md（审查 Subagent）

```yaml
---
name: trinity-reviewer
description: >
  Trinity Pipeline 异构审查专家。在 PRD/TDD/代码产出后，
  自动进行深度审查并调用 Codex 获取异构视角。
  审查完成后输出结构化评分和改进建议。
tools: Read, Grep, Glob, Bash
model: sonnet
permissionMode: plan
memory: project
maxTurns: 20
effort: high
---

# Trinity Pipeline 审查员

## 你的职责
你是一个独立的审查专家。你的工作是对 Trinity Pipeline 各阶段的产物进行严格审查。

## 审查流程

### Step 1: 理解任务
收到审查任务后，确认：
- 审查对象是什么（PRD / TDD / 代码）
- 对应哪个 Phase
- 对应哪个 Gate（1 / 2 / 3）

### Step 2: 自主深度审查（Claude 视角）
1. 用 Read 工具读取目标文件全文
2. 用 Grep 搜索项目中的相关引用和依赖
3. 根据 Gate 级别执行对应检查清单：

**Gate 1（PRD 审查）**：
- C1 实体全量枚举：是否列出了所有 enum/union？
- C2 规则映射表：输入→输出映射是否完整？
- C3 公式全参数：参数、常量、边界值是否齐全？
- C4 阈值/标签表：分档区间是否完整？
- User Stories 是否都有 AC（Given-When-Then）？
- 与 MASTER-PRD 的一致性

**Gate 2（TDD 审查）**：
- Interface 定义是否完整？
- Pipeline 挂载点是否合理？
- GameState 变更是否有迁移方案？
- 与 PRD 的一致性

**Gate 3（代码审查）**：
- 代码是否实现了 TDD 中定义的所有 Interface？
- EventBus 订阅是否有对应的 unsubscribe？
- 是否有硬编码的魔数？
- 错误处理是否完整？

### Step 3: 异构审查（Codex 视角）
组装审查 prompt，调用 Codex 获取第二意见：

```bash
echo "<review_task>
审查以下 [PRD/TDD/代码]：
[文件内容（压缩到关键部分）]

检查清单：
[对应 Gate 的检查清单]

输出格式：
<score>0.0-1.0</score>
<issues>发现的问题列表</issues>
<suggestions>改进建议</suggestions>
</review_task>" | codex exec
```

### Step 4: 综合评分
合并两方审查意见，生成最终报告：

```markdown
## 审查报告

### 评分
- Claude 审查评分: X.XX
- Codex 审查评分: X.XX
- 综合评分: X.XX

### 发现的问题
#### 来自 Claude
- [问题1]
#### 来自 Codex（异构发现）
- [Codex 发现但 Claude 遗漏的问题]

### 建议
- [改进建议]

### 结论
PASS / NEEDS_IMPROVEMENT
```

### Step 5: 保存审查记录
将报告写入 `.reviews/{phase}-{stage}-r{N}-evaluator.md`

### Step 6: 更新记忆
将本次审查中发现的模式、常见问题记录到 agent memory，
以便未来审查时参考。

## 硬规则
- 🚫 禁止修改被审查的文件
- 🚫 禁止给出"一切看起来都很好"的空洞评价
- ✅ 每次审查必须至少指出 1 个可改进点（即使整体 PASS）
- ✅ 综合评分 < 0.8 必须标记为 NEEDS_IMPROVEMENT
```

### 3.2 gate-check.py（确定性验证——唯一的 Python）

```python
"""
Trinity Pipeline Gate 确定性验证器。
被 Hooks 自动调用，也可手动运行。
不涉及 LLM，纯确定性检查。
"""

import sys, os, re, json

def check_gate_1(phase):
    """SPM → SGA 转换检查"""
    checks = {
        "PRD 文件存在": os.path.exists(f"docs/features/{phase}-PRD.md"),
        "User Stories 存在": os.path.exists(f"docs/design/specs/{phase}-user-stories.md"),
        "GATE 1 签章": has_gate_signature(f"docs/features/{phase}-PRD.md", 1),
        "审查记录存在": os.path.exists(f".reviews/{phase}-spm-evaluator.md") or
                       os.path.exists(f".reviews/{phase}-spm-r1-evaluator.md"),
        "审查评分 ≥ 0.8": check_review_score(phase, "spm", 0.8),
    }
    return report(1, phase, checks)

def check_gate_2(phase):
    """SGA → SGE 转换检查"""
    checks = {
        "Gate 1 已通过": gate_passed(phase, 1),
        "TDD 文件存在": os.path.exists(f"docs/design/specs/{phase}-TDD.md"),
        "GATE 2 签章": has_gate_signature(f"docs/design/specs/{phase}-TDD.md", 2),
        "审查记录存在": review_exists(phase, "sga"),
        "审查评分 ≥ 0.8": check_review_score(phase, "sga", 0.8),
    }
    return report(2, phase, checks)

def check_gate_3(phase):
    """SGE → 完成检查"""
    checks = {
        "Gate 2 已通过": gate_passed(phase, 2),
        "审查记录存在": review_exists(phase, "sge"),
        "审查评分 ≥ 0.8": check_review_score(phase, "sge", 0.8),
    }
    return report(3, phase, checks)
```

### 3.3 Hooks 配置（.claude/settings.json）

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "trinity-reviewer",
        "hooks": [
          {
            "type": "command",
            "command": "python scripts/gate-check.py --auto-detect"
          }
        ]
      }
    ]
  }
}
```

当 trinity-reviewer Subagent 完成审查后，Hook 自动运行 gate-check.py 验证。

---

## 四、完整运行流程

### 场景：实现 Phase Z

```
你: "我想统一 SoulEvaluator 的通信路径"

Claude（交互对话）: 讨论需求...5-Why...决策题...
  → 写 PRD: docs/features/phaseZ-PRD.md
  → 写 User Stories: docs/design/specs/phaseZ-user-stories.md

Claude: "PRD 写好了，我来调审查员审查一下。"
  → 自动委派 @trinity-reviewer
  
  trinity-reviewer（Subagent，独立上下文）:
    1. Read: 读 phaseZ-PRD.md
    2. Grep: 搜索项目中相关引用
    3. 执行 C1~C6 检查清单
    4. Bash: codex exec 获取异构审查
    5. 综合评分 → 写入 .reviews/phaseZ-spm-r1-evaluator.md
    6. 返回摘要给父 agent: "Score 0.72, NEEDS_IMPROVEMENT"
    7. 更新 MEMORY.md
  
  [Hook] SubagentStop → python gate-check.py
    → Gate 1: FAIL (评分 < 0.8)

Claude: "审查发现问题：[展示反馈]。C3 需要补充边界值。"
你: "边界是 0.01~0.5"

Claude: 修正 PRD → 再次调用 @trinity-reviewer

  trinity-reviewer（新实例，干净上下文）:
    → 综合评分 0.91, PASS
  
  [Hook] gate-check.py → Gate 1: PASS ✅

Claude: "Gate 1 通过。继续 SGA？"
你: "继续"

Claude: 读 PRD → 写 TDD → 调用 @trinity-reviewer 审查
  → 循环修正直到 PASS
  → Gate 2 PASS ✅

Claude: "Gate 2 通过。继续 SGE？"
你: "继续"

Claude: 读 TDD → 写代码 → 调用 @trinity-reviewer 审查
  → 循环修正直到 PASS
  → Gate 3 PASS ✅

Claude: "全部完成！"
```

---

## 五、里程碑计划

> 比方案 A 大幅简化。没有 Python 编排器要写。

### M0: 环境验证（1 天）

| # | 检查项 | 验证方式 | 关键程度 |
|---|--------|---------|:---:|
| 0.1 | Subagent 在当前环境可用 | 创建测试 subagent，尝试调用 | **致命** |
| 0.2 | Subagent 的 Bash 工具可用 | Subagent 内执行 `echo hello` | **致命** |
| 0.3 | Subagent 内可调 codex exec | Subagent 用 Bash 调 `codex exec "hello"` | **致命** |
| 0.4 | Subagent 的 Read 工具可用 | Subagent 读取项目文件 | 高 |
| 0.5 | Persistent Memory 可用 | 配置 `memory: project`，验证写入 | 中 |
| 0.6 | Hooks (SubagentStop) 可用 | 配置 Hook，验证自动触发 | 中 |
| 0.7 | Codex CLI 可用 | `codex --version` | 高 |

**Gate 准出**：
- [ ] 0.1~0.3 全部通过（否则方案 B 不可行，退回方案 A）
- [ ] 0.4~0.7 全部通过

### M1: 最简审查循环（2 天）

**目标**：用 trinity-reviewer Subagent 完成一次真实的代码审查

**交付物**：
- `.claude/agents/trinity-reviewer.md` — 审查 Subagent 定义
- `scripts/gate-check.py` — 确定性 Gate 验证
- `.reviews/` — 目录结构

**测试场景**：
```
1. 创建 trinity-reviewer subagent
2. 让它审查一个已有文件（如 src/engine/disciple-behavior.ts）
3. 验证：Claude 审查 + Codex 审查都产出
4. 验证：审查记录写入 .reviews/
5. 验证：gate-check.py 能正确校验
```

**Gate 准出**：
- [ ] Subagent 完成审查并返回结构化评分
- [ ] Codex 异构审查在 Subagent 内成功执行
- [ ] 审查记录写入 .reviews/
- [ ] gate-check.py 验证通过

### M1.5: 异构对抗验证（2 天）

**目标**：验证 Subagent 内调 Codex 是否比纯 Claude Subagent 审查更有价值

（与方案 A 相同——同一个核心假设需要验证）

**Gate 准出**：
- [ ] 至少 1 个案例中异构审查发现同模型遗漏的问题
- [ ] 如果 0 差异 → 降级方案

### M2: 三阶段集成（3 天）

**目标**：SPM → SGA → SGE 全流程，trinity-reviewer 在每个 Gate 审查

**交付物**：
- 更新 SKILL.md：每个 Gate 签章前必须经过 @trinity-reviewer 审查
- Hooks 配置：SubagentStop 自动触发 gate-check.py
- Gate 检查清单细化（Gate 1/2/3 各自的检查项）

**Gate 准出**：
- [ ] 端到端完成一个 Phase 的 SPM → SGA → SGE
- [ ] 每个 Gate 转换都经过 trinity-reviewer + gate-check.py
- [ ] Persistent Memory 正常积累

### M3: 生产化（持续）

- Memory 策略优化（防止 MEMORY.md 膨胀）
- 多维度审查（安全/性能/架构拆分为不同 Subagent）
- 审查统计（从 .reviews/ 生成分析报告）
- 与 CI/CD 集成（提交时自动跑 gate-check.py）

---

## 六、关键设计决策

### 6.1 为什么用一个 Subagent 而不是多个？

官方限制：**Subagent 不能 spawn Subagent**。所以不能做"审查 Subagent 内再启动一个 Codex Subagent"。但 Subagent 可以用 Bash 调 `codex exec`，效果等价。

一个 trinity-reviewer 通过 Gate 参数区分审查类型（PRD/TDD/Code），比维护三个 Subagent 更简单。

### 6.2 Eval-Opt 循环谁控制？

**父 agent（Claude 交互模式）控制**。流程：
```
父 agent: 写产物 → 调 @trinity-reviewer 审查
          ← Subagent 返回: 0.72, NEEDS_IMPROVEMENT
父 agent: 修正产物 → 再调 @trinity-reviewer
          ← Subagent 返回: 0.91, PASS
父 agent: Gate 通过，继续下一阶段
```

父 agent 根据 Subagent 返回的分数和 gate-check 结果决定是否继续循环。

### 6.3 Python 的唯一角色

只有 `gate-check.py`——确定性文件/格式/分数验证。

不涉及 LLM 调用，不做编排，不做上下文管理。纯粹的"裁判"脚本。

---

## 七、待验证的关键假设

| # | 假设 | 验证时机 | 如果失败 |
|---|------|---------|---------|
| H1 | 当前环境（Antigravity）支持 Subagent | M0 | 退回方案 A |
| H2 | Subagent 的 Bash 可以调 codex exec | M0 | 退回方案 A |
| H3 | Hooks (SubagentStop) 在当前环境可用 | M0 | 手动调 gate-check |
| H4 | 异构审查有增量价值 | M1.5 | 降级方案 |
| H5 | Persistent Memory 跨会话有效 | M2 | 改用 .reviews/ 文件 |

---

## 八、方案选择建议

| 判断依据 | 选方案 A | 选方案 B |
|---------|---------|---------|
| M0 验证 H1~H3 | 任一失败 | **全部通过** |
| 偏好自定义控制 | ✅ Python 完全可控 | — |
| 偏好最小代码量 | — | ✅ 几乎零代码 |
| 需要在非 Claude Code 环境运行 | ✅ Python 可移植 | — |
| 需要审查记忆积累 | 需额外实现 | ✅ 原生支持 |

**建议**：先跑 M0 验证 H1~H3。如果全部通过 → 方案 B。如果任一失败 → 方案 A。

---

## 九、参考资料

### Claude Code 官方文档

| # | 标题 | URL |
|---|------|-----|
| 1 | Create custom subagents | https://docs.anthropic.com/en/docs/claude-code/sub-agents |
| 2 | Run agent teams | https://docs.anthropic.com/docs/en/agent-teams |
| 3 | Hooks guide | https://docs.anthropic.com/docs/en/hooks-guide |
| 4 | Programmatic usage (headless) | https://docs.anthropic.com/docs/en/headless |
| 5 | CLI reference | https://docs.anthropic.com/docs/en/cli-reference |

### Anthropic 方法论（与方案 A 共享）

| # | 标题 | URL |
|---|------|-----|
| 6 | Building Effective Agents | https://www.anthropic.com/research/building-effective-agents |
| 7 | Multi-agent research system | https://www.anthropic.com/engineering/multi-agent-research-system |
| 8 | Context engineering for agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
