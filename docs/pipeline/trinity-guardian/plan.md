# Trinity Guardian 方案 B — 详细实施计划

> **创建日期**：2026-04-01 | **状态**：计划审核中
> **方案选择**：方案 B — Subagent 执行现有协议（合并而非叠加）
> **核心原则**：doc-reviewer 是现有 review-protocol + personas 的"干净上下文执行器"，不重写协议

---

## 一、变更总览

### 1.1 要改什么

| 文件 | 操作 | 变更性质 |
|------|:---:|---------|
| `scripts/gate-check.py` | 修改 | Bug 修复 + 路径对齐 |
| `scripts/doc-integrity-check.py` | 不动 | 设计合理，无需改动 |
| `docs/project/doc-reviewer.md` | 重写 | 去重 → 引用现有协议 |
| `.claude/agents/doc-reviewer.md` | 新建 | 从上面的重写结果部署 |
| `.claude/settings.json` | 修改 | 添加 2 个 Hook |
| `.agents/skills/product-manager/SKILL.md` | 修改 | Party Review 执行方式改为 @doc-reviewer |
| `.agents/skills/architect/SKILL.md` | 修改 | 同上 |
| `.agents/skills/engineer/SKILL.md` | 修改 | 同上 |
| `docs/project/multi-agent-plan.md` | 修改 | 头部标记 SUPERSEDED |
| `docs/project/multi-agent-plan-b.md` | 修改 | 头部标记 SUPERSEDED |
| `docs/project/trinity-guardian-plan.md` | 修改 | 更新状态 + 反映方案 B 调整 |

### 1.2 不改什么

| 文件 | 不动原因 |
|------|---------|
| `.agents/AGENTS.md` | 不需要新增 §3.13，Subagent 是执行机制变更不是新规则 |
| `_shared/review-protocol.md` | 协议本身不变，只是执行环境变了 |
| `_shared/cove-protocol.md` | 不变 |
| `_shared/personas/*.md`（7 个） | 不变，Subagent 直接引用 |
| `_shared/templates/*.md` | 不变 |

---

## 二、详细任务拆分

### Sprint 1：确定性强制层（零侵入，独立可交付）

#### T1.1 修复 gate-check.py 退出码

**文件**：`scripts/gate-check.py`
**改动**：第 114 行

```python
# 现有：
return 0 if all_pass else 1

# 改为：
return 0 if all_pass else 2
```

**原因**：Claude Code Hook 约定 exit 2 = block，exit 1 只是报错不阻断。不改这个，SubagentStop Hook 检测到 Gate 失败也不会阻断流程。

**影响范围**：仅影响 `report()` 函数返回值，无其他副作用。

---

#### T1.2 gate-check.py 审查记录路径对齐

**文件**：`scripts/gate-check.py`
**改动**：`review_exists()` 和 `check_review_has_substance()` 两个函数

**现有路径**：`.reviews/{phase}-{stage}-r*.md`
**项目实际惯例**：`docs/pipeline/{phase}/review.md`

需要决策：
- 选项 A：统一到 `docs/pipeline/{phase}/review.md`（对齐现有惯例）
- 选项 B：按 Gate 区分为 `docs/pipeline/{phase}/review-g{N}.md`

**建议选项 B**：因为一个 Phase 有 3 个 Gate，每个 Gate 产出独立审查报告。现有 `review.md` 是人工审查记录，与 Subagent 审查可共存。

具体改动：

```python
# review_exists() — 第 37-40 行
def review_exists(phase, stage):
    """检查审查记录是否存在"""
    # 支持两种路径：pipeline 目录（新）和 .reviews 目录（兼容）
    pipeline_pattern = f"docs/pipeline/{phase}/review*.md"
    legacy_pattern = f".reviews/{phase}-{stage}-r*.md"
    return len(glob.glob(pipeline_pattern)) > 0 or len(glob.glob(legacy_pattern)) > 0

# check_review_has_substance() — 第 43-56 行
def check_review_has_substance(phase, stage):
    """检查审查报告是否包含实质内容"""
    files = sorted(glob.glob(f"docs/pipeline/{phase}/review*.md"))
    if not files:
        files = sorted(glob.glob(f".reviews/{phase}-{stage}-r*.md"))
    if not files:
        return False
    # ... 其余逻辑不变
```

