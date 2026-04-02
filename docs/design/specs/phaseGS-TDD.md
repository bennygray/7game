# Phase GS — 弟子性别系统 TDD

> **Phase**：GS (Gender System) | **PRD**：[phaseGS-PRD.md](../../features/phaseGS-PRD.md)
> **GATE 1**：PASSED 2026-04-02
> **日期**：2026-04-02 | **维护者**：/SGA

---

## Step 1：全局对齐 + Invariant 验证

### 1.1 分层归属

| 变更 | 层级 | 文件 | 说明 |
|------|------|------|------|
| Gender type + field | ① Data | `game-state.ts` | 类型定义 |
| 名字池 + 代词映射 | ① Data | `disciple-generator.ts` (常量部分) | 数据表 |
| getPronoun 工具函数 | ① Data | `game-state.ts` 或新 `gender-utils.ts` | 纯函数 |
| 性别生成逻辑 | ② Engine | `disciple-generator.ts` | 生成器 |
| 存档迁移 | ② Engine | `save-manager.ts` | 迁移链 |
| {pronoun} 填充 | ② Engine | `goal-tick.handler.ts` | Handler |
| {pronoun} 填充 #2 | ② Engine | `soul-engine.ts` | logGoalAssigned pronoun |
| AI prompt 注入 | ③ AI | `soul-prompt-builder.ts` | prompt 构建 |
| 性别显示 | ④ Presentation | `mud-formatter.ts` | 格式化 |

### 1.2 Invariant 对照

| PRD Invariant | 架构冲突？ | 说明 |
|---------------|:---------:|------|
| I1 性别不影响数值 | ✅ 无冲突 | 数值公式在 `shared/formulas/`，gender 不入公式 |
| I2 性别不可变 | ✅ 无冲突 | 匹配 `initialMoral` 模式（约定级，无 setter） |
| I3 老存档必须有性别 | ✅ 无冲突 | 迁移链 v6→v7 逐弟子赋值（注意：defaults 兜底仅合并顶层 key，不深入 disciples 数组元素，因此 migrateV6toV7 必须遍历每个弟子显式赋值 gender） |
| I4 unknown 用"其" | ✅ 无冲突 | `getPronoun()` fallback |
| I5 不硬编码行为差异 | ✅ 无冲突 | 仅注入 prompt，LLM 自然产生差异 |

### 1.3 Grep 证据

| 判断 | 证据 |
|------|------|
| Gender type 不存在 | `grep "type Gender" src/` → 0 结果 |
| gender 字段不存在 | `grep "gender" src/shared/types/` → 0 结果 |
| getPronoun 不存在 | `grep "getPronoun" src/` → 0 结果 |
| SAVE_VERSION = 6 | `save-manager.ts:25` → `const SAVE_VERSION = 6;` |
| {pronoun} 硬编码 #1 | `goal-tick.handler.ts:39` → `const pronoun = '其';` |
| {pronoun} 硬编码 #2 | `soul-engine.ts:571` → `.replace(/\{pronoun\}/g, '其')` |
| Identity prompt | `soul-prompt-builder.ts:200` → `` `你是修仙宗门弟子「${subject.name}」` `` |

---

## Step 2：Interface 设计 + 数据变更 + 迁移策略

### 2.1 新增类型

```typescript
// game-state.ts
export type Gender = 'male' | 'female' | 'unknown';
```

### 2.2 LiteDiscipleState 扩展

```typescript
// game-state.ts:160 后插入
export interface LiteDiscipleState {
  // ... 现有字段 ...
  traits: DiscipleTrait[];

  // === Phase GS 新增 — 弟子性别系统 ===

  /** 性别（生成后不可变） */
  gender: Gender;
}
```

**Owner**：`DiscipleGenerator` 初始化写入，生成后只读。

### 2.3 代词工具函数

```typescript
// game-state.ts 底部（与 createDefaultLiteGameState 同文件），或新文件 gender-utils.ts

const PRONOUN_MAP: Record<Gender, { subject: string; possessive: string }> = {
  male:    { subject: '他', possessive: '他的' },
  female:  { subject: '她', possessive: '她的' },
  unknown: { subject: '其', possessive: '其' },
};

export function getPronoun(gender: Gender): string {
  return PRONOUN_MAP[gender]?.subject ?? '其';
}

export function getGenderLabel(gender: Gender): string {
  const labels: Record<Gender, string> = { male: '男', female: '女', unknown: '未知' };
  return labels[gender] ?? '未知';
}

export function getGenderSymbol(gender: Gender): string {
  const symbols: Record<Gender, string> = { male: '♂', female: '♀', unknown: '' };
  return symbols[gender] ?? '';
}
```

