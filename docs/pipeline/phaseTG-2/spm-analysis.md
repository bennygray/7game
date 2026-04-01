# Phase TG-2 — SPM 分析过程

> **日期**：2026-04-02 | **分析师**：SPM
> **需求来源**：FB-020(b) + TG-1 walkthrough 遗留项
> **前置**：Phase TG-1 完成（三层拦截机制）

---

## 1. 需求债务检查

**FB-020(b)** 完全匹配本 Phase：
- reviewer 上下文交付协议
- SGA Step 5 扩展 5.6-5.9
- INDEX.md 补全

本 Phase 清偿 FB-020(b)。

---

## 2. 第一性原理解构

### 2.1 5-Why 根因链

```
为什么需要 TG-2？
  → TG-1 只修了"判定结果不可自相矛盾"，审查质量仍有系统性风险
为什么审查质量有风险？
  → @doc-reviewer 在独立上下文中启动，缺少项目背景，审查可能浮于表面
为什么缺少背景信息？
  → 当前调用协议没有标准化"必须交付哪些上下文文件"
为什么 SGA Step 5 需要扩展？
  → 5.1-5.5 只覆盖类型/签名/副效果/Handler 四类关联，遗漏测试脚本/文档一致性/回归范围
为什么 INDEX 需要补全？
  → INDEX.md 停留在 Phase H-γ/IJ-PoC，后续 8+ Phase 的 50+ 文件未注册
```

**根因**：流程文档的**可发现性**和**审查深度**存在基础设施缺陷。

### 2.2 Invariant 声明

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | doc-reviewer 收到的上下文必须足够独立执行四层防线 | 审查沦为形式主义，BLOCK 漏检 |
| I2 | SGA Step 5 审计维度必须覆盖所有可能产生编译/运行时错误的关联 | 重复 FB-019 教训（遗漏修改文件） |
| I3 | INDEX.md 必须是 docs/ 下所有 .md 文件的完整索引 | 新会话无法定位文档，重复劳动 |

### 2.3 最小组件检验

**Reviewer 上下文交付协议** — 没有它，审查质量无法保证，其他治理改进都会打折。

### 2.4 核心体验锚定

| 维度 | 说明 |
|------|------|
| 核心体验 | 任何新会话 AI 助手能在 <60s 内定位所有文档 + 执行高质量审查 |
| ROI | 开发成本 **S** / 体验增量 **4/5** 分（每个后续 Phase 受益） |
| 循环挂载 | 每次 Pipeline 执行时自动消费（审查协议 → 审查 → 编码） |

---

## 3. 代码对账

### 3.1 目标文件确认

| 文件 | 存在 | 当前版本 |
|------|:----:|---------|
| `.agents/skills/_shared/review-protocol.md` | ✅ | v1.2 |
| `.agents/skills/architect/SKILL.md` | ✅ | 含 Step 5.1-5.5 |
| `.agents/skills/product-manager/SKILL.md` | ✅ | — |
| `.agents/skills/engineer/SKILL.md` | ✅ | — |
| `docs/INDEX.md` | ✅ | 停留在 H-γ/IJ-PoC |

### 3.2 INDEX.md 差距审计

| 类别 | INDEX 已有 | 实际存在 | 缺失数 |
|------|-----------|---------|:------:|
| PRD/Analysis | 12 | 20 | **8** |
| TDD | 9 | 13 | **4** |
| User Stories | 11 | 15 | **4** |
| 验证脚本 | 3 | 12+ | **9+** |
| Pipeline Phase 行 | ~10 Phase | ~20 Phase | **10+** |

**缺失 Phase**（全部文档未注册）：
X-α、X-β、X-γ、Y、Z、IJ(gate files)、J-Goal、I-alpha、TG-1、infra-review-v1.2、trinity-guardian

---

## 4. 三大交付物定义

### D1: Reviewer 上下文交付协议

**问题**：当前 SKILL.md 中调用 @doc-reviewer 的指令只包含"审查文件 + 角色配置"，没有标准化的上下文清单。doc-reviewer 在独立上下文中缺少：
- 项目约束（CLAUDE.md 核心规则摘要）
- 关联文档（如审查 TDD 时需要 PRD、architecture 文档）
- 前置审查结论（如 Gate 1 的 WARN 项）

**方案**：在 review-protocol.md 中新增 "§0 上下文交付清单" 段，定义三种 Gate 各自需要的上下文文件列表。同步更新三个 SKILL.md 的 @doc-reviewer 调用模板。

### D2: SGA Step 5 扩展 (5.6-5.9)

**问题**：当前 5.1-5.5 覆盖四类代码关联（类型引用/函数签名/PRD 副效果/Handler 联动），但遗漏：
- 测试脚本影响（修改公式后旧验证脚本可能 fail）
- 文档一致性（TDD 新增文件未在 INDEX/architecture 文档中登记）
- 回归测试范围确定（哪些 test suite 必须跑）
- 存档迁移链完整性（新字段是否需要 migrateVxToVy）

**方案**：新增四个子步骤 5.6-5.9，保持 5.5"产出与校验"为最后一步（重编号为 5.10 或保持 5.5 提前移到末尾后插入）。

### D3: INDEX.md 补全

**问题**：50+ 文件未注册，新会话通过 INDEX 无法发现后半项目文档。

**方案**：一次性补全所有缺失条目，覆盖到 TG-2 自身。

---

## 5. 技术可行性

跳过 — 纯文档修改，已有技术栈。
