# Phase I-beta Gate 2 Review Report (v2 -- Re-review)

**Review Date**: 2026-04-02 | **Reviewer**: doc-reviewer (independent)
**Review Target**: `docs/design/specs/phaseI-beta-TDD.md` (v1.1 -- post-fix)
**Prior Review**: `docs/pipeline/phaseI-beta/review-g2.md` (v1 -- BLOCKED)
**Consecutive Full PASS Count**: 0

**Activated Roles**:
- R4 Project Manager (mandatory for Gate 2)
- R5 Paranoid Architect (mandatory for Gate 2)
- R6 Adversarial QA (mandatory for Gate 2)

---

## Prior BLOCK/WARN Fix Verification

| # | Prior Issue | Severity | Fix Claimed | Verification Result | Status |
|---|-------------|:--------:|-------------|---------------------|:------:|
| 1 | R5-D3: `createDefaultLiteGameState()` not updated | BLOCK | TDD v1.1 added SS2.0 | SS2.0 (L129-138) specifies: version 7->8, closeness/attraction/trust/status defaults, orientation field. Includes risk note about data corruption. SS9 L840 includes "createDefaultLiteGameState() version->8" in L0 coding order. | RESOLVED |
| 2 | R4-D4: SOUL-VISION-ROADMAP missing I-beta | WARN | TDD v1.1 added ROADMAP to SS8.6 | SS8.6 L808 now lists `SOUL-VISION-ROADMAP.md` with "+I-beta entry". However, grep of actual ROADMAP file returns 0 matches for "I-beta" -- the TDD audit gap is fixed but actual file update is SGE scope. | RESOLVED (TDD scope) |
| 3 | R6-D1: Rate-limiter algorithm unspecified | WARN | TDD v1.1 added pseudocode to SS3.2 | SS3.2 L465-475 now contains full pseudocode: negative bypass, fixed-window reset at 300 ticks, remaining = max(0, 5 - accumulated), clamped = min(delta, remaining). All three edge cases (negative, boundary, window type) addressed. | RESOLVED |

---

## L1 Dimension Exhaustive Review

### R4 Project Manager

| # | Dimension | Verdict | Analysis | Evidence |
|---|-----------|:-------:|----------|----------|
| 1 | D1 Scope Creep | PASS | TDD scope aligns with PRD SS2.1 IN table. SS9 lists ~27 files (20 modified + 3 new + 4 scripts/docs). Cross-checked each against PRD IN items: three-dimensional vector (SS2.1-2.4), orientation (SS2.3), RelationshipStatus (SS2.2), AI invitation (SS4.3), rate-limiter (SS3.2), MUD templates (SS2.11), encounter flirt (SS2.9), migration (SS7). No unrequested features. `emotion-pool.ts` (SS9 L847) is required by SoulEventType expansion -- not scope creep. | TDD SS9 L835-868 vs PRD SS2.1 IN table; all 9 IN items have corresponding TDD sections |
| 2 | D2 Schedule Estimate | PASS | L complexity appropriate for 27-file change with rename across 104 affinity references (grep count: 104 across 16 files). 6-layer coding order (L0-L5) with dependency-sorted topological execution enables incremental `tsc` validation at each boundary. No hour estimates by project convention. | TDD SS9 L835-868: 6 layers; grep `affinity` in src/: 104 occurrences / 16 files |
| 3 | D3 Dependency Blocking | PASS | All prerequisites complete: Phase GS (v7, gender system) and Phase I-alpha (causal engine) both marked done in task-tracker L47. AsyncAIBuffer reuse (ADR-Ib-03, L89-96) depends on Phase G infrastructure, operational since v0.4.2. No external or unverified dependencies. | task-tracker.md L43-47: GS + I-alpha both completed; TDD SS0 L7: explicit prereq statement |
| 4 | D4 Roadmap Conflict | PASS | Prior WARN resolved. TDD SS8.6 L808 now includes SOUL-VISION-ROADMAP in the document update audit. MASTER-PRD SS5 L100 lists I-beta at v0.6.0/v8. task-tracker.md L48 has I-beta row. The actual ROADMAP file update is SGE execution scope -- the TDD correctly instructs the update. MASTER-PRD SS5 shows I-beta does not conflict with subsequent Phases (I and J remain "planned" at v0.9/v1.0). | TDD SS8.6 L808; MASTER-PRD L100; task-tracker L48 |
| 5 | D5 Delivery Verifiability | PASS | SS10 defines 10 targeted verification cases (V-1 through V-10) covering all 7 INV from PRD SS3. Mapping: V-1->INV-1, V-2->INV-3, V-3->INV-2/crush, V-4->tags, V-5->decay, V-6->INV-4, V-7->INV-6, V-8->INV-5, V-9->ceiling, V-10->rate-limit. Regression test update planned (SS8.7 L812-822). Human verification supplements at SS10.4 L906-910. All V-cases are automatable assertions. | TDD SS10 L873-903: 10 V-cases; PRD SS3 L77-83: 7 INV |

