# Phase GS Gate 3 -- Party Review Report (SGE Code Review)

**Review Date**: 2026-04-02 | **Target**: Phase GS implementation (8 code files + 4 doc files + 1 test script)
**TDD Reference**: `docs/design/specs/phaseGS-TDD.md`
**PRD Reference**: `docs/features/phaseGS-PRD.md` (GATE 1 PASSED)
**Gate 2 Review**: `docs/pipeline/phaseGS/review-g2-v2.md` (CONDITIONAL PASS -- 0 BLOCK / 1 WARN)
**Verification Results**: tsc 0 errors, eslint 0 new warnings, regression 81/81 passed (17 new Phase GS tests)
**Consecutive All-PASS Count**: 0

---

## L0: Content Traceability Pre-Check

Gate 3 (SGE/code review): L0 skipped per review-protocol.md -- L0 applies only when User Stories with Data Anchors are the review object. Proceeding to L1.

---

## L1: Dimension Review

### R1 Devil PM Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 ROI | PASS | PRD SS1.3 rated cost M, experience increment 4/5. Implementation touches 8 code files with modest changes (gender field, name pools, pronoun lookups, migration). 17 new regression tests. Cost aligns with M estimate. Experience unlock: gendered names, correct pronouns (he/she/their), AI-aware gender -- meaningful immersion improvement for a MUD cultivation game. |
| D2 Cognitive Burden | PASS | Zero new player-facing concepts, operations, or resources. Gender is displayed passively (symbol in `look`, label in `look <disciple>` / `inspect`). No new commands, no new input required. Players see gendered names and pronouns without learning anything new. Verified: `mud-formatter.ts` L198-199 adds symbol inline, L231-235 adds label in header -- both are read-only display. |
| D3 Scope Control | PASS | PRD SS3.1 defines 7 IN items; PRD SS3.2 defines 6 OUT items (FB-021~026). All 8 code files map to IN items. No "while we're at it" additions found. One deviation noted: `soul-prompt-builder.ts` uses inline ternary (L200) instead of importing `getGenderLabel()` as TDD SS3.2 L233 specified -- but the behavior is identical and actually reduces import coupling. Acceptable engineering judgment. |
| D4 Spec Readiness | PASS | All TDD specifications were implementable without ambiguity. The 8 changed code files match TDD SS5.9 (13 files total: 7 code + 4 docs + 1 feature-backlog + 1 test script). Evidence: every function specified in TDD (getPronoun, getGenderLabel, getGenderSymbol, migrateV6toV7, gendered name generation) exists in code with matching signatures and behavior. |

