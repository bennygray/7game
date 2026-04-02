# Phase UI-S — 社交系统显示与模板补全 TDD

> **版本**：v1.0 | **日期**：2026-04-02
> **作者**：/SGA | **状态**：Draft
> **PRD 引用**：[phaseUI-S-PRD.md](../../features/phaseUI-S-PRD.md) — GATE 1 PASSED

---

## §1 全局对齐

### 1.1 层级归属

| 变更项 | 层级 | 文件 |
|--------|------|------|
| 共享标签工具 | ① Data | `src/shared/utils/social-labels.ts`（新建） |
| 模板填充扩展 | ① Data | `src/shared/data/encounter-templates.ts` |
| 社交模板填充 | ① Data | `src/shared/data/social-event-templates.ts` |
| 面板渲染重构 | ④ Presentation | `src/ui/mud-formatter.ts` |
| 命令处理补全 | ④ Presentation | `src/ui/command-handler.ts` |
| 社交日志模板化 | ② Engine（仅日志输出） | `src/engine/handlers/social-tick.handler.ts` |
| 碰面代词传递 | ② Engine（仅日志输出） | `src/engine/handlers/encounter-tick.handler.ts` |
| 主题样式 | ④ Presentation | `src/styles/mud-theme.css` |

### 1.2 Invariant 验证

| PRD 不变量 | 架构约束 | 冲突 |
|-----------|---------|:----:|
| I1 UI↔GameState 同步 | X-1 禁止 UI 修改 GameState | 无冲突（只读） |
| I2 中文化 | 无约束 | N/A |
| I3 无残留占位符 | 无约束 | N/A |
| I4 代词一致 | 无约束 | N/A |
| I5 不修改计算逻辑 | X-1 UI 不改 GameState | 无冲突 |

### 1.3 零变更确认

- **GameState 新字段**：无
- **Pipeline 挂载变更**：无（social-tick.handler 的 phase/order 不变）
- **存档迁移**：无（存档版本保持 v8）
- **新 npm 依赖**：无

---

## §2 Interface 设计

### 2.1 新建 `src/shared/utils/social-labels.ts`

```typescript
import type { RelationshipStatus, RelationshipTag } from '../types/soul';
import type { Orientation, Gender } from '../types/game-state';

/** Status → 中文标签 */
export const RELATIONSHIP_STATUS_LABEL: Record<RelationshipStatus, string> = {
  crush: '倾慕',
  lover: '道侣',
  'sworn-sibling': '金兰',
  nemesis: '宿敌',
};

/** Tag → 中文标签 */
export const RELATIONSHIP_TAG_LABEL: Record<RelationshipTag, string> = {
  friend: '知己',
  rival: '对头',
  mentor: '师恩',
  admirer: '仰慕',
  grudge: '积怨',
};

/** 统一分隔符 */
export const TAG_SEPARATOR = '·';

/** Status 中文标签查询（null 安全） */
export function getRelationshipStatusLabel(status: RelationshipStatus | null): string | null;

/** 关系类型标签（提取自 social-tick.handler.ts） */
export function getRelationLabel(type: string): string;

/** 取向标签推导（PRD §4.3 优先级规则） */
export function getOrientationLabel(orientation: Orientation, gender: Gender): string;
```

### 2.2 扩展 `fillEncounterTemplate` 签名

```typescript
// 现有签名（L46）：
export function fillEncounterTemplate(
  template: string, nameA: string, nameB: string, locationLabel: string
): string;

// 变更后（可选参数，向后兼容）：
export function fillEncounterTemplate(
  template: string, nameA: string, nameB: string, locationLabel: string,
  pronounA?: string, pronounB?: string,
): string;
// 注：pronounA/pronounB 为 undefined 时，跳过 {P_A}/{P_B} 替换（不做 replace），
// 避免产出 "undefined" 字符串或违反 I3 不变量。
```

### 2.3 扩展 `getEncounterText` 签名

```typescript
// 现有签名（L61）：
export function getEncounterText(
  result, nameA, nameB, locationLabel, randomFn?
): string;

// 变更后（新增可选代词参数）：
export function getEncounterText(
  result, nameA, nameB, locationLabel,
  randomFn?, pronounA?: string, pronounB?: string,
): string;
```

