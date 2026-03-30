# Phase G — AI 觉醒 (PRD)

> **Phase**：G（感知层+决策层 AI 接入）
> **SPM 分析日期**：2026-03-30
> **前置**：Phase F0 ✅ + Phase F ✅ + Phase H-α ✅
> **范围**：AI 从实验代码变为生产系统
> **索引**：[MASTER-PRD](../project/MASTER-PRD.md) | [SOUL-VISION-ROADMAP](../project/SOUL-VISION-ROADMAP.md)

---

## §1 系统不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | **AI 不直接写 GameState** — soul-engine 作为中介校验所有 AI 输出 | AI 幻觉直接破坏游戏状态 |
| I2 | **AI 调用不阻塞 Tick** — 异步 fire-and-forget，fallback 即时执行 | 游戏卡顿 10s+，核心体验崩溃 |
| I3 | **AI 离线时 fallback 正常** — 所有功能在无 AI 后端时降级运行 | 玩家无法游玩 |
| I4 | **delta 硬上限 [-5, +5]** — clampDelta 对 AI 输出强制裁剪 | 单次事件摧毁关系图 |
| I5 | **候选池硬约束** — json_schema enum 限制 AI 选项在候选池内 | AI 产出非法标签 |
| I6 | **零存档迁移** — 不引入新持久化字段 | 破坏存档兼容性 |

---

## §2 价值锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | "每个弟子的反应都符合他的性格" — 刚烈弟子怒而拔剑，胆小弟子避而远之 |
| **5-Why 根因** | AI 评估是灵魂数据→可感知个性的唯一变换层 |
| **最小组件** | AsyncAIBuffer + 情绪评估接入（G0+G1） |
| **ROI** | 成本 **M**（6 新文件 + 5 修改） / 体验增量 **5/5**（核心差异化兑现） |
| **循环挂载** | 事件源(F0)→灵魂评估(E/F)→**AI 增强(G)**→MUD 呈现(H-α)→玩家感知 |

---

## §3 规则与数值边界

### 3.1 业务实体

**G0: 异步 AI 缓冲区**

| 实体 | 说明 |
|------|------|
| AsyncAIBuffer | 异步 AI 请求队列，存放 pending/completed 结果 |
| FallbackSnapshot | fallback 评估快照，用于计算修正 delta |
| CompletedAIResult | 已完成的 AI 结果条目（含 key、aiResult、fallbackSnapshot） |

**G1: 灵魂评估器**

| 实体 | 说明 |
|------|------|
| SoulEvaluator | 中央 AI 评估服务，包装所有 AI 调用模式 |
| StructuredCompletionConfig | LLM 结构化补全请求配置 |

**G3: 反派偏置修复**

| 实体 | 说明 |
|------|------|
| FewShotPair | few-shot 示例对（user + assistant） |

**G4: 行为决策**

| 实体 | 说明 |
|------|------|
| ActionOption | 动作候选项（code + label + moralAlign） |
| ActionEffect | 动作效果（关系 delta 加成 + 日志描述） |

### 3.2 Severity 路由规则（R-G-01）

| 事件严重度 | AI 调用模式 | 调用频率 |
|-----------|-----------|---------|
| Lv.0 BREATH | 无（纯氛围文案） | N/A |
| Lv.1 RIPPLE | fallback only | ~15/h |
| Lv.2 SPLASH | fallback + 异步 AI 独白（Call2） | ~10/h |
| Lv.3 STORM | fallback + 异步 AI 双阶段（Call1 决策 + Call2 独白） | ~3/h |
| Lv.4 CALAMITY | 保留（未实装） | N/A |

**事件 severity 判定（R-G-02）**：

| 事件类型 | 默认 severity |
|---------|:------------:|
| world-event | 从 metadata.severity 读取 |
| breakthrough-success/fail | Lv.2 SPLASH |
| encounter-conflict | Lv.2 SPLASH |
| 其他 (alchemy/harvest/meditation/...) | Lv.1 RIPPLE |