### R6 Adversarial QA Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Boundary Cases | PASS | `getPronoun()` at `game-state.ts` L38-39: `PRONOUN_MAP[gender]?.subject ?? '其'` handles invalid/undefined gender via optional chaining + nullish coalescing -- returns '其'. Same pattern for `getGenderLabel()` L43-45 (fallback '未知') and `getGenderSymbol()` L49-51 (fallback ''). All three callers (`goal-tick.handler.ts` L40, `soul-engine.ts` L572, `mud-formatter.ts` L198/231/403) use `disciple?.gender ?? 'unknown'` or `d.gender` (non-optional since LiteDiscipleState.gender is required). Migration fallback at `save-manager.ts` L200: `NAME_GENDER_MAP[givenName] ?? (Math.random() < 0.5 ? 'female' : 'male')` handles unknown names. |
| D2 Concurrency | PASS | No new tick handlers introduced (ADR-GS-03). Gender is written once at generation time (`disciple-generator.ts` L83/138) and never mutated. Pronoun lookups in `goal-tick.handler.ts` L40 and `soul-engine.ts` L572 are pure reads during their respective execution windows. `goal-tick` runs at phase 500:20; `soul-engine logGoalAssigned` runs inline from soul-engine (not a tick handler). No concurrent write risk. Both `{pronoun}` hardcoded sites (confirmed via grep: exactly 0 remaining instances of hardcoded '其' for pronoun) are now dynamic. |
| D3 Regression Risk | PASS | 81/81 regression tests pass. Suite 5 (Phase GS Gender) at `regression-all.ts` L338-401 covers: getPronoun (3 cases L341-343), getGenderLabel (3 cases L346-348), getGenderSymbol (3 cases L351-353), generateRandomDisciple gender field (L357-361), generateInitialDisciples dedup + gender (L364-369), v6->v7 migration inline (L372-400). Name pool change (GIVEN_NAMES split into MALE/FEMALE) is backward-compatible -- existing saves migrate via NAME_GENDER_MAP. No function signature changes affecting external callers (all changes self-contained per TDD SS5.2). |
| D4 Testability | PASS | 17 new tests in Suite 5: 9 utility function tests (3 per gender function), 2 generator tests (single + batch with dedup), 5 migration tests (named male, named female, unknown fallback, version bump, structure). All 5 PRD success criteria (S1-S5) covered: S1=L357-369, S2=L341-343, S3=verified via soul-prompt-builder L200-201 (manual), S4=L372-400, S5=feature-backlog.md check (see D5 below). |
| D5 Save Compatibility | WARN | **Finding**: `save-manager.ts` `migrateV6toV7()` (L193-206) correctly iterates all disciples and assigns gender. `SAVE_VERSION` bumped to 7 (L25). `createDefaultLiteGameState()` returns version 7 (L325). Migration chain at L230: `if ((raw['version'] as number) < 7) migrateV6toV7(raw)` is correctly placed after migrateV5toV6. `schema.md` SS8 (L98-108) documents v7 changes. **However**, there is no runtime assertion at the end of `migrateV6toV7()` that verifies all disciples actually received a gender value. PRD Pre-Mortem PM-1 (L203) explicitly called for: "迁移函数末尾断言：所有弟子 gender !== undefined". The migration code at L197 uses `if (!d['gender'])` which will be falsy for `undefined`, `null`, `''`, and `0` -- these are all caught. But the PRD-recommended post-migration assertion was not implemented. If a future bug causes the loop to skip a disciple (e.g., mutated array during iteration), there is no guard. Risk: low (for-of loop on array is safe), but the PRD explicitly requested this safeguard and it was not implemented. |

### R7 Senior Programmer Review

