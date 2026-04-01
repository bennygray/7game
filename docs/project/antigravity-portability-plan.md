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

- [x] 确认 Antigravity 是否支持子代理
- [x] 确认 Antigravity 文件读写/搜索能力
- [ ] 确认后实施上述修改

---

## Antigravity 能力验证报告

> **验证日期**：2026-04-01 | **验证方式**：Antigravity 环境内自检

### 1. 子代理支持 → `has_subagent: false`

Antigravity 有 `browser_subagent` 工具，但**无法替代** Claude Code 的 `@doc-reviewer` 独立上下文审查：

| 对比项 | Claude Code | Antigravity |
|--------|------------|-------------|
| 子代理类型 | 自定义 Agent（`@doc-reviewer` 等） | 仅 `browser_subagent`（浏览器操作） |
| 独立上下文隔离 | ✅ 每个子代理有独立上下文 | ❌ 无法隔离审查上下文 |
| 用途 | 代码审查、文档审查等通用任务 | 仅限浏览器交互（点击、导航、截图） |

**结论**：Party Review 需走 **B 路径（内联审查协议）**。

### 2. 文件读写/搜索能力 → 完全支持

| 能力 | 工具 | 状态 |
|------|------|------|
| 读文件 | `view_file`（支持行范围） | ✅ |
| 写文件 | `write_to_file` | ✅ |
| 编辑文件 | `replace_file_content` / `multi_replace_file_content` | ✅ |
| 文本搜索 | `grep_search`（ripgrep，正则/字面量） | ✅ |
| 目录浏览 | `list_dir` | ✅ |
| 命令执行 | `run_command`（PowerShell） | ✅ |

SKILL.md 流程中的所有文件操作均可正常执行。

### 3. 其他能力

| 能力 | 状态 | 说明 |
|------|------|------|
| Skill 路由（`/SPM` `/SGA` `/SGE`） | ✅ 支持 | Antigravity 有原生 Skill 系统 |
| Hooks（pre-commit 等） | ❌ 不支持 | 无 hook 机制 |
| Agent Memory | ✅ 支持 | KI（Knowledge Items）系统 + 会话日志 |

### 推荐 `local-env.yaml` 配置

```yaml
has_subagent: false      # browser_subagent 无法替代独立上下文审查
has_skill_routing: true   # Antigravity 原生支持 Skill 路由（与文档预设不同）
has_hooks: false          # 无 hook 机制
```

> **注意**：`has_skill_routing` 与原方案预设值（`false`）不同。Antigravity 实际支持 `/SPM` `/SGA` `/SGE` 路由，无需降级为手动触发。