> **ADR-UIS-02: 保持追加可选参数而非 options 对象**
>
> - **背景**：扩展后 getEncounterText 7 参数、fillEncounterTemplate 6 参数，超过 review-protocol 6 参数建议阈值
> - **决策**：保持追加可选参数
> - **理由**：(1) 最小变更原则——仅改签名尾部，现有 2 个调用处（handler+verify脚本）不受影响；(2) 改用 options 对象需修改所有调用处签名，扩大回归影响面；(3) encounter 模板系统稳定，未来再加参数可能性低
> - **后果**：encounter-tick.handler 调用处需传 `undefined` 跳过 randomFn（`getEncounterText(result, a.name, b.name, loc, undefined, pronounA, pronounB)`）。记入 tech-debt 作为未来重构候选。

### 2.4 新增 `fillSocialTemplate` 函数

```typescript
// 在 social-event-templates.ts 中新增
export function fillSocialTemplate(
  template: string,
  nameA: string, nameB: string, locationLabel: string,
  pronounA?: string, pronounB?: string,
): string;
// 注：pronounA/pronounB 为 undefined 时，跳过 {P_A}/{P_B} 替换。
// 替换 {A}/{B}/{L} 为必选，{P_A}/{P_B} 为可选。
```

### 2.5 social-tick.handler 模板化设计

social-tick.handler 当前硬编码 3 种日志（crush-mark/invitation/dissolution），需改为模板化输出。

**事件类型 → SocialEventType 路由表**（引用 PRD §4.4）：

| r.type | r.relationType | SocialEventType |
|--------|---------------|-----------------|
| crush-mark | — | social-flirt |
| invitation | lover | social-confession |
| invitation | sworn-sibling | social-sworn-proposal |
| invitation | nemesis | social-nemesis-declare |
| dissolution | lover | social-lover-broken |
| dissolution | sworn-sibling | social-sworn-broken |
| dissolution | nemesis | social-nemesis-resolved |

**调用链伪代码**：

```typescript
// 1. 获取弟子信息
const source = ctx.state.disciples.find(d => d.id === r.sourceId);
const target = ctx.state.disciples.find(d => d.id === r.targetId);
if (!source || !target) return;

// 2. 获取代词
const pronounA = getPronoun(source.gender);
const pronounB = getPronoun(target.gender);

// 3. 获取地点
const locTag = BEHAVIOR_LOCATION_MAP[source.behavior];
const locLabel = LOCATION_LABEL[locTag] ?? '宗门';

// 4. 路由到模板类型
const templateType = mapToSocialEventType(r.type, r.relationType);

// 5. 选取并填充模板
const template = pickSocialTemplate(templateType);
const text = fillSocialTemplate(template, source.name, target.name, locLabel, pronounA, pronounB);

// 6. 输出日志
ctx.logger.info(LogCategory.WORLD, 'social-tick', text);
```

**路由函数**：

```typescript
function mapToSocialEventType(type: string, relationType?: string): SocialEventType {
  if (type === 'crush-mark') return 'social-flirt';
  if (type === 'invitation') {
    if (relationType === 'lover') return 'social-confession';
    if (relationType === 'sworn-sibling') return 'social-sworn-proposal';
    if (relationType === 'nemesis') return 'social-nemesis-declare';
  }
  if (type === 'dissolution') {
    if (relationType === 'lover') return 'social-lover-broken';
    if (relationType === 'sworn-sibling') return 'social-sworn-broken';
    if (relationType === 'nemesis') return 'social-nemesis-resolved';
  }
  return 'social-flirt'; // fallback
}
```

---

## §3 文件变更汇总

| # | 文件 | 操作 | 变更说明 |
|---|------|------|---------|
| 1 | `src/shared/utils/social-labels.ts` | **新建** | 共享标签工具（3 常量 + 3 函数） |
| 2 | `src/shared/data/encounter-templates.ts` | 修改 | fillEncounterTemplate +代词参数；getEncounterText +代词参数；模板文案加 {P_A}/{P_B} |
| 3 | `src/shared/data/social-event-templates.ts` | 修改 | +fillSocialTemplate 函数；模板文案加 {P_A}/{P_B} |
| 4 | `src/ui/mud-formatter.ts` | 修改 | (a) renderRelationsSection 重构（中文标签+双行布局）；(b) formatDiscipleInspect header 新增 orientation 显示（仅 inspect，不影响 look） |
| 5 | `src/ui/command-handler.ts` | 修改 | relationships 命令补全（edge.status + orientation + 统一分隔符） |
| 6 | `src/engine/handlers/social-tick.handler.ts` | 修改 | 删除本地 getRelationLabel，改用模板化日志输出 |
| 7 | `src/engine/handlers/encounter-tick.handler.ts` | 修改 | getEncounterText 调用传入 pronounA/pronounB |
| 8 | `src/styles/mud-theme.css` | 修改 | +.mud-p-rel-status, .mud-p-rel-metrics CSS |