### R5 Paranoid Architect

| # | Dimension | Verdict | Analysis | Evidence |
|---|-----------|:-------:|----------|----------|
| 6 | D1 Coupling | PASS | social-engine depends on game-state (R/W), soul.ts (R), encounter.ts (R), relationship-formulas (R) -- all unidirectional. SS6.3 (L688-691) declares the dependency rows. social-tick handler depends only on social-engine + tick-pipeline. No circular dependency introduced. ADR-Ib-01 (L41-61) cleanly separates social-tick (status writer) from soul-engine (delta writer) via phase ordering (612:5 vs 625:0). Verified against current dependencies.md: no existing module depends on social-engine, so adding it creates no reverse dependency. | TDD SS6.3 L688-691; ADR-Ib-01 L41-61; dependencies.md current state has no social-engine entry |
| 7 | D2 Extensibility | PASS | Adding a new RelationshipStatus (e.g., "master-disciple") requires changes in: (1) RelationshipStatus union in soul.ts, (2) scanForSocialEvents threshold conditions in social-engine.ts, (3) SOCIAL_EVENT_TEMPLATES in social-event-templates.ts, (4) SoulEventType entries in soul.ts, (5) SOUL_EVENT_POLARITY in soul.ts -- 5 files, all using registry/table patterns. This is an acceptable extensibility cost given the complexity of the feature. The enum-based approach matches existing patterns (e.g., adding a new RelationshipTag follows the same pattern). | TDD SS2.2 L179-181: union type; SS2.11 L386-391: template registry; SS2.5 L233-266: event type + polarity registry |
| 8 | D3 State Pollution | PASS | **Prior BLOCK resolved.** TDD SS2.0 (L129-138) now explicitly specifies `createDefaultLiteGameState()` update: version 7->8, three-dimensional relationship defaults, orientation field. Includes risk explanation. SS9 L840 confirms L0 coding order includes this update. Multi-writer audit in SS0 G-6 (L22-35) maps all 5 relationship writers with pipeline phase ordering proof (612:5 < 625:0). `edge.status` has single writer (social-tick, ADR-Ib-01 L61). New fields (`attraction`, `trust`) follow same write pattern as existing `closeness` (soul-engine + social-engine, time-isolated). gamestate.md update is planned in SS8.6 L799. | TDD SS2.0 L129-138; SS0 G-6 L22-35; MASTER-ARCHITECTURE L94-98: SS6.2 requirements satisfied |
| 9 | D4 Performance | PASS | social-tick scans O(n^2) pairs where n=8 disciples = 56 directed pairs -- trivially small. Scan runs at CAUSAL_SCAN_INTERVAL_TICKS=300 (~5 min real-time), not every tick. AI calls deferred to AsyncAIBuffer (ADR-Ib-03, L89-107), not blocking the tick. AttractionAccumulator and CooldownEntry are lightweight in-memory structures (SS3.2 L439-451). Invitation flow spans 2-3 ticks via async buffer -- no single-tick computational spike. | TDD SS3.2 L447-451: in-memory structs; SS3.3 L503: scan interval 300; ADR-Ib-03 L89-107: async AI |
| 10 | D5 Naming Consistency | PASS | All new names follow established patterns: `social-tick` parallels `causal-tick` (both in 612 phase); `social-engine.ts` parallels `causal-evaluator.ts` in Engine layer; `SocialEngine` class name follows PascalCase convention; `SOCIAL_EVENT_TEMPLATES` parallels `ENCOUNTER_TEMPLATES`; `RelationshipStatus` parallels `RelationshipTag`. The affinity->closeness rename is consistent across all 16 affected files (grep confirmed 104 occurrences across 16 files, all listed in SS9). File paths follow `src/engine/` for engine modules, `src/engine/handlers/` for handlers, `src/shared/data/` for template data. | TDD SS3.2-3.3: naming patterns; SS9 L835-868: file path conventions; grep affinity: 16 files all accounted for in SS9 |

