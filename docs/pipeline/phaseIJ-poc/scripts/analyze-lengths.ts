import { readFileSync } from 'node:fs';
const LOGS = 'docs/pipeline/phaseIJ-poc/logs';

interface R { testId: string; level: number; run: number; innerThought: string | null; parseSuccess: boolean; }

function analyze(file: string) {
  const raw = JSON.parse(readFileSync(LOGS + '/' + file, 'utf8')) as R[];
  const parsed = raw.filter(r => r.parseSuccess && r.innerThought);
  const lens = parsed.map(r => r.innerThought!.length).sort((a, b) => a - b);
  const ranges = [[0,20],[20,30],[30,40],[40,50],[50,60],[60,80],[80,200]];
  const dist: Record<string, number> = {};
  for (const [lo, hi] of ranges) {
    dist[`${lo}-${hi}`] = lens.filter(l => l >= lo && l < hi).length;
  }
  return {
    count: parsed.length,
    avg: Math.round(lens.reduce((a,b)=>a+b,0)/lens.length * 10) / 10,
    min: lens[0], p25: lens[Math.floor(lens.length*0.25)],
    p50: lens[Math.floor(lens.length*0.5)], p75: lens[Math.floor(lens.length*0.75)],
    max: lens[lens.length-1],
    dist,
    over50: lens.filter(l => l >= 50).length,
    over60: lens.filter(l => l >= 60).length,
    over80: lens.filter(l => l >= 80).length,
  };
}

const result = {
  old08: analyze('poc-ij-v4-raw-2026-03-31T16-31-16.json'),
  m2b: analyze('poc-ij-v4-raw-2026-03-31T18-56-03.json'),
  new08: analyze('poc-ij-v4-raw-2026-03-31T19-15-24.json'),
};

console.log(JSON.stringify(result, null, 2));
