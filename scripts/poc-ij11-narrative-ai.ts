/**
 * IJ-11 PoC: Narrative Snippet AI 预生成 — 严格验证
 *
 * 验证假设:
 *   A-5: 规则拼接叙事质量是否足以打破 PROTECT bias
 *   A-6: AI 预生成延迟 P95 ≤ 2000ms
 *
 * 评估维度（每个 snippet 独立评分）:
 *   D1 格式合规: ≤80字符、非空、中文为主
 *   D2 情感极性: 正面/负面/中性 与输入一致
 *   D3 事实忠诚: 不虚构输入中不存在的具体事件
 *   D4 人名准确: 必须包含角色A和B的名字（至少一个）
 *   D5 文风合规: 包含仙侠特征词（至少1个）
 *   D6 判定强度: 负面场景应包含负面判定词（rival/grudge场景）
 *
 * 输出:
 *   - 详细日志（含完整 prompt 输入/输出）→ .txt
 *   - 结构化数据（所有评分矩阵）→ .json
 *   - 人可读报告 → .md
 *
 * 运行: npx tsx scripts/poc-ij11-narrative-ai.ts
 * 前置: ai-server 需在 localhost:3001 运行（Qwen3.5-2B）
 */

import { NarrativeSnippetBuilder } from '../src/ai/narrative-snippet-builder';
import { NARRATIVE_SNIPPET_MAX_CHARS } from '../src/shared/types/relationship-memory';
import type { RelationshipMemory } from '../src/shared/types/relationship-memory';
import type { RelationshipTag } from '../src/shared/types/soul';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ===== Logger =====

interface LogEntry { ts: number; level: string; msg: string; data?: Record<string, unknown> }
const logBuffer: LogEntry[] = [];

