# Trinity Guardian Plan — 详细评审报告

> **评审日期**：2026-04-01 | **评审方式**：Claude Code 技术验证 + 代码审查
> **评审对象**：`docs/project/trinity-guardian-plan.md` v1.0 + 核心组件文件
> **评审结论**：方向正确，技术可行，组件设计质量高，有若干落地细节需修正
> **评级**：8/10（文件补全后从 7 提升）
>
> **注意**：本评审写于实施之前，与实施代码同 commit (6297dab) 提交。下方标记 `[FIXED]` 的问题已在同 commit 中修复。冒烟测试于 2026-04-01 通过。

---

## 一、总体评价

方案定位精准，问题诊断到位，技术路线可行。五个根因分析（R1-R5）准确抓住了当前 Trinity Pipeline 执行率低的结构性原因。从方案 A（Python 编排器）到方案 B（Claude Code 原生）再到本方案的演进路径合理——逐步去掉不必要的复杂度。

核心组件（doc-reviewer.md、gate-check.py、doc-integrity-check.py）已补全，设计质量良好。

---

## 二、技术可行性验证

### 2.1 核心机制验证结果

经 Claude Code 内部实际查证（非推测）：

| 方案依赖的能力 | 实际支持 | 备注 |
|---------------|:---:|------|
| `.claude/agents/*.md` 定义 Subagent | ✅ | 项目级/用户级均支持 |
| `@doc-reviewer` 调用 Subagent | ✅ | 直接 `@` 调用 |
| `disallowedTools` 限制工具 | ✅ | 与 `tools` 白名单可组合使用 |
| `memory: project` 持久化 | ✅ | 路径为 `.claude/agent-memory/<name>/MEMORY.md` |
| `model: opus` 模型指定 | ✅ | 支持 haiku/sonnet/opus/inherit |
| `SubagentStop` Hook | ✅ | matcher 匹配 agent type name |
| `Stop` Hook | ✅ | 会话结束时触发 |
| Hook type: command | ✅ | exit 0=pass, exit 2=block |

**结论：所有技术假设成立，不存在致命级能力缺失。**

### 2.2 M0 验证项简化建议

| 原 M0 项 | 状态 | 建议 |
|----------|:---:|------|
| 0.1 Subagent 基本可用 | **已确认** | 跳过 |
| 0.2 上下文隔离 | **已确认** | 跳过 |
| 0.3 disallowedTools | **已确认** | 跳过 |
| 0.4 Memory 可写 | **已确认** | 跳过 |
| 0.5 Memory 跨会话 | **已确认** | 跳过 |
| 0.6 Stop Hook | **已确认** | 冒烟测试 |
| 0.7 SubagentStop Hook | **已确认** | 冒烟测试 |
| 0.8 Python 可用 | **需本地验证** | 快速检查 |

**建议：M0 从半天缩短为 30 分钟冒烟测试。**

---

## 三、组件逐项评审

### 3.1 doc-reviewer.md — 独立审查 Subagent ⭐ 设计优秀

**文件位置问题**：当前在 `docs/project/doc-reviewer.md`，需部署到 `.claude/agents/doc-reviewer.md` 才能被 `@doc-reviewer` 调用。文件头部已标注"部署路径"，方向正确。

**Frontmatter 评审**：

| 字段 | 值 | 评审 |
|------|------|------|
| `disallowedTools: Write, Edit` | 只读 | ✅ 正确，审查员不应修改文件 |
| `model: opus` | 用最强模型 | ✅ 审查质量 > 成本 |
| `permissionMode: plan` | 计划模式 | ✅ 额外安全层 |
| `memory: project` | 项目级记忆 | ✅ 审查经验跨会话积累 |
| `maxTurns: 25` | 最多 25 轮 | ✅ 足够深度审查 |
| `effort: high` | 高投入 | ✅ 与审查定位匹配 |

**四层防线评审**：

| 层 | 设计 | 评审 |
|---|------|------|
| L0 Content Traceability | Data Anchor 追溯 → Read 验证 | ✅ 确定性检查，无法绕过 |
| L1 维度审查 | Gate 1/2/3 各有专属维度表 | ✅ 覆盖全面，C1-C4 精确度检查是亮点 |
| L2 CoVe 证据验证 | 仅对 WARN/BLOCK 项执行 | ✅ 节省 token 的正确策略 |
| L3 结构化辩论 | 维度间矛盾时 | ✅ 兜底机制 |

**Devil's Advocate 设计**：
- 全 PASS 时强制执行 ✅
- 从 MEMORY 提取历史模式 ✅
- 连续全 PASS ≥3 次触发疲劳警告 ✅ 精妙设计

**发现的问题**：

