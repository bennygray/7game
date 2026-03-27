# [系统名称] 需求分析进度

> 创建日期：YYYY-MM-DD
> 状态：进行中 / 已完成

## Phase I: 需求分析

### Step 1: 价值锚定 — [⬜/✅]
- **核心体验**：
- **ROI 判断**：
- **循环挂载**：
- **USER 决策记录**：
- **决策理由**：
- **耗时**：

### Step 1.5: 技术可行性验证 — [⬜/✅/跳过]
- **PoC 目标**：
- **PoC 结论**：可行 / 不可行 / 可行但需替代方案
- **性能基线**：
- **备选方案**（如不可行）：
- **耗时**：

### Step 2: 实体数据 — [⬜/✅]
- **实体清单**：
- **interface 草案**：（直接在此处粘贴完整 interface 代码，≤ 30 行）
- **USER 决策记录**：

### Step 3: 规则数值 — [⬜/✅]
- **规则清单**：
- **数值公式**：（直接在此处列出全部公式，含编号 F1~Fn）
- **MECE 校验结果**：

### Phase I Self-Review — [⬜/✅]
- Placeholder 扫描：通过 / 发现 [N] 处
- 内部一致性：通过 / 修正 [N] 处
- 歧义检查：通过 / 澄清 [N] 处
- 数值完整性：通过 / 补全 [N] 处

## Phase II: 架构拆解

### Step 4: 架构分层 — [⬜/✅]
- **四层划分**：
  - Data Layer:
  - Engine Layer:
  - Presentation Layer:
  - AI Layer:
- **架构文档位置**：`docs/design/specs/[Name]-architecture.md`
- **Mermaid 拓扑图**：见架构文档

### Step 5: 分期路线图 — [⬜/✅]
- **Phase A 里程碑**：
- **Phase B 里程碑**：
- **Phase C 里程碑**：

### Step 6: User Story — [⬜/✅]
- **Story 文件位置**：`docs/design/specs/[name]-user-stories-phaseA.md`
- **Story 数量**：[N] 条

### Phase II Self-Review — [⬜/✅]
- Story 覆盖度：通过 / 补充 [N] 条
- AC 质量扫描：通过 / 修正 [N] 条
- 依赖完整性：通过 / 重排 [N] 条

## Phase III: 执行指导

### Step 7: 文档先行 — [⬜/✅]
- **实施计划位置**：`docs/design/specs/[Name]-impl-plan.md`
- **需更新的 specs 文件**：
- **Git 分支名**：
- **实施顺序**：Data → Engine → UI

### Step 8: 验证脚本指引 — [⬜/✅]
- **脚本文件名**：
- **模拟方法**：
- **通过标准**：

### Phase III Self-Review — [⬜/✅]
- Spec 覆盖度：通过 / 补全 [N] 个
- 数值验证覆盖度：通过 / 补全 [N] 个

## Phase IV: 验证交付

### Step 9: 集成验证 — [⬜/✅]
- **验证清单位置**：`docs/verification/[Name]-phaseX-verification.md`
- **四维度通过状态**：功能[⬜] 数值[⬜] 性能[⬜] 回归[⬜]

### Step 10: 交接归档 — [⬜/✅]
- **task-tracker.md 已更新**：[⬜/✅]
- **handoff.md 已更新**：[⬜/✅]
- **INDEX.md 已更新**：[⬜/✅]

---

## 风险登记

| 风险 | 严重度 | 缓解措施 | 状态 |
|------|--------|----------|------|
| (示例) node-llama-cpp 在 Windows 上崩溃 | 高 | 改用 llama-server.exe 子进程 | 已解决 |

## 变更日志

| 日期 | 级别 | 变更内容 | 影响范围 | 回退到 |
|------|------|----------|----------|--------|
| (无变更记录) | | | | |
