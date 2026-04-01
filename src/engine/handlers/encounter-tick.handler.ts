/**
 * Handler: 碰面检定引擎（Phase F0-α）
 *
 * Phase: ENCOUNTER (610), Order: 0
 * （在 DISCIPLE_AI(600) 之后，SOUL_EVAL(625) 之前）
 *
 * 职责：
 * - 每 5 tick（ENCOUNTER_SCAN_INTERVAL_SEC）扫描一次
 * - 按 behavior → location 分组弟子
 * - 同地点 ≥2 人时枚举无序对，按概率触发碰面
 * - 碰面结果基于 avgAffinity 加权随机
 * - 非 none 结果 → emit 双向 SoulEvent + 输出 MUD 日志
 *
 * Invariants:
 * - I1: location = f(behavior)，纯函数派生
 * - I2: 碰面不写 GameState，仅 emit EventBus + MUD log
 *
 * ADR-F0α-01: TickPhase.ENCOUNTER=610
 * ADR-F0α-02: cooldownMap 不持久化
 * ADR-F0α-03: emit 到 EventBus，F0-α 中无消费者
 *
 * @see phaseF0-alpha-TDD.md Step 3.2
 * @see Story #2, #3, #4
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import type { SoulEventType } from '../../shared/types/soul';
import type { EncounterEventPayload } from '../../shared/types/encounter';
import {
  getDiscipleLocation,
  ENCOUNTER_SCAN_INTERVAL_SEC,
  ENCOUNTER_COOLDOWN_SEC,
  BASE_ENCOUNTER_CHANCE,
  EncounterResult,
  LOCATION_LABEL,
  decideEncounterResult,
  getAvgAffinity,
  getAffinityBand,
} from '../../shared/types/encounter';
import { getEncounterText } from '../../shared/data/encounter-templates';
import { LogCategory } from '../../shared/types/logger';
import type { LocationTag } from '../../shared/types/encounter';
import type { LiteDiscipleState } from '../../shared/types/game-state';

// ===== 运行时碰面冷却 Map（不持久化）=====

/** 碰面冷却 Map: pairKey → lastEncounterTimestamp (ms) */
const cooldownMap = new Map<string, number>();

/**
 * 生成配对键（保证 id 小的在前，去重）
 * Story #2 AC5: 无序对 (A,B)，A.id < B.id
 */
function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * 碰面事件类型映射
 */
const ENCOUNTER_RESULT_TO_EVENT: Record<
  Exclude<EncounterResult, 'none'>,
  SoulEventType
> = {
  chat:     'encounter-chat',
  discuss:  'encounter-discuss',
  conflict: 'encounter-conflict',
};

/**
 * Phase I-alpha: grudge 碰面冲突概率修正
 * hostile 分档时 conflict 60→75, none 30→15
 */
function decideGrudgeEncounter(randomFn: () => number = Math.random): EncounterResult {
  const roll = randomFn() * 100;
  let cumulative = 0;
  // discuss: 0
  cumulative += 10; // chat: 10
  if (roll < cumulative) return EncounterResult.CHAT;
  cumulative += 75; // conflict: 75 (was 60)
  if (roll < cumulative) return EncounterResult.CONFLICT;
  // none: 15 (was 30)
  return EncounterResult.NONE;
}

// ===== Tick 计数器 =====

let tickCounter = 0;

// ===== Handler =====

