# 7game-lite 集成验证检查清单 (Phase IV Step 9)

> **创建日期**：2026-03-28
> **覆盖范围**：Phase A 核心循环 (Story #1 ~ #5)
> **AI 验证策略**：仅验证 Fallback 模式（基于 USER 指令）

## 验证门禁执行记录

### V1 & V2: 构建与类型检查

**IDENTIFY**: 运行 `npm run build` (包含 `tsc && vite build`)
**RUN**: `npm run build`
**READ**:  tsc 编译无错误，vite 输出 15 modules transformed
**VERIFY**: 编译通过，产物生成成功
**CLAIM**:  ✅ 通过

### V3 & V4: 数值公式与突破阻断

**IDENTIFY**: 检查 `src/shared/formulas/` 下的独立公式调用，启动浏览器模拟挂机和突破。
**RUN**: 浏览 `http://localhost:5173` 观察 MUD 面板灵气增长，执行 `bt` 命令。
**READ**:  浏览器中灵气稳定每秒 +1.0，输入 `bt` 提示灵气不足无法突破。
**VERIFY**: 增长公式正确，引擎驱动正常，条件边界阻断正常。
**CLAIM**:  ✅ 通过

### V5 & V6: UI 与核心系统 (MUD 面板 & 弟子行为)

**IDENTIFY**: 浏览器 Smoke Test。观察日志生成、持久化、弟子行为多样性。
**RUN**:
1. 输入 `status`, `help` 等命令验证返回。
2. 观察 MUD 面板日志生成。
3. 检查 localStorage 序列化。
**READ**:  `status` 正确获取状态，F5 刷新后数值保留，弟子持续变更行为表现出多样性任务（打坐、历练、休息等）。
**VERIFY**: UI 命令系统正常，状态机和存储机制有效流转。
**CLAIM**:  ✅ 通过

### V7 & V8: AI 灵智 Fallback

**IDENTIFY**: 不启动 Qwen 模型后端，仅依赖预设词库与 `SmartLLMAdapter` 的降级功能。
**RUN**: 观察弟子行为变动时（从 IDLE 切出），MUD 面板输出的话语特征。
**READ**:  生成了基于 fallback 词库结合性格的话语，如"躺会儿了？反正也懒得练了……"，未影响主线程和行为树执行。
**VERIFY**: Fallback 降级逻辑可靠。
**CLAIM**:  ✅ 通过