### 3.3 AsyncAIBuffer 参数（R-G-03）

| 参数 | 值 | 说明 |
|------|:--:|------|
| TTL_MS | 10,000 | 超时结果自动丢弃 |
| MAX_PENDING | 50 | 最大 pending 请求数（FIFO 驱逐） |
| Key 格式 | `${timestamp}:${discipleId}` | 防重复提交 |

### 3.4 SoulEvaluator 参数（R-G-04）

| 参数 | 值 | 说明 |
|------|:--:|------|
| MIN_CALL_INTERVAL_MS | 30,000 | 最小 AI 调用间隔（限速） |
| emotion eval timeout | 5,000ms | Lv.2+ 情绪评估超时 |
| decision call timeout | 800ms | Lv.3 Call1 决策超时 |
| monologue call timeout | 700ms | Lv.3 Call2 独白超时 |
| temperature | 0.6 | poc-2e 验证的最佳值 |
| max_tokens（eval） | 200 | 情绪评估 |
| max_tokens（monologue） | 150 | 独白渲染 |

### 3.5 道德感知候选池过滤（R-G-05）

| 弟子 goodEvil | 过滤规则 |
|:------------:|---------|
| > +30 | 移除 moralAlign='evil' 的动作选项 |
| < -30 | 移除 moralAlign='good' 的动作选项 |
| [-30, +30] | 不过滤 |

**约束**：过滤后至少保留 2 个选项，否则不过滤。

### 3.6 宗门道风描述映射（R-G-06）

| ethos 范围 | 描述 |
|-----------|------|
| > +50 | "宗门崇尚强者，弱肉强食" |
| (+20, +50] | "宗门风气偏向刚猛" |
| [-20, +20] | （不输出道风描述） |
| [-50, -20) | "宗门风气偏向温和" |
| < -50 | "宗门以仁义为本，扶危济困" |

| discipline 范围 | 描述 |
|----------------|------|
| > +50 | "门规森严，不容逾矩" |
| (+20, +50] | "门规较为严格" |
| [-20, +20] | （不输出门规描述） |
| [-50, -20) | "门规较为宽松" |
| < -50 | "门风自由，弟子各行其是" |

### 3.7 道德描述映射（R-G-07）

| goodEvil 范围 | 描述 |
|:------------:|------|
| > +50 | "你心怀正义，以善为本" |
| (+20, +50] | "你心性偏善" |
| [-20, +20] | （不输出） |
| [-50, -20) | "你心性偏恶" |
| < -50 | "你内心阴暗，行事不择手段" |

| lawChaos 范围 | 描述 |
|:------------:|------|
| > +50 | "恪守规矩" |
| (+20, +50] | "倾向守序" |
| [-20, +20] | （不输出） |
| [-50, -20) | "略显散漫" |
| < -50 | "无视规矩，随心所欲" |

### 3.8 动作候选池（R-G-08）

**战斗类（妖兽来袭等）**：

| code | label | moralAlign |
|------|-------|:----------:|
| FIGHT | 挺身迎战 | neutral |
| PROTECT | 保护弱小同门 | good |
| FLEE | 趁乱逃跑 | neutral |
| LOOT | 趁乱捡拾战利品 | evil |
| HIDE | 躲起来观望 | neutral |

**社交类（散修来访/宗门活动等）**：

| code | label | moralAlign |
|------|-------|:----------:|
| WELCOME | 热情迎接 | good |
| OBSERVE | 冷眼旁观 | neutral |
| CHALLENGE | 出言挑衅 | evil |
| TRADE | 尝试交易 | neutral |
| REPORT | 向长老禀报 | neutral |

**机缘类（天材地宝/灵脉波动等）**：

| code | label | moralAlign |
|------|-------|:----------:|
| SHARE | 与同门分享 | good |
| SEIZE | 独吞机缘 | evil |
| EXPLORE | 谨慎探索 | neutral |
| GUARD | 守护现场等长老 | good |
| IGNORE | 视而不见 | neutral |

