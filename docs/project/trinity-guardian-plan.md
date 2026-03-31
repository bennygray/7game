# Trinity Guardian — 治理执行强化系统

> **创建日期**：2026-04-01 | **版本**：v1.0
> **状态**：规划完成，待 M0 环境验证
> **定位**：跨 Phase 基础设施 — 强化 Trinity Pipeline 的执行纪律
> **目标**：文档执行率 40% → 80%+，Party Review 从橡皮图章变为真正独立审查
> **技术栈**：Claude Code Subagent + Hooks + Python 确定性检查
> **执行环境**：Claude Desktop App（M0 验证环境）
> **前置关系**：替代 multi-agent-plan.md（方案 A）和 multi-agent-plan-b.md（方案 B）

---

## 一、问题诊断

### 1.1 当前状态

Trinity Pipeline 的治理框架设计完整（3 个 SKILL.md + AGENTS.md + review-protocol + CoVe + 7 个 persona），
但**实际文档执行率仅 40%**。规则写得好但执行不到位。

### 1.2 五个结构性根因

| # | 根因 | 机制 | 解决方向 |
|---|------|------|---------|
| **R1** | 同上下文自审 | 写 PRD 的 Claude 和审查 PRD 的 Claude 是**同一个 context**，自我确认偏差导致全部 ✅ | **Subagent 上下文隔离** |
| **R2** | Prompt 注意力稀释 | SPM 引用 11 个外部文件，token 增加 → 注意力下降 | **Subagent 精简上下文** |
| **R3** | 零确定性强制 | 所有规则是 prompt 指令，AI 忘了就跳过 | **Hook + Python 脚本强制** |
| **R4** | 角色扮演缺陷 | 同一 Claude 扮演 R1~R7 是独角戏，CoVe 的"独立回答"在同一 context 中无法实现 | **Subagent 独立角色** |
| **R5** | 交接更新无底洞 | SGE Step 4 有 15 项文档联动更新，最容易被 compaction 吞噬 | **Stop Hook 自动检查** |

---

## 二、系统架构

### 2.1 组件总览

```
Claude Code（父 agent，交互模式）
  │
  ├── 你和 Claude 对话（SPM/SGA/SGE 正常流程）
  │
  ├── Claude 写 PRD → 调用 @doc-reviewer 独立审查
  │   └── doc-reviewer（Subagent，独立上下文，Opus 模型）:
  │       ├── 读取 MEMORY.md（历史审查模式）
  │       ├── Read 工具读取目标文件全文
  │       ├── Grep 搜索项目中的相关引用
  │       ├── 执行 L0 → L1 → L2 → L3 四层防线
  │       ├── Devil's Advocate 反向验证
  │       ├── 输出结构化报告 → 返回父 agent
  │       └── 更新 MEMORY.md（审查经验积累）
  │
  ├── Hook: SubagentStop → python scripts/gate-check.py --auto
  │   └── 确定性验证：文件存在 + 签章 + 联动文档检查
  │
  └── Hook: Stop → python scripts/doc-integrity-check.py
      └── 每次会话结束前：检查 handoff 更新、pipeline 资产、文档联动
```

### 2.2 文件结构（全部需要 git 同步）

```
d:\7game\
├── .claude/
│   ├── agents/
│   │   └── doc-reviewer.md              # ← 核心组件 1（已创建）
│   └── settings.json                    # ← 核心组件 2（已创建）
├── scripts/
│   ├── gate-check.py                    # ← 核心组件 3（已创建）
│   └── doc-integrity-check.py           # ← 核心组件 4（已创建）
├── .reviews/                            # ← 审查记录目录
│   └── .gitkeep
└── docs/project/
    └── trinity-guardian-plan.md          # ← 本文件
```

> `.claude/agent-memory/doc-reviewer/MEMORY.md` 由 Claude Code 自动创建和管理。

---

## 三、核心组件清单

