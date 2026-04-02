# Phase GS Gate 2 -- Party Review Report

**Review Date**: 2026-04-02 | **Target**: `docs/design/specs/phaseGS-TDD.md`
**PRD Reference**: `docs/features/phaseGS-PRD.md` (GATE 1 PASSED)
**Gate 1 Review**: `docs/pipeline/phaseGS/review-g1-v2.md` (PASS)
**Consecutive All-PASS Count**: 0 (reset -- Gate 2 is independent)

---

## L0: Content Traceability Pre-Check

Gate 2 (SGA/TDD review): L0 skipped per review-protocol.md -- L0 applies only when User Stories with Data Anchors are the review object. Proceeding to L1.

---

## L1: Dimension Review

### R4 Project Manager Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Scope Creep | PASS | TDD file change summary (SS5.9 L327-341) lists 12 files: 6 code + 4 docs + 1 feature-backlog + 1 test script. All modifications align with PRD SS3.1 IN items (7 items). No new features beyond PRD scope. Cross-checked: every code file in the list (game-state.ts, disciple-generator.ts, save-manager.ts, soul-prompt-builder.ts, mud-formatter.ts, goal-tick.handler.ts) maps to a PRD IN item. No "while we're at it" additions. |
| D2 Schedule Estimate | PASS | PRD rated M complexity (SS1.3 L36). TDD confirms no new Pipeline Handler (ADR-GS-03), no new file creation (ADR-GS-01), modifications are mostly additive. 12 files changed but all are small patches (gender field addition, pronoun lookup, name pool split). Consistent with M-size estimate. |
| D3 Dependency Block | PASS | All dependencies are internal modules. TDD SS3.2 dependency matrix (L203-209) shows all 5 new imports come from `game-state.ts` (Gender type and utility functions). No external libraries, no API dependencies, no PoC requirements. `save-manager.ts` migration chain verified at L184-201 in source code -- migrateV5toV6 already exists and the v6->v7 slot is the natural next step. |
| D4 Roadmap Conflict | PASS | Gate 1 v2 confirmed Phase GS registered in MASTER-PRD L99 (v0.5.1, save v7), ROADMAP L282-298, task-tracker L47. TDD does not alter the roadmap scope. Save version v6->v7 transition is correctly planned. No conflict with subsequent phases. |
| D5 Delivery Verifiability | PASS | TDD SS5.7 (L309-315) specifies regression test execution: `npm run test:regression` for GameState+Handler changes, manual browser verification for UI formatting, and new v6->v7 migration test case. SS5.5 (L291-297) audits test script impact with specific action items. All PRD success criteria (SS6 S1-S5) have TDD-level execution paths mapped. |