**影响范围**：仅影响审查记录的查找路径。

---

#### T1.3 gate-check.py detect_phase() 增强

**文件**：`scripts/gate-check.py`
**改动**：`detect_phase()` 函数（第 160-173 行）

增加从 `docs/project/handoff.md` 解析活跃 Phase 的逻辑：

```python
def detect_phase():
    """从 handoff.md 或 pipeline 目录检测最近活跃的 Phase"""
    # 优先从 handoff.md 解析
    handoff = "docs/project/handoff.md"
    if os.path.exists(handoff):
        with open(handoff, 'r', encoding='utf-8') as f:
            for line in f:
                m = re.search(r'当前活跃 Phase[：:]\s*Phase\s+(\S+)', line)
                if m:
                    phase_name = m.group(1)
                    # 转换为目录名格式（如 "IJ" → "phaseIJ"）
                    candidate = f"phase{phase_name}"
                    if os.path.isdir(f"docs/pipeline/{candidate}"):
                        return candidate

    # 降级：按 mtime 排序（原有逻辑）
    pipeline_dir = "docs/pipeline"
    # ... 保留原有代码
```

**影响范围**：仅影响 `--phase auto` 的检测逻辑。

---

#### T1.4 合并 settings.json

**文件**：`.claude/settings.json`

**现有内容**：
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx eslint --no-error-on-unmatched-pattern \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
      }
    ]
  }
}
```

**改为**：
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx eslint --no-error-on-unmatched-pattern \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
      }
    ],
    "SubagentStop": [
      {
        "matcher": "doc-reviewer",
        "type": "command",
        "command": "python scripts/gate-check.py --phase auto --from-review"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "python scripts/doc-integrity-check.py"
      }
    ]
  }
}
```

**注意**：`SubagentStop` 的 matcher 值必须与 doc-reviewer.md frontmatter 中的 `name` 字段完全一致。

**待确认**：`--from-review` 模式目前全跑 3 个 Gate，是否需要改为只跑相关 Gate？（见 T1.5）

---

#### T1.5 gate-check.py `--from-review` 模式优化

**文件**：`scripts/gate-check.py`
**改动**：第 196-199 行

**决策**：选项 B — 只跑当前 Gate（从 handoff.md 推断当前阶段）

**现有行为**：全跑 3 个 Gate
```python
elif args.from_review:
    check_gate_1(phase)
    check_gate_2(phase)
    check_gate_3(phase)
```

**问题**：SubagentStop 在 Gate 1 审查后触发，但 Gate 2/3 必然 FAIL（TDD/代码还不存在），造成误报阻断。

**改为**：从 handoff.md 推断当前处于哪个 Gate，只检查那一个。

```python
def detect_current_gate(phase):
    """从 handoff.md 和文件存在性推断当前 Gate"""
    tdd_path = find_tdd(phase)
    prd_path = find_prd(phase)

    # 有 TDD 且 Gate 2 已签章 → 当前在 Gate 3
    if tdd_path and has_gate_signature(tdd_path, 2):
        return 3
    # 有 PRD 且 Gate 1 已签章 → 当前在 Gate 2
    if prd_path and has_gate_signature(prd_path, 1):
        return 2
    # 否则 → 当前在 Gate 1
    return 1

# --from-review 入口改为：
elif args.from_review:
    gate = detect_current_gate(phase)
    if gate == 1:
        sys.exit(check_gate_1(phase))
    elif gate == 2:
        sys.exit(check_gate_2(phase))
    elif gate == 3:
        sys.exit(check_gate_3(phase))
```

**推断逻辑**：
- Gate 2 已签章 → 说明已进入 SGE 编码阶段 → 检查 Gate 3
- Gate 1 已签章但 Gate 2 未签章 → 说明已进入 SGA 阶段 → 检查 Gate 2
- Gate 1 未签章 → 说明还在 SPM 阶段 → 检查 Gate 1