| # | 文件 | 说明 | 行数 |
|---|------|------|:---:|
| 1 | `.claude/agents/doc-reviewer.md` | 独立审查 Subagent（Opus 模型） | ~280 |
| 2 | `.claude/settings.json` | Hooks 配置（SubagentStop + Stop） | ~20 |
| 3 | `scripts/gate-check.py` | 确定性 Gate 验证器 | ~180 |
| 4 | `scripts/doc-integrity-check.py` | 文档完整性检查器（Stop Hook 调用） | ~110 |

全部文件已创建在项目目录中，git push 后即可在 Claude Code 环境使用。

---

## 四、现有文件修改方案（M3 阶段执行）

> 以下修改在 Claude Code 环境中 M3 阶段执行，不在 Antigravity 中提前修改。

### 4.1 SPM SKILL.md — Party Review Gate 段替换

将 L215~L243 替换为 `@doc-reviewer` 调用指令 + Gate 1 参数。

### 4.2 SGA SKILL.md — Party Review Gate 段替换

将 L89~L107 替换为 `@doc-reviewer` 调用指令 + Gate 2 参数。

### 4.3 SGE SKILL.md — Party Review Gate 段替换

将 L150~L163 替换为 `@doc-reviewer` 调用指令 + Gate 3 参数。

### 4.4 AGENTS.md — 新增 §3.13

新增"独立审查规范"段落，明确 `@doc-reviewer` 为 Party Review 唯一执行方式。

> 具体替换内容见 `.claude/agents/doc-reviewer.md` 中的调用说明。

---

## 五、里程碑计划

### M0：环境验证（半天）— Claude Desktop App

| # | 验证项 | 重要度 |
|---|--------|:---:|
| 0.1 | Subagent 基本可用（创建测试 agent → `@test-agent` 调用） | **致命** |
| 0.2 | Subagent 上下文隔离（Subagent 无法访问父 agent 对话历史） | **致命** |
| 0.3 | `disallowedTools` 有效（Subagent 尝试 Write → 被拒绝） | **致命** |
| 0.4 | Persistent Memory 可写（`memory: project` → MEMORY.md 写入） | 高 |
| 0.5 | Persistent Memory 跨会话（新会话 → MEMORY.md 可读） | 高 |
| 0.6 | Stop Hook 触发（配置 → 结束会话 → 脚本执行） | 高 |
| 0.7 | SubagentStop Hook 触发（Subagent 完成 → hook 执行） | 高 |
| 0.8 | Python 可用（`python --version`） | **致命** |

**Gate 准出**：0.1~0.3 + 0.8 全部通过

### M1：独立审查员上线（2 天）

- 部署 `doc-reviewer.md` + `gate-check.py`
- 用已有 `phaseX-gamma-PRD.md` 做真实审查对比测试
- 验证审查质量优于同上下文审查

### M2：文档完整性 Hooks（2 天）

- 部署 `.claude/settings.json` + `doc-integrity-check.py`
- 验证 Stop / SubagentStop hooks 正常触发

### M3：SKILL 集成（2 天）

- 修改 3 个 SKILL.md + AGENTS.md
- 在真实 Phase 中端到端验证

---

## 六、风险分析

| 风险 | 可能性 | 影响 | 缓解 |
|------|:---:|:---:|------|
| Subagent 在 Claude Desktop App 中不可用 | 中 | 高 | M0 验证；退回 CLI 模式 |
| doc-reviewer 审查浮于表面 | 中 | 高 | Devil's Advocate + MEMORY + Opus 模型 |
| Hooks 不稳定 | 低 | 中 | 手动运行脚本降级 |
| doc-reviewer 太 "nice" | 中 | 高 | prompt 调优 + 连续全 PASS 警告 |

---

## 七、与现有方案的关系

| 文件 | 状态 |
|------|:---:|
| `multi-agent-plan.md`（方案 A） | 🔶 搁置 — gate-check.py 洞见已吸收 |
| `multi-agent-plan-b.md`（方案 B） | 🔶 搁置 — Subagent 隔离洞见已吸收 |
| `trinity-guardian-plan.md`（本方案） | ✅ 活跃 |
