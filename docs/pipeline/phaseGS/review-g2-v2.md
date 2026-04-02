# Phase GS Gate 2 v2 -- Party Review Report (Re-Review)

**Review Date**: 2026-04-02 | **Target**: `docs/design/specs/phaseGS-TDD.md`
**PRD Reference**: `docs/features/phaseGS-PRD.md` (GATE 1 PASSED)
**Gate 1 Review**: `docs/pipeline/phaseGS/review-g1-v2.md` (PASS)
**Prior Gate 2 Review**: `docs/pipeline/phaseGS/review-g2.md` (BLOCKED -- 1 BLOCK / 2 WARN)
**Consecutive All-PASS Count**: 0

---

## Prior Review Fix Verification

| # | Prior Item | Severity | Fix Claim | Verification | Status |
|---|-----------|:--------:|-----------|-------------|:------:|
| B1 | soul-engine.ts:571 omitted from TDD | BLOCK | Added to grep evidence, dependency matrix, signature table, side-effect map, file summary (12->13 files) | **Partial fix.** soul-engine.ts appears in SS1.3 L43, SS3.1 L221, SS3.2 L231, SS5.2 L298, SS5.3 L308, SS5.9 L362. However, it is **still missing from SS1.1** (layer assignment table, L13-22). The table has 8 rows and no soul-engine.ts entry. v1 BLOCK requirement #1 was explicitly: "Add soul-engine.ts to SS1.1 layer assignment table (Engine layer)." | Partial |
| W1 | defaults fallback misleading for I3 | WARN | I3 description clarified in SS1.2 | **Fixed.** SS1.2 L30 now reads: "迁移链 v6->v7 逐弟子赋值（注意：defaults 兜底仅合并顶层 key，不深入 disciples 数组元素，因此 migrateV6toV7 必须遍历每个弟子显式赋值 gender）". This accurately describes the save-manager.ts L214-226 behavior. | Fixed |
| W2 | generateInitialDisciples falsely claimed as shared logic | WARN | SS2.6 rewritten to clarify independent implementation | **Fixed.** SS2.6 L149 now states: "`generateInitialDisciples` 是**独立实现**（L110-170），不调用 `generateRandomDisciple`。需独立注入 gender 逻辑。" Full pseudocode with independent gender injection provided at L151-168. Matches actual code structure at disciple-generator.ts L110-170. | Fixed |

---

## L0: Content Traceability Pre-Check

Gate 2 (SGA/TDD review): L0 skipped per review-protocol.md -- L0 applies only when User Stories with Data Anchors are the review object. Proceeding to L1.

---

## L1: Dimension Review

### R4 Project Manager Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Scope Creep | PASS | TDD SS5.9 (L354-368) lists 13 files: 7 code + 4 docs + 1 feature-backlog + 1 test script. All modifications map to PRD SS3.1 IN items (7 items). The addition of soul-engine.ts (file #7) is within scope -- it's a {pronoun} hardcode site that PRD R-03 mandates fixing. No "while we're at it" additions. Cross-checked: every code file traces to a PRD IN item. |
| D2 Schedule Estimate | PASS | PRD rated M complexity (SS1.3 L36). TDD confirms no new Pipeline Handler (ADR-GS-03 L269-275), no new file creation (ADR-GS-01 L250-257). 13 files changed but all are small patches (gender field addition, pronoun lookup, name pool split). The +1 file (soul-engine.ts) from v1 is a single-line change (L362). Consistent with M-size estimate. |
| D3 Dependency Block | PASS | All dependencies are internal modules. TDD SS3.2 (L227-234) shows all 6 new imports come from `game-state.ts` (Gender type and utility functions). No external libraries, no API dependencies, no PoC requirements. Migration chain verified: save-manager.ts L200-201 shows migrateV5toV6 as the last migration function, and v6->v7 is the natural next step. |
| D4 Roadmap Conflict | PASS | Phase GS registered in MASTER-PRD L99 (v0.5.1, save v7), task-tracker L47 (status SPM). TDD does not alter roadmap scope. Save version v6->v7 transition is correctly planned. No conflict with subsequent phases (Phase I at v6 is independent of gender). |
| D5 Delivery Verifiability | PASS | TDD SS5.7 (L337-342) specifies regression test execution: `npm run test:regression` for GameState+Handler changes, manual browser verification for UI formatting, and new v6->v7 migration test case. SS5.5 (L318-324) audits test script impact with specific action items. All 5 PRD success criteria (SS6 S1-S5) have TDD-level execution paths mapped. |