export const encounterTickHandler: TickHandler = {
  name: 'encounter-tick',
  phase: TickPhase.ENCOUNTER,
  order: 0,

  execute(ctx: TickContext): void {
    // Story #2 AC1: 仅每 ENCOUNTER_SCAN_INTERVAL_SEC tick 扫描一次
    tickCounter++;
    if (tickCounter % ENCOUNTER_SCAN_INTERVAL_SEC !== 0) return;

    const { state, eventBus, logger } = ctx;
    const disciples = state.disciples;
    if (disciples.length < 2) return;

    const now = Date.now();

    // Step 1: 按 location 分组弟子 (Story #1)
    const locationGroups = new Map<LocationTag, LiteDiscipleState[]>();
    for (const d of disciples) {
      const loc = getDiscipleLocation(d.behavior);
      const group = locationGroups.get(loc);
      if (group) {
        group.push(d);
      } else {
        locationGroups.set(loc, [d]);
      }
    }

    // Step 2: 对每个 ≥2 人的地点，枚举无序对
    for (const [location, group] of locationGroups) {
      if (group.length < 2) continue;

      // Story #2 AC5: 枚举所有无序对
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const key = pairKey(a.id, b.id);

          // Story #2 AC3/AC4: 冷却检查
          const lastTime = cooldownMap.get(key);
          if (lastTime !== undefined && (now - lastTime) < ENCOUNTER_COOLDOWN_SEC * 1000) {
            continue; // 冷却中
          }

          // Story #2 AC2: 概率掷骰
          if (Math.random() >= BASE_ENCOUNTER_CHANCE) {
            continue; // 未触发
          }

          // Step 3: 碰面结果判定 (Story #3)
          const avgAff = getAvgAffinity(state.relationships, a.id, b.id);

          // Phase I-alpha: grudge 标签碰面冲突概率修正
          const edgeAB = state.relationships.find(r => r.sourceId === a.id && r.targetId === b.id);
          const edgeBA = state.relationships.find(r => r.sourceId === b.id && r.targetId === a.id);
          const hasGrudge = edgeAB?.tags.includes('grudge') || edgeBA?.tags.includes('grudge');
          const band = getAffinityBand(avgAff);
          const result = (hasGrudge && band === 'hostile')
            ? decideGrudgeEncounter()
            : decideEncounterResult(avgAff);

          // Story #3 AC5: none 不发射事件不输出日志
          if (result === EncounterResult.NONE) continue;

          // 更新冷却
          cooldownMap.set(key, now);

          // Phase IJ 双写：记录碰面到关系记忆（双向）
          if (ctx.relationshipMemoryManager) {
            ctx.relationshipMemoryManager.recordEncounter(a.id, b.id, Math.floor(state.inGameWorldTime));
            ctx.relationshipMemoryManager.recordEncounter(b.id, a.id, Math.floor(state.inGameWorldTime));
          }

          const eventType = ENCOUNTER_RESULT_TO_EVENT[result as Exclude<EncounterResult, 'none'>];
          const locationLabel = LOCATION_LABEL[location];

          // Story #3 AC4: 双向对称发射 SoulEvent
          const payloadA: EncounterEventPayload = {
            partnerId: b.id,
            partnerName: b.name,
            location,
            encounterResult: result as Exclude<EncounterResult, 'none'>,
            avgAffinity: avgAff,
          };
          const payloadB: EncounterEventPayload = {
            partnerId: a.id,
            partnerName: a.name,
            location,
            encounterResult: result as Exclude<EncounterResult, 'none'>,
            avgAffinity: avgAff,
          };

          eventBus.emit({
            type: eventType,
            actorId: a.id,
            timestamp: now,
            metadata: payloadA as unknown as Record<string, unknown>,
          });
          eventBus.emit({
            type: eventType,
            actorId: b.id,
            timestamp: now,
            metadata: payloadB as unknown as Record<string, unknown>,
          });

          // Story #4: MUD 日志输出
          const text = getEncounterText(
            result as Exclude<EncounterResult, 'none'>,
            a.name,
            b.name,
            locationLabel,
          );

          // discuss/conflict → Lv.2 高亮; chat → Lv.1 普通
          if (result === EncounterResult.CHAT) {
            logger.info(LogCategory.WORLD, 'encounter', text, {
              pairKey: key, location, result, avgAffinity: avgAff,
            });
          } else {
            logger.warn(LogCategory.WORLD, 'encounter', text, {
              pairKey: key, location, result, avgAffinity: avgAff,
            });
          }
        }
      }
    }
  },
};