### R6 Adversarial QA

| # | Dimension | Verdict | Analysis | Evidence |
|---|-----------|:-------:|----------|----------|
| 11 | D1 Boundary Cases | PASS | **Prior WARN resolved.** SS3.2 L465-475 now provides complete rate-limiter pseudocode addressing all three edge cases: (a) negative deltas bypass limiter (`if delta <= 0 return delta`), (b) fixed-window reset (`currentTick - windowStartTick >= 300` triggers reset), (c) exact-boundary handling (`remaining = max(0, 5 - accumulated)` so when accumulated=5, remaining=0, clamped=0). Other boundary cases: closeness clamped to [-100, +100] (SS3.1 L410), attraction to [0, 100] (SS2.1 L161), trust to [-100, +100] (SS2.1 L163). Empty relationships array handled by for-loop naturally. Orientation weights [0, 1] range prevents division issues in effectiveAttraction. | TDD SS3.2 L465-475: rate-limiter pseudocode; SS2.1 L159-163: range constraints; SS3.1 L410: clamp |
| 12 | D2 Concurrent Write | PASS | Pipeline ordering is deterministic: social-tick at (612:5) writes edge.status and may write closeness/attraction/trust deltas for invitation consequences. soul-engine writes deltas at (625:0). Time ordering fixed: 612 < 625. Within phase 612, causal-tick (order=0) runs before social-tick (order=5). Multi-writer audit in SS0 G-6 (L22-35) explicitly maps all 5 writers with phase ordering proof. Verified against pipeline.md: CAUSAL_EVAL=612 < SOUL_EVAL=625, confirmed. No same-phase multi-writer collision possible. | TDD SS0 G-6 L22-35; SS6.2 L661-682; pipeline.md SS2: phase 612 < 625 |
| 13 | D3 Regression Risk | PASS | affinity->closeness rename touches 16 files / 104 references (grep verified). TDD provides complete function-by-function impact audit: SS8.1 (L746-752) type tracing for 5 types, SS8.2 (L756-766) lists 9 affected function signatures with before/after, SS8.3 (L770-776) maps 5 write targets, SS8.4 (L780-786) enumerates 5 handler linkages. Regression coverage: SS8.7 (L812-822) specifies 9 categories of regression testing. 6-layer coding order (SS9) ensures type errors surface immediately at each layer boundary via `tsc --noEmit`. Impact scope is large but methodically audited. | TDD SS8 L742-822: complete impact audit; grep src/ affinity: 104 hits / 16 files all listed |
| 14 | D4 Testability | PASS | 10 verification cases (V-1 through V-10) are all automatable -- they test specific numeric conditions (V-1: independent evolution), thresholds (V-3: attraction 50/30), state transitions (V-7: migration), and AI parsing (V-8: mock AI). `verify-social-system.ts` script is specified in SS10.3 L889. regression-all.ts update planned (SS8.5 L791-793). Human verification (SS10.4 L906-910) supplements but does not replace automated checks. All 5 PRD success criteria (SC-1 through SC-5) have corresponding V-cases. | TDD SS10 L873-903: V-1 through V-10; SS10.3 L889: verification script |
| 15 | D5 Save Compatibility | PASS | migrateV7toV8 (SS7.2 L706-731) handles all field transformations: affinity->closeness (direct copy), attraction (0), trust (affinity*0.5, rounded), status (null), orientation (generated from gender). The delete step (`delete rel.affinity` at L717) prevents stale data. Migration chain (SS7.3 L737) extends correctly: V7->V8->defaults. V-7 test (SS10.3 L899) verifies migration. createDefaultLiteGameState version update (SS2.0 L131-133) ensures new games start at v8. Current schema.md (L19) shows v7 as latest; TDD SS8.6 L802 plans schema.md update. Verified current save-manager.ts: SAVE_VERSION=7 at L25, `result['version'] = SAVE_VERSION` at L262 -- both planned for update to 8 (SS3.5 L537). | TDD SS7.2 L706-731; SS2.0 L131; SS3.5 L537; schema.md L19; save-manager.ts L25/L262 |

