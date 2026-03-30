/**
 * MUD 格式化工具 — Phase H-α
 *
 * 纯函数格式化模块：不依赖 DOM，不修改 GameState，可单元测试。
 *
 * 导出函数：
 * - formatLookOverview       — `look` 命令：宗门总览（按 Zone 分组）
 * - formatDiscipleProfile    — `look <弟子>` 命令：弟子档案
 * - matchDisciple            — 弟子名匹配（精确→前缀→无）
 * - formatSeverityLog        — 日志严重度着色包装
 * - formatStatusBar          — 固定状态栏内容（纯文本，DOM 写入由 main.ts 负责）
 * - pickAmbientLine          — 随机一条环境呼吸文案
 * - getMoralLabel            — goodEvil/lawChaos 值 → 标签文字
 * - getEthosLabel            — sect.ethos → 标签
 * - getDisciplineLabel       — sect.discipline → 标签
 *
 * @see phaseH-alpha-PRD.md §2.1 E3/E6/E9/E10/E11
 * @see phaseH-alpha-TDD.md Step 2.2
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


// ===== 类型 =====

/** 弟子名匹配结果 */
export type MatchResult =
  | { type: 'exact';    disciple: LiteDiscipleState }
  | { type: 'multiple'; candidates: LiteDiscipleState[] }
  | { type: 'none' };

// ===== 颜色常量（PRD E3 日志级别）=====

const SEVERITY_COLORS: Record<number, string> = {
  [EventSeverity.BREATH]:   '#4a4a4a',   // Lv.0 呼吸 — 暗灰
  [EventSeverity.RIPPLE]:   '#8a8a6a',   // Lv.1 涟漪 — 正常
  [EventSeverity.SPLASH]:   '#c8b88b',   // Lv.2 浪花 — 亮
  [EventSeverity.STORM]:    '#ffd700',   // Lv.3 风暴 — 金
  [EventSeverity.CALAMITY]: '#ff4444',   // Lv.4 天劫 — 红（预留）
};

// ===== 道德/道风标签（PRD E6/E9）=====

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

// ===== 弟子名匹配（PRD E4）=====

/**
 * 弟子名匹配：精确全名 → 前缀匹配（唯一/多结果） → 无匹配
 */
export function matchDisciple(query: string, disciples: LiteDiscipleState[]): MatchResult {
  if (!query) return { type: 'none' };

  // 1. 精确全名匹配
  const exact = disciples.find(d => d.name === query);
  if (exact) return { type: 'exact', disciple: exact };

  // 2. 前缀匹配
  const prefixMatches = disciples.filter(d => d.name.startsWith(query));
  if (prefixMatches.length === 1) return { type: 'exact', disciple: prefixMatches[0] };
  if (prefixMatches.length > 1)  return { type: 'multiple', candidates: prefixMatches };

  return { type: 'none' };
}

// ===== look 命令（PRD E5 + Story #1 AC1）=====

/**
 * 渲染宗门总览：按 Zone 分组列出弟子 + 每区一句固定描述
 */
export function formatLookOverview(state: LiteGameState): string {
  const lines: string[] = [];
  lines.push(`<span style="color:#c8b88b">────────── 宗门总览 ──────────</span>`);

  // 按 Zone 分组弟子
  const zones = Object.keys(LOCATION_LABEL) as LocationTag[];
  const byZone = new Map<LocationTag, LiteDiscipleState[]>();
  for (const z of zones) byZone.set(z, []);

  for (const d of state.disciples) {
    const loc = BEHAVIOR_LOCATION_MAP[d.behavior];
    const arr = byZone.get(loc);
    if (arr) arr.push(d);
  }

  for (const zone of zones) {
    const disciples = byZone.get(zone) ?? [];
    const zoneLabel = LOCATION_LABEL[zone];
    const desc = ZONE_DESCRIPTIONS[zone];

    lines.push(`<span style="color:#7a8aba">  ◆ ${escapeHtml(zoneLabel)}</span>  <span style="color:#4a4a6a">${escapeHtml(desc)}</span>`);

    if (disciples.length === 0) {
      lines.push(`<span style="color:#4a4a4a">      （无人）</span>`);
    } else {
      for (const d of disciples) {
        const behaviorText = getBehaviorLabel(d.behavior);
        lines.push(
          `<span style="color:#9a9a7a">      [${escapeHtml(d.name)}] (${d.starRating}★ ${escapeHtml(d.personalityName)}) — ${escapeHtml(behaviorText)}</span>`
        );
      }
    }
  }

  return lines.join('\n');
}


