# Phase Y — 前后端代码质量治理 · 实施计划

> **状态**: 待执行
> **更新**: 2026-03-31（扩展 scope 覆盖后端 14 项修复）
> **前置**: Phase X-γ code-review.md + 后端 backend-code-review.md + 行业调研
> **预估**: 6 步，建议分 3-4 个会话完成

---

## Step 1: ESLint 基础配置

### 安装依赖

```bash
npm install -D eslint @eslint/js typescript-eslint \
  eslint-plugin-import eslint-plugin-sonarjs \
  eslint-plugin-clean-timer
```

### 创建 `eslint.config.js`（flat config 格式）

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import cleanTimer from 'eslint-plugin-clean-timer';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      'clean-timer': cleanTimer,
      'import': importPlugin,
    },
    rules: {
      // === P0: 类型安全 ===
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // === P1: 模块边界 ===
      'import/no-restricted-paths': ['error', {
        zones: [
          { target: './src/engine', from: './src/ui', message: 'Engine 层不得导入 UI 层' },
          { target: './src/shared', from: './src/ui', message: 'Shared 层不得导入 UI 层' },
          { target: './src/shared', from: './src/engine', message: 'Shared 层不得导入 Engine 层' },
        ],
      }],

      // === P2: 代码质量 ===
      'clean-timer/assign-timer-id': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 15],

      // === P3: 可维护性 ===
      '@typescript-eslint/no-magic-numbers': ['warn', {
        ignore: [0, 1, -1, 2, 100],
        ignoreEnums: true,
        ignoreReadonlyClassProperties: true,
        ignoreArrayIndexes: true,
      }],

      // === 项目特定放宽 ===
      '@typescript-eslint/no-non-null-assertion': 'warn',  // layout.ts 大量 getElementById()!
      '@typescript-eslint/restrict-template-expressions': 'off',  // MUD 日志拼接需要
    },
  },
  // === 后端专用配置 ===
  {
    files: ['server/**/*.ts'],
    rules: {
      // 后端模块边界
      'import/no-restricted-paths': ['error', {
        zones: [
          { target: './server', from: './src/ui', message: 'Server 不得导入 UI 层' },
          { target: './server', from: './src/engine', message: 'Server 不得导入 Engine 层' },
        ],
      }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'scripts/'],
  },
);
```

### npm 脚本

```json
{
  "lint": "eslint src/ server/",
  "lint:fix": "eslint src/ server/ --fix",
  "lint:ui": "eslint src/ui/ src/main.ts",
  "lint:server": "eslint server/"
}
```

### 验证标准

- `npm run lint` 可运行
- 统计首次错误/警告数量，记录基线
- `npm run test:regression` 仍 64/64 通过（lint 不改代码）

---

## Step 2: Phase X 存量修复（P0 + P1）

### P0 修复（类型安全，4 项）

| # | 文件 | 修复方案 |
|---|------|----------|
| P0-01 | `llm-adapter.ts` 接口 | 添加 `tryConnect(): Promise<boolean>` 方法声明 |
| P0-02 | `command-handler.ts` + `main.ts` | `CommandContext` 注入 `onReset: () => void`，消除 `window.__mudReset` |
| P0-03 | `engine-bindings.ts:128` | 添加 `typeof === 'number'` 类型守卫 |
| P0-04 | `engine-bindings.ts:130` | 添加 `typeof === 'string'` 类型守卫 |

### P1 修复（架构违规，5 项）

| # | 文件 | 修复方案 |
|---|------|----------|
| P1-01 | `log-manager.ts` | 添加 `clearMainLog(): void` 接口方法 |
| P1-02 | `command-handler.ts` | `CommandContext` 注入 `clearSave(): void` |
| P1-03 | `mud-formatter.ts` | 提取 `formatStatusPanel()` 纯函数 |
| P1-04 | `engine-bindings.ts` | AI 上下文操作移到 Engine 回调内 |
| P1-05 | 新建 `src/ui/ai-connect.ts` | 抽取共用 `connectAI()` 函数 |

### 验证标准

- `npm run lint` 零 error（warn 可保留）
- `npm run test:regression` 64/64 通过
- `tsc --noEmit` 零错误
- 浏览器冒烟测试：look/inspect/sect/judge/ai/reset 命令正常

---

## Step 3: Claude Code Hook

### 配置 `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx eslint --no-warn-ignored \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### 验证标准

- 编辑 `src/ui/` 下任意文件后，终端自动输出 lint 结果
- lint 耗时 < 500ms（单文件）
- lint 失败不阻断编辑（exit code 非 2）

---

## Step 4: SGE Skill 增强

### 修改文件: `.agents/skills/engineer/SKILL.md`

在 Gate 3 Review 章节追加 **Code Quality Gate**:

