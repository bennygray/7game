/**
 * AI 推理后端 — Qwen3.5-0.8B 本地推理
 *
 * 架构：ai-server.ts (HTTP :3001) → llama-server.exe (HTTP :8080)
 * llama-server.exe 是 llama.cpp 的官方预编译可执行文件，
 * 原生支持 Qwen3.5 的 Gated DeltaNet 架构（fused kernel）。
 *
 * 启动：npx tsx server/ai-server.ts
 * 首次需要先下载模型：npx tsx server/download-model.ts
 *
 * @see Story #5 AC1, AC2
 */

import { createServer, type IncomingMessage, type ServerResponse, request as httpRequest } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isModelReady, getModelPath } from './download-model.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = 3001;
const LLAMA_PORT = 8080;
const LLAMA_SERVER_PATH = join(__dirname, 'llama-server', 'llama-server.exe');

// ===== 模型状态 =====

let modelLoaded = false;
let llamaProcess: ChildProcess | null = null;

/** 崩溃自动重启计数 */
let restartCount = 0;
const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 5000;

// ===== 占位推理（模型未加载时） =====

const SERVER_TEMPLATES: Record<string, string[]> = {
  meditate: [
    '灵气在体内流转，力量在凝聚。',
    '心无旁骛，沉浸在修炼之中。',
    '今天的灵气格外充沛。',
  ],
  explore: [
    '此处风景甚好，不知有无灵药可寻？',
    '前方那座山峰似乎隐藏着什么秘密。',
    '出门历练，才知天地之大。',
  ],
  rest: [
    '困了……让我歇一会儿……',
    '修炼也要劳逸结合嘛。',
    '做了个好梦，梦见自己突破了！',
  ],
  alchemy: [
    '文火慢炖……不要急……',
    '这味丹药的配比已经反复推算过了。',
    '嘿嘿，又成功了一炉！',
  ],
  farm: [
    '这片灵田交给我，保管打理得妥妥帖帖。',
    '灵草啊灵草，快快长大吧。',
    '浇灌灵田，心也跟着沉静下来。',
  ],
  bounty: [
    '这悬赏看起来有点危险，但报酬不错！',
    '交给我吧，定不辱使命。',
    '任务完成！不过如此。',
  ],
};

function generatePlaceholder(behavior: string): string {
  const pool = SERVER_TEMPLATES[behavior] ?? SERVER_TEMPLATES.meditate;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===== 行为描述映射 =====

const BEHAVIOR_LABELS: Record<string, string> = {
  meditate: '打坐修炼',
  explore: '外出探索',
  rest: '休息',
  alchemy: '炼丹',
  farm: '打理灵田',
  bounty: '执行悬赏任务',
  idle: '发呆',
};

// ===== 性格专属说话风格 + few-shot 示例 =====

const PERSONALITY_PROFILES: Record<string, { style: string; examples: string[] }> = {
  '刚烈': {
    style: '说话直来直去，语气冲，喜欢用命令句和感叹号，像个火爆脾气的武夫',
    examples: ['哼，谁敢拦老子修炼？', '这破丹炉再炸一次试试！', '废话少说，干就完了！'],
  },
  '温和': {
    style: '说话轻声细语，语气温柔关切，经常用"呢""呀""吧"等语气词，像一个善良的邻家姐姐',
    examples: ['大家都辛苦了呢，一起加油吧', '今天天气真好呀，适合修炼', '别着急，慢慢来就好啦'],
  },
  '机敏': {
    style: '说话带分析和观察，喜欢用"有意思""看来""我觉得"，像一个好奇心旺盛的书生',
    examples: ['有意思，这灵气流动规律真奇怪', '看来今日丹炉火候偏了三成', '让我研究研究，这里面别有玄机'],
  },
  '沉稳': {
    style: '说话沉着简短，不废话不感叹，像一个深沉的老修士',
    examples: ['继续', '心静自然成', '火候到了，收功'],
  },
  '散漫': {
    style: '说话慵懒随意，喜欢拖长尾音，经常抱怨嫌麻烦，像一个总想偷懒的少年',
    examples: ['啊——好累，能不能不练了', '随便吧，反正也没啥区别', '我再躺五分钟……就五分钟……'],
  },
  '狡黠': {
    style: '说话带小心思，语气狡猾暧昧，喜欢用"嘿嘿""嘻嘻"，像一个满肚子坏水的小狐狸',
    examples: ['嘿嘿，这东西我先藏起来再说', '别告诉其他人，这可是我的小秘密', '嘻嘻，又让我占到便宜了'],
  },
  '孤傲': {
    style: '说话高冷简练，透着不屑和自信，极少用语气词，像一个独来独往的天才剑修',
    examples: ['不必多言', '你们太慢了', '孤身一人，又何妨'],
  },
  '恐懦': {
    style: '说话胆怯犹豫，喜欢用省略号和问句，经常自我怀疑，像一个刚入门的小弟子',
    examples: ['我……我能行吗？', '好、好可怕……', '要不……还是算了吧？'],
  },
};

// ===== 通过 llama-server HTTP API 推理 =====

/** llama-server 请求载荷 */
interface LlamaRequestPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature: number;
  top_p: number;
  response_format?: { type: 'json_schema'; json_schema: { name: string; strict: boolean; schema: object } };
  chat_template_kwargs?: Record<string, unknown>;
  top_k?: number;
  presence_penalty?: number;
}

