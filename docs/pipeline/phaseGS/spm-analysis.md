# Phase GS — SPM 分析过程记录

> **日期**：2026-04-02 | **分析师**：SPM (Claude)
> **输入**：FB-018 弟子性别系统缺失 + 用户采访

---

## 1. 需求采访摘要

| 维度 | 结论 |
|------|------|
| 核心定位 | 性别基础设施 + 需求债务地图 |
| 性别模型 | 三元制：`'male' \| 'female' \| 'unknown'` |
| 本 Phase 做 | gender 字段、性别化名字、代词、AI prompt、存档迁移、债务清单 |
| 本 Phase 不做 | 外貌、繁衍/后代、性别锁定特性/灵根、爱慕/道侣深入实现 |
| 成功标准 | 性别化名字+代词正确、AI 感知性别、存档平滑迁移、完整债务清单 |

### 用户决策记录

| 决策点 | 选项 | 用户选择 |
|--------|------|---------|
| 核心体验 | (a)沉浸感 (b)差异化 (c)其他 | 差异化加强版：关系+AI+性格 |
| 系统边界 | (a)外貌OUT (b)繁衍OUT (c)性别锁定OUT | ABC 全部 OUT |
| 性别选项 | (a)二元 (b)三元 (c)其他 | (b) 三元 |
| 关系扩展边界 | (a)仅标签 (b)标签+机制 | 都不深做，登记为债务 |
| Phase 命名 | Phase GS | 确认 |
| 老存档迁移策略 | (a)随机 (b)全unknown (c)名字推测 | (c) 名字推测 |
| 生成比例 | (a)50/50 (b)可配置 | (b) 可配置 |
| 名字映射 5:5 | 接受 | 确认 |
| 名字池设计 | AI 设计 | 确认 |

---

## 2. 代码对账清单

### 2.1 字段对账

| 对账项 | 代码位置 | 状态 | 说明 |
|--------|---------|:----:|------|
| `LiteDiscipleState` | `game-state.ts:118-161` | ✅ | 现有 17 字段，+gender |
| `Gender` type | 新增 | 🆕 | `'male' \| 'female' \| 'unknown'` |
| `RelationshipTag` | `soul.ts:187` | ✅ | 5 值，本 Phase 不改 |
| `SAVE_VERSION = 6` | `save-manager.ts:25` | ✅ | 升至 7 |
| `PersonalityTraits` | `game-state.ts:106-112` | ✅ | 不改 |
| `DiscipleTrait` | `soul.ts:28-33` | ✅ | 不改 |
| `MoralAlignment` | `soul.ts:18-23` | ✅ | 不改 |

### 2.2 类型对账

| 新类型/字段 | 引用的已有类型 | 确认 |
|------------|--------------|:----:|
| `LiteDiscipleState.gender` | Gender (新增) | ✅ |
| `FEMALE_RATIO` | number 常量 | ✅ |
| `NAME_GENDER_MAP` | Record<string, Gender> | ✅ |

### 2.3 枚举对账

| 枚举 | PRD 中使用的值 | 代码实际值 | 匹配 |
|------|--------------|-----------|:----:|
| Gender | male, female, unknown | 🆕 新增 | ✅ |
| RelationshipTag | 不使用 | friend, rival, mentor, admirer, grudge | ✅ 不改 |
| DiscipleBehavior | 不使用 | IDLE, MEDITATE, ALCHEMY, FARM, EXPLORE, REST, BOUNTY | ✅ 不改 |

### 2.4 影响文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/shared/types/game-state.ts` | 类型新增 | +Gender type, +gender field |
| `src/engine/disciple-generator.ts` | 逻辑改动 | 性别生成 + 名字池拆分 |
| `src/engine/save-manager.ts` | 迁移新增 | +migrateV6toV7, SAVE_VERSION=7 |
| `src/ai/soul-prompt-builder.ts` | prompt 改动 | 身份描述 +性别 |
| `src/ui/mud-formatter.ts` | 显示改动 | +性别标记(♂/♀) |
| `src/shared/data/goal-data.ts` | 无改动 | {pronoun} 已存在 |
| goal-tick handler | 逻辑改动 | 填充 {pronoun} |

### 2.5 关键发现

1. **{pronoun} 占位符已存在**：`goal-data.ts:69,71` 中 GOAL_MUD_TEXT 已有 `{pronoun}` 但未填充
2. **encounter-templates 不需改**：使用 `{A}{B}` 占位符，无代词
3. **narrative-snippet-builder 不需改**：使用 `{A}与{B}` 格式
4. **trait-registry 不需改**：所有 trait 性别中立

**未解决不匹配项**：0

---

## 3. 规格深度自检

| C# | 状态 | 证据锚点 |
|----|:----:|---------|
| C1 实体全量枚举 | ✅ | Gender 3 值（PRD §4.1）；姓氏 15 个（§4.4）；男名 15 个（§4.4）；女名 15 个（§4.4）；代词 3×3（§4.3）；迁移映射 10 条（§4.5） |
| C2 规则映射表 | ✅ | R-01~R-07 共 7 条（PRD §4.2），输入→输出完整展开 |
| C3 公式全参数 | ⬜ | 不适用 — 本 Phase 无数值公式（I1） |
| C4 阈值/标签表 | ⬜ | 不适用 — 无新阈值，RelationshipTag 不改 |
| C5 Fallback 文案 | ✅ | unknown 代词="其"（§4.3）；迁移 fallback=随机（§4.5） |
| C6 效果数值表 | ⬜ | 不适用 — gender 无数值效果（I1, I5） |

**结论**：2 ✅ + 3 ⬜ + 0 ❌ → 通过
