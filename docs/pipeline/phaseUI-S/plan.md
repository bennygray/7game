# Phase UI-S — 社交系统前端显示补全 实施计划

> **日期**：2026-04-02 | **前置**：Phase I-beta ✅
> **状态**：SPM 进行中

## Context

Phase I-beta 交付了完整社交系统后端（三维关系向量、性取向、离散关系状态、社交引擎、13 类社交模板），但前端 UI 严重滞后：
- RelationshipStatus 以英文原样显示（`(crush)` 而非 `(倾慕)`）
- Orientation 字段从未渲染
- `pickSocialTemplate()` 定义了 39 条模板但 **0 次调用**
- `relationships` 命令不读 `RelationshipEdge.status`
- 碰面/社交模板无性别代词

本 Phase 补全这些前后端断裂，同时合并 **FB-026**（碰面模板性别化文案）。

---

## 用户确认的设计决策

- **代词策略**：合并 FB-026 — encounter-templates + social-event-templates 均加 `{P_A}/{P_B}` 代词占位符
- **取向标签**：修仙风 — 慕异/兼慕/慕同/无慕

---

## 范围

### IN（8 项）

| ID | 项目 | 分类 |
|----|------|------|
| A1 | Status 中文化（crush→倾慕, lover→道侣, sworn-sibling→金兰, nemesis→宿敌） | Core |
| A2 | Orientation 显示（inspect 面板 + relationships 命令，修仙风标签） | Core |
| A3 | `relationships` 命令补全（合并 edge.status 显示） | Core |
| A4 | 关系区排版优化（双行布局） | Core |
| B1 | 社交模板接入（wire `pickSocialTemplate()` 到 social-tick.handler） | Core |
| C1 | 代词占位符（两套模板均加 `{P_A}/{P_B}`，复用 `getPronoun()`）— 合并 FB-026 | Debt |
| D1 | 提取 `getRelationLabel()` 到共享工具（消除 social-tick.handler 本地重复） | Debt |
| D2 | 统一 tag 分隔符（mud-formatter 用逗号 vs command-handler 用斜杠 → 统一为中点 `·`） | Debt |

### OUT

| 项目 | 原因 |
|------|------|
| AI 邀约完整流程（AsyncAIBuffer 扩展） | 独立 Phase |
| X-γ 浮层面板 | FB-017 独立 Phase |
| sect 命令弟子名单 | 超出范围 |

---

## 执行步骤（SPM → SGA → SGE）

本 Phase 走正式 Trinity Pipeline。

### Step 1: `/SPM` — PRD + User Stories
- 产出 `docs/features/phaseUI-S-PRD.md` + `docs/design/specs/phaseUI-S-user-stories.md`
- 范围确认 + 代词策略 + 取向标签（已确认）

### Step 2: `/SGA` — TDD + 关联性审计
- 产出 `docs/design/specs/phaseUI-S-TDD.md`
- Step 5 四维度关联性审计

### Step 3: `/SGE` — 编码 + 验证 + 回归

---

## 编码任务清单（SGE 阶段执行）

### T1: 创建共享标签工具 `src/shared/utils/social-labels.ts`（新文件）

- `RELATIONSHIP_STATUS_LABEL: Record<RelationshipStatus, string>` — crush→倾慕, lover→道侣, sworn-sibling→金兰, nemesis→宿敌
- `RELATIONSHIP_TAG_LABEL: Record<RelationshipTag, string>` — friend→知己, rival→对头, mentor→师恩, admirer→仰慕, grudge→积怨
- `getRelationshipStatusLabel(status)` — 返回中文标签或 null
- `getRelationLabel(type)` — 从 social-tick.handler.ts L70-77 提取
- `getOrientationLabel(orientation, gender)` — 根据 maleAttraction/femaleAttraction 权重推导：慕异/兼慕/慕同/无慕
- `TAG_SEPARATOR = '·'` — 统一分隔符

### T2: 扩展模板填充 — 修改 `src/shared/data/encounter-templates.ts`

- 扩展 `fillEncounterTemplate()` 签名增加可选 `pronounA?` / `pronounB?` 参数
- 新增 `{P_A}` / `{P_B}` 替换逻辑（无参数时替换为空串，向后兼容）

### T3: 为 social-event-templates 添加填充函数

- 在 `src/shared/data/social-event-templates.ts` 中新增 `fillSocialTemplate(template, params)` — 替换 {A}/{B}/{L}/{P_A}/{P_B}
- 复用 encounter-templates 的 replace chain 模式

### T4: 模板文案加代词 — 修改两个模板文件

- `src/shared/data/social-event-templates.ts` — 审计 39 条模板，选择性加 {P_A}/{P_B}（预估 10-15 条受益）
- `src/shared/data/encounter-templates.ts` — 审计 12 条模板，选择性加 {P_A}/{P_B}（预估 4-6 条受益）
- 判断标准：模板中有回指或所有格场景时才加代词，名字只出现一次的不加

### T5: A1 — Status 中文化 — 修改 `src/ui/mud-formatter.ts`

- `renderRelationsSection()` L331: `rel.status` → `getRelationshipStatusLabel(rel.status)`
- L330: `rel.tags.join(',')` → 用 `RELATIONSHIP_TAG_LABEL` 映射后用 `TAG_SEPARATOR` 连接

### T6: A2 — Orientation 显示 — 修改 `src/ui/mud-formatter.ts`

