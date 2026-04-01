# Trinity Pipeline — Antigravity 环境适配方案

> **状态**：待实施 | **前置条件**：确认 Antigravity 具体能力
> **日期**：2026-04-01

---

## 背景

两台机器：Claude Code + Antigravity，通过 git 同步。Trinity Pipeline SKILL 深度依赖 Claude Code 机制，需要适配以支持跨环境运行。

## 核心依赖分析

### 硬依赖（会断裂）

- `@doc-reviewer` 子代理调用（Party Review Gate 的核心）
- 独立上下文隔离（防止自编自审）
- 评审循环协议（调用→修复→再调用）

### 软依赖（降级可用）

- `${paths.*}` 路径变量 → AI 读 project.yaml 脑内替换
- `/SPM` `/SGA` `/SGE` Skill 路由 → 用户手动说"读 SKILL.md 执行"
- Agent Memory → Antigravity 可能有自己的机制

### 无依赖（直接可用）

- SKILL 流程主体（Step 1-4）、review-protocol、personas、project.yaml

## 选定方案：环境感知分支（方向 A）

### 1. 环境声明

`.agents/local-env.yaml`（加入 .gitignore，不 track），覆盖 project.yaml 默认值：

```yaml
has_subagent: false
has_skill_routing: false
has_hooks: false
```

SKILL.md bootstrap 时：先读 `project.yaml`，再读 `.agents/local-env.yaml`（如存在则覆盖）。

### 2. Party Review A/B 分支

SKILL.md 中 Party Review 段落改为条件分支：
- **A（has_subagent = true）** → 调用 @doc-reviewer 独立上下文（现有流程不变）
- **B（has_subagent = false）** → 执行内联审查协议

### 3. 内联审查协议

新建 `.agents/skills/_shared/inline-review-protocol.md`，五步流程：

| Step | 名称 | 说明 |
|------|------|------|
| R1 | 角色切换声明 | 输出声明后切换到审查者视角 |
| R2 | 强制证据搜索 | 每个审查维度至少一次 grep/搜索验证 |
| R3 | 反橡皮图章 | 必须找到 ≥1 WARN/BLOCK；全 PASS 需声明审查盲区风险 |
| R4 | USER 确认门控 | 内联模式下强制用户确认（子代理模式下可选） |
| R5 | 降级标注 | 报告标注"内联审查产出，偏差风险较高" |

### 4. Skill 路由降级

无 Skill routing 时，用户手动触发：
- "执行 SPM 流程" 或 "读 `.agents/skills/product-manager/SKILL.md` 并执行"
- "执行 SGA 流程" 或 "读 `.agents/skills/architect/SKILL.md` 并执行"
- "执行 SGE 流程" 或 "读 `.agents/skills/engineer/SKILL.md` 并执行"

## 需要修改的文件

| 文件 | 改动 |
|------|------|
| `.agents/project.yaml` | +environment 段（默认值） |
| `.gitignore` | +`.agents/local-env.yaml` |
| `.agents/skills/product-manager/SKILL.md` | Party Review A/B 分支 |
| `.agents/skills/architect/SKILL.md` | Party Review A/B 分支 |
| `.agents/skills/engineer/SKILL.md` | Party Review A/B 分支 |
| 新建 `.agents/skills/_shared/inline-review-protocol.md` | 内联审查协议 |

## 待办

- [ ] 确认 Antigravity 是否支持子代理
- [ ] 确认 Antigravity 文件读写/搜索能力
- [ ] 确认后实施上述修改