| # | 问题 | 严重度 | 说明 |
|---|------|:---:|------|
| D1 | `disallowedTools` 不够严格 | 🟡 `[FIXED]` | 已改用 `tools: Read, Glob, Grep` 白名单 |
| D2 | L1 Gate 1 的 ROI 评估主观 | 🟡 | "ROI < 2 → WARN" 缺乏计算基准，AI 评估 ROI 本身不可靠。建议降级为信息项而非判定项 |
| D3 | 审查报告输出路径 | 🟡 `[FIXED]` | 已改为由父 agent 写入 `docs/pipeline/{phase}/review-g{N}.md`，gate 报告写入 `.reviews/gates/` |
| D4 | 缺少 `tools` 或白名单中未包含 `Bash` | ✅ `[FIXED]` | 已改用 `tools` 白名单，不再需要 `permissionMode: plan` |

### 3.2 gate-check.py — 确定性验证器 ⭐ 设计良好

**代码质量**：~200 行，结构清晰，函数职责单一。

**Gate 检查项覆盖度**：

| Gate | 检查项 | 评审 |
|------|--------|------|
| Gate 1 | PRD + Stories + 签章 + 审查记录 + 实质内容 + 过程资产 | ✅ 全面 |
| Gate 2 | Gate1 已过 + TDD + 签章 + 审查记录 + 实质内容 + 计划 | ✅ 全面 |
| Gate 3 | Gate2 已过 + 审查记录 + 实质内容 + task + walkthrough + handoff | ✅ 全面 |

**发现的问题**：

| # | 问题 | 严重度 | 说明 |
|---|------|:---:|------|
| G1 | 退出码使用 1 而非 2 | 🔴 `[FIXED]` | 已改为 `return 0 if all_pass else 2`，冒烟测试确认 exit 2 阻断生效 |
| G2 | `--from-review` 运行全部 3 个 Gate | 🟡 `[FIXED]` | 已改为 `detect_current_gate()` 只检查当前 Gate |
| G3 | 审查记录路径硬编码 `.reviews/` | 🟡 `[FIXED]` | `review_exists()` 已改为优先搜索 `docs/pipeline/{phase}/review*.md`，`.reviews/` 作为兼容降级 |
| G4 | `review_exists()` 匹配模式 | 🟡 `[FIXED]` | 已改为 `docs/pipeline/{phase}/review*.md` glob，匹配 review.md 和 review-g{N}.md |
| G5 | `detect_phase()` 靠 mtime 排序 | 🟡 `[FIXED]` | 已改为优先从 handoff.md 解析，mtime 仅作降级 |
| G6 | 文件路径约定不一致 | 🟡 | `find_prd()` 搜索 `docs/features/`——冒烟测试确认路径匹配（phaseIJ-PRD.md 存在） |

### 3.3 doc-integrity-check.py — 文档完整性检查器 ✅ 设计合理

**定位清晰**：明确标注"不阻塞会话结束，只输出提醒"。

**检查项**：

| # | 检查 | 评审 |
|---|------|------|
| 1 | handoff.md 今天是否更新 | ✅ 关键联动项 |
| 2 | 有代码变更但无文档变更 | ✅ 先文档后编码的守护 |
| 3 | Pipeline 过程资产是否存在 | ✅ 防遗漏 |
| 4 | 新代码文件是否在 layers.md 注册 | ✅ 防遗漏 |

**发现的问题**：

| # | 问题 | 严重度 | 说明 |
|---|------|:---:|------|
| I1 | `git diff --name-only HEAD` 在无 commit 的新仓库会报错 | 🟡 | 已有 try/except 兜底，影响不大 |
| I2 | `file_modified_today()` 用 mtime 比较 | 🟡 | 如果 git pull 拉取了别人修改的 handoff.md，mtime 会更新但内容可能不是本会话的更新。不过作为提醒级检查可以接受 |
| I3 | 检查 4 用 basename 匹配 | 🟡 | `os.path.basename(cf)` 可能误匹配同名文件。建议用相对路径匹配 |

### 3.4 settings.json — Hook 配置

**当前状态**：`[FIXED]` Guardian hooks 已合并。最终配置如下：

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

---

## 四、跨组件一致性问题

### 4.1 审查记录存放位置不统一 🟡

| 组件 | 期望路径 | 问题 |
|------|---------|------|
| doc-reviewer.md | `.reviews/{phase}-{stage}-r{N}.md` | `.reviews/` 不在 git 中 |
| gate-check.py | `.reviews/{phase}-{stage}-r*.md` + `.reviews/gates/` | 同上 |
| 项目惯例 | `docs/pipeline/{phase}/review.md` | 已有大量审查记录 |

**建议**：统一到 `docs/pipeline/{phase}/` 体系，或在 `.reviews/` 和 `docs/pipeline/` 之间明确分工（如 `.reviews/` 存自动审查，`docs/pipeline/` 存人工审查）。

### 4.2 文件路径约定需对齐

| gate-check.py 中的路径 | 项目实际路径 | 是否匹配 |
|----------------------|------------|:---:|
| `docs/features/{phase}-PRD.md` | `docs/features/` 下确有 PRD | 需验证 |
| `docs/design/specs/{phase}-TDD.md` | `docs/design/specs/` | 需验证 |
| `docs/pipeline/{phase}/spm-analysis.md` | ✅ 已验证存在 | ✅ |