/**
 * 向 llama-server 发送推理请求
 * @param payload - 完整请求载荷
 * @param timeoutMs - 超时毫秒数（默认 15000）
 */
function callLlamaServer(payload: LlamaRequestPayload, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port: LLAMA_PORT,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ message?: { content?: string } }> };
            const content = parsed.choices?.[0]?.message?.content ?? '';
            resolve(content);
          } catch {
            reject(new Error('Failed to parse llama-server response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function generateWithModel(body: {
  discipleName: string;
  personality: Record<string, number>;
  personalityName: string;
  behavior: string;
  shortTermMemory: string[];
}): Promise<string> {
  if (!modelLoaded) {
    return generatePlaceholder(body.behavior);
  }

  const profile = PERSONALITY_PROFILES[body.personalityName] ?? PERSONALITY_PROFILES['温和'];
  const behaviorDesc = BEHAVIOR_LABELS[body.behavior] ?? body.behavior;

  const systemPrompt =
    `你是修仙世界弟子${body.discipleName}。\n` +
    `你的说话风格：${profile.style}\n` +
    `你正在${behaviorDesc}。\n` +
    `参考你的语气：${profile.examples.join('｜')}\n` +
    `要求：用口语第一人称说一句短话，最多25字，只输出台词本身。\n` +
    `禁止：超过25字、拼接多句、动作描写、心理描写、引号、旁白、叙述语气。`;

  const userPrompt = `说一句话：`;

  try {
    let line = await callLlamaServer({
      model: 'qwen3.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.85,
      top_k: 50,
      top_p: 0.9,
      presence_penalty: 1.0,
      chat_template_kwargs: { enable_thinking: false },
    });

    // 清理输出
    line = line
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/^["'"「『\s]+|["'"」』\s]+$/g, '')
      .replace(/\n/g, '')
      .trim();

    // 截断过长输出（硬线30字）
    if (line.length > 30) {
      // 先尝试在句号/感叹号/问号处截断
      const cutIdx = line.search(/[。！？!?]/);
      if (cutIdx > 5 && cutIdx <= 30) {
        line = line.substring(0, cutIdx + 1);
      } else {
        // 否则在逗号处截断
        const commaIdx = line.lastIndexOf('，', 30);
        if (commaIdx > 5) line = line.substring(0, commaIdx);
        else line = line.substring(0, 30);
      }
    }

    if (!line) return generatePlaceholder(body.behavior);
    return line;
  } catch (err) {
    console.error('[AI] 模型推理失败，使用 fallback:', err);
    return generatePlaceholder(body.behavior);
  }
}

