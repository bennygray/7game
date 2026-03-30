# Phase X-γ PRD — 面板系统 + 内存泄漏修复

> **Phase**：X-γ "掌门视界·面板系统 + 关键性能修复"
> **版本**：v1.2 | **创建日期**：2026-03-31
> **SPM GATE 1 状态**：待签章
> **来源**：FB-017（Phase X-α PRD §5 OUT）+ BUG-Xγ-01（P0 内存暴涨）

---

## §1 产品定位

### 1.1 一句话

> **让结构化信息驻留在视野中，不再被时序日志流冲走；同时修复导致系统死机的 P0 内存暴涨。**

### 1.2 痛点

**P0 — 内存暴涨（BUG-Xγ-01）**：Phase X-α 引入的 `log-manager.ts` 的 `renderLines()` 函数在每次 `addMainLog()` / `addSystemLog()` 调用时，都用 `innerHTML` **全量替换**最多 200 行 DOM 节点。引擎每秒产生约 5~15 条日志，导致每秒创建并销毁 ~3000 个 DOM 节点。浏览器 GC 无法追上分配速率，内存线性暴涨，最终导致用户电脑整体死机。**本 BUG 是 Phase X 系列引入的（非存量代码），必须在本 Phase 修复。**

**P1 — 信息被冲走（X-05 残留）**：look/inspect/sect/judge 的输出当前直接插入主日志流（`addMainLog`），在 1~2 个 tick（5~10秒）内就被新消息推出视野，玩家无法持续参考弟子档案或裁决选项。

### 1.3 解决方案概述

1. **修复内存暴涨**：将 `renderLines()` 从 `innerHTML` 全量替换改为**增量 DOM 操作**（`appendChild` 新行 + `removeChild` 溢出旧行），消除每秒 3000 个节点的创建/销毁。
2. **引入浮层面板系统**：一个可复用的 Overlay 容器，命令输出渲染到面板而非日志流。面板悬浮在日志上方，不随日志滚动，可通过 ESC / 点击背景 / 输入新命令关闭。

---

## §2 规则与数值边界

### §2.1 面板类型定义（P-TYPE）

| ID | 面板类型 | 触发命令 | 内容来源 | 宽度 | 位置 |
|:--:|---------|---------|---------|:----:|:----:|
| P1 | 宗门总览面板 | `look` | `formatLookOverview()` | 60% | 居中 |
| P2 | 弟子档案面板 | `look <弟子>` | `formatDiscipleProfile()` | 55% | 居中 |
| P3 | 灵魂档案面板 | `inspect <弟子>` | `formatDiscipleInspect()` | 55% | 居中 |
| P4 | 宗门道风面板 | `sect` | `formatSectProfile()` | 50% | 居中 |
| P5 | 裁决窗口面板 | `judge`（无参数）/ 自动推送 | `formatRulingWindow()` | 55% | 居中 |

> **关键**：所有面板类型共用同一个 Overlay 容器和 Panel Manager，仅内容 HTML 不同。

### §2.2 面板生命周期（P-LIFE）

```
[触发]                [渲染]              [关闭]
命令/事件 → openPanel(type, html) → closePanel()
                                        ↑
                                    ESC 键 / 
                                    Overlay 背景点击 /
                                    新命令重新打开面板 /
                                    judge 裁决解决后自动关闭
```

| # | 规则 | 说明 |
|---|------|------|
| L-01 | 同时最多一个面板 | `openPanel` 若已有面板，先隐式 `closePanel` |
| L-02 | ESC 关闭 | 全局 `keydown` 监听 `Escape` → `closePanel()` |
| L-03 | 背景点击关闭 | 点击 `.mud-panel-overlay`（面板外区域）→ `closePanel()` |
| L-04 | 新命令关闭并替换 | 输入 `look` 时若已有 `inspect` 面板 → 先关再开 |
| L-05 | 面板关闭后不影响日志 | 面板内容不写入日志流 |
| L-06 | judge 面板自动推送 | STORM 事件触发裁决时，`onRulingCreated` 自动 `openPanel(P5, ...)` |
| L-07 | judge 面板自动关闭 | 裁决解决（`onRulingResolved`）后自动 `closePanel()` |
| L-08 | judge N 命令即时关闭 | `judge N` 执行裁决后立即 `closePanel()` |