**冲突类（碰面冲突等）**：

| code | label | moralAlign |
|------|-------|:----------:|
| CONFRONT | 正面对峙 | neutral |
| MEDIATE | 出面调解 | good |
| PROVOKE | 火上浇油 | evil |
| RETREAT | 退让避让 | neutral |
| SABOTAGE | 暗中使绊 | evil |

**世界事件 ID → 动作池映射**：

| 事件 ID 前缀 | 动作池 |
|-------------|-------|
| beast- | 战斗类 |
| wandering-/merchant-/sect-master-/incense-/philosophical- | 社交类 |
| spirit-herb-/ancient-artifact-/spiritual-vein- | 机缘类 |

### 3.9 动作效果表（R-G-09）

| code | relationshipDeltaBonus | logSuffix |
|------|:---------------------:|-----------|
| FIGHT | +1 | 挺身迎战 |
| PROTECT | +3 | 保护同门 |
| FLEE | -1 | 趁乱逃跑 |
| LOOT | -2 | 趁乱捡拾 |
| SHARE | +3 | 与同门分享 |
| SEIZE | -3 | 独吞机缘 |
| MEDIATE | +2 | 出面调解 |
| PROVOKE | -3 | 火上浇油 |
| SABOTAGE | -3 | 暗中使绊 |
| *(其他)* | 0 | *(对应 label)* |

### 3.10 Few-Shot 示例设计原则（R-G-10）

| 原则 | 说明 |
|------|------|
| 事件类型隔离 | 示例使用不同事件类型于实际 prompt，防"标签劫持" |
| 道德阵营对齐 | goodEvil < -20 注入邪恶示例；> +20 注入善良示例 |
| 数量限制 | 最多 2-3 对示例（控制 token 消耗） |

### 3.4 MECE 校验结果

- **独立性** ✅：G0(异步基础) / G1(评估接入) / G2(独白) / G3(偏置修复) / G4(决策) / G5(道风) / G6(特性) 各模块职责无重叠
- **完全性** ✅：五级 severity 全覆盖（Lv.0 无事件 / Lv.1 fallback / Lv.2 AI独白 / Lv.3 AI决策 / Lv.4 保留）
- **Fallback 完整性** ✅：AI 离线时所有路径都有 fallback（I3 保证）

---

## §4 User Stories 索引

| 文件 | Phase | Story 数 | 覆盖范围 |
|------|:-----:|:--------:|---------|
| `phaseG-user-stories.md` | G | 7 | G0~G6 全覆盖 |

---

## §5 Pre-Mortem 分析

| # | 失败原因 | 预警信号 | 缓解措施 | 风险等级 |
|---|---------|---------|---------|:--------:|
| 1 | AI 延迟超 P95 预算 | STORM 事件修正到达延迟 >2s | 分阶段 timeout + fallback 先行 | 🟡 |
| 2 | 反派偏置修复不彻底 | 邪恶弟子仍选善良选项 >30% | few-shot + 候选池物理过滤双保险 | 🟡 |
| 3 | AsyncAIBuffer 内存泄漏 | pending 数量持续增长 | TTL GC + MAX_PENDING 驱逐 | 🟢 |
| 4 | json_schema 不兼容新 LLM server | 连接时报错 | tryConnect 检测能力，失败保持 fallback | 🟡 |
| 5 | 修正 delta 计算导致关系震荡 | 关系值在 fallback/AI 间反复跳变 | clampDelta 对修正 delta 同样生效 | 🟢 |

---

## §6 假设审计

| # | 假设 | 错误后果 | 风险 | 验证方式 | 何时验证 |
|---|------|---------|:----:|---------|---------|
| 1 | llama-server 在 127.0.0.1:8080 可用 | AI 功能全部降级 | 🟢 | tryConnect 自动检测 | 运行时 |
| 2 | poc-2e 的 75% 准确率在生产中可复现 | 决策质量低于预期 | 🟡 | G7 多轮验证 | 实游测试 |
| 3 | 30s 限速足以控制 AI 调用频率 | 调用过多导致 LLM server 过载 | 🟢 | 监控 pending count | 实游测试 |
| 4 | Deferred Correction 模式用户无感知 | 日志出现 fallback→AI "闪烁" | 🟡 | AI 独白以独立日志行输出 | 实游测试 |