**注意**：当前 `--from-review` 没有 `sys.exit()`，需要添加。

---

#### T1.6 冒烟测试

**不涉及代码改动。验证步骤**：

1. `python scripts/gate-check.py --phase phaseIJ --gate 1` — 验证路径能找到 phaseIJ 的 PRD 和审查记录
2. `python scripts/gate-check.py --phase phaseIJ --gate 2` — 验证 TDD 路径
3. `python scripts/gate-check.py --phase auto --from-review` — 验证 handoff.md 解析

**预期**：部分检查项会 FAIL（如审查记录格式不匹配），这是正常的，验证的是脚本本身能正确运行和检测。

---

### Sprint 2：doc-reviewer 改造（核心变更）

#### T2.1 重写 doc-reviewer.md

**输入文件**：`docs/project/doc-reviewer.md`（现有 178 行）
**输出文件**：`docs/project/doc-reviewer.md`（改造后 ~130 行）

**改造原则**：
- frontmatter 改用 `tools` 白名单
- 删除重复的 L0/L1/L2/L3 逻辑，改为引用
- 保留 Subagent 特有的增量价值（Devil's Advocate + MEMORY + 报告格式）

**逐段改造清单**：

| 段落 | 现有内容 | 改造为 |
|------|---------|--------|
| frontmatter | `disallowedTools: Write, Edit` | `tools: Read, Glob, Grep` |
| frontmatter | 无 `permissionMode` | 删除 `permissionMode: plan`（plan 模式与审查执行冲突） |
| Step 0 | 保留 | 保留（上下文加载是 Subagent 特有的） |
| Step 1 | 按 Gate 读取文件 | 保留（Subagent 特有的按需文件加载） |
| Step 2 L0 | 重写了 Content Traceability | **删除，改为**：`读取 _shared/review-protocol.md §L0 执行` |
| Step 2 L1 | 3 张自定义维度表（Gate 1/2/3） | **删除维度表，改为**：`根据父 agent 传入的角色配置，读取对应 personas/*.md，按其维度清单审查` |
| Step 2 L2 | 重写了 CoVe | **删除，改为**：`读取 _shared/cove-protocol.md 执行` |
| Step 2 L3 | 一行引用 | 保留 |
| Step 3 Devil's Advocate | 保留 | 保留（Subagent 增量价值） |
| Step 4 报告格式 | 保留 | 保留 |
| Step 5 MEMORY | 保留 | 保留 |
| 硬规则 | 保留 | 保留 |
| 调用方式 | 保留 | **增加**：角色配置传入格式 |

**关键设计决策：角色配置如何传入 Subagent**

父 agent（SKILL.md 中的 Party Review 段）在调用 `@doc-reviewer` 时，将角色列表作为自然语言传入：

```
@doc-reviewer 审查 Phase IJ Gate 1。
PRD: docs/features/phaseIJ-PRD.md
User Stories: docs/design/specs/phaseIJ-user-stories.md（如存在）
角色配置:
  必选: R1(魔鬼PM) R3(数值策划) R5(偏执架构师)
  按需: R2(资深玩家,条件:涉及核心体验变更) R4(项目经理,条件:涉及跨版本影响)
  适配: 全栈（全部保留）
```

doc-reviewer 收到后：
1. 解析角色列表
2. 读取对应 `_shared/personas/{角色}.md`
3. 按每个角色的维度清单执行审查

**关于 `permissionMode: plan`**：

现有设计用了 `permissionMode: plan`，但这会阻止 Subagent 执行 Bash 命令。由于我们已经用 `tools: Read, Glob, Grep` 白名单限制了可用工具，`permissionMode` 是多余的，应删除。

---

#### T2.2 部署 doc-reviewer.md 到 .claude/agents/

**操作**：将 T2.1 改造后的 `docs/project/doc-reviewer.md` 复制到 `.claude/agents/doc-reviewer.md`

**注意**：`docs/project/doc-reviewer.md` 保留为设计稿存档，`.claude/agents/doc-reviewer.md` 是实际部署版本。两份需保持同步，或者只保留 `.claude/agents/` 中的版本，在 `docs/project/` 中放一个指向它的说明。