### R5 Paranoid Architect Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Coupling | PASS | TDD SS3.2 (L227-234) dependency matrix shows all 6 files with new imports depend unidirectionally on `game-state.ts` for Gender type and utility functions. No circular dependencies. `game-state.ts` is already the central type hub per dependencies.md SS1 (every Engine file depends on it). Adding Gender type + 3 utility functions follows the established pattern (PersonalityTraits, MoralAlignment, DiscipleTrait are all in game-state.ts). soul-engine.ts already depends on game-state.ts (dependencies.md SS3: "改 game-state.ts -> 全部 Engine 文件"), so +getPronoun is not a new dependency direction. |
| D2 Extensibility | PASS | Adding a new gender value (e.g., 'nonbinary') requires updating: (1) Gender union type in game-state.ts, (2) PRONOUN_MAP in game-state.ts, (3) name pool in disciple-generator.ts. That is 2 files, well within the <3 threshold. Pronoun system uses Record<Gender, ...> lookup (TDD SS2.3 L79), which auto-extends when the union type grows. getGenderLabel and getGenderSymbol also use Record<Gender, ...> (L90, L94). |
| D3 State Pollution | PASS | TDD SS2.2 (L72) specifies Owner = DiscipleGenerator for gender field. Single owner is correct. Convention-based immutability matches initialMoral pattern (game-state.ts L157-158 shows initialMoral is same pattern: written once by generator, never mutated). SS1.2 L30 now correctly documents that defaults fallback does NOT merge into disciple array elements, and migrateV6toV7 is the sole safety net. This is accurate per save-manager.ts L214-226 (arrays take rawVal directly). |
| D4 Performance | PASS | TDD SS3.1 (L216-223) confirms no new Handler, zero Pipeline changes. Gender is assigned at generation time (O(1)). Pronoun lookup is O(1) from 3-entry Record. The only tick-time changes are: (1) goal-tick L39 replacing hardcoded string with map lookup -- O(1); (2) soul-engine L571 same pattern -- O(1). No tick-loop iteration over gender. |
| D5 Naming | WARN | `soul-engine.ts` is present in SS1.3 grep evidence (L43), SS3.1 pipeline changes (L221), SS3.2 dependency matrix (L231), SS5.2 function signature table (L298), SS5.3 side-effect mapping (L308), and SS5.9 file change summary (L362) -- but it is **missing from SS1.1** (layer assignment table, L13-22). The table lists 8 rows covering game-state.ts, disciple-generator.ts, save-manager.ts, goal-tick.handler.ts, soul-prompt-builder.ts, mud-formatter.ts -- but not soul-engine.ts. This is a structural inconsistency: a file that appears in 6 other TDD sections is absent from the layer assignment table. The v1 review BLOCK requirement #1 explicitly requested: "Add soul-engine.ts to SS1.1 layer assignment table (Engine layer)." This specific sub-item was not addressed. |

