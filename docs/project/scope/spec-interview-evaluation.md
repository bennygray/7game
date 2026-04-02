# SPM 采访式提问环节评估 + SSA Skill 价值分析

> **日期**：2026-04-02
> **类型**：设计评估（不涉及代码修改）
> **输入**：`SSA-skill-design-plan.md` v3 + 外部文献调研
> **状态**：待 USER 决策

---

## 一、SSA Skill 设计方案总体评估

### 1.1 它解决的问题是否真实

| 痛点 | 项目中的实际表现 | SSA 的解法 |
|------|-----------------|-----------|
| 范围膨胀 | Phase IJ 从"类型桩"演变为 v3.0 重写（0.8B→2B + NarrativeSnippet 全新子系统） | Step 2 形态探索 + Appetite 投资预算 |
| Gap 判断靠记忆 | TG-2 审计发现 INDEX.md 幽灵注册、arch/layers.md 缺 9 文件 | Step 4 grep 证据要求（Logical Certificate） |
| Phase 边界不清 | Phase IJ-PoC 的 13 个 review 文件说明探索过程缺乏预设边界 | Step 6 Stop Rules + No Gos |
| 计划腐化 | handoff.md 曾膨胀到 335+ 行才治理 | Living Spec 回更机制 |

**注意**：这些痛点在 TG 系列治理后已大幅缓解。

### 1.2 方法论质量

**优点：**
- 10 种方法论的选型有据（Lean Inception、Shape Up、Patton Walking Skeleton 均为行业验证框架）
- Spec Interview 模式（AI 问 USER 答）比 AI 独白确实更有效
- Self-Interview 自省填补了现有 Pipeline 缺少的"产出后自检"环节
- Logical Certificate（grep 证据）直接回应了"凭记忆判断"的问题

**风险：**
- 602 行设计 vs 当前 SPM SKILL.md ~200 行——复杂度膨胀 3 倍
- 10 种方法论交织可能导致"方法论过载"
- 开放问题（§十六）有 5 个未决，设计未收敛

### 1.3 与现有 Pipeline 的重叠

| SSA Step | SPM 已有对应 | 重叠 | 增量价值 |
|----------|-------------|:----:|:--------:|
| Step 1 愿景对齐 | SPM Step 1d 5-Why | **高** | 低 |
| Step 2 形态探索 | SPM Step 1b 价值锚定 | **中** | 低 |
| Step 3 望远镜收缩 | SPM Step 2 User Stories 分层 | **中** | 低 |
| Step 4 Gap 对比 | **无对应** | 零 | **高** |
| Step 5 Phase 规划 | **无对应**（SPM 只管单 Phase） | 零 | **高** |
| Step 6 Phase Brief | SPM 的输入 | 低 | 中 |

**核心判断**：Step 4 + Step 5 是 SSA 的真正增量价值。Step 1-3 与 SPM 显著重叠。

### 1.4 总评

| 维度 | 评分 | 说明 |
|------|:----:|------|
| 问题真实性 | 8/10 | 痛点真实存在，但 TG 系列已部分缓解 |
| 方法论质量 | 9/10 | 专业、有据，融合合理 |
| 增量价值 | 6/10 | Step 4+5 是真正增量，Step 1-3 与 SPM 重叠 |
| 可执行性 | 6/10 | 设计完备但偏重，5 个开放问题未决 |
| 时机合适度 | 4/10 | 当前应聚焦功能开发 |
| 长期战略性 | 8/10 | 项目规模继续增长时会变得必要 |

**总分：~7/10 — 有价值的设计，但不是现在实施的优先级。**

---

## 二、采访式提问（Spec Interview）专项调研

### 2.1 学术证据

**LLMREI 研究**（33 次访谈，对照实验）— 目前最强实证：
- AI 采访者提取了 **73.7% 的需求**（60.9% 完整 + 12.8% 部分）
- 错误率与**训练过的人类采访者相当**
- 关键发现：**简单提示词比复杂提示词效果更好**
- 来源：`arxiv.org/html/2507.02564v1`

**系统文献综述**（2022-2024）：
- 论文数从 2022 年 4 篇爆增到 2024 年 113 篇
- >90% 研究处于早期阶段，仅 1.3% 进入生产
- 三大挑战：可重现性(66.8%)、幻觉(63.4%)、可解释性(57.1%)
- 来源：`onlinelibrary.wiley.com/doi/full/10.1002/spe.70029`

### 2.2 行业实践

| 工具/框架 | 做法 | 关键机制 |
|-----------|------|---------|
| Claude Code Plan Mode | 先只读探索 + 提问澄清，再动手 | 结构化"先问后做" |
| GitHub Spec Kit `/speckit.clarify` | 强制标记 `[NEEDS CLARIFICATION]`，覆盖式提问 | 防止 AI 自行假设 |
| Filip Kowalski 工作流 | 给 Claude 特性 spec，让它先采访实现细节再写代码 | 采访→理解→执行 |
| IntentSpec (Pathmode.io) | 7 组件结构：Objective + Health Metrics + Stop Rules + Decision Authority | 告诉 Agent 何时停止 |
| Augment Living Specs | 双向更新：需求变→Agent 更新；Agent 完成→spec 更新 | 防止规格腐化 |

来源：
- `agentfactory.panaversity.org/docs/General-Agents-Foundations/spec-driven-development`
- `intentspec.org`
- `augmentcode.com/guides/living-specs-for-ai-agent-development`

### 2.3 两种模式对比

