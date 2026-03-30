/**
 * engine-bindings.ts — 引擎回调绑定 + 消息路由
 *
 * Phase X-α: 从 main.ts 拆分（L420-555）+ 实现 PRD §2.2 路由规则
 * Phase X-γ: 裁决自动推送面板（L-06/L-07）+ 弟子名可点击（CK-01~04）
 *
 * 消息路由（PRD R-01~R-13）：
 *   → addMainLog:   弟子行为/AI台词/对话/碰面/世界事件/AI决策/突破/裁决
 *   → addSystemLog: 修炼灵气/灵田/自动服丹/soul-engine内部/环境呼吸
 */

import type { LiteGameState } from '../shared/types/game-state';
import type { IdleEngine } from '../engine/idle-engine';
import type { LLMAdapter } from '../ai/llm-adapter';
import { escapeHtml } from '../engine/disciple-generator';
import { getBehaviorLabel } from '../engine/behavior-tree';
import { getRealmDisplayName } from '../shared/formulas/realm-display';
import { createDefaultAISoulContext, addShortTermMemory } from '../shared/types/ai-soul';
import { EventSeverity } from '../shared/types/world-event';
import { LogLevel } from '../shared/types/logger';
import {
  formatSeverityLog,
  formatRulingWindow,
  formatRulingResult,
  pickAmbientLine,
  getBehaviorIcon,
  wrapDiscipleName,
} from './mud-formatter';
import type { LogManager } from './log-manager';
import type { PanelManager } from './panel-manager';

/**
 * 绑定所有引擎回调，实现消息路由规则 R-01~R-13
 */