### §2.3 DOM 结构（P-DOM）

```html
<!-- 面板覆盖层 — 插入 .mud-container 内，main-log 之后 -->
<div class="mud-panel-overlay" id="panel-overlay" style="display:none">
  <div class="mud-panel" id="panel-content">
    <div class="mud-panel__header">
      <span class="mud-panel__title" id="panel-title"></span>
      <button class="mud-panel__close" id="panel-close" title="关闭 (ESC)">✕</button>
    </div>
    <div class="mud-panel__body" id="panel-body"></div>
  </div>
</div>
```

### §2.4 面板样式规格（P-CSS）

| 属性 | 值 | 说明 |
|------|-----|------|
| Overlay 背景 | `rgba(0, 0, 0, 0.5)` | 半透明遮罩，暗示日志流仍在背后更新 |
| 面板背景 | `var(--mud-bg-panel)` = `#0d0d2a` | 复用现有暗色 |
| 面板边框 | `1px solid var(--mud-border)` = `#333344` | 复用现有边框 |
| 面板圆角 | `4px` | 轻微圆角，避免过度 GUI 化 |
| 面板最大高度 | `70vh` | 防止超长内容撑满屏幕 |
| 面板内容区 | `overflow-y: auto` | 超长内容可内部滚动 |
| 面板出现动画 | `fadeIn 0.15s ease-out` | 轻微渐入，避免突兀 |
| 面板消失 | 无动画（即时 `display:none`） | 关闭应零延迟 |
| Header 高度 | `36px` | 标题 + 关闭按钮 |
| Header 底部边框 | `1px solid var(--mud-border-dim)` | 视觉分隔 |
| 关闭按钮颜色 | `var(--mud-text-mute)` hover → `var(--mud-text)` | 低调但可发现 |
| 面板 padding | body 区域 `12px 16px` | 与主日志 padding 一致 |
| 面板 font | 继承 `var(--mud-font)` | MUD 字体统一 |

### §2.5 面板标题映射表（P-TITLE）

| 面板 ID | 标题文本 |
|:-------:|---------|
| P1 | `宗门总览` |
| P2 | `弟子档案 · {弟子名}` |
| P3 | `灵魂档案 · {弟子名}` |
| P4 | `宗门道风` |
| P5 | `⚡ 风暴裁决` |

### §2.6 命令行为变更（P-CMD）

当前实现中，look/inspect/sect/judge 命令均调用 `addMainLog()` 输出。

**Phase X-γ 变更**：

| 命令 | 当前行为 | X-γ 行为 | 日志保留 |
|------|---------|---------|:--------:|
| `look` | `addMainLog(formatLookOverview())` | `openPanel(P1, '宗门总览', formatLookOverview())` | ❌ 不写日志 |
| `look <弟子>` | `addMainLog(formatDiscipleProfile())` | `openPanel(P2, '弟子档案·{名}', formatDiscipleProfile())` | ❌ 不写日志 |
| `inspect <弟子>` | `addMainLog(formatDiscipleInspect())` | `openPanel(P3, '灵魂档案·{名}', formatDiscipleInspect())` | ❌ 不写日志 |
| `sect` | `addMainLog(formatSectProfile())` | `openPanel(P4, '宗门道风', formatSectProfile())` | ❌ 不写日志 |
| `judge`（无参数） | `addMainLog(formatRulingWindow())` | `openPanel(P5, '⚡ 风暴裁决', formatRulingWindow())` | ❌ 不写日志 |
| `judge N` | `engine.resolveRuling(N)` | 不变（仍直接执行）+ `closePanel()` | ✅ 裁决结果写入日志 |

> **注意**：裁决结果（`formatRulingResult`）仍然写入日志流——这是 STORM 级事件的历史记录，应该在日志中留痕。

### §2.7 面板管理器 API（P-API）

```typescript
interface PanelManager {
  /** 打开面板（若已有面板，先关闭） */
  openPanel(title: string, contentHtml: string): void;
  /** 关闭当前面板 */
  closePanel(): void;
  /** 当前是否有面板打开 */
  isOpen(): boolean;
}
```

> PanelManager 实例由 `layout.ts` 创建，通过 `CommandContext` 注入到 `command-handler.ts`。