| Dim | Verdict | Explanation |
|-----|:-------:|-------------|
| D1 Function SRP | PASS | All new/modified functions remain single-purpose. `getPronoun` (3 lines), `getGenderLabel` (3 lines), `getGenderSymbol` (3 lines) at `game-state.ts` L38-51 are minimal. `migrateV6toV7` at `save-manager.ts` L193-206 is 14 lines including the NAME_GENDER_MAP constant. `renderGoalText` at `goal-tick.handler.ts` L33-54 was modified in-place (1 line change L40) -- still 22 lines, single purpose. No function exceeds 30 lines from GS changes. |
| D2 Magic Number | PASS | `FEMALE_RATIO = 0.5` at `disciple-generator.ts` L39 is a named constant with JSDoc comment "女性生成概率（可配置）". The `0.5` in migration fallback (`save-manager.ts` L200: `Math.random() < 0.5`) mirrors this ratio for unknown names -- acceptable since the migration constant exists only within `migrateV6toV7` and represents the same probability. No other magic numbers introduced. |
| D3 Error Handling | PASS | All gender lookups use defensive patterns: `PRONOUN_MAP[gender]?.subject ?? '其'` (game-state.ts L39), `labels[gender] ?? '未知'` (L45), `symbols[gender] ?? ''` (L51). Migration uses `name?.slice(1) ?? ''` (save-manager.ts L199) -- null-safe. `disciple?.gender ?? 'unknown'` pattern used at goal-tick.handler.ts L40 and soul-engine.ts L572. No silent catches, no error suppression. |
| D4 Duplicate Code | WARN | **Finding**: `generateRandomDisciple()` (L82-128) and `generateInitialDisciples()` (L131-196) in `disciple-generator.ts` contain substantially duplicated logic. Both independently implement: (a) gender generation (L83 vs L138), (b) gendered name pool selection (L84 vs L139), (c) surname+givenName concatenation (L85-86 vs L144-145), (d) personality template selection (L91 vs L151-153), (e) moral generation (L101-105 vs L169-172), (f) the full disciple object return (L107-127 vs L174-194). This duplication predates Phase GS but was deepened by it (gender logic added to both). TDD SS2.6 explicitly acknowledged this ("独立实现...不调用 generateRandomDisciple"). The Phase GS scope correctly chose not to refactor (OUT of scope), but this is a growing maintenance risk: any future field addition must be applied to both functions. This should be registered as tech debt. |
| D5 Naming Quality | PASS | All new identifiers are self-explanatory: `Gender`, `PRONOUN_MAP`, `getPronoun`, `getGenderLabel`, `getGenderSymbol`, `MALE_GIVEN_NAMES`, `FEMALE_GIVEN_NAMES`, `FEMALE_RATIO`, `NAME_GENDER_MAP`, `migrateV6toV7`, `genderDesc`, `gLabel`, `gSym`. No `temp`/`data`/`handle` patterns. Boolean-like variables not introduced. `gSym` and `gLabel` at `mud-formatter.ts` L198/231/403 are short but contextually clear (local scope, gender symbol/label). |
| D6 Comment Quality | PASS | Phase GS section header comments in `game-state.ts` L27 ("Phase GS: 性别系统"), L15 ("Phase GS: 新增 Gender type + gender 字段 + 代词工具函数。存档版本 v6->v7"). JSDoc on functions: `getPronoun` L37 ("获取性别对应的主格代词"), `getGenderLabel` L42 ("获取性别中文标签"), `getGenderSymbol` L48 ("获取性别符号"). ADR-GS-01 decision documented at TDD SS4.1 (function placement rationale). Migration function has JSDoc at `save-manager.ts` L182-185. |
| D7 Performance | PASS | All gender operations are O(1) lookups from 3-entry Records. No new allocations in tick paths. `PRONOUN_MAP` is a module-level constant (allocated once). `getGenderLabel` and `getGenderSymbol` create inline Records on each call (`game-state.ts` L44, L50) -- but these are 3-entry objects, negligible cost, and NOT in tick hot paths (only called from mud-formatter which runs on user command, not per-tick). Goal-tick pronoun lookup (L40) is O(1). |

---

## L1 Summary

| # | Role | Dimension | Verdict | Summary | Evidence |
|---|------|-----------|:-------:|---------|----------|
| 1 | R1 PM | D1 ROI | PASS | M cost, 4/5 experience, on budget | PRD SS1.3, 8 code files |
| 2 | R1 PM | D2 Cognitive | PASS | Zero new player concepts | mud-formatter.ts L198, L231 |
| 3 | R1 PM | D3 Scope | PASS | All files within PRD IN scope | PRD SS3.1 vs code changes |
| 4 | R1 PM | D4 Spec Readiness | PASS | All TDD specs implemented | TDD SS5.9 vs actual files |
| 5 | R6 QA | D1 Boundary | PASS | ?. + ?? fallbacks on all paths | game-state.ts L39,45,51 |
| 6 | R6 QA | D2 Concurrency | PASS | Write-once gender, read-only lookups | disciple-generator.ts L83/138 |
| 7 | R6 QA | D3 Regression | PASS | 81/81 pass, 17 new tests | regression-all.ts L338-401 |
| 8 | R6 QA | D4 Testability | PASS | All 5 PRD criteria covered | regression-all.ts Suite 5 |
| 9 | R6 QA | D5 Save Compat | WARN | Migration works but PRD PM-1 post-assertion missing | save-manager.ts L193-206, PRD L203 |
| 10 | R7 Dev | D1 Function SRP | PASS | All functions <30 lines | game-state.ts L38-51, save-manager.ts L193-206 |
| 11 | R7 Dev | D2 Magic Number | PASS | FEMALE_RATIO named constant | disciple-generator.ts L39 |
| 12 | R7 Dev | D3 Error Handling | PASS | Defensive ?. + ?? throughout | game-state.ts L39, save-manager.ts L199 |
| 13 | R7 Dev | D4 Duplicate Code | WARN | generateRandomDisciple / generateInitialDisciples parallel duplication deepened | disciple-generator.ts L82-128 vs L131-196 |
| 14 | R7 Dev | D5 Naming | PASS | All identifiers self-explanatory | game-state.ts, disciple-generator.ts |
| 15 | R7 Dev | D6 Comments | PASS | JSDoc + section headers + ADR reference | game-state.ts L15,27,37,42,48 |
| 16 | R7 Dev | D7 Performance | PASS | All O(1), no tick-hot allocations | game-state.ts L31-35 module constant |

