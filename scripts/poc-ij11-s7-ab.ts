/**
 * S7 仰慕者 A/B 快速测试
 * 5 个变体 × 5 次 = 25 次
 */
import { buildActionPool } from '../src/ai/action-pool-builder';

const BASE = 'http://localhost:3001';

async function call(sys: string, usr: string, poolCodes: string[]) {
  const schema = { type: 'object', properties: { action: { type: 'string', enum: poolCodes }, confidence: { type: 'integer', enum: [1,2,3] } }, required: ['action','confidence'] };
  try {
    const r = await fetch(BASE+'/api/infer', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[{role:'system',content:sys},{role:'user',content:usr}], max_tokens:50, temperature:0.6, timeout_ms:10000, response_format:{type:'json_schema',json_schema:{name:'test',strict:true,schema}} }), signal: AbortSignal.timeout(15000) });
    const d = await r.json() as { content: string; parsed?: Record<string, unknown> };
    return (d.parsed?.action as string) ?? 'ERR';
  } catch { return 'ERR'; }
}
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const pool = buildActionPool('world-event', 'beast-attack-01', 15);
const poolCodes = pool.map(a => a.code);
const poolDesc = pool.map(a => `${a.code}(${a.label})`).join(' / ');
const sys = `你是修仙世界NPC行为决策器。从候选行动中选出最合理的一个。候选行动：【${poolDesc}】`;

interface Variant { id: string; tag: string; trait: string; personality: string; narrative: string }

const variants: Variant[] = [
  { id: 'A-原始(仰慕者+内敛+心软)', tag: '仰慕者', trait: '心软易动摇', personality: '内敛沉默', narrative: '周磊暗慕苏瑶已久，虽从未表白却一往情深。' },
  { id: 'B-换tag(倾心之人)', tag: '倾心之人', trait: '心软易动摇', personality: '内敛沉默', narrative: '周磊暗慕苏瑶已久，虽从未表白却一往情深。' },
  { id: 'C-去trait', tag: '仰慕者', trait: '', personality: '内敛沉默', narrative: '周磊暗慕苏瑶已久，虽从未表白却一往情深。' },
  { id: 'D-换性格(温和坚毅)', tag: '仰慕者', trait: '', personality: '温和坚毅', narrative: '周磊暗慕苏瑶已久，虽从未表白却一往情深。' },
  { id: 'E-全换(倾心+坚毅+叙事)', tag: '倾心之人', trait: '', personality: '温和坚毅', narrative: '周磊对苏瑶情根深种，愿为她赴汤蹈火在所不惜。' },
];

async function main() {
  console.log(`ActionPool: [${poolCodes.join(', ')}]`);
  console.log(`系统提示: ${sys.substring(0, 40)}...`);
  console.log('');

  for (const v of variants) {
    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      const usr = [
        '【事件】宗门遭妖兽来袭，波及苏瑶',
        `【角色】周磊 | 性格：${v.personality}${v.trait ? ' | 特点：' + v.trait : ''}`,
        '【宗门】宗门风气中正平和',
        `【与苏瑶的关系】`,
        `好感：55（${v.tag}）`,
        '关键经历：偷偷送灵药助她突破(+20)；远远看她练剑心生好感(+20)',
        v.narrative,
      ].join('\n');
      const action = await call(sys, usr, poolCodes);
      results.push(action);
    }
    const dist: Record<string, number> = {};
    results.forEach(a => dist[a] = (dist[a]||0)+1);
    const distStr = Object.entries(dist).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}=${v}`).join(' ');
    const pf = results.filter(a => a==='PROTECT'||a==='FIGHT').length;
    console.log(`${v.id}: ${distStr} | PF=${pf}/5`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
