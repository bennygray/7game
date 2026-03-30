/**
 * MUD 格式化工具 — Phase X-α 重构
 *
 * 纯函数格式化模块：不依赖 DOM，不修改 GameState，可单元测试。
 *
 * Phase X-α 变更：所有内联 style="color:..." 改为 class="mud-xxx"
 * Phase X-γ 变更：+wrapDiscipleName()（PRD §2.9 P-CLICK）
 * ADR-Xα-01: CSS class 使用 mud- 前缀
 *
 * 导出函数：
 * - formatLookOverview       — `look` 命令：宗门总览（按 Zone 分组）
 * - formatDiscipleProfile    — `look <弟子>` 命令：弟子档案
 * - matchDisciple            — 弟子名匹配（精确→前缀→无）
 * - wrapDiscipleName         — 包装弟子名为可点击 span（Phase X-γ）
 * - formatSeverityLog        — 日志严重度着色包装
 * - formatStatusBar          — 固定状态栏内容
 * - pickAmbientLine          — 随机一条环境呼吸文案
 * - getMoralLabel            — goodEvil/lawChaos 值 → 标签文字
 * - getEthosLabel            — sect.ethos → 标签
 * - getDisciplineLabel       — sect.discipline → 标签
 *
 * @see phaseX-alpha-TDD.md Step 2
 */

import type { LiteGameState, LiteDiscipleState } from '../shared/types/game-state';
import { LOCATION_LABEL, BEHAVIOR_LOCATION_MAP } from '../shared/types/encounter';
import type { LocationTag } from '../shared/types/encounter';
import { EventSeverity } from '../shared/types/world-event';
import { ZONE_DESCRIPTIONS, AMBIENT_BREATHING_POOL } from '../shared/data/zone-descriptions';
import { getBehaviorLabel } from '../engine/behavior-tree';
import { getRealmDisplayName } from '../shared/formulas/realm-display';
import { escapeHtml } from '../engine/disciple-generator';
import { TRAIT_REGISTRY } from '../shared/data/trait-registry';
import { EMOTION_LABEL, type DiscipleEmotionState } from '../shared/types/soul';
import type { ActiveRuling, RulingResolution } from '../shared/types/ruling';


// ===== 类型 =====

/** 弟子名匹配结果 */
export type MatchResult =
  | { type: 'exact';    disciple: LiteDiscipleState }
  | { type: 'multiple'; candidates: LiteDiscipleState[] }
  | { type: 'none' };

// ===== 严重度 CSS class 映射（PRD S-04 / ADR-Xα-01）=====

const SEVERITY_CLASS: Record<number, string> = {
  [EventSeverity.BREATH]:   'mud-severity-breath',
  [EventSeverity.RIPPLE]:   'mud-severity-ripple',
  [EventSeverity.SPLASH]:   'mud-severity-splash',
  [EventSeverity.STORM]:    'mud-severity-storm',
  [EventSeverity.CALAMITY]: 'mud-severity-calamity',
};

// ===== 行为图标前缀映射（Phase X-β PRD §2.4）=====

const BEHAVIOR_ICON: Record<string, string> = {
  idle:     '💤',
  meditate: '🧘',
  explore:  '⚔️',
  rest:     '😴',
  alchemy:  '🔥',
  farm:     '🌿',
  bounty:   '📜',
};

/** 获取行为图标（无匹配返回空串） */
export function getBehaviorIcon(behavior: string): string {
  return BEHAVIOR_ICON[behavior] ?? '';
}

// ===== 道德/道风标签 =====

const MORAL_LABELS: Array<[number, string]> = [
  [-60, '邪'],
  [-20, '偏恶'],
  [20,  '中庸'],
  [60,  '偏善'],
  [Infinity, '义'],
];

const CHAOS_LABELS: Array<[number, string]> = [
  [-60, '狂'],
  [-20, '偏放'],
  [20,  '中庸'],
  [60,  '偏律'],
  [Infinity, '侠'],
];

