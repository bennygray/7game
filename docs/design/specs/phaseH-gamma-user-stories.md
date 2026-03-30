# Phase H-γ — 掌门裁决 User Stories

> **版本**：v1.0 | **日期**：2026-03-31 | **作者**：/SPM
> **PRD**：[phaseH-gamma-PRD.md](../../features/phaseH-gamma-PRD.md)

---

**Story S1 — 裁决窗口触发** `复杂度: M`
> 作为掌门，我希望当 Lv.3 风暴事件发生时看到裁决选项，以便于对重大事件做出抉择。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| AC-01 | Storyteller 触发了 severity=STORM 的世界事件，且当前无活跃裁决 | 事件进入回调分发 | MUD 日志输出裁决窗口：包含事件名、事件文案、2~3 个编号选项（label + description）、剩余秒数提示 | PRD §4 R-06 |
| AC-02 | Storyteller 触发了 severity=STORM 的世界事件，但已有一个未结算的 ActiveRuling | 事件进入回调分发 | 不创建新裁决窗口，事件正常记录日志但无裁决选项 | PRD §4 R-01 排除条件 |
| AC-03 | Storyteller 触发了 severity < STORM 的世界事件 | 事件进入回调分发 | 不创建裁决窗口，事件正常流转 | — |

**依赖**：无

---

**Story S2 — judge 命令裁决** `复杂度: M`
> 作为掌门，我希望输入 `judge N` 命令做出裁决，以便于我的决策影响宗门道风。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| AC-04 | 存在活跃裁决，有 3 个选项 | 玩家输入 `judge 1` | 执行选项 1 的道风漂移（sect.ethos += ethosShift, sect.discipline += disciplineShift），MUD 输出选项 1 的 mudText，清除 ActiveRuling | PRD §4 R-05 |
| AC-05 | 存在活跃裁决，有 3 个选项 | 玩家输入 `judge 5` | MUD 输出 "无效选项，请输入 judge 1~3。"，ActiveRuling 保持不变 | PRD §4 R-06 |
| AC-06 | 不存在活跃裁决 | 玩家输入 `judge 1` | MUD 输出 "当前没有待裁决的事件。" | PRD §4 R-06 |
| AC-07 | 存在活跃裁决 | 玩家输入 `judge`（无参数） | MUD 重新输出当前裁决窗口（事件名 + 选项列表 + 剩余秒数） | PRD §4 R-06 |

**依赖**：Story S1

---

**Story S3 — 超时自动结算** `复杂度: S`
> 作为挂机玩家，我希望裁决窗口超时后自动结算且不惩罚我，以便于放置时不产生负面后果。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| AC-08 | 存在活跃裁决，创建于 300 秒前 | 下一次 tick 检查超时 | 随机选择一个选项（等概率），执行道风漂移，MUD 输出超时提示文案 + 被选选项的 mudText，清除 ActiveRuling | PRD §4 R-04, §7 F1~F3 |
| AC-09 | 裁决超时后 | 检查 sect.ethos 和 sect.discipline | 值已按被选选项的 shift 变化，且 clamp 在 [-100, 100] 范围内 | PRD §4 R-05 |

**依赖**：Story S1

---

**Story S4 — 道风漂移闭环** `复杂度: S`
> 作为掌门，我希望看到裁决后宗门道风的实际变化，以便于理解我的选择正在塑造宗门气质。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| AC-10 | 玩家完成了一次裁决（judge 命令成功） | 玩家输入 `sect` 命令 | sect 命令输出的道风/门规 ASCII 刻度尺数值与裁决前相比发生了对应方向的偏移 | — |
| AC-11 | sect.ethos 已经是 +100（边界值） | 玩家裁决选择 ethosShift=+1 的选项 | sect.ethos 保持 +100（clamp 不溢出），裁决正常完成，无报错 | PRD §4 R-05 |

**依赖**：Story S2

---

**Story S5 — 裁决选项匹配** `复杂度: S`
> 作为系统，当 STORM 事件触发时，裁决系统需要正确匹配选项来源，以便于每个事件都有合适的裁决选项。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| AC-12 | 触发的 STORM 事件 eventDefId 为 WE-B04 | 裁决系统查找选项 | 返回 3 个专属选项：RD-B04-1, RD-B04-2, RD-B04-3 | PRD §4 R-03 专属裁决表 |
| AC-13 | 触发的 STORM 事件 eventDefId 为 WE-B03（经漏斗升级到 STORM），polarity=negative | 裁决系统查找选项 | 无专属选项，fallback 到通用 negative 池：RD-GN-1, RD-GN-2, RD-GN-3 | PRD §4 R-03 通用裁决池 |
| AC-14 | 触发的 STORM 事件 polarity=positive（经漏斗升级） | 裁决系统查找选项 | fallback 到通用 positive 池：RD-GP-1, RD-GP-2, RD-GP-3 | PRD §4 R-03 通用裁决池 |

**依赖**：无

---

**Story S6 — 回归安全** `复杂度: S`
> 作为开发者，我需要确认新功能不破坏现有系统，以便于交付质量达标。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| AC-15 | Phase H-γ 代码合入后 | 运行 `npm run test:regression` | 64/64 回归测试全部通过 | — |
| AC-16 | Phase H-γ 代码合入后 | 运行 `npx tsc --noEmit` | TypeScript 编译零错误 | — |

**依赖**：Story S1~S5

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-31 | v1.0 | 初始创建：6 Stories / 16 ACs |
