/**
 * 分析三个模型在情绪选择和行为选择上的：
 * 1. 稳定度（同一场景 5 轮重复的一致性）
 * 2. 正确率（是否选中预期的情绪/行为）
 */
import { readFileSync } from 'node:fs';

const LOGS = 'docs/pipeline/phaseIJ-poc/logs';

interface R {
  testId: string; level: number; run: number;
  emotion: string | null; actionCode: string | null;
  innerThought: string | null; parseSuccess: boolean;
}

// 期望的正确情绪/行为
const EXPECTED: Record<string, { emotions: string[]; actions?: string[]; desc: string }> = {
  T1: { emotions: ['anger', 'contempt', 'disgust'], desc: '张清风→李沐阳(死对头) 对话' },
  T2: { emotions: ['joy', 'gratitude', 'admiration'], desc: '王灵均→赵铁柱(挚友) 对话' },
  T3: { emotions: ['anger', 'contempt', 'envy', 'pride'], desc: '李沐阳→张清风(死对头) 对话' },
  T4: { emotions: ['anger', 'contempt', 'fear'], actions: ['FLEE', 'FIGHT'], desc: '张清风对死对头被困 决策' },
  T5: { emotions: ['worry', 'fear', 'sadness'], actions: ['PROTECT'], desc: '王灵均对挚友被困 决策' },
};

function load(file: string): R[] {
  return JSON.parse(readFileSync(`${LOGS}/${file}`, 'utf8'));
}

function analyzeModel(raw: R[]): {
  emotionStability: Record<string, Record<number, { total: number; mostCommonPct: number; distribution: Record<string, number> }>>;
  emotionCorrectness: Record<string, Record<number, { total: number; correct: number; rate: number }>>;
  actionStability: Record<string, Record<number, { total: number; mostCommonPct: number; distribution: Record<string, number> }>>;
  actionCorrectness: Record<string, Record<number, { total: number; correct: number; rate: number }>>;
} {
  const parsed = raw.filter(r => r.parseSuccess);

  const emotionStability: any = {};
  const emotionCorrectness: any = {};
  const actionStability: any = {};
  const actionCorrectness: any = {};

  for (const testId of Object.keys(EXPECTED)) {
    emotionStability[testId] = {};
    emotionCorrectness[testId] = {};
    actionStability[testId] = {};
    actionCorrectness[testId] = {};

    for (let level = 0; level <= 6; level++) {
      const items = parsed.filter(r => r.testId === testId && r.level === level);

      // Emotion stability
      const emotions = items.filter(r => r.emotion).map(r => r.emotion!);
      const emDist: Record<string, number> = {};
      for (const e of emotions) emDist[e] = (emDist[e] ?? 0) + 1;
      const maxEmCount = Math.max(...Object.values(emDist), 0);
      emotionStability[testId][level] = {
        total: emotions.length,
        mostCommonPct: emotions.length > 0 ? Math.round(maxEmCount / emotions.length * 100) : 0,
        distribution: emDist,
      };

      // Emotion correctness
      const expected = EXPECTED[testId].emotions;
      const correctEm = emotions.filter(e => expected.includes(e)).length;
      emotionCorrectness[testId][level] = {
        total: emotions.length,
        correct: correctEm,
        rate: emotions.length > 0 ? Math.round(correctEm / emotions.length * 100) : 0,
      };

      // Action stability & correctness
      const actions = items.filter(r => r.actionCode).map(r => r.actionCode!);
      const actDist: Record<string, number> = {};
      for (const a of actions) actDist[a] = (actDist[a] ?? 0) + 1;
      const maxActCount = Math.max(...Object.values(actDist), 0);
      actionStability[testId][level] = {
        total: actions.length,
        mostCommonPct: actions.length > 0 ? Math.round(maxActCount / actions.length * 100) : 0,
        distribution: actDist,
      };

      const expectedAct = EXPECTED[testId].actions;
      if (expectedAct) {
        const correctAct = actions.filter(a => expectedAct.includes(a)).length;
        actionCorrectness[testId][level] = {
          total: actions.length,
          correct: correctAct,
          rate: actions.length > 0 ? Math.round(correctAct / actions.length * 100) : 0,
        };
      }
    }
  }

  return { emotionStability, emotionCorrectness, actionStability, actionCorrectness };
}

