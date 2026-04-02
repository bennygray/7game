# Phase GS Gate 1 -- Party Review Report

**Review Date**: 2026-04-02 | **Target**: `docs/features/phaseGS-PRD.md` + `docs/design/specs/phaseGS-user-stories.md`
**Consecutive All-PASS Count**: 0 (first review of Phase GS)

---

## L0 Content Traceability Pre-Check

| Story# | AC# | Data Anchor | Trace Result | Status |
|--------|-----|-------------|-------------|--------|
| US-GS-01 | 1 | PRD S4.1 Gender union | PRD L87: `'male' \| 'female' \| 'unknown'` -- 3 values fully enumerated | PASS |
| US-GS-01 | 2 | PRD S4.2 R-01 | PRD L97: `< FEMALE_RATIO -> 'female', else 'male'` -- complete rule | PASS |
| US-GS-01 | 3 | PRD S4.4 male name pool | PRD L122-133: 15 male given names with table | PASS |
| US-GS-01 | 4 | PRD S4.4 female name pool | PRD L134-145: 15 female given names with table | PASS |
| US-GS-01 | 5 | "existing dedup logic" | Code: `disciple-generator.ts:117-122` has `usedNames` Set dedup | PASS |
| US-GS-02 | 1 | PRD S4.3 pronoun table | PRD L107-111: 3x3 table (male/female/unknown x nominative/possessive/reflexive) | PASS |
| US-GS-02 | 2 | PRD S4.3 | Same as above | PASS |
| US-GS-02 | 3 | PRD S4.3 | Same as above, unknown -> "qi/qi/ziShen" | PASS |
| US-GS-02 | 4 | `goal-data.ts:69,71,83` | Lines 69,71 contain `{pronoun}`. **Line 83 does NOT contain `{pronoun}`** -- it reads `'{name}tan le kou qi...'` with no pronoun placeholder. Reference error. | **WARN** |
| US-GS-03 | 1 | PRD S4.2 R-05 | PRD L101: `gender -> body description append 'gender male/female'` | PASS |
| US-GS-03 | 2 | PRD S4.2 R-05 | Same as above | PASS |
| US-GS-03 | 3 | I5 no-hardcode | PRD L52: Invariant I5 stated | PASS |
| US-GS-04 | 1 | save-manager.ts migration chain | Code: `save-manager.ts:184-201` -- chain migration confirmed, v5->v6 exists at L173 | PASS |
| US-GS-04 | 2 | PRD S4.5 mapping table (10 entries) | PRD L152-164: 10 entries matching current GIVEN_NAMES exactly | PASS |
| US-GS-04 | 3 | PRD S4.5 fallback | PRD L166: `random male/female (50:50)` | PASS |
| US-GS-04 | 4 | I3 invariant | PRD L50: Invariant I3 stated | PASS |
| US-GS-04 | 5 | save-manager.ts:25 | Code: `save-manager.ts:25` `SAVE_VERSION = 6` confirmed, PRD plans v6->v7 | PASS |
| US-GS-05 | 1 | mud-formatter.ts | Code: `mud-formatter.ts:215-267` -- `formatDiscipleProfile` exists, currently no gender display | PASS |
| US-GS-05 | 2 | mud-formatter.ts | Same file, will need modification | PASS |
| US-GS-05 | 3 | I4 invariant | PRD L51: unknown gender uses neutral pronoun, no error | PASS |
| US-GS-05 | 4 | mud-formatter.ts | Same file, inspect section exists | PASS |
| US-GS-06 | 1 | PRD S5 | PRD L170-181: S5 heading at L170 with 6 FB entries (FB-021~026) | PASS |
| US-GS-06 | 2 | feature-backlog.md format | Confirmed format includes priority/system/source columns | PASS |

