/**
 * AI 并发压力测试 — 测试 AI 推理服务的并发处理能力
 *
 * 用法：npx tsx server/tests/ai-stress-test.ts
 * 前提：npm run ai 已在运行
 *
 * 测试内容：
 *   - 从 1 个弟子逐级增加到 128 个弟子的并发请求
 *   - 记录成功率、总耗时、平均/最快/最慢响应时间、吞吐量
 *
 * @see Story #5 — AI 灵智推理
 */

const SURNAMES = ['周','赵','吴','李','陈','王','张','刘','孙','林','杨','韩','萧','沈','秦','唐','方','苏','许','何','谢','邓','马','高','罗','宋','冯','郑','彭','潘','魏','蒋','于','叶','段','雷','黄','姜','涂','曹'];
const NAMES = ['星河','天华','云烟','灵犀','清风','月华','天明','灵儿','云飞','小雨','风雷','紫烟','冰心','逸尘','月明','雨落','长空','碧落','青莲','玄冥','无极','太虚','清玄','映雪','凌霜','流云','寒江','破晓','如意','听风','踏雪','飞花','落尘','归元','问道','悟真','凝霜','化蝶','望月','惊鸿'];
const PERSONALITIES = ['散漫','狡黠','刚毅','温柔','活泼','冷静','暴躁','沉稳'];
const BEHAVIORS = ['meditate','explore','rest','alchemy','farm','bounty'];

const API_BASE = process.env.AI_API_URL ?? 'http://localhost:3001';
const LEVELS = (process.env.LEVELS ?? '1,2,4,8,16,32,64,128').split(',').map(Number);

function genDisciples(n: number) {
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push({
      name: SURNAMES[i % SURNAMES.length] + NAMES[i % NAMES.length],
      personalityName: PERSONALITIES[i % PERSONALITIES.length],
      behavior: BEHAVIORS[i % BEHAVIORS.length],
    });
  }
  return list;
}

async function sendOne(d: { name: string; personalityName: string; behavior: string }): Promise<{ name: string; line: string; ms: number; ok: boolean }> {
  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE}/api/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discipleName: d.name,
        personalityName: d.personalityName,
        personality: { lazy: 0.8, kind: 0.5 },
        behavior: d.behavior,
        shortTermMemory: [],
      }),
    });
    const data = await res.json() as { line: string };
    return { name: d.name, line: data.line, ms: Date.now() - start, ok: true };
  } catch (e) {
    return { name: d.name, line: `ERROR: ${e}`, ms: Date.now() - start, ok: false };
  }
}

async function testBatch(count: number, verbose = false) {
  const batch = genDisciples(count);
  const batchStart = Date.now();
  const results = await Promise.all(batch.map(d => sendOne(d)));
  const totalMs = Date.now() - batchStart;

  const okCount = results.filter(r => r.ok).length;
  const failCount = count - okCount;
  const times = results.filter(r => r.ok).map(r => r.ms);
  const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const maxMs = times.length ? Math.max(...times) : 0;
  const minMs = times.length ? Math.min(...times) : 0;
  const throughput = (okCount / (totalMs / 1000)).toFixed(1);

  if (verbose) {
    for (const r of results) {
      const status = r.ok ? '✅' : '❌';
      const line = r.line.length > 30 ? r.line.substring(0, 30) + '...' : r.line;
      console.log(`  ${status} ${r.name.padEnd(6)} ${String(r.ms).padStart(5)}ms → "${line}"`);
    }
  }

  const failStr = failCount > 0 ? ` ❌${failCount}失败` : '';
  console.log(
    `  ${String(count).padStart(4)} 弟子 | ✅${String(okCount).padStart(3)}${failStr.padEnd(8)} | ` +
    `总耗时 ${String(totalMs + 'ms').padStart(8)} | ` +
    `平均 ${String(avgMs + 'ms').padStart(7)} | ` +
    `最快 ${String(minMs + 'ms').padStart(6)} | ` +
    `最慢 ${String(maxMs + 'ms').padStart(7)} | ` +
    `${throughput.padStart(5)} 条/秒`
  );

  return { count, okCount, failCount, totalMs, avgMs, maxMs, minMs, throughput };
}

async function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AI 推理并发压力测试                                       ║');
  console.log(`║  API: ${API_BASE.padEnd(53)}║`);
  console.log(`║  梯级: ${LEVELS.join(', ').padEnd(52)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // 健康检查
  try {
    const health = await fetch(`${API_BASE}/api/health`);
    const data = await health.json() as { model: string; modelReady: boolean };
    console.log(`\n🔍 模型: ${data.model} | 状态: ${data.modelReady ? '✅ 就绪' : '⚠️ 占位模式'}\n`);
  } catch {
    console.error('❌ AI 服务未启动！请先运行 npm run ai');
    process.exit(1);
  }

  // 热身
  console.log('🔥 热身...');
  await sendOne({ name: '测试', personalityName: '散漫', behavior: 'rest' });
  await sendOne({ name: '测试', personalityName: '散漫', behavior: 'rest' });
  console.log('   热身完成\n');

  console.log('弟子数  | 结果              | 总耗时     | 平均      | 最快     | 最慢      | 吞吐量');
  console.log('--------|-------------------|------------|-----------|----------|-----------|--------');

  for (const n of LEVELS) {
    await testBatch(n, verbose);
  }

  console.log('\n📊 测试完成！');
}

main();