---

## §7 Party Review 报告

### R1 魔鬼 PM

| 维度 | 判定 | 说明 |
|------|:----:|------|
| 需求完整性 | ✅ | G0~G6 全量覆盖，severity 路由清晰 |
| 用户价值 | ✅ | 核心差异化兑现，直接对接 MASTER-PRD §1.3 假设 #3 |
| 范围控制 | ✅ | 零存档迁移，纯增量代码 |
| 边界情况 | ⚠️ | Lv.4 CALAMITY 路径未实装——当前无 Lv.4 事件产出，可接受 |

### R3 数值策划

| 维度 | 判定 | 说明 |
|------|:----:|------|
| 参数完整性 | ✅ | 所有 timeout/TTL/interval 均有明确数值 |
| 候选池平衡 | ✅ | 每类 4-5 个选项，善/中/恶分布合理 |
| 公式验证 | ✅ | correctionDelta = aiDelta - fallbackDelta，clampDelta 保护 |
| 调参空间 | ✅ | MIN_CALL_INTERVAL_MS / timeout 可独立调整 |
| 边界值 | ✅ | 道德/道风描述阈值 ±20/±50 有清晰映射表 |
| 数值漏洞 | ⚠️ | actionEffect 的 delta bonus 未经 Monte Carlo 验证——数值在 [-3, +3] 范围内风险可控 |
| MECE | ✅ | severity 五级全覆盖 |

### R5 偏执架构师

| 维度 | 判定 | 说明 |
|------|:----:|------|
| 不变量完整性 | ✅ | I1~I6 覆盖安全、性能、兼容三层 |
| 技术可行性 | ✅ | poc-2e 已验证核心路径 |
| 依赖安全 | ✅ | 零新外部依赖，仅 fetch API |
| 回退安全 | ✅ | AI 全链路 fallback 保证（I3） |
| 竞态防护 | ✅ | AsyncAIBuffer key 去重 + TTL GC + MAX_PENDING |

**最终判定**：✅ PASS（2 个 WARN 均为可接受风险）

---

## §8 USER Approval

- [x] USER 已审阅 PRD
- [x] USER 已确认 User Stories
- [x] Party Review 无 BLOCK 项

签章：`[x] GATE 1 PASSED` — 2026-03-30

---

## 规格深度自检（Step 2.5）

| C# | 检查项 | 状态 | 证据锚点 |
|----|--------|:----:|---------|
| C1 | 实体全量枚举 | ✅ | §3.1 四组实体（G0/G1/G3/G4），§3.8 动作候选池全量 |
| C2 | 规则映射表 | ✅ | §3.2 severity 路由表，§3.5 道德过滤规则，§3.8 事件→动作池映射 |
| C3 | 公式全参数 | ✅ | §3.3 buffer 参数，§3.4 evaluator 参数（timeout/temperature/tokens） |
| C4 | 阈值/标签表 | ✅ | §3.6 道风描述 5 档，§3.7 道德描述 5 档，§3.5 goodEvil ±30 过滤阈值 |
| C5 | Fallback 文案 | ⬜ | 不适用 — fallback 文案已在 Phase E emotion-pool/fallback-lines 中定义 |
| C6 | 效果数值表 | ✅ | §3.9 动作效果表（delta bonus + logSuffix 全量） |

---

## 变更日志

| 日期 | 级别 | 变更内容 | 影响范围 | 回退到 | 批准人 |
|------|------|----------|----------|--------|--------|
| 2026-03-30 | 初始 | Phase G PRD 创建（追溯性文档，代码已实施） | G0~G6 | — | — |