### R6 Adversarial QA Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Boundary Cases | PASS | TDD SS2.3 (L85-86) specifies `getPronoun()` with fallback: `PRONOUN_MAP[gender]?.subject ?? '其'`. The optional chaining + nullish coalescing handles unexpected gender values (undefined, null, invalid string) by returning '其'. TDD SS2.7 (L190-191) migration handles missing givenName: `name?.slice(1) ?? ''`, and empty string maps to `NAME_GENDER_MAP[''] ?? random`. The `?? ''` prevents undefined propagation. |
| D2 Concurrency | PASS | TDD SS3.1 (L219-222) now covers BOTH {pronoun} hardcoded locations: goal-tick.handler.ts:39 and soul-engine.ts:571. Both files already have `disciple` references available (`state.disciples.find()`). Independent grep for `'其'` in src/ returns exactly these 2 locations (verified: goal-tick.handler.ts:39, soul-engine.ts:571). No missed hardcoded pronoun sites remain. No tick-phase conflict: goal-tick runs at phase 500:20, soul-engine logGoalAssigned runs inline from soul-engine (not a tick handler), so no concurrent write risk. |
| D3 Regression Risk | PASS | TDD SS2.6 (L147-170) now correctly identifies `generateInitialDisciples` as an **independent implementation** (L149: "是独立实现（L110-170），不调用 generateRandomDisciple"). Full pseudocode provided for gender injection in both functions (SS2.5 L130-145 for generateRandomDisciple, SS2.6 L151-168 for generateInitialDisciples). The SGE engineer now has explicit instructions for both code paths. Verified against actual code: generateInitialDisciples (disciple-generator.ts L110-170) does NOT call generateRandomDisciple (L64-107); they are separate implementations with independent name generation loops (L66 vs L119-120). |
| D4 Testability | PASS | TDD SS5.5 (L318-324) maps test impact: disciple-generator needs regression verification for gender field, save-manager needs v6->v7 migration case, goal-tick suggests new pronoun verification case. SS5.7 (L337-342) specifies execution: `npm run test:regression` + manual browser check + new migration case. SS5.9 L368 lists `scripts/regression-all.ts` update including "+gender 生成验证 + v6->v7 迁移验证 + pronoun 验证". All 5 PRD success criteria (S1-S5) have test paths. |
| D5 Save Compatibility | PASS | TDD SS2.7 (L172-202) specifies complete migration: `migrateV6toV7()` iterates all disciples, extracts givenName via `name.slice(1)`, looks up `NAME_GENDER_MAP` (10 entries covering all current given names: 4 male, 6 female), falls back to random assignment. `SAVE_VERSION` bumps from 6 to 7 (L198). `createDefaultLiteGameState` version updates (L200). Migration chain insertion is explicit (L196). Schema.md update listed in SS5.9 (file #9, L364). All 10 current surnames are 1-character (disciple-generator.ts L21: 10 entries, all single char), so `name.slice(1)` is safe for extracting givenName. |

---

## L1 Summary

| # | Role | Dimension | Verdict | Summary | Evidence |
|---|------|-----------|:-------:|---------|----------|
| 1 | R4 PM | D1 Scope Creep | PASS | 13 files all within PRD scope | TDD SS5.9 L354-368 vs PRD SS3.1 |
| 2 | R4 PM | D2 Schedule | PASS | M-size, +1 file is single-line change | ADR-GS-01, ADR-GS-03 |
| 3 | R4 PM | D3 Dependency | PASS | All internal, no external deps | TDD SS3.2 L227-234 |
| 4 | R4 PM | D4 Roadmap | PASS | GS registered in MASTER-PRD + task-tracker | MASTER-PRD L99, task-tracker L47 |
| 5 | R4 PM | D5 Delivery Verify | PASS | Test paths mapped for all criteria | TDD SS5.5-5.7 |
| 6 | R5 Arch | D1 Coupling | PASS | Unidirectional to game-state.ts, no new dep direction | TDD SS3.2, dependencies.md SS1/SS3 |
| 7 | R5 Arch | D2 Extensibility | PASS | 2 files for new gender value | Record<Gender,...> pattern |
| 8 | R5 Arch | D3 State Pollution | PASS | Single owner, defaults limitation documented | TDD SS1.2 L30, save-manager.ts L214-226 |
| 9 | R5 Arch | D4 Performance | PASS | All O(1), no tick impact | TDD SS3.1 L216-223 |
| 10 | R5 Arch | D5 Naming | WARN | soul-engine.ts missing from SS1.1 layer table despite appearing in 6 other TDD sections | TDD L13-22 vs L43,L221,L231,L298,L308,L362 |
| 11 | R6 QA | D1 Boundary | PASS | Fallback via ?. and ?? | TDD SS2.3 L85-86 |
| 12 | R6 QA | D2 Concurrency | PASS | Both {pronoun} sites covered, grep confirms 2 total | grep '其' src/ = 2 hits, both in TDD |
| 13 | R6 QA | D3 Regression | PASS | generateInitialDisciples correctly documented as independent | TDD SS2.6 L149, disciple-generator.ts L110 |
| 14 | R6 QA | D4 Testability | PASS | All criteria have test paths | TDD SS5.5-5.7, SS5.9 L368 |
| 15 | R6 QA | D5 Save Compat | PASS | Migration chain complete + schema update | TDD SS2.7, SS5.8-5.9 |

**L1 Totals**: 0 BLOCK, 1 WARN, 14 PASS

---

## L2: CoVe Verification

### CoVe #1 -- R5-D5 WARN: soul-engine.ts missing from SS1.1 layer assignment table

**Original conclusion**: WARN -- TDD SS1.1 (layer assignment table) does not include soul-engine.ts, despite the file appearing in 6 other TDD sections. The v1 BLOCK required this specific addition.

**Verification questions**:
1. Does TDD SS1.1 (L13-22) contain a row for `soul-engine.ts`?
2. Does soul-engine.ts appear in other TDD sections that reference modified files?
3. Is the SS1.1 table structurally important (i.e., does SGE use it to determine which files to modify)?

**Independent answers**:
1. **No.** TDD L13-22 contains 8 rows: game-state.ts, disciple-generator.ts (x2 -- constants and logic), save-manager.ts, goal-tick.handler.ts, soul-prompt-builder.ts, mud-formatter.ts. No row for soul-engine.ts. Evidence: Read phaseGS-TDD.md L11-22.
2. **Yes.** soul-engine.ts appears in: SS1.3 L43 (grep evidence), SS3.1 L221 (Pipeline changes), SS3.2 L231 (dependency matrix), SS5.2 L298 (function signature), SS5.3 L308 (side-effect mapping), SS5.9 L362 (file change summary). That is 6 distinct sections. Evidence: grep "soul-engine" in phaseGS-TDD.md returns 6 matching lines.
3. **Yes.** SS1.1 is the first reference an SGE engineer consults to understand "what files does this TDD touch and in which layers?" It serves as the TDD's table of contents for file modifications. A file present in SS5.9 (change summary) but absent from SS1.1 (layer assignment) is an internal inconsistency. However, the SGE can still discover the file through SS5.9, which is the authoritative file list.

**Comparison**: Independent answers confirm the WARN. The inconsistency is real. However, since SS5.9 (the authoritative file list) correctly includes soul-engine.ts with full change details, and SS3.1/3.2 also cover it, the risk of an SGE missing it is low. The WARN should not be upgraded to BLOCK because SS5.9 is the file that SGE actually uses for implementation planning.

**Final verdict**: **WARN maintained.** SS1.1 should add a row: `| {pronoun} 填充 #2 | (2) Engine | soul-engine.ts | logGoalAssigned 代词 |`. This is a documentation consistency fix, not a correctness issue.

---

## L3: Structured Debate

No inter-reviewer contradictions. All reviewers agree. L3 skipped.

---

## Devil's Advocate

### Historical Pattern Scan (MEMORY.md Top 5)

| # | Historical Pattern | Check Against Phase GS Gate 2 v2 | Result |
|---|-------------------|----------------------------------|--------|
| 1 | **File missing from change list** (reviews 6,11,12,18) | v1 BLOCK was exactly this pattern. In v2: soul-engine.ts added to SS1.3, SS3.1, SS3.2, SS5.2, SS5.3, SS5.9 -- but missed in SS1.1. The pattern recurred in diminished form. Already captured as R5-D5 WARN. | Already captured |
| 2 | **Line number / reference errors** (reviews 1,2,8,16) | TDD SS1.3 line references: save-manager.ts:25 -> verified `const SAVE_VERSION = 6;` (actual L25). goal-tick.handler.ts:39 -> verified `const pronoun = '其';` (actual L39). soul-engine.ts:571 -> verified `.replace(/\{pronoun\}/g, '其')` (actual L571). soul-prompt-builder.ts:200 -> verified identity template (actual L200). All line references accurate. | Clear |
| 3 | **Stale documentation headers** (reviews 13,15,18) | MASTER-ARCHITECTURE.md L5 still reads "存档版本：v5" but actual is v6 (save-manager.ts:25). After GS, will be v7 but header says v5. TDD SS5.6 document consistency audit (L327-334) does NOT list MASTER-ARCHITECTURE.md for header update. TDD SS5.9 does NOT list MASTER-ARCHITECTURE.md. This was flagged as improvement suggestion #1 in v1 review but not addressed. | Carried forward as suggestion |
| 4 | **Roadmap/tracker status gap** (reviews 2,3,5,6,7) | task-tracker L47 shows Phase GS status as "SPM". After Gate 2 passes, it should be updated to "SGA". This is an SGE-phase responsibility, not a TDD defect. Noted for awareness. | Documentation note |
| 5 | **Partial fix of review findings** (new pattern from this review) | v1 review BLOCK had 5 specific sub-requirements. 4 of 5 were addressed, but #1 (SS1.1 layer table) was missed. This is a new pattern: partial fix where most items are addressed but one slips through. | New pattern -- captured as WARN |

### Hypothetical Scenarios

**Scenario 1: "What if the SGE reads only SS1.1 to determine file scope and skips soul-engine.ts?"**

SS1.1 lists 7 unique files (game-state.ts, disciple-generator.ts, save-manager.ts, goal-tick.handler.ts, soul-prompt-builder.ts, mud-formatter.ts). An SGE following standard workflow reads SS5.9 (the authoritative file list with 13 entries) as the implementation checklist, not SS1.1. SS1.1 is an architectural context table, not an implementation plan. The risk is low because SS5.9 L362 explicitly lists `src/engine/soul-engine.ts` with change details. However, the inconsistency is still a documentation defect that should be fixed.

**Verification**: SGE SKILL.md Step 2 references "TDD 层级归属表" (SS1.1) for understanding architecture, and "文件变更汇总" (SS5.9) for implementation scope. Both are consulted, but SS5.9 is the implementation-authoritative list. Soul-engine.ts is present in SS5.9. Risk: low.

**Scenario 2: "What if a name in the current pool has 0-length givenName (surname-only disciple)?"**

Current GIVEN_NAMES pool (disciple-generator.ts L22): all 10 entries are 2-character strings ('清风', '明月', etc.). No empty or single-character given names exist. After GS, MALE_GIVEN_NAMES and FEMALE_GIVEN_NAMES pools per TDD SS2.4 (L112-122) also contain only 2-character strings. Therefore `name.slice(1)` always produces a 2-character givenName. The migration's `name?.slice(1) ?? ''` fallback handles null/undefined but won't encounter 0-length in practice.

**Verification**: All 30 given names in TDD SS2.4 are 2-character strings. The 15 surnames in SS2.4 L107-110 are all single characters. Combined name is always 3 characters. `slice(1)` produces 2-character givenName. Safe.

---

## Integrity Check

| Metric | Count |
|--------|-------|
| BLOCK | 0 |
| WARN | 1 |
| PASS | 14 |

Rule: BLOCK = 0, WARN > 0 -> CONDITIONAL PASS. Confirmed consistent.

---

## Final Verdict

**CONDITIONAL PASS** -- 0 BLOCK / 1 WARN / 14 PASS

### Prior BLOCK Resolution

**B1 (v1 soul-engine.ts omission)**: Substantially resolved. soul-engine.ts is now present in SS1.3, SS3.1, SS3.2, SS5.2, SS5.3, and SS5.9 (6 of 6 required sections). The only gap is SS1.1 layer assignment table -- demoted from BLOCK to WARN (R5-D5) because SS5.9 (authoritative implementation list) correctly includes the file.

### Prior WARN Resolution

**W1 (v1 defaults fallback)**: Fully resolved. SS1.2 L30 now accurately documents defaults limitation.

**W2 (v1 generateInitialDisciples)**: Fully resolved. SS2.6 L149 now correctly identifies independent implementation with full pseudocode.

### Remaining WARN

**W1 (R5-D5): SS1.1 layer assignment table missing soul-engine.ts.** Add row: `| {pronoun} 填充 #2 | (2) Engine | soul-engine.ts | logGoalAssigned 代词 |` after the existing goal-tick.handler.ts row (L20). This is a 1-line documentation fix.

### Improvement Suggestions

1. **MASTER-ARCHITECTURE.md header version stale** (carried from v1, not addressed): L5 reads "存档版本：v5" but actual is v6, will be v7. Add MASTER-ARCHITECTURE.md to SS5.9 document update list, or add to SS5.6 audit checklist: "Save version bump -> MASTER-ARCHITECTURE.md header update."

2. **Partial fix detection process**: When a BLOCK has numbered sub-requirements (e.g., "must do items 1-5"), the fix author should use a checklist to confirm each sub-item before resubmitting. This review found that 4 of 5 sub-items were addressed but #1 was missed -- a pattern that could be prevented by explicit checklist tracking.