// Load & analyze
const old08 = analyzeModel(load('poc-ij-v4-raw-2026-03-31T16-31-16.json'));
const m2b = analyzeModel(load('poc-ij-v4-raw-2026-03-31T18-56-03.json'));
const new08 = analyzeModel(load('poc-ij-v4-raw-2026-03-31T19-15-24.json'));

// Output JSON summary
const summary: any = {};

for (const testId of Object.keys(EXPECTED)) {
  summary[testId] = { desc: EXPECTED[testId].desc, levels: {} };
  for (let level = 0; level <= 6; level++) {
    const row: any = {};

    // Emotion
    row.emotionDist = {
      old08: old08.emotionStability[testId][level].distribution,
      m2b: m2b.emotionStability[testId][level].distribution,
      new08: new08.emotionStability[testId][level].distribution,
    };
    row.emotionStability = {
      old08: old08.emotionStability[testId][level].mostCommonPct,
      m2b: m2b.emotionStability[testId][level].mostCommonPct,
      new08: new08.emotionStability[testId][level].mostCommonPct,
    };
    row.emotionCorrectness = {
      old08: old08.emotionCorrectness[testId][level].rate,
      m2b: m2b.emotionCorrectness[testId][level].rate,
      new08: new08.emotionCorrectness[testId][level].rate,
    };

    // Action (for T4, T5 only)
    if (EXPECTED[testId].actions) {
      row.actionDist = {
        old08: old08.actionStability[testId][level].distribution,
        m2b: m2b.actionStability[testId][level].distribution,
        new08: new08.actionStability[testId][level].distribution,
      };
      row.actionStability = {
        old08: old08.actionStability[testId][level].mostCommonPct,
        m2b: m2b.actionStability[testId][level].mostCommonPct,
        new08: new08.actionStability[testId][level].mostCommonPct,
      };
      row.actionCorrectness = {
        old08: old08.actionCorrectness[testId][level].rate,
        m2b: m2b.actionCorrectness[testId][level].rate,
        new08: new08.actionCorrectness[testId][level].rate,
      };
    }

    summary[testId].levels[`L${level}`] = row;
  }
}

// Print as structured table
const p = (v: number) => `${v}%`;

console.log('==============================');
console.log(' EMOTION STABILITY (dominant choice %)');
console.log('==============================');
console.log('TestCase | Level | old08 | 2B   | new08 | old08_dist | 2B_dist | new08_dist');
for (const testId of Object.keys(EXPECTED)) {
  for (let level = 0; level <= 6; level++) {
    const s = summary[testId].levels[`L${level}`];
    const fmtDist = (d: Record<string, number>) => Object.entries(d).map(([k,v]) => `${k}:${v}`).join(',');
    console.log(`${testId.padEnd(8)} | L${level}    | ${p(s.emotionStability.old08).padEnd(5)} | ${p(s.emotionStability.m2b).padEnd(5)}| ${p(s.emotionStability.new08).padEnd(5)} | ${fmtDist(s.emotionDist.old08).padEnd(30)} | ${fmtDist(s.emotionDist.m2b).padEnd(30)} | ${fmtDist(s.emotionDist.new08)}`);
  }
  console.log('');
}

console.log('==============================');
console.log(' EMOTION CORRECTNESS (expected emotion %)');
console.log('==============================');
console.log('TestCase | Level | old08 | 2B   | new08');
for (const testId of Object.keys(EXPECTED)) {
  for (let level = 0; level <= 6; level++) {
    const s = summary[testId].levels[`L${level}`];
    console.log(`${testId.padEnd(8)} | L${level}    | ${p(s.emotionCorrectness.old08).padEnd(5)} | ${p(s.emotionCorrectness.m2b).padEnd(5)}| ${p(s.emotionCorrectness.new08).padEnd(5)}`);
  }
  console.log('');
}

