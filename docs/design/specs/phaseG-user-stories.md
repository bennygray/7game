# Phase G — AI 觉醒 User Stories

> **Phase**：G | **SPM 日期**：2026-03-30
> **依赖**：Phase E soul-engine + Phase F0 event-bus + Phase F emotion-map

---

**Story #1 — 异步 AI 缓冲区** `[Complexity: M]`
> As 引擎, I want AI 调用异步执行且不阻塞 Tick, so that 游戏流畅性不受 AI 延迟影响.

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|:-----------:|
| AC1 | AI 后端在线 | SoulEvent 触发 AI 评估 | fallback 立即执行，AI 异步发射 | PRD §3.3 |
| AC2 | AI 调用完成 | 下一 tick 执行 ai-result-apply handler | 修正 delta = aiDelta - fallbackDelta，通过 clampDelta | PRD §3.3 |
| AC3 | AI 调用超时（>5s） | TTL 到期 | 静默丢弃，fallback 结果保留 | PRD §3.3 TTL_MS=10000 |
| AC4 | 同一 key 重复提交 | submit 被调用 | 第二次提交被忽略 | PRD §3.3 key 格式 |
| AC5 | pending 超过 50 | 新请求到达 | 最旧 pending 被驱逐 | PRD §3.3 MAX_PENDING=50 |

---

**Story #2 — AI 情绪评估接入** `[Complexity: M]`
> As 弟子灵魂, I want 事件触发 AI 情绪评估, so that 我的情绪反应基于性格而非随机.

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|:-----------:|
| AC1 | AI 在线 + Lv.2 事件触发 | soul-event handler 处理 | 提交 evaluateMonologue 到 asyncAIBuffer | PRD §3.2 |
| AC2 | AI 在线 + Lv.3 事件触发 | soul-event handler 处理 | 提交 evaluateEmotion 到 asyncAIBuffer | PRD §3.2 |
| AC3 | AI 离线 | 任意事件触发 | 仅 fallback 执行，无 AI 提交 | I3 |
| AC4 | 调用间隔 < 30s | canCall() 检查 | 跳过 AI 提交 | PRD §3.4 MIN_CALL_INTERVAL_MS |

---

**Story #3 — 宗门道风 Prompt 注入** `[Complexity: S]`
> As AI 评估器, I want prompt 自动包含宗门道风描述, so that AI 输出反映宗门文化.

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|:-----------:|
| AC1 | sect.ethos > 50 | 构建 prompt | prompt 包含 "宗门崇尚强者，弱肉强食" | PRD §3.6 |
| AC2 | sect.ethos < -50 | 构建 prompt | prompt 包含 "宗门以仁义为本，扶危济困" | PRD §3.6 |
| AC3 | sect.discipline > 50 | 构建 prompt | prompt 包含 "门规森严，不容逾矩" | PRD §3.6 |
| AC4 | ethos 和 discipline 均在 [-20, +20] | 构建 prompt | prompt 包含 "宗门风气中正平和" | PRD §3.6 |

---

**Story #4 — 特性 aiHint 注入** `[Complexity: S]`
> As AI 评估器, I want prompt 包含弟子特性描述, so that AI 能感知弟子的性格特点.

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|:-----------:|
| AC1 | 弟子有特性 "courageous" | 构建 soul-eval prompt | prompt 包含 courageous 的 aiHint | trait-registry |
| AC2 | 弟子有多个特性 | 构建 prompt | 所有特性的 aiHint 以分号连接 | — |
| AC3 | 构建 monologue prompt | AI 独白渲染 | prompt 同样包含 trait hints | — |

---

**Story #5 — 反派偏置修复** `[Complexity: M]`
> As 邪恶弟子, I want AI 不再默认选择善良选项, so that 我的行为符合性格设定.

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|:-----------:|
| AC1 | goodEvil < -20 | 构建 messages | 注入邪恶 few-shot 示例（2对） | PRD §3.10 |
| AC2 | goodEvil > 20 | 构建 messages | 注入善良 few-shot 示例（1对） | PRD §3.10 |
| AC3 | goodEvil < -30 | 构建行为动作池 | 移除 moralAlign='good' 的选项 | PRD §3.5 |
| AC4 | goodEvil > 30 | 构建行为动作池 | 移除 moralAlign='evil' 的选项 | PRD §3.5 |
| AC5 | 过滤后选项 < 2 | 构建行为动作池 | 不执行过滤，保留原始池 | PRD §3.5 |

---

**Story #6 — Lv.2 AI 独白渲染** `[Complexity: M]`
> As 玩家, I want Lv.2+ 事件触发 AI 个性化独白, so that 弟子的内心声音有差异.

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|:-----------:|
| AC1 | SPLASH 事件 + self 角色 | 评估完成 | 异步提交 evaluateMonologue | PRD §3.2 |
| AC2 | AI 独白返回 | ai-result-apply 执行 | MUD 日志显示 `[灵魂·AI]` 前缀的独白 | — |
| AC3 | AI 独白超时 | fallback innerThought 保留 | 不输出 AI 日志行 | I3 |

---

**Story #7 — Lv.3 AI 双阶段行为决策** `[Complexity: L]`
> As 弟子, I want 重大事件中做出符合性格的行为选择, so that 我不只是被动反应.

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|:-----------:|
| AC1 | STORM 事件触发 | soul-event handler | 提交 evaluateDecisionAndMonologue | PRD §3.2 |
| AC2 | Call1 成功 | 决策结果返回 | actionCode 在候选池 enum 内 | PRD §3.8, I5 |
| AC3 | Call1 超时 | 800ms 到期 | 整个请求失败，使用 fallback | PRD §3.4 |
| AC4 | Call1 成功 + Call2 超时 | 700ms 到期 | 使用 AI 决策 + fallback 独白 | PRD §3.4 |
| AC5 | actionCode 有效 | applyActionEffect 执行 | 关系 delta bonus 叠加到结果 | PRD §3.9 |
| AC6 | 两阶段总延迟 | P95 测量 | ≤ 1500ms | 验收标准 |