function log(level: string, msg: string, data?: Record<string, unknown>): void {
  const ts = Date.now();
  logBuffer.push({ ts, level, msg, data });
  const t = new Date(ts).toLocaleTimeString('zh-CN');
  const d = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${t}][${level}] ${msg}${d}`);
}

// ===== 评估维度定义 =====

/** 仙侠特征词库 */
const XIANXIA_KEYWORDS = [
  '道', '仙', '修', '灵', '剑', '宗', '门', '弟子', '突破', '境界',
  '炼', '丹', '妖', '兽', '同门', '劫', '瓶颈', '功', '法', '天',
  '缘', '势', '恩', '怨', '患难', '深意', '羁绊', '芥蒂', '积怨',
  '宿怨', '隔阂', '信任', '因果', '共患难', '仇', '根基', '闭关',
];

/** 负面判定词库（PRD R-M09 归纳定性 + v2 扩展）*/
const NEGATIVE_KEYWORDS = [
  '不可信', '不可不防', '其心可诛', '势同水火', '积怨', '仇', '敌',
  '恨', '暗算', '羞辱', '翻脸', '不共戴天', '宿怨', '芥蒂', '嫌隙',
  '死敌', '断', '破裂', '决裂', '冰', '恶',
  // v2 新增：修复词库盲区
  '眼中钉', '肉中刺', '排斥', '逐出', '心结', '隔阂', '嫌',
  '忌', '恩仇', '猜忌', '反目', '不容', '水火',
];

/** 正面判定词库（v2 扩展） */
const POSITIVE_KEYWORDS = [
  '值得', '以命相托', '患难与共', '情同手足', '信任', '交情',
  '好感', '知己', '友', '善', '帮', '守护', '深意', '相依',
  '扶持', '默契', '共患难', '互助',
  // v2 新增：修复词库盲区
  '羁绊', '情谊', '护', '相扶', '共历', '深厚', '真心',
  '义行', '仗义', '相惜', '相护',
];

// ===== 测试场景定义 =====

interface TestScenario {
  id: string;
  label: string;
  /** 测试目的 */
  purpose: string;
  sourceName: string;
  targetName: string;
  memory: RelationshipMemory;
  /** 对照: 规则拼接是否也应测 */
  compareRules: boolean;
  /** 评估标准 */
  criteria: {
    expectedPolarity: 'positive' | 'negative' | 'neutral';
    /** 负面场景必须包含的判定词（至少1个） */
    requiredNegativeKeywords: boolean;
    /** 正面场景必须包含的判定词（至少1个） */
    requiredPositiveKeywords: boolean;
    /** 不应出现的事件内容（虚构检测） */
    forbiddenFabrications: string[];
    /** 必须提及的角色名（至少1个） */
    requiredNames: string[];
    /** 额外验证说明 */
    notes: string;
  };
  /** 每场景重复次数（测稳定性） */
  runs: number;
}

function makeMemory(opts: {
  sourceId: string; targetId: string;
  affinity: number; tags: RelationshipTag[];
  keyEvents: Array<{ content: string; tick: number; affinityDelta: number }>;
}): RelationshipMemory {
  return {
    ...opts,
    encounterCount: 10,
    lastEncounterTick: 300,
    dialogueCount: 5,
  };
}

const SCENARIOS: TestScenario[] = [
  {
    id: 'T1',
    label: '正面关系 (friend, affinity=70, 3事件)',
    purpose: '验证 AI 能否生成正面、友善的叙事。输入有明确的正面标签和正面事件。',
    sourceName: '王灵均', targetName: '赵铁柱',
    memory: makeMemory({
      sourceId: 'wang', targetId: 'zhao',
      affinity: 70, tags: ['friend'],
      keyEvents: [
        { content: '互相帮助突破炼气瓶颈', tick: 100, affinityDelta: 25 },
        { content: '共同抵御妖兽袭击', tick: 200, affinityDelta: 20 },
        { content: '分享珍贵丹方', tick: 300, affinityDelta: 15 },
      ],
    }),
    compareRules: true,
    criteria: {
      expectedPolarity: 'positive',
      requiredNegativeKeywords: false,
      requiredPositiveKeywords: true,
      forbiddenFabrications: ['暗算', '羞辱', '翻脸', '死敌', '仇'],
      requiredNames: ['王灵均', '赵铁柱'],
      notes: '三个正面事件均应被反映，不应出现负面叙事',
    },
    runs: 3,
  },
  {
    id: 'T2',
    label: '负面关系 (rival, affinity=-45, 3事件) — PROTECT bias 关键场景',
    purpose: '验证 AI 能否生成明确的负面判定叙事。这是打破 2B PROTECT bias 的核心场景，叙事必须清晰传达"此人不可信"。',
    sourceName: '张清风', targetName: '李沐阳',
    memory: makeMemory({
      sourceId: 'zhang', targetId: 'li',
      affinity: -45, tags: ['rival'],
      keyEvents: [
        { content: '曾被李沐阳当众羞辱', tick: 50, affinityDelta: -30 },
        { content: '因争夺破境草翻脸', tick: 150, affinityDelta: -20 },
        { content: '在灵兽山被其暗算', tick: 250, affinityDelta: -10 },
      ],
    }),
    compareRules: true,
    criteria: {
      expectedPolarity: 'negative',
      requiredNegativeKeywords: true,
      requiredPositiveKeywords: false,
      forbiddenFabrications: ['信任', '帮助', '友善', '互助'],
      requiredNames: ['张清风', '李沐阳'],
      notes: '必须包含负面判定词，不应出现正面描述。叙事应使 AI 读后倾向不救对方。',
    },
    runs: 3,
  },
  {
    id: 'T3',
    label: '中性关系 (无标签, affinity=5, 1事件)',
    purpose: '验证 AI 在低信号输入下的表现。关系淡薄时叙事应保持克制，不过度渲染。',
    sourceName: '苏瑶', targetName: '周磊',
    memory: makeMemory({
      sourceId: 'su', targetId: 'zhou',
      affinity: 5, tags: [] as RelationshipTag[],
      keyEvents: [
        { content: '在灵田旁偶遇闲聊', tick: 100, affinityDelta: 5 },
      ],
    }),
    compareRules: true,
    criteria: {
      expectedPolarity: 'neutral',
      requiredNegativeKeywords: false,
      requiredPositiveKeywords: false,
      forbiddenFabrications: ['死敌', '仇恨', '暗算', '情同手足', '生死相依'],
      requiredNames: ['苏瑶', '周磊'],
      notes: '不应有极端正面或极端负面词汇。中性叙事最难——AI 倾向加戏。',
    },
    runs: 3,
  },
  {
    id: 'T4',
    label: '高仇恨+grudge (affinity=-65, 无事件)',
    purpose: '验证 AI 在无事件但有强烈标签/好感信号时的表现。应基于好感度和标签生成叙事，不应虚构具体事件。',
    sourceName: '陈默', targetName: '刘鹤',
    memory: makeMemory({
      sourceId: 'chen', targetId: 'liu',
      affinity: -65, tags: ['grudge'] as RelationshipTag[],
      keyEvents: [],
    }),
    compareRules: true,
    criteria: {
      expectedPolarity: 'negative',
      requiredNegativeKeywords: true,
      requiredPositiveKeywords: false,
      forbiddenFabrications: [],
      requiredNames: ['陈默', '刘鹤'],
      notes: '无事件输入。AI 不应虚构具体事件（如"曾在XX翻脸"）。只应基于好感和 grudge 标签概括。',
    },
    runs: 3,
  },
];

// ===== 评估引擎 =====

interface DimensionScore {
  dimension: string;
  pass: boolean;
  detail: string;
}

interface SingleRunResult {
  scenarioId: string;
  runIndex: number;
  source: 'ai' | 'rules';
  /** 完整 prompt（仅 AI 时记录） */
  prompt?: { system: string; user: string };
  /** 原始 AI 返回 */
  rawResponse?: string;
  /** 最终 snippet */
  snippet: string | null;
  charLength: number;
  latencyMs: number;
  /** 六维评分 */
  scores: DimensionScore[];
  /** 综合通过 */
  overallPass: boolean;
}

function evaluateSnippet(
  snippet: string | null,
  scenario: TestScenario,
  source: 'ai' | 'rules',
): DimensionScore[] {
  const scores: DimensionScore[] = [];

  // D1 格式合规
  if (!snippet) {
    scores.push({ dimension: 'D1-格式合规', pass: false, detail: '输出为 null' });
    return scores; // 其余维度无法评估
  }

  const d1Pass = snippet.length > 0 && snippet.length <= NARRATIVE_SNIPPET_MAX_CHARS;
  scores.push({
    dimension: 'D1-格式合规',
    pass: d1Pass,
    detail: `${snippet.length}字${d1Pass ? '' : ' (超限或为空)'}`,
  });

  // D2 情感极性
  const hasPositive = POSITIVE_KEYWORDS.some(kw => snippet.includes(kw));
  const hasNegative = NEGATIVE_KEYWORDS.some(kw => snippet.includes(kw));
  const polarity = scenario.criteria.expectedPolarity;
  let d2Pass: boolean;
  let d2Detail: string;

  if (polarity === 'positive') {
    d2Pass = hasPositive && !hasNegative;
    d2Detail = `正面词:${hasPositive ? '有' : '无'}, 负面词:${hasNegative ? '有(不应有)' : '无'}`;
  } else if (polarity === 'negative') {
    d2Pass = hasNegative;
    d2Detail = `负面词:${hasNegative ? '有' : '无(应有)'}, 正面词:${hasPositive ? '有(需关注)' : '无'}`;
  } else {
    d2Pass = !hasNegative || !hasPositive; // 中性不应同时有极端
    d2Detail = `正面词:${hasPositive ? '有' : '无'}, 负面词:${hasNegative ? '有' : '无'}`;
  }
  scores.push({ dimension: 'D2-情感极性', pass: d2Pass, detail: d2Detail });

  // D3 事实忠诚（v2: 语境感知检测，排除否定形式如"信任已绝"）
  const NEGATION_PATTERNS = ['已绝', '已断', '不再', '无', '失去', '丧失', '全无', '殆尽', '破碎'];
  const fabrications = scenario.criteria.forbiddenFabrications.filter(f => {
    if (!snippet.includes(f)) return false;
    // 检查该词在 snippet 中是否紧跟否定词（如 "信任已绝" → 不算虚构）
    const idx = snippet.indexOf(f);
    const after = snippet.substring(idx + f.length, idx + f.length + 3);
    const before = snippet.substring(Math.max(0, idx - 3), idx);
    const isNegated = NEGATION_PATTERNS.some(neg => after.includes(neg) || before.includes(neg));
    return !isNegated;
  });
  scores.push({
    dimension: 'D3-事实忠诚',
    pass: fabrications.length === 0,
    detail: fabrications.length === 0 ? '无虚构检出' : `虚构检出: [${fabrications.join(', ')}]`,
  });

  // D4 人名准确
  const nameHits = scenario.criteria.requiredNames.filter(n => snippet.includes(n));
  const d4Pass = nameHits.length >= 1;
  scores.push({
    dimension: 'D4-人名准确',
    pass: d4Pass,
    detail: `命中${nameHits.length}/${scenario.criteria.requiredNames.length}: [${nameHits.join(', ')}]`,
  });

  // D5 文风合规（仙侠特征词）
  const xianxiaHits = XIANXIA_KEYWORDS.filter(kw => snippet.includes(kw));
  const d5Pass = xianxiaHits.length >= 1;
  scores.push({
    dimension: 'D5-文风合规',
    pass: d5Pass,
    detail: `仙侠词${xianxiaHits.length}个: [${xianxiaHits.slice(0, 5).join(', ')}${xianxiaHits.length > 5 ? '...' : ''}]`,
  });

  // D6 判定强度（仅负面场景要求）
  if (scenario.criteria.requiredNegativeKeywords) {
    const negHits = NEGATIVE_KEYWORDS.filter(kw => snippet.includes(kw));
    scores.push({
      dimension: 'D6-判定强度',
      pass: negHits.length >= 1,
      detail: `负面判定词${negHits.length}个: [${negHits.join(', ')}]`,
    });
  } else if (scenario.criteria.requiredPositiveKeywords) {
    const posHits = POSITIVE_KEYWORDS.filter(kw => snippet.includes(kw));
    scores.push({
      dimension: 'D6-判定强度',
      pass: posHits.length >= 1,
      detail: `正面判定词${posHits.length}个: [${posHits.join(', ')}]`,
    });
  } else {
    scores.push({ dimension: 'D6-判定强度', pass: true, detail: '中性场景，无强制要求' });
  }

  return scores;
}

// ===== 延迟统计 =====

function calcPercentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ===== 主测试 =====

async function checkHealth(): Promise<{ ok: boolean; model: string; modelFile: string }> {
  try {
    const res = await fetch(`http://localhost:3001/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, model: 'unknown', modelFile: 'unknown' };
    const data = await res.json() as { status: string; modelReady: boolean; model?: string; modelFile?: string };
    return { ok: data.status === 'ok' && data.modelReady, model: data.model ?? 'unknown', modelFile: data.modelFile ?? 'unknown' };
  } catch { return { ok: false, model: 'unknown', modelFile: 'unknown' }; }
}

