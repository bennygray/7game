/**
 * Handler: 世界事件引擎（Phase F0-β）
 *
 * Phase: WORLD_EVENT (605), Order: 0
 * （在 DISCIPLE_AI(600) 之后，ENCOUNTER(610) 之前）
 *
 * 职责：
 * - 委托 Storyteller.tick() 进行事件抽取
 * - 如有事件触发 → emit SoulEvent(s) 到 EventBus
 * - 输出 MUD 日志（按严重度分级）
 *
 * Invariants：
 * - I1: 不直接写 GameState（仅 emit + log）
 * - I4: Storyteller 实例由 handler 持有（模块级，不持久化）
 *
 * @see phaseF0-beta-TDD.md Step 3.1
 * @see Story #4 (Storyteller), Story #5 (MUD Log)
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { Storyteller } from '../storyteller';
import { WORLD_EVENT_REGISTRY } from '../../shared/data/world-event-registry';
import { EventSeverity } from '../../shared/types/world-event';
import type { WorldEventPayload } from '../../shared/types/world-event';
import { LogCategory } from '../../shared/types/logger';

// ===== 模块级 Storyteller 实例（不持久化）=====

const storyteller = new Storyteller();

// ===== 文案渲染 =====

/**
 * 从事件定义模板中随机选一条，替换 {D} {D2} 占位符
 */
function renderEventText(
  eventDefId: string,
  involvedNames: string[],
): string {
  const def = WORLD_EVENT_REGISTRY.find((d) => d.id === eventDefId);
  if (!def || def.templates.length === 0) {
    return `宗门发生了一件异事。`;
  }

  const template = def.templates[Math.floor(Math.random() * def.templates.length)];
  let text = template;
  if (involvedNames.length > 0) {
    text = text.replace(/\{D\}/g, involvedNames[0]);
  }
  if (involvedNames.length > 1) {
    text = text.replace(/\{D2\}/g, involvedNames[1]);
  }
  return text;
}

/**
 * 严重度 → 日志级别映射
 * Lv.0 BREATH → info | Lv.1 RIPPLE → info | Lv.2 SPLASH → warn | Lv.3 STORM → error
 */
function getSeverityLabel(severity: EventSeverity): string {
  switch (severity) {
    case EventSeverity.BREATH:   return '喘息';
    case EventSeverity.RIPPLE:   return '涟漪';
    case EventSeverity.SPLASH:   return '浪花';
    case EventSeverity.STORM:    return '⚡风暴';
    case EventSeverity.CALAMITY: return '🔥天劫';
    default: return '异事';
  }
}

// ===== Handler =====

export const worldEventTickHandler: TickHandler = {
  name: 'world-event-tick',
  phase: TickPhase.WORLD_EVENT,
  order: 0,

  execute(ctx: TickContext): void {
    const { state, deltaS, eventBus, logger } = ctx;

    // 委托 Storyteller
    const payload: WorldEventPayload | null = storyteller.tick(state, deltaS);
    if (!payload) return;

    // 查找涉事弟子名字
    const involvedNames = payload.involvedDiscipleIds
      .map((id) => state.disciples.find((d) => d.id === id)?.name ?? id)
      ;

    // 渲染文案
    const text = renderEventText(payload.eventDefId, involvedNames);
    const label = getSeverityLabel(payload.severity);

    // MUD 日志（按严重度分级） — Story #5
    const logMeta = {
      eventDefId: payload.eventDefId,
      severity: payload.severity,
      scope: payload.scope,
      polarity: payload.polarity,
      tension: storyteller.getTensionIndex(),
      involvedDisciples: involvedNames,
    };

    if (payload.severity >= EventSeverity.SPLASH) {
      logger.warn(LogCategory.WORLD, 'world-event', `【${label}】${text}`, logMeta);
    } else {
      logger.info(LogCategory.WORLD, 'world-event', `【${label}】${text}`, logMeta);
    }

    // Lv.0 BREATH 不触发 SoulEvent（纯氛围） — PRD §3.2 R-WE01
    if (payload.severity === EventSeverity.BREATH) return;

    // Lv.1+ → emit SoulEvent 给每个涉事弟子
    for (const discipleId of payload.involvedDiscipleIds) {
      eventBus.emit({
        type: 'world-event',
        actorId: discipleId,
        timestamp: payload.timestamp,
        metadata: {
          eventDefId: payload.eventDefId,
          severity: payload.severity,
          polarity: payload.polarity,
          scope: payload.scope,
        },
      });
    }
  },
};
