# Phase H-γ 掌门裁决 — SPM 分析过程

> **日期**：2026-03-31 | **版本**：v1.0

---

## Step 0：Bootstrap

- 已读：project.yaml、MASTER-PRD、MASTER-ARCHITECTURE、handoff.md、SOUL-VISION-ROADMAP V3.4、soul-vision-gap-analysis V3.2
- 已读：feature-backlog（FB-011 玩家干预权缺失 → 本次清偿目标）
- 已读：economy.md、world-event-registry.ts、storyteller.ts、world-event.ts
- 已读：09-sect-alignment.md（道风漂移规则来源）、07-event-density-severity.md（五级分级来源）

## Step 1：第一性原理解构

### 5-Why

1. 为什么需要玩家干预？→ 玩家只能看不能做，掌门是空壳
2. 为什么掌门角色重要？→ 没有裁决，冲突全自动结算，无参与感
3. 为什么参与感重要？→ 从"挂机模拟器"到"经营游戏"的本质差异
4. 为什么经营需要干预？→ 核心假设"裁决塑造气质"从未被验证
5. 根因 → 道风数据从未被玩家操作改变过

### 决策记录

| Q | 选择 | 理由 |
|---|------|------|
| Q1 触发范围 | A（仅 Lv.3 STORM） | 最小可行，验证闭环 |
| Q2 UI 形态 | A（MUD 命令式） | 与现有 look/inspect/sect 一致 |
| Q3 范围控制 | A（H4+H6，H5 拆分） | 先闭环再补卷宗 |

## Step 2：规则与数值

见 PRD §3~§8，含完整裁决注册表（12 条）、漂移公式、MUD 交互协议。

## Step 2.5：规格深度自检

C1~C6 全部 ✅（见主对话记录）。

## Step 3：User Stories

6 Stories / 16 ACs，见 phaseH-gamma-user-stories.md。
