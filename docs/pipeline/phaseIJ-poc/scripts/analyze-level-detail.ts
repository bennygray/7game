import { readFileSync } from 'node:fs';
const LOGS = 'docs/pipeline/phaseIJ-poc/logs';

interface R { testId: string; level: number; run: number; emotion: string|null; actionCode: string|null; parseSuccess: boolean; }

const EXPECTED: Record<string, { em: string[]; act: string[]|null }> = {
  T1: { em: ['anger','contempt','disgust'], act: null },
  T2: { em: ['joy','gratitude','admiration'], act: null },
  T3: { em: ['anger','contempt','envy','pride'], act: null },
  T4: { em: ['anger','contempt','fear'], act: ['FLEE','FIGHT'] },
  T5: { em: ['worry','fear','sadness'], act: ['PROTECT'] },
};

function analyzeLevel(raw: R[]) {
  const parsed = raw.filter(r => r.parseSuccess);
  const results: any[] = [];

  for (let lvl = 0; lvl <= 6; lvl++) {
    const items = parsed.filter(r => r.level === lvl);
    let emCorr = 0, emTotal = 0, actCorr = 0, actTotal = 0;

    // Per-test stability
    let stabSum = 0, stabCount = 0;
    for (const tid of Object.keys(EXPECTED)) {
      const tItems = items.filter(r => r.testId === tid && r.emotion);
      if (tItems.length === 0) continue;
      const dist: Record<string, number> = {};
      for (const r of tItems) dist[r.emotion!] = (dist[r.emotion!] || 0) + 1;
      stabSum += Math.max(...Object.values(dist)) / tItems.length;
      stabCount++;
    }

    for (const r of items) {
      const exp = EXPECTED[r.testId];
      if (r.emotion) { emTotal++; if (exp.em.includes(r.emotion)) emCorr++; }
      if (r.actionCode && exp.act) { actTotal++; if (exp.act.includes(r.actionCode)) actCorr++; }
    }

    // T4 details
    const t4 = items.filter(r => r.testId === 'T4' && r.actionCode);
    const t4dist: Record<string, number> = {};
    for (const r of t4) t4dist[r.actionCode!] = (t4dist[r.actionCode!] || 0) + 1;
    const t4corr = t4.filter(r => ['FLEE','FIGHT'].includes(r.actionCode!)).length;

    // T5 details
    const t5 = items.filter(r => r.testId === 'T5' && r.actionCode);
    const t5corr = t5.filter(r => r.actionCode === 'PROTECT').length;

    results.push({
      level: lvl,
      emCorr: emTotal > 0 ? Math.round(emCorr/emTotal*100) : 0,
      emStab: stabCount > 0 ? Math.round(stabSum/stabCount*100) : 0,
      actCorr: actTotal > 0 ? Math.round(actCorr/actTotal*100) : 0,
      t4: `${t4corr}/${t4.length} ${JSON.stringify(t4dist)}`,
      t5: `${t5corr}/${t5.length}`,
    });
  }
  return results;
}

const m2b = analyzeLevel(JSON.parse(readFileSync(`${LOGS}/poc-ij-v4-raw-2026-03-31T18-56-03.json`, 'utf8')));
const new08 = analyzeLevel(JSON.parse(readFileSync(`${LOGS}/poc-ij-v4-raw-2026-03-31T19-15-24.json`, 'utf8')));

console.log('=== 2B Model ===');
console.log('Level | EmCorr | EmStab | ActCorr | T4(FLEE/FIGHT) | T5(PROTECT)');
for (const r of m2b) console.log(`L${r.level}    | ${r.emCorr}%\t| ${r.emStab}%\t| ${r.actCorr}%\t| ${r.t4}\t| ${r.t5}`);

console.log('\n=== New 0.8B Model ===');
console.log('Level | EmCorr | EmStab | ActCorr | T4(FLEE/FIGHT) | T5(PROTECT)');
for (const r of new08) console.log(`L${r.level}    | ${r.emCorr}%\t| ${r.emStab}%\t| ${r.actCorr}%\t| ${r.t4}\t| ${r.t5}`);
