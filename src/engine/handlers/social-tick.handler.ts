/**
 * Phase I-beta: social-tick handler
 *
 * Pipeline phase=612 (CAUSAL_EVAL), order=5 (after causal-tick order=0)
 * 职责：社交邀约/解除扫描 + crush 自动标记
 * 唯一写入 RelationshipEdge.status 的 handler（ADR-Iβ-01）
 *
 * @see phaseI-beta-TDD.md §3.3
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { LogCategory } from '../../shared/types/logger';
import { CAUSAL_SCAN_INTERVAL_TICKS } from '../../shared/data/causal-rule-registry';
import { getPronoun } from '../../shared/types/game-state';
import { BEHAVIOR_LOCATION_MAP, LOCATION_LABEL } from '../../shared/types/encounter';
import { pickSocialTemplate, fillSocialTemplate, type SocialEventType } from '../../shared/data/social-event-templates';

/** 上次扫描的 tick（避免每 tick 都扫描） */
let lastScanTick = 0;

export const socialTickHandler: TickHandler = {
  name: 'social-tick',
  phase: TickPhase.CAUSAL_EVAL,  // 612
  order: 5,                       // after causal-tick (order=0)
  execute(ctx: TickContext): void {
    if (!ctx.socialEngine) return;

    const currentTick = ctx.state.inGameWorldTime;

    // 复用因果规则扫描间隔
    if (currentTick - lastScanTick < CAUSAL_SCAN_INTERVAL_TICKS) return;
    lastScanTick = currentTick;

    // 扫描社交事件
    const results = ctx.socialEngine.scanForSocialEvents(ctx.state, currentTick);

    // 处理 crush 自动标记/解除（即时，不需要 AI）
    for (const r of results) {
      if (r.type === 'crush-mark') {
        const text = getSocialText(ctx, 'social-flirt', r.sourceId, r.targetId);
        ctx.logger.info(LogCategory.WORLD, 'social-tick', text);
      } else if (r.type === 'crush-remove') {
        // crush 解除无需日志
      }
    }

    // 邀约和解除需要 AI 判定 → 提交到 AsyncAIBuffer（ADR-Iβ-03）
    // 目前先记录日志，AI 邀约的完整实现需要 AsyncAIBuffer 扩展
    for (const r of results) {
      if (r.type === 'invitation') {
        const templateType = mapToSocialEventType('invitation', r.relationType);
        const text = getSocialText(ctx, templateType, r.sourceId, r.targetId);
        ctx.logger.info(LogCategory.WORLD, 'social-tick', text);
        // TODO: Submit to AsyncAIBuffer for AI Call-1 (willInitiate?)
      } else if (r.type === 'dissolution') {
        const templateType = mapToSocialEventType('dissolution', r.relationType);
        const text = getSocialText(ctx, templateType, r.sourceId, r.targetId);
        ctx.logger.info(LogCategory.WORLD, 'social-tick', text);
        // TODO: Submit to AsyncAIBuffer for AI dissolution judgment
      }
    }

    // 定期清理过期冷却
    ctx.socialEngine.cleanup(currentTick);
  },
};

function getSocialText(ctx: TickContext, eventType: SocialEventType, sourceId: string, targetId: string): string {
  const source = ctx.state.disciples.find(d => d.id === sourceId);
  const target = ctx.state.disciples.find(d => d.id === targetId);
  if (!source || !target) return `${sourceId}与${targetId}之间发生了社交事件。`;
  const pronounA = getPronoun(source.gender);
  const pronounB = getPronoun(target.gender);
  const locTag = BEHAVIOR_LOCATION_MAP[source.behavior];
  const locLabel = LOCATION_LABEL[locTag] ?? '宗门';
  const template = pickSocialTemplate(eventType);
  return fillSocialTemplate(template, source.name, target.name, locLabel, pronounA, pronounB);
}

function mapToSocialEventType(type: string, relationType?: string): SocialEventType {
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