**L1 Totals**: 0 BLOCK, 2 WARN, 14 PASS

---

## L2: CoVe Verification

### CoVe #1 -- R6-D5 WARN: PRD PM-1 post-migration assertion missing

**Original conclusion**: WARN -- `migrateV6toV7()` does not include the post-migration assertion that PRD Pre-Mortem PM-1 (L203) explicitly requested: "迁移函数末尾断言：所有弟子 gender !== undefined".

**Verification questions**:
1. Does `migrateV6toV7()` in `save-manager.ts` contain any post-loop validation?
2. Does the PRD actually specify this as a requirement vs a suggestion?
3. Can a disciple exit the migration loop without a gender value?

**Independent answers**:
1. **No.** `save-manager.ts` L193-206: the function iterates disciples with `for (const d of disciples)`, assigns gender inside the loop, sets `raw['version'] = 7`, and logs to console. No post-loop assertion or validation exists. Evidence: read save-manager.ts L193-206 -- no `assert`, `console.warn`, or validation after the loop.
2. **Suggestion, not hard requirement.** PRD SS7 (Pre-Mortem) L203 says "预防措施: 迁移函数末尾断言：所有弟子 gender !== undefined". Pre-Mortem is a risk analysis section with *recommended* mitigations, not a mandatory AC. However, it represents a deliberate risk identification that was not acted upon.
3. **Practically impossible with current code.** The `for (const d of disciples)` loop iterates every element. The `if (!d['gender'])` guard catches undefined/null/empty. The assignment `d['gender'] = NAME_GENDER_MAP[givenName] ?? random` always produces a non-falsy string ('male' or 'female'). The only way a disciple could lack gender is if the array is mutated during iteration (e.g., another migration function runs concurrently and modifies disciples), which cannot happen in this synchronous chain.

**Comparison**: The assertion is missing as claimed. However, the risk is practically zero due to the synchronous loop design. The PRD framed this as a Pre-Mortem mitigation, not a hard AC. Downgrading to PASS would require evidence that the risk is zero -- the synchronous loop argument is strong but not ironclad (a future refactor could break it).

**Final verdict**: **WARN maintained.** The missing assertion is a minor robustness gap, not a correctness bug. It should be noted as an improvement suggestion rather than blocking.

---

### CoVe #2 -- R7-D4 WARN: Duplicate code in generateRandomDisciple / generateInitialDisciples

**Original conclusion**: WARN -- The two generator functions contain parallel implementations that were deepened by Phase GS gender injection.

**Verification questions**:
1. How many lines of structural duplication exist between the two functions?
2. Was this duplication acknowledged in the TDD?
3. Does any other system call these functions, creating a risk of divergence?

