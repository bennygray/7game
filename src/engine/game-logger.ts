/**
 * GameLogger 实现 — 结构化日志 + IndexedDB 持久化
 *
 * Phase D: 替代散布的 console.log，支持分级分类 + 持久化 + rotation。
 *
 * R-D4a: 缓冲区上限 500 条
 * R-D4b: 持久化间隔 30s
 * R-D4c: 单次写盘 200 条
 * R-D4d: 存储限制 1MB（rotate 删旧 50%）
 * R-D4f: IndexedDB `7game-logs` store
 *
 * ADR-D03: 混合方案 — Handler 用 ctx.logger, 其余用 createLogger()
 *
 * @see phaseD-TDD.md Step 2, ADR-D03
 * @see Story #1
 */

import {
  LogLevel,
  type LogCategory,
  type LogEntry,
  type GameLogger,
} from '../shared/types/logger';

// ===== 配置常量 =====

/** 内存缓冲区上限 */
const BUFFER_MAX = 500;

/** 持久化间隔（毫秒） */
const FLUSH_INTERVAL_MS = 30_000;

/** 单次写盘最大条数 */
const FLUSH_BATCH_SIZE = 200;

/** IndexedDB 数据库名 */
const DB_NAME = '7game-logs';

/** IndexedDB Store 名 */
const STORE_NAME = 'logs';

/** 存储限制（字节，约 1MB） */
const STORAGE_LIMIT_BYTES = 1_000_000;

/** 日志级别标签 */
const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// ===== IndexedDB 工具 =====

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeLogs(entries: LogEntry[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const entry of entries) {
      store.add(entry);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB 不可用时静默失败（I3: Log 不影响游戏逻辑）
    console.warn('[GameLogger] IndexedDB 写入失败，日志未持久化');
  }
}

async function rotateIfNeeded(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // 估算存储大小
    const countReq = store.count();
    const count = await new Promise<number>((resolve) => {
      countReq.onsuccess = () => resolve(countReq.result);
    });

    // 粗略估算：每条日志约 200 字节
    const estimatedSize = count * 200;

    if (estimatedSize > STORAGE_LIMIT_BYTES) {
      // 删除最旧 50%
      const deleteCount = Math.floor(count / 2);
      let deleted = 0;
      const cursor = store.openCursor();
      await new Promise<void>((resolve) => {
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < deleteCount) {
            c.delete();
            deleted++;
            c.continue();
          } else {
            resolve();
          }
        };
      });
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  } catch {
    // 静默失败
  }
}

// ===== GameLogger 实现 =====

class GameLoggerImpl implements GameLogger {
  private buffer: LogEntry[] = [];
  private minLevel: LogLevel = LogLevel.DEBUG;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(level?: LogLevel) {
    if (level !== undefined) {
      this.minLevel = level;
    }

    // 启动定时持久化
    this.flushTimer = setInterval(() => this.persistBuffer(), FLUSH_INTERVAL_MS);

    // 页面关闭前紧急持久化
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.persistBufferSync();
      });
    }
  }

  debug(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, cat, src, msg, data);
  }

  info(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, cat, src, msg, data);
  }

  warn(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, cat, src, msg, data);
  }

  error(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, cat, src, msg, data);
  }

  flush(): LogEntry[] {
    const entries = [...this.buffer];
    this.buffer = [];
    return entries;
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /** 销毁 Logger（清理定时器） */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ===== 内部方法 =====

  private log(
    level: LogLevel,
    cat: LogCategory,
    src: string,
    msg: string,
    data?: Record<string, unknown>,
  ): void {
    // 级别过滤
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category: cat,
      source: src,
      message: msg,
      ...(data !== undefined ? { data } : {}),
    };

    // 写入缓冲区
    this.buffer.push(entry);

    // 缓冲区上限（FIFO）
    if (this.buffer.length > BUFFER_MAX) {
      this.buffer.splice(0, this.buffer.length - BUFFER_MAX);
    }

    // 同步输出到 console（开发体验）
    const label = `[${LEVEL_LABELS[level]}][${cat}][${src}] ${msg}`;
    switch (level) {
      case LogLevel.DEBUG: console.debug(label, data ?? ''); break;
      case LogLevel.INFO:  console.info(label, data ?? '');  break;
      case LogLevel.WARN:  console.warn(label, data ?? '');  break;
      case LogLevel.ERROR: console.error(label, data ?? ''); break;
    }
  }

  private async persistBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    // 取出一批（不超过 FLUSH_BATCH_SIZE）
    const batch = this.buffer.splice(0, FLUSH_BATCH_SIZE);

    // 先检查 rotation
    await rotateIfNeeded();

    // 写盘
    await writeLogs(batch);
  }

  /** 同步版紧急持久化（beforeunload 用） */
  private persistBufferSync(): void {
    // beforeunload 中无法可靠使用 async
    // 使用 navigator.sendBeacon 替代（如果可用），否则尝试同步 IndexedDB
    // 实际上 IndexedDB 在 beforeunload 中仍可工作（浏览器会等待事务完成）
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, FLUSH_BATCH_SIZE);
    // fire-and-forget: 浏览器通常会完成 IndexedDB 事务
    writeLogs(batch);
  }
}

// ===== 工厂函数 =====

/** 创建 GameLogger 实例 */
export function createLogger(level?: LogLevel): GameLogger & { destroy(): void } {
  return new GameLoggerImpl(level);
}

/** 创建无持久化的轻量 Logger（测试用） */
export function createTestLogger(): GameLogger {
  const buffer: LogEntry[] = [];
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
    flush() { return buffer.splice(0); },
    setLevel() {},
  };
}