const ETHOS_LABELS: Array<[number, string]> = [
  [-60, '至仁'],
  [-20, '偏仁'],
  [20,  '中庸'],
  [60,  '偏霸'],
  [Infinity, '至霸'],
];

const DISCIPLINE_LABELS: Array<[number, string]> = [
  [-60, '至放'],
  [-20, '偏放'],
  [20,  '中庸'],
  [60,  '偏律'],
  [Infinity, '至律'],
];

function labelFromTable(value: number, table: Array<[number, string]>): string {
  for (const [threshold, label] of table) {
    if (value < threshold) return label;
  }
  return table[table.length - 1][1];
}

/** goodEvil 值 → 标签 */
export function getMoralLabel(value: number): string {
  return labelFromTable(value, MORAL_LABELS);
}

/** lawChaos 值 → 标签 */
export function getChaosLabel(value: number): string {
  return labelFromTable(value, CHAOS_LABELS);
}

/** sect.ethos → 道风标签 */
export function getEthosLabel(value: number): string {
  return labelFromTable(value, ETHOS_LABELS);
}

/** sect.discipline → 门规标签 */
export function getDisciplineLabel(value: number): string {
  return labelFromTable(value, DISCIPLINE_LABELS);
}

// ===== 弟子名匹配 =====

/**
 * 弟子名匹配：精确全名 → 前缀匹配（唯一/多结果） → 无匹配
 */
export function matchDisciple(query: string, disciples: LiteDiscipleState[]): MatchResult {
  if (!query) return { type: 'none' };

  const exact = disciples.find(d => d.name === query);
  if (exact) return { type: 'exact', disciple: exact };

  const prefixMatches = disciples.filter(d => d.name.startsWith(query));
  if (prefixMatches.length === 1) return { type: 'exact', disciple: prefixMatches[0] };
  if (prefixMatches.length > 1)  return { type: 'multiple', candidates: prefixMatches };

  return { type: 'none' };
}

// ===== 可点击弟子名（Phase X-γ PRD §2.9）=====

/**
 * 包装弟子名为可点击 span（CK-01/CK-04）
 * 点击后通过事件委托打开灵魂档案面板
 */
export function wrapDiscipleName(name: string, discipleId: string): string {
  return `<span class="mud-disciple-link" data-disciple-id="${escapeHtml(discipleId)}">${escapeHtml(name)}</span>`;
}

// ===== look 命令 =====

/**
 * 渲染宗门总览（面板化排版）
 */
export function formatLookOverview(state: LiteGameState): string {
  const zones = Object.keys(LOCATION_LABEL) as LocationTag[];
  const byZone = new Map<LocationTag, LiteDiscipleState[]>();
  for (const z of zones) byZone.set(z, []);

  for (const d of state.disciples) {
    const loc = BEHAVIOR_LOCATION_MAP[d.behavior];
    const arr = byZone.get(loc);
    if (arr) arr.push(d);
  }

  let html = '';
  for (const zone of zones) {
    const disciples = byZone.get(zone) ?? [];
    const zoneLabel = LOCATION_LABEL[zone];
    const desc = ZONE_DESCRIPTIONS[zone];

    html += `<div class="mud-p-section">`;
    html += `<div class="mud-p-section__head"><span class="mud-p-icon">◆</span> <span class="mud-zone-name">${escapeHtml(zoneLabel)}</span> <span class="mud-p-hint">${escapeHtml(desc)}</span></div>`;

    if (disciples.length === 0) {
      html += `<div class="mud-p-empty">（无人）</div>`;
    } else {
      for (const d of disciples) {
        const icon = getBehaviorIcon(d.behavior);
        const behaviorText = getBehaviorLabel(d.behavior);
        const realmName = getRealmDisplayName(d.realm, d.subRealm);
        html += `<div class="mud-p-disciple-row">`;
        html += `  <span class="mud-p-disciple-icon">${icon}</span>`;
        html += `  <span class="mud-p-disciple-name">${wrapDiscipleName(d.name, d.id)}</span>`;
        html += `  <span class="mud-p-disciple-meta">${d.starRating}★ ${escapeHtml(d.personalityName)}</span>`;
        html += `  <span class="mud-p-disciple-realm">${escapeHtml(realmName)}</span>`;
        html += `  <span class="mud-p-disciple-action">— ${escapeHtml(behaviorText)}</span>`;
        html += `</div>`;
      }
    }
    html += `</div>`;
  }

  return html;
}


