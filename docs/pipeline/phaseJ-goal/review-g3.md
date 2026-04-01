# Phase J-Goal Gate 3 Review -- SGE Code Review

**Review Date**: 2026-04-01 | **Reviewer**: doc-reviewer (independent)
**Review Target**: Phase J-Goal SGE implementation (3 new + 10 modified + 1 verification)
**Consecutive All-PASS Count**: 0 (first Gate 3 review)

**TDD**: `docs/design/specs/phaseJ-goal-TDD.md` (Gate 2 PASSED)
**User Stories**: `docs/design/specs/phaseJ-goal-user-stories.md`
**PRD**: `docs/features/phaseJ-goal-PRD.md` (Gate 1 PASSED)

---

## L0 Content Traceability

> Gate 3 skips L0 per review-protocol.md (L0 applies only when User Stories with Data Anchors are the review object, not code).

---

## L1 Dimension Review

### R1 Devil PM

| # | Dimension | Verdict | Description | Evidence |
|---|-----------|:-------:|-------------|----------|
| 1 | D1 Scope Drift | PASS | All 3 new files and 10 modified files map directly to TDD S4 file plan. No extra systems, endpoints, or features beyond what TDD specifies. Verification script covers exactly the 8 test groups in TDD S8. | TDD S4 lists N1-N3 + M1-M10 + V1; actual changes match exactly. `idle-engine.ts` L181 registers `goalTickHandler`, `goal-manager.ts` exports `GoalManager` with 6 methods + guards as specified. |
| 2 | D2 PRD Omission | PASS | All 5 GoalType entries from PRD S3.1 are implemented in `goal-data.ts` L17-33 (multipliers), L38-44 (TTL), L49-55 (labels), L67-89 (MUD text). Every multiplier value matches PRD S3.2 table exactly. | Cross-checked all 35 multiplier values (5 types x 7 behaviors): `goal-data.ts` L18-32 vs PRD S3.2 table. All match. TTL values (300/400/200/300/250) match PRD S3.1. |
| 3 | D3 Scope Control | WARN | `buildGoalPromptSegment()` is defined (`soul-prompt-builder.ts` L293) and tested in verification script (V8), but **never integrated into the actual prompt building pipeline**. The function is exported but no caller in `src/` invokes it. US-JG-07 AC1 ("soul-prompt-builder constructs prompt with goal segment injected") is not satisfied in the live code path. | Grep for `buildGoalPromptSegment` across `src/` yields only the definition at `soul-prompt-builder.ts:293`. No call site in `buildSoulEvalPrompt()` or any other prompt construction function. Only the verification script (`scripts/verify-phaseJ-goal.ts:312-332`) calls it. |

### R6 Adversarial QA