**ADR-GS-01 决策**：`getPronoun` 放在 `game-state.ts` 而非新文件。理由：函数极小（3 行），Gender type 在同文件定义，避免新增文件。如未来代词逻辑复杂化（物主/反身），再抽出。

### 2.4 名字池重构

```typescript
// disciple-generator.ts 现有 SURNAMES + GIVEN_NAMES 替换为：

const SURNAMES = [
  '林', '陈', '张', '李', '王', '赵', '周', '吴', '孙', '刘',
  '萧', '苏', '沈', '叶', '顾',
];

const MALE_GIVEN_NAMES = [
  '清风', '星河', '玄冰', '天华', '承志',
  '昊然', '九霄', '剑鸣', '长渊', '铁衣',
  '鸿飞', '墨尘', '崇岳', '砺锋', '破军',
];

const FEMALE_GIVEN_NAMES = [
  '明月', '紫霞', '云烟', '碧落', '青莲',
  '灵犀', '瑶琴', '秋水', '若兰', '素心',
  '落雁', '凝霜', '映雪', '绮梦', '蝶衣',
];

/** 生成比例：女性概率 */
const FEMALE_RATIO = 0.5;
```

### 2.5 generateRandomDisciple 变更

```typescript
// disciple-generator.ts:64 generateRandomDisciple()
// 新增逻辑（伪代码）：

const gender: Gender = Math.random() < FEMALE_RATIO ? 'female' : 'male';
const givenNames = gender === 'male' ? MALE_GIVEN_NAMES : FEMALE_GIVEN_NAMES;
const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
const name = `${surname}${givenName}`;

// return 对象新增：
return {
  // ...现有字段...
  traits: generateInnateTraits(),
  gender,  // 新增
};
```

### 2.6 generateInitialDisciples 变更

> ⚠️ `generateInitialDisciples` 是**独立实现**（L110-170），不调用 `generateRandomDisciple`。需独立注入 gender 逻辑。

```typescript
// disciple-generator.ts:115-123 — 名字生成循环内新增 gender
const gender: Gender = Math.random() < FEMALE_RATIO ? 'female' : 'male';
const givenNames = gender === 'male' ? MALE_GIVEN_NAMES : FEMALE_GIVEN_NAMES;
let name: string;
do {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  name = `${surname}${givenName}`;
} while (usedNames.has(name));

// L149 return 对象新增：
return {
  // ...现有字段...
  traits: generateInnateTraits(),
  gender,  // 新增
};
```

防重名 Set 已存在，名字组合空间 15×15=225 >> 8。

### 2.7 存档迁移 v6→v7

```typescript
// save-manager.ts — 在 migrateV5toV6 后新增

/** 老存档名字→性别推测表 */
const NAME_GENDER_MAP: Record<string, Gender> = {
  '清风': 'male',  '星河': 'male',  '玄冰': 'male',  '天华': 'male',
  '明月': 'female', '紫霞': 'female', '云烟': 'female',
  '碧落': 'female', '青莲': 'female', '灵犀': 'female',
};

function migrateV6toV7(raw: Record<string, unknown>): void {
  const disciples = raw.disciples as Array<Record<string, unknown>>;
  if (!disciples) return;
  for (const d of disciples) {
    const name = d.name as string;
    // 提取 givenName：假设姓氏为 1 字符
    const givenName = name?.slice(1) ?? '';
    d.gender = NAME_GENDER_MAP[givenName] ?? (Math.random() < 0.5 ? 'female' : 'male');
  }
}
```

**迁移链更新**：`migrateSave()` 中新增 `if (version < 7) migrateV6toV7(raw);`

**SAVE_VERSION**：`6` → `7`

**createDefaultLiteGameState**：`version: 7`

**givenName 提取假设**：所有姓氏均为单字（15 个姓全部是单字 ✅）。断言 `name.length >= 2`。

### 2.8 createDefaultLiteGameState 变更

```typescript
// game-state.ts:290 — version: 6 → version: 7
// 无需改 disciples 初始化（由 generateInitialDisciples 自带 gender）
```

---

## Step 3：Pipeline 挂载 + 依赖矩阵 + 回归影响

### 3.1 Pipeline 挂载

**无新 Handler**。性别系统不需要 tick 级处理。

变更在两处 {pronoun} 硬编码：
- `goal-tick.handler.ts:39`：`const pronoun = '其'` → `const pronoun = getPronoun(disciple?.gender ?? 'unknown')`
- `soul-engine.ts:571`：`.replace(/\{pronoun\}/g, '其')` → `.replace(/\{pronoun\}/g, getPronoun(disciple?.gender ?? 'unknown'))`

两个文件均已有 `disciple` 引用（通过 `state.disciples.find()`），可直接读 gender。

### 3.2 依赖矩阵更新

