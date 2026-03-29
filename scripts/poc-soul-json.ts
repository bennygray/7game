/**
 * PoC-1: AI 结构化 JSON 输出能力验证
 *
 * 目标：验证 Qwen3.5-0.8B 能否通过 llama-server 的 response_format
 *       稳定输出结构化 SoulEvaluationResult JSON
 *
 * 前置条件：npm run ai 已启动（llama-server :8080 在线）
 *
 * 运行：npx tsx scripts/poc-soul-json.ts
 *
 * @see docs/pipeline/phaseE/spm-analysis.md PoC-1
 */

import { request as httpRequest } from 'node:http';

// ===== 类型定义 =====

type EmotionTag = 'joy' | 'anger' | 'envy' | 'admiration'
  | 'sadness' | 'fear' | 'contempt' | 'neutral';

interface SoulEvaluationResult {
  emotion: EmotionTag;
  intensity: 1 | 2 | 3;
  relationshipDeltas: Array<{
    targetId: string;
    delta: number;
    reason: string;
  }>;
  innerThought: string;
}

// ===== JSON Schema for llama-server =====

const SOUL_EVAL_SCHEMA = {
  type: 'object' as const,
  properties: {
    emotion: {
      type: 'string' as const,
      enum: ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear', 'contempt', 'neutral'],
    },
    intensity: {
      type: 'integer' as const,
      enum: [1, 2, 3],
    },
    relationshipDeltas: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          targetId: { type: 'string' as const },
          delta: { type: 'integer' as const, minimum: -10, maximum: 10 },
          reason: { type: 'string' as const },
        },
        required: ['targetId', 'delta', 'reason'],
      },
      maxItems: 3,
    },
    innerThought: { type: 'string' as const, maxLength: 100 },
  },
  required: ['emotion', 'intensity', 'relationshipDeltas', 'innerThought'],
};

// ===== 测试场景 =====

interface TestCase {
  id: string;
  event: string;
  subject: { name: string; personality: string; moralHint: string };
  involved: string[];
}

const TEST_CASES: TestCase[] = [
  // === 正面事件 ===
  {
    id: 'T01', event: '陈明月炼丹成功，炼出了一颗上品回灵丹',
    subject: { name: '张清风', personality: '刚烈正直', moralHint: '善良正道' },
    involved: ['陈明月'],
  },
  {
    id: 'T02', event: '陈明月炼丹成功，炼出了一颗上品回灵丹',
    subject: { name: '李墨染', personality: '狡黠贪婪', moralHint: '邪道自私' },
    involved: ['陈明月'],
  },
  {
    id: 'T03', event: '周星河突破到炼气七层，实力大增',
    subject: { name: '苏瑶', personality: '温和善良', moralHint: '善良中立' },
    involved: ['周星河'],
  },
  // === 负面事件 ===
  {
    id: 'T04', event: '赵铁柱偷吃了门派的灵丹，被掌门发现',
    subject: { name: '张清风', personality: '刚烈正直', moralHint: '善良正道' },
    involved: ['赵铁柱'],
  },
  {
    id: 'T05', event: '赵铁柱偷吃了门派的灵丹，被掌门发现',
    subject: { name: '林小燕', personality: '散漫随意', moralHint: '中立偏邪' },
    involved: ['赵铁柱'],
  },
  // === 冲突事件 ===
  {
    id: 'T06', event: '张清风和李墨染因为争夺灵田使用权发生争吵',
    subject: { name: '苏瑶', personality: '温和善良', moralHint: '善良中立' },
    involved: ['张清风', '李墨染'],
  },
  {
    id: 'T07', event: '张清风和李墨染因为争夺灵田使用权发生争吵',
    subject: { name: '赵铁柱', personality: '孤傲冷淡', moralHint: '中立偏正' },
    involved: ['张清风', '李墨染'],
  },
  // === 修炼瓶颈 ===
  {
    id: 'T08', event: '苏瑶修炼遇到瓶颈，连续三天没有进展',
    subject: { name: '陈明月', personality: '机敏好学', moralHint: '善良中立' },
    involved: ['苏瑶'],
  },
  // === 偷懒 ===
  {
    id: 'T09', event: '林小燕又在偷懒，在灵田边睡觉，灵草都快干枯了',
    subject: { name: '张清风', personality: '刚烈正直', moralHint: '善良正道' },
    involved: ['林小燕'],
  },
  {
    id: 'T10', event: '林小燕又在偷懒，在灵田边睡觉，灵草都快干枯了',
    subject: { name: '李墨染', personality: '狡黠贪婪', moralHint: '邪道自私' },
    involved: ['林小燕'],
  },
];