// ===== look <弟子> 命令 =====

/**
 * 渲染弟子档案（面板化排版）
 */
export function formatDiscipleProfile(
  d: LiteDiscipleState,
  state: LiteGameState,
): string {
  const p = d.personality;
  const realmName = getRealmDisplayName(d.realm, d.subRealm);
  const loc = BEHAVIOR_LOCATION_MAP[d.behavior];
  const locLabel = LOCATION_LABEL[loc];
  const icon = getBehaviorIcon(d.behavior);
  const behaviorLabel = getBehaviorLabel(d.behavior);

  let html = '';

  // 头部
  html += `<div class="mud-p-header">`;
  html += `  <span class="mud-p-stars">${'★'.repeat(d.starRating)}</span>`;
  html += `  <span class="mud-p-personality">${escapeHtml(d.personalityName)}</span>`;
  html += `  <span class="mud-p-divider">|</span>`;
  html += `  <span class="mud-realm-name">${escapeHtml(realmName)}</span>`;
  html += `</div>`;

  // 状态
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">📍</span> 当前状态</div>`;
  html += `<div class="mud-p-kv">${icon} ${escapeHtml(locLabel)} — ${escapeHtml(behaviorLabel)} <span class="mud-p-hint">(剩余 ${d.behaviorTimer.toFixed(0)}s)</span></div>`;
  html += `<div class="mud-p-kv">体力 ${renderStatBar(d.stamina, 100)}</div>`;
  html += `</div>`;

  // 五维
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">⚔</span> 五维性格</div>`;
  html += `<div class="mud-p-stats">`;
  html += renderStatItem('刚猛', p.aggressive);
  html += renderStatItem('坚韧', p.persistent);
  html += renderStatItem('仁善', p.kind);
  html += renderStatItem('懈怠', p.lazy);
  html += renderStatItem('聪慧', p.smart);
  html += `</div></div>`;

  // 道德
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">☯</span> 道德双轴</div>`;
  html += renderMoralAxes(d.moral.goodEvil, d.moral.lawChaos);
  html += `</div>`;

  // 特性
  html += renderTraitsSection(d);

  // 关系
  html += renderRelationsSection(d, state);

  return html;
}


// ===== 面板 HTML 辅助 =====

function renderStatItem(label: string, value: number): string {
  const pct = Math.round(value * 100);
  return `<div class="mud-p-stat-item"><span class="mud-p-stat-label">${label}</span>${renderStatBar(pct, 100)}<span class="mud-p-stat-val">${pct}</span></div>`;
}

function renderStatBar(current: number, max: number): string {
  const pct = Math.round((current / max) * 100);
  const cls = pct >= 70 ? 'mud-p-bar-high' : pct >= 30 ? 'mud-p-bar-mid' : 'mud-p-bar-low';
  return `<span class="mud-p-bar"><span class="mud-p-bar__fill ${cls}" style="width:${pct}%"></span></span>`;
}

function renderAxisBar(value: number): string {
  const pct = Math.round(((value + 100) / 200) * 100);
  return `<span class="mud-p-bar mud-p-bar-axis"><span class="mud-p-bar__center"></span><span class="mud-p-bar__fill mud-p-bar-mid" style="width:${pct}%;left:0"></span></span><span class="mud-p-axis-val">${value > 0 ? '+' : ''}${value}</span>`;
}

