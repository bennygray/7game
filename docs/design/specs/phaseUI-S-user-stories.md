# Phase UI-S — User Stories

> **版本**：v1.0 | **日期**：2026-04-02
> **PRD 引用**：[phaseUI-S-PRD.md](../../features/phaseUI-S-PRD.md)
> **总计**：8 条 User Story

---

## US-UIS-01: Status 中文化

**As a** 掌门（玩家）
**I want** 关系面板中的关系状态显示为中文（倾慕/道侣/金兰/宿敌）
**So that** 我无需理解英文即可一眼看出弟子间的关系性质

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 弟子 A 对弟子 B 的 edge.status == 'crush' | 执行 `look A` | 关系区显示 `(倾慕)` 而非 `(crush)` | PRD §4.1 映射表 |
| AC2 | edge.status == 'lover' | `look A` | 显示 `(道侣)` | PRD §4.1 |
| AC3 | edge.status == 'sworn-sibling' | `look A` | 显示 `(金兰)` | PRD §4.1 |
| AC4 | edge.status == 'nemesis' | `look A` | 显示 `(宿敌)` | PRD §4.1 |
| AC5 | edge.status == null | `look A` | 无 status badge 显示 | — |

**依赖**：无 | **复杂度**：S

---

## US-UIS-02: RelationshipTag 中文化

**As a** 掌门
**I want** 关系标签显示为中文（知己/对头/师恩/仰慕/积怨）
**So that** 我能直观理解弟子间的关系标签含义

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 弟子 A 对 B 的 tags 含 'friend' | `look A` | 显示 `[知己]` 而非 `[friend]` | PRD §4.2 映射表 |
| AC2 | tags 含多个值 ['friend','rival'] | `look A` | 显示 `[知己·对头]`（中点分隔） | PRD §4.6 |
| AC3 | tags 为空 | `look A` | 不显示标签区 | — |

**依赖**：无 | **复杂度**：S

---

## US-UIS-03: Orientation 显示

**As a** 掌门
**I want** 在灵魂档案（inspect）中看到弟子的修仙风取向标签
**So that** 我能理解弟子的社交倾向

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 弟子为 male, femaleAttr=1, maleAttr=0 | `inspect A` | header 显示 "男 · 慕异" | PRD §4.3 推导规则 |
| AC2 | 弟子为 female, maleAttr=0.7, femaleAttr=0.3 | `inspect A` | header 显示 "女 · 兼慕" | PRD §4.3 |
| AC3 | 弟子为 male, maleAttr=1, femaleAttr=0 | `inspect A` | header 显示 "男 · 慕同" | PRD §4.3 |
| AC4 | 弟子 maleAttr=0, femaleAttr=0 | `inspect A` | 显示 "X · 无慕" | PRD §4.3 |
| AC5 | 任意弟子 | `look A` | **不**显示取向（仅 inspect） | — |

**依赖**：无 | **复杂度**：S

---

## US-UIS-04: relationships 命令补全

**As a** 掌门
**I want** `relationships <弟子>` 命令显示该弟子的性取向和对每个相关弟子的离散关系状态
**So that** 我能在一处纵览完整的社交信息

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 弟子 A 有 orientation | `relationships A` | header 行显示取向标签（慕异/兼慕等） | PRD §4.3 |
| AC2 | A→B 的 edge.status=='lover' | `relationships A` | B 行显示 `(道侣)` | PRD §4.1 |
| AC3 | A→B 的 edge.status==null | `relationships A` | B 行无 status 标注 | — |
| AC4 | 弟子 A 有 tags=['friend','grudge'] 对 B | `relationships A` | 显示 `[知己·积怨]`（中点分隔） | PRD §4.6 |

**依赖**：US-UIS-01, US-UIS-03 | **复杂度**：S

---

## US-UIS-05: 关系区排版优化

