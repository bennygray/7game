# Phase I-beta Gate 2 Review Report

**Review Date**: 2026-04-02 | **Reviewer**: doc-reviewer (independent)
**Review Target**: `docs/design/specs/phaseI-beta-TDD.md` (v1.0)
**Consecutive Full PASS Count**: 0

**Activated Roles**:
- R4 Project Manager (mandatory for Gate 2)
- R5 Paranoid Architect (mandatory for Gate 2)
- R6 Adversarial QA (mandatory for Gate 2)

**Gate 1 WARNs Tracked**:
- W1 (R1-D4): Few-shot + CausalTriggerType gap --> TDD SS4.2 covers few-shot update; SS2.6 adds CausalTriggerType members. **Resolved.**
- W2 (R3-D2): Attraction rate limit --> TDD SS3.2 adds `applyAttractionRateLimit` + V-10 verification. **Resolved.**
- W3 (R5-D3): RelationshipStatus owner --> TDD ADR-Ib-01 explicitly designates social-tick as sole writer of `edge.status`. **Resolved.**
- W4/W5 (R4-D1/D4): Governance registration --> MASTER-PRD L100 and task-tracker L48 now contain I-beta. **Partially resolved** (SOUL-VISION-ROADMAP still missing, see R4-D4 below).

---

## L1 Dimension Exhaustive Review

### R4 Project Manager

| # | Dimension | Verdict | Analysis | Evidence |
|---|-----------|:-------:|----------|----------|
| 1 | D1 Scope Creep | PASS | TDD scope aligns with PRD SS2.1 IN table. 27 files (20 modified + 3 new + 4 scripts/docs) listed in SS9 all map to PRD-specified changes. No unrequested features detected. The TDD adds `social-engine.ts`, `social-tick.handler.ts`, `social-event-templates.ts`, and `verify-social-system.ts` -- all directly required by PRD SS4/SS5. | TDD SS9 L812-846: 27 files; PRD SS2.1: all covered by IN items |
| 2 | D2 Schedule Estimate | PASS | L complexity correctly reflected. TDD SS9 provides a 6-layer dependency-sorted execution plan (L0-L5) that enables incremental compilation verification. Each layer boundary can serve as a checkpoint. This is the standard project approach (no hour estimates by convention). | TDD SS9 L810-846: 6 layers with explicit dependencies |
| 3 | D3 Dependency Blocking | PASS | All dependencies are internal. Phase GS (gender system, v7) and Phase I-alpha (causal engine) are prerequisites and both marked complete. AsyncAIBuffer reuse (ADR-Ib-03) depends on Phase G infrastructure which is operational. No unverified external dependency. | TDD SS0 L7: "Phase GS + Phase I-alpha"; ADR-Ib-03 L88-96: reuses existing AsyncAIBuffer |
| 4 | D4 Roadmap Conflict | WARN | **SOUL-VISION-ROADMAP still has no I-beta entry.** MASTER-PRD SS5 (L100) and task-tracker (L48) now contain I-beta, resolving part of Gate 1 W4. However, SOUL-VISION-ROADMAP was not updated -- grep returns 0 matches for "I-beta". This is the 8th occurrence of a roadmap/governance registration gap across review sessions. | Grep: `SOUL-VISION-ROADMAP.md` returns 0 results for "I-beta"; MASTER-PRD L100: present; task-tracker L48: present |
| 5 | D5 Delivery Verifiability | PASS | TDD SS10 defines 10 targeted verification cases (V-1 through V-10) plus regression test update plus human verification protocol. Each AC from User Stories maps to at least one V-case. Automated verification covers all critical invariants (INV-1 through INV-5). | TDD SS10 L850-887: 10 V-cases + regression + human check |

### R5 Paranoid Architect