```markdown
### 前端 Code Quality Gate（编码完成后逐项检查）

类型安全:
- [ ] `npm run lint` 零 error
- [ ] 零 `as any` / `as unknown`（如需强转，声明专用接口或类型守卫）
- [ ] 零 `(window as any)` 全局挂载（通过依赖注入）

边界合规:
- [ ] UI 层（src/ui/）零 GameState 直接写入（只读访问 + Engine API 调用）
- [ ] UI 层零 `document.getElementById` 直接调用（通过 layout.ts 注入引用）
- [ ] UI 层零 `localStorage` / `fetch` 直接调用（通过注入服务）

状态管理:
- [ ] 模块级 `let` 变量 = 0（用闭包封装或 Context 注入）
- [ ] 所有 setTimeout/setInterval 有 dispose 清理路径

一致性:
- [ ] 同类功能使用同一实现模式（如别名统一走映射表）
- [ ] 同类 UI 文案格式一致（引号、标点、措辞）
- [ ] 格式化逻辑统一在 mud-formatter.ts（不内联在 command-handler switch 中）

测试:
- [ ] 新增纯函数有对应单元测试
- [ ] `npm run test:regression` 通过

### 后端 Code Quality Gate（后端编码完成后逐项检查）

架构合规:
- [ ] 前端 AI 调用全部走 ai-server (port 3001)，不直连 llama-server
- [ ] 端点命名与 CLAUDE.md `/api/infer` 规范一致
- [ ] CORS 仅允许 localhost origin
- [ ] server/ 不导入 src/ui/ 或 src/engine/

稳定性:
- [ ] 子进程有崩溃自动恢复逻辑
- [ ] 子进程有 Windows 兼容的 kill 方式
- [ ] HTTP server 有 graceful shutdown
- [ ] 请求体有大小限制

输入校验:
- [ ] POST 端点校验必需字段，缺失返回 400
- [ ] JSON.parse 失败返回 400（不是 500）
- [ ] 响应体有统一 error 格式

AI 推理:
- [ ] 推理超时有 fallback
- [ ] 模型未加载有 placeholder
- [ ] Prompt 不硬编码（在 src/ai/prompts/ 或 ai-server 常量区）
```

---

## Step 5: mud-formatter 单元测试

### 创建测试文件: `scripts/verify-ui-formatter.ts`

覆盖以下纯函数:
- `matchDisciple()` — 精确/前缀/多匹配/空输入 边界
- `labelFromTable()` — 阈值边界值
- `getMoralLabel()` / `getChaosLabel()` — 极端值 ±100
- `formatSeverityLog()` — 5 个严重度级别
- `wrapDiscipleName()` — XSS 转义验证
- `getBehaviorIcon()` — 7 行为 + 未知行为

### npm 脚本

```json
"test:ui": "npx tsx scripts/verify-ui-formatter.ts"
```

### 验证标准

- `npm run test:ui` exit code 0
- 覆盖 ≥ 20 组测试用例

---

---

## Step 6: 后端存量修复（Y-7 + Y-8）

### 第一优先级 — 合规修复（Y-7）

| # | 文件 | 修复方案 |
|---|------|----------|
| P0-02 | `ai-server.ts` + `llm-adapter.ts` + `ai-stress-test.ts` | 端点 `/api/generate` → `/api/infer` |
| P0-03 | `ai-server.ts` | CORS 限制为 `http://localhost:5173` 和 `http://localhost:4173` |
| P2-03 | `ai-server.ts` | POST 端点添加字段校验，缺失返回 400 |
| P2-05 | `llm-adapter.ts` | `tryConnect()` 委托给 `this.http.tryConnect()` |

### 第二优先级 — 稳定性加固（Y-8）

| # | 文件 | 修复方案 |
|---|------|----------|
| P1-02 | `ai-server.ts` | llama-server 崩溃自动重启（延迟 5s，最多 3 次） |
| P1-01 | `ai-server.ts` | `parseBody()` 64KB 大小限制 |
| P1-03 | `ai-server.ts` | Windows SIGTERM 兼容（不传参数） |
| P1-04 | `ai-server.ts` | `cleanup()` 中加 `server.close()` |

### 第三优先级 — 清理

| # | 文件 | 修复方案 |
|---|------|----------|
| P2-02 | `package.json` | `npm uninstall node-llama-cpp` |
| P2-01 | `download-model.ts` | 重定向深度限制（默认 5） |
| P2-04 | `ai-server.ts` | `presence_penalty` 降低到 1.0（标记需 A/B 测试） |

### 验证标准

- `npm run lint:server` 零 error
- `npm run ai` 启动正常，健康检查 `/api/health` 返回 200
- `curl` 测试 `/api/infer` 端点可用
- `npm run test:ai-stress` 通过
- `npm run test:regression` 64/64 通过
- `tsc --noEmit` 零错误

---

## 依赖关系

```
Step 1 (ESLint 配置，覆盖 src/ + server/)
  ↓
Step 2 (前端存量修复) ← 需要 Step 1 的 lint 验证
  |
Step 3 (后端存量修复) ← 需要 Step 1 的 lint，可与 Step 2 并行
  ↓
Step 4 (Hook) ← 需要 Step 1 的 eslint 可用
  |
Step 5 (SGE Skill，前端+后端) ← 可与 Step 2/3/4 并行
  |
Step 6 (单元测试) ← 可与 Step 2/3/4/5 并行
```