**As a** 掌门
**I want** look/inspect 面板的关系区采用双行布局（名字+状态 / 数值+标签）
**So that** 社交信息一目了然，不再单行挤压

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 弟子 A 有关系数据 | `look A` | 每个关系占两行：行1=名字+status badge，行2=亲·引·信+tags | — |
| AC2 | status 为 '倾慕' | `look A` | badge 为粉色调 | PRD §4.5 |
| AC3 | status 为 '道侣' | `look A` | badge 为金色调 | PRD §4.5 |
| AC4 | status 为 '金兰' | `look A` | badge 为蓝色调 | PRD §4.5 |
| AC5 | status 为 '宿敌' | `look A` | badge 为红色调 | PRD §4.5 |
| AC6 | status 为 null | `look A` | 无 badge，行1 仅名字 | — |

**依赖**：US-UIS-01 | **复杂度**：M

---

## US-UIS-06: 社交模板接入

**As a** 掌门
**I want** 社交事件（暗恋标记/邀约/关系破裂）的 MUD 日志使用多样化模板文案
**So that** 同类事件不总是同一句话，增加叙事新鲜感

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 社交扫描检测到 crush-mark | social-tick 执行 | 从 `social-flirt` 模板池随机选取并填充 {A}/{B}/{L} | PRD §4.4 映射表 |
| AC2 | 检测到 invitation (lover) | social-tick | 使用 `social-confession` 模板 | PRD §4.4 |
| AC3 | 检测到 invitation (sworn-sibling) | social-tick | 使用 `social-sworn-proposal` 模板 | PRD §4.4 |
| AC4 | 检测到 invitation (nemesis) | social-tick | 使用 `social-nemesis-declare` 模板 | PRD §4.4 |
| AC5 | 检测到 dissolution (lover) | social-tick | 使用 `social-lover-broken` 模板 | PRD §4.4 |
| AC6 | 检测到 dissolution (sworn-sibling) | social-tick | 使用 `social-sworn-broken` 模板 | PRD §4.4 |
| AC7 | 检测到 dissolution (nemesis) | social-tick | 使用 `social-nemesis-resolved` 模板 | PRD §4.4 |
| AC8 | 模板填充后 | 日志输出 | 不含未替换的 `{A}`/`{B}`/`{L}`/`{P_A}`/`{P_B}` 占位符 | 不变量 I3 |

**依赖**：无 | **复杂度**：M

---

## US-UIS-07: 代词占位符

**As a** 掌门
**I want** 碰面和社交模板文案中使用正确的性别代词（他/她/其）
**So that** 叙事文本更自然流畅，不重复使用名字

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 弟子 A 为 male | 碰面/社交模板含 {P_A} | {P_A} 替换为 "他" | 不变量 I4 |
| AC2 | 弟子 B 为 female | 模板含 {P_B} | {P_B} 替换为 "她" | 不变量 I4 |
| AC3 | 弟子 gender==unknown | 模板含 {P_A} | {P_A} 替换为 "其" | 不变量 I4 |
| AC4 | 模板不含 {P_A}/{P_B} | 填充执行 | 正常输出，无残留 | 向后兼容 |
| AC5 | encounter-templates 至少 4 条模板 | — | 含 {P_A} 或 {P_B} 占位符 | — |
| AC6 | social-event-templates 至少 10 条模板 | — | 含 {P_A} 或 {P_B} 占位符 | — |

**依赖**：US-UIS-06 | **复杂度**：M | **清偿**：FB-026

---

## US-UIS-08: 共享工具提取与分隔符统一

**As a** 开发者
**I want** `getRelationLabel()` 提取到共享工具模块，tag 分隔符统一为中点
**So that** 消除重复代码，保持 UI 一致性

### Acceptance Criteria

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | social-tick.handler.ts 本地 getRelationLabel() | 提取后 | 改为从 shared/utils 导入 | — |
| AC2 | mud-formatter.ts tags 分隔符 | 改后 | 使用 `·` 而非 `,` | PRD §4.6 |
| AC3 | command-handler.ts tags 分隔符 | 改后 | 使用 `·` 而非 `/` | PRD §4.6 |

**依赖**：无 | **复杂度**：S