**L0 Summary**: 22 PASS, 1 WARN (US-GS-02 AC#4 line reference error). No BLOCK. Proceeding to L1.

---

## L1 Dimension Review

### R1 Devil PM Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 ROI | PASS | PRD S1.3: cost=M (7-8 files), experience gain=4/5, ROI ~= 4/M which exceeds threshold. Gender is the foundation for all future relationship narratives (5-Why chain at S1.2 L18-28 traces to core value proposition). Not a discretionary feature. |
| D2 Cognitive Load | PASS | No new player-facing operations introduced. Gender is passive -- auto-generated, auto-displayed. Player learns 0 new concepts or actions. PRD S3.1 items 1-6 are all backend/display changes. The pronoun system is invisible to the player (they just see correct he/she). |
| D3 Scope Control | PASS | PRD S3.1 IN (7 items) and S3.2 OUT (6 items with FB# registration) are explicitly defined. Every IN item is covered by at least one User Story: US-GS-01 covers items 1-2, US-GS-02 covers item 3, US-GS-03 covers item 4, US-GS-05 covers item 5, US-GS-04 covers item 6, US-GS-06 covers item 7. No orphan features detected. |
| D4 Spec Readiness | PASS | All enums exhaustively listed: Gender 3 values (S4.1), SURNAMES 15 (S4.4), MALE_GIVEN_NAMES 15 (S4.4), FEMALE_GIVEN_NAMES 15 (S4.4), pronoun table 3x3 (S4.3), migration map 10 entries (S4.5). Rules R-01 through R-07 (S4.2) have complete input->output mappings. FEMALE_RATIO default value specified (0.5). A developer could implement from this PRD without asking questions. |

### R2 Senior Player Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 30-Second Joy | PASS | Gender manifests immediately on game start: name differentiation (male vs female names visible in look command) + pronoun differences in MUD text. US-GS-05 AC#1-2 specify gender symbol display on look. Player sees male/female diversity within the first 30 seconds of viewing the sect roster. |
| D2 Numerical Feel | PASS | Not applicable -- PRD Invariant I1 (S2 L48) explicitly states gender has zero numerical impact. No stats affected. This is a narrative-only system, which is the correct design choice for a foundation layer. (1 sentence explanation: gender adds narrative diversity without distorting balance.) |
| D3 Operation Motivation | PASS | Gender is passive infrastructure, not an active system. There is no "gender button" to press. It enriches existing interactions (reading MUD text, AI dialogue) rather than adding optional mechanics. PRD S1.2 5-Why chain concludes: "gender is the infrastructure layer for narrative diversity." This avoids the "optional and ignored" trap. |
| D4 Frustration Management | WARN | **Old save migration randomness**: PRD S4.5 fallback says names not in NAME_GENDER_MAP get random gender assignment. A player who has been playing for hours with mental image of a particular disciple may find the randomly assigned gender contradicts their expectation. The NAME_GENDER_MAP covers only 10/10 existing names so current players are fine, BUT if any name was generated outside the standard pool (e.g., through a bug or edge case), the random fallback could feel arbitrary. |

### R3 Numerical Designer Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Funnel Balance | PASS | Not applicable -- Invariant I1 (PRD S2 L48): "gender does not affect any numerical calculation." No resource production, no resource consumption introduced. Gender is a categorical attribute, not an economic variable. (Explanation: a system that produces/consumes zero resources cannot create imbalance.) |
| D2 Extreme Simulation | PASS | Not applicable to this Phase per I1. The only randomness is gender assignment (50:50 ratio). With 8 disciples and FEMALE_RATIO=0.5, extreme case is all-male or all-female (probability = 0.5^8 = 0.39%). PRD S4.2 R-01 allows this -- no floor/ceiling on gender counts. This is acceptable for a non-mechanical attribute. |
| D3 Formula Verifiability | PASS | Only one "formula": `Math.random() < FEMALE_RATIO -> female else male` (R-01, PRD L97). FEMALE_RATIO default = 0.5 (PRD L89). All constants have explicit values. No hidden parameters. |
| D4 Sink Completeness | PASS | Not applicable -- no new resource introduced. Gender is a categorical label, not a consumable/producible quantity. (Explanation: Sink analysis requires a resource flow; gender has no flow.) |
| D5 Second-Order Effects | PASS | PRD Invariant I5 (L52): "gender only as LLM prompt context, no hardcoded behavior differences." I1 (L48): no formula references gender. Verified via grep: `gender` appears 0 times in current codebase src/ (confirmed via Grep search). No multiplication chain possible when the value feeds only into prompt text. |
| D6 Spec Completeness | PASS | Every registry member listed: Gender(3), SURNAMES(15), MALE_GIVEN_NAMES(15), FEMALE_GIVEN_NAMES(15), pronoun(3x3), NAME_GENDER_MAP(10 entries with fallback). Rules R-01~R-07 have complete input/output columns. No "approximately N" or "influenced by X" vague references. |
| D7 AC-to-PRD Trace | WARN | **US-GS-02 AC#4 cites `goal-data.ts:69,71,83`** as locations of `{pronoun}`. Independent verification: L69 has `{pronoun}` (confirmed), L71 has `{pronoun}` (confirmed), but **L83 is `breakthrough: '{name}tan le kou qi...'` with NO `{pronoun}`**. The line reference is stale or wrong. The `{pronoun}` placeholder actually appears only in L69 and L71 (2 occurrences, not 3). This is a factual inaccuracy in the User Story data anchor. |

### R4 Project Manager Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Scope Creep | PASS | PRD S3.1 IN has 7 items, S3.2 OUT has 6 explicit exclusions each with FB# registration. Cross-checked: no item in IN overlaps with MASTER-PRD S4.1 OUT column ("dynamic recruit/dismiss" etc.). Gender field addition to LiteDiscipleState is a natural extension of the disciple subsystem which is already IN scope (MASTER-PRD L66). |
| D2 Schedule Estimate | PASS | PRD S1.3 rates cost as M. SPM analysis S2.4 identifies 7 files to change. No new engine module. This is consistent with M-size (4-6h). Review + test + docs included implicitly via Trinity Pipeline. |
| D3 Dependency Block | PASS | No external dependencies. All changes are to existing internal modules: game-state.ts, disciple-generator.ts, save-manager.ts, soul-prompt-builder.ts, mud-formatter.ts, goal-tick.handler.ts. Current save-manager migration chain (v1->v6) is verified functional (save-manager.ts L184-201). |
| D4 Roadmap Conflict | WARN | **Phase GS is not registered in MASTER-PRD S5 roadmap, SOUL-VISION-ROADMAP.md, or task-tracker.md.** Grep for "Phase GS", "GS", and "Gender" returned zero hits in all three files. This is a recurring pattern (found in reviews #2, #3, #5, #6, #7 per MEMORY.md). While the PRD itself is well-scoped, downstream planning documents do not yet acknowledge this Phase's existence, save version bump (v6->v7), or its position relative to Phase I-beta. |
| D5 Delivery Verifiability | PASS | PRD S6 lists 5 success criteria (S1-S5), each with explicit verification method: S1=regression test, S2=regression test, S3=prompt output assertion, S4=migration test (v6->v7), S5=feature-backlog.md inspection. All are automatable or trivially checkable. |

### R5 Paranoid Architect Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Coupling | PASS | New `Gender` type is defined at the shared/types level (game-state.ts). Dependencies are unidirectional: generator -> type, save-manager -> type, prompt-builder reads type, formatter reads type. No circular dependency. No engine module needs to know about another engine module's gender logic. Verified: current `soul-prompt-builder.ts` already imports `LiteDiscipleState` (L17), so adding `.gender` access is a natural extension, not a new coupling. |
| D2 Extensibility | PASS | Adding a new gender value (e.g., hypothetical 'nonbinary') requires changing: (1) Gender union type, (2) pronoun mapping table, (3) name pool assignment. That's 2-3 files, within the acceptable threshold. The pronoun system is a simple lookup table (PRD S4.3), not embedded logic. |
| D3 State Pollution | WARN | **`LiteDiscipleState.gender` field has single writer (disciple-generator) at creation time, and Invariant I2 declares it immutable (PRD L49). However, the PRD does not specify enforcement mechanism for immutability.** R-06 says "readonly (no setter)" but TypeScript `readonly` on interface fields only prevents reassignment at compile time; at runtime (save load, migration, direct property access), there is no protection. The migration function (save-manager migrateV6toV7) will also write to this field. The PRD should clarify that immutability is a design-time invariant (post-creation), not a runtime enforcement -- or specify a runtime guard. |
| D4 Performance Warning | PASS | Gender assignment is O(1) per disciple at generation time only. Pronoun lookup is O(1) from a 3-entry map. No tick-loop computation involves gender. The `getPronoun(gender)` call in goal-tick handler is already O(1) (currently hardcoded as `'qi'`; changing to a map lookup remains O(1)). Zero performance impact. |
| D5 Naming Consistency | PASS | Proposed type name `Gender` follows project convention of PascalCase for types (matches `PersonalityTraits`, `StarRating`, `MoralAlignment` in game-state.ts). Constants `FEMALE_RATIO`, `MALE_GIVEN_NAMES`, `FEMALE_GIVEN_NAMES`, `NAME_GENDER_MAP` follow SCREAMING_SNAKE_CASE convention (matches `SAVE_VERSION`, `GIVEN_NAMES`, `SURNAMES`). Function `getPronoun(gender)` follows camelCase verb convention (matches `generateRandomDisciple`, `buildSoulEvalPrompt`). |

---

## L1 Summary

| # | Role | Dimension | Verdict | Summary | Evidence |
|---|------|-----------|:-------:|---------|----------|
| 1 | R1 Devil PM | D1 ROI | PASS | Cost M, gain 4/5, foundation layer | PRD S1.3 |
| 2 | R1 Devil PM | D2 Cognitive Load | PASS | Zero new player concepts | PRD S3.1 all backend |
| 3 | R1 Devil PM | D3 Scope Control | PASS | 7 IN / 6 OUT with FB# | PRD S3.1-3.2 |
| 4 | R1 Devil PM | D4 Spec Readiness | PASS | All enums/rules exhaustive | PRD S4.1-4.5 |
| 5 | R2 Senior Player | D1 30s Joy | PASS | Gender visible on first look | US-GS-05 |
| 6 | R2 Senior Player | D2 Number Feel | PASS | N/A per I1 | PRD S2 L48 |
| 7 | R2 Senior Player | D3 Operation Motivation | PASS | Passive infrastructure | PRD S1.2 |
| 8 | R2 Senior Player | D4 Frustration | WARN | Migration random fallback may surprise | PRD S4.5 fallback |
| 9 | R3 Numerical | D1 Funnel Balance | PASS | Zero resource flow | I1 |
| 10 | R3 Numerical | D2 Extreme Sim | PASS | 0.39% all-same-gender acceptable | R-01 math |
| 11 | R3 Numerical | D3 Formula Verify | PASS | Single formula with explicit constant | R-01, FEMALE_RATIO=0.5 |
| 12 | R3 Numerical | D4 Sink Complete | PASS | No resource introduced | I1 |
| 13 | R3 Numerical | D5 Second-Order | PASS | 0 formula references per I1+I5 | Grep: 0 hits |
| 14 | R3 Numerical | D6 Spec Complete | PASS | All registries exhaustive | S4.1-4.5 |
| 15 | R3 Numerical | D7 AC-PRD Trace | WARN | US-GS-02 AC#4 line 83 ref wrong | goal-data.ts L83 has no {pronoun} |
| 16 | R4 Project Mgr | D1 Scope Creep | PASS | Within MASTER-PRD disciple scope | MASTER-PRD L66 |
| 17 | R4 Project Mgr | D2 Schedule | PASS | M size, 7 files, no new engine | SPM S2.4 |
| 18 | R4 Project Mgr | D3 Dependency | PASS | All internal modules | save-manager.ts chain verified |
| 19 | R4 Project Mgr | D4 Roadmap | WARN | GS absent from MASTER-PRD/roadmap/tracker | Grep: 0 hits in 3 files |
| 20 | R4 Project Mgr | D5 Delivery Verify | PASS | 5 criteria, all automatable | PRD S6 |
| 21 | R5 Architect | D1 Coupling | PASS | Unidirectional deps | soul-prompt-builder.ts L17 |
| 22 | R5 Architect | D2 Extensibility | PASS | New gender = 2-3 file changes | S4.3 lookup table |
| 23 | R5 Architect | D3 State Pollution | WARN | Immutability enforcement unspecified | R-06 vs runtime |
| 24 | R5 Architect | D4 Performance | PASS | All O(1), no tick impact | goal-tick.handler.ts L39 |
| 25 | R5 Architect | D5 Naming | PASS | Follows project conventions | game-state.ts pattern |

**L1 Totals**: 21 PASS, 4 WARN, 0 BLOCK

---

## L2 CoVe Verification (WARN items only)

### CoVe #1 -- R2-D4: Migration Random Fallback Frustration

**Original Finding**: WARN -- Random gender on migration fallback may surprise players who had mental model of a disciple's gender.

**Verification Questions**:
1. How many of the current 10 GIVEN_NAMES are NOT in NAME_GENDER_MAP?
2. Can a disciple name be generated outside the standard GIVEN_NAMES pool?

**Independent Answers**:
1. Code `disciple-generator.ts:22` lists exactly 10 names. PRD S4.5 maps exactly the same 10 names. **0 names are unmapped** -- all current names have deterministic gender assignment. (Evidence: code L22 vs PRD L153-164, all 10 match.)
2. `generateRandomDisciple()` at L66 picks from `GIVEN_NAMES` array only. `generateInitialDisciples()` at L120 also picks from `GIVEN_NAMES`. There is no code path that generates names outside this pool. (Evidence: `disciple-generator.ts:66,120`.)

**Comparison**: The original WARN assumed names could exist outside the map. Independent verification shows all current names are deterministically mapped, and no code path generates names outside the pool. The random fallback is a safety net that will never fire for current saves.

**Final Verdict**: Remove (downgrade to PASS) -- concrete evidence shows 10/10 names are mapped. The fallback path is unreachable for existing saves.

---

### CoVe #2 -- R3-D7: US-GS-02 AC#4 Line 83 Reference Error

**Original Finding**: WARN -- AC#4 cites `goal-data.ts:69,71,83` but line 83 has no `{pronoun}`.

**Verification Questions**:
1. What is the exact content of goal-data.ts line 83?
2. How many lines in goal-data.ts actually contain `{pronoun}`?
3. Does AC#4's intent (ensuring pronoun fills goal MUD text) have correct coverage despite the line number error?

**Independent Answers**:
1. L83: `breakthrough: '{name}tan le kou qi, tu po zhi shi kan lai hai xu cong chang ji yi.'` -- confirmed NO `{pronoun}`. (Evidence: `goal-data.ts:83`)
2. Grep result: `{pronoun}` appears at L69 and L71 only -- **2 occurrences, not 3**. (Evidence: grep `\{pronoun\}` in src/)
3. The AC's intent is still valid -- pronoun filling IS needed for L69 and L71. The error is only in the line reference (83 cited but doesn't apply). The functional coverage of the AC is 2/3 correct.

**Comparison**: Original WARN is confirmed factually correct. Line 83 does not contain `{pronoun}`. This is a documentation error that could mislead implementation.

**Final Verdict**: Maintain WARN -- line reference is factually wrong, should be corrected to `goal-data.ts:69,71` (removing 83).

---

### CoVe #3 -- R4-D4: Phase GS Not in Roadmap/Tracker

**Original Finding**: WARN -- Phase GS not registered in MASTER-PRD, SOUL-VISION-ROADMAP, or task-tracker.

**Verification Questions**:
1. Does MASTER-PRD S5 contain any row for Phase GS or save version 7?
2. Does SOUL-VISION-ROADMAP mention gender system or Phase GS?
3. Does task-tracker.md have a Phase GS entry?

**Independent Answers**:
1. MASTER-PRD S5 latest entry is Phase J with v6. No Phase GS row. No v7 mention. (Evidence: MASTER-PRD L87-101)
2. SOUL-VISION-ROADMAP has no mention of "gender", "Gender", or "Phase GS". (Evidence: grep returned 0 hits)
3. task-tracker.md has no "Phase GS", "GS", or "Gender" mention. (Evidence: grep returned 0 hits)

**Comparison**: Original WARN fully confirmed. This is the **6th occurrence** of this pattern across reviews (sessions 2,3,5,6,7,now).

**Final Verdict**: Maintain WARN -- roadmap documents must be updated during SGE phase.

---

### CoVe #4 -- R5-D3: Gender Immutability Enforcement

**Original Finding**: WARN -- PRD R-06 says "readonly (no setter)" but doesn't specify enforcement mechanism; runtime mutation still possible.

**Verification Questions**:
1. Does TypeScript `readonly` on an interface property prevent runtime mutation?
2. Is there any existing pattern in the codebase for enforcing field immutability at runtime?
3. Will the migration function need to write to the `gender` field (i.e., is write-once-then-readonly the actual pattern)?

**Independent Answers**:
1. TypeScript `readonly` is compile-time only; at runtime (especially after JSON parse), the property is freely mutable. (Evidence: TypeScript language specification)
2. Grep for "Object.freeze" or "readonly" enforcement in src/ -- no runtime immutability enforcement exists for any LiteDiscipleState field. `initialMoral` is described as "immutable" (game-state.ts L157-158) but has no runtime guard either. (Evidence: grep for Object.freeze returned no results in game-state.ts)
3. Yes, migration (`migrateV6toV7`) must write `gender` once per disciple. After that, it should never be written again. This is the same "write-once" pattern as `initialMoral`. (Evidence: save-manager.ts migration pattern, e.g., L122-133)

**Comparison**: The WARN is technically accurate but the pattern is consistent with existing project practice (`initialMoral` has identical "design-time immutable" semantics). The risk is low because no existing code mutates `initialMoral` post-creation.

**Final Verdict**: Maintain WARN -- but note it is a known project-wide pattern, not specific to Phase GS. Suggest PRD add a one-line clarification: "Immutability is enforced by convention (no mutation outside generator/migration), matching `initialMoral` pattern."

---

## L3 Structured Debate

No inter-reviewer contradictions detected. All 4 WARNs reduced to 3 after CoVe #1 downgrade. No L3 needed.

---

## Devil's Advocate

### Historical Pattern Scan (from MEMORY.md top 5)

| # | Historical Pattern | Check Against Phase GS | Result |
|---|-------------------|----------------------|--------|
| 1 | **Roadmap/tracker gap** (reviews 2,3,5,6,7,9) | Phase GS not in MASTER-PRD/roadmap/tracker | Confirmed -- already caught as R4-D4 WARN |
| 2 | **Line number / function name reference errors** (reviews 1,2,8) | US-GS-02 AC#4 cites L83 incorrectly | Confirmed -- already caught as R3-D7 WARN |
| 3 | **Type/field mismatch with nonexistent references** (review 5: grudge needs nonexistent type field) | All referenced types verified: Gender (new), LiteDiscipleState (exists), RelationshipTag (not modified). NAME_GENDER_MAP references `givenName` which is a derived substring, not a field -- but disciple-generator.ts:66 uses `givenName` as a local variable. Migration will need to extract givenName from `name` string (e.g., `name.slice(1)` for single-char surname or more complex logic). **This extraction logic is not specified in the PRD.** | NEW FINDING -- see below |
| 4 | **Hardcoded text blocks** (reviews 7,8,9) | Pronoun currently hardcoded as `'qi'` in goal-tick.handler.ts:39 -- but this IS the target of the change, not a missed hardcode. No other hardcoded gender text found. | Clear |
| 5 | **Stale signoff / template references** (reviews 10,11) | No signoff templates in this PRD. Clean. | Clear |

### New Finding: givenName Extraction Ambiguity

PRD S4.5 NAME_GENDER_MAP uses `givenName` as key, but `LiteDiscipleState` stores only `name` (full name = surname + givenName). The migration function must extract `givenName` from the full name string. Current code (disciple-generator.ts:89) concatenates as `${surname}${givenName}` with no separator.

**Problem**: Chinese surnames can be 1 or 2 characters. The current SURNAMES list (L21) has all single-character surnames, but the expanded list in PRD S4.4 also has all single-character surnames (15 entries, all 1 char). So `name.slice(1)` would work for extraction. However, the PRD does not specify the extraction algorithm, creating an implicit assumption that all surnames are 1 character.

**Assessment**: This is a low-severity implementation detail that TDD should specify, not a PRD-level issue. The PRD's NAME_GENDER_MAP keyed by givenName is correct given the data. Noting as improvement suggestion, not WARN.

### Hypothetical Scenarios

**Scenario 1: "What if a player modifies their save JSON and sets gender to an invalid value?"**
- PRD does not specify validation/sanitization for the `gender` field on save load.
- The `migrateSave` function's default-fill safety net (save-manager.ts L204-230) only fills missing top-level keys, not missing disciple sub-fields.
- If `gender` is set to `'attack_helicopter'`, `getPronoun()` would need a fallback.
- **Mitigation**: PRD S4.3 already provides `unknown -> 'qi'` as fallback. If `getPronoun` implementation uses a simple map with `unknown` default for any non-matching value, this is handled. TDD should specify this guard.

**Scenario 2: "What if a future Phase adds a 4th gender value?"**
- R5-D2 already confirmed 2-3 file change needed. The pronoun table is extensible (add a row). Name pools can be extended. The design is forward-compatible.
- No issue found.

---

## Integrity Check

| Metric | Count |
|--------|-------|
| BLOCK | 0 |
| WARN | 3 (after CoVe: R3-D7, R4-D4, R5-D3) |
| PASS | 22 (21 original + 1 upgraded from CoVe #1) |

Rule: BLOCK=0, WARN>0 --> CONDITIONAL PASS. Confirmed consistent.

---

## Final Verdict

**CONDITIONAL PASS** -- 0 BLOCK / 3 WARN

### WARN Items to Track

| # | WARN | Required Action | Owner |
|---|------|----------------|-------|
| W1 | US-GS-02 AC#4 line reference `83` incorrect | Correct to `goal-data.ts:69,71` (remove 83) | SPM |
| W2 | Phase GS not in MASTER-PRD S5 / SOUL-VISION-ROADMAP / task-tracker | Register Phase GS row with save version v7 | SPM/SGE |
| W3 | Gender immutability enforcement unspecified | Add PRD note: "convention-based immutability matching `initialMoral` pattern; TDD to specify runtime guard if needed" | SPM |

### Improvement Suggestions

1. **givenName extraction in migration**: PRD S4.5 assumes givenName can be extracted from full name. While current data (all 1-char surnames) makes `name.slice(1)` safe, the TDD should explicitly specify the extraction algorithm and assert that all surnames in the code are 1 character.

2. **Invalid gender sanitization**: PRD should add a note to Invariant I4 or R-03 that `getPronoun()` must handle any input gracefully (not just the 3 valid values), defaulting to `'unknown'` behavior. This guards against save corruption or future migration edge cases.
