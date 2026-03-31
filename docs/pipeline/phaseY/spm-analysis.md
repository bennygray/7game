# Phase Y — 前后端代码质量治理 · SPM 分析

> **创建日期**: 2026-03-31
> **更新日期**: 2026-03-31（扩展 scope 覆盖后端）
> **触发**: Phase X 前端 Review 23 项 + 后端 Review 15 项，且项目零自动化质量工具
> **目标**: 建立自动化 + 人工双层质量防线，前后端统一治理，杜绝同类问题再发

---

## 一、问题来源

### 前端（Phase X Review）

Phase X（α/β/γ）前端 Review 报告（`docs/pipeline/phaseX-gamma/code-review.md`）发现：

| 优先级 | 数量 | 典型问题 |
|--------|:----:|----------|
| P0 类型安全 | 4 | `as any` 强转、`window` 全局无类型 |
| P1 架构违规 | 5 | UI 层绕过 DI 直操 DOM/localStorage/GameState |
| P2 代码质量 | 8 | 模块状态不可测、逻辑重复、别名实现分裂 |
| P3 可维护性 | 6 | 魔法数字、CSS 单文件 738 行、纯函数零测试 |

### 后端（Phase Y 后端 Review）

后端 AI 推理服务 Review 报告（`docs/pipeline/phaseY/backend-code-review.md`）发现：

| 优先级 | 数量 | 典型问题 |
|--------|:----:|----------|
| P0 架构违规 | 3 | SoulEvaluator 直连 llama-server、端点命名违规、CORS 全开 |
| P1 稳定性 | 4 | 无崩溃恢复、请求体无限制、Windows SIGTERM、无优雅关闭 |
| P2 代码质量 | 5 | 无输入校验、未使用依赖、私有属性下标访问 |
| P3 可维护性 | 3 | 端口冲突、缺功能测试、无请求 ID |

> **注**: 后端 P0-01（SoulEvaluator 架构统一）影响面过大，已拆出为 **Phase Z** 独立处理。

### 合计

| | 前端 | 后端 | 合计 |
|---|:---:|:---:|:---:|
| P0 | 4 | 3 (1→Phase Z) | 6 |
| P1 | 5 | 4 | 9 |
| P2 | 8 | 5 | 13 |
| P3 | 6 | 3 | 9 |
| **总计** | 23 | 15 (14 in Y) | **37** |

**根因分析**（6 个根因）：
1. **接口设计不完整就开始编码** — 缺什么绕什么，产生 `as any`
2. **"在哪写"没有自动约束** — CLAUDE.md 有规则但无工具拦截
3. **拆文件没拆状态** — 模块级 `let`、不可取消的定时器
4. **质量门禁只覆盖 Engine** — 64 组回归全在 Engine 层，UI/后端零覆盖
5. **后端开发无 Review 环节** — 无 Code Review 流程，规范约束未落地
6. **架构设计时未统一 AI 通信路径** — SoulEvaluator 直连 llama-server（→ Phase Z）

---

## 二、现状诊断

### 当前质量防线（3 层，均有缺口）

| 层 | 工具 | 覆盖 | 缺口 |
|:--:|------|------|------|
| 1 | `tsc --strict` | 类型检查 | `as any` 合法通过 |
| 2 | Trinity Pipeline Review | 架构/需求/实现 | 纯人工，赶工期失效 |
| 3 | `npm run test:regression` | Engine 公式 | UI 层 + 后端零覆盖 |

### 项目当前工具链

- **已有**: TypeScript strict, Vite, tsx
- **未有**: ESLint, Prettier, Husky, CI/CD, SonarQube
- **未有**: Claude Code PostToolUse Hook
- **未有**: ESLint MCP Server

---

## 三、行业调研结论

### 可直接采用的工具（按问题映射）

| Phase X 问题 | 工具/规则 | 成熟度 | 安装成本 |
|-------------|-----------|:------:|:--------:|
| `as any` 强转 | `@typescript-eslint/no-explicit-any` | ★★★★★ | 极低 |
| `as any` 传播 | `@typescript-eslint/no-unsafe-*`（5 条规则） | ★★★★★ | 低 |
| UI 层越界 | `eslint-plugin-import/no-restricted-paths` | ★★★★★ | 低 |
| 重复代码 | `eslint-plugin-sonarjs`（no-identical-functions） | ★★★★ | 低 |
| setTimeout 泄漏 | `eslint-plugin-clean-timer` | ★★★ | 极低 |
| innerHTML 安全 | `eslint-plugin-no-unsanitized`（Mozilla） | ★★★★ | 低 |
| 魔法数字 | `@typescript-eslint/no-magic-numbers` | ★★★★ | 低 |
| 认知复杂度 | `sonarjs/cognitive-complexity` | ★★★★ | 随 sonarjs |

### 推荐 ESLint 配置方案