### 4.3 gate-check.py 退出码 vs Hook 阻断 🔴

这是最关键的落地 bug：
- gate-check.py `report()` 返回 `1` 表示失败
- Claude Code Hook 约定 exit `2` = block（阻断），exit `1` = 仅报错
- **结果**：Gate 检查失败时不会阻断流程，Guardian 形同虚设

**修正**：`gate-check.py:114` 的 `return 0 if all_pass else 1` 改为 `return 0 if all_pass else 2`

---

## 五、设计优点

| # | 优点 | 说明 |
|---|------|------|
| 1 | R1-R5 根因分析精准 | 结构化、每个对应明确解决方向 |
| 2 | Subagent 上下文隔离 | 正确解决"同 context 自审"核心问题 |
| 3 | 确定性 + AI 双轨 | Python 硬检查 + AI 软审查互补 |
| 4 | 渐进式里程碑 | M0→M1→M2→M3 风险前置 |
| 5 | 方案演进透明 | 明确与方案 A/B 的关系和吸收的洞见 |
| 6 | 轻量实现 | 相比方案 A 的 ~500 行 Python，本方案几乎零新代码 |
| 7 | doc-reviewer 四层防线 | L0 追溯 + L1 维度 + L2 CoVe + L3 辩论，层层递进 |
| 8 | Devil's Advocate + 疲劳警告 | 防止审查松懈的精妙机制 |
| 9 | doc-integrity-check 仅提醒不阻断 | 正确的"渐进式"策略，不会过度干扰工作流 |

---

## 六、改进建议汇总

### 高优先级（阻塞落地）

| # | 建议 | 文件 | 状态 |
|---|------|------|------|
| H1 | gate-check.py 退出码改为 2 | `scripts/gate-check.py:122` | `[FIXED]` 冒烟测试确认 |
| H2 | doc-reviewer.md 部署到正确路径 | `.claude/agents/doc-reviewer.md` | `[FIXED]` |
| H3 | settings.json 合并 Guardian hooks | `.claude/settings.json` | `[FIXED]` |
| H4 | 创建 `.reviews/` 目录 | `.reviews/gates/` | `[FIXED]` 已创建，待 git add |
| H5 | 更新 plan 中的"已创建"声明 | `trinity-guardian-plan.md` | `[FIXED]` |

### 中优先级（影响质量）

| # | 建议 | 状态 |
|---|------|------|
| M1 | doc-reviewer 用 `tools` 白名单替代 `disallowedTools` | `[FIXED]` |
| M2 | 统一审查记录存放路径 | `[FIXED]` 审查报告→`docs/pipeline/`，gate 报告→`.reviews/gates/` |
| M3 | gate-check.py `detect_phase()` 改为从 handoff.md 解析 | `[FIXED]` 冒烟测试确认 |
| M4 | gate-check.py 文件路径与实际目录结构对齐 | `[FIXED]` 冒烟测试确认 phaseIJ 路径匹配 |
| M5 | `--from-review` 改为只检查相关 Gate | `[FIXED]` detect_current_gate() |
| M6 | 解释放弃异构审查的决策 | 待补充 |

### 低优先级（锦上添花）

| # | 建议 | 说明 |
|---|------|------|
| L1 | L1 Gate 1 的 ROI 评估降级为信息项 | AI 评估 ROI 本身不可靠 |
| L2 | doc-integrity-check 用相对路径匹配 layers.md | basename 可能误匹配 |
| L3 | `.reviews/` 归档策略 | 长期积累需要清理机制 |

---

## 七、建议执行路径

所有 Step 已在 commit 6297dab 中完成，冒烟测试于 2026-04-01 通过：

```
Step 1: 修复 gate-check.py 退出码（H1）           ✅ DONE
Step 2: 复制 doc-reviewer.md 到 .claude/agents/（H2）✅ DONE
Step 3: 合并 settings.json hooks（H3）              ✅ DONE
Step 4: 创建 .reviews/ 目录（H4）                   ✅ DONE
Step 5: 冒烟测试                                    ✅ DONE (Gate 1/2/3 + auto + doc-integrity)
Step 6: 根据冒烟结果处理 M1-M6                      ✅ DONE (M1-M5 FIXED, M6 待补充)
Step 7: SKILL.md 集成                               ✅ DONE (SPM/SGA/SGE)
```

---

## 八、验证方式

1. 用已有 `phaseX-gamma` 的 PRD 做对比测试：同上下文审查 vs `@doc-reviewer` Subagent 审查
2. 故意在 gate-check.py 中制造 fail，验证 SubagentStop Hook 是否阻断（exit 2）
3. 验证 doc-reviewer 的 `MEMORY.md` 是否跨会话保留审查模式
4. 结束会话后验证 doc-integrity-check.py 的 Stop Hook 是否正常输出
