# 深度反思：多智能体计划认知修正

> 基于 Anthropic 两篇官方文章全文 + 项目实际约束的重新审视

---

## 一、认知盲区识别

### 盲区 1：CLI `-p` 模式的本质限制

**当前计划假设**：CLI 调用等价于 API 调用，可以像官方 `llm_call()` 一样自如使用。

**真实情况**：`claude -p "..."` 是**无状态单次调用**。每次调用：
- 没有上一轮对话记忆（不像交互模式）
- 所有上下文必须通过 prompt 一次性注入
- prompt 长度受 CLI 限制（可能不如 API 的 200K token）

**影响**：
- 上下文注入的工程量被严重低估
- SPM/SGA 需要大量项目文件作为输入（AGENTS.md 466 行 + MASTER-PRD + handoff + feature-backlog = 可能 30K+ 字符）
- 每轮 Eval-Opt 循环中，Generator 需要重新接收"全部上下文 + 前几轮的反馈 + 原始任务"

**修正建议**：
- 不在命令行参数中内联 prompt，而是写入临时文件后通过 stdin 管道传入
- 研究 `claude -p < prompt_file.txt` 或 `cat prompt.txt | claude -p` 的可行性
- M0 必须验证这一点

### 盲区 2：上下文注入是真正的核心工程

**当前计划假设**：上下文注入用一个简单的 `build_context()` 函数就能解决。

**真实情况**（引用官方 2025-06 文章）：
> "The essence of search is compression: distilling insights from a vast corpus."
> "Token usage by itself explains 80% of the variance."

- 项目上下文总量（AGENTS.md + MASTER docs + handoff + PRD + TDD）可能超过 50K 字符
- 不能全量注入——需要**智能压缩**：根据当前阶段只注入必要的部分
- 官方做法：subagent 探索 -> 压缩核心发现 -> 传给 lead agent

**修正建议**：
- 为每个阶段（SPM/SGA/SGE）定义**精确的上下文清单**，而不是"读所有文档"
- 大文件提前做摘要压缩（如 AGENTS.md 466 行 -> 50 行关键规则提取）
- M1 需要实验确定实际的上下文 token 预算

### 盲区 3：SPM 阶段的交互性

**当前计划假设**：SPM 可以完全自动化（Claude 生成 PRD -> Codex 审查 -> 循环）。

**实际 SKILL.md 定义**：
- Step 1d 末尾："向 USER 抛出 2-3 个决策选择题"
- Step 1.5："向 USER 报告 PoC 结论"
- Step 2："如不知道 Baseline 数值，必须停下询问 USER"

**张力**：SPM 设计上就需要人类参与决策，不是纯自动化的。

**修正建议**：
- SPM 阶段不应追求全自动化
- 更现实的模型：Claude 生成 PRD 草稿 + 决策问题 -> **暂停让人类回答** -> Claude 整合答案继续
- 或者：人类先在交互模式中完成 SPM，Python 只自动化 SGA+SGE 的 Eval-Opt 循环

### 盲区 4：官方的 "Start simple" 原则被违反

**当前计划**：M1 就要做 SPM 的 Eval-Opt + C1~C6 自动评估 + checkpoint 恢复。

**官方原则**：
> "Start evaluating immediately with small samples."
> "In early agent development, changes tend to have dramatic impacts because there is abundant low-hanging fruit."
> "Start with small-scale testing right away with a few examples."

**修正建议**：
- M1 应该是**最简单的可能场景**：一个小任务的代码审查循环
- 不要在 M1 就做 SPM/PRD 生成——太复杂了
- M1 的目标应该缩小到："能不能让 Claude 生成一小段代码，然后 Claude 自己审查它？"

### 盲区 5：文件系统通信的工程细节

**当前计划**：提到 `.reviews/` 目录但没有定义文件命名和状态管理。

**官方建议**（2025-06 文章 Appendix）：
> "Subagent output to a filesystem to minimize the 'game of telephone.'"
> "Subagents call tools to store their work in external systems, then pass lightweight references back to the coordinator."

**修正建议**：
- 定义严格的文件命名规范：`.reviews/{phase}-{stage}-{round}-{role}.md`
- 例如：`.reviews/phaseZ-sge-round2-generator.md`、`.reviews/phaseZ-sge-round2-evaluator.md`
- Python 编排器只传**文件路径引用**给下一步，不传全文字符串

---

## 二、根本性问题

### 问题 1：该系统最有价值的场景是什么？

回看官方 2025-06 文章的结论：
> "Multi-agent systems excel at valuable tasks that involve heavy parallelization, information that exceeds single context windows."

您的 Trinity Pipeline 是**串行的**（SPM -> SGA -> SGE），不是并行研究任务。
多 Agent 系统的最大价值点不在于"自动化整个 Pipeline"，而在于：

**SGA/SGE 阶段的异构对抗审查**——这是唯一需要"两个不同大脑看同一个东西"的环节。

### 问题 2：最小可验证的价值单元

如果只做一件事就能证明系统价值，那件事是什么？

**答案**：让 Codex 审查一份已完成的 TDD 或代码，看它能不能发现 Claude 审查遗漏的问题。

这比自动化整个 Pipeline 简单 10 倍，但能立即回答核心假设：异构对抗是否有价值？

### 问题 3：渐进路径重排

基于以上反思，里程碑应该重排为：

```
M0：环境验证（不变）
M1：最简代码审查循环（单模型，单轮就好）   ← 大幅简化
M1.5：异构对抗验证（Claude 写 + Codex 审）  ← 核心价值假设验证
M2：多轮 Eval-Opt 循环（加入 memory + checkpoint）
M3：多阶段串联（SGA + SGE，先不做 SPM）
M4：SPM 集成（最复杂，放最后）
M5：生产化
```

---

## 三、对计划的 6 处精准修正建议

| # | 修正点 | 原因 |
|---|--------|------|
| P1 | M0 增加 stdin 管道验证 | 盲区 1：确保长 prompt 可以通过文件传入 CLI |
| P2 | M1 大幅简化为"最简代码审查" | 盲区 4：违反了 start simple 原则 |
| P3 | 新增 M1.5 异构对抗验证 | 问题 2：先验证核心假设 |
| P4 | SPM 自动化推迟到 M4 | 盲区 3：SPM 交互性强，不适合优先自动化 |
| P5 | 上下文注入定义精确的文件清单+大小限制 | 盲区 2：最大工程瓶颈 |
| P6 | .reviews/ 文件命名规范化 | 盲区 5：文件系统是通信协议的核心 |
