# Party Review 防走过场改进计划 v1.2

> **类型**：基础设施改进（跨 Phase）
> **创建日期**：2026-03-31
> **目标**：解决 Party Review "自编自审"确认偏误，提升角色代入深度和证据要求

---

## Context

Party Review 当前存在"自编自审"确认偏误：角色背景过浅（2 行），审查沦为 checklist 打钩，PASS 判定缺乏证据支撑。本方案围绕 **persona 深度**、**证据要求**、**角色适配** 三点改进。

---

## 改动总览（11 个文件，12 个 Task）

| # | 文件 | 改动类型 | 预估行数 |
|---|------|---------|---------|
| 1 | `_shared/review-protocol.md` | 插入"审查独立性要求"段 + L2 降级证据 + 汇总格式 | +12 行 |
| 2 | `personas/devil-pm.md` | 重写角色背景 + 输出格式提示 | ~+6 行 |
| 3 | `personas/adversarial-qa.md` | 同上 | ~+6 行 |
| 4 | `personas/paranoid-architect.md` | 同上 | ~+6 行 |
| 5 | `personas/senior-programmer.md` | 同上 | ~+6 行 |
| 6 | `personas/numerical-designer.md` | 同上 | ~+6 行 |
| 7 | `personas/project-manager.md` | 同上 | ~+6 行 |
| 8 | `personas/senior-player.md` | 同上 | ~+6 行 |
| 9 | `skills/product-manager/SKILL.md` | 追加角色适配规则 | +10 行 |
| 10 | `skills/architect/SKILL.md` | 追加角色适配规则 | +10 行 |
| 11 | `skills/engineer/SKILL.md` | 追加角色适配规则 | +10 行 |
| 12 | 7 个 persona 输出格式 | `[分析]` → `[基于证据的分析，PASS 需引用行号/章节]` | 合并到 2~8 |

---

## 三大策略

### 策略 1：深化 Persona 角色代入

每个 persona 的 `## 角色背景` 从 2 行扩展到 ~8 行，增加三要素：
- **职业创伤**（一个具体失败经历）
- **审查思维方式**（How I Think）
- **最关心的一件事**（一句话锚点）

同时将输出格式模板的 `[分析]` 改为 `[基于证据的分析，PASS 需引用行号/章节]`。

### 策略 2：审查证据规则

在 review-protocol.md 的 L1 段后插入 2 条核心规则：
1. **PASS 需要证据锚点**
2. **禁止复述作者结论**

在 L2 步骤 4 追加降级证据要求（合并到现有流程，不新建段落）。

### 策略 3：角色适配规则

在三个 SKILL.md 的 Party Review Gate 段追加适配规则表，按 Phase 类型跳过不适用的角色/维度。

---

## 不改动的部分

| 模块 | 原因 |
|------|------|
| 维度定义（各角色 D1~D7） | 维度合理，问题在角色深度和证据 |
| L0 / L2 / L3 协议主体 | 机制正确，仅微调 L2 步骤 4 |
| 反合理化对照表 | 保持不变 |
| cove-protocol.md | 不改 |

---

## 执行顺序

1. Task 1：review-protocol.md
2. Task 2~8 + 12：7 个 persona 文件（并行）
3. Task 9~11：3 个 SKILL.md（并行）

## 验证方式

1. 逐一确认 11 个文件改动正确
2. review-protocol.md 版本号 v1.1 → v1.2
3. 所有 persona 背景段 ≤8 行
4. 下一个 Phase Party Review 中观察证据锚点出现率
