/**
 * 世界事件注册表 — Phase F0-β
 *
 * 12 个预定义世界事件（战斗 4 + 访客 3 + 发现 3 + 宗门 2）
 * 每个事件含 3 条 MUD 文案模板
 *
 * 设计原则：
 * - I5: 静态池只增不删（Object.freeze 防篡改）
 * - condition 为纯函数，只读 GameState
 * - templates 支持 {D} {D2} 占位符（弟子名）
 *
 * @see phaseF0-beta-PRD.md §3 事件池
 */

import type { LiteGameState } from '../types/game-state';
import type { WorldEventDef } from '../types/world-event';
import { EventSeverity } from '../types/world-event';

/** 弟子数量 ≥ N 条件 */
function hasMinDisciples(state: LiteGameState, n: number): boolean {
  return state.disciples.length >= n;
}

/** 全量世界事件注册表 */
export const WORLD_EVENT_REGISTRY: readonly WorldEventDef[] = Object.freeze([

  // ===== 战斗类（4 个） =====

  {
    id: 'WE-B01',
    name: '妖兽试探',
    baseSeverity: EventSeverity.BREATH,
    weight: 15,
    scope: 'single' as const,
    polarity: 'neutral' as const,
    canEscalate: true,
    ethosAffinity: { sign: +1, factor: 0.2 },
    condition: () => true,
    templates: [
      '山门外传来低沉的兽吼，{D}循声望去，只见林间一道黑影一闃而逝。',
      '{D}巡山时发现一串陌生的爪印，看形状似乎是低阶妖兽所留。',
      '一只灵雀惊叫着飞过{D}头顶，远处山峦似有瘴气升腾。',
    ],
  },
  {
    id: 'WE-B02',
    name: '妖兽袭扰',
    baseSeverity: EventSeverity.RIPPLE,
    weight: 10,
    scope: 'single' as const,
    polarity: 'negative' as const,
    canEscalate: true,
    ethosAffinity: { sign: +1, factor: 0.3 },
    condition: (state) => hasMinDisciples(state, 3),
    templates: [
      '一头受伤的妖兽闯入灵田边缘，{D}挺身而出将其驱离，衣袖沾了些泥。',
      '{D}在药圃浇灌时，一条蛇妖蜿蜒而至，对峙片刻后退入深林。',
      '夜间值守的{D}发现妖兽潜入灵石矿脉入口，奋力击退了它。',
    ],
  },
  {
    id: 'WE-B03',
    name: '妖潮预警',
    baseSeverity: EventSeverity.SPLASH,
    weight: 5,
    scope: 'multi' as const,
    polarity: 'negative' as const,
    canEscalate: true,
    ethosAffinity: { sign: +1, factor: 0.5 },
    condition: (state) => hasMinDisciples(state, 5),
    templates: [
      '远方灵脉异动，{D}和{D2}奉命加固山门禁制，空气中弥漫着不安的气息。',
      '数十只低阶妖兽齐聚山脚，{D}和{D2}日夜轮守，防止妖兽突破结界。',
      '探查归来的{D}面色凝重，告知{D2}前方发现了妖兽群居的迹象。',
    ],
  },
  {
    id: 'WE-B04',
    name: '妖潮来袭',
    baseSeverity: EventSeverity.STORM,
    weight: 2,
    scope: 'sect' as const,
    polarity: 'negative' as const,
    canEscalate: false,
    ethosAffinity: { sign: +1, factor: 0.8 },
    condition: (state) => hasMinDisciples(state, 6),
    templates: [
      '妖潮终于爆发！宗门全员出动抵御兽群，{D}和{D2}护卫核心阵眼。',
      '铺天盖地的妖兽从山谷涌来，{D}和{D2}背靠背迎战，灵力消耗殆尽。',
      '三日妖潮终于退去，{D}和{D2}瘫坐在地，周围尽是焦土与残骸。',
    ],
  },

  // ===== 访客类（3 个） =====

  {
    id: 'WE-V01',
    name: '散修来访',
    baseSeverity: EventSeverity.BREATH,
    weight: 12,
    scope: 'single' as const,
    polarity: 'positive' as const,
    canEscalate: false,
    ethosAffinity: { sign: -1, factor: 0.2 },
    condition: () => true,
    templates: [
      '一位衣衫朴素的散修路过宗门，向{D}打听附近的灵草产地。',
      '{D}在山门遇到一名行脚散修，对方请求借宿一晚以恢复灵力。',
      '一位年迈散修倚杖而来，对{D}说了几句意味深长的话便飘然离去。',
    ],
  },
  {
    id: 'WE-V02',
    name: '商队过境',
    baseSeverity: EventSeverity.RIPPLE,
    weight: 8,
    scope: 'multi' as const,
    polarity: 'positive' as const,
    canEscalate: false,
    ethosAffinity: { sign: -1, factor: 0.3 },
    condition: (state) => hasMinDisciples(state, 3),
    templates: [
      '一支灵材商队路过宗门，{D}和{D2}好奇地围观他们的货物。',
      '商队带来了远方的消息，{D}和{D2}听闻邻国仙门开山收徒的奇闻。',
      '{D}和{D2}帮商队搬运货物，商队掌柜送了几枚品质不错的灵石作为感谢。',
    ],
  },
  {
    id: 'WE-V03',
    name: '名门弟子造访',
    baseSeverity: EventSeverity.SPLASH,
    weight: 4,
    scope: 'sect' as const,
    polarity: 'neutral' as const,
    canEscalate: false,
    ethosAffinity: { sign: -1, factor: 0.5 },
    condition: (state) => hasMinDisciples(state, 5),
    templates: [
      '一位名门弟子前来切磋，{D}和{D2}感受到了与大宗门弟子之间的差距。',
      '远方名门弟子路过此地，对宗门指点了几句阵法布置，{D}和{D2}获益匪浅。',
      '名门弟子以考验之名向{D}和{D2}发起比试，虽败犹荣。',
    ],
  },

  // ===== 发现类（3 个） =====

  {
    id: 'WE-D01',
    name: '灵草丛生',
    baseSeverity: EventSeverity.BREATH,
    weight: 14,
    scope: 'single' as const,
    polarity: 'positive' as const,
    canEscalate: false,
    ethosAffinity: { sign: 0, factor: 0 },
    condition: () => true,
    templates: [
      '{D}在山溪旁发现了一簇野生灵草，小心翼翼地采摘了回来。',
      '早课后的{D}在后山闲逛，偶然发现石缝中长出了一株罕见的草药。',
      '{D}打坐时感应到附近灵气汇聚，循迹发现了一片隐秘的灵草地。',
    ],
  },
  {
    id: 'WE-D02',
    name: '古物出土',
    baseSeverity: EventSeverity.RIPPLE,
    weight: 6,
    scope: 'single' as const,
    polarity: 'positive' as const,
    canEscalate: true,
    ethosAffinity: { sign: 0, factor: 0 },
    condition: (state) => hasMinDisciples(state, 3),
    templates: [
      '{D}挖掘灵田时触到坚硬之物，刨出一块刻有古纹的石碑残片。',
      '大雨冲刷后，{D}在山路上捡到一枚古旧的玉简，上面隐约有经文浮现。',
      '{D}在旧窖中发现了前人遗留的丹炉残骸，炉壁上的阵纹依稀可辨。',
    ],
  },
  {
    id: 'WE-D03',
    name: '灵脉异动',
    baseSeverity: EventSeverity.SPLASH,
    weight: 3,
    scope: 'sect' as const,
    polarity: 'neutral' as const,
    canEscalate: true,
    ethosAffinity: { sign: 0, factor: 0 },
    condition: (state) => hasMinDisciples(state, 5),
    templates: [
      '宗门地下灵脉突然震颤，{D}和{D2}感到修炼速度骤然加快，又很快恢复正常。',
      '灵脉深处发出嗡鸣，{D}和{D2}以为地动，慌忙跑出洞府查看。',
      '{D}和{D2}打坐时同时感应到灵脉波动，回去一对比发现悟性略有提升。',
    ],
  },

  // ===== 宗门类（2 个） =====

  {
    id: 'WE-S01',
    name: '香火日',
    baseSeverity: EventSeverity.BREATH,
    weight: 10,
    scope: 'sect' as const,
    polarity: 'positive' as const,
    canEscalate: false,
    ethosAffinity: { sign: -1, factor: 0.3 },
    condition: () => true,
    templates: [
      '今日是宗门香火日，{D}和{D2}在祖师堂前焚香祭拜，心中一片宁静。',
      '香火日到来，{D}和{D2}清扫祖师堂，忆起入门时的誓言。',
      '宗门上下齐聚大殿，{D}和{D2}在钟声中静坐冥想，感受宗门气运流转。',
    ],
  },
  {
    id: 'WE-S02',
    name: '论道大会',
    baseSeverity: EventSeverity.RIPPLE,
    weight: 5,
    scope: 'sect' as const,
    polarity: 'positive' as const,
    canEscalate: false,
    ethosAffinity: { sign: -1, factor: 0.5 },
    condition: (state) => hasMinDisciples(state, 4),
    templates: [
      '宗门召开论道大会，{D}和{D2}就修炼路线各抒己见，气氛热烈。',
      '论道会上{D}提出了独到见解，赢得了{D2}的赞许。',
      '{D}和{D2}在论道会后仍意犹未尽，继续在月下讨论至深夜。',
    ],
  },
]);
