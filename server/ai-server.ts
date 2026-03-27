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

// ===== 性格描述生成 =====

function describePersonality(personality: Record<string, number>, personalityName: string): string {
  const traits: string[] = [];
  if (personality.aggressive >= 0.7) traits.push('好斗');
  if (personality.persistent >= 0.7) traits.push('坚毅');
  if (personality.kind >= 0.7) traits.push('善良温和');
  if (personality.lazy >= 0.7) traits.push('懒散');
  if (personality.smart >= 0.7) traits.push('聪慧');
  if (traits.length === 0) traits.push(personalityName);
  return traits.join('、');
}

// ===== 行为示例 =====

const BEHAVIOR_EXAMPLES: Record<string, string> = {
  meditate: '示例：今天灵气格外充沛，修炼事半功倍',
  explore: '示例：前面那座山看起来有点意思',
  rest: '示例：好困，让我眯一会儿',
  alchemy: '示例：火候差不多了，别急',
  farm: '示例：这些灵草长势不错嘛',
  bounty: '示例：这任务不算难，交给我吧',
};

// ===== 通过 llama-server HTTP API 推理 =====

function callLlamaServer(systemPrompt: string, userPrompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'qwen3.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.7,
      top_k: 20,
      top_p: 0.95,
      presence_penalty: 1.5,
      chat_template_kwargs: { enable_thinking: false },
    });

    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port: LLAMA_PORT,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const content = data?.choices?.[0]?.message?.content ?? '';
            resolve(content);
          } catch {
            reject(new Error('Failed to parse llama-server response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
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

  const personalityDesc = describePersonality(body.personality, body.personalityName);
  const behaviorDesc = BEHAVIOR_LABELS[body.behavior] ?? body.behavior;
  const example = BEHAVIOR_EXAMPLES[body.behavior] ?? '示例：今天天气不错';

  const systemPrompt =
    `你是修仙世界弟子${body.discipleName}，性格${personalityDesc}。` +
    `你正在${behaviorDesc}。\n` +
    `请用口语化的第一人称说一句简短的话（10-20字）。\n` +
    `只输出角色嘴里说出的话。禁止：动作描写、情绪描写、引号、旁白。\n` +
    `好：哎，今天也不想动啊\n` +
    `坏：懒洋洋地说道\n` +
    `${example}`;

  const userPrompt = `说一句话：`;

  try {
    let line = await callLlamaServer(systemPrompt, userPrompt);

    // 清理输出
    line = line
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/^["'"「『\s]+|["'"」』\s]+$/g, '')
      .replace(/\n/g, '')
      .trim();

    // 截断过长输出
    if (line.length > 50) {
      const idx = line.lastIndexOf('。', 50);
      if (idx > 5) line = line.substring(0, idx + 1);
      else line = line.substring(0, 50);
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
      '-ngl', '0',
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
      if (!started) resolve(false);
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

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null);
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      model: modelLoaded ? 'qwen3.5-0.8b' : 'placeholder',
      modelReady: modelLoaded,
    });
    return;
  }

  // Generate
  if (req.method === 'POST' && req.url === '/api/generate') {
    try {
      const rawBody = await parseBody(req);
      const body = JSON.parse(rawBody) as {
        discipleName: string;
        personality: Record<string, number>;
        personalityName: string;
        behavior: string;
        shortTermMemory: string[];
      };

      const line = await generateWithModel(body);

      console.log(`[AI] ${body.discipleName} (${body.personalityName}) → "${line}"`);
      sendJson(res, 200, { line });
    } catch (err) {
      console.error('[AI] 请求处理失败:', err);
      sendJson(res, 500, { error: 'Internal error' });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

// ===== 优雅退出 =====

function cleanup() {
  if (llamaProcess) {
    console.log('[AI Server] 关闭 llama-server...');
    llamaProcess.kill('SIGTERM');
    llamaProcess = null;
  }
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
