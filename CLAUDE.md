# 7game-lite — Claude Code 项目配置

> **本文件是 `.agents/AGENTS.md` 的 Claude Code 适配层。**
> 规则冲突时以 AGENTS.md 为准。完整规范请查阅 AGENTS.md。
> 路径以 `.agents/project.yaml` 为准，此处仅列阅读顺序。

---

## 会话启动协议

任何涉及代码变更、需求变更、项目规划、Bug 修复、代码审查的任务，必须先读文档：

```
Level 1（永远读）：
  0. .agents/project.yaml                 ← 所有文档路径（最先读取）
  1. docs/INDEX.md Quick Orient 区         ← 文档权责表 + 按角色阅读路径
  2. docs/project/MASTER-PRD.md           ← 产品索引（~150行）
  3. docs/design/MASTER-ARCHITECTURE.md   ← 架构索引（~140行）
  4. docs/project/handoff.md              ← 当前断点 + 接手指南
  5. 确认当前活跃 Phase + 读对应 PRD/TDD 文件
  6. 读 docs/pipeline/phaseX/ 过程资产

Level 2（按需读 detail）：
  根据任务类型读对应 detail 文件（→ 见 AGENTS.md §文档模块化规则）
  涉及世界/事件/NPC/道风设计时，读 docs/project/soul-vision-rethinking/06~09
  灵魂远景路线图：docs/project/SOUL-VISION-ROADMAP.md
```

简单问答（技术概念、语法等）可跳过启动协议。

---

## Trinity Pipeline Skill 体系

本项目使用三角色 Skill 流程控制开发，定义在 `.agents/skills/` 下：

| Skill | 角色 | 职责 | Gate |
|-------|------|------|------|
| `/SPM` | 资深产品经理 | What/Why — 需求分析、PRD、User Story | GATE 1 |
| `/SGA` | 资深游戏架构师 | Where/How — TDD、Interface、Pipeline挂载 | GATE 2 |
| `/SGE` | 资深游戏工程师 | Build/Verify — 编码、验证、回归、交接 | GATE 3 |

**路由规则**：SPM 是默认入口 → SGA 需 `[x] GATE 1 PASSED` → SGE 需 `[x] GATE 2 PASSED`

**Claude Code 执行方式**：
- `/SPM` → 读 `.agents/skills/product-manager/SKILL.md`
- `/SGA` → 读 `.agents/skills/architect/SKILL.md`
- `/SGE` → 读 `.agents/skills/engineer/SKILL.md`

---

## 常用命令

```bash
npm run dev              # Vite dev server :5173
npm run build            # 生产构建（tsc + vite build）
npm run ai               # AI 后端 :3001
npm run download-model   # 下载 Qwen 0.8B GGUF
npm run test:regression  # 64 组回归测试
npm run test:ai-stress   # AI 压力测试
```

---

## 规范引用（完整内容见 AGENTS.md）

以下规范的权威定义在 AGENTS.md 中，此处仅列引用指针：

- **编码前置条件** → 见 AGENTS.md §四
- **性能红线** → 见 AGENTS.md §3.1
- **代码规范** → 见 AGENTS.md §3.2
- **模块边界** → 见 AGENTS.md §3.3
- **版本边界** → 见 AGENTS.md §3.5
- **AI 层专项约束** → 见 AGENTS.md §七
- **数值验证** → 见 AGENTS.md §3.7
- **测试脚本管理** → 见 AGENTS.md §3.8
- **回归测试 / Tick Pipeline 挂载** → 见 AGENTS.md §3.9
- **文档模块化规则 / 写入路径映射表** → 见 AGENTS.md §3.10
- **Pipeline 过程资产规范** → 见 AGENTS.md §3.11
- **交接文档** → 见 AGENTS.md §3.12
- **跨项目复用约束** → 见 AGENTS.md §八
- **禁止事项（14 条）** → 见 AGENTS.md §九