**建议**：只保留 `.claude/agents/doc-reviewer.md` 一份。`docs/project/doc-reviewer.md` 改为简短说明 + 指向实际文件的路径。避免双份维护。

---

#### T2.3 冒烟测试

1. 在 Claude Code 中调用 `@doc-reviewer` + phaseX-gamma 的 PRD
2. 验证：
   - Subagent 是否正确加载了 personas？
   - 是否引用了 review-protocol.md 的流程？
   - Devil's Advocate 是否在全 PASS 时触发？
   - MEMORY.md 是否被创建/更新？
   - 审查报告格式是否正确？

---

### Sprint 3：SKILL.md 集成

#### T3.1 修改 SPM SKILL.md Party Review 段

**文件**：`.agents/skills/product-manager/SKILL.md`
**改动范围**：L244-L246（执行流程段）

**现有**（L244-L246）：
```markdown
### 执行流程

引用 `_shared/review-protocol.md` 四层防线协议执行。
```

**改为**：
```markdown
### 执行流程

调用 `@doc-reviewer` 在独立上下文中执行审查：

```
@doc-reviewer 审查 Phase [X] Gate 1。
PRD: ${paths.features_dir}/[name]-PRD.md
User Stories: ${paths.specs_dir}/[name]-user-stories.md
角色配置:
  必选: R1(魔鬼PM) R3(数值策划) R5(偏执架构师)
  按需: R2(资深玩家) R4(项目经理)
  适配规则: [参照上方角色适配规则表]