| # | Dimension | Verdict | Analysis | Evidence |
|---|-----------|:-------:|----------|----------|
| 6 | D1 Coupling | PASS | social-engine depends on game-state (R/W), soul.ts (R), encounter.ts (R), relationship-formulas (R) -- all unidirectional. social-tick handler depends on social-engine + tick-pipeline. No circular dependency. ADR-Ib-01 clearly separates social-tick (status writer) from soul-engine (delta writer). New dependencies declared in SS6.3 match the existing matrix pattern. | TDD SS6.3 L666-669: dependency rows; ADR-Ib-01 L40-61: write separation |
| 7 | D2 Extensibility | PASS | Adding a new RelationshipStatus (e.g., "master-disciple") would require: (1) add to `RelationshipStatus` union, (2) add threshold conditions in social-engine.scanForSocialEvents, (3) add MUD templates in social-event-templates, (4) add SoulEventType entries, (5) add SOUL_EVENT_POLARITY entries -- 5 files. All use registry/table patterns. This matches the Gate 1 extensibility assessment. | TDD SS2.2 L163-173: union type; SS2.11 L372-380: template registry; SS2.5 L218-238: event type registry |
| 8 | D3 State Pollution | WARN | **`createDefaultLiteGameState()` update is not specified in the TDD.** MASTER-ARCHITECTURE SS6.2 requires updating `createDefaultLiteGameState()` when new GameState fields are added. The TDD adds `orientation` to LiteDiscipleState and restructures RelationshipEdge (closeness/attraction/trust/status replacing affinity). The `version: 7` hardcode at game-state.ts:325 must become `version: 8`. While `generateInitialRelationships()` and `generateDisciple()` are both updated (TDD SS3.4), `createDefaultLiteGameState()` itself is never mentioned -- its `version` field remains a gap. For loaded saves, `SAVE_VERSION` in save-manager.ts overwrites the version. But for NEW games, `createDefaultLiteGameState()` is called directly and the version would be 7 despite having v8 field structures. | game-state.ts L325: `version: 7`; TDD SS3.5 L515: `SAVE_VERSION: 7->8`; TDD full-text grep for "createDefault": 0 matches; MASTER-ARCHITECTURE L97: SS6.2 requirement |
| 9 | D4 Performance | PASS | social-tick scans O(n^2) pairs where n=8 disciples, yielding 56 directed pairs -- trivially small. Scan runs at CAUSAL_SCAN_INTERVAL_TICKS=300 (~5 min), not every tick. AI calls are deferred to AsyncAIBuffer (ADR-Ib-03), not blocking the tick. AttractionAccumulator and CooldownEntry are lightweight in-memory structures. | TDD SS3.2 L447-448: in-memory; SS3.3 L481: scan interval 300; ADR-Ib-03: async AI |
| 10 | D5 Naming Consistency | PASS | All new names follow established patterns: `social-tick` parallels `causal-tick`; `social-engine.ts` parallels `causal-evaluator.ts` in Engine layer; `SocialEngine` class parallels `CausalRuleEvaluator` class; `SOCIAL_EVENT_TEMPLATES` parallels `ENCOUNTER_TEMPLATES`; `RelationshipStatus` parallels `RelationshipTag`. affinity->closeness rename is consistent across all 20+ touchpoints listed. | TDD SS3.2-3.3: naming matches pattern; SS2.7 L271-277: consistent rename |

### R6 Adversarial QA