| 文件 | 新增依赖 | 说明 |
|------|---------|------|
| `disciple-generator.ts` | +Gender type (game-state.ts) | 生成时需要 Gender |
| `goal-tick.handler.ts` | +getPronoun (game-state.ts) | 代词填充 |
| `soul-engine.ts` | +getPronoun (game-state.ts) | logGoalAssigned 代词填充 |
| `soul-prompt-builder.ts` | +Gender/getGenderLabel (game-state.ts) | prompt 注入 |
| `mud-formatter.ts` | +getGenderSymbol/getGenderLabel (game-state.ts) | 显示 |
| `save-manager.ts` | +Gender type (game-state.ts) | 迁移映射表 |

### 3.3 回归影响评估

| 影响范围 | 说明 | 风险 |
|---------|------|:----:|
| 弟子生成 | 新增 gender 字段，名字池变更 | 低 |
| 存档加载 | 迁移链新增一环 | 中 |
| AI prompt | 身份描述增 4-6 字 | 低 |
| MUD 显示 | 新增 ♂/♀ 符号 | 低 |
| goal-tick | pronoun 从硬编码→动态 | 低 |

---

## Step 4：ADR 决策日志

### ADR-GS-01：getPronoun 函数位置

| 项 | 内容 |
|---|------|
| **决策** | `getPronoun`/`getGenderLabel`/`getGenderSymbol` 放在 `game-state.ts` |
| **备选** | A) 新建 `src/shared/utils/gender-utils.ts` |
| **选择理由** | 函数极小（各 3 行），Gender type 在 game-state.ts 定义，避免新增文件。如未来复杂化再抽出。 |
| **后果** | game-state.ts 增加 ~20 行。可接受。 |

### ADR-GS-02：迁移策略 — 名字推测 vs 随机

| 项 | 内容 |
|---|------|
| **决策** | 老存档弟子基于 givenName 查映射表推测性别，fallback 随机 |
| **备选** | A) 全部随机 B) 全部 unknown |
| **选择理由** | 用户选择 D1=C。10 个现有名字全部有明确映射（5:5），fallback 仅对自定义名字生效。 |
| **后果** | 现有存档弟子性别确定性高，玩家体验连续。 |

### ADR-GS-03：不新建 Pipeline Handler

| 项 | 内容 |
|---|------|
| **决策** | 不新建 Handler，仅修改 goal-tick.handler.ts 的硬编码 pronoun |
| **备选** | A) 新建 gender-tick handler 统一管理代词 |
| **选择理由** | 性别是静态属性（生成后不变），无需 tick 级处理。唯一需要 tick 时填充的是 {pronoun}，已在 goal-tick 中。 |
| **后果** | Pipeline 零变更，零风险。 |

---

## Step 5：关联性影响审计

### 5.1 类型扩展引用追踪

本 Phase 新增 `Gender` type 但不扩展任何**现有** union type。无全量 Record 需补充。

| 扩展类型 | 引用文件 | 引用形式 | 需修改 |
|---------|---------|---------|:-----:|
| (无扩展现有类型) | — | — | — |

Gender 是全新 type，仅被新代码引用。

### 5.2 函数签名变更影响

| 函数 | 变更 | 调用处 | 需适配 |
|------|------|--------|:-----:|
| `generateRandomDisciple()` | 返回值 +gender 字段 | `disciple-generator.ts` 内部 | ✅ 自包含 |
| `generateInitialDisciples()` | 返回值 +gender 字段（独立实现，需独立注入） | `game-state.ts:288 createDefaultLiteGameState` | ✅ 自动传递 |
| `renderGoalText()` | pronoun 从硬编码→读 disciple.gender | `goal-tick.handler.ts` 内部 | ✅ 自包含 |
| `logGoalAssigned()` | pronoun 从硬编码→读 disciple.gender | `soul-engine.ts` 内部 | ✅ 自包含 |

无外部调用处需适配。所有变更自包含在各自文件中。

### 5.3 PRD 副效果→TDD 执行位置映射

| PRD 副效果 | TDD 执行位置 |
|-----------|-------------|
| 性别→名字池选择 | `disciple-generator.ts` generateRandomDisciple() |
| 性别→代词填充 #1 | `goal-tick.handler.ts:39` renderGoalText() |
| 性别→代词填充 #2 | `soul-engine.ts:571` logGoalAssigned() |
| 性别→AI prompt | `soul-prompt-builder.ts:200` buildSoulEvalPrompt() |
| 性别→MUD 显示 | `mud-formatter.ts` formatLookOverview/Profile/Inspect |
| 老存档→性别赋值 | `save-manager.ts` migrateV6toV7() |

### 5.4 Handler 联动检查