```

> doc-reviewer 会在独立上下文中加载 `_shared/review-protocol.md` 和对应 `personas/*.md`，执行四层防线 + Devil's Advocate。
```

**不动的部分**：
- 角色配置表（L217-L226）— 保留，它定义"选谁"
- 按需激活条件（L228-L232）— 保留
- 角色适配规则（L234-L242）— 保留
- 补充模块（L248-L252，Pre-Mortem + Assumption Audit）— **保留**，这是 SPM 特有的，在 Subagent 审查完成后由父 agent 执行

---

#### T3.2 修改 SGA SKILL.md Party Review 段

**文件**：`.agents/skills/architect/SKILL.md`
**改动范围**：L114-L116（执行流程段）

**现有**（L114-L116）：
```markdown
### 执行流程

引用 `_shared/review-protocol.md` 四层防线协议执行。
```

**改为**：
```markdown
### 执行流程

调用 `@doc-reviewer` 在独立上下文中执行审查：

```
@doc-reviewer 审查 Phase [X] Gate 2。
TDD: ${paths.specs_dir}/[name]-TDD.md
PRD: ${paths.features_dir}/[name]-PRD.md
角色配置:
  必选: R4(项目经理) R5(偏执架构师) R6(找茬QA)
  适配规则: [参照上方角色适配规则表]
```

> doc-reviewer 会在独立上下文中加载 `_shared/review-protocol.md` 和对应 `personas/*.md`，执行四层防线 + Devil's Advocate。
```

**不动的部分**：
- 角色配置表（L91-L97）
- 角色适配规则（L99-L107）
- "挑刺者"模式说明（L109-L112）

---

#### T3.3 修改 SGE SKILL.md Party Review 段

**文件**：`.agents/skills/engineer/SKILL.md`
**改动范围**：L170-L172（执行流程段）

**现有**（L170-L172）：
```markdown
### 执行流程

引用 `_shared/review-protocol.md` 四层防线协议执行。
```

**改为**：
```markdown
### 执行流程

调用 `@doc-reviewer` 在独立上下文中执行审查：

```
@doc-reviewer 审查 Phase [X] Gate 3。
TDD: ${paths.specs_dir}/[name]-TDD.md
User Stories: ${paths.specs_dir}/[name]-user-stories.md
变更文件: [列出本次变更的文件]
角色配置:
  必选: R1(魔鬼PM) R6(找茬QA) R7(资深程序员)
  适配规则: [参照上方角色适配规则表]
```

> doc-reviewer 会在独立上下文中加载 `_shared/review-protocol.md` 和对应 `personas/*.md`，执行四层防线 + Devil's Advocate。
```

**不动的部分**：
- 角色配置表（L152-L158）
- 角色适配规则（L160-L168）

---

#### T3.4 端到端验证

用 Phase IJ 的 SGE 阶段（当前断点）做真实验证：
1. 启动 /SGE 流程
2. 完成编码后触发 Party Review
3. 验证 @doc-reviewer 被正确调用
4. 验证 SubagentStop Hook 触发 gate-check.py
5. 验证 Stop Hook 触发 doc-integrity-check.py

---

### Sprint 4：清理

#### T4.1 标记旧方案文件

**文件 1**：`docs/project/multi-agent-plan.md`
在第 1 行前插入：
```markdown
> 🔴 **SUPERSEDED** — 本方案已被 `trinity-guardian-plan.md` 方案 B 取代。保留为历史参考。

```

**文件 2**：`docs/project/multi-agent-plan-b.md`
同样处理。

---

#### T4.2 更新 trinity-guardian-plan.md

**文件**：`docs/project/trinity-guardian-plan.md`

需要更新的内容：
1. 第 8 行 `状态` 从"规划完成，待 M0 环境验证"改为"方案 B 实施中"
2. 第 74 行"全部文件已创建"改为"核心文件已设计，实际部署通过 Sprint 1-3 完成"
3. 新增一段说明方案 B 的调整：doc-reviewer 引用现有协议而非重写

---

#### T4.3 处理 docs/project/doc-reviewer.md

部署完成后，将 `docs/project/doc-reviewer.md` 替换为简短指向文件：

```markdown
# doc-reviewer 设计稿

> 实际部署版本位于 `.claude/agents/doc-reviewer.md`。
> 本文件为历史设计存档，请勿在此编辑。
```

---

## 三、合理性检查

### 3.1 doc-reviewer 能否有效引用现有协议？

**验证**：Subagent 有 Read 工具，可以读取 `.agents/skills/_shared/review-protocol.md` 和 `personas/*.md`。在 Step 2 中明确指示"读取这些文件并按其流程执行"是可行的。

**风险**：Subagent 的 token 预算。最坏情况下需要读取：
- review-protocol.md（130 行）
- cove-protocol.md（69 行）
- 3 个 personas（平均 65 行 × 3 = 195 行）
- 目标审查文件（PRD/TDD，约 200-400 行）
- 总计 ~600-800 行 ≈ ~3000-4000 tokens

在 Opus 的上下文窗口内完全可行。maxTurns: 25 也足够。

### 3.2 角色配置传入方式是否可靠？

**风险**：自然语言传入角色列表，Subagent 可能误解。

**缓解**：
- 格式固定（必选/按需/适配三行）
- 角色用 R+数字 标识（R1/R3/R5 等），与 personas 文件名有明确映射
- doc-reviewer.md 中写死映射表：R1→devil-pm.md, R2→senior-player.md, ...

### 3.3 Devil's Advocate 与 Pre-Mortem 是否重叠？

**不重叠**：
- Devil's Advocate（doc-reviewer Step 3）：用 MEMORY 中的**历史审查模式**检查当前文档
- Pre-Mortem（SPM SKILL.md 补充模块）：假设**未来失败**反推原因
- Assumption Audit（SPM SKILL.md 补充模块）：检查**隐性假设**

三者视角不同：过去模式 / 未来失败 / 当前假设。且 Pre-Mortem 和 Assumption Audit 只在 SPM 中执行，SGA/SGE 不执行。

### 3.4 gate-check.py 的路径是否与项目实际对齐？

已逐项验证：

| gate-check.py 路径 | 实际存在的文件示例 | 匹配？ |
|---|---|:---:|
| `docs/features/{phase}-PRD.md` | `docs/features/phaseIJ-PRD.md` | ✅ |
| `docs/features/{phase}-analysis.md` | `docs/features/7game-lite-analysis.md` | ⚠️ 早期命名不同 |
| `docs/design/specs/{phase}-TDD.md` | `docs/design/specs/phaseIJ-TDD.md` | ✅ |
| `docs/design/specs/{phase}-user-stories.md` | `docs/design/specs/phaseX-gamma-user-stories.md` | ✅ |
| `docs/pipeline/{phase}/spm-analysis.md` | `docs/pipeline/phaseIJ/spm-analysis.md` | ✅ |

`analysis.md` 的命名不一致（早期用 `7game-lite-analysis.md`，后期用 `{phase}-PRD.md`），但 `find_prd()` 同时搜索两种格式，已兼容。

### 3.5 settings.json 的 PostToolUse hook 格式

现有 eslint hook 缺少 `type` 字段。查验 Claude Code Hook 规范：
- `type` 字段默认为 `"command"`，可省略
- 但新增的 SubagentStop 和 Stop hooks 最好显式写出 `type: "command"` 以保持一致

---

## 四、风险清单

| # | 风险 | 影响 | 缓解 |
|---|------|:---:|------|
| 1 | Subagent 读取 personas 时 token 过多导致注意力下降 | 中 | 每个 Gate 最多 3 个必选角色，~195 行 |
| 2 | 角色配置自然语言传入被误解 | 低 | doc-reviewer 中写死 R→文件映射表 |
| 3 | gate-check.py 对早期 Phase 路径不匹配 | 低 | `find_prd()` 已兼容两种格式 |
| 4 | SubagentStop Hook 的 matcher 不匹配 agent name | 中 | 确保 frontmatter `name: doc-reviewer` 与 matcher 一致 |
| 5 | `permissionMode: plan` 与审查执行冲突 | 中 | T2.1 中删除此字段 |
| 6 | doc-reviewer MEMORY 积累过多导致 prompt 膨胀 | 低 | MEMORY.md 只加载前 200 行/25KB |

---

## 五、执行顺序和依赖

```
Sprint 1（独立可交付，不依赖 Sprint 2/3）
  T1.1 退出码修复 ─── 无依赖
  T1.2 路径对齐 ──── 无依赖
  T1.3 detect_phase ─ 无依赖
  T1.4 settings.json ─ 依赖 T2.2（agent name 确认）→ 可先写，部署等 T2.2
  T1.5 --from-review ─ 依赖 T1.1
  T1.6 冒烟测试 ──── 依赖 T1.1~T1.5

Sprint 2（依赖 Sprint 1 的冒烟测试通过）
  T2.1 重写 doc-reviewer ── 无依赖
  T2.2 部署到 .claude/agents/ ── 依赖 T2.1
  T2.3 冒烟测试 ──── 依赖 T2.2 + T1.4

Sprint 3（依赖 Sprint 2 的冒烟测试通过）
  T3.1 SPM SKILL.md ── 依赖 T2.2
  T3.2 SGA SKILL.md ── 依赖 T2.2
  T3.3 SGE SKILL.md ── 依赖 T2.2
  T3.4 端到端验证 ── 依赖 T3.1~T3.3

Sprint 4（清理，可随时做）
  T4.1 标记旧方案 ── 无依赖
  T4.2 更新 guardian plan ── 依赖 Sprint 3 完成
  T4.3 处理设计稿 ── 依赖 T2.2
```

---

## 六、验证检查清单

- [ ] `python scripts/gate-check.py --phase phaseIJ --gate 1` 能正确运行
- [ ] gate-check.py 失败时退出码 = 2
- [ ] `@doc-reviewer` 能在 Claude Code 中被调用
- [ ] doc-reviewer 正确加载 personas 并按维度审查
- [ ] doc-reviewer 正确引用 review-protocol.md 流程
- [ ] Devil's Advocate 在全 PASS 时触发
- [ ] SubagentStop Hook 在 doc-reviewer 完成后触发 gate-check
- [ ] Stop Hook 在会话结束时触发 doc-integrity-check
- [ ] MEMORY.md 被正确创建/更新
- [ ] SPM/SGA/SGE 的 Party Review 段正确调用 @doc-reviewer
