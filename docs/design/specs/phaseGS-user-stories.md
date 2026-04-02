# Phase GS — User Stories

> **Phase**：GS (Gender System) | **PRD**：[phaseGS-PRD.md](../../features/phaseGS-PRD.md)
> **日期**：2026-04-02 | **总计**：6 条

---

## US-GS-01：弟子性别生成

> **作为**玩家，**我希望**新生成的弟子有男/女性别，**以便**宗门人员构成更真实多样。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 新游戏开始 | 生成 8 名初始弟子 | 每名弟子有 gender 字段，值为 `'male'` 或 `'female'` | PRD §4.1 Gender union |
| 2 | FEMALE_RATIO = 0.5 | 多次生成 | 男女比例趋近 50:50 | PRD §4.2 R-01 |
| 3 | gender = male | 查看弟子名字 | 名字来自 SURNAMES × MALE_GIVEN_NAMES | PRD §4.4 男性名字池 |
| 4 | gender = female | 查看弟子名字 | 名字来自 SURNAMES × FEMALE_GIVEN_NAMES | PRD §4.4 女性名字池 |
| 5 | 8 名弟子生成 | 检查名字唯一性 | 无重名 | 现有防重名逻辑 |

**依赖**：无 | **复杂度**：M

---

## US-GS-02：性别代词系统

> **作为**玩家，**我希望** MUD 文案根据弟子性别使用正确代词（他/她/其），**以便**叙事沉浸感更强。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子 gender = male | 目标文案含 {pronoun} | 替换为 "他" | PRD §4.3 代词映射表 |
| 2 | 弟子 gender = female | 目标文案含 {pronoun} | 替换为 "她" | PRD §4.3 |
| 3 | 弟子 gender = unknown | 目标文案含 {pronoun} | 替换为 "其" | PRD §4.3 |
| 4 | GOAL_MUD_TEXT 模板 | breakthrough/seclusion 目标触发 | {pronoun} 正确填充 | 代码 goal-data.ts:69,71 |

**依赖**：US-GS-01 | **复杂度**：S

---

## US-GS-03：AI Prompt 性别感知

> **作为**玩家，**我希望** AI 弟子能感知自身性别，**以便**对话和内心独白更符合角色。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子 gender = female | AI soul-eval prompt 构建 | 身份描述含"女" | PRD §4.2 R-05 |
| 2 | 弟子 gender = male | AI soul-eval prompt 构建 | 身份描述含"男" | PRD §4.2 R-05 |
| 3 | 任何弟子 | AI 生成 innerThought | 内容可能体现性别视角（由 LLM 自然产生，不强制） | I5 不硬编码 |

**依赖**：US-GS-01 | **复杂度**：S

---

## US-GS-04：存档迁移 v6→v7

> **作为**玩家，**我希望**老存档加载时弟子自动获得性别，**以便**无感升级。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | v6 存档 | 加载游戏 | migrateSave 自动执行 v6→v7 | save-manager.ts 迁移链 |
| 2 | 弟子名字在 NAME_GENDER_MAP 中 | 迁移赋值 | 使用映射表推测性别 | PRD §4.5 映射表（10 条） |
| 3 | 弟子名字不在映射表中 | 迁移赋值 | 随机分配 male/female | PRD §4.5 fallback |
| 4 | 迁移完成后 | 检查所有弟子 | 每人都有合法 gender 值，无 undefined | I3 不变量 |
| 5 | SAVE_VERSION | 迁移后 | = 7 | save-manager.ts:25 |

**依赖**：US-GS-01 | **复杂度**：M

---

## US-GS-05：弟子面板性别显示

> **作为**玩家，**我希望**在弟子档案/inspect 中看到性别信息，**以便**快速了解弟子。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子 gender = male | 执行 `look` 命令 | 弟子条目显示 ♂ 标记 | mud-formatter.ts |
| 2 | 弟子 gender = female | 执行 `look` 命令 | 弟子条目显示 ♀ 标记 | mud-formatter.ts |
| 3 | 弟子 gender = unknown | 执行 `look`/`inspect` | 显示无标记 | I4 不报错 |
| 4 | 执行 `inspect 弟子名` | 查看详细面板 | 性别行显示"男/女/未知" | mud-formatter.ts |

**依赖**：US-GS-01 | **复杂度**：S

---

## US-GS-06：需求债务登记

> **作为**项目管理者，**我希望**性别系统引出的下游需求全部登记到 feature-backlog，**以便**后续 Phase 有迹可循。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | Phase GS 完成 | 检查 feature-backlog.md | FB-021~FB-026 全部登记 | PRD §5 |
| 2 | 每条 FB | 检查格式 | 含优先级、关联系统、来源标注 | feature-backlog.md 格式 |

**依赖**：无 | **复杂度**：S