// ===== 启动 llama-server 子进程 =====

async function startLlamaServer(): Promise<boolean> {
  if (!existsSync(LLAMA_SERVER_PATH)) {
    console.log('[AI Server] ⚠ llama-server.exe 未找到');
    console.log(`[AI Server]   预期路径: ${LLAMA_SERVER_PATH}`);
    return false;
  }

  if (!isModelReady()) {
    console.log('[AI Server] ⚠ 模型文件未找到');
    console.log('[AI Server]   请先运行: npm run download-model');
    return false;
  }

  return new Promise((resolve) => {
    console.log('[AI Server] 正在启动 llama-server (Qwen3.5-0.8B)...');

    llamaProcess = spawn(LLAMA_SERVER_PATH, [
      '-m', getModelPath(),
      '--port', String(LLAMA_PORT),
      '-c', '2048',
      '-ngl', '99',
      '--jinja',
      '-np', '1',             // 单并发（节省内存）
      '--no-warmup',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    // llama-server 将日志输出到 stderr
    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      // 检测启动完成
      if (!started && text.includes('starting the main loop')) {
        started = true;
        modelLoaded = true;
        console.log('[AI Server] ✓ llama-server 启动完成');
        console.log(`[AI Server]   模型: Qwen3.5-0.8B (${getModelPath()})`);
        console.log(`[AI Server]   推理端口: ${LLAMA_PORT}`);
        resolve(true);
      }
    };

    llamaProcess.stdout?.on('data', handleOutput);
    llamaProcess.stderr?.on('data', handleOutput);

    llamaProcess.on('error', (err) => {
      console.error('[AI Server] ✗ llama-server 启动失败:', err);
      if (!started) resolve(false);
    });

    llamaProcess.on('exit', (code) => {
      console.log(`[AI Server] llama-server 退出 (code=${code})`);
      modelLoaded = false;
      llamaProcess = null;
      if (!started) {
        resolve(false);
        return;
      }
      // 崩溃自动重启
      if (restartCount < MAX_RESTARTS) {
        restartCount++;
        console.log(`[AI Server] 将在 ${RESTART_DELAY_MS / 1000}s 后尝试重启 (${restartCount}/${MAX_RESTARTS})...`);
        setTimeout(() => {
          startLlamaServer().then((ok) => {
            if (ok) {
              restartCount = 0;
              console.log('[AI Server] ✓ llama-server 重启成功');
            }
          }).catch(() => {
            console.error('[AI Server] ✗ llama-server 重启失败');
          });
        }, RESTART_DELAY_MS);
      } else {
        console.error('[AI Server] ✗ llama-server 重启次数已达上限，切换到占位模式');
      }
    });

    // 超时处理
    setTimeout(() => {
      if (!started) {
        console.error('[AI Server] ✗ llama-server 启动超时');
        resolve(false);
      }
    }, 30000);
  });
}

// ===== HTTP 服务 =====

/** 请求体大小上限（64KB） */
const MAX_BODY_SIZE = 65536;

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/** 允许的 CORS 来源（仅 localhost） */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev
  'http://localhost:4173',   // Vite preview
  'http://localhost:3000',   // 备用
];