无 Handler 联动需求。goal-tick 已有 disciple 引用（`ctx.state.disciples.find()`），可直接读 gender。

### 5.5 测试脚本影响审计

| 公式/逻辑文件 | 引用脚本 | 需更新 | 说明 |
|-------------|---------|:-----:|------|
| `disciple-generator.ts` | `regression-all.ts` | ✅ | 需验证新弟子有 gender |
| `save-manager.ts` | `regression-all.ts` | ✅ | 需验证 v6→v7 迁移 |
| `goal-tick.handler.ts` | `regression-all.ts` | ⚠️ | 建议新增 pronoun 验证 case |
| `mud-formatter.ts` | 无直接引用脚本 | — | UI 手动验证 |

### 5.6 文档一致性审计

| # | 检查项 | 判定 |
|---|--------|:----:|
| 1 | 新增代码文件 → INDEX.md | N/A — 不新增文件 |
| 2 | 新增 GameState 字段 → gamestate.md | ✅ 需更新 |
| 3 | 新增 Pipeline Handler → pipeline.md | N/A — 不新增 Handler |
| 4 | 新增依赖 → dependencies.md | ✅ 需更新（5 个文件新增 import） |
| 5 | 新增资源/公式 → economy.md / formulas.md | N/A — 无新资源 |

### 5.7 回归测试执行清单

| 条件 | 执行 |
|------|------|
| 修改 GameState + Handler | `npm run test:regression` |
| 修改 UI 格式化 | 手动浏览器验证（TD-016 无 E2E） |
| 新增迁移 | 新增 v6→v7 迁移测试 case |

### 5.8 存档迁移链完整性

| 检查项 | 结果 |
|--------|:----:|
| TDD 是否新增 GameState 持久化字段？ | ✅ 是（gender） |
| migrateV6toV7 已规划？ | ✅ 见 §2.7 |
| schema.md 更新已列入？ | ✅ 见下方文件变更汇总 |

### 5.9 产出校验 — 文件变更汇总

| # | 文件 | 变更类型 | 说明 |
|---|------|---------|------|
| 1 | `src/shared/types/game-state.ts` | ✏️ 修改 | +Gender type, +gender field, +getPronoun/getGenderLabel/getGenderSymbol, version 6→7 |
| 2 | `src/engine/disciple-generator.ts` | ✏️ 修改 | SURNAMES 扩展 10→15, GIVEN_NAMES 拆为 MALE/FEMALE 各 15, +FEMALE_RATIO, +gender 生成逻辑 |
| 3 | `src/engine/save-manager.ts` | ✏️ 修改 | +NAME_GENDER_MAP, +migrateV6toV7(), SAVE_VERSION 6→7, 迁移链 +1 环 |
| 4 | `src/ai/soul-prompt-builder.ts` | ✏️ 修改 | identity block +性别描述（~4 字） |
| 5 | `src/ui/mud-formatter.ts` | ✏️ 修改 | formatLookOverview +♂/♀, formatDiscipleProfile +性别行, formatDiscipleInspect +性别行 |
| 6 | `src/engine/handlers/goal-tick.handler.ts` | ✏️ 修改 | L39: `'其'` → `getPronoun(disciple.gender)` |
| 7 | `src/engine/soul-engine.ts` | ✏️ 修改 | L571: `'其'` → `getPronoun(disciple.gender)` |
| 8 | `docs/design/arch/gamestate.md` | ✏️ 文档 | +gender 字段到拓扑树 |
| 9 | `docs/design/arch/schema.md` | ✏️ 文档 | +v7 变更链 |
| 10 | `docs/design/arch/dependencies.md` | ✏️ 文档 | 6 文件新增 import 关系 |
| 11 | `docs/project/prd/systems.md` | ✏️ 文档 | +弟子性别系统 |
| 12 | `docs/project/feature-backlog.md` | ✏️ 文档 | FB-018 标记清偿 + FB-021~026 登记 |
| 13 | `scripts/regression-all.ts` | ✏️ 测试 | +gender 生成验证 + v6→v7 迁移验证 + pronoun 验证 |

**总计**：7 代码文件 + 4 文档文件 + 1 feature-backlog + 1 测试脚本 = **13 文件**

---

## SGA Signoff

- [x] Interface 设计完整（gender 字段 Owner = DiscipleGenerator）
- [x] 迁移策略完整（migrateV6toV7 已规划）
- [x] Pipeline 挂载方案确认（无新 Handler，修改 goal-tick）
- [x] 依赖矩阵已更新（5 文件新增 import）
- [x] Step 5 关联性审计已执行（5.1~5.9 全部完成）
- [ ] 评审文件完整性：待 Party Review
- [ ] Party Review 无 BLOCK 项
- [ ] 技术债务已登记

签章：待 GATE 2 审查通过
