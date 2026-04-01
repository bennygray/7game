/**
 * 分析 0.8B vs 2B 具体的幻觉案例差异
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOGS = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');

interface CallResult {
  testId: string; level: number; run: number;
  emotion: string | null; innerThought: string | null;
  parseSuccess: boolean; pipeline: string;
}

const KNOWN_NAMES = new Set(['王灵均', '赵铁柱', '李沐阳', '张清风', '苏瑶', '掌门', '长老']);

// 复制 V4 的幻觉检测逻辑
function detectHallucination(thought: string, promptText: string): { isHallucination: boolean; evidence: string } {
  const pat = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
  let m;
  while ((m = pat.exec(thought)) !== null) {
    const candidate = m[1];
    if (!KNOWN_NAMES.has(candidate) && !promptText.includes(candidate)) {
      return { isHallucination: true, evidence: `虚构名词: "${candidate}"` };
    }
  }
  return { isHallucination: false, evidence: '' };
}

// 加载数据
const new08 = JSON.parse(readFileSync(join(LOGS, 'poc-ij-v4-raw-2026-03-31T19-15-24.json'), 'utf8')) as CallResult[];
const m2b = JSON.parse(readFileSync(join(LOGS, 'poc-ij-v4-raw-2026-03-31T18-56-03.json'), 'utf8')) as CallResult[];

console.log('=== 2B 幻觉案例 ===\n');
let hall2b = 0, hall08 = 0;

for (const r of m2b) {
  if (!r.innerThought || !r.parseSuccess) continue;
  const det = detectHallucination(r.innerThought, '');  // 用空 prompt 检测所有名字引用
  if (det.isHallucination) {
    hall2b++;
    if (hall2b <= 15) {
      console.log(`[2B] ${r.testId} L${r.level} R${r.run}: ${det.evidence}`);
      console.log(`     "${r.innerThought.slice(0, 80)}..."`);
      console.log('');
    }
  }
}

console.log(`\n=== 0.8B（新server）幻觉案例 ===\n`);
for (const r of new08) {
  if (!r.innerThought || !r.parseSuccess) continue;
  const det = detectHallucination(r.innerThought, '');
  if (det.isHallucination) {
    hall08++;
    if (hall08 <= 15) {
      console.log(`[0.8B] ${r.testId} L${r.level} R${r.run}: ${det.evidence}`);
      console.log(`      "${r.innerThought.slice(0, 80)}..."`);
      console.log('');
    }
  }
}

console.log(`\n=== 统计 ===`);
console.log(`2B 幻觉命中数: ${hall2b}/${m2b.filter(r => r.parseSuccess && r.innerThought).length}`);
console.log(`0.8B 幻觉命中数: ${hall08}/${new08.filter(r => r.parseSuccess && r.innerThought).length}`);

// 分析幻觉中出现的具体"虚构词"频率
console.log('\n=== 2B 高频虚构词 ===');
const words2b = new Map<string, number>();
for (const r of m2b) {
  if (!r.innerThought || !r.parseSuccess) continue;
  const pat = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
  let m;
  while ((m = pat.exec(r.innerThought)) !== null) {
    if (!KNOWN_NAMES.has(m[1])) words2b.set(m[1], (words2b.get(m[1]) ?? 0) + 1);
  }
}
[...words2b.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([w, c]) => console.log(`  "${w}" × ${c}`));

console.log('\n=== 0.8B 高频虚构词 ===');
const words08 = new Map<string, number>();
for (const r of new08) {
  if (!r.innerThought || !r.parseSuccess) continue;
  const pat = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
  let m;
  while ((m = pat.exec(r.innerThought)) !== null) {
    if (!KNOWN_NAMES.has(m[1])) words08.set(m[1], (words08.get(m[1]) ?? 0) + 1);
  }
}
[...words08.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([w, c]) => console.log(`  "${w}" × ${c}`));