**Independent answers**:
1. **Approximately 40 lines of parallel logic.** `generateRandomDisciple` L82-128 (47 lines) and `generateInitialDisciples` inner closure L136-195 (60 lines) share: gender generation (L83 vs L138), name pool selection (L84 vs L139), star rating (L87 vs L155), spiritual roots (L88-90 vs L157-158), personality (L91-98 vs L151-165), moral (L101-105 vs L169-172), and return object (L107-127 vs L174-194). Of these, roughly 40 lines are structurally identical with only variable names differing. Evidence: disciple-generator.ts L82-128 vs L131-196.
2. **Yes.** TDD SS2.6 L149: "generateInitialDisciples 是独立实现（L110-170），不调用 generateRandomDisciple。需独立注入 gender 逻辑。" The TDD acknowledged the duplication but correctly scoped the refactoring as OUT of Phase GS.
3. **Limited risk.** Grep for `generateRandomDisciple` in src/ returns calls only within disciple-generator.ts itself (not externally called in the current codebase). `generateInitialDisciples` is called from `game-state.ts` L323 (createDefaultLiteGameState). Both functions are only used internally. However, any future Phase adding a disciple field must modify BOTH functions.

**Comparison**: The duplication is real and acknowledged. It was correctly scoped out of Phase GS. The WARN should stand as a tech-debt registration reminder.

**Final verdict**: **WARN maintained.** This is pre-existing tech debt deepened by GS. Should be registered in tech-debt.md.

---

## L3: Structured Debate

No inter-reviewer contradictions. All reviewers agree on findings. L3 skipped.

---

## Devil's Advocate

### Historical Pattern Scan (MEMORY.md Top 5)

| # | Historical Pattern | Check Against Phase GS Gate 3 | Result |
|---|-------------------|-------------------------------|--------|
| 1 | **File missing from change list / doc omission** (reviews 6,11,12,15,18) | TDD SS5.9 lists 13 files. All 8 code files verified present and modified. Doc files: gamestate.md updated (L38: +gender, L99: +GS changelog). schema.md updated (L19: v7 row, SS8 L98-108: v7 details). systems.md updated (L25: +GS system). feature-backlog.md: FB-018 struck (L31) + cleared entry (L46). **However**: dependencies.md has NO Phase GS changelog entry (L103-114 ends at Phase I-alpha). TDD SS5.9 file #10 says dependencies.md should be updated with "6 文件新增 import 关系". The actual dependencies.md matrix tables (SS1-SS2) were not updated either -- no new rows or annotations for gender-related imports. | **NEW FINDING: dependencies.md not updated** |
| 2 | **Stale documentation headers / version desync** (reviews 13,15,18-G2) | MASTER-ARCHITECTURE.md L5: "存档版本：v5" -- actual is now v7 after GS. This was flagged in Gate 2 v1 review as improvement suggestion #1 and carried forward in Gate 2 v2 review. Still not addressed. The header is now **2 versions behind** (v5 vs v7). game-state.ts L2: JSDoc reads "7game-lite 精简游戏状态 -- v6" but actual version is v7. L268: `LiteGameState` interface JSDoc reads "v6" but `createDefaultLiteGameState()` returns version 7 (L325). | **NEW FINDING: game-state.ts stale JSDoc (v6 vs v7)** |
| 3 | **Task-tracker / roadmap status stale** (reviews 2,3,5,6,7,9,15) | task-tracker.md L47 shows Phase GS status as "SPM 中". Gate 3 is the final review -- implementation is complete. MASTER-PRD.md L99 also shows "SPM 中". Both should be updated to reflect completion. This is the 7th time the task-tracker gap pattern has appeared. | **CARRIED: task-tracker stale (7th occurrence)** |
| 4 | **Partial fix of review findings** (review 19) | Gate 2 v2 had 1 WARN (SS1.1 layer table missing soul-engine.ts). Checking TDD: phaseGS-TDD.md L13-22 (SS1.1) still does NOT contain a soul-engine.ts row. The Gate 2 v2 WARN was accepted as CONDITIONAL PASS, meaning SGE was cleared to proceed -- but the TDD was not patched. This is an accepted documentation gap, not a code defect. Noting for completeness. | Acknowledged (Gate 2 accepted) |
| 5 | **FB registration gap** (new pattern) | PRD SS5 (L170-181) specifies 6 downstream requirements: FB-021 (外貌系统), FB-022 (爱慕/道侣), FB-023 (繁衍/后代), FB-024 (性别关联特性), FB-025 (性别锁定灵根/功法), FB-026 (碰面模板性别化). TDD SS5.9 file #12 says feature-backlog.md should have "FB-018 标记清偿 + FB-021~026 登记". FB-018 is correctly struck and cleared. **But FB-021 through FB-026 are NOT registered in feature-backlog.md.** Grep for "FB-021", "FB-022", ..., "FB-026", "外貌", "道侣", "繁衍" all return 0 matches. PRD Success Criterion S5 (L193): "FB-021~FB-026 全部登记 → feature-backlog.md 检查". This criterion is NOT met. | **NEW FINDING: FB-021~026 not registered** |