| # | Dimension | Verdict | Analysis | Evidence |
|---|-----------|:-------:|----------|----------|
| 11 | D1 Boundary Cases | WARN | **Attraction rate-limiter window reset behavior unspecified.** TDD SS3.2 defines `AttractionAccumulator` with `windowStartTick` and `accumulated` fields, and `applyAttractionRateLimit()` function. But the TDD does not specify: (a) what happens when accumulated exactly equals 5 (does delta become 0 or is it clamped?), (b) whether the window slides or resets (if tick 600 is window start and tick 900 arrives, does accumulated reset to 0 or carry over?), (c) whether negative attraction delta counts against the accumulator. V-10 says "300 ticks, +5 cap" but no edge case spec. This is a formula-level gap that could lead to inconsistent implementation. | TDD SS3.2 L435-453: AttractionAccumulator interface + method signature only, no algorithm; V-10 L879: test spec is a single line |
| 12 | D2 Concurrent Write | PASS | social-tick (612:5) writes `edge.status` and may write closeness/attraction/trust deltas for invitation consequences. soul-engine writes deltas at (625:0). Time ordering is fixed: 612 < 625. Within phase 612, causal-tick (order=0) runs before social-tick (order=5). Multi-writer audit in SS0 G-6 (L22-35) explicitly maps all 5 writers with phase ordering proof. No same-tick write collision possible. | TDD SS0 G-6 L22-35: 5 writers mapped; SS6.2 L639-660: pipeline ordering; ADR-Ib-01 L57-61: order=5 |
| 13 | D3 Regression Risk | PASS | affinity->closeness rename touches 20+ files but the TDD provides complete function-by-function impact audit (SS8.1-8.5). All 9 affected function signatures are listed with before/after (SS8.2 L734-744). All 5 write targets are mapped (SS8.3 L748-754). Handler linkages are enumerated (SS8.4 L758-764). Regression test update is specified (SS8.7 L789-798). The 6-layer coding order (SS9) ensures type errors surface immediately at each layer boundary. | TDD SS8 L720-806: complete impact audit; SS9 L810-846: 6-layer execution plan |
| 14 | D4 Testability | PASS | 10 verification cases (V-1 through V-10) are all automatable -- they test specific numeric conditions, thresholds, and state transitions. The `verify-social-system.ts` script is specified in SS10.3 L866-879. Regression-all.ts updates are planned (SS8.5 L770). Human verification (SS10.4) supplements but does not replace automated checks. | TDD SS10 L850-887: V-1 through V-10 with specific assertions |
| 15 | D5 Save Compatibility | PASS | migrateV7toV8 (SS7.2 L684-710) handles all field transformations: affinity->closeness (direct copy), attraction (0), trust (affinity*0.5), status (null), orientation (generated from gender). The migration chain (SS7.3 L714-716) extends correctly. V-7 (SS10.3 L876) verifies the migration. The delete step (`delete rel.affinity` at L695) ensures no stale field. | TDD SS7.2 L684-710: complete migration; SS7.3: chain v7->v8->defaults; L695: explicit delete |

---

## L2 CoVe Verification

### CoVe #1 -- R5-D3 WARN: createDefaultLiteGameState() gap

**Original Conclusion**: WARN -- TDD never mentions updating `createDefaultLiteGameState()`, including its hardcoded `version: 7`.

**Verification Questions**:
1. Does the TDD SS9 coding order or any other section explicitly mention `createDefaultLiteGameState()`?
2. Would the SGE (engineer) naturally discover and fix this even if the TDD omits it?
3. Is there a mechanism that prevents a new game from having an inconsistent version?

**Independent Answers**:
1. Grep for "createDefault" in the TDD: 0 matches. The function is not mentioned anywhere in the 913-line TDD. SS9 L817 lists `game-state.ts` changes as "Orientation, RelationshipEdge restructure, LiteDiscipleState +orientation" but does not mention the factory function. (Evidence: TDD full text, 0 grep results)
2. An engineer running `tsc --noEmit` would detect that `createDefaultLiteGameState()` returns an object missing `orientation` on disciples and `attraction`/`trust`/`status` on relationships. The type error would force a fix. However, the `version: 7` vs `version: 8` discrepancy is NOT a type error -- it's a `number` either way. So `tsc` would NOT catch the version number gap. (Evidence: game-state.ts L271: `version: number` -- no literal type constraint)
3. For loaded saves, `save-manager.ts L262: result['version'] = SAVE_VERSION` overwrites the version after migration. For new games, `createDefaultLiteGameState()` is called directly by main.ts -- no overwrite occurs. So a new game would have `version: 7` with v8 field structures. This could cause the save-manager to run `migrateV7toV8` on a state that's already v8-shaped, potentially corrupting data (e.g., `rel.affinity` would be undefined, and `oldAffinity ?? 0` would yield 0, overwriting the real closeness value). (Evidence: save-manager.ts L262; game-state.ts L325)

**Comparison**: Consistent with original finding and actually more severe than initially assessed. The tsc check would catch the field-level gaps but NOT the version number, and the version mismatch creates a real data corruption risk on save->load of a new game.

**Final Verdict**: **Upgrade to BLOCK.** A new game saved and reloaded would trigger `migrateV7toV8` on already-v8 data, corrupting relationship values. This is not a cosmetic issue.

---

### CoVe #2 -- R4-D4 WARN: SOUL-VISION-ROADMAP missing I-beta

**Original Conclusion**: WARN -- SOUL-VISION-ROADMAP has no I-beta entry despite MASTER-PRD and task-tracker being updated.

