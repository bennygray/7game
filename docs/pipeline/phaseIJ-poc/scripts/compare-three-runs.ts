/**
 * 三次测试对比：旧0.8B vs 2B vs 新0.8B（全新server）
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOGS = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');

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

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

const files = {
  old08: 'poc-ij-v4-metrics-2026-03-31T16-31-16.json',  // 旧0.8B
  m2b:   'poc-ij-v4-metrics-2026-03-31T18-56-03.json',  // 2B
  new08: 'poc-ij-v4-metrics-2026-03-31T19-15-24.json',  // 新0.8B（全新server）
};

function load(name: string): LevelMetrics[] {
  return JSON.parse(readFileSync(join(LOGS, name), 'utf8'));
}

const old08 = load(files.old08);
const m2b = load(files.m2b);
const new08 = load(files.new08);

const composite = (m: LevelMetrics) =>
  m.emotionConsistencyRate * 0.3 + m.reflectionRate * 0.25 +
  (1 - m.hallucinationRate) * 0.25 + m.parseSuccessRate * 0.2;

console.log('');
console.log('='.repeat(120));
console.log('  三次运行完整指标对比：旧0.8B | 2B | 新0.8B（全新server）');
console.log('='.repeat(120));

for (let lvl = 0; lvl <= 6; lvl++) {
  const a = old08.find(m => m.level === lvl)!;
  const b = m2b.find(m => m.level === lvl)!;
  const c = new08.find(m => m.level === lvl)!;

  console.log(`\n--- L${lvl} ---`);
  console.log(`${'指标'.padEnd(14)} | ${'旧0.8B'.padEnd(8)} | ${'2B'.padEnd(8)} | ${'新0.8B'.padEnd(8)} | 备注`);
  console.log('-'.repeat(75));
  console.log(`情绪一致率      | ${pct(a.emotionConsistencyRate).padEnd(8)} | ${pct(b.emotionConsistencyRate).padEnd(8)} | ${pct(c.emotionConsistencyRate).padEnd(8)} | ${bestOf3('情绪', a.emotionConsistencyRate, b.emotionConsistencyRate, c.emotionConsistencyRate)}`);
  console.log(`关系反映率      | ${pct(a.reflectionRate).padEnd(8)} | ${pct(b.reflectionRate).padEnd(8)} | ${pct(c.reflectionRate).padEnd(8)} | ${bestOf3('关系', a.reflectionRate, b.reflectionRate, c.reflectionRate)}`);
  console.log(`幻觉率          | ${pct(a.hallucinationRate).padEnd(8)} | ${pct(b.hallucinationRate).padEnd(8)} | ${pct(c.hallucinationRate).padEnd(8)} | ${bestOf3('幻觉', a.hallucinationRate, b.hallucinationRate, c.hallucinationRate, true)}`);
  console.log(`解析成功率      | ${pct(a.parseSuccessRate).padEnd(8)} | ${pct(b.parseSuccessRate).padEnd(8)} | ${pct(c.parseSuccessRate).padEnd(8)} |`);
  console.log(`延迟            | ${String(a.avgLatencyMs + 'ms').padEnd(8)} | ${String(b.avgLatencyMs + 'ms').padEnd(8)} | ${String(c.avgLatencyMs + 'ms').padEnd(8)} |`);
  console.log(`行为一致率      | ${pct(a.actionConsistencyRate).padEnd(8)} | ${pct(b.actionConsistencyRate).padEnd(8)} | ${pct(c.actionConsistencyRate).padEnd(8)} | ${a.actionConsistencyRate >= 0 ? bestOf3('行为', a.actionConsistencyRate, b.actionConsistencyRate, c.actionConsistencyRate) : ''}`);
  console.log(`层级差异率      | ${pct(a.differentiationRate).padEnd(8)} | ${pct(b.differentiationRate).padEnd(8)} | ${pct(c.differentiationRate).padEnd(8)} |`);
  console.log(`综合分          | ${(composite(a)*100).toFixed(0).padEnd(8)} | ${(composite(b)*100).toFixed(0).padEnd(8)} | ${(composite(c)*100).toFixed(0).padEnd(8)} | ${bestOf3('综合', composite(a), composite(b), composite(c))}`);
}

console.log('\n' + '='.repeat(120));
console.log('  甜蜜点排名');
console.log('='.repeat(120));

const rank = (data: LevelMetrics[], label: string) => {
  const scored = data.map(m => ({ level: m.level, score: composite(m) })).sort((a, b) => b.score - a.score);
  console.log(`\n${label}:`);
  scored.forEach((s, i) => console.log(`  ${i + 1}. L${s.level} = ${(s.score * 100).toFixed(0)}`));
  return scored;
};

rank(old08, '旧0.8B（旧server）');
rank(m2b, '2B（全新server）');
rank(new08, '新0.8B（全新server）');

// Summary
console.log('\n' + '='.repeat(120));
console.log('  关键结论');
console.log('='.repeat(120));

// For each level, determine winner
for (let lvl = 0; lvl <= 6; lvl++) {
  const a = old08.find(m => m.level === lvl)!;
  const b = m2b.find(m => m.level === lvl)!;
  const c = new08.find(m => m.level === lvl)!;
  const sa = composite(a), sb = composite(b), sc = composite(c);
  const best = Math.max(sa, sb, sc);
  const winners = [];
  if (sa === best) winners.push('旧0.8B');
  if (sb === best) winners.push('2B');
  if (sc === best) winners.push('新0.8B');
  console.log(`L${lvl}: 综合分 旧0.8B=${(sa*100).toFixed(0)} | 2B=${(sb*100).toFixed(0)} | 新0.8B=${(sc*100).toFixed(0)} → 胜者: ${winners.join(', ')}`);
}

function bestOf3(label: string, a: number, b: number, c: number, inverted = false): string {
  const vals = [{ name: '旧0.8B', v: a }, { name: '2B', v: b }, { name: '新0.8B', v: c }];
  vals.sort((x, y) => inverted ? x.v - y.v : y.v - x.v);
  return `最佳: ${vals[0].name}`;
}