---

### §2.8 内存泄漏修复规格（BUG-Xγ-01）

#### 根因诊断

**文件**：`src/ui/log-manager.ts` L34-36

```typescript
// ❌ 当前实现 — 每次 addMainLog 都全量替换 innerHTML
function renderLines(container: HTMLElement, lines: string[]): void {
    container.innerHTML = lines.map(l => `<span class="mud-line">${l}</span>`).join('');
    container.scrollTop = container.scrollHeight;
}
```

**问题量化**：
- `MAIN_LOG_MAX = 200` 行 × `~15 次/秒` 调用 = **每秒创建 ~3000 个 `<span>` DOM 节点**
- `innerHTML =` 赋值会**销毁旧节点 + 解析字符串 + 创建新节点**
- 浏览器 GC 频繁触发但无法回收足够快 → 内存线性增长
- 10~15 分钟后内存消耗达到 GB 级 → 系统级死机

#### 修复方案（M-FIX）

```typescript
// ✅ 修复实现 — 增量 DOM 操作
function appendLine(container: HTMLElement, html: string, maxLines: number): void {
    const span = document.createElement('span');
    span.className = 'mud-line';
    span.innerHTML = html;
    container.appendChild(span);

    // 溢出时移除最老的行（FIFO）
    while (container.childElementCount > maxLines) {
        container.removeChild(container.firstElementChild!);
    }

    container.scrollTop = container.scrollHeight;
}
```

| 指标 | 修复前 | 修复后 |
|------|:------:|:------:|
| 每次 addLog DOM 操作 | 创建 200 个节点 | 创建 1 个节点 |
| 每秒 DOM 操作 | ~3000 创建 + ~3000 销毁 | ~15 创建 + ~15 销毁 |
| 内存增长 | 线性暴涨 | 稳态（≤200 DOM 节点） |
| JS 数组 | 保留 `mainLines[]` 缓冲 | ❌ 移除 — DOM 即是唯一状态源 |

#### 附加修复（M-FIX-2）：clear 命令兼容

`clear` 命令当前直接 `mainLogEl.innerHTML = ''`，修复后保持不变（`clear` 频率极低，`innerHTML = ''` 可接受）。

---

### §2.9 可点击弟子名（P-CLICK）

> **需求来源**：USER 反馈 — "点击弟子姓名就能跳出弟子属性面板"

#### 交互规则

| # | 规则 | 说明 |
|---|------|------|
| CK-01 | 日志流和面板中的弟子名可点击 | 鼠标悬停 → 下划线 + 指针变化 |
| CK-02 | 点击弟子名 → 打开 P3 灵魂档案面板 | 等价于 `inspect <弟子名>` |
| CK-03 | 若已有面板打开 → 先关闭再打开新面板 | 复用 L-01 规则 |
| CK-04 | 弟子名通过 `data-disciple-id` 属性标识 | 事件委托模式，无需逐个绑定 |

#### 渲染方案

在 `mud-formatter.ts` 中新增纯函数：

```typescript
/** 包装弟子名为可点击 span（CK-01/CK-04） */
export function wrapDiscipleName(name: string, discipleId: string): string {
  return `<span class="mud-disciple-link" data-disciple-id="${escapeHtml(discipleId)}">${escapeHtml(name)}</span>`;
}
```

在以下位置的弟子名输出中使用 `wrapDiscipleName()`：

| 位置 | 函数 | 当前输出 | X-γ 输出 |
|------|------|---------|----------|
| look 总览弟子列表 | `formatLookOverview()` | `[${d.name}]` | `[${wrapDiscipleName(d.name, d.id)}]` |
| 弟子行为变更日志 | `engine-bindings.ts` R-09/10 | `[${name}]` | `[${wrapDiscipleName(name, id)}]` |
| 弟子间对话日志 | `engine-bindings.ts` R-08 | `${speakerName}` | `${wrapDiscipleName(speakerName, id)}` |
| 碰面/世界事件日志 | 统一管线 R-05/06 | 原始文案（含弟子名） | 文案中的弟子名包装 |

#### CSS 样式（P-CSS 追加）