### R5 Paranoid Architect Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Coupling | PASS | TDD SS3.2 (L203-209) dependency matrix shows all 5 files with new imports depend unidirectionally on `game-state.ts` for Gender type and utility functions. No circular dependencies introduced. `game-state.ts` is already the central type hub (per dependencies.md SS1, every Engine file depends on it). Adding Gender type and 3 utility functions follows the established pattern (same as PersonalityTraits, MoralAlignment, DiscipleTrait are all in game-state.ts). |
| D2 Extensibility | PASS | Adding a new gender value (e.g., 'nonbinary') requires updating: (1) Gender union type in game-state.ts, (2) PRONOUN_MAP in game-state.ts, (3) name pool in disciple-generator.ts, (4) NAME_GENDER_MAP for migration. That is 2-3 files, within the <3 threshold. Pronoun system uses Record<Gender, ...> lookup (TDD SS2.3 L78), which auto-extends when the union type grows. |
| D3 State Pollution | WARN | **Finding 1**: TDD SS1.2 (L30) claims "迁移链 v6->v7 + defaults 兜底" for Invariant I3 (old saves must have gender). However, the `defaults` fallback mechanism in `save-manager.ts` L204-230 operates at **top-level key** granularity only. The `disciples` key is an Array -- the fallback takes the raw array directly (L225: `result[key] = rawVal`) and does NOT merge individual disciple object fields. Therefore `defaults` will NOT add `gender` to existing disciples. The migration function `migrateV6toV7()` is the **sole** safety net. The TDD's "defaults 兜底" claim for I3 is misleading and could give a false sense of safety. If migrateV6toV7 has a bug, there is NO backup. **Finding 2**: TDD SS2.2 (L71) specifies Owner = DiscipleGenerator for gender field. Single owner is correct. Convention-based immutability matches initialMoral pattern (game-state.ts L157-158). This is acceptable per Gate 1 v2 resolution. |
| D4 Performance | PASS | TDD SS3.1 (L195-199) confirms no new Handler, zero Pipeline changes. Gender is assigned at generation time (O(1)). Pronoun lookup is O(1) from 3-entry Record. The only tick-time change is goal-tick L39: replacing a hardcoded string with a map lookup -- still O(1). No tick-loop iteration over gender. |
| D5 Naming | PASS | `Gender` follows PascalCase union type convention (matches `StarRating`, `MoralAlignment` in game-state.ts). Constants `FEMALE_RATIO`, `MALE_GIVEN_NAMES`, `FEMALE_GIVEN_NAMES` follow SCREAMING_SNAKE_CASE (matches `SAVE_VERSION`, `SURNAMES`, `GIVEN_NAMES`). Functions `getPronoun()`, `getGenderLabel()`, `getGenderSymbol()` follow camelCase with verb prefix (matches `generateRandomDisciple()`, `buildSoulEvalPrompt()`). `NAME_GENDER_MAP` follows SCREAMING_SNAKE_CASE for constant Record. ADR-GS-01 places these in game-state.ts alongside the type -- consistent with existing patterns. |