console.log('==============================');
console.log(' ACTION STABILITY & CORRECTNESS (T4, T5 only)');
console.log('==============================');
console.log('TestCase | Level | Stab_old08 | Stab_2B | Stab_new08 | Corr_old08 | Corr_2B | Corr_new08 | old08_dist | 2B_dist | new08_dist');
for (const testId of ['T4', 'T5']) {
  for (let level = 0; level <= 6; level++) {
    const s = summary[testId].levels[`L${level}`];
    const fmtDist = (d: Record<string, number>) => Object.entries(d).map(([k,v]) => `${k}:${v}`).join(',');
    console.log(`${testId.padEnd(8)} | L${level}    | ${p(s.actionStability.old08).padEnd(10)} | ${p(s.actionStability.m2b).padEnd(7)} | ${p(s.actionStability.new08).padEnd(10)} | ${p(s.actionCorrectness.old08).padEnd(10)} | ${p(s.actionCorrectness.m2b).padEnd(7)} | ${p(s.actionCorrectness.new08).padEnd(10)} | ${fmtDist(s.actionDist.old08).padEnd(25)} | ${fmtDist(s.actionDist.m2b).padEnd(25)} | ${fmtDist(s.actionDist.new08)}`);
  }
  console.log('');
}

// Overall averages
console.log('==============================');
console.log(' OVERALL AVERAGES');
console.log('==============================');

let emStabSum = { old08: 0, m2b: 0, new08: 0 };
let emCorrSum = { old08: 0, m2b: 0, new08: 0 };
let count = 0;

for (const testId of Object.keys(EXPECTED)) {
  for (let level = 0; level <= 6; level++) {
    const s = summary[testId].levels[`L${level}`];
    emStabSum.old08 += s.emotionStability.old08;
    emStabSum.m2b += s.emotionStability.m2b;
    emStabSum.new08 += s.emotionStability.new08;
    emCorrSum.old08 += s.emotionCorrectness.old08;
    emCorrSum.m2b += s.emotionCorrectness.m2b;
    emCorrSum.new08 += s.emotionCorrectness.new08;
    count++;
  }
}

console.log(`Emotion Stability Avg:   old08=${(emStabSum.old08/count).toFixed(1)}%  2B=${(emStabSum.m2b/count).toFixed(1)}%  new08=${(emStabSum.new08/count).toFixed(1)}%`);
console.log(`Emotion Correctness Avg: old08=${(emCorrSum.old08/count).toFixed(1)}%  2B=${(emCorrSum.m2b/count).toFixed(1)}%  new08=${(emCorrSum.new08/count).toFixed(1)}%`);

let actStabSum = { old08: 0, m2b: 0, new08: 0 };
let actCorrSum = { old08: 0, m2b: 0, new08: 0 };
let actCount = 0;
for (const testId of ['T4', 'T5']) {
  for (let level = 0; level <= 6; level++) {
    const s = summary[testId].levels[`L${level}`];
    actStabSum.old08 += s.actionStability.old08;
    actStabSum.m2b += s.actionStability.m2b;
    actStabSum.new08 += s.actionStability.new08;
    actCorrSum.old08 += s.actionCorrectness.old08;
    actCorrSum.m2b += s.actionCorrectness.m2b;
    actCorrSum.new08 += s.actionCorrectness.new08;
    actCount++;
  }
}
console.log(`Action Stability Avg:    old08=${(actStabSum.old08/actCount).toFixed(1)}%  2B=${(actStabSum.m2b/actCount).toFixed(1)}%  new08=${(actStabSum.new08/actCount).toFixed(1)}%`);
console.log(`Action Correctness Avg:  old08=${(actCorrSum.old08/actCount).toFixed(1)}%  2B=${(actCorrSum.m2b/actCount).toFixed(1)}%  new08=${(actCorrSum.new08/actCount).toFixed(1)}%`);
