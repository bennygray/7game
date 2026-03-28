/**
 * 概率突破引擎 — 突破判定 + buff 管理
 *
 * 核心流程：
 *   1. 检查自动突破条件（成功率≥80% + 灵气≥门槛）
 *   2. 不足时先用回灵丹补差额
 *   3. 执行概率判定
 *   4. 成功→升级 + 清 buff；失败→扣灵气 + 清 buff
 *
 * CR-A1: 突破冷却机制（防双重触发竞态）
 * CR-B2: 回灵丹估算使用实际品质
 * CR-B4: 移除不安全的 `as Realm` 断言
 * CR-P2: 使用 PILL_ID 常量
 *
 * @see 7game-lite-phaseC-analysis.md §3.1 F-C1a~C1c
 * @see Story #4
 */

import type { LiteGameState } from '../shared/types/game-state';
import { Realm } from '../shared/types/game-state';
import {
  calculateBreakthroughResult,
  getRealmAuraCost,
  getBreakthroughBaseRate,
  type BreakthroughResult,
} from '../shared/formulas/realm-formulas';
import { getRealmDisplayName } from '../shared/formulas/realm-display';
import { consumeHealPillsForBreakthrough, type PillConsumeLog } from './pill-consumer';
import {
  QUALITY_MULTIPLIER,
  PILL_ID,
  HEAL_PILL_BASE_AMOUNT,
  AUTO_BREAKTHROUGH_THRESHOLD,
  BREAKTHROUGH_SUCCESS_CAP,
} from '../shared/data/recipe-table';

/** 突破事件日志 */
export interface BreakthroughLog {
  /** 突破是否成功 */
  success: boolean;
  /** 概率突破结果（含详细数据） */
  result: BreakthroughResult;
  /** 回灵丹补差额日志（如有） */
  healLogs: PillConsumeLog[];
  /** MUD 日志文案 */
  message: string;
}

/** 突破冷却 tick 数（CR-A1: 防竞态） */
export const BREAKTHROUGH_COOLDOWN_TICKS = 3;

/**
 * 检查是否满足自动突破条件
 *
 * F-C1c: 成功率≥80% 且 灵气≥门槛（含回灵丹预补）
 *
 * CR-B2: 回灵丹估算使用实际品质倍率，而非固定最低值
 */
export function shouldAutoBreakthrough(state: LiteGameState): boolean {
  const baseRate = getBreakthroughBaseRate(state.realm, state.subRealm);
  if (baseRate < 0) return false;  // 不可突破

  const successRate = Math.min(baseRate + state.breakthroughBuff.totalBonus, BREAKTHROUGH_SUCCESS_CAP);
  if (successRate < AUTO_BREAKTHROUGH_THRESHOLD) return false;

  // 检查灵气是否足够（含回灵丹潜力）
  const nextSub = state.subRealm + 1;
  const cost = getRealmAuraCost(state.realm, nextSub);

  // CR-B2: 使用实际品质计算回灵丹潜力
  let potentialAura = state.aura;
  for (const pill of state.pills) {
    if (pill.defId === PILL_ID.HEAL && pill.count > 0) {
      const qMul = QUALITY_MULTIPLIER[pill.quality] ?? 0.6;
      potentialAura += pill.count * HEAL_PILL_BASE_AMOUNT * qMul;
    }
  }

  return potentialAura >= cost;
}

/**
 * 执行突破（手动或自动）
 *
 * @param rng 可注入的随机数生成器（测试用）
 */
export function executeBreakthrough(
  state: LiteGameState,
  rng?: () => number,
): BreakthroughLog {
  const healLogs: PillConsumeLog[] = [];

  // 1. 回灵丹补差额
  const nextSub = state.subRealm + 1;
  const cost = getRealmAuraCost(state.realm, nextSub);
  if (state.aura < cost) {
    const logs = consumeHealPillsForBreakthrough(state, cost);
    healLogs.push(...logs);
  }

  // 2. 概率判定
  const result = calculateBreakthroughResult(
    state.realm,
    state.subRealm,
    state.aura,
    state.breakthroughBuff.totalBonus,
    rng,
  );

  // 3. 不可突破
  if (!result.canAttempt) {
    let message: string;
    switch (result.blockReason) {
      case 'tribulation-required':
        message = '需天劫，暂不可突破';
        break;
      case 'max-realm':
        message = '已达当前版本境界上限';
        break;
      case 'aura-insufficient':
        message = `灵气不足，需 ${cost.toLocaleString()} 灵气`;
        break;
      default:
        message = '无法突破';
    }

    return { success: false, result, healLogs, message };
  }

  // 4. 结算
  if (result.success) {
    // 成功：扣灵气 + 升级
    state.aura -= result.auraCost;

    // CR-B4: 安全的 realm 赋值（带运行时校验）
    const newRealm = result.newRealm;
    if (newRealm === Realm.LIANQI || newRealm === Realm.ZHUJI) {
      state.realm = newRealm;
    } else {
      console.error(`[BreakthroughEngine] 未知境界值: ${newRealm}`);
      state.realm = Realm.LIANQI;
    }
    state.subRealm = result.newSubRealm;
    state.lifetimeStats.breakthroughTotal++;

    // 更新最高境界统计
    if (state.realm > state.lifetimeStats.highestRealm ||
        (state.realm === state.lifetimeStats.highestRealm && state.subRealm > state.lifetimeStats.highestSubRealm)) {
      state.lifetimeStats.highestRealm = state.realm;
      state.lifetimeStats.highestSubRealm = state.subRealm;
    }
  } else {
    // 失败：扣灵气（惩罚已在 result 中计算）
    state.aura -= result.failurePenalty;
    if (state.aura < 0) state.aura = 0;
    state.lifetimeStats.breakthroughFailed++;
  }

  // 5. 清空破镜丹 buff（无论成败）
  state.breakthroughBuff = { pillsConsumed: [], totalBonus: 0 };

  // 6. 生成文案
  const realmName = getRealmDisplayName(result.newRealm, result.newSubRealm);
  const message = result.success
    ? `突破成功！境界提升至${realmName}，灵气速率 ${result.newBaseAuraRate} 灵/秒`
    : `突破失败！成功率 ${(result.successRate * 100).toFixed(0)}%，灵气损失 ${result.failurePenalty.toLocaleString()}`;

  return { success: result.success, result, healLogs, message };
}