function getCorsHeaders(origin: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function sendJson(res: ServerResponse, status: number, data: unknown, origin?: string): void {
  res.writeHead(status, getCorsHeaders(origin));
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null, origin);
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      model: modelLoaded ? 'qwen3.5-0.8b' : 'placeholder',
      modelReady: modelLoaded,
    }, origin);
    return;
  }

  // Infer（统一端点：按请求体形状检测路由）
  if (req.method === 'POST' && req.url === '/api/infer') {
    try {
      const rawBody = await parseBody(req);

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' }, origin);
        return;
      }

      const body = parsed as Record<string, unknown>;

      // ── 新路径：结构化补全（SoulEvaluator） ──
      if (Array.isArray(body.messages)) {
        if (!modelLoaded) {
          sendJson(res, 503, { error: 'Model not ready', code: 'MODEL_NOT_READY' }, origin);
          return;
        }

        const messages = body.messages as Array<{ role: string; content: string }>;
        if (messages.length === 0 || !messages.every(m => typeof m.role === 'string' && typeof m.content === 'string')) {
          sendJson(res, 400, { error: 'messages must be non-empty array of {role, content}' }, origin);
          return;
        }

        const maxTokens = typeof body.max_tokens === 'number' ? body.max_tokens : 200;
        const temperature = typeof body.temperature === 'number' ? body.temperature : 0.6;
        const topP = typeof body.top_p === 'number' ? body.top_p : 0.9;
        const clientTimeout = typeof body.timeout_ms === 'number' ? body.timeout_ms : 5000;
        const responseFormat = body.response_format as LlamaRequestPayload['response_format'] | undefined;

        const llamaPayload: LlamaRequestPayload = {
          model: 'qwen3.5',
          messages,
          max_tokens: maxTokens,
          temperature,
          top_p: topP,
          chat_template_kwargs: { enable_thinking: false },
        };
        if (responseFormat) {
          llamaPayload.response_format = responseFormat;
        }

        let content = await callLlamaServer(llamaPayload, clientTimeout + 2000);

        // 清理 <think> 标签
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // 如果有 response_format，尝试 JSON.parse
        let parsedContent: unknown = undefined;
        if (responseFormat) {
          try {
            parsedContent = JSON.parse(content);
          } catch {
            // JSON 解析失败，返回原始 content，parsed 为 null
            parsedContent = null;
          }
        }

        console.log(`[AI] structured completion → ${content.substring(0, 60)}...`);
        sendJson(res, 200, { content, parsed: parsedContent }, origin);
        return;
      }

      // ── 旧路径：台词生成（SmartLLMAdapter） ──
      if (typeof body.discipleName !== 'string' ||
          typeof body.personalityName !== 'string' ||
          typeof body.behavior !== 'string') {
        sendJson(res, 400, { error: 'Missing required fields: discipleName, personalityName, behavior (or messages[])' }, origin);
        return;
      }

      const line = await generateWithModel(body as {
        discipleName: string;
        personality: Record<string, number>;
        personalityName: string;
        behavior: string;
        shortTermMemory: string[];
      });

      console.log(`[AI] ${body.discipleName} (${body.personalityName}) → "${line}"`);
      sendJson(res, 200, { line }, origin);
    } catch (err) {
      if (err instanceof Error && err.message === 'Payload too large') {
        sendJson(res, 413, { error: 'Payload too large' }, origin);
      } else if (err instanceof Error && err.message === 'Timeout') {
        sendJson(res, 504, { error: 'Inference timeout', code: 'TIMEOUT' }, origin);
      } else {
        console.error('[AI] 请求处理失败:', err);
        sendJson(res, 500, { error: 'Internal error', code: 'INTERNAL' }, origin);
      }
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' }, origin);
});

// ===== 优雅退出 =====

function cleanup() {
  console.log('[AI Server] 正在关闭...');
  if (llamaProcess) {
    console.log('[AI Server] 关闭 llama-server...');
    // Windows 上 SIGTERM 不可靠，不传参数时 Node.js 使用 TerminateProcess
    if (process.platform === 'win32') {
      llamaProcess.kill();
    } else {
      llamaProcess.kill('SIGTERM');
    }
    llamaProcess = null;
  }
  server.close(() => {
    console.log('[AI Server] HTTP server 已关闭');
  });
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

// ===== 启动 =====

async function start() {
  const ok = await startLlamaServer();

  server.listen(PORT, () => {
    console.log(`[AI Server] 已启动，监听端口 ${PORT}`);
    console.log(`[AI Server] 当前模式：${ok ? 'Qwen3.5-0.8B 本地推理' : '占位模板（无模型）'}`);
    console.log(`[AI Server] 健康检查：http://localhost:${PORT}/api/health`);
  });
}

start();