function renderMoralAxes(goodEvil: number, lawChaos: number): string {
  let html = '';
  html += `<div class="mud-p-axis">`;
  html += `  <span class="mud-p-axis-label">善恶</span> ${renderAxisBar(goodEvil)} <span class="mud-p-axis-tag">${getMoralLabel(goodEvil)}</span>`;
  html += `</div>`;
  html += `<div class="mud-p-axis">`;
  html += `  <span class="mud-p-axis-label">律放</span> ${renderAxisBar(lawChaos)} <span class="mud-p-axis-tag">${getChaosLabel(lawChaos)}</span>`;
  html += `</div>`;
  return html;
}

function renderTraitsSection(d: LiteDiscipleState): string {
  let html = `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">🏷</span> 先天特性</div>`;
  if (d.traits && d.traits.length > 0) {
    html += `<div class="mud-p-tags">`;
    for (const t of d.traits) {
      const def = TRAIT_REGISTRY.find(r => r.id === t.defId);
      html += `<span class="mud-p-tag">${escapeHtml(def?.name ?? t.defId)}</span>`;
    }
    html += `</div>`;
  } else {
    html += `<div class="mud-p-empty">（无）</div>`;
  }
  html += `</div>`;
  return html;
}

function renderRelationsSection(d: LiteDiscipleState, state: LiteGameState): string {
  const rels = state.relationships.filter(r => r.sourceId === d.id);
  if (rels.length === 0) return '';
  let html = `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">🤝</span> 人际关系</div>`;
  for (const rel of rels) {
    const other = state.disciples.find(x => x.id === rel.targetId);
    if (!other) continue;
    const sign = rel.affinity >= 0 ? '+' : '';
    const cls = rel.affinity > 0 ? 'mud-p-rel-pos' : rel.affinity < 0 ? 'mud-p-rel-neg' : 'mud-p-rel-zero';
    const tagsStr = rel.tags && rel.tags.length > 0 ? ` <span class="mud-p-hint">[${rel.tags.join(',')}]</span>` : '';
    html += `<div class="mud-p-rel-row">`;
    html += `  <span class="mud-p-rel-arrow">→</span>`;
    html += `  <span class="mud-p-rel-name">${wrapDiscipleName(other.name, other.id)}</span>`;
    html += `  <span class="${cls}">${sign}${rel.affinity.toFixed(0)}</span>${tagsStr}`;
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}


// ===== 日志严重度着色 =====

/**
 * 将日志文本包装在对应严重度 class 的 span 内
 * STORM 级额外添加 ═══ 框线，SPLASH 级添加「」装饰
 */
export function formatSeverityLog(severity: number, text: string): string {
  const cls = SEVERITY_CLASS[severity] ?? SEVERITY_CLASS[EventSeverity.RIPPLE];

  if (severity >= EventSeverity.STORM) {
    return `<span class="${cls}">═══ ${escapeHtml(text)} ═══</span>`;
  }

  if (severity >= EventSeverity.SPLASH) {
    return `<span class="${cls}">「${escapeHtml(text)}」</span>`;
  }

  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

// ===== 状态栏 =====

export function formatStatusBar(state: LiteGameState, auraRate: number): string {
  const wm    = state.inGameWorldTime * 12;
  const year  = Math.floor(wm / 12);
  const month = Math.floor(wm % 12) + 1;
  const realm = getRealmDisplayName(state.realm, state.subRealm);

  return (
    `仙历第${year}年${month}月  ${escapeHtml(state.sect.name)}` +
    `  境界：<b>${escapeHtml(realm)}</b>` +
    `  灵气：${state.aura.toFixed(0)} (+${auraRate.toFixed(1)}/s)` +
    `  灵石：${state.spiritStones.toFixed(1)}  悟性：${state.comprehension.toFixed(1)}`
  );
}

// ===== 环境呼吸 =====

export function pickAmbientLine(): string {
  return AMBIENT_BREATHING_POOL[Math.floor(Math.random() * AMBIENT_BREATHING_POOL.length)];
}

// ===== inspect 命令 =====

/**
 * 渲染弟子灵魂档案（inspect 命令 — 面板化排版）
 */
export function formatDiscipleInspect(
  d: LiteDiscipleState,
  state: LiteGameState,
  emotion?: DiscipleEmotionState,
): string {
  const p = d.personality;
  const loc = BEHAVIOR_LOCATION_MAP[d.behavior];
  const locLabel = LOCATION_LABEL[loc];
  const behaviorLabel = getBehaviorLabel(d.behavior);
  const realmName = getRealmDisplayName(d.realm, d.subRealm);

  let html = '';

  // 头栏
  html += `<div class="mud-p-header">`;
  html += `  <span class="mud-p-stars">${'★'.repeat(d.starRating)}</span>`;
  html += `  <span class="mud-p-personality">${escapeHtml(d.personalityName)}</span>`;
  html += `  <span class="mud-p-divider">|</span>`;
  html += `  <span class="mud-realm-name">${escapeHtml(realmName)}</span>`;
  html += `  <span class="mud-p-divider">|</span>`;
  html += `  <span class="mud-p-hint">${escapeHtml(locLabel)}·${escapeHtml(behaviorLabel)}</span>`;
  html += `</div>`;

  // 五维
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">⚔</span> 五维性格</div>`;
  html += `<div class="mud-p-stats">`;
  html += renderStatItem('刚猛', p.aggressive);
  html += renderStatItem('坚韧', p.persistent);
  html += renderStatItem('仁善', p.kind);
  html += renderStatItem('懈怠', p.lazy);
  html += renderStatItem('聪慧', p.smart);
  html += `</div></div>`;

  // 道德双轴
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">☯</span> 道德双轴</div>`;
  html += renderMoralAxes(d.moral.goodEvil, d.moral.lawChaos);
  html += `</div>`;

  // 先天特性
  html += renderTraitsSection(d);

  // 当前情绪
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">💭</span> 当前情绪</div>`;
  if (emotion && emotion.currentEmotion) {
    const emotionName = EMOTION_LABEL[emotion.currentEmotion] ?? emotion.currentEmotion;
    html += `<div class="mud-p-kv"><span class="mud-p-tag mud-p-tag-emotion">${emotionName}</span> 强度 ${emotion.emotionIntensity} <span class="mud-p-hint">— ${emotion.decayCounter} tick 前触发</span></div>`;
  } else {
    html += `<div class="mud-p-kv"><span class="mud-text-mute">平静（无特殊情绪波动）</span></div>`;
  }
  html += `</div>`;

  // 人际关系
  html += renderRelationsSection(d, state);

  return html;
}

// ===== sect 命令 =====

function renderGauge(value: number, leftLabel: string, rightLabel: string): string {
  const pos = Math.round((value + 100) / 200 * 20);
  const clamped = Math.max(0, Math.min(20, pos));
  const bar = '─'.repeat(clamped) + '●' + '─'.repeat(20 - clamped);
  return `${leftLabel} ${bar} ${rightLabel}`;
}

/**
 * 渲染宗门道风总览（sect 命令 — 面板化排版）
 */
export function formatSectProfile(state: LiteGameState): string {
  const sect = state.sect;

  let html = '';

  // 基础
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">🏯</span> 宗门概况</div>`;
  html += `<div class="mud-p-kv-grid">`;
  html += `<span class="mud-p-kv-key">等级</span><span class="mud-p-kv-val">${sect.level}级</span>`;
  html += `<span class="mud-p-kv-key">声望</span><span class="mud-p-kv-val">${sect.reputation}</span>`;
  html += `<span class="mud-p-kv-key">灵气浓度</span><span class="mud-p-kv-val">×${sect.auraDensity.toFixed(2)}</span>`;
  html += `<span class="mud-p-kv-key">弟子数</span><span class="mud-p-kv-val">${state.disciples.length}人</span>`;
  html += `<span class="mud-p-kv-key">上缴丹药</span><span class="mud-p-kv-val">${sect.tributePills}颗</span>`;
  html += `</div></div>`;

  // 道风双轴
  const ethosLabel = getEthosLabel(sect.ethos);
  const discLabel = getDisciplineLabel(sect.discipline);
  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">☯</span> 道风双轴</div>`;
  html += `<div class="mud-p-axis">`;
  html += `  <span class="mud-p-axis-label">仁霸</span> ${renderAxisBar(sect.ethos)} <span class="mud-p-axis-tag">${ethosLabel}</span>`;
  html += `</div>`;
  html += `<div class="mud-p-axis">`;
  html += `  <span class="mud-p-axis-label">放律</span> ${renderAxisBar(sect.discipline)} <span class="mud-p-axis-tag">${discLabel}</span>`;
  html += `</div>`;
  html += `<div class="mud-p-kv"><span class="mud-p-hint">${renderGauge(sect.ethos, '仁', '霸')}</span></div>`;
  html += `<div class="mud-p-kv"><span class="mud-p-hint">${renderGauge(sect.discipline, '放', '律')}</span></div>`;
  html += `</div>`;

  return html;
}

// ===== judge 命令 =====

/**
 * 渲染裁决窗口（面板化排版）
 */
export function formatRulingWindow(ruling: ActiveRuling, remainingSeconds: number): string {
  const remaining = Math.max(0, Math.round(remainingSeconds));

  let html = '';

  html += `<div class="mud-p-section mud-p-ruling-event">`;
  html += `<div class="mud-p-ruling-title">⚡ ${escapeHtml(ruling.eventName)}</div>`;
  html += `<div class="mud-p-ruling-desc">${escapeHtml(ruling.eventText)}</div>`;
  html += `</div>`;

  html += `<div class="mud-p-section">`;
  html += `<div class="mud-p-section__head"><span class="mud-p-icon">⚖</span> 请掌门裁决</div>`;
  for (const opt of ruling.options) {
    html += `<div class="mud-p-ruling-option">`;
    html += `  <span class="mud-p-ruling-num">[${opt.index}]</span>`;
    html += `  <span class="mud-p-ruling-label">${escapeHtml(opt.label)}</span>`;
    html += `  <span class="mud-p-ruling-detail">— ${escapeHtml(opt.description)}</span>`;
    html += `</div>`;
  }
  html += `</div>`;

  html += `<div class="mud-p-ruling-footer">`;
  html += `输入 <span class="mud-text-bright">judge 1~${ruling.options.length}</span> 做出裁决`;
  html += ` <span class="mud-p-ruling-timer">⏱ ${remaining}秒</span>`;
  html += `</div>`;

  return html;
}

/**
 * 渲染裁决结果
 */
export function formatRulingResult(resolution: RulingResolution): string {
  const lines: string[] = [];
  if (resolution.timedOut && resolution.timeoutText) {
    lines.push(`<span class="mud-text-dim">${escapeHtml(resolution.timeoutText)}</span>`);
  }
  lines.push(`<span class="mud-severity-splash">⚖ ${escapeHtml(resolution.option.mudText)}</span>`);
  const ethosDir = resolution.option.ethosShift > 0 ? '偏霸' : resolution.option.ethosShift < 0 ? '偏仁' : '';
  const discDir = resolution.option.disciplineShift > 0 ? '偏律' : resolution.option.disciplineShift < 0 ? '偏放' : '';
  const shifts: string[] = [];
  if (ethosDir) shifts.push(`道风${ethosDir}(${resolution.option.ethosShift > 0 ? '+' : ''}${resolution.option.ethosShift})`);
  if (discDir) shifts.push(`门规${discDir}(${resolution.option.disciplineShift > 0 ? '+' : ''}${resolution.option.disciplineShift})`);
  if (shifts.length > 0) {
    lines.push(`<span class="mud-text-dim">  宗门气运微移：${shifts.join('，')}</span>`);
  }
  return lines.join('\n');
}