**Verification Questions**:
1. Is SOUL-VISION-ROADMAP a TDD-scope concern or a SPM-scope concern?
2. Does this create a technical risk or only a governance risk?

**Independent Answers**:
1. The TDD SS8.6 (L773-785) lists 9 documents to update but does NOT include SOUL-VISION-ROADMAP. The Roadmap is SPM's responsibility (it tracks multi-Phase planning). However, TDD SS8.6 claims to be a "complete document consistency audit" -- omitting the Roadmap is an audit gap. (Evidence: TDD L773-785: 9 docs listed, no SOUL-VISION-ROADMAP)
2. The risk is governance-only: a developer or planner checking the Roadmap would not see I-beta's existence. No technical impact on code. This is the 8th occurrence of this pattern across 21 review sessions. (Evidence: MEMORY.md: reviews #2, #5, #6, #7, #10, #16, #17 pattern)

**Comparison**: Consistent. Governance-only risk.
**Final Verdict**: Maintain WARN. Not BLOCK-worthy, but should be tracked as a recurring governance gap.

---

### CoVe #3 -- R6-D1 WARN: Attraction rate-limiter edge cases

**Original Conclusion**: WARN -- Window reset behavior, exact-boundary, and negative delta handling unspecified.

**Verification Questions**:
1. Does the PRD provide rate-limiter algorithm detail that the TDD could reference?
2. Is this a TDD-level concern or an SGE implementation decision?

**Independent Answers**:
1. PRD L222: "每对弟子每 300 ticks 内，attraction 正向累积上限 +5（防止同区持续碰面导致 attraction 爆炸式增长）" -- the PRD says "positive accumulation cap +5 per 300 ticks." This implies: (a) only positive deltas count, (b) window is 300 ticks, (c) cap is +5. But it does not specify sliding vs. fixed window or exact-boundary behavior. (Evidence: PRD L222)
2. TDD is supposed to resolve PRD ambiguities for SGE. The TDD provides interface + method signature (`applyAttractionRateLimit(pairKey, delta, currentTick): number`) and a verification case (V-10: "300 ticks, +5 cap") but no algorithm pseudocode. Compare to other formula specifications in the TDD: `migrateV7toV8` has full pseudocode (L684-710), `applyEvaluationResult` has explicit formulas (L399), decay has explicit constants (L407-413). The rate-limiter is uniquely under-specified. (Evidence: TDD L452-453: method signature only; contrast with L684-710 pseudocode)

**Comparison**: Consistent. The TDD is inconsistent in its level of algorithm detail -- some formulas have pseudocode, the rate-limiter does not.
**Final Verdict**: Maintain WARN. The gap is real but the SGE can infer a reasonable implementation from the PRD + interface + test spec. Not BLOCK because the behavior is constrained enough to be unambiguous in practice (fixed window + positive-only + cap).

---

## Devil's Advocate

Not required (L1 is not all-PASS).

---

## Gate 1 WARN Resolution Tracking

| Gate 1 WARN | Resolution in TDD | Status |
|-------------|-------------------|:------:|
| W1: Few-shot + CausalTriggerType gap | SS4.2 covers few-shot; SS2.6 adds CausalTriggerType | Resolved |
| W2: Attraction rate limit | SS3.2 adds `applyAttractionRateLimit` + V-10 | Resolved |
| W3: RelationshipStatus owner | ADR-Ib-01 designates social-tick as sole writer | Resolved |
| W4: Governance registration | MASTER-PRD + task-tracker updated; SOUL-VISION-ROADMAP still missing | Partial |
| W5: Roadmap ordering | Addressed by actual decomposition (I-alpha + I-beta); doc gap remains | Partial |

---

## L1 Final Summary Table

