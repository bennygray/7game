/**
 * 模型下载脚本 — 从 ModelScope 下载 Qwen3.5-0.8B GGUF 模型
 *
 * 用法：npx tsx server/download-model.ts
 * 或：  npm run download-model
 *
 * 模型来源：ModelScope (阿里魔搭社区)
 * 模型地址：https://modelscope.cn/models/unsloth/Qwen3.5-0.8B-GGUF
 * 量化格式：Q4_K_M（平衡质量与速度，约 508MB）
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';
import { get as httpGet } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== 配置 =====

const MODEL_FILENAME = 'Qwen3.5-0.8B-Q4_K_M.gguf';
const MODEL_DIR = join(__dirname, 'models');
const MODEL_PATH = join(MODEL_DIR, MODEL_FILENAME);

/** ModelScope 下载地址（国内高速） */
const DOWNLOAD_URL =
  `https://modelscope.cn/models/unsloth/Qwen3.5-0.8B-GGUF/resolve/master/${MODEL_FILENAME}`;

// ===== 主逻辑 =====

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

    const getter = url.startsWith('https') ? get : httpGet;

    console.log(`[下载] 开始下载: ${url}`);
    console.log(`[下载] 保存到: ${destPath}`);

    getter(url, (res) => {
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

/** 检查模型是否已存在 */
export function isModelReady(): boolean {
  if (!existsSync(MODEL_PATH)) return false;
  const stats = statSync(MODEL_PATH);
  // Q4_K_M 文件约 508MB，如果太小说明下载不完整
  return stats.size > 400 * 1024 * 1024;
}

/** 获取模型文件路径 */
export function getModelPath(): string {
  return MODEL_PATH;
}

// ===== 直接运行时执行下载 =====

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Qwen3.5-0.8B GGUF 模型下载工具        ║');
  console.log('║   来源：ModelScope (阿里魔搭社区)        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  if (isModelReady()) {
    const stats = statSync(MODEL_PATH);
    console.log(`[✓] 模型已存在: ${MODEL_PATH}`);
    console.log(`[✓] 文件大小: ${formatSize(stats.size)}`);
    console.log('[✓] 无需重新下载。');
    return;
  }

  // 确保 models 目录存在
  if (!existsSync(MODEL_DIR)) {
    mkdirSync(MODEL_DIR, { recursive: true });
    console.log(`[创建] 目录: ${MODEL_DIR}`);
  }

  console.log(`[信息] 模型: ${MODEL_FILENAME}`);
  console.log(`[信息] 预计大小: ~508 MB`);
  console.log(`[信息] 来源: ModelScope (国内高速)`);
  console.log();

  try {
    await download(DOWNLOAD_URL, MODEL_PATH);
    console.log();
    console.log('[✓] 模型下载完成！可以启动 AI 服务了。');
    console.log('[✓] 运行: npm run ai');
  } catch (err) {
    console.error('[✗] 下载失败:', err);
    console.error('[提示] 你也可以手动下载模型文件：');
    console.error(`       ${DOWNLOAD_URL}`);
    console.error(`       保存到: ${MODEL_PATH}`);
    process.exit(1);
  }
}

// 判断是否直接运行（非 import）
const isDirectRun = process.argv[1]?.includes('download-model');
if (isDirectRun) {
  main();
}