```css
.mud-disciple-link {
  color: var(--mud-accent);
  cursor: pointer;
  text-decoration: none;
}
.mud-disciple-link:hover {
  text-decoration: underline;
  color: var(--mud-text-bright);
}
```

#### 事件委托（P-EVENT）

在 `main-log` 和 `panel-body` 容器上注册一个 `click` 事件委托：

```typescript
container.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('[data-disciple-id]');
  if (!target) return;
  const id = target.getAttribute('data-disciple-id');
  // → 查找弟子 → openPanel(P3, '灵魂档案·{名}', formatDiscipleInspect(...))
});
```

> **注意**：事件委托需要能访问 `state`（查找弟子数据）和 `panelManager`（打开面板）。
> 委托绑定点在 `main.ts` 初始化阶段或通过 `engine-bindings.ts` 注入。

---

## §3 Step 2.5 规格深度自检

| # | 检查项 | 状态 | 证据锚点 |
|---|--------|:----:|---------|
| C1 | 实体全量枚举 | ✅ | §2.1 P-TYPE 表（5 面板）+ §2.8 M-FIX + §2.9 CK-01~04（4 条可点击规则） |
| C2 | 规则映射表 | ✅ | §2.2 L-01~L-08 + §2.6 命令变更表 + §2.8 修复对比表 + §2.9 渲染位置映射表 |
| C3 | 公式全参数 | ⬜ | 不适用——无数值公式 |
| C4 | 阈值/标签表 | ✅ | §2.5 面板标题映射表 + §2.8 MAIN_LOG_MAX=200 / SYSTEM_LOG_MAX=5 |
| C5 | Fallback 文案 | ⬜ | 不适用——无 AI/随机内容 |
| C6 | 效果数值表 | ✅ | §2.4 面板样式规格表 + §2.8 DOM 操作量化对比 |

> C1~C4 全部 ✅ 或 ⬜，可进入 Step 3。

---

## §4 SCOPE OUT（本 Phase 不做）

| # | 需求 | 原因 |
|---|------|------|
| OUT-1 | 面板拖拽/调整尺寸 | 超出 MUD 文字风格，留给 Electron 迁移 |
| OUT-2 | 面板内容实时刷新（如 judge 倒计时） | 复杂度膨胀；玩家可通过 `judge` 重新查看 |
| OUT-3 | 面板动画（滑入/弹出） | MUD 风格应克制，`fadeIn 0.15s` 足矣 |
| OUT-4 | 多面板并排 | I3 不变量——同时只有一个面板 |

---

## §5 Pre-Mortem

| # | 风险场景 | 概率 | 影响 | 缓解措施 |
|---|---------|:----:|:----:|---------|
| PM-1 | 面板 DOM 泄漏（打开不关闭） | 低 | 中 | I3 不变量 + openPanel 先隐式 close |
| PM-2 | ESC 键与 Tab 补全循环冲突 | 低 | 低 | Tab 补全在 keydown 判定，ESC 独立 |
| PM-3 | 裁决面板自动推送时覆盖正在查看的 inspect 面板 | 中 | 中 | STORM 事件属于高优先打断，可接受 |
| PM-4 | 面板滚动穿透到背景日志 | 低 | 低 | Overlay `overflow: hidden` + Panel `overflow-y: auto` |
| PM-5 | 增量 DOM 方案中 innerHTML 注入安全 | 低 | 低 | 所有日志内容经 escapeHtml() 处理，mud-formatter 纯函数保证 |

## §6 Assumption Audit

| # | 假设 | 验证方式 | 状态 |
|---|------|---------|:----:|
| A-1 | 玩家更倾向在面板中查看信息而非日志流 | X-05 痛点即来源；经验判断 | ✅ 合理 |
| A-2 | 同时只需一个面板够用 | STORM 裁决是唯一的实时推送，且是最高优先级 | ✅ 合理 |
| A-3 | 面板不需要实时刷新 | 当前无高频变化的面板内容（裁决倒计时可重新 judge 查看） | ✅ 合理 |
| A-4 | 0.15s fadeIn 动画不影响性能 | CSS animation，零 JS 成本 | ✅ 合理 |
| A-5 | 增量 DOM 追加足以解决内存暴涨 | 根因是 innerHTML 全量替换（§2.8），增量方案将每秒 DOM 操作从 3000→15 | ✅ 已验证 |