| 维度 | 生成-确认（当前 SPM） | 采访-综合（Spec Interview） |
|------|---------------------|--------------------------|
| 信息流向 | AI→USER（确认） | USER→AI（输入） |
| USER 参与度 | **低**——阅读+盖章 | **高**——主动思考+回答 |
| 橡皮图章风险 | **高**——NN/g 研究证实人类倾向于不仔细看就批准 | **低**——必须主动回答 |
| 疲劳风险 | 低 | **中**——NN/g 10 人中仅 3 人觉得 AI 采访"自然" |
| 覆盖盲区 | AI 只生成它想到的 | AI 可以问 USER 没主动提到的维度 |
| 效率 | 快（1 轮） | 慢（3-5 轮） |

### 2.4 关键风险

1. **讨好偏差（Sycophancy）**：NN/g 研究发现 AI 采访者倾向于迎合受访者
2. **疲劳**：多轮问答对 USER 有认知负担
3. **无非语言线索**：AI 无法读取犹豫、不确定等信号

来源：`nngroup.com/articles/ai-interviewers/`

### 2.5 行业共识

**新兴共识倾向混合模式**：AI 采访提取意图 → AI 生成结构化 spec → 人类审查 gap → spec 成为活文档。纯采访和纯生成-确认都有缺陷，混合是最优。

---

## 三、建议方案：SPM Step 0.5 需求采访

### 3.1 定位

在 SPM Step 1（5-Why）前加一个**可选**的采访环节，根据复杂度决定是否执行。

### 3.2 触发 / 跳过条件

**触发（二选一）**：
- USER 的输入少于 3 句话且涉及新系统
- USER 明确说"不确定" / "大概想做" / "有个想法"

**跳过**：
- USER 已给出详细需求描述（≥10 句话或已有 Brief）
- 纯 bugfix / 小改动
- USER 明确说"跳过采访，直接分析"

### 3.3 执行规则

```markdown
### Step 0.5：需求采访（Spec Interview）

**纪律**：
1. 一次只问 1 个问题
2. 先问后整理——不得先输出分析再让 USER 确认
3. 聚焦 USER 没主动提到的维度（禁止纯确认性提问）
4. 允许"不确定"——标记 [待决]
5. 3-5 轮后整理结构化摘要交 USER 确认

**问题框架**（按顺序，按需跳过）：
1. 核心体验："做完这个，玩家会感受到什么不同？"
2. 边界："这个系统一定不做什么？"
3. 触发条件："什么情况下会触发？由谁/什么驱动？"
4. 与已有系统关系："它和 [最相关的现有系统] 是什么关系？"
5. 成功标准："你怎么判断它做成了？"

**产出**：
- 需求摘要（≤10 行）
- [待决] 标记的开放问题列表
- → 作为 Step 1 的输入（替代 USER 的原始一句话）
```

### 3.4 与现有 SPM 的衔接

```
当前：USER 想法 → SPM Step 1（5-Why）→ Step 2（PRD）→ ...
改后：USER 想法 → [Step 0.5 采访（条件触发）] → SPM Step 1（5-Why，输入更充分）→ ...
```

### 3.5 为什么不用 SSA 的完整 Spec Interview

| SSA 完整版 | 精简版 Step 0.5 | 理由 |
|-----------|----------------|------|
| Step 1-3 全部 Spec Interview（≥9 轮） | 仅 3-5 轮 | 避免疲劳（NN/g 警告） |
| 复杂度分级 Lite/Standard/Full | 二元：触发/跳过 | 减少判断成本 |
| 苏格拉底假设挑战 | 不做 | 讨好偏差风险——AI 挑战人类假设效果存疑 |
| 假设映射 2×2 矩阵 | 不做 | SPM Step 1 的 Pre-Mortem 已覆盖 |

**SPM SKILL.md 预估改动量**：~30 行。

---

## 四、综合建议

| # | 改动 | 成本 | 价值 | 优先级 |
|---|------|:----:|:----:|:------:|
| 1 | SPM +Step 0.5 需求采访（精简版） | ~30 行 SKILL.md | 高 | **推荐** |
| 2 | SGA +grep 证据要求（提取自 SSA Step 4） | ~10 行 SKILL.md | 高 | **推荐** |
| 3 | SPM +Self-Interview checklist（提取自 SSA Step 5） | ~15 行 SKILL.md | 中 | 可选 |
| 4 | 完整 SSA Skill 实施 | ~600 行新 SKILL.md | 低（当前） | 推迟 |

---

## 五、待 USER 决策

- [ ] 是否采纳 Step 0.5 需求采访方案？
- [ ] 是否采纳 SGA grep 证据要求？
- [ ] 是否采纳 Self-Interview checklist？
- [ ] SSA 完整实施推迟到什么时候？

---

## 参考文献索引

| 来源 | 类型 | 核心贡献 |
|------|------|---------|
| LLMREI (arxiv 2507.02564) | 学术论文 | AI 采访提取 73.7% 需求，与人类相当 |
| NN/g AI Interviewers | 用户研究 | 10 人中 3 人觉得自然；讨好偏差 |
| IntentSpec (intentspec.org) | 框架 | Stop Rules + Health Metrics |
| Augment Living Specs | 产品 | 双向 spec 更新 |
| GitHub Spec Kit | 工具 | `[NEEDS CLARIFICATION]` 强制标记 |
| SDD 30+ Frameworks (Medium) | 综述 | Spec-Driven Development 行业全景 |
| Agent Factory Ch.16 | 教程 | Spec Interview 实操 |
| Systematic Literature Review (SPE) | 学术综述 | 113 篇论文分析，1.3% 进入生产 |