```
typescript-eslint strictTypeChecked  ← 基础（含全部 no-unsafe-* 规则）
  + eslint-plugin-import             ← 模块边界强制
  + eslint-plugin-sonarjs             ← 重复/复杂度
  + eslint-plugin-clean-timer         ← 定时器清理
```

### Claude Code 集成方案

1. **PostToolUse Hook**: 每次 Edit/Write 自动 lint 当前文件
2. **ESLint MCP Server**（`@eslint/mcp`）: 官方 MCP，可在 Claude Code 中直接调用
3. **SGE Skill 增强**: Gate 3 追加 Code Quality Checklist

---

## 四、Phase Y 范围定义

### 交付物

| # | 交付物 | 类型 | 说明 |
|---|--------|------|------|
| Y-1 | ESLint 配置 | 代码 | `eslint.config.js` + 依赖安装（覆盖 `src/` + `server/`） |
| Y-2 | npm 脚本 | 代码 | `npm run lint` / `npm run lint:fix` / `npm run lint:server` |
| Y-3 | Claude Code Hook | 配置 | PostToolUse 自动 lint |
| Y-4 | SGE Skill 增强 | 文档 | Gate 3 前端 + 后端 Code Quality Checklist |
| Y-5 | Phase X 前端存量修复 | 代码 | 修复前端 Review 报告中 P0+P1 共 9 项 |
| Y-6 | mud-formatter 单元测试 | 代码 | 纯函数测试覆盖 |
| Y-7 | 后端合规修复 | 代码 | CORS localhost only + 端点重命名 `/api/infer` + 输入校验 |
| Y-8 | ai-server 稳定性加固 | 代码 | 崩溃自动恢复 + graceful shutdown + Windows SIGTERM 兼容 |
| Y-9 | ESLint 后端覆盖 | 代码 | `server/` 从 ignores 移除，添加后端专用规则 |
| Y-10 | SGE 后端 Quality Gate | 文档 | 后端架构合规 + 稳定性 + 输入校验 checklist |

### 明确排除

- Prettier（当前代码风格一致性可接受，后续按需引入）
- Husky pre-commit hook（先跑通 lint，稳定后再加 hook）
- CI/CD pipeline（不在 lite 范围内）
- SonarQube / DeepSource（重量级，不适合 lite）

### 不变量

- 64 组回归测试不受影响
- 13 个 Handler 不修改
- GameState v5 存档格式不变
- 不引入新的运行时依赖（ESLint 纯 devDependency）

---

## 五、建议执行顺序

```
Step 1: ESLint 基础配置（Y-1 + Y-2 + Y-9）
  → 安装依赖 + 配置 strictTypeChecked + 插件
  → 覆盖 src/ + server/（后端专用规则区块）
  → 首次 lint 观察错误数量，决定 error/warn 级别

Step 2: 前端存量修复（Y-5）
  → 消除所有 as any（P0）
  → 修复架构违规（P1）
  → lint 零 error 通过

Step 3: 后端存量修复（Y-7 + Y-8）
  → CORS/端点/输入校验（Y-7）
  → 崩溃恢复/graceful shutdown/Windows 兼容（Y-8）
  → 清理 node-llama-cpp、重定向深度限制
  → lint 零 error 通过

Step 4: Claude Code Hook（Y-3）
  → 配置 PostToolUse 自动 lint（覆盖 src/ + server/）
  → 验证编辑文件后自动检查

Step 5: SGE Skill 增强（Y-4 + Y-10）
  → Gate 3 追加前端 Code Quality Checklist
  → Gate 3 追加后端 Code Quality Gate
  → 覆盖 lint 无法检测的语义问题

Step 6: 单元测试（Y-6）
  → mud-formatter 纯函数测试
  → 添加 npm run test:ui 脚本
```

---

## 六、风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| ESLint strictTypeChecked 首次扫描错误过多 | 心理压力 | 分批修复，先 warn 后 error |
| `no-magic-numbers` 误报多 | 开发体验差 | 精心配置 ignore 列表 |
| PostToolUse Hook 拖慢 Claude Code | 编辑卡顿 | 单文件 lint < 500ms，超时跳过 |
| 存量修复引入回归 | 功能破坏 | 每步跑 `npm run test:regression` |

---

## 七、参考文件

- Phase X 前端 Review 报告: `docs/pipeline/phaseX-gamma/code-review.md`
- Phase Y 后端 Review 报告: `docs/pipeline/phaseY/backend-code-review.md`
- 后端修复追踪: `docs/pipeline/phaseY/backend-review-fix-task.md`
- Phase Z SPM 分析: `docs/pipeline/phaseZ/spm-analysis.md`
- 现有编码规范: `CLAUDE.md` + `.agents/AGENTS.md §3.2`
- 现有回归测试: `scripts/regression-all.ts`
- SGE Skill: `.agents/skills/engineer/SKILL.md`
- Review 协议: `.agents/skills/_shared/review-protocol.md`