async function main() {
  const startTime = Date.now();
  log('INFO', '=== IJ-11 PoC: Narrative Snippet AI 预生成 — 严格验证 ===');

  // 前置检查
  const health = await checkHealth();
  if (!health.ok) {
    log('ERROR', 'ai-server 不可用，请先启动: npx tsx server/ai-server.ts');
    process.exit(1);
  }
  log('INFO', `ai-server: ${health.model} (${health.modelFile})`);

  const builder = new NarrativeSnippetBuilder();
  const allResults: SingleRunResult[] = [];
  const allLatencies: number[] = [];

  // ===== 阶段 A: 质量测试（T1-T4 × N 次） =====

  log('INFO', '--- 阶段 A: 质量测试 ---');

  for (const scenario of SCENARIOS) {
    log('INFO', `\n=== ${scenario.id}: ${scenario.label} ===`);
    log('INFO', `目的: ${scenario.purpose}`);
    log('INFO', `输入: affinity=${scenario.memory.affinity}, tags=[${scenario.memory.tags}], events=${scenario.memory.keyEvents.length}个`, {
      affinity: scenario.memory.affinity,
      tags: scenario.memory.tags as unknown as string[],
      eventCount: scenario.memory.keyEvents.length,
      events: scenario.memory.keyEvents.map(e => `${e.content}(${e.affinityDelta})`),
    });
    log('INFO', `评估标准: 极性=${scenario.criteria.expectedPolarity}, 必须负面词=${scenario.criteria.requiredNegativeKeywords}, 必须正面词=${scenario.criteria.requiredPositiveKeywords}`);

    // AI 预生成（多次）
    for (let run = 0; run < scenario.runs; run++) {
      const start = Date.now();
      const snippet = await builder.buildByAI(scenario.sourceName, scenario.targetName, scenario.memory);
      const latencyMs = Date.now() - start;
      allLatencies.push(latencyMs);

      const scores = evaluateSnippet(snippet, scenario, 'ai');
      const overallPass = scores.every(s => s.pass);

      const result: SingleRunResult = {
        scenarioId: scenario.id, runIndex: run, source: 'ai',
        snippet, charLength: snippet?.length ?? 0, latencyMs,
        scores, overallPass,
      };
      allResults.push(result);

      log('INFO', `  [AI Run ${run + 1}/${scenario.runs}] ${overallPass ? '✅' : '❌'} ${latencyMs}ms | "${snippet ?? '(null)'}"`, {
        charLength: snippet?.length ?? 0,
        scores: Object.fromEntries(scores.map(s => [s.dimension, { pass: s.pass, detail: s.detail }])),
      });
    }

    // 规则拼接对照
    if (scenario.compareRules) {
      const start = Date.now();
      const rulesSnippet = builder.buildByRules(scenario.sourceName, scenario.targetName, scenario.memory);
      const latencyMs = Date.now() - start;

      const scores = evaluateSnippet(rulesSnippet, scenario, 'rules');
      const overallPass = scores.every(s => s.pass);

      const result: SingleRunResult = {
        scenarioId: scenario.id, runIndex: 0, source: 'rules',
        snippet: rulesSnippet, charLength: rulesSnippet.length, latencyMs,
        scores, overallPass,
      };
      allResults.push(result);

      log('INFO', `  [Rules] ${overallPass ? '✅' : '❌'} ${latencyMs}ms | "${rulesSnippet}"`, {
        charLength: rulesSnippet.length,
        scores: Object.fromEntries(scores.map(s => [s.dimension, { pass: s.pass, detail: s.detail }])),
      });
    }
  }

  // ===== 阶段 B: 延迟基准测试（20 次） =====

  log('INFO', '\n--- 阶段 B: 延迟基准测试 ---');
  log('INFO', `场景: ${SCENARIOS[1].id} (${SCENARIOS[1].label}), 重复 20 次`);

  const latencyRuns: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    await builder.buildByAI(SCENARIOS[1].sourceName, SCENARIOS[1].targetName, SCENARIOS[1].memory);
    const ms = Date.now() - start;
    latencyRuns.push(ms);
    log('INFO', `  延迟 Run ${i + 1}/20: ${ms}ms`);
  }

  const sorted = [...latencyRuns].sort((a, b) => a - b);
  const latencyStats = {
    runs: 20,
    min: sorted[0],
    p50: calcPercentile(sorted, 50),
    p95: calcPercentile(sorted, 95),
    max: sorted[sorted.length - 1],
    avg: Math.round(latencyRuns.reduce((a, b) => a + b, 0) / latencyRuns.length),
    allLatencies: latencyRuns,
  };

  const a6Pass = latencyStats.p95 <= 2000;
  log('INFO', `延迟统计: Min=${latencyStats.min}ms P50=${latencyStats.p50}ms P95=${latencyStats.p95}ms Max=${latencyStats.max}ms Avg=${latencyStats.avg}ms`);
  log('INFO', `A-6 假设验证: P95=${latencyStats.p95}ms ${a6Pass ? '≤' : '>'} 2000ms → ${a6Pass ? '✅ PASS' : '❌ FAIL'}`);

  // ===== 阶段 C: 集成测试（triggerAIPregenerate） =====

  log('INFO', '\n--- 阶段 C: 集成测试 (triggerAIPregenerate) ---');

  const testMemory: RelationshipMemory = { ...SCENARIOS[1].memory, narrativeSnippet: undefined };
  log('INFO', '测试前: memory.narrativeSnippet = undefined');

  const integrationResult = await new Promise<{ cacheWriteSuccess: boolean; snippetValue: string | null; getSnippetHitCache: boolean }>(
    (resolve) => {
      let resolved = false;
      builder.triggerAIPregenerate(SCENARIOS[1].sourceName, SCENARIOS[1].targetName, testMemory, (snippet) => {
        if (!resolved) {
          resolved = true;
          const cached = builder.getSnippet(SCENARIOS[1].sourceName, SCENARIOS[1].targetName, testMemory);
          log('INFO', `  triggerAIPregenerate 完成: snippet="${snippet}"`);
          log('INFO', `  memory.narrativeSnippet = "${testMemory.narrativeSnippet}"`);
          log('INFO', `  getSnippet() 返回: "${cached}"`);
          log('INFO', `  缓存一致性: ${cached === snippet ? '✅' : '❌'}`);
          resolve({ cacheWriteSuccess: true, snippetValue: snippet, getSnippetHitCache: cached === snippet });
        }
      });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          log('WARN', '  triggerAIPregenerate 超时 (5s)');
          resolve({ cacheWriteSuccess: false, snippetValue: null, getSnippetHitCache: false });
        }
      }, 5000);
    }
  );

  // ===== 汇总 =====

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // 计算通过率
  const aiResults = allResults.filter(r => r.source === 'ai');
  const rulesResults = allResults.filter(r => r.source === 'rules');
  const aiPassRate = aiResults.filter(r => r.overallPass).length / aiResults.length;
  const rulesPassRate = rulesResults.length > 0
    ? rulesResults.filter(r => r.overallPass).length / rulesResults.length
    : -1;

  // 每维度通过率
  const dimensions = ['D1-格式合规', 'D2-情感极性', 'D3-事实忠诚', 'D4-人名准确', 'D5-文风合规', 'D6-判定强度'];
  const dimStats = dimensions.map(dim => {
    const aiScores = aiResults.flatMap(r => r.scores).filter(s => s.dimension === dim);
    const rulesScores = rulesResults.flatMap(r => r.scores).filter(s => s.dimension === dim);
    return {
      dimension: dim,
      aiPassRate: aiScores.length > 0 ? aiScores.filter(s => s.pass).length / aiScores.length : -1,
      rulesPassRate: rulesScores.length > 0 ? rulesScores.filter(s => s.pass).length / rulesScores.length : -1,
    };
  });

  log('INFO', '\n============================================================');
  log('INFO', `IJ-11 PoC 完成 | ${duration}s | 模型: ${health.model}`);
  log('INFO', `AI 整体通过率: ${(aiPassRate * 100).toFixed(0)}% (${aiResults.filter(r => r.overallPass).length}/${aiResults.length})`);
  if (rulesPassRate >= 0) {
    log('INFO', `规则拼接通过率: ${(rulesPassRate * 100).toFixed(0)}% (${rulesResults.filter(r => r.overallPass).length}/${rulesResults.length})`);
  }
  log('INFO', `A-6 延迟: P95=${latencyStats.p95}ms → ${a6Pass ? 'PASS' : 'FAIL'}`);
  log('INFO', '============================================================');

  // ===== 保存输出 =====

  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  // 1. 结构化 JSON
  const jsonData = {
    timestamp: new Date().toISOString(),
    model: health.model,
    modelFile: health.modelFile,
    durationMs: endTime - startTime,
    scenarios: SCENARIOS.map(s => ({
      id: s.id, label: s.label, purpose: s.purpose,
      input: {
        sourceName: s.sourceName, targetName: s.targetName,
        affinity: s.memory.affinity, tags: s.memory.tags,
        keyEvents: s.memory.keyEvents.map(e => ({ content: e.content, delta: e.affinityDelta })),
      },
      criteria: s.criteria,
    })),
    results: allResults,
    latencyBenchmark: latencyStats,
    integrationTest: integrationResult,
    summary: {
      aiOverallPassRate: aiPassRate,
      rulesOverallPassRate: rulesPassRate,
      dimensionPassRates: dimStats,
      a6Hypothesis: { p95: latencyStats.p95, threshold: 2000, pass: a6Pass },
    },
  };
  const jsonPath = join(logsDir, `poc-ij11-narrative-ai-${ts}.json`);
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');

  // 2. 详细日志 .txt
  const logLines = logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  });
  const txtPath = join(logsDir, `poc-ij11-narrative-ai-${ts}.txt`);
  writeFileSync(txtPath, logLines.join('\n\n'), 'utf8');

  // 3. 人可读报告 .md
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const reportLines = [
    `# IJ-11 PoC 验证报告 — Narrative Snippet AI 预生成`,
    ``,
    `> **日期**: ${new Date().toISOString().slice(0, 19)} | **模型**: ${health.model} (${health.modelFile})`,
    `> **耗时**: ${duration}s | **AI 调用**: ${aiResults.length} 次质量 + 20 次延迟 + 1 次集成`,
    ``,
    `---`,
    ``,
    `## 假设验证结论`,
    ``,
    `| 假设 | 结论 | 数据 |`,
    `|------|:----:|------|`,
    `| **A-6** 延迟 P95 ≤ 2000ms | ${a6Pass ? '✅ PASS' : '❌ FAIL'} | P95=${latencyStats.p95}ms (Min=${latencyStats.min} P50=${latencyStats.p50} Max=${latencyStats.max}) |`,
    `| **A-5** 叙事质量 | 📋 待阶段3 | AI通过率 ${pct(aiPassRate)} vs 规则 ${rulesPassRate >= 0 ? pct(rulesPassRate) : 'N/A'} |`,
    ``,
    `---`,
    ``,
    `## 六维评分矩阵`,
    ``,
    `| 维度 | AI 通过率 | 规则通过率 | 说明 |`,
    `|------|:--------:|:---------:|------|`,
    ...dimStats.map(d => `| ${d.dimension} | ${d.aiPassRate >= 0 ? pct(d.aiPassRate) : 'N/A'} | ${d.rulesPassRate >= 0 ? pct(d.rulesPassRate) : 'N/A'} | |`),
    ``,
    `---`,
    ``,
    `## 逐场景明细`,
    ``,
  ];

  for (const scenario of SCENARIOS) {
    reportLines.push(`### ${scenario.id}: ${scenario.label}`);
    reportLines.push(`**目的**: ${scenario.purpose}`);
    reportLines.push(`**输入**: affinity=${scenario.memory.affinity}, tags=[${scenario.memory.tags}], events=${scenario.memory.keyEvents.length}`);
    reportLines.push(`**预期极性**: ${scenario.criteria.expectedPolarity}`);
    reportLines.push(``);
    const sResults = allResults.filter(r => r.scenarioId === scenario.id);
    reportLines.push(`| 来源 | Run | 输出 | 字数 | 延迟 | D1 | D2 | D3 | D4 | D5 | D6 | 总评 |`);
    reportLines.push(`|------|:---:|------|:----:|:----:|:--:|:--:|:--:|:--:|:--:|:--:|:----:|`);
    for (const r of sResults) {
      const ds = dimensions.map(d => {
        const s = r.scores.find(s => s.dimension === d);
        return s ? (s.pass ? '✅' : '❌') : '—';
      });
      const snippetDisplay = r.snippet ? `${r.snippet.substring(0, 30)}${r.snippet.length > 30 ? '...' : ''}` : '(null)';
      reportLines.push(`| ${r.source} | ${r.runIndex + 1} | ${snippetDisplay} | ${r.charLength} | ${r.latencyMs}ms | ${ds.join(' | ')} | ${r.overallPass ? '✅' : '❌'} |`);
    }
    reportLines.push(``);
  }

  reportLines.push(`---`);
  reportLines.push(``);
  reportLines.push(`## 延迟分布`);
  reportLines.push(``);
  reportLines.push(`| 指标 | 值 |`);
  reportLines.push(`|------|-----|`);
  reportLines.push(`| Min | ${latencyStats.min}ms |`);
  reportLines.push(`| P50 | ${latencyStats.p50}ms |`);
  reportLines.push(`| **P95** | **${latencyStats.p95}ms** |`);
  reportLines.push(`| Max | ${latencyStats.max}ms |`);
  reportLines.push(`| Avg | ${latencyStats.avg}ms |`);
  reportLines.push(`| 全部 | [${latencyRuns.join(', ')}] |`);
  reportLines.push(``);
  reportLines.push(`---`);
  reportLines.push(``);
  reportLines.push(`## 集成测试`);
  reportLines.push(``);
  reportLines.push(`| 项目 | 结果 |`);
  reportLines.push(`|------|:----:|`);
  reportLines.push(`| triggerAIPregenerate 缓存写入 | ${integrationResult.cacheWriteSuccess ? '✅' : '❌'} |`);
  reportLines.push(`| getSnippet() 缓存命中 | ${integrationResult.getSnippetHitCache ? '✅' : '❌'} |`);
  reportLines.push(`| 缓存内容 | "${integrationResult.snippetValue ?? '(null)'}" |`);
  reportLines.push(``);
  reportLines.push(`## 数据文件`);
  reportLines.push(``);
  reportLines.push(`- JSON: \`logs/poc-ij11-narrative-ai-${ts}.json\``);
  reportLines.push(`- 日志: \`logs/poc-ij11-narrative-ai-${ts}.txt\``);

  const mdPath = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', `review-ij11-narrative-ai-poc.md`);
  writeFileSync(mdPath, reportLines.join('\n'), 'utf8');

  log('INFO', `输出已保存:`);
  log('INFO', `  JSON: ${jsonPath}`);
  log('INFO', `  日志: ${txtPath}`);
  log('INFO', `  报告: ${mdPath}`);

  if (aiPassRate < 0.75 || !a6Pass) process.exit(1);
}

main().catch(err => {
  log('ERROR', `失败: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
