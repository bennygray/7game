/**
 * 0.8B vs 2B 模型对比报告生成器
 * 用法：npx tsx docs/pipeline/phaseIJ-poc/scripts/compare-models.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LOGS_DIR = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
const OUT_DIR = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc');

// ===== 数据结构 =====

interface CallResult {
  testId: string;
  level: number;
  run: number;
  emotion: string | null;
  intensity: number | null;
  actionCode: string | null;
  innerThought: string | null;
  relationshipDeltas: Array<{ targetId: string; delta: number; reason: string }> | null;
  parseSuccess: boolean;
  latencyMs: number;
  apiCalls: number;
  pipeline: string;
}

interface LevelMetrics {
  level: number;
  sampleCount: number;
  emotionConsistencyRate: number;
  reflectionRate: number;
  hallucinationRate: number;
  parseSuccessRate: number;
  avgLatencyMs: number;
  avgThoughtLen: number;
  differentiationRate: number;
  actionConsistencyRate: number;
}

// ===== 加载数据 =====

function findLatestFile(prefix: string): string | null {
  const files = readdirSync(LOGS_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .sort();
  return files.length > 0 ? join(LOGS_DIR, files[files.length - 1]) : null;
}

// 通过时间戳来区分：16开头的是0.8B（下午4点跑的），18开头的是2B（下午6点跑的）
function findModelFiles(): { raw08: string | null; raw2b: string | null; met08: string | null; met2b: string | null } {
  const rawFiles = readdirSync(LOGS_DIR).filter(f => f.startsWith('poc-ij-v4-raw-') && f.endsWith('.json')).sort();
  const metFiles = readdirSync(LOGS_DIR).filter(f => f.startsWith('poc-ij-v4-metrics-') && f.endsWith('.json')).sort();

  // 0.8B: 16-31 时间戳的那个（140KB, 175条完整数据）
  // 2B: 18-56 时间戳的那个（最新运行）
  const raw08 = rawFiles.find(f => f.includes('16-31')) ?? null;
  const raw2b = rawFiles.find(f => f.includes('18-56')) ?? null;
  const met08 = metFiles.find(f => f.includes('16-31')) ?? null;
  const met2b = metFiles.find(f => f.includes('18-56')) ?? null;

  return {
    raw08: raw08 ? join(LOGS_DIR, raw08) : null,
    raw2b: raw2b ? join(LOGS_DIR, raw2b) : null,
    met08: met08 ? join(LOGS_DIR, met08) : null,
    met2b: met2b ? join(LOGS_DIR, met2b) : null,
  };
}

function loadJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

// ===== 测试用例信息 =====

const TEST_INFO: Record<string, { subject: string; target: string; relation: string; type: string; scenario: string }> = {
  T1: { subject: '张清风（内向正直）', target: '李沐阳', relation: '死对头 -45', type: 'dialogue', scenario: '在后山碰面交谈' },
  T2: { subject: '王灵均（温和善良）', target: '赵铁柱', relation: '挚友 +70', type: 'dialogue', scenario: '在灵田旁偶遇闲聊' },
  T3: { subject: '李沐阳（好胜外向，偏恶）', target: '张清风', relation: '死对头 -60', type: 'dialogue', scenario: '激烈争执' },
  T4: { subject: '张清风（内向正直，偏善）', target: '李沐阳', relation: '死对头', type: 'decision', scenario: '妖兽围困李沐阳，命悬一线' },
  T5: { subject: '王灵均（温和善良）', target: '赵铁柱', relation: '挚友 +70', type: 'decision', scenario: '妖兽围困赵铁柱，命悬一线' },
};

const LEVEL_LABELS: Record<number, string> = {
  0: '无关系信息',
  1: '好感+标签',
  2: '+1条经历',
  3: '+3条经历 ★',
  4: '+个人近况',
  5: '+间接关系',
  6: '+补充叙事',
};

const EXPECTED_EMOTIONS: Record<string, string[]> = {
  T1: ['anger', 'contempt'],
  T2: ['joy', 'gratitude', 'admiration'],
  T3: ['anger', 'contempt', 'pride'],
  T4: ['anger', 'contempt', 'fear'],    // 面对死对头，正义角色可能愤怒/恐惧
  T5: ['worry', 'fear', 'sadness'],      // 面对挚友被困，应该担忧/恐惧
};

// ===== 生成对比报告 =====

function truncThought(t: string | null, len = 35): string {
  if (!t) return '—';
  const s = t.replace(/\n/g, ' ').trim();
  return s.length > len ? s.slice(0, len) + '…' : s;
}

function generateComparison(raw08: CallResult[], raw2b: CallResult[], met08: LevelMetrics[], met2b: LevelMetrics[]): string {
  const lines: string[] = [];

  lines.push('# Phase IJ-PoC V4 — 0.8B vs 2B 模型对比报告');
  lines.push('');
  lines.push('> **生成时间**：' + new Date().toISOString());
  lines.push('> **模型 A**：Qwen3.5-0.8B GGUF Q4_K_M (~508MB)');
  lines.push('> **模型 B**：Qwen3.5-2B GGUF Q4_K_M (~1222MB)');
  lines.push('> **实验规模**：各 175 逻辑调用 / 245 API 调用 / 5轮重复');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ===== Section 1: 总览对比 =====
  lines.push('## 1. 总览对比');
  lines.push('');

  const totalLatency08 = raw08.reduce((s, r) => s + r.latencyMs, 0);
  const totalLatency2b = raw2b.reduce((s, r) => s + r.latencyMs, 0);
  const totalTime08 = (totalLatency08 / 60000).toFixed(1);
  const totalTime2b = (totalLatency2b / 60000).toFixed(1);
  const avgLat08 = Math.round(totalLatency08 / raw08.length);
  const avgLat2b = Math.round(totalLatency2b / raw2b.length);
  const parse08 = raw08.filter(r => r.parseSuccess).length;
  const parse2b = raw2b.filter(r => r.parseSuccess).length;

  lines.push('| 指标 | 0.8B | 2B | 变化 |');
  lines.push('|------|:----:|:--:|:----:|');
  lines.push(`| 解析成功率 | ${parse08}/${raw08.length} (${pct(parse08/raw08.length)}) | ${parse2b}/${raw2b.length} (${pct(parse2b/raw2b.length)}) | ${parse2b >= parse08 ? '✅' : '⚠️'} |`);
  lines.push(`| 平均延迟 | ${avgLat08}ms | ${avgLat2b}ms | ${avgLat2b < avgLat08 ? '🟢 ' + pct(1 - avgLat2b/avgLat08) + '↓' : '🔴 ' + pct(avgLat2b/avgLat08 - 1) + '↑'} |`);
  lines.push(`| 总推理时间 | ~${totalTime08} min | ~${totalTime2b} min | ${Number(totalTime2b) < Number(totalTime08) ? '🟢' : '🔴'} |`);
  lines.push('');

  // ===== Section 2: 各级指标对比 =====
  lines.push('## 2. 各级指标对比');
  lines.push('');
  lines.push('| Level | 描述 | 情绪一致 (0.8B→2B) | 关系反映 (0.8B→2B) | 幻觉率 (0.8B→2B) | 延迟 (0.8B→2B) | 行为一致 (0.8B→2B) |');
  lines.push('|:-----:|:----:|:------------------:|:------------------:|:----------------:|:--------------:|:------------------:|');

  for (let lvl = 0; lvl <= 6; lvl++) {
    const m08 = met08.find(m => m.level === lvl);
    const m2b = met2b.find(m => m.level === lvl);
    if (!m08 || !m2b) continue;

    const emoDelta = Math.round((m2b.emotionConsistencyRate - m08.emotionConsistencyRate) * 100);
    const refDelta = Math.round((m2b.reflectionRate - m08.reflectionRate) * 100);
    const halDelta = Math.round((m2b.hallucinationRate - m08.hallucinationRate) * 100);
    const actDelta = m08.actionConsistencyRate >= 0 && m2b.actionConsistencyRate >= 0
      ? Math.round((m2b.actionConsistencyRate - m08.actionConsistencyRate) * 100) : null;

    const arrow = (d: number, inverted = false) => {
      const good = inverted ? d < 0 : d > 0;
      const bad = inverted ? d > 0 : d < 0;
      if (d === 0) return '➡️';
      return good ? `🟢${d > 0 ? '+' : ''}${d}` : `🔴${d > 0 ? '+' : ''}${d}`;
    };

    const label = LEVEL_LABELS[lvl] ?? '';
    lines.push(`| **L${lvl}** | ${label} | ${pct(m08.emotionConsistencyRate)}→**${pct(m2b.emotionConsistencyRate)}** ${arrow(emoDelta)} | ${pct(m08.reflectionRate)}→**${pct(m2b.reflectionRate)}** ${arrow(refDelta)} | ${pct(m08.hallucinationRate)}→**${pct(m2b.hallucinationRate)}** ${arrow(halDelta, true)} | ${m08.avgLatencyMs}→**${m2b.avgLatencyMs}ms** | ${m08.actionConsistencyRate >= 0 ? pct(m08.actionConsistencyRate) : '—'}→**${m2b.actionConsistencyRate >= 0 ? pct(m2b.actionConsistencyRate) : '—'}** ${actDelta !== null ? arrow(actDelta) : ''} |`);
  }
  lines.push('');

  // ===== Section 3: 甜蜜点对比 =====
  lines.push('## 3. 甜蜜点对比');
  lines.push('');

  const composite = (m: LevelMetrics) =>
    m.emotionConsistencyRate * 0.3 + m.reflectionRate * 0.25 +
    (1 - m.hallucinationRate) * 0.25 + m.parseSuccessRate * 0.2;

  const scored08 = met08.filter(m => m.sampleCount > 0).map(m => ({ level: m.level, score: composite(m) })).sort((a, b) => b.score - a.score);
  const scored2b = met2b.filter(m => m.sampleCount > 0).map(m => ({ level: m.level, score: composite(m) })).sort((a, b) => b.score - a.score);

  lines.push('| 排名 | 0.8B | 综合分 | 2B | 综合分 |');
  lines.push('|:----:|:----:|:-----:|:--:|:-----:|');
  for (let i = 0; i < Math.min(7, scored08.length); i++) {
    const s08 = scored08[i];
    const s2b = scored2b[i];
    lines.push(`| ${i + 1} | L${s08.level} | ${(s08.score * 100).toFixed(0)} | L${s2b.level} | ${(s2b.score * 100).toFixed(0)} |`);
  }
  lines.push('');
  lines.push(`> **0.8B 推荐甜蜜点：L${scored08[0].level}**（综合分 ${(scored08[0].score * 100).toFixed(0)}）`);
  lines.push(`> **2B 推荐甜蜜点：L${scored2b[0].level}**（综合分 ${(scored2b[0].score * 100).toFixed(0)}）`);
  lines.push('');

  // ===== Section 4: 逐用例逐级对话对比 =====
  lines.push('---');
  lines.push('');
  lines.push('## 4. 逐用例对话对比');
  lines.push('');

  for (const [testId, info] of Object.entries(TEST_INFO)) {
    lines.push(`### ${testId}: ${info.subject} ↔ ${info.target}（${info.relation}）`);
    lines.push(`> **场景**：${info.scenario} | **类型**：${info.type === 'decision' ? '决策（两阶段）' : '对话（单次）'}`);
    lines.push('');

    for (let lvl = 0; lvl <= 6; lvl++) {
      const r08 = raw08.filter(r => r.testId === testId && r.level === lvl && r.parseSuccess);
      const r2b = raw2b.filter(r => r.testId === testId && r.level === lvl && r.parseSuccess);

      if (r08.length === 0 && r2b.length === 0) continue;

      const label = LEVEL_LABELS[lvl] ?? '';
      lines.push(`#### L${lvl}（${label}）`);
      lines.push('');

      // 情绪分布
      const emotions08 = r08.map(r => r.emotion ?? '?');
      const emotions2b = r2b.map(r => r.emotion ?? '?');
      const actions08 = r08.map(r => r.actionCode).filter(Boolean);
      const actions2b = r2b.map(r => r.actionCode).filter(Boolean);

      lines.push('| | 0.8B | 2B |');
      lines.push('|--|------|-----|');
      lines.push(`| **情绪** | ${emotions08.join(', ')} | ${emotions2b.join(', ')} |`);

      if (actions08.length > 0 || actions2b.length > 0) {
        lines.push(`| **行动** | ${actions08.join(', ') || '—'} | ${actions2b.join(', ') || '—'} |`);
      }

      // 延迟
      const lat08 = r08.length > 0 ? Math.round(r08.reduce((s, r) => s + r.latencyMs, 0) / r08.length) : 0;
      const lat2b = r2b.length > 0 ? Math.round(r2b.reduce((s, r) => s + r.latencyMs, 0) / r2b.length) : 0;
      lines.push(`| **延迟** | ${lat08}ms | ${lat2b}ms |`);
      lines.push('');

      // 对话输出对比表
      const maxRuns = Math.max(r08.length, r2b.length);
      lines.push('| 轮次 | 0.8B 独白 | 2B 独白 |');
      lines.push('|:----:|----------|---------|');
      for (let i = 0; i < maxRuns; i++) {
        const t08 = i < r08.length ? truncThought(r08[i].innerThought, 45) : '—';
        const t2b = i < r2b.length ? truncThought(r2b[i].innerThought, 45) : '—';
        lines.push(`| R${i + 1} | ${t08} | ${t2b} |`);
      }
      lines.push('');

      // Delta 对比
      if (r08.some(r => r.relationshipDeltas?.length) || r2b.some(r => r.relationshipDeltas?.length)) {
        lines.push('<details><summary>关系变化 (delta) 对比</summary>');
        lines.push('');
        lines.push('| 轮次 | 0.8B delta | 0.8B reason | 2B delta | 2B reason |');
        lines.push('|:----:|:----------:|-------------|:--------:|-----------|');
        for (let i = 0; i < maxRuns; i++) {
          const d08 = i < r08.length ? r08[i].relationshipDeltas?.[0] : null;
          const d2b = i < r2b.length ? r2b[i].relationshipDeltas?.[0] : null;
          lines.push(`| R${i + 1} | ${d08 ? `${d08.delta > 0 ? '+' : ''}${d08.delta}` : '—'} | ${d08 ? truncThought(d08.reason, 30) : '—'} | ${d2b ? `${d2b.delta > 0 ? '+' : ''}${d2b.delta}` : '—'} | ${d2b ? truncThought(d2b.reason, 30) : '—'} |`);
        }
        lines.push('');
        lines.push('</details>');
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  // ===== Section 5: 关键发现 =====
  lines.push('## 5. 关键发现');
  lines.push('');

  // 情绪一致率对比
  const emoAvg08 = met08.reduce((s, m) => s + m.emotionConsistencyRate, 0) / met08.length;
  const emoAvg2b = met2b.reduce((s, m) => s + m.emotionConsistencyRate, 0) / met2b.length;
  const refAvg08 = met08.reduce((s, m) => s + m.reflectionRate, 0) / met08.length;
  const refAvg2b = met2b.reduce((s, m) => s + m.reflectionRate, 0) / met2b.length;
  const halAvg08 = met08.reduce((s, m) => s + m.hallucinationRate, 0) / met08.length;
  const halAvg2b = met2b.reduce((s, m) => s + m.hallucinationRate, 0) / met2b.length;

  lines.push('### 均值对比');
  lines.push('');
  lines.push('| 指标 | 0.8B 均值 | 2B 均值 | 趋势 |');
  lines.push('|------|:--------:|:------:|:----:|');
  lines.push(`| 情绪一致率 | ${pct(emoAvg08)} | ${pct(emoAvg2b)} | ${emoAvg2b > emoAvg08 ? '🟢 提升' : '🔴 下降'} |`);
  lines.push(`| 关系反映率 | ${pct(refAvg08)} | ${pct(refAvg2b)} | ${refAvg2b > refAvg08 ? '🟢 提升' : '🔴 下降'} |`);
  lines.push(`| 幻觉率 | ${pct(halAvg08)} | ${pct(halAvg2b)} | ${halAvg2b < halAvg08 ? '🟢 下降' : '🔴 上升'} |`);
  lines.push(`| 平均延迟 | ${avgLat08}ms | ${avgLat2b}ms | ${avgLat2b < avgLat08 ? '🟢 下降' : '🔴 上升'} |`);
  lines.push('');

  // T4 行为分析
  lines.push('### T4 决策行为分析（正直角色 vs 死对头）');
  lines.push('');
  lines.push('> 这是 0.8B 模型最薄弱的环节：正直善良角色面对死对头被妖兽围困时，是否能做出符合关系逻辑的行为？');
  lines.push('');

  lines.push('| Level | 0.8B 行动分布 | 2B 行动分布 |');
  lines.push('|:-----:|:-------------:|:-----------:|');
  for (let lvl = 0; lvl <= 6; lvl++) {
    const r08 = raw08.filter(r => r.testId === 'T4' && r.level === lvl && r.parseSuccess);
    const r2b = raw2b.filter(r => r.testId === 'T4' && r.level === lvl && r.parseSuccess);
    const acts08 = r08.map(r => r.actionCode).filter(Boolean);
    const acts2b = r2b.map(r => r.actionCode).filter(Boolean);
    lines.push(`| L${lvl} | ${acts08.join(', ') || '—'} | ${acts2b.join(', ') || '—'} |`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*本报告由 compare-models.ts 自动生成*');

  return lines.join('\n');
}

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

// ===== Main =====

function main() {
  const files = findModelFiles();

  if (!files.raw08 || !files.raw2b || !files.met08 || !files.met2b) {
    console.error('缺少数据文件:');
    console.error('  raw08:', files.raw08 ?? '未找到');
    console.error('  raw2b:', files.raw2b ?? '未找到');
    console.error('  met08:', files.met08 ?? '未找到');
    console.error('  met2b:', files.met2b ?? '未找到');
    process.exit(1);
  }

  console.log('0.8B raw:', files.raw08);
  console.log('2B raw:', files.raw2b);
  console.log('0.8B metrics:', files.met08);
  console.log('2B metrics:', files.met2b);

  const raw08 = loadJSON<CallResult[]>(files.raw08);
  const raw2b = loadJSON<CallResult[]>(files.raw2b);
  const met08 = loadJSON<LevelMetrics[]>(files.met08);
  const met2b = loadJSON<LevelMetrics[]>(files.met2b);

  console.log(`0.8B: ${raw08.length} records, 2B: ${raw2b.length} records`);

  const report = generateComparison(raw08, raw2b, met08, met2b);
  const outPath = join(OUT_DIR, 'review-v4-model-comparison.md');
  writeFileSync(outPath, report, 'utf8');
  console.log(`报告已生成: ${outPath}`);
}

main();
