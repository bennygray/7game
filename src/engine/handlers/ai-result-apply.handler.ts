/**
 * Handler: AI 结果异步应用（Phase G0）
 *
 * Phase: SOUL_EVAL (625), Order: 5
 * （紧跟 soul-event handler (625:0) 之后）
 *
 * 职责：
 * - 从 AsyncAIBuffer drain 已完成的 AI 评估结果
 * - 计算修正 delta = aiDelta - fallbackDelta
 * - 通过 correctDeltaDirection + clampDelta 应用修正
 * - 覆写 emotionMap 中的情绪状态
 * - 输出 AI 生成的独白到 MUD 日志
 *
 * @see SOUL-VISION-ROADMAP.md Phase G, G0
 * @see TD-006: AI 调用不阻塞 Tick
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { clampDelta } from '../../shared/data/emotion-pool';
import { applyEvaluationResult, updateRelationshipTags } from '../soul-engine';
import { EMOTION_LABEL } from '../../shared/types/soul';
import { LogCategory } from '../../shared/types/logger';

export const aiResultApplyHandler: TickHandler = {
  name: 'ai-result-apply',
  phase: TickPhase.SOUL_EVAL,
  order: 5,

  execute(ctx: TickContext): void {
    if (!ctx.asyncAIBuffer) return;

    const results = ctx.asyncAIBuffer.drain();
    if (results.length === 0) return;

    for (const { aiResult, fallbackSnapshot } of results) {
      const disciple = ctx.state.disciples.find(d => d.id === fallbackSnapshot.discipleId);
      if (!disciple) continue;

      // 计算修正 delta（AI delta - fallback delta）
      const correctionResult = {
        ...aiResult,
        relationshipDeltas: aiResult.relationshipDeltas.map(aiRd => {
          // 找到对应的 fallback delta
          const fallbackRd = fallbackSnapshot.result.relationshipDeltas.find(
            frd => frd.targetId === aiRd.targetId,
          );
          const fallbackDelta = fallbackRd?.delta ?? 0;
          const correctionDelta = aiRd.delta - fallbackDelta;
          return {
            ...aiRd,
            delta: clampDelta(correctionDelta),
          };
        }),
      };

      // 应用修正到 GameState
      applyEvaluationResult(ctx.state, disciple, correctionResult, 'observer');
      updateRelationshipTags(ctx.state, disciple.id);

      // 覆写 emotionMap（last-write-wins）
      ctx.emotionMap.set(disciple.id, {
        currentEmotion: aiResult.emotion,
        emotionIntensity: aiResult.intensity,
        emotionSetAt: Date.now(),
        decayCounter: 0,
      });

      // 输出 AI 独白到 MUD 日志（视觉区分）
      const emotionLabel = EMOTION_LABEL[aiResult.emotion] ?? aiResult.emotion;
      const logLine = `[灵魂·AI] ${disciple.name}感到 ${emotionLabel}(${aiResult.intensity})：「${aiResult.innerThought}」`;

      ctx.logger.info(LogCategory.DISCIPLE, 'ai-result-apply', logLine, {
        discipleId: disciple.id,
        emotion: aiResult.emotion,
        intensity: aiResult.intensity,
        source: 'ai',
      });
    }
  },
};