| # | Dimension | Verdict | Description | Evidence |
|---|-----------|:-------:|-------------|----------|
| 4 | D1 Boundary Values | PASS | Zero-goal returns empty Record in `getLayer5Multipliers` (L238). `tickGoals` handles empty array (L110 for-loop doesn't execute). `removeGoal` handles non-existent goalId silently (L96-99, findIndex returns -1). `checkCompletions` handles missing disciple (`break` at L140). Null targetId is guarded (`if (!targetId) break` at L152, L163). | `goal-manager.ts` L96-99: `findIndex` returns -1, splice not called. L140: `if (!disciple) break`. L152/L163: `if (!targetId) break`. L238: returns `{}` for zero goals. |
| 5 | D2 Concurrent Race | PASS | `goal-tick` handler runs at SYSTEM_TICK(500):20, after `soul-tick`(500:10) but before `disciple-tick`(600). Within the handler, completion check runs before TTL decrement (L66-76 before L78-88), preventing a goal from being simultaneously completed and expired. Event-driven triggers run inside `processSoulEvent` at phase 625, which is after goal-tick(500) -- no same-tick write conflict on `state.goals`. | `goal-tick.handler.ts` L66: `checkCompletions` first, L79: `tickGoals` second. Pipeline ordering: `pipeline.md` confirms 500:20 < 600 < 625. `soul-engine.ts` L444: event-driven triggers only fire during phase 625. |
| 6 | D3 Regression Risk | PASS | `planIntent` and `getEnhancedPersonalityWeights` gain optional trailing parameters (`goals?`), preserving backward compatibility (existing callers don't pass goals, get `undefined`, Layer 5 skipped via `if (goals && goals.length > 0)`). `processSoulEvent` gains optional 8th parameter, existing callers unaffected. Regression test: 64/64 pass. tsc: 0 errors. | `behavior-tree.ts` L145: `goals?: readonly PersonalGoal[]`. L215: `if (goals && goals.length > 0)`. `soul-engine.ts` L358: `goalManager?: GoalManager`. All optional trailing. `disciple-tick.handler.ts` L37: passes goals explicitly. |
| 7 | D4 Testability | WARN | Verification script covers 66 assertions across 8 groups mapping to all 7 User Stories. However, V7 (migration) is a weak test -- it only validates `createDefaultLiteGameState()` output structure (V7-1 to V7-3) and has a placeholder assertion `assert(true, 'V7-4: ...')` at L305. The actual `migrateV5toV6` function is not directly tested because it's module-private. No test loads a real v5 JSON payload through `migrateSave()`. | `verify-phaseJ-goal.ts` L296-306: V7-1 checks `state.version === 6`, V7-2/V7-3 check `goals` structure, V7-4 is `assert(true, ...)` with comment "confirmed by code review". No v5 fixture JSON is created and passed through the migration path. |
| 8 | D5 Save Compatibility | PASS | `migrateV5toV6` in `save-manager.ts` L173-179: checks `Array.isArray(raw['goals'])`, if not, sets `raw['goals'] = []`, sets version to 6. Migration chain at L200: `if ((raw['version'] as number) < 6) migrateV5toV6(raw)`. Default fallback at L205-233 provides safety net via shallow merge with `createDefaultLiteGameState()`. `createDefaultLiteGameState()` at L318: `goals: []`. SAVE_VERSION constant is 6 (L25). | `save-manager.ts` L25: `SAVE_VERSION = 6`. L173-179: `migrateV5toV6`. L200: chain integration. `game-state.ts` L318: `goals: []`. `schema.md` S7: documents v6 change. |

### R7 Senior Programmer

| # | Dimension | Verdict | Description | Evidence |
|---|-----------|:-------:|-------------|----------|
| 9 | D1 Single Responsibility | PASS | `GoalManager` methods are well-decomposed: `assignGoal` (40 lines with guards), `removeGoal` (5 lines), `tickGoals` (12 lines), `checkCompletions` (55 lines), `periodicScan` (27 lines), `getLayer5Multipliers` (19 lines), `getGoalsForDisciple` (3 lines). No function exceeds 50 lines excluding comments. `goal-tick.handler.ts` `execute` is 40 lines including logging, acceptable. | `goal-manager.ts`: assignGoal L40-90 (50 lines), checkCompletions L130-186 (56 lines), both within threshold. `goal-tick.handler.ts` execute L61-103 (42 lines). |
| 10 | D2 Magic Number | PASS | All numeric constants are extracted: `GOAL_TTL` (goal-data.ts L38-44), `GOAL_BEHAVIOR_MULTIPLIERS` (L17-33), `GOAL_SCAN_INTERVAL = 60` (L94), `MAX_ACTIVE_GOALS = 2` (personal-goal.ts L34), `GOAL_MULTIPLIER_CAP = 2.0` (L37). The `0.7` threshold multiplier in T-EV-01 (`soul-engine.ts` L472) is the only inline number, but it originates from PRD S3.3 trigger condition. | `goal-data.ts`: all data tables exported as named constants. `personal-goal.ts` L34, L37: exported constants. `soul-engine.ts` L472: `* 0.7` from PRD S3.3. |
| 11 | D3 Error Handling | PASS | `assignGoal` returns `null` on guard rejection (L51, L69, L72). `removeGoal` silently handles non-existent goal (L96-99). `checkCompletions` breaks on missing disciple (L140) or missing targetId (L152, L163). `goal-tick.handler.ts` L62: early return if `!ctx.goalManager`. `renderGoalText` L38: `disciple?.name ?? '???'` fallback. | All error paths reviewed; no `throw` in hot path, no silent swallowing of meaningful errors. Guard returns are well-documented in JSDoc. |
| 12 | D4 Duplicate Code | WARN | Layer 5 multiplier computation logic is duplicated: (A) `GoalManager.getLayer5Multipliers()` at `goal-manager.ts` L236-255 and (B) inline in `getEnhancedPersonalityWeights()` at `behavior-tree.ts` L214-230. Both compute the same thing: iterate goals, multiply behavior values, clamp. The behavior-tree code does NOT call `getLayer5Multipliers()` -- it re-implements the algorithm. `getLayer5Multipliers()` is only called in the verification script (V4-2/V4-3). | `goal-manager.ts` L240-252 vs `behavior-tree.ts` L218-229: identical algorithm (iterate goals, accumulate product, clamp to [0.5, 2.0]). Grep for `getLayer5Multipliers` in `src/`: zero call sites. Only `scripts/verify-phaseJ-goal.ts` L149,154,160 call it. |
| 13 | D5 Naming Quality | PASS | Variable names are self-documenting: `expired`, `completed`, `assigned` for return arrays. `victim` for the goal to be evicted in G3 (L64). `isEventDriven` boolean parameter. `minClamp` for the lower clamp bound. `renderGoalText` for template rendering. No `temp`/`data`/`handle` style names found. | Reviewed all variable names in 3 new files. No ambiguous naming. `victim` at L64 is colorful but unambiguous in context. |
| 14 | D6 Comment Quality | PASS | All public methods have JSDoc with `@see` references to TDD/PRD sections. `goal-data.ts` L14: `// PRD S3.2` section reference on multiplier table. `goal-tick.handler.ts` L6-7: clear ordering explanation. Guard logic documented inline: L50 `// G2`, L56 `// G1`, L58 `// G3`. Completion conditions documented in checkCompletions JSDoc (L125-128). Formula source marked: L217 `// 0.5` alongside `1 / GOAL_MULTIPLIER_CAP`. | `goal-manager.ts` L36 JSDoc, L102 JSDoc, L129 JSDoc (5-line completion condition spec), L189 JSDoc. `goal-tick.handler.ts` L1-18 file header. Guard comments at L50, L56, L58. |
| 15 | D7 Performance | PASS | `tickGoals` iterates backward (L110: `for (let i = state.goals.length - 1`) to safely splice during iteration -- O(n) where n = active goals (max 16 = 8 disciples x 2 goals). `checkCompletions` similarly iterates backward. `getGoalsForDisciple` is O(n) filter but n is small. No object allocation in hot path except the `expired`/`completed` arrays (allocated once per tick). `periodicScan` short-circuits via interval check (L195). | Max goals: 8 disciples x 2 = 16. All iterations O(16). `periodicScan` L195: `if (currentTick - lastScanTick < 60) return []` -- early exit 59/60 ticks. No `new` in `tickGoals`/`checkCompletions` inner loops. |

---

## L2 CoVe Verification

### CoVe #1 -- R1-D3 WARN: `buildGoalPromptSegment` not integrated

**Original Finding**: WARN -- `buildGoalPromptSegment()` is exported but never called in the live prompt-building pipeline.

**Verification Questions**:
1. Q1: Is `buildGoalPromptSegment` called anywhere in `src/` (excluding definitions)?
2. Q2: Does `buildSoulEvalPrompt` or any other prompt construction function include goal context?
3. Q3: Does the TDD ADR-JG-04 specify where the call site should be?

**Independent Answers**:
1. A1: Grep for `buildGoalPromptSegment` in `src/` returns only the export definition at `soul-prompt-builder.ts:293`. No call site. (Evidence: grep result above)
2. A2: `buildSoulEvalPrompt()` at L169-211 constructs identity + event + candidates + format instruction. No goal segment is included. `buildRelationshipPromptSegment()` exists for relationship context, but no analogous call for goals. (Evidence: `soul-prompt-builder.ts` L169-211)
3. A3: TDD ADR-JG-04 states: "Mounting point: called when constructing disciple context in soul-prompt-builder, after existing trait/relationship segments." But no specific line number or function is named as the caller. The TDD file plan M10 says "+buildGoalPromptSegment() + call during context construction." (Evidence: TDD S3 ADR-JG-04, S4 M10)

**Comparison**: Independent answers confirm the WARN. The function exists but has no integration call site. TDD M10 explicitly says "call during context construction" which was not implemented.

**Final Verdict**: Maintain WARN. This is a missing integration, not a critical breakage (the system functions without it, goals just aren't visible to AI prompts). US-JG-07 AC1 is partially satisfied (function exists, tested in isolation) but not wired into the live path.

### CoVe #2 -- R6-D4 WARN: Weak migration test

**Original Finding**: WARN -- V7 migration test has a placeholder `assert(true)` and no real v5 fixture.

**Verification Questions**:
1. Q1: Does the verify script actually test `migrateV5toV6` with a v5 payload?
2. Q2: Is the migration function tested through any other mechanism (regression tests)?

**Independent Answers**:
1. A1: No. `verify-phaseJ-goal.ts` L302-303 creates `{ version: 5 }` but never passes it through `migrateSave()` or `migrateV5toV6()`. L305 is `assert(true, ...)` -- a placeholder. (Evidence: `verify-phaseJ-goal.ts` L296-306)
2. A2: The 64 regression tests pass, but they test existing functionality. The regression suite's scope is not visible here, but the migration function `migrateV5toV6` is simple (3 lines: check array, set `[]`, set version=6) and the defaults-based safety net in `migrateSave()` L205-233 provides additional protection. The function is also identical in pattern to `migrateV4toV5` (4 lines). (Evidence: `save-manager.ts` L173-179)

**Comparison**: Independent answers confirm the WARN. The migration is not directly tested, though the risk is very low given its simplicity.

**Final Verdict**: Maintain WARN. Low risk but principle violation (untested code path).

### CoVe #3 -- R7-D4 WARN: Duplicate Layer 5 computation

**Original Finding**: WARN -- `getLayer5Multipliers()` in GoalManager and inline code in `behavior-tree.ts` L214-230 are duplicate implementations.

**Verification Questions**:
1. Q1: Could the inline code in behavior-tree call `getLayer5Multipliers()` instead?
2. Q2: Are the two implementations semantically identical?

**Independent Answers**:
1. A1: The inline code operates on `goals` (a `PersonalGoal[]` parameter) while `getLayer5Multipliers` takes `(state, discipleId)` and internally calls `getGoalsForDisciple`. Since `behavior-tree.ts` already receives the goals array as a parameter, calling `getLayer5Multipliers` would require passing `state` and `discipleId` which are available but would introduce a `GoalManager` dependency into `behavior-tree.ts` (currently pure function pattern). The TDD ADR-JG-02 specifies inline computation ("or inline calculation -- depending on whether GoalManager is injected"). (Evidence: TDD ADR-JG-02, `behavior-tree.ts` L141-145 signature)
2. A2: Yes. Both: (a) iterate goals, accumulate product per behavior, (b) clamp to `[1/GOAL_MULTIPLIER_CAP, GOAL_MULTIPLIER_CAP]`. The only difference is that `getLayer5Multipliers` returns a Record while the inline code applies directly to weights. Same constants, same algorithm. (Evidence: `goal-manager.ts` L240-252 vs `behavior-tree.ts` L218-229)

**Comparison**: The duplication is confirmed, but TDD ADR-JG-02 explicitly permitted the inline approach. The `getLayer5Multipliers` method on GoalManager appears to be a convenience method for external callers (e.g., verification scripts) rather than the canonical implementation.

**Final Verdict**: Maintain WARN. The duplication exists and could diverge in future edits, but is permitted by TDD and keeps behavior-tree as a pure function. Should be tracked as minor tech debt.

---

## L3 Structured Debate

No inter-role contradictions detected. All three roles agree on the three WARN items.

---

## Devil's Advocate Reverse Verification

### Historical Pattern Check

From MEMORY, top 5 historical patterns:

| # | Pattern | Check Result |
|---|---------|-------------|
| 1 | Function/event name mismatch with codebase (Gate 1, Gate 2) | CLEAR -- `getRealmAuraCost` correctly imported and used (`soul-engine.ts` L47, L472). `encounter-conflict` matches `SoulEventType` enum. All event types verified against `soul.ts:100`. |
| 2 | Event type shorthand vs actual enum (Gate 2: `encounter` vs `encounter-conflict`) | CLEAR -- Code uses `encounter-conflict` (L485), matching the actual enum value. TDD S6 T-EV-02 also corrected to `encounter-conflict`. |
| 3 | Completion/resolution timing asymmetry (Gate 2) | CLEAR -- Trigger timing: ADR-JG-01 hooks into processSoulEvent at phase 625. Completion timing: `checkCompletions` runs in `goal-tick` at phase 500:20, polling state changes made in previous ticks. Both paths are covered. |
| 4 | Document references not updated (layers.md, MASTER-PRD) | FOUND -- `layers.md` not updated for Phase J-Goal files (see Hypothesis 1 below). |
| 5 | 8-param function smell (Gate 2: processSoulEvent) | ADDRESSED -- `processSoulEvent` now has 8 params as predicted. Gate 2 logged this as tech debt. Code matches TDD ADR-JG-03 specification. |

### Hypothesis Scenarios

**Hypothesis 1: "What if layers.md is not updated for the 3 new files?"**

Verification: Grep `layers.md` for `goal-data`, `goal-manager`, `goal-tick`:
- `goal-data.ts` (Data layer): NOT listed in Data layer file list (L94). Count should be 20, shows 19.
- `goal-manager.ts` (Engine layer): NOT listed in Engine layer file list (L95). Count should be 28, shows 26.
- `goal-tick.handler.ts` (Engine layer): NOT listed in Engine layer file list (L95).

**Verdict**: Confirmed documentation gap. `docs/design/arch/layers.md` S2 file counts and file lists need updating for Phase J-Goal: Data 19->20, Engine 26->28. This is a CLAUDE.md requirement ("如涉及新文件，在 docs/INDEX.md 中同步" and "新增代码文件 -> docs/design/arch/layers.md"). Not a code bug, but a process violation.

**Hypothesis 2: "What if a disciple with `persistent >= 0.6` AND `smart >= 0.6` gets both seclusion AND ambition in one scan, filling both slots?"**

Verification: In `periodicScan` (`goal-manager.ts` L202-218), seclusion is checked first. If assigned (slot taken), ambition check follows. `assignGoal` for ambition will pass G1 (1/2 slots) and succeed. Result: the disciple gets both seclusion and ambition in one scan, filling both slots. This is by design (no conflict with PRD S3.3 which has no prohibition). But it means event-driven goals cannot be assigned until one expires. G3 guard handles this: event-driven goals can evict periodic goals.

**Verdict**: Working as designed. G3 guard properly handles the case where event-driven goals need to evict periodic goals.

---

## Summary of Findings

| # | Role | Dimension | Verdict | Description | CoVe Result |
|---|------|-----------|:-------:|-------------|-------------|
| 1 | R1 | D1 Scope Drift | PASS | All changes map to TDD S4 file plan | -- |
| 2 | R1 | D2 PRD Omission | PASS | All 35 multiplier values, 5 TTLs, 15 MUD texts match PRD | -- |
| 3 | R1 | D3 Scope Control | WARN | `buildGoalPromptSegment` not integrated into live prompt pipeline (US-JG-07 AC1 incomplete) | Maintain WARN |
| 4 | R6 | D1 Boundary Values | PASS | All null/empty/missing guards verified | -- |
| 5 | R6 | D2 Concurrent Race | PASS | Pipeline ordering prevents write conflicts | -- |
| 6 | R6 | D3 Regression Risk | PASS | All params optional trailing, 64/64 regression pass | -- |
| 7 | R6 | D4 Testability | WARN | V7 migration test is placeholder (`assert(true)`) with no real v5 fixture | Maintain WARN |
| 8 | R6 | D5 Save Compat | PASS | Migration chain and defaults safety net verified | -- |
| 9 | R7 | D1 Single Resp | PASS | No function exceeds 56 lines | -- |
| 10 | R7 | D2 Magic Number | PASS | All constants extracted to named exports | -- |
| 11 | R7 | D3 Error Handling | PASS | Guard returns, null checks, fallbacks verified | -- |
| 12 | R7 | D4 Duplicate Code | WARN | Layer 5 multiplier computation duplicated between GoalManager and behavior-tree | Maintain WARN |
| 13 | R7 | D5 Naming | PASS | Self-documenting names throughout | -- |
| 14 | R7 | D6 Comments | PASS | JSDoc + PRD/TDD references + guard annotations | -- |
| 15 | R7 | D7 Performance | PASS | O(16) max iterations, early exits, no hot-path allocation | -- |

### Documentation Gap (Devil's Advocate)

| Issue | File | Required Update |
|-------|------|-----------------|
| layers.md not updated | `docs/design/arch/layers.md` S2 | Data layer: +`goal-data.ts` (19->20 files). Engine layer: +`goal-manager.ts`, +`handlers/goal-tick.handler.ts` (26->28 files). |

---

## Final Verdict

### ~~CONDITIONAL PASS~~ → PASS

**0 BLOCK / 3 WARN / 1 doc gap** → Required actions resolved 2026-04-01

The implementation is solid, type-safe, well-structured, and matches TDD/PRD specifications closely. All 66 verification assertions pass, 64 regression tests pass, and TypeScript compilation is clean.

### Required Actions — RESOLVED

1. **[WARN-3] ~~Integrate `buildGoalPromptSegment`~~** — FIXED: `SoulPromptInput` +`goals?` field, `buildSoulEvalPrompt()` now calls `buildGoalPromptSegment(goals)` and injects into identity paragraph. `soul-evaluator.ts` passes `state.goals.filter(g => g.discipleId === subject.id)`.

2. **[Doc Gap] ~~Update `docs/design/arch/layers.md`~~** — FIXED: Data 19→20 (+goal-data.ts), Engine 26→28 (+goal-manager.ts, +goal-tick.handler.ts), changelog updated.

[x] GATE 3 PASSED — 2026-04-01

### Recommended Improvements (non-blocking)

1. **[WARN-7] Strengthen migration test**: Add a V7 test case that creates a minimal v5-shaped JSON object and passes it through the full migration path (either by exporting `migrateSave` or by simulating `loadGame` with a mock localStorage). The current `assert(true)` placeholder is insufficient.

2. **[WARN-12] Consolidate Layer 5 computation**: Either (a) have `behavior-tree.ts` L214-230 call `GoalManager.getLayer5Multipliers()` (requires injecting GoalManager or passing pre-computed multipliers), or (b) extract the shared algorithm into a pure function in `goal-data.ts` that both call. Track as tech debt if deferred.

3. **[Minor] `lastScanTick` module-level state**: Consider moving `lastScanTick` to an instance field of `GoalManager` for cleaner lifecycle management, even though the current approach works correctly in practice (page reload resets module state).

4. **[Minor] Pronoun placeholder**: The `{pronoun}` placeholder in MUD templates is always replaced with `'其'` (gender-neutral). The PRD templates use `{他/她}` suggesting gender awareness. Since `LiteDiscipleState` has no gender field, `'其'` is the correct fallback, but consider documenting this design decision in the code comment.
