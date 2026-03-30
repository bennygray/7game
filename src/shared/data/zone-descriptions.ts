/**
 * 地点场景描述数据 — Phase H-α
 *
 * 包含：
 * - ZONE_DESCRIPTIONS: 6 个 Zone 的固定场景描述（look 命令展示）
 * - AMBIENT_BREATHING_POOL: 全局共用环境呼吸文案池（25~45s 随机触发）
 *
 * 设计原则：
 * - 纯数据，无副作用，无 DOM 依赖
 * - 全局呼吸文案不区分 Zone（USER 决策 2026-03-30）
 *
 * @see phaseH-alpha-PRD.md §2.1 E5
 */

import type { LocationTag } from '../types/encounter';

/** 地点固定场景描述 — PRD E5 */
export const ZONE_DESCRIPTIONS: Record<LocationTag, string> = {
  'sect-hall':      '宗门大殿中央立着一座古朴的青石香炉，袅袅清烟随风四散。两侧的木柱上刻满了历代宗主的训诫。',
  'back-mountain':  '苍松翠柏间，灵气氤氲缭绕。山泉叮咚作响，是修炼打坐的绝佳之地。',
  'dan-room':       '丹炉中火焰跳动，药香弥漫。墙上挂满了各色丹方，有些已经泛黄。角落堆着成箱的药材。',
  'ling-tian':      '整齐的灵田一畦畦延伸开去，嫩绿的灵草在微风中轻轻摇曳。田间水渠引来山泉，潺潺流淌。',
  'bounty-field':   '悬赏告示牌上贴满了各色任务委托，从采药到除妖应有尽有。',
  'ling-shou-shan': '密林深处传来低沉的兽吼，空气中弥漫着危险的气息。偶有灵气喷涌而出，这里灵脉异常活跃。',
};

/**
 * 全局环境呼吸文案池 — PRD E5
 *
 * 触发规则：25~45s 随机一条（BREATH 级，暗灰色）
 * 不区分 Zone（USER 决策：弟子人数少，不需要分化）
 */
export const AMBIENT_BREATHING_POOL: readonly string[] = [
  '远处传来仙鹤的清唳，在山谷间悠悠回荡。',
  '一阵山风拂过，松涛阵阵。',
  '香炉中的檀香又换了新的，清烟袅袅。',
  '一只蓝色的灵蝶在花丛间翩翩起舞。',
  '石缝中一株灵芝悄然生长，散发着微弱的荧光。',
  '空气中飘来一阵丹药的清香。',
  '远处似乎传来低沉的兽吼，转瞬即逝。',
  '一阵微风穿过宗门，廊下铜铃轻轻作响。',
];