| # | Role | Dimension | Verdict | Summary | Evidence |
|---|------|-----------|:-------:|---------|----------|
| 1 | R4 | D1 Scope Creep | PASS | 27 files match PRD IN scope | TDD SS9, PRD SS2.1 |
| 2 | R4 | D2 Schedule Estimate | PASS | 6-layer execution plan, L complexity by convention | TDD SS9 |
| 3 | R4 | D3 Dependency Blocking | PASS | Internal deps only, all prereqs complete | TDD SS0 L7, ADR-Ib-03 |
| 4 | R4 | D4 Roadmap Conflict | WARN | SOUL-VISION-ROADMAP still missing I-beta (8th occurrence) | Grep: 0 matches |
| 5 | R4 | D5 Delivery Verifiability | PASS | V-1 through V-10 + regression + human | TDD SS10 |
| 6 | R5 | D1 Coupling | PASS | Unidirectional deps, no cycles | TDD SS6.3, ADR-Ib-01 |
| 7 | R5 | D2 Extensibility | PASS | Registry pattern, ~5 files for new status | TDD SS2.2, SS2.11 |
| 8 | R5 | D3 State Pollution | BLOCK | `createDefaultLiteGameState()` not updated: version stays 7, new-game save-load corrupts data | game-state.ts L325, TDD 0 mentions |
| 9 | R5 | D4 Performance | PASS | O(n^2) n=8 trivial, 300-tick interval, async AI | TDD SS3.2-3.3 |
| 10 | R5 | D5 Naming Consistency | PASS | Matches existing patterns | TDD SS3.2-3.3, SS2.7 |
| 11 | R6 | D1 Boundary Cases | WARN | Rate-limiter algorithm unspecified (window type, exact boundary, negative delta) | TDD SS3.2 L435-453 |
| 12 | R6 | D2 Concurrent Write | PASS | Phase 612 < 625, fixed ordering | TDD SS0 G-6, SS6.2 |
| 13 | R6 | D3 Regression Risk | PASS | Complete impact audit + 6-layer coding order | TDD SS8, SS9 |
| 14 | R6 | D4 Testability | PASS | 10 V-cases automatable | TDD SS10 |
| 15 | R6 | D5 Save Compatibility | PASS | migrateV7toV8 complete + delete old field + V-7 test | TDD SS7.2 |

**Statistics**: BLOCK: 1 | WARN: 2 | PASS: 12

---

## Improvement Suggestions

1. **Add explicit `createDefaultLiteGameState()` update to TDD.** Add a subsection under SS2 or SS3 specifying: (a) `version: 7` -> `version: 8` in game-state.ts L325, (b) confirm that `generateInitialRelationships()` returns new-schema edges (closeness/attraction/trust/status), (c) confirm `generateDisciple()` returns orientation. Also add this to SS9 L817 coding order. This resolves the BLOCK.

2. **Add rate-limiter algorithm pseudocode to SS3.2.** Match the detail level of migrateV7toV8 (SS7.2). Specify: fixed window (reset accumulated to 0 when `currentTick - windowStartTick >= 300`), positive-only (negative deltas bypass limiter), clamp (if `accumulated + delta > 5`, return `5 - accumulated`, minimum 0).

3. **Update SOUL-VISION-ROADMAP to reflect Phase I decomposition.** Replace or augment the monolithic "Phase I" section with sub-Phase entries (I-alpha, I-beta, future I-gamma). This is the 8th time this gap has been flagged.

4. **Add SS8.6 entry for SOUL-VISION-ROADMAP.** The document audit in SS8.6 lists 9 documents but omits the Roadmap. Even if the Roadmap update is SPM's job, the audit should acknowledge it.

---

## Final Verdict

**BLOCKED**

| Metric | Count |
|--------|:-----:|
| BLOCK | 1 |
| WARN | 2 |
| PASS | 12 |

The TDD is thorough with excellent coverage: 4 ADRs, complete impact audit (SS8), 6-layer execution plan (SS9), and 10 targeted verification cases (SS10). All 5 Gate 1 WARNs were addressed at TDD level. However, one critical gap blocks approval:

- **BLOCK (R5-D3)**: `createDefaultLiteGameState()` is not mentioned anywhere in the TDD. The `version: 7` hardcode will not be updated to 8, causing new-game save-load to trigger `migrateV7toV8` on already-v8 data and corrupt relationship values. Fix: add explicit update instruction for this function.

After fixing the BLOCK, the two WARNs are non-blocking:
- W1 (R4-D4): SOUL-VISION-ROADMAP gap -- governance, not technical
- W2 (R6-D1): Rate-limiter algorithm detail -- inferrable but inconsistent with TDD's own level of detail elsewhere