### R6 Adversarial QA Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Boundary Cases | PASS | TDD SS2.3 (L84-85) specifies `getPronoun()` with fallback: `PRONOUN_MAP[gender]?.subject ?? '其'`. The optional chaining + nullish coalescing handles any unexpected gender value gracefully -- if gender is undefined, null, or an invalid string, it returns '其'. TDD SS2.7 (L168-169) migration handles missing givenName: `givenName = name?.slice(1) ?? ''`, and empty string maps to `NAME_GENDER_MAP[''] ?? random`. The `?? ''` prevents undefined. Gate 1 v2 improvement suggestion #4 (invalid gender sanitization) is partially addressed by the `?.subject ?? '其'` fallback. |
| D2 Concurrency | BLOCK | **Critical Finding**: TDD SS1.3 grep evidence (L42) only lists `goal-tick.handler.ts:39` as a `{pronoun}` hardcoded location. TDD SS3.1 (L198-199) only plans to modify `goal-tick.handler.ts:39`. **However**, independent grep for `'其'` in `src/` reveals a SECOND hardcoded location: `soul-engine.ts:571` which reads `template.replace(/\{pronoun\}/g, '其')`. This is the `logGoalAssigned()` function in soul-engine.ts that also replaces `{pronoun}` placeholders with hardcoded '其'. The TDD completely omits this file -- it does not appear in: (1) SS1.1 layer assignment, (2) SS1.3 grep evidence, (3) SS3.1 Pipeline changes, (4) SS3.2 dependency matrix, (5) SS5.9 file change summary. If SGE follows the TDD as-is, `soul-engine.ts:571` will continue to output '其' for all disciples regardless of gender, creating an inconsistency where goal-tick uses correct pronouns but soul-engine does not. |
| D3 Regression Risk | WARN | **Finding**: TDD SS2.6 (L148) claims `generateInitialDisciples` "与 `generateRandomDisciple` 共享同一逻辑". Independent code reading confirms this is **factually incorrect**. `generateInitialDisciples` (L110-170) has its OWN separate implementation that does NOT call `generateRandomDisciple` (L64). They are **duplicated** logic with independent name generation loops. This means: (1) the SGE engineer must modify BOTH functions independently (not "one shares the other's logic"); (2) if the engineer trusts the TDD claim and only modifies `generateRandomDisciple`, `generateInitialDisciples` will produce disciples without gender. The TDD should specify modifications for BOTH functions explicitly. |
| D4 Testability | PASS | TDD SS5.5 (L291-297) maps test impact: disciple-generator needs regression verification for gender field, save-manager needs v6->v7 migration case, goal-tick suggests new pronoun verification case. SS5.7 (L309-315) specifies execution: `npm run test:regression` + manual browser check + new migration case. All 5 PRD success criteria (S1-S5) have test paths. The regression script (`scripts/regression-all.ts`) is explicitly listed as needing update (SS5.9 L341, file #12). |
| D5 Save Compatibility | PASS | TDD SS2.7 (L152-172) specifies complete migration: `migrateV6toV7()` iterates all disciples, extracts givenName via `name.slice(1)`, looks up `NAME_GENDER_MAP` (10 entries covering all current names), falls back to random assignment. `SAVE_VERSION` bumps from 6 to 7 (L174-175). `createDefaultLiteGameState` version updates (L183-186). The migration chain insertion point is explicit: `if (version < 7) migrateV6toV7(raw)` after migrateV5toV6. Schema.md update is listed in SS5.9 (file #8). All 15 current surnames are 1-character (verified L107-109 + disciple-generator.ts L21), so `name.slice(1)` is safe. |

---

## L1 Summary

| # | Role | Dimension | Verdict | Summary | Evidence |
|---|------|-----------|:-------:|---------|----------|
| 1 | R4 PM | D1 Scope Creep | PASS | 12 files all within PRD scope | TDD SS5.9 L327-341 vs PRD SS3.1 |
| 2 | R4 PM | D2 Schedule | PASS | M-size, no new Handler/file | ADR-GS-01, ADR-GS-03 |
| 3 | R4 PM | D3 Dependency | PASS | All internal, no external deps | TDD SS3.2 L203-209 |
| 4 | R4 PM | D4 Roadmap | PASS | GS registered in all 3 docs | Gate 1 v2 verified |
| 5 | R4 PM | D5 Delivery Verify | PASS | Test paths mapped for all criteria | TDD SS5.5-5.7 |
| 6 | R5 Arch | D1 Coupling | PASS | Unidirectional to game-state.ts | TDD SS3.2, dependencies.md SS1 |
| 7 | R5 Arch | D2 Extensibility | PASS | 2-3 files for new gender value | Record<Gender,...> pattern |
| 8 | R5 Arch | D3 State Pollution | WARN | defaults fallback misleading for array fields | save-manager.ts L204-230 |
| 9 | R5 Arch | D4 Performance | PASS | All O(1), no tick impact | TDD SS3.1 |
| 10 | R5 Arch | D5 Naming | PASS | Follows project conventions | game-state.ts patterns |
| 11 | R6 QA | D1 Boundary | PASS | Fallback via ?. and ?? | TDD SS2.3 L84-85 |
| 12 | R6 QA | D2 Concurrency | BLOCK | soul-engine.ts:571 missed -- second {pronoun} hardcode | grep '其' src/ -> 2 hits |
| 13 | R6 QA | D3 Regression | WARN | generateInitialDisciples is NOT shared logic | disciple-generator.ts L64 vs L110 |
| 14 | R6 QA | D4 Testability | PASS | All criteria have test paths | TDD SS5.5-5.7 |
| 15 | R6 QA | D5 Save Compat | PASS | Migration chain complete + schema update | TDD SS2.7, SS5.8-5.9 |

**L1 Totals**: 1 BLOCK, 2 WARN, 12 PASS

---

## L2: CoVe Verification

### CoVe #1 -- R6-D2 BLOCK: soul-engine.ts:571 omitted from TDD

**Original conclusion**: BLOCK -- TDD completely misses a second `{pronoun}` hardcoded location in `soul-engine.ts:571`.

**Verification questions**:
1. Does `soul-engine.ts` actually contain a `{pronoun}` replacement with hardcoded '其'?
2. Is `soul-engine.ts` mentioned anywhere in the TDD (file list, dependency matrix, grep evidence)?
3. Does this code path execute during normal gameplay (is it reachable)?

**Independent answers**:
1. **Yes.** `soul-engine.ts:571` reads: `template = template.replace(/\{name\}/g, name).replace(/\{pronoun\}/g, '其');`. This is inside `logGoalAssigned()` function (L561-584), which outputs MUD log text when a goal is assigned to a disciple. Evidence: grep `'其'` in src/ returns exactly 2 hits: `soul-engine.ts:571` and `goal-tick.handler.ts:39`.
2. **No.** Grep for "soul-engine" in phaseGS-TDD.md returns 0 matches. The file is absent from: SS1.1 layer assignment table, SS1.3 grep evidence table, SS3.1 Pipeline section, SS3.2 dependency matrix table, SS5.2 function signature table, SS5.3 side-effect mapping, SS5.9 file change summary (12 files listed, soul-engine.ts is not among them).
3. **Yes.** `logGoalAssigned()` is called from `assignGoalToDisciple()` in the same file. This function is called by `soul-engine` whenever it assigns a personal goal (breakthrough, seclusion, etc.) to a disciple. It is a core gameplay path -- every time a goal is assigned, this MUD log is generated.

**Comparison**: Independent answers confirm the BLOCK. The code path is reachable, the hardcoding is real, and the TDD completely omits it.

**Final verdict**: **BLOCK maintained.** The TDD must add `soul-engine.ts` to the file change list and specify the modification: `L571: replace '其' with getPronoun(disciple.gender ?? 'unknown')`.

---

### CoVe #2 -- R5-D3 WARN: defaults fallback misleading

**Original conclusion**: WARN -- TDD claims "迁移链 v6->v7 + defaults 兜底" but defaults won't help for disciple-level fields.

**Verification questions**:
1. Does the defaults mechanism in save-manager.ts merge individual array element fields?
2. Does migrateV6toV7 (as specified in TDD) cover all disciples?

**Independent answers**:
1. **No.** `save-manager.ts` L209-230: the defaults merge loop iterates `Object.keys(defaults)`. For the `disciples` key, `defaultVal` is an Array (from `createDefaultLiteGameState().disciples`), `rawVal` is also an Array (old save data). Since both are Arrays, the condition at L218 (`!Array.isArray(defaultVal)`) fails, so it takes the `else` branch at L225: `result[key] = rawVal`. The old disciples array is used as-is. No per-disciple field merging occurs. Evidence: `save-manager.ts` L216-226.
2. **Yes.** TDD SS2.7 L163-165: `const disciples = raw.disciples as Array<...>; if (!disciples) return; for (const d of disciples) { ... d.gender = ... }`. The loop iterates ALL disciples and assigns a gender to each one.

**Comparison**: The WARN is valid. The defaults mechanism genuinely does NOT serve as a backup for disciple-level fields. The migration function is the sole safety net, which works correctly as designed, but the TDD's claim of "defaults 兜底" is misleading documentation that could cause a false sense of security. If an engineer skips or breaks the migration function and trusts "defaults will catch it," disciples will have no gender field.

**Final verdict**: **WARN maintained.** The TDD should remove "defaults 兜底" from the I3 invariant check (SS1.2 L30) or clarify that defaults only works for top-level keys, not nested array element fields.

---

### CoVe #3 -- R6-D3 WARN: generateInitialDisciples not shared

**Original conclusion**: WARN -- TDD claims the two generator functions share logic, but they don't.

**Verification questions**:
1. Does `generateInitialDisciples` call `generateRandomDisciple`?
2. Does `generateInitialDisciples` have its own name generation code?

**Independent answers**:
1. **No.** `disciple-generator.ts` L110-170: `generateInitialDisciples` is a completely self-contained function. Grep for `generateRandomDisciple` within `generateInitialDisciples` (lines 110-170) returns 0 matches. The function has its own `SURNAMES[...]` and `GIVEN_NAMES[...]` selection logic at L119-120.
2. **Yes.** L117-123: `let name: string; do { const surname = SURNAMES[...]; const givenName = GIVEN_NAMES[...]; name = ...; } while (usedNames.has(name));`. This is a separate, duplicated implementation with its own name-uniqueness loop.

**Comparison**: Independent answers confirm the WARN. The TDD's claim "共享同一逻辑" is factually incorrect and could mislead the implementing engineer.

**Final verdict**: **WARN maintained.** TDD SS2.6 should explicitly specify the modifications needed for `generateInitialDisciples` (gender assignment + gendered name pool selection), not claim it "shares the same logic."

---

## L3: Structured Debate

No inter-reviewer contradictions. All reviewers agree on findings. L3 skipped.

---

## Devil's Advocate

### Historical Pattern Scan (MEMORY.md Top 5)

| # | Historical Pattern | Check Against Phase GS Gate 2 | Result |
|---|-------------------|-------------------------------|--------|
| 1 | **File missing from change list** (reviews 6,11,12) | TDD SS5.9 lists 12 files. Independent grep for '其' found `soul-engine.ts` missing. Already captured as R6-D2 BLOCK. | Already captured |
| 2 | **Line number / reference errors** (reviews 1,2,8,16) | TDD SS1.3 line references verified: `save-manager.ts:25` (SAVE_VERSION=6 confirmed), `goal-tick.handler.ts:39` (confirmed), `soul-prompt-builder.ts:200` (confirmed). But TDD SS2.2 says "game-state.ts:160 後插入" -- actual LiteDiscipleState starts at L118 and `traits` field (last current field before where gender would go) is at L160. This is accurate. | Clear |
| 3 | **Stale documentation headers** (reviews 13,15) | MASTER-ARCHITECTURE.md L5 reads "存档版本：v5" but actual save version is v6 (save-manager.ts:25, gamestate.md L12). This is a pre-existing desync that existed before GS. However, the TDD plans to bump to v7 and lists `docs/design/arch/schema.md` in SS5.9 for update, but does NOT list MASTER-ARCHITECTURE.md for header version update. After GS, the header will still say v5 when the actual version is v7. | NEW FINDING |
| 4 | **Roadmap/tracker gap** (reviews 2,3,5,6,7) | Phase GS is registered in task-tracker L47 (status SPM). The TDD does not mention updating task-tracker status from SPM to SGA. This is an SGE responsibility but should be flagged. | Documentation note |
| 5 | **Hardcoded text not fully audited** (reviews 7,8,9) | TDD's grep evidence in SS1.3 only searched for `{pronoun}` in `goal-tick.handler.ts`. A broader search reveals soul-engine.ts:571 also hardcodes '其'. The grep scope was too narrow. | Already captured as BLOCK |

### New Finding: MASTER-ARCHITECTURE.md header version stale

MASTER-ARCHITECTURE.md L5 currently reads: `存档版本：v5（Phase F0-α 新增，Phase H-γ 未变）`. The actual save version is v6 (gamestate.md says v6, save-manager.ts has SAVE_VERSION=6). This pre-existing desync was not introduced by Phase GS, but the TDD's document update list (SS5.6, SS5.9) does not include MASTER-ARCHITECTURE.md. After GS implementation, the header will be 2 versions behind (v5 vs actual v7).

**Severity Assessment**: This is a documentation hygiene issue carried forward from Phase J-Goal. It does not affect correctness. However, the TDD's SS5.6 document consistency audit (L299-307) should have caught it -- the audit checks "new GameState field -> gamestate.md" and "new Handler -> pipeline.md" but does not check the MASTER-ARCHITECTURE.md header version.

**Verdict**: Note as improvement suggestion. The SS5.6 audit checklist should include "GameState version bump -> MASTER-ARCHITECTURE.md header update."

### Hypothetical Scenarios

**Scenario 1: "What if a future Phase adds a disciple mid-game (recruitment) and doesn't know about gender?"**

Currently, `generateRandomDisciple()` is the only function that creates a single new disciple. After GS, it will include gender. Any future recruitment system calling `generateRandomDisciple()` will automatically get gender. However, if a future system creates disciples through a different code path (e.g., direct object construction), it could omit gender. The TypeScript compiler will flag this as a missing required field IF gender is required in LiteDiscipleState (which the TDD specifies it is). This is safe due to the type system.

**Verification**: The `gender` field in LiteDiscipleState (TDD SS2.2) is NOT optional (no `?` suffix), so TypeScript will enforce its presence at compile time. This is correct design.

**Scenario 2: "What if the migration function runs but a disciple's name is exactly 1 character (surname only, no given name)?"**

The TDD SS2.7 L180 notes: "断言 `name.length >= 2`". But the actual migration code at L167-168 reads: `const givenName = name?.slice(1) ?? '';`. If name is 1 character, `slice(1)` returns `''`, which maps to `NAME_GENDER_MAP[''] ?? random`. Since `''` is not in the map, it falls back to random. This is safe -- it doesn't crash, it just assigns randomly.

**Verification**: The assertion "name.length >= 2" is listed as a TDD requirement but is not in the migration code pseudocode. The SGE should implement it as a runtime guard or at minimum a console.warn, not a hard crash. This is a minor robustness concern, not a WARN.

---

## Integrity Check

| Metric | Count |
|--------|-------|
| BLOCK | 1 |
| WARN | 2 |
| PASS | 12 |

Rule: BLOCK > 0 -> BLOCKED. Confirmed consistent.

---

## Final Verdict

**BLOCKED** -- 1 BLOCK / 2 WARN / 12 PASS

### BLOCK (must fix before Gate 2 can pass)

**B1 (R6-D2): `soul-engine.ts:571` omitted from TDD.** The file contains a second hardcoded `{pronoun}` -> `'其'` replacement in `logGoalAssigned()`. The TDD must:
1. Add `soul-engine.ts` to SS1.1 layer assignment table (Engine layer)
2. Add `soul-engine.ts:571` to SS1.3 grep evidence (alongside goal-tick.handler.ts:39)
3. Add `soul-engine.ts` to SS3.2 dependency matrix (`+getPronoun` from game-state.ts)
4. Add `soul-engine.ts` to SS5.2 function signature change table (logGoalAssigned pronoun change)
5. Add `soul-engine.ts` to SS5.9 file change summary (file #7, total becomes 13)

### WARN (fix recommended, not blocking)

**W1 (R5-D3): "defaults 兜底" claim is misleading.** TDD SS1.2 L30 should be corrected to: "迁移链 v6->v7（sole safety net for disciple-level fields; top-level defaults do not merge into array elements）"

**W2 (R6-D3): `generateInitialDisciples` falsely claimed as shared logic.** TDD SS2.6 L148 "与 `generateRandomDisciple` 共享同一逻辑" is factually wrong. The two functions are separate duplicated implementations. The TDD should explicitly specify the gender injection for `generateInitialDisciples` (or refactor the function to call `generateRandomDisciple` internally -- but that is a design change beyond this Phase's scope).

### Improvement Suggestions

1. **MASTER-ARCHITECTURE.md header version stale**: Currently reads "存档版本：v5" but actual is v6 (pre-existing), will be v7 after GS. Add MASTER-ARCHITECTURE.md to the document update list in SS5.6/5.9, or add a checklist item: "GameState version bump -> update MASTER-ARCHITECTURE.md header."

2. **SS5.6 audit checklist expansion**: The current 5-point checklist (L300-306) does not verify MASTER-ARCHITECTURE.md header consistency. Add a 6th item: "Save version bump -> MASTER-ARCHITECTURE.md header 存档版本 field."

3. **Migration robustness**: TDD SS2.7 L180 mentions `name.length >= 2` assertion but the pseudocode doesn't show it. SGE should implement a guard (console.warn, not throw) for edge case protection.

4. **Grep evidence scope** (process improvement): SS1.3 grep for `{pronoun}` only found 1 hit because the search was likely scoped to a single file. Future TDD grep evidence should use project-wide search (`grep "pattern" src/`) and report total match count to prevent omissions.
