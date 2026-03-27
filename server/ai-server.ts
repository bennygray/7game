/**
 * AI 推理后端 — 最小 HTTP API
 *
 * 使用 Node.js 内置 http 模块，零外部依赖。
 * 启动：npx tsx server/ai-server.ts
 *
 * 当前为占位模式（无模型），返回模板台词。
 * 模型就绪后替换 generateWithModel() 即可。
 *
 * @see Story #5 AC1, AC2
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const PORT = 3001;

// ===== 占位推理（无模型时） =====

/** 性格化模板台词（与前端 fallback 独立，可不同） */
const SERVER_TEMPLATES: Record<string, string[]> = {
  meditate: [
    '灵气在我体内流转，我能感受到……力量在凝聚。',
    '心无旁骛，只有修炼……这就是道。',
    '又是充实的修炼，今天的灵气格外充沛。',
  ],
  explore: [
    '此处风景甚好，不知有无灵药可寻？',
    '前方那座山峰……似乎隐藏着什么秘密。',
    '出门历练，才知天地之大。',
  ],
  rest: [
    '困了……让我歇一会儿……',
    '修炼也要劳逸结合嘛。',
    '做了个好梦，梦见自己突破了！',
  ],
  alchemy: [
    '文火慢炖……不要急……',
    '这味丹药的配比，我已经反复推算过了。',
    '嘿嘿，又成功了一炉！',
  ],
  farm: [
    '这片灵田交给我，保管打理得妥妥帖帖。',
    '灵草啊灵草，快快长大吧。',
    '浇灌灵田，心也跟着沉静下来。',
  ],
  bounty: [
    '这悬赏……看起来有点危险，但报酬不错！',
    '交给我吧，定不辱使命。',
    '任务完成！不过如此。',
  ],
};

function generatePlaceholder(behavior: string, personalityName: string): string {
  const pool = SERVER_TEMPLATES[behavior] ?? SERVER_TEMPLATES.meditate;
  const line = pool[Math.floor(Math.random() * pool.length)];
  return line;
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
    sendJson(res, 200, { status: 'ok', model: 'placeholder' });
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

      // TODO: 模型就绪后替换为 generateWithModel(body)
      const line = generatePlaceholder(body.behavior, body.personalityName);

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

server.listen(PORT, () => {
  console.log(`[AI Server] 已启动，监听端口 ${PORT}`);
  console.log(`[AI Server] 当前模式：占位模板（无模型）`);
  console.log(`[AI Server] 健康检查：http://localhost:${PORT}/api/health`);
});