### Hypothetical Scenarios

**Scenario 1: "What if a modder adds a custom disciple via console and omits gender?"**

TypeScript enforces `gender: Gender` as a required field on `LiteDiscipleState` (game-state.ts L195). At compile time, any object literal missing `gender` produces a type error. At runtime (e.g., JSON.parse from console), there is no runtime validation. `getPronoun(undefined as any)` would hit `PRONOUN_MAP[undefined]?.subject ?? '其'` and return '其' (safe fallback). `getGenderSymbol(undefined as any)` returns '' (safe). `getGenderLabel(undefined as any)` returns '未知' (safe). The system degrades gracefully to unknown-gender behavior. No crash risk.

**Verification**: Tested fallback chain mentally: `PRONOUN_MAP[undefined]` is `undefined`, `undefined?.subject` is `undefined`, `undefined ?? '其'` is `'其'`. Safe.

**Scenario 2: "What if soul-prompt-builder's inline gender logic diverges from getGenderLabel?"**

`soul-prompt-builder.ts` L200 uses: `subject.gender === 'female' ? '女' : subject.gender === 'male' ? '男' : ''`. `getGenderLabel` (game-state.ts L43-45) returns: male->'男', female->'女', unknown->'未知'. The divergence: for 'unknown' gender, soul-prompt-builder returns '' (empty, omitted from prompt) while getGenderLabel returns '未知'. This is **intentional**: for AI prompts, omitting gender for 'unknown' is better than injecting "性别未知" (which would confuse the LLM). For MUD display, showing "未知" is appropriate. The behavioral difference is correct, but the TDD dependency matrix (SS3.2 L233) says soul-prompt-builder should import `Gender/getGenderLabel` -- the implementation chose NOT to import getGenderLabel and used inline logic instead. This is an acceptable deviation that produces better behavior, but it means the dependency matrix claim is inaccurate.

---

## Invariant I1 Verification (Gender NEVER Affects Numerical Calculations)

| Check | Evidence | Result |
|-------|----------|:------:|
| `gender` in formulas directory | `grep "gender" src/shared/formulas/` -> 0 matches | PASS |
| `gender` in data directory | `grep "gender" src/shared/data/` -> 0 matches | PASS |
| `gender` in idle-engine / breakthrough-engine / pill-consumer | Not present (grep confirms) | PASS |
| `gender` usage sites | Only in: disciple-generator (generation), save-manager (migration), goal-tick.handler (pronoun), soul-engine (pronoun), soul-prompt-builder (AI prompt), mud-formatter (display) | PASS |

**Conclusion**: Invariant I1 is fully preserved. Gender has zero touch points with numerical systems.

---

## Doc Updates Completeness Audit

| # | Doc File | TDD Requirement | Actual Status | Verdict |
|---|---------|-----------------|---------------|:-------:|
| 1 | `docs/design/arch/gamestate.md` | +gender field to topology tree | L38: gender line present, L99: GS changelog | PASS |
| 2 | `docs/design/arch/schema.md` | +v7 change chain | L19: v7 row, SS8 L98-108: full v7 details, L118: GS changelog | PASS |
| 3 | `docs/design/arch/dependencies.md` | +6 files new import relations | No GS changelog entry (L103-114). No matrix annotation for gender imports. | FAIL |
| 4 | `docs/project/prd/systems.md` | +弟子性别系统 | L25: GS entry present, L63: GS changelog | PASS |
| 5 | `docs/project/feature-backlog.md` | FB-018 strike + FB-021~026 register | FB-018 struck (L31) + cleared (L46). FB-021~026: NOT registered | PARTIAL |
| 6 | `docs/project/handoff.md` | Update current state | L12: Phase GS completed, L25: GS in timeline | PASS |
| 7 | `docs/design/MASTER-ARCHITECTURE.md` | Header version update (v5->v7) | L5: still reads "v5" -- 2 versions behind | FAIL (carried) |
| 8 | `docs/project/task-tracker.md` | Status update (SPM->completed) | L47: still "SPM 中" | FAIL (carried) |
| 9 | `docs/project/MASTER-PRD.md` | Status update | L99: still "SPM 中" | FAIL (carried) |