---

## L2 CoVe Verification

No WARN or BLOCK items in L1. L2 not triggered.

---

## Devil's Advocate

> All 15 dimensions passed. Devil's Advocate is mandatory per protocol.

### Historical Pattern Check (Top 5 from MEMORY.md)

| # | Historical Pattern | Search Result | Finding |
|---|-------------------|---------------|---------|
| 1 | **Roadmap/governance registration gap** (8 prior occurrences: sessions #2, #5, #6, #7, #10, #16, #17, and v1 of this review) | TDD SS8.6 L808 now includes SOUL-VISION-ROADMAP in the 10-document update list (was 9 in v1.0). task-tracker.md L48 has I-beta. MASTER-PRD L100 has I-beta. | No gap found this round. SS8.6 document audit is complete. |
| 2 | **createDefaultLiteGameState() omission** (sessions #18, #19 for GS, and v1 of this review) | TDD SS2.0 (L129-138) explicitly addresses this. SS9 L840 includes it in L0 coding order. | No gap found. Pattern was the BLOCK in v1 and is now resolved. |
| 3 | **layers.md / dependencies.md registration gap** (sessions #4, #20) | TDD SS8.6 lists both arch/layers.md (L803) and arch/dependencies.md (L801) for update. SS6.3 (L688-691) provides the dependency matrix rows. | No gap found. |
| 4 | **File list under-count / omission** (sessions #6, #10) | TDD SS9 lists 27 files. Grep confirms 16 files have "affinity" references -- all 16 appear in SS9. 3 new files (social-engine, social-tick.handler, social-event-templates) + verify script also listed. emotion-pool.ts at L847 is correctly included for 13 new SoulEventType entries. | No omission found. |
| 5 | **task-tracker gap** (sessions #7, #9, #15) | task-tracker.md L48 already has I-beta row with correct status indicators. | No gap found. |

### Hypothetical Failure Scenarios

**Scenario 1: "What if the AI model fails to produce three-dimensional deltas consistently?"**

The TDD addresses this via SS4.3 L601-603: parseSoulEvalResult validates three-dimensional field existence, retries up to 2 times on failure (INV-5), and degrades to closeness-only if all retries fail. ADR-Ib-04 (L109-124) deliberately keeps KeyRelationshipEvent as single-value closenessDelta to avoid prompt pressure. The degradation path is well-specified. Risk is acceptable.

**Scenario 2: "What if the affinity->closeness rename is incomplete -- one file missed -- and tsc still passes because the field is accessed via `any` or bracket notation?"**

The TDD's 6-layer coding order (SS9) starts at L0 with type changes, so `tsc --noEmit` at L0 boundary would flag any typed reference to `edge.affinity`. However, bracket notation (`rel['affinity']`) or `as any` casts would escape detection. Grep for "affinity" (currently 104 hits) provides the second safety net -- SGE must verify post-rename grep returns 0 hits outside of comments/changelogs. The TDD does not explicitly state "post-rename grep verification step" but SS8.7 L812 specifies regression testing that would catch behavioral regressions. The risk exists but is mitigated by two independent checks (tsc + regression). **Not a BLOCK -- but warrants an improvement suggestion.**

---

## L1 Final Summary Table

| # | Role | Dimension | Verdict | Summary | Evidence |
|---|------|-----------|:-------:|---------|----------|
| 1 | R4 | D1 Scope Creep | PASS | 27 files match PRD IN scope, no extras | TDD SS9 vs PRD SS2.1 |
| 2 | R4 | D2 Schedule Estimate | PASS | 6-layer plan, L complexity, 104 affinity refs across 16 files | TDD SS9, grep affinity |
| 3 | R4 | D3 Dependency Blocking | PASS | All prereqs complete, internal deps only | task-tracker L43-47 |
| 4 | R4 | D4 Roadmap Conflict | PASS | Prior WARN fixed: SS8.6 now includes ROADMAP; MASTER-PRD + tracker updated | TDD SS8.6 L808 |
| 5 | R4 | D5 Delivery Verifiability | PASS | V-1 to V-10 cover all 7 INV + automatable | TDD SS10, PRD SS3 |
| 6 | R5 | D1 Coupling | PASS | Unidirectional deps, no cycles, clean separation | TDD SS6.3, ADR-Ib-01 |
| 7 | R5 | D2 Extensibility | PASS | Registry pattern, ~5 files for new status | TDD SS2.2, SS2.11 |
| 8 | R5 | D3 State Pollution | PASS | Prior BLOCK fixed: SS2.0 covers createDefault + version | TDD SS2.0, SS0 G-6 |
| 9 | R5 | D4 Performance | PASS | O(n^2) n=8 trivial, 300-tick interval, async AI | TDD SS3.2-3.3, ADR-Ib-03 |
| 10 | R5 | D5 Naming Consistency | PASS | Matches patterns (causal-tick, encounter.ts, etc.) | TDD SS3, grep verification |
| 11 | R6 | D1 Boundary Cases | PASS | Prior WARN fixed: full rate-limiter pseudocode | TDD SS3.2 L465-475 |
| 12 | R6 | D2 Concurrent Write | PASS | Phase 612:5 < 625:0, fixed ordering | TDD SS0 G-6, pipeline.md |
| 13 | R6 | D3 Regression Risk | PASS | Complete impact audit + 6-layer tsc checks | TDD SS8, grep 104 hits/16 files |
| 14 | R6 | D4 Testability | PASS | 10 V-cases automatable, all SC covered | TDD SS10 |
| 15 | R6 | D5 Save Compatibility | PASS | migrateV7toV8 complete + createDefault v8 + delete old | TDD SS7.2, SS2.0 |

**Statistics**: BLOCK: 0 | WARN: 0 | PASS: 15

---

## Improvement Suggestions

1. **Add explicit post-rename grep verification step to SS10 or SS9.** After completing the affinity->closeness rename, the SGE should run `grep -r "affinity" src/` and verify 0 hits outside comments/changelogs/migration code. This guards against bracket-notation or `as any` escapes that `tsc` would miss. Currently the TDD relies on type checking + regression testing, but an explicit grep step would close the gap.

2. **Specify AttractionAccumulator cleanup policy.** SS3.2 defines in-memory AccumulatorMap but does not specify when stale entries are purged. Over very long sessions (thousands of ticks), the map could accumulate entries for dissolved pairs. A simple "delete entries with windowStartTick older than 2x interval" in the scan loop would prevent unbounded growth. This is a P4 concern (n=28 pairs at most for 8 disciples) but worth documenting.

3. **Consider adding V-case for bidirectional status symmetry.** SS2.2 L182-183 states lover/sworn-sibling/nemesis are bidirectional while crush is unidirectional. V-3 tests crush auto-marking but no V-case explicitly verifies that establishing a lover relationship writes both A->B and B->A edges simultaneously. Adding this would guard against asymmetric state bugs.

---

## Final Verdict

**PASS**

| Metric | Count |
|--------|:-----:|
| BLOCK | 0 |
| WARN | 0 |
| PASS | 15 |

All three prior issues (1 BLOCK + 2 WARN) from the v1 review have been verified as resolved in TDD v1.1. The TDD provides comprehensive coverage: 4 ADRs, a complete multi-writer audit (SS0 G-6), explicit createDefaultLiteGameState() update instruction (SS2.0), full rate-limiter pseudocode (SS3.2), a 16-file impact audit (SS8), 6-layer coding order (SS9), and 10 targeted verification cases (SS10). Devil's Advocate found no new issues. The document is ready for Gate 2 signoff.