// ===== llama-server 调用 =====

function callLlamaServerJSON(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ raw: string; parsed: unknown; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const payload = JSON.stringify({
      model: 'qwen3.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
      top_p: 0.9,
      chat_template_kwargs: { enable_thinking: false },
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'soul_evaluation',
          strict: true,
          schema: SOUL_EVAL_SCHEMA,
        },
      },
    });

    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port: 8080,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 30000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          const latencyMs = Date.now() - start;
          try {
            const data = JSON.parse(body);
            const content = data?.choices?.[0]?.message?.content ?? '';
            // 清除可能的 <think> 标签
            const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            let parsed: unknown = null;
            try { parsed = JSON.parse(cleaned); } catch { /* leave null */ }
            resolve({ raw: cleaned, parsed, latencyMs });
          } catch {
            reject(new Error(`Response parse error: ${body.substring(0, 200)}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout (30s)')); });
    req.write(payload);
    req.end();
  });
}

// ===== 评估函数 =====

function buildPrompt(tc: TestCase): { system: string; user: string } {
  const system =
    `你是一个NPC灵魂评估器。给定一个事件和一个NPC的性格档案，` +
    `你需要输出该NPC对这件事的内心反应。\n\n` +
    `输出格式为 JSON，包含以下字段：\n` +
    `- emotion: 情绪标签，必须是以下之一: joy, anger, envy, admiration, sadness, fear, contempt, neutral\n` +
    `- intensity: 情绪强度 1(微弱) 2(中等) 3(强烈)\n` +
    `- relationshipDeltas: 对涉及人物的好感变化数组，每项含 targetId(人名), delta(-10到+10), reason(原因)\n` +
    `- innerThought: 该NPC的内心独白，用中文，最多50字\n\n` +
    `注意：你的输出必须基于NPC的性格和道德倾向，不同性格的NPC对同一事件应有不同反应。`;

  const user =
    `【事件】${tc.event}\n` +
    `【反应者】${tc.subject.name}（性格：${tc.subject.personality}，道德：${tc.subject.moralHint}）\n` +
    `【涉及人物】${tc.involved.join('、')}`;

  return { system, user };
}

const VALID_EMOTIONS = new Set<string>(
  ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear', 'contempt', 'neutral']
);

interface TestResult {
  id: string;
  jsonValid: boolean;
  schemaValid: boolean;
  emotionReasonable: boolean;
  latencyMs: number;
  emotion?: string;
  intensity?: number;
  innerThought?: string;
  error?: string;
}

function validateResult(tc: TestCase, parsed: unknown): { schemaValid: boolean; emotionReasonable: boolean } {
  if (!parsed || typeof parsed !== 'object') return { schemaValid: false, emotionReasonable: false };

  const r = parsed as Record<string, unknown>;

  // Schema validation
  const hasEmotion = typeof r.emotion === 'string' && VALID_EMOTIONS.has(r.emotion);
  const hasIntensity = typeof r.intensity === 'number' && [1, 2, 3].includes(r.intensity);
  const hasDeltas = Array.isArray(r.relationshipDeltas);
  const hasThought = typeof r.innerThought === 'string' && r.innerThought.length > 0;
  const schemaValid = hasEmotion && hasIntensity && hasDeltas && hasThought;

  // Emotion reasonableness (简单规则判断)
  let emotionReasonable = true;
  if (hasEmotion) {
    const emotion = r.emotion as string;
    // 正面事件应该不出现 anger/contempt
    if (tc.id === 'T01' || tc.id === 'T02' || tc.id === 'T03') {
      if (tc.subject.moralHint.includes('善') && emotion === 'contempt') emotionReasonable = false;
    }
    // 偷吃灵丹：正直应不是 joy
    if (tc.id === 'T04' && tc.subject.personality.includes('正直') && emotion === 'joy') {
      emotionReasonable = false;
    }
  }

  return { schemaValid, emotionReasonable };
}

// ===== 主执行 =====

async function runPoC() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   PoC-1: AI 结构化 JSON 输出能力验证                      ║');
  console.log('║   模型: Qwen3.5-0.8B | 方式: response_format json_schema  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  // 先检查 llama-server 可用性
  try {
    const healthCheck = await callLlamaServerJSON(
      'You are a helpful assistant.',
      'Say "hello" in JSON format: {"greeting": "hello"}',
    );
    console.log(`[预检] llama-server 在线 (${healthCheck.latencyMs}ms)`);
  } catch (err) {
    console.error('[预检失败] llama-server 不可用。请确认 npm run ai 已启动。');
    console.error(err);
    process.exit(1);
  }

  console.log(`\n开始测试 ${TEST_CASES.length} 个场景...\n`);

  const results: TestResult[] = [];

  for (const tc of TEST_CASES) {
    const { system, user } = buildPrompt(tc);
    process.stdout.write(`[${tc.id}] ${tc.subject.name} → ${tc.event.substring(0, 20)}...  `);

    try {
      const { raw, parsed, latencyMs } = await callLlamaServerJSON(system, user);
      const jsonValid = parsed !== null;
      const { schemaValid, emotionReasonable } = jsonValid
        ? validateResult(tc, parsed)
        : { schemaValid: false, emotionReasonable: false };

      const p = parsed as SoulEvaluationResult | null;

      results.push({
        id: tc.id,
        jsonValid,
        schemaValid,
        emotionReasonable,
        latencyMs,
        emotion: p?.emotion,
        intensity: p?.intensity,
        innerThought: p?.innerThought,
      });

      const status = schemaValid ? '✅' : jsonValid ? '⚠️ schema不完整' : '❌ JSON解析失败';
      console.log(
        `${status} | ${latencyMs}ms | emotion=${p?.emotion ?? 'N/A'} ` +
        `intensity=${p?.intensity ?? 'N/A'} | ${(p?.innerThought ?? raw).substring(0, 40)}...`
      );
    } catch (err) {
      results.push({
        id: tc.id, jsonValid: false, schemaValid: false, emotionReasonable: false,
        latencyMs: -1, error: String(err),
      });
      console.log(`❌ 错误: ${String(err).substring(0, 80)}`);
    }
  }

  // ===== 汇总报告 =====
  console.log('\n════════════════════════════════════════');
  console.log('            PoC-1 测试报告');
  console.log('════════════════════════════════════════\n');

  const total = results.length;
  const jsonValidCount = results.filter(r => r.jsonValid).length;
  const schemaValidCount = results.filter(r => r.schemaValid).length;
  const emotionOkCount = results.filter(r => r.emotionReasonable).length;
  const latencies = results.filter(r => r.latencyMs > 0).map(r => r.latencyMs);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const p95Latency = latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;

  console.log(`| 指标                  | 结果         | 通过标准       | 状态 |`);
  console.log(`|-----------------------|-------------|---------------|------|`);
  console.log(`| JSON 格式正确率       | ${jsonValidCount}/${total} (${Math.round(jsonValidCount/total*100)}%) | ≥80%         | ${jsonValidCount/total >= 0.8 ? '✅' : '❌'} |`);
  console.log(`| Schema 完整率         | ${schemaValidCount}/${total} (${Math.round(schemaValidCount/total*100)}%) | ≥80%         | ${schemaValidCount/total >= 0.8 ? '✅' : '❌'} |`);
  console.log(`| 情绪匹配合理度        | ${emotionOkCount}/${total} (${Math.round(emotionOkCount/total*100)}%) | ≥70%         | ${emotionOkCount/total >= 0.7 ? '✅' : '❌'} |`);
  console.log(`| 平均延迟              | ${avgLatency}ms     | —             | — |`);
  console.log(`| P95 延迟              | ${p95Latency}ms     | ≤3000ms       | ${p95Latency <= 3000 ? '✅' : '❌'} |`);

  const allPass = jsonValidCount/total >= 0.8 && schemaValidCount/total >= 0.8
    && emotionOkCount/total >= 0.7 && p95Latency <= 3000;

  console.log(`\n总体判定: ${allPass ? '✅ PoC-1 PASSED' : '❌ PoC-1 FAILED'}`);

  if (!allPass) {
    console.log('\n降级路径:');
    if (jsonValidCount/total < 0.8) console.log('  → JSON 输出不稳定，建议切换 4B 模型重测');
    if (p95Latency > 3000) console.log('  → 延迟过高，可能需要 GPU 加速或减少输出长度');
    if (emotionOkCount/total < 0.7) console.log('  → 情绪匹配差，需优化 prompt 或升级模型');
  }

  // Detail dump
  console.log('\n————————————————————————————————————————');
  console.log('详细结果:');
  for (const r of results) {
    console.log(`  ${r.id}: json=${r.jsonValid ? '✓' : '✗'} schema=${r.schemaValid ? '✓' : '✗'} ` +
      `emotion=${r.emotionReasonable ? '✓' : '✗'} ${r.latencyMs}ms | ${r.emotion ?? 'ERR'} | ${r.innerThought?.substring(0, 30) ?? r.error?.substring(0, 30) ?? ''}`);
  }

  process.exit(allPass ? 0 : 1);
}

runPoC().catch(err => {
  console.error('PoC-1 执行异常:', err);
  process.exit(1);
});
