# Anthropic《Building Effective Agents》官方全资料深度解析

> [!NOTE]
> 基于对以下官方资料的逐字阅读后提炼：
> 1. 主文章：[Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（2024.12.19）
> 2. Cookbook 源码：`basic_workflows.ipynb`（Chaining / Routing / Parallelization）
> 3. Cookbook 源码：`orchestrator_workers.ipynb`
> 4. Cookbook 源码：`evaluator_optimizer.ipynb`
> 5. Cookbook 工具类：`util.py`（`llm_call` + `extract_xml`）
> 6. Agent SDK 文档：`platform.claude.com/docs/en/agent-sdk/overview`

---

## 第一部分：官方核心理念（3 条铁律）

Anthropic 在文章中反复强调三条基本原则，这三条原则贯穿所有模式：

### 原则 1：保持简单（Maintain Simplicity）
> *"The most successful implementations weren't using complex frameworks. Instead, they were building with simple, composable patterns."*

- **不要一上来就搞多 Agent**。先试单次 LLM 调用 + 检索增强（RAG）+ 上下文示例
- 只有当简单方案**可量化地证明不够好**时，才升级到工作流/Agent
- 框架（LangGraph 等）可以快速原型，但生产系统应该减少抽象层

### 原则 2：透明可观测（Prioritize Transparency）
> *"Explicitly showing the agent's planning steps."*

- Agent 的每一步推理和决策都应该**可见**
- 不要让 Agent 在黑盒中运行——人类必须能看到中间过程
- 这是对抗"幻觉"和"确认偏误"的根本手段

### 原则 3：精心设计 ACI（Agent-Computer Interface）
> *"Think about how much effort goes into HCI, and plan to invest just as much effort in creating good ACI."*

- 工具设计要和 UI/UX 设计一样严肃
- 工具描述就是"给大模型看的文档"，要像写给新人的 API Doc 一样详尽
- 包含示例用法、边界情况、输入格式要求

---

## 第二部分：6 种模式详细拆解

### 模式 1：Prompt Chaining（提示链）

```
输入 → [LLM Step 1] → Gate → [LLM Step 2] → Gate → [LLM Step 3] → 输出
```

| 维度 | 内容 |
|------|------|
| **准入条件** | 任务可以被**清晰、固定地**分解为一系列子步骤 |
| **内部机制** | 串行调用，前一步的输出是后一步的输入 |
| **准出条件** | 每步之间可插入**编程式 Gate 检查**（非 LLM 判断，而是代码逻辑验证） |
| **接口合约** | 每步的输入/输出格式必须严格定义（如 XML 标签） |
| **适用场景** | 生成营销文案 → 翻译；写大纲 → 检查大纲 → 写正文 |
| **不适用** | 子步骤数量不可预测的任务 |

**官方 Cookbook 实现**：
```python
def chain(input, prompts):
    result = input
    for prompt in prompts:
        result = llm_call(f"{prompt}\nInput: {result}")
    return result
```

**文档控制原则**：
- Gate 是**硬编码的检查点**，不是 LLM 判断
- 每步输出必须满足 Gate 条件才能进入下一步
- 如果 Gate 失败，流程**中断并报错**，不是自动修复

---

### 模式 2：Routing（路由分发）

```
输入 → [LLM 分类器] → 路由决策 → [专门处理流程 A/B/C]
```

| 维度 | 内容 |
|------|------|
| **准入条件** | 输入可以被**准确分类**为有限的几个类别 |
| **内部机制** | 分类 LLM 分析输入 → 输出分类标签 → 代码路由到对应处理器 |
| **准出条件** | 分类器必须输出**预定义的标签之一**（不允许自由发挥） |
| **接口合约** | 输入：任意文本；输出：严格的 XML 标签 `<selection>team_name</selection>` |
| **适用场景** | 客服工单分类（退款/技术/账号）；简单任务路由小模型，难任务路由大模型 |
| **不适用** | 类别边界模糊、无法准确分类的场景 |

**官方 Cookbook 实现**：
```python
def route(input, routes: dict):
    # 1. LLM 分析输入 → 选择路由
    route_key = llm_call(f"分类: {list(routes.keys())}\nInput: {input}")
    # 2. 用选中的专门 prompt 处理
    return llm_call(f"{routes[route_key]}\nInput: {input}")
```

**文档控制原则**：
- 路由表（routes dict）是**预定义且不可变的**
- 分类器必须从已知类别中选择，输出格式用 XML 约束
- 分类理由必须透明输出（`<reasoning>...</reasoning>`）

---

### 模式 3：Parallelization（并行化）

```
        ┌→ [LLM Worker A] ─┐
输入 ──→├→ [LLM Worker B] ──├→ 结果聚合
        └→ [LLM Worker C] ─┘
```

**两个变体**：

| 变体 | 机制 | 示例 |
|------|------|------|
| **Sectioning（切片）** | 不同子任务并行处理 | 一个 LLM 处理用户请求，另一个同时检查内容安全 |
| **Voting（投票）** | 同一任务多次运行取多数 | 多个 prompt 分别审查代码漏洞，任一发现问题则标记 |

| 维度 | 内容 |
|------|------|
| **准入条件** | 子任务之间**相互独立**（Sectioning）或需要多样性（Voting） |
| **内部机制** | `ThreadPoolExecutor` 并发调用多个 `llm_call()` |
| **准出条件** | Sectioning：所有并发任务完成后聚合；Voting：达到投票阈值 |
| **接口合约** | 每个并发任务的输入输出格式相同 |
| **适用场景** | Guardrails（安全栏杆）；代码漏洞多视角审查；内容合规多维度检测 |
| **不适用** | 子任务之间有依赖关系 |

**官方 Cookbook 实现**：
```python
def parallel(prompt, inputs, n_workers=3):
    with ThreadPoolExecutor(max_workers=n_workers) as executor:
        futures = [executor.submit(llm_call, f"{prompt}\nInput: {x}") for x in inputs]
        return [f.result() for f in futures]
```

**文档控制原则**：
- Voting 变体中的**投票阈值**是预定义的（如"任一发现问题即标记"或"多数一致才标记"）
- 每个 Worker 的 Prompt 必须**互相独立**，不能引用其他 Worker 的输出

---

### 模式 4：Orchestrator-Workers（编排者-工作者）

```
输入 → [Orchestrator LLM] → 动态分解子任务
                              ├→ [Worker 1: 类型A]
                              ├→ [Worker 2: 类型B]  → 汇总结果
                              └→ [Worker 3: 类型C]
```

| 维度 | 内容 |
|------|------|
| **准入条件** | 子任务**不可预测**，需要根据输入动态判断 |
| **内部机制** | Orchestrator 分析任务 → 生成 XML 格式的子任务列表 → 逐个分发给 Worker |
| **准出条件** | 所有 Worker 返回非空响应；Worker 输出通过验证 |
| **接口合约** | Orchestrator 输出 `<tasks><task><type>...</type><description>...</description></task></tasks>` |
| **适用场景** | 编码（不确定要改哪些文件）；搜索（不确定要查哪些源） |
| **不适用** | 子任务固定可预测的场景（用 Parallelization 更简单） |

**关键区别 vs Parallelization**：
- Parallelization 的子任务是**预定义的、固定的**
- Orchestrator-Workers 的子任务是**运行时动态生成的**

**官方 Cookbook 实现核心**：
```python
class FlexibleOrchestrator:
    def process(self, task, context=None):
        # Phase 1: Orchestrator 分析并拆解
        orchestrator_response = llm_call(self.orchestrator_prompt.format(task=task))
        tasks = parse_tasks(extract_xml(orchestrator_response, "tasks"))
        
        # Phase 2: Workers 逐个执行
        results = []
        for task_info in tasks:
            worker_response = llm_call(self.worker_prompt.format(
                original_task=task,
                task_type=task_info["type"],
                task_description=task_info["description"]
            ))
            # 验证：Worker 必须返回非空内容
            if not worker_response.strip():
                print(f"⚠️ Worker '{task_info['type']}' returned no content")
            results.append(worker_response)
        return results
```

**文档控制原则**：
- Orchestrator 的输出**必须使用 XML 结构化格式**，以确保可靠解析
- Worker 接收**原始任务 + 自己的专门指令**两份上下文
- Worker 输出有**空值校验**（返回空内容视为失败）

---

### 模式 5：Evaluator-Optimizer（评估者-优化者）⭐ 核心模式

```
        ┌─────────────────────────────┐
        │                             │
        ▼                             │
[Generator LLM] → 输出 → [Evaluator LLM] → feedback
                                │
                         PASS ──┴── NEEDS_IMPROVEMENT
                          │              │
                        结束           回到 Generator
```

| 维度 | 内容 |
|------|------|
| **准入条件** | 1. 有**明确的评估标准** 2. 迭代改进**可量化地提升质量** |
| **内部机制** | Generator 生成 → Evaluator 评判 → 反馈回 Generator → 循环 |
| **准出条件** | Evaluator 输出 `PASS`（官方 Cookbook 中严格使用此字符串） |
| **接口合约** | Evaluator 输出 `<evaluation>PASS/NEEDS_IMPROVEMENT/FAIL</evaluation><feedback>...</feedback>` |
| **适用场景** | 文学翻译（反复打磨措辞）；编码（生成 → 审查 → 修复循环） |
| **不适用** | 无法给出有意义反馈的场景；反馈不能改善输出的场景 |

**官方 Cookbook 完整实现**：
```python
def generate(prompt, task, context=""):
    """Generator：生成或改进解决方案"""
    response = llm_call(f"{prompt}\n{context}\nTask: {task}")
    thoughts = extract_xml(response, "thoughts")   # 思考过程（透明化）
    result = extract_xml(response, "response")      # 实际输出
    return thoughts, result

def evaluate(prompt, content, task):
    """Evaluator：评估是否达标"""
    response = llm_call(f"{prompt}\nOriginal task: {task}\nContent to evaluate: {content}")
    evaluation = extract_xml(response, "evaluation")  # PASS / NEEDS_IMPROVEMENT / FAIL
    feedback = extract_xml(response, "feedback")       # 具体反馈
    return evaluation, feedback

def loop(task, evaluator_prompt, generator_prompt):
    """核心循环：一直迭代直到 PASS"""
    memory = []                    # ← 历史版本记录
    thoughts, result = generate(generator_prompt, task)
    memory.append(result)
    
    while True:
        evaluation, feedback = evaluate(evaluator_prompt, result, task)
        if evaluation == "PASS":   # ← 唯一出口条件
            return result
        
        # 将历史版本 + 反馈作为上下文传回 Generator
        context = "\n".join(["Previous attempts:", *[f"- {m}" for m in memory], f"\nFeedback: {feedback}"])
        thoughts, result = generate(generator_prompt, task, context)
        memory.append(result)
```

**文档控制原则**：
- **memory 列表**：保存所有历史版本，防止循环退化（generator 知道之前做过什么）
- **thoughts 字段**：generator 必须先输出思考过程，再输出结果（强制透明化）
- **判定标准**：evaluator 的 prompt 中明确列出评估维度（正确性、时间复杂度、代码风格）
- **evaluator 不做修改**：*"You should be evaluating only and not attempting to solve the task"*
- **唯一出口**：只有 `PASS` 字符串能终止循环

---

### 模式 6：Agent（全自主代理）

```
人类指令 → [Agent LLM] ←→ [工具/环境]
               ↓                ↑
           规划+行动  ←──  环境反馈（ground truth）
               ↓
         完成 / 请求人类帮助 / 达到停止条件
```

| 维度 | 内容 |
|------|------|
| **准入条件** | 1. 开放式问题 2. 步骤数不可预测 3. 在可信环境中执行 |
| **内部机制** | LLM 自主规划 → 使用工具 → 获取环境反馈 → 评估进度 → 继续或停止 |
| **准出条件** | 任务完成 / 达到最大迭代次数 / 遇到阻塞请求人类介入 |
| **接口合约** | 工具必须有清晰的文档和错误消息；使用绝对路径而非相对路径 |
| **适用场景** | SWE-bench（修复 GitHub Issues）；Computer Use（操作电脑） |
| **风险** | 成本高；错误会累积；必须在沙箱中充分测试 |

**文档控制原则**：
- Agent 的每一步都必须从环境获取**"ground truth"**（如工具返回值、代码执行结果）
- 必须设置**停止条件**（最大迭代次数）防止无限循环
- 必须有**人类检查点**（checkpoints for human feedback）

---

## 第三部分：ACI 设计指南（工具接口工程）

官方花了大量篇幅讲工具设计。这一部分常被忽略但极其重要：

### 6 条官方指南

| # | 指南 | 详细说明 |
|---|------|---------|
| 1 | **给模型足够的 token 空间思考** | 不要让输出格式迫使模型在"想清楚之前就开始写"（如 diff 格式要求先写行数） |
| 2 | **输出格式贴近自然文本** | 模型训练数据中大量的自然文本。Markdown 比 JSON 更友好（JSON 需要转义换行和引号） |
| 3 | **减少格式开销** | 不要要求模型精确计数（如"第 1234 行"），用绝对路径替代相对路径 |
| 4 | **像写文档一样写工具描述** | 把自己当成模型——如果你读这个工具描述会困惑，模型也会 |
| 5 | **包含示例和边界情况** | 好的工具定义包含用法示例、边界情况处理、输入格式要求 |
| 6 | **Poka-yoke（防呆设计）** | 修改工具参数使得犯错变得**不可能**，而不是依赖模型"小心" |

### 官方实战案例
> *"We spent more time optimizing our tools than the overall prompt."*  
> *"The model would make mistakes with tools using relative filepaths after the agent had moved out of the root directory. We changed the tool to always require absolute filepaths—and the model used this method flawlessly."*

---

## 第四部分：Agent SDK 与 CLI 的关系

| 维度 | Agent SDK | CLI（`claude -p`） |
|------|-----------|-------------------|
| 编程方式 | Python/TypeScript 库 | Shell 子进程 |
| 鉴权 | **需要 API Key** | **使用订阅凭证** |
| 能力 | 完整的 Agent Loop + 内置工具 | 单次调用或会话 |
| 适用 | 构建产品级 Agent | 脚本编排 / 自动化 |
| 配置 | `ClaudeAgentOptions` | `CLAUDE.md` + `--model` flag |

> [!WARNING]
> Agent SDK 明确声明：*"Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products."*  
> 这意味着 Agent SDK **只能用 API Key**，不能用订阅凭证。
> 但 `claude -p` CLI 可以用订阅凭证——这正是您的方案可行的原因。

---

## 第五部分：官方模式 → Trinity Pipeline 完整映射

| 官方模式 | Trinity 阶段 | 映射说明 |
|----------|:---:|----------|
| **Prompt Chaining** | SPM → SGA → SGE | Trinity 本身就是串行的阶段链，每个 GATE 就是 Gate 检查点 |
| **Routing** | SPM 入口 | 根据需求类型（新功能/Bug修复/重构）路由到不同的 Pipeline 深度 |
| **Parallelization (Voting)** | Party Review | 多个视角同时审查同一份代码 |
| **Orchestrator-Workers** | SGA | 架构师动态决定需要修改哪些模块，分发给各模块自己的设计 |
| **Evaluator-Optimizer** | SGE + Review | 编码(Generator) → 审查(Evaluator) → 修复 → 循环直到 PASS |
| **Agent** | 整个 SGE 阶段 | Claude Code 交互模式本身就是一个 Agent |

---

## 第六部分：提炼出的接口合约模板

基于官方所有 Cookbook 源码，**统一的接口合约格式**如下：

### Generator 接口
```
输入: <task>任务描述</task>
      <context>历史版本 + 上一轮反馈（如有）</context>
输出: <thoughts>思考过程</thoughts>
      <response>实际代码/设计/文档</response>
```

### Evaluator 接口
```
输入: <task>原始任务</task>
      <content>待评估的内容</content>
输出: <evaluation>PASS | NEEDS_IMPROVEMENT | FAIL</evaluation>
      <feedback>具体问题和修改建议</feedback>
```

### Orchestrator 接口
```
输入: <task>任务描述</task>
输出: <analysis>任务分析</analysis>
      <tasks>
        <task><type>子任务类型</type><description>子任务描述</description></task>
        ...
      </tasks>
```

### Worker 接口
```
输入: <original_task>原始任务</original_task>
      <task_type>子任务类型</task_type>
      <task_description>子任务描述</task_description>
输出: <response>完成的工作</response>
```

---

## 第七部分：诚实总结 — 官方"没说的"

> [!CAUTION]
> 以下是我读完全部资料后**必须坦率指出的缺失**：

| 您期望看到的 | 官方是否提供 | 说明 |
|-------------|:---:|------|
| 3 个 Agent 自动辩论 | ❌ | 官方最多到"2 个角色循环"（Generator + Evaluator），没有 3 Agent 架构 |
| Agent 间自主通信协议 | ❌ | 所有通信都是 Python 函数调用（变量传递），不是独立进程间通信 |
| 文档交接格式规范 | ⚠️ 部分 | XML 标签定义了接口，但没有完整的"文档交接清单" |
| 最大循环次数的建议 | ❌ | 官方 `loop()` 函数是 `while True` 无限循环，没有设最大次数 |
| 异构模型对抗（Claude vs GPT） | ❌ | 官方只用同一个模型，没有跨厂商审查方案 |
| CLI 间编排方案 | ❌ | 官方只提供 API 方案和 Agent SDK 方案，不涉及 CLI 互调 |

**以上缺失的部分，就是您需要自己设计并补全的——这也是您的 Trinity Pipeline 的独特价值所在。**