---

## §4 ADR

无重大架构决策。所有变更为纯展示/模板层，复用现有模式。

唯一值得记录的小决策：

**ADR-UIS-01: 保持 {LOC} vs {L} 占位符不统一**

- **背景**：encounter-templates 用 `{LOC}`，social-event-templates 用 `{L}`
- **决策**：保持现状，各自的 fill 函数处理各自占位符
- **理由**：统一需改模板文案 + 回归验证脚本，收益不大；两个模板系统独立演化
- **后果**：开发者需知悉两套模板占位符命名不同（在 fill 函数 JSDoc 中注明）

---

## §5 关联性影响审计

### 5.1 类型扩展引用追踪

本 Phase **不新增**任何联合类型成员。不适用。

### 5.2 函数签名变更影响

| 函数 | 变更 | 调用处 | 需适配 |
|------|------|--------|:-----:|
| `fillEncounterTemplate` | +pronounA?, +pronounB? 可选参数 | encounter-templates.ts L70 (`getEncounterText` 内部) | ✅ 透传代词 |
| `getEncounterText` | +pronounA?, +pronounB? 可选参数 | encounter-tick.handler.ts L204 | ✅ 传入代词 |
| `getEncounterText` | +pronounA?, +pronounB? 可选参数 | scripts/verify-phaseF0-alpha.ts L172 | ⚠️ 可选参数，不传=兼容 |

### 5.3 PRD 副效果映射

PRD 无副效果描述（纯展示变更）。不适用。

### 5.4 Handler 联动检查

social-tick.handler 日志输出变更不影响其他 Handler 的数据消费。encounter-tick.handler 日志输出变更同理。无联动。

### 5.5 测试脚本影响审计

| 公式/逻辑文件 | 引用脚本 | 需更新 | 说明 |
|-------------|---------|:-----:|------|
| encounter-templates.ts | scripts/verify-phaseF0-alpha.ts L172 | ⚠️ | getEncounterText 签名新增可选参数，现有调用不报错但不传代词 |
| social-event-templates.ts | scripts/verify-social-system.ts | ⚠️ | pickSocialTemplate 签名不变；新增 fillSocialTemplate 可增加测试 |

### 5.6 文档一致性审计

| # | 检查项 | 判定 |
|---|--------|------|
| 1 | 新增代码文件 → layers.md 更新？ | ✅ social-labels.ts 需登记到 Data 层；`src/shared/utils/` 子目录需在 layers.md 文件清单中注册 |
| 2 | 新增 GameState 字段 → gamestate.md？ | N/A |
| 3 | 新增 Pipeline Handler → pipeline.md？ | N/A |
| 4 | 新增依赖 → dependencies.md？ | N/A |
| 5 | 新增资源/公式 → economy/formulas？ | N/A |

### 5.7 回归测试范围

| 条件 | 必须运行 |
|------|---------|
| 修改 Handler 日志输出 | `npm run test:regression` |
| 修改 UI 格式化 | 浏览器手动验证（TD-016 无自动化） |
| 修改模板文件 | `npx tsx scripts/verify-social-system.ts` |

### 5.8 存档迁移链

- TDD 不新增 GameState 持久化字段 → **零迁移**

### 5.9 审计校验

文件变更前后对比：初始 8 文件，审计后仍为 8 文件。verify-phaseF0-alpha.ts 不需要修改（可选参数兼容），verify-social-system.ts 可考虑增加 fillSocialTemplate 测试但非必须。

---

## SGA Signoff

- [x] Interface 设计完整（新文件 social-labels.ts + fill 函数签名）
- [x] 迁移策略：零迁移（无 GameState 新字段）
- [x] Pipeline 挂载：无变更
- [x] 依赖矩阵：无变更
- [x] Step 5 关联性审计已执行（5.1-5.9 全部完成）
- [x] Party Review：待执行

签章：[x] GATE 2 PASSED — 2026-04-02（CONDITIONAL PASS, 3 WARN 已修复）