---

## Integrity Check

| Metric | Count |
|--------|-------|
| BLOCK | 0 |
| WARN | 2 |
| PASS | 14 |

Rule: BLOCK = 0, WARN > 0 -> CONDITIONAL PASS. Confirmed consistent.

---

## Final Verdict

**CONDITIONAL PASS** -- 0 BLOCK / 2 WARN / 14 PASS

### WARNs

**W1 (R6-D5): PRD Pre-Mortem PM-1 post-migration assertion not implemented.** `save-manager.ts` `migrateV6toV7()` (L193-206) successfully migrates all disciples but lacks the post-loop validation that PRD SS7 PM-1 recommended. Risk is practically zero (synchronous for-of loop), but the recommended safeguard was not implemented. Suggest adding a `console.warn` guard after the loop (not a blocking assertion).

**W2 (R7-D4): Generator function duplication deepened.** `disciple-generator.ts` `generateRandomDisciple()` (L82-128) and `generateInitialDisciples()` (L131-196) share ~40 lines of parallel logic. Phase GS correctly scoped refactoring as OUT, but the tech debt grew. Should be registered in `tech-debt.md`.

### Documentation Gaps (from Devil's Advocate)

These are documentation hygiene issues that do not affect code correctness but should be addressed:

1. **dependencies.md not updated for Phase GS**: No changelog entry and no matrix annotations for the 6 new gender-related imports. TDD SS5.9 file #10 explicitly required this. File: `docs/design/arch/dependencies.md`.

2. **FB-021 through FB-026 not registered in feature-backlog.md**: PRD SS5 defines 6 downstream requirements. TDD SS5.9 file #12 requires their registration. PRD Success Criterion S5 requires all 6 to be registered. This is a PRD AC gap. File: `docs/project/feature-backlog.md`.

3. **game-state.ts stale JSDoc**: L2 reads "v6", L268 reads "v6" -- actual version is v7. Minor but accumulates confusion.

4. **MASTER-ARCHITECTURE.md header "存档版本：v5"**: Now 2 versions behind (actual v7). Carried from Gate 2 review. File: `docs/design/MASTER-ARCHITECTURE.md` L5.

5. **task-tracker.md and MASTER-PRD.md**: Phase GS status still reads "SPM 中". This is the 7th occurrence of this pattern across reviews.

### Improvement Suggestions

1. **Add post-migration console.warn guard**: After the `for` loop in `migrateV6toV7()`, add: `if (disciples.some(d => !d['gender'])) console.warn('[SaveManager] migrateV6toV7: some disciples missing gender');`. This implements PRD PM-1's recommendation without hard-crashing.

2. **Register tech debt for generator duplication**: `disciple-generator.ts` has two parallel implementations (~40 duplicated lines). Any future field addition must touch both. Register in `tech-debt.md` as a refactoring candidate: extract shared disciple-building logic into a helper function.

3. **Batch-fix documentation version headers**: Create a checklist item in the SGE handoff protocol: "After bumping SAVE_VERSION, update: (a) game-state.ts file/interface JSDoc, (b) MASTER-ARCHITECTURE.md L5 header, (c) task-tracker + MASTER-PRD status."

4. **Register FB-021~026**: These 6 downstream requirements from PRD SS5 must be added to feature-backlog.md to satisfy Success Criterion S5.