// ===== look <弟子> 命令（PRD E6 + Story #1 AC2）=====

/**
 * 渲染弟子档案：性格/特性/道德/状态/关系
 */
export function formatDiscipleProfile(
  d: LiteDiscipleState,
  state: LiteGameState,
): string {
  const lines: string[] = [];
  const sep = `<span style="color:#c8b88b">═══════ 弟子档案 · ${escapeHtml(d.name)} ═══════</span>`;
  lines.push(sep);

  // 基础信息
  lines.push(`  资质：${'★'.repeat(d.starRating)}   境界：<span style="color:#c8a858">${escapeHtml(getRealmDisplayName(d.realm, d.subRealm))}</span>`);
  lines.push(`  性格：${escapeHtml(d.personalityName)}`);

  const p = d.personality;
  lines.push(
    `    刚猛 ${p.aggressive.toFixed(1)} / 坚韧 ${p.persistent.toFixed(1)} / 仁善 ${p.kind.toFixed(1)} / 懈怠 ${p.lazy.toFixed(1)} / 聪慧 ${p.smart.toFixed(1)}`
  );

  // 道德
  const moralLabel  = getMoralLabel(d.moral.goodEvil);
  const chaosLabel  = getChaosLabel(d.moral.lawChaos);
  lines.push(`  道德：${moralLabel}(${d.moral.goodEvil > 0 ? '+' : ''}${d.moral.goodEvil}) ${chaosLabel}(${d.moral.lawChaos > 0 ? '+' : ''}${d.moral.lawChaos})`);

  // 特性 — DiscipleTrait 存 defId，需从 TRAIT_REGISTRY 查 name
  if (d.traits && d.traits.length > 0) {
    const traitNames = d.traits.map(t => {
      const def = TRAIT_REGISTRY.find(r => r.id === t.defId);
      return `[${escapeHtml(def?.name ?? t.defId)}]`;
    }).join(' ');
    lines.push(`  特性：${traitNames}`);
  } else {
    lines.push(`  特性：（无）`);
  }

  // 当前状态
  const loc = BEHAVIOR_LOCATION_MAP[d.behavior];
  const locLabel = LOCATION_LABEL[loc];
  const behaviorLabel = getBehaviorLabel(d.behavior);
  lines.push(`  当前：${escapeHtml(locLabel)} — ${escapeHtml(behaviorLabel)} (剩余 ${d.behaviorTimer.toFixed(0)}s)`);
  lines.push(`  体力：${d.stamina.toFixed(0)}/100`);

  // 关系
  const rels = state.relationships.filter(r => r.sourceId === d.id);
  if (rels.length > 0) {
    lines.push(`  <span style="color:#6a8a6a">─── 关系 ───</span>`);
    for (const rel of rels) {
      const other = state.disciples.find(x => x.id === rel.targetId);
      if (!other) continue;
      const sign = rel.affinity >= 0 ? '+' : '';
      const tagsStr = rel.tags && rel.tags.length > 0 ? ` [${rel.tags.join(',')}]` : '';
      lines.push(`    → ${escapeHtml(other.name)}：好感 ${sign}${rel.affinity.toFixed(0)}${tagsStr}`);
    }
  }

  return lines.join('\n');
}

// ===== 日志严重度着色（PRD E3 + Story #2）=====

/**
 * 将日志文本包装在对应严重度颜色的 span 内
 * 对 STORM 级别额外添加 ═══ 框线
 */
export function formatSeverityLog(severity: number, text: string): string {
  const color = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS[EventSeverity.RIPPLE];

  if (severity >= EventSeverity.STORM) {
    return (
      `<span style="color:${color}">` +
      `═══ ${escapeHtml(text)} ═══` +
      `</span>`
    );
  }

  if (severity >= EventSeverity.SPLASH) {
    return `<span style="color:${color}">「${escapeHtml(text)}」</span>`;
  }

  return `<span style="color:${color}">${escapeHtml(text)}</span>`;
}

// ===== 状态栏（PRD E11 + Story #3 AC1/AC2）=====

/**
 * 渲染固定状态栏的 HTML 内容（由 main.ts 注入 status-bar 元素）
 */
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

// ===== 环境呼吸（PRD E10 + Story #3 AC3）=====

/**
 * 随机取一条全局呼吸文案
 */
export function pickAmbientLine(): string {
  const idx = Math.floor(Math.random() * AMBIENT_BREATHING_POOL.length);
  return AMBIENT_BREATHING_POOL[idx];
}