- `formatDiscipleInspect()` L405-409 区域：gender 标签后追加 orientation 标签（"男 · 慕异"格式）
- 仅 inspect 面板显示，look 面板不显示

### T7: A3 — relationships 命令补全 — 修改 `src/ui/command-handler.ts`

- L371-408 `relationships` 命令：
  - Header 行追加 `getOrientationLabel(d.orientation, d.gender)`
  - 循环内查找 `state.relationships.find(r => r.sourceId === d.id && r.targetId === other.id)` 获取 edge.status
  - 输出行追加 status 中文标签
  - `mem.tags.join('/')` → TAG_SEPARATOR

### T8: A4 — 关系区排版优化 — 修改 `src/ui/mud-formatter.ts` + `src/styles/mud-theme.css`

- `renderRelationsSection()` 重构为双行布局：
  - 行1: → 名字 + status badge（如有）
  - 行2（缩进）: 亲±N · 引N · 信±N · [标签]
- CSS 新增 `.mud-p-rel-status`（status badge 样式）、`.mud-p-rel-metrics`（指标子行样式）
- Status badge 颜色：倾慕=粉, 道侣=金, 金兰=蓝, 宿敌=红

### T9: B1 — Wire 社交模板 — 修改 `src/engine/handlers/social-tick.handler.ts`

- 删除本地 `getRelationLabel()` L70-77
- 导入 `pickSocialTemplate` + `fillSocialTemplate` + `getRelationLabel`（from shared） + `getPronoun`
- L38-39 crush-mark: → `pickSocialTemplate('social-flirt')` + fill
- L49-50 invitation: → `pickSocialTemplate(mapToTemplateType(relationType))` + fill
  - lover → 'social-confession', sworn-sibling → 'social-sworn-proposal', nemesis → 'social-nemesis-declare'
- L55-56 dissolution: → `pickSocialTemplate(mapToTemplateType(relationType))` + fill
  - lover → 'social-lover-broken', sworn-sibling → 'social-sworn-broken', nemesis → 'social-nemesis-resolved'
- Location 来源：弟子当前行为地点（通过 BEHAVIOR_LOCATION_MAP），fallback '宗门'

### T10: C1 — encounter-tick 接入代词 — 修改 `src/engine/handlers/encounter-tick.handler.ts`

- L204-209: `getEncounterText()` 调用处传入 pronounA/pronounB
- 从 `a.gender` / `b.gender` 调用 `getPronoun()` 获取代词

### T11: 文档更新

- `docs/project/feature-backlog.md`: 标记 FB-026 已清偿（合并入 UI-S C1）
- `docs/project/handoff.md`: 更新断点
- `docs/project/task-tracker.md`: 更新 UI-S 状态

---

## 依赖图

```
T1 (shared labels) ─┬─→ T5 (status中文化) ──→ T8 (排版优化)
                     ├─→ T6 (orientation显示)
                     ├─→ T7 (rel命令补全)
                     └─→ T9 (社交模板接入)

T2 (encounter填充扩展) ─┬─→ T4 (模板加代词)
                         └─→ T10 (encounter代词接入)

T3 (social填充函数) ────→ T9 (社交模板接入)

T4 (模板加代词) ────→ T9, T10

T11 (文档) — 最后执行
```

**建议执行序**：T1 → T2, T3 (并行) → T4 → T5, T6, T7 (并行) → T8 → T9 → T10 → T11

---

## 关键文件清单

| 文件 | 操作 | 任务 |
|------|------|------|
| `src/shared/utils/social-labels.ts` | **新建** | T1 |
| `src/shared/data/encounter-templates.ts` | 修改 | T2, T4 |
| `src/shared/data/social-event-templates.ts` | 修改 | T3, T4 |
| `src/ui/mud-formatter.ts` | 修改 | T5, T6, T8 |
| `src/ui/command-handler.ts` | 修改 | T7 |
| `src/engine/handlers/social-tick.handler.ts` | 修改 | T9 |
| `src/engine/handlers/encounter-tick.handler.ts` | 修改 | T10 |
| `src/styles/mud-theme.css` | 修改 | T8 |
| `docs/project/feature-backlog.md` | 修改 | T11 |
| `docs/project/handoff.md` | 修改 | T11 |
| `docs/project/task-tracker.md` | 修改 | T11 |

### 复用的已有工具函数

| 函数 | 文件 | 用途 |
|------|------|------|
| `getPronoun(gender)` | `src/shared/types/game-state.ts` L51 | 返回 他/她/其 |
| `getGenderLabel(gender)` | `src/shared/types/game-state.ts` L56 | 返回 男/女/未知 |
| `pickSocialTemplate(eventType)` | `src/shared/data/social-event-templates.ts` L98 | 随机选模板 |
| `fillEncounterTemplate(...)` | `src/shared/data/encounter-templates.ts` L46 | 模板占位符替换 |

---

## 验证计划

1. `npx tsc --noEmit` — 零错误
2. `npm run dev` → 浏览器验证：
   - `look <弟子>` — 关系区双行布局 + status 中文 badge + 标签中点分隔
   - `inspect <弟子>` — header 显示 "男 · 慕异" 格式
   - `relationships <弟子>` — 显示 orientation + edge.status 中文 + 统一分隔符
   - 等待社交事件 → MUD 日志使用多样化模板文案
   - 碰面文案中出现正确代词（他/她）
3. `npx tsx scripts/regression-all.ts` — 回归全通过
4. `npx tsx scripts/verify-social-system.ts` — 社交验证全通过