export function bindEngineCallbacks(
  engine: IdleEngine,
  state: LiteGameState,
  llmAdapter: LLMAdapter,
  logManager: LogManager,
  panelManager: PanelManager,
): void {
  const { addMainLog, addSystemLog } = logManager;

  let tickCounter = 0;

  // R-01: 修炼灵气 tick 日志 → system-bar（低信息量，系统内部）
  engine.setOnTick(() => {
    tickCounter++;
    if (tickCounter % 5 === 0) {
      const rate = engine.getCurrentAuraRate();
      const wm = state.inGameWorldTime * 12;
      const y = Math.floor(wm / 12);
      const m = Math.floor(wm % 12) + 1;
      addSystemLog(formatSeverityLog(
        EventSeverity.RIPPLE,
        `[仙历${y}年${m}月] 宗主打坐入定，灵气 +${(rate * 5).toFixed(1)}`
      ));
    }
    // 状态栏更新由 main.ts 绑定后单独处理
  });

  // R-11: 突破 → main-log（高关注事件）+ Phase X-β 闪烁效果
  engine.setOnBreakthrough((_s, btLog) => {
    if (btLog.success) {
      const r = btLog.result;
      addMainLog(formatSeverityLog(
        EventSeverity.STORM,
        `突破！境界提升至${getRealmDisplayName(r.newRealm, r.newSubRealm)}`
      ));
      triggerBreakthroughFlash(true);   // X-β V-01: 金色闪烁
    } else {
      addMainLog(formatSeverityLog(EventSeverity.SPLASH, `突破失败！${btLog.message}`));
      triggerBreakthroughFlash(false);  // X-β V-02: 红色闪烁
    }
  });

  // R-02: 灵田 tick 日志 → system-bar
  engine.setOnFarmTickLog((logs) => {
    for (const log of logs) {
      addSystemLog(formatSeverityLog(EventSeverity.RIPPLE, log));
    }
  });

  // R-03: 系统日志（自动服丹等）→ system-bar
  engine.setOnSystemLog((logs) => {
    for (const log of logs) {
      addSystemLog(formatSeverityLog(EventSeverity.RIPPLE, log));
    }
  });

  // R-08: 弟子间对话 → main-log（Phase X-γ: 弟子名可点击）
  engine.setOnDialogue((exchange) => {
    const triggerDisciple = state.disciples.find(d => d.id === exchange.triggerId);
    const triggerName = triggerDisciple ? triggerDisciple.name : '???';
    const triggerId = triggerDisciple?.id ?? '';
    const eventDesc = escapeHtml(exchange.trigger.eventDescription);

    addMainLog(`<span class="mud-text-sage">── ${wrapDiscipleName(triggerName, triggerId)}${eventDesc.includes(triggerName) ? eventDesc.replace(triggerName, '') : '：' + eventDesc} ──</span>`);

    for (const round of exchange.rounds) {
      const speaker = state.disciples.find(d => d.id === round.speakerId);
      const speakerName = speaker ? speaker.name : '???';
      const speakerId = speaker?.id ?? '';
      if (round.round === 1) {
        addMainLog(`<span class="mud-text-sage">  ${wrapDiscipleName(speakerName, speakerId)}对${wrapDiscipleName(triggerName, triggerId)}说：「${escapeHtml(round.line)}」</span>`);
      } else {
        addMainLog(`<span class="mud-text-accent">  ${wrapDiscipleName(triggerName, triggerId)}回应：「${escapeHtml(round.line)}」</span>`);
      }
    }
  });

  // R-04/05/06/07: 统一日志管线路由
  engine.setOnMudLog((entries) => {
    for (const entry of entries) {
      if (entry.level <= LogLevel.DEBUG) continue;

      const src = entry.source;

      // R-04: soul-engine / dialogue-coordinator 内部日志 → system-bar
      if (src === 'soul-engine' || src === 'dialogue-coordinator') {
        addSystemLog(formatSeverityLog(EventSeverity.BREATH, entry.message));
        continue;
      }

      // 计算严重度
      let severity: number;
      if (src === 'world-event' && entry.data?.severity !== undefined) {
        severity = entry.data.severity as number;          // R-06
      } else if (src === 'encounter') {
        severity = entry.data?.result === 'chat' ? EventSeverity.RIPPLE : EventSeverity.SPLASH; // R-05
      } else if (src === 'ai-result-apply') {
        severity = EventSeverity.SPLASH;                   // R-07
      } else {
        switch (entry.level) {
          case LogLevel.INFO:  severity = EventSeverity.RIPPLE; break;
          case LogLevel.WARN:  severity = EventSeverity.SPLASH; break;
          case LogLevel.ERROR: severity = EventSeverity.STORM;  break;
          default:             severity = EventSeverity.RIPPLE;
        }
      }

      // 已知 source 无前缀，其他加前缀
      const knownSources = ['encounter', 'world-event', 'ai-result-apply', 'soul-event'];
      const text = knownSources.includes(src)
        ? entry.message
        : `[${src}] ${entry.message}`;

      addMainLog(formatSeverityLog(severity, text));  // R-05/06/07 → main-log
    }
  });

  // R-09/10: 弟子行为变更 → main-log（含 AI 台词）（Phase X-γ: 弟子名可点击）
  engine.setOnDiscipleBehaviorChange((events) => {
    for (const evt of events) {
      const name = evt.disciple.name;
      const id = evt.disciple.id;

      // Phase B-α: 输出 FARM/ALCHEMY 引擎日志
      if (evt.farmAlchemyLogs) {
        for (const log of evt.farmAlchemyLogs) {
          addMainLog(`<span class="mud-text-amber">${escapeHtml(log)}</span>`);
        }
      }

      if (evt.auraReward > 0) {
        // 行为结束
        addMainLog(`<span class="mud-text-dim">[${wrapDiscipleName(name, id)}] 结束${getBehaviorLabel(evt.oldBehavior)}，灵气 +${evt.auraReward.toFixed(1)}</span>`);
      }

      if (evt.newBehavior !== 'idle' && evt.auraReward === 0) {
        // 行为开始 → 显示 + 异步 AI 台词
        const icon = getBehaviorIcon(evt.newBehavior);
        addMainLog(`<span class="mud-text-accent">${icon} [${wrapDiscipleName(name, id)}] 开始${getBehaviorLabel(evt.newBehavior)}</span>`);

        if (!state.aiContexts[evt.disciple.id]) {
          state.aiContexts[evt.disciple.id] = createDefaultAISoulContext();
        }
        const ctx = state.aiContexts[evt.disciple.id];

        const req = {
          discipleId: evt.disciple.id,
          discipleName: evt.disciple.name,
          personality: evt.disciple.personality,
          personalityName: evt.disciple.personalityName,
          behavior: evt.newBehavior,
          shortTermMemory: ctx.shortTermMemory,
          starRating: evt.disciple.starRating,
          realm: evt.disciple.realm,
          subRealm: evt.disciple.subRealm,
        };

        llmAdapter.generateLine(req).then((line) => {
          addMainLog(`<span class="mud-severity-splash">「[${wrapDiscipleName(name, id)}] 「${escapeHtml(line)}」」</span>`);
          addShortTermMemory(ctx, `${getBehaviorLabel(evt.newBehavior)}: ${line}`);
          ctx.lastInferenceTime = Date.now();
        });
      }
    }
  });

  // R-12: 裁决创建 → 自动推送面板（Phase X-γ L-06）
  engine.setOnRulingCreated((ruling) => {
    const remaining = (ruling.expiresAt - Date.now()) / 1000;
    panelManager.openPanel('⚡ 风暴裁决', formatRulingWindow(ruling, remaining));
  });

  // 裁决解决 → 自动关闭面板（L-07）+ 结果写入日志流
  engine.setOnRulingResolved((resolution) => {
    panelManager.closePanel();
    addMainLog(formatRulingResult(resolution));
  });

  // R-13: 环境呼吸 → system-bar（25~45s 随机）
  scheduleAmbientBreath(addSystemLog);
}

/** 环境呼吸定时器（PRD R-13） */
function scheduleAmbientBreath(addSystemLog: (html: string) => void): void {
  const delay = (25 + Math.random() * 20) * 1000;
  setTimeout(() => {
    addSystemLog(formatSeverityLog(EventSeverity.BREATH, pickAmbientLine()));
    scheduleAmbientBreath(addSystemLog);
  }, delay);
}

// ===== 突破闪烁效果（Phase X-β PRD §2.5）=====

/**
 * 触发突破全屏闪烁（ADR-Xβ-02）
 * 成功 = 金色 2s / 失败 = 红色 1s
 * pointer-events: none 不阻塞交互，animationend 自动清理 DOM
 */
function triggerBreakthroughFlash(success: boolean): void {
  const overlay = document.createElement('div');
  overlay.className = success
    ? 'mud-flash-overlay mud-flash-gold'
    : 'mud-flash-overlay mud-flash-red';

  document.body.appendChild(overlay);

  overlay.addEventListener('animationend', () => {
    overlay.remove();
  });
}
