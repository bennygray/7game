/**
 * PoC-2c: 混合决策池验证（修正版）
 *
 * 核心修正：
 *   Gemini 的 poc-2a/2b 失败的根本原因不是 0.8B 模型能力不足，
 *   而是用了错误的 API 端点（/completion 裸文本补全）和错误的格式约束方式（正则提取）。
 *
 *   之前成功的 poc-1c（90%准确率）使用的关键技术是：
 *   1. /v1/chat/completions 端点（Chat API）
 *   2. response_format.json_schema 约束（让模型在底层被强制只能输出 schema 允许的值）
 *   3. emotion 字段的 enum 直接锁死为候选池
 *
 *   本脚本将同样的技术应用到"行为决策池"场景，验证 0.8B 是否能做到
 *   "结构化输入 → 格式化选择题 → 输出对应的独白"。
 *
 * 运行：npx tsx scripts/poc-2c-hybrid-decision.ts
 */

import { request as httpRequest } from 'node:http';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ===== Logger =====
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
const logBuffer: Array<{ ts: number; level: LogLevel; msg: string; data?: Record<string, unknown> }> = [];

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const ts = Date.now();
  logBuffer.push({ ts, level, msg, data });
  const t = new Date(ts).toLocaleTimeString('zh-CN');
  const d = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${t}][${level}] ${msg}${d}`);
}

function saveLogs(name: string) {
  const dir = join(process.cwd(), 'logs');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  const lines = logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  });
  writeFileSync(p + '.txt', lines.join('\n\n'), 'utf8');
  writeFileSync(p + '.json', JSON.stringify(logBuffer, null, 2), 'utf8');
  log('INFO', `📄 日志已保存: ${p}.txt / .json`);
}

// ===== 类型定义 =====

interface ActionOption {
  code: string;        // 英文动作码，如 ATTACK, FLEE
  label: string;       // 中文标签，如 "拔剑攻击"
}

interface TestCase {
  id: string;
  /** 事件的自然语言描述 */
  event: string;
  /** 反应者的结构化信息 */
  subject: {
    name: string;
    personality: string;
    mood: string;
    rank: string;
    realm: string;
    physicalState: string;
  };
  /** 涉及人物 */
  involved: Array<{
    name: string;
    relationship: string;
    rank: string;
    realm: string;
  }>;
  /** 引擎提供的合法行动候选池 */
  actionPool: ActionOption[];
  /** 预期合理的选择（code 列表） */
  expectedActions: string[];
}

// ===== 测试场景 =====

const TESTS: TestCase[] = [
  {
    id: 'S01', event: '你在秘境中合力击杀妖兽爆出一件极品灵器，但被队友李墨染趁机一把抢走塞入怀中。',
    subject: { name: '张清风', personality: '刚烈正直，嫉恶如仇', mood: '愤怒', rank: '内门弟子', realm: '筑基二层', physicalState: '健康' },
    involved: [{ name: '李墨染', relationship: '仇敌(好感-30)', rank: '内门弟子', realm: '炼气四层' }],
    actionPool: [
      { code: 'ATTACK', label: '拔剑攻击抢回灵器' },
      { code: 'ARGUE', label: '厉声质问要求平分' },
      { code: 'IGNORE', label: '忍气吞声不作理会' },
      { code: 'FLEE', label: '害怕报复立刻逃跑' },
    ],
    expectedActions: ['ATTACK', 'ARGUE'],
  },
  {
    id: 'S02', event: '你在秘境中合力击杀妖兽爆出一件极品灵器，但被路过的金丹前辈一把抢走。',
    subject: { name: '苏瑶', personality: '胆小懦弱，极度谨慎', mood: '极度恐惧', rank: '内门弟子', realm: '炼气九层', physicalState: '健康' },
    involved: [{ name: '金丹前辈', relationship: '陌生(好感0)', rank: '散修', realm: '金丹三层' }],
    actionPool: [
      { code: 'ATTACK', label: '拔剑攻击抢回灵器' },
      { code: 'ARGUE', label: '厉声质问要求归还' },
      { code: 'ENDURE', label: '隐忍咽下这口气' },
      { code: 'FLEE', label: '害怕被杀立刻逃跑' },
    ],
    expectedActions: ['ENDURE', 'FLEE'],
  },
  {
    id: 'S03', event: '死敌张清风突破筑基时走火入魔，重伤吐血倒地不起，周围没有任何人。',
    subject: { name: '李墨染', personality: '阴险毒辣，睚眦必报，冷血无情', mood: '狂喜', rank: '内门弟子', realm: '炼气四层', physicalState: '健康' },
    involved: [{ name: '张清风', relationship: '死敌(好感-80)', rank: '内门弟子', realm: '筑基二层' }],
    actionPool: [
      { code: 'HELP', label: '出手救治帮其稳住气息' },
      { code: 'ATTACK', label: '趁他濒死暗下杀手' },
      { code: 'IGNORE', label: '冷笑转身离开' },
      { code: 'REPORT', label: '回宗门报告长老' },
    ],
    expectedActions: ['ATTACK', 'IGNORE'],
  },
  {
    id: 'S04', event: '死敌张清风突破筑基时走火入魔，重伤吐血倒地不起，周围没有任何人。',
    subject: { name: '陈明月', personality: '至善至美，医者仁心，不记仇恨', mood: '担忧恐慌', rank: '内门弟子', realm: '筑基一层', physicalState: '健康' },
    involved: [{ name: '张清风', relationship: '至交好友(好感80)', rank: '内门弟子', realm: '筑基二层' }],
    actionPool: [
      { code: 'HELP', label: '出手救治帮其稳住气息' },
      { code: 'ATTACK', label: '趁他濒死暗下杀手' },
      { code: 'IGNORE', label: '冷笑转身离开' },
      { code: 'REPORT', label: '回宗门报告长老' },
    ],
    expectedActions: ['HELP', 'REPORT'],
  },
  {
    id: 'S05', event: '金丹长老赵铁柱要强行抓走你心爱的双修道侣苏瑶去试致命毒药，你只是卑微的炼气期。',
    subject: { name: '狂浪生', personality: '绝世情种，刚烈如火，宁折不弯', mood: '绝望与暴怒', rank: '外门弟子', realm: '炼气三层', physicalState: '健康' },
    involved: [
      { name: '赵铁柱', relationship: '宗门长老(好感10)', rank: '长老', realm: '金丹巅峰' },
      { name: '苏瑶', relationship: '双修道侣(好感100)', rank: '外门弟子', realm: '炼气五层' },
    ],
    actionPool: [
      { code: 'BEG', label: '跪地哀求长老放人' },
      { code: 'SUBSTITUTE', label: '挺身要求替苏瑶试毒' },
      { code: 'ATTACK', label: '拔剑拼死保护道侣' },
      { code: 'ACCEPT', label: '沉默接受保全自己' },
    ],
    expectedActions: ['SUBSTITUTE', 'ATTACK'],
  },
  {
    id: 'S06', event: '金丹长老赵铁柱要强行抓走你心爱的双修道侣苏瑶去试致命毒药，你只是卑微的炼气期。',
    subject: { name: '乌龟老祖', personality: '极度自私，贪生怕死，趋利避害', mood: '极度恐惧', rank: '外门弟子', realm: '炼气三层', physicalState: '健康' },
    involved: [
      { name: '赵铁柱', relationship: '宗门长老(好感10)', rank: '长老', realm: '金丹巅峰' },
      { name: '苏瑶', relationship: '双修道侣(好感100)', rank: '外门弟子', realm: '炼气五层' },
    ],
    actionPool: [
      { code: 'BEG', label: '跪地哀求长老放人' },
      { code: 'SUBSTITUTE', label: '挺身要求替苏瑶试毒' },
      { code: 'ATTACK', label: '拔剑拼死保护道侣' },
      { code: 'ACCEPT', label: '沉默接受保全自己' },
    ],
    expectedActions: ['BEG', 'ACCEPT'],
  },
];

// ===== Prompt 构建 =====

function buildPrompt(tc: TestCase): { system: string; user: string } {
  const actionListDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(' / ');

  const system =
    `你是修仙世界NPC行为决策器。判断【${tc.subject.name}】面对事件时最可能采取的行动。\n\n` +
    `综合考虑：性格、当前情绪、与涉事人物关系、实力差距、身体状态。\n\n` +
    `输出JSON：\n` +
    `- action: 从以下候选中选择最合理的一个：【${actionListDesc}】\n` +
    `- confidence: 1犹豫 2果断 3坚定\n` +
    `- innerThought: ${tc.subject.name}此刻的内心独白，80字以内，要体现性格特征`;

  const involvedDesc = tc.involved.map(p =>
    `  · ${p.name}：${p.rank}，${p.realm}，关系=【${p.relationship}】`
  ).join('\n');

  const user =
    `【事件】${tc.event}\n\n` +
    `【反应者】${tc.subject.name}\n` +
    `  性格：${tc.subject.personality}\n` +
    `  情绪：${tc.subject.mood} | 身份：${tc.subject.rank} | 境界：${tc.subject.realm}\n` +
    `  身体：${tc.subject.physicalState}\n\n` +
    `【涉及人物】\n${involvedDesc}`;

  return { system, user };
}

// ===== JSON Schema 构建（关键！用 enum 锁死行动选项） =====

function buildSchema(tc: TestCase) {
  const actionCodes = tc.actionPool.map(a => a.code);
  return {
    type: 'object' as const,
    properties: {
      action: { type: 'string' as const, enum: actionCodes },
      confidence: { type: 'integer' as const, enum: [1, 2, 3] },
      innerThought: { type: 'string' as const, maxLength: 200 },
    },
    required: ['action', 'confidence', 'innerThought'] as const,
  };
}

// ===== LLM 调用（使用 /v1/chat/completions + json_schema，与 poc-1c 完全一致） =====

function callLlama(system: string, user: string, schema: ReturnType<typeof buildSchema>): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const payload = JSON.stringify({
      model: 'qwen3.5',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 300,
      temperature: 0.6,
      top_p: 0.9,
      chat_template_kwargs: { enable_thinking: false },
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'action_decision', strict: true, schema },
      },
    });
    const req = httpRequest({
      hostname: '127.0.0.1', port: 8080, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', (c: Buffer) => { body += c.toString(); });
      res.on('end', () => {
        const latencyMs = Date.now() - start;
        try {
          const data = JSON.parse(body);
          const content = (data?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          let parsed: Record<string, unknown> | null = null;
          try { parsed = JSON.parse(content); } catch { /* */ }
          resolve({ parsed, latencyMs });
        } catch { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

// ===== 主流程 =====

async function run() {
  log('INFO', '═══════════════ PoC-2c: 混合决策池验证（修正版） ═══════════════');
  log('INFO', '策略: 结构化输入 + JSON Schema enum 锁死行动候选 + Chat API');
  log('INFO', '模型: Qwen3.5-0.8B | 场景: 6 (3组对照)');

  // Health check
  try {
    const h = await callLlama('test', 'hi', buildSchema(TESTS[0]));
    log('INFO', `llama-server 在线 (${h.latencyMs}ms)`);
  } catch (err) {
    log('ERROR', `llama-server 不可用`, { error: String(err) });
    process.exit(1);
  }

  const stats = {
    total: 0, actionOk: 0, latencies: [] as number[],
    failures: [] as Array<{ id: string; subject: string; got: string; expected: string[] }>,
  };

  for (const tc of TESTS) {
    stats.total++;
    const { system, user } = buildPrompt(tc);
    const schema = buildSchema(tc);

    const relDesc = tc.involved.map(i => `${i.name}(${i.relationship})`).join(' + ');
    const poolDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(', ');

    log('INFO', `━━━ ${tc.id} ━━━`);
    log('INFO', `事件: ${tc.event}`);
    log('INFO', `反应者: ${tc.subject.name} (${tc.subject.personality}) | ${tc.subject.mood}`);
    log('INFO', `涉及: ${relDesc}`);
    log('INFO', `候选池(${tc.actionPool.length}): ${poolDesc}`);

    try {
      const { parsed, latencyMs } = await callLlama(system, user, schema);
      stats.latencies.push(latencyMs);

      if (!parsed) {
        log('ERROR', `${tc.id} JSON 解析失败`);
        continue;
      }

      const action = parsed.action as string;
      const confidence = parsed.confidence as number;
      const thought = parsed.innerThought as string;

      const actionOk = tc.expectedActions.includes(action);
      if (actionOk) stats.actionOk++;

      const icon = actionOk ? '✅' : '❌';
      const actionLabel = tc.actionPool.find(a => a.code === action)?.label ?? action;

      log('INFO', `AI → ${icon} ${action}(${actionLabel}) 决心=${confidence} | ${latencyMs}ms`);
      log('INFO', `  独白:「${thought}」`);

      if (!actionOk) {
        stats.failures.push({ id: tc.id, subject: tc.subject.name, got: action, expected: tc.expectedActions });
        log('WARN', `${tc.id} 行为不匹配: 输出=${action} 期望=${tc.expectedActions.join('/')}`);
      }
    } catch (err) {
      log('ERROR', `${tc.id} 调用失败: ${err}`);
    }
  }

  // ===== 汇总 =====
  log('INFO', '');
  log('INFO', '═══════════════════════════════════════════════════');
  log('INFO', '           PoC-2c 汇总报告（混合决策池·修正版）');
  log('INFO', '═══════════════════════════════════════════════════');

  const n = stats.total;
  const lats = stats.latencies.sort((a, b) => a - b);
  const avg = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
  const p95 = lats[Math.floor(lats.length * 0.95)];

  log('INFO', `行为决策合理度:  ${stats.actionOk}/${n} (${Math.round(stats.actionOk / n * 100)}%)  ${stats.actionOk / n >= 0.7 ? '✅' : '❌'}`);
  log('INFO', `延迟: avg=${avg}ms P95=${p95}ms  ${p95 <= 3000 ? '✅' : '❌'}`);

  log('INFO', '');
  log('INFO', '--- 对比 ---');
  log('INFO', `Gemini poc-2a (/completion + 正则):  格式 17% | 逻辑 17%`);
  log('INFO', `Gemini poc-2b (/completion + FewShot): 格式 ~80% | 逻辑 25%`);
  log('INFO', `本次 poc-2c (Chat API + JSON Schema): 逻辑 ${Math.round(stats.actionOk / n * 100)}%`);

  if (stats.failures.length > 0) {
    log('INFO', '');
    log('INFO', '--- 失败案例 ---');
    for (const f of stats.failures) {
      log('WARN', `  ${f.id} ${f.subject}: 输出=${f.got} 期望=[${f.expected.join(',')}]`);
    }
  }

  const pass = stats.actionOk / n >= 0.7 && p95 <= 3000;
  log(pass ? 'INFO' : 'WARN', `\n总体判定: ${pass ? '✅ PoC-2c PASSED' : '❌ PoC-2c FAILED'}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  saveLogs(`poc-2c-hybrid-${ts}`);

  process.exit(pass ? 0 : 1);
}

run().catch(err => { log('ERROR', `异常: ${err}`); process.exit(1); });
