/**
 * 模型下载脚本 — 从 ModelScope 下载 Qwen3.5 GGUF 模型
 *
 * 用法：npx tsx server/download-model.ts [--model 2b|0.8b]
 * 或：  npm run download-model          （默认下载 2B）
 *       npm run download-model:2b       （下载 2B）
 *       npm run download-model:0.8b     （下载 0.8B）
 *
 * 模型来源：ModelScope (阿里魔搭社区)
 * 量化格式：Q4_K_M（平衡质量与速度）
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';
import { get as httpGet } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== 模型配置 =====

interface ModelConfig {
  filename: string;
  url: string;
  expectedSizeMB: number;
  minSizeMB: number;
  label: string;
}

const MODELS: Record<string, ModelConfig> = {
  '2b': {
    filename: 'Qwen3.5-2B-Q4_K_M.gguf',
    url: 'https://modelscope.cn/models/unsloth/Qwen3.5-2B-GGUF/resolve/master/Qwen3.5-2B-Q4_K_M.gguf',
    expectedSizeMB: 1500,
    minSizeMB: 800,
    label: 'Qwen3.5-2B',
  },
  '0.8b': {
    filename: 'Qwen3.5-0.8B-Q4_K_M.gguf',
    url: 'https://modelscope.cn/models/unsloth/Qwen3.5-0.8B-GGUF/resolve/master/Qwen3.5-0.8B-Q4_K_M.gguf',
    expectedSizeMB: 508,
    minSizeMB: 400,
    label: 'Qwen3.5-0.8B',
  },
};

/** 默认模型 */
const DEFAULT_MODEL = '2b';

const MODEL_DIR = join(__dirname, 'models');

// ===== 命令行参数解析 =====

function parseModelArg(): string {
  const idx = process.argv.indexOf('--model');
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = process.argv[idx + 1].toLowerCase();
    if (val in MODELS) return val;
    console.error(`[✗] 不支持的模型: ${val}，可选: ${Object.keys(MODELS).join(', ')}`);
    process.exit(1);
  }
  return DEFAULT_MODEL;
}

// ===== 工具函数 =====

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 最大重定向次数 */
const MAX_REDIRECTS = 5;

function download(url: string, destPath: string, depth = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (depth > MAX_REDIRECTS) {
      reject(new Error(`重定向次数超过上限 (${MAX_REDIRECTS})`));
      return;
    }

    const isHttps = url.startsWith('https');
    const parsed = new URL(url);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || (isHttps ? 443 : 80),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };

    const getter = isHttps ? get : httpGet;

    console.log(`[下载] 开始下载: ${parsed.hostname}${parsed.pathname.substring(0, 60)}...`);
    console.log(`[下载] 保存到: ${destPath}`);

    getter(options, (res) => {
      // 处理重定向
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`[下载] 重定向到: ${res.headers.location}`);
        download(res.headers.location, destPath, depth + 1).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] ?? '0', 10);
      let downloadedBytes = 0;
      let lastProgressTime = Date.now();

      const file = createWriteStream(destPath);

      res.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        // 每 2 秒打印一次进度
        if (now - lastProgressTime > 2000) {
          const pct = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?';
          console.log(`[下载] 进度: ${formatSize(downloadedBytes)} / ${formatSize(totalBytes)} (${pct}%)`);
          lastProgressTime = now;
        }
      });

      res.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`[下载] 完成! 文件大小: ${formatSize(downloadedBytes)}`);
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        reject(err);
      });
    }).on('error', reject);
  });
}

// ===== 导出 API（向后兼容） =====

/** 检查模型是否已存在（检测最高优先级可用模型） */
export function isModelReady(): boolean {
  for (const key of ['2b', '0.8b'] as const) {
    const cfg = MODELS[key];
    const path = join(MODEL_DIR, cfg.filename);
    if (existsSync(path)) {
      const stats = statSync(path);
      if (stats.size > cfg.minSizeMB * 1024 * 1024) return true;
    }
  }
  return false;
}

/** 获取最高优先级可用模型路径 */
export function getModelPath(): string {
  for (const key of ['2b', '0.8b'] as const) {
    const cfg = MODELS[key];
    const path = join(MODEL_DIR, cfg.filename);
    if (existsSync(path)) {
      const stats = statSync(path);
      if (stats.size > cfg.minSizeMB * 1024 * 1024) return path;
    }
  }
  // fallback：返回默认 2B 路径（即使不存在）
  return join(MODEL_DIR, MODELS['2b'].filename);
}

// ===== 直接运行时执行下载 =====

async function main() {
  const modelKey = parseModelArg();
  const cfg = MODELS[modelKey];
  const modelPath = join(MODEL_DIR, cfg.filename);

  console.log('╔══════════════════════════════════════════╗');
  console.log(`║   ${cfg.label} GGUF 模型下载工具`);
  console.log('║   来源：ModelScope (阿里魔搭社区)        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  if (existsSync(modelPath)) {
    const stats = statSync(modelPath);
    const sizeMB = stats.size / (1024 * 1024);
    if (sizeMB >= cfg.minSizeMB) {
      console.log(`[✓] 模型已存在: ${modelPath}`);
      console.log(`[✓] 文件大小: ${formatSize(stats.size)}`);
      console.log('[✓] 无需重新下载。');
      return;
    }
    console.log(`[!] 模型文件不完整 (${formatSize(stats.size)})，将重新下载。`);
  }

  // 确保 models 目录存在
  if (!existsSync(MODEL_DIR)) {
    mkdirSync(MODEL_DIR, { recursive: true });
    console.log(`[创建] 目录: ${MODEL_DIR}`);
  }

  console.log(`[信息] 模型: ${cfg.filename}`);
  console.log(`[信息] 预计大小: ~${cfg.expectedSizeMB} MB`);
  console.log(`[信息] 来源: ModelScope (国内高速)`);
  console.log();

  try {
    await download(cfg.url, modelPath);
    console.log();
    console.log('[✓] 模型下载完成！可以启动 AI 服务了。');
    console.log('[✓] 运行: npm run ai');
  } catch (err) {
    console.error('[✗] 下载失败:', err);
    console.error('[提示] 你也可以手动下载模型文件：');
    console.error(`       ${cfg.url}`);
    console.error(`       保存到: ${modelPath}`);
    process.exit(1);
  }
}

// 判断是否直接运行（非 import）
const isDirectRun = process.argv[1]?.includes('download-model');
if (isDirectRun) {
  main();
}
