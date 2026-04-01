# Phase J-Goal Gate 1 Review Report

**Review Date**: 2026-04-01 | **Reviewer**: doc-reviewer (independent)
**Review Target**: `docs/features/phaseJ-goal-PRD.md` v1.0 + `docs/design/specs/phaseJ-goal-user-stories.md`
**Consecutive All-PASS Count**: 0 (first review for this Phase)

**Activated Roles**:
- R1 Devil PM (mandatory)
- R2 Senior Player (activated: core experience change -- Layer 5 behavior coherence)
- R3 Numerical Designer (mandatory)
- R4 Project Manager (activated: cross-version impact -- GameState v6 + Roadmap J3/J4)
- R5 Paranoid Architect (mandatory)

---

## L0 Content Traceability

| Story# | AC# | Data Anchor | Trace Result | Status |
|--------|-----|-------------|-------------|:------:|
| US-JG-01 | 1 | PRD SS3.3 Event Trigger Table | PRD L92-97: 3-row event trigger table with conditions/goals/targets. Complete. | PASS |
| US-JG-01 | 2 | PRD SS3.3 | PRD L97: revenge row: "rival tag + delta < -5". Complete. | PASS |
| US-JG-01 | 3 | PRD SS3.3 | PRD L98: friendship row: "affinity >= 40 + no friend tag". Complete. | PASS |
| US-JG-01 | 4 | PRD SS3.3 G1 | PRD L107: G1 guard "activeGoals.length >= MAX_ACTIVE_GOALS -> reject". Complete. | PASS |
| US-JG-01 | 5 | PRD SS3.3 G2 | PRD L108: G2 guard "same type -> reject". Complete. | PASS |
| US-JG-02 | 1 | PRD SS3.3 Periodic Scan Table | PRD L101-104: 2-row periodic scan table with conditions/priority. Complete. | PASS |
| US-JG-02 | 2 | PRD SS3.3 | PRD L104: ambition row. Complete. | PASS |
| US-JG-02 | 3 | PRD SS3.3 G3 | PRD L109: G3 guard "event-driven preempts periodic". Complete. | PASS |
| US-JG-03 | 1 | PRD SS3.2 Multiplier Table | PRD L73-79: 5x7 multiplier table with 35 numeric values. Complete. | PASS |
| US-JG-03 | 2 | PRD SS3.2 Multi-goal Formula | PRD L81-87: formula with clamp [0.5, 2.0]. Complete. | PASS |
| US-JG-03 | 3 | PRD I5 Invariant | PRD L52: "no goal -> Layer 5 = all x1.0". Complete. | PASS |
| US-JG-04 | 1 | PRD SS3.4 + SS3.5 | PRD L114-117: completion/expiry table + L133-134: breakthrough completion text. Complete. | PASS |
| US-JG-04 | 2 | PRD SS3.4 | PRD L115: friendship completion = "target gets friend tag". Complete. | PASS |
| US-JG-04 | 3 | PRD SS3.4 | PRD L116: TTL exhaustion handling. Complete. | PASS |
| US-JG-05 | 1-3 | PRD SS3.5 Text Templates | PRD L122-149: 3 tables x 5 GoalTypes = 15 text templates. Complete. | PASS |
| US-JG-06 | 1-3 | PRD SS3.6 | PRD L155-172: GameState v6 schema + migration "goals: []". Complete. | PASS |
| US-JG-07 | 1-2 | PRD SS3.7 | PRD L177-182: prompt injection format. Complete. | PASS |

**L0 Result**: All Data Anchors successfully traced. No BLOCK.

---

## L1 Dimension Review

### R1 Devil PM

| # | Dimension | Verdict | Evidence & Analysis |
|---|-----------|:-------:|---------------------|
| 1 | D1 ROI | PASS | PRD SS6 L220-226: Cost=M, Experience=4/5. ROI = 4/M ~= 2. Type stubs already exist (personal-goal.ts confirmed at src/shared/types/personal-goal.ts L1-33). Pattern mirrors RelationshipMemoryManager (proven manageable). ROI >= 2, acceptable. |
| 2 | D2 Cognitive Load | PASS | Zero new player-facing concepts. Goals are entirely NPC-internal; players observe behavior change via MUD text (PRD SS3.5 L119-149) but never need to "learn" or "operate" the goal system. No new UI controls, commands, or resources introduced. |
| 3 | D3 Scope Control | PASS | PRD SS2 L46-53 defines 6 invariants as boundary. IN: 5 GoalTypes + Layer 5 + v6 migration + MUD text + prompt injection. OUT: "manual cancel" explicitly marked as "reserved, not implemented" (PRD L117). All PRD functionality is covered by US-JG-01 through US-JG-07. No uncovered feature points detected. |
| 4 | D4 Spec Readiness | **WARN** | PRD L95 references `getBreakthroughCost(realm, subRealm)` but this function does not exist in the codebase. Grep for `getBreakthroughCost` returns zero hits in `src/`. The actual function is `getRealmAuraCost(realm, subRealm)` at `src/shared/formulas/realm-formulas.ts:38`. A developer unfamiliar with the codebase would need to search to find the correct function name. Additionally, PRD L95 mentions "auto-breakthrough failed" as a trigger event, but the actual SoulEventType is `'breakthrough-fail'` (soul.ts L97), not `'auto-breakthrough'`. Minor naming discrepancies that could cause confusion. |

### R2 Senior Player

| # | Dimension | Verdict | Evidence & Analysis |
|---|-----------|:-------:|---------------------|
| 5 | D1 30-Second Fun | PASS | Goal assignment produces immediate MUD text (PRD SS3.5 L122-129, e.g., "[Name] eyes firm, about to attempt breakthrough"). These appear as Lv.2 ripple events (US-JG-05 AC1), which are highlighted in the MUD log per Phase H-alpha's five-level display system. Players will see visible behavior changes within 1-2 ticks after goal assignment due to Layer 5 multipliers (e.g., breakthrough: meditate x1.6). |
| 6 | D2 Number Perception | PASS | Multipliers range from 0.3 to 1.8 (PRD SS3.2 L73-79). A seclusion goal pushes meditate from baseline to x1.8, making the disciple visibly prefer meditation. The behavioral shift is perceivable through MUD action frequency without needing to see raw numbers. |
| 7 | D3 Player Agency | **WARN** | The entire goal system is fully automatic -- zero player interaction points. Players cannot assign, cancel, or influence goals. PRD SS3.4 L117 explicitly marks "manual cancel" as "reserved, not implemented". While the system creates emergent narrative ("I can see she's training hard for a breakthrough"), there is no "lever" for the player to pull. Risk: players may feel like passive observers rather than sect masters. |
| 8 | D4 Frustration Control | PASS | Goal system introduces no failure/punishment mechanics for the player. Goals that fail simply expire with a gentle MUD message (PRD SS3.5 L143-149, e.g., "sighed, breakthrough needs more preparation"). No resources are lost, no penalties applied. TTL ensures goals naturally resolve. |

### R3 Numerical Designer

| # | Dimension | Verdict | Evidence & Analysis |
|---|-----------|:-------:|---------------------|
| 9 | D1 Funnel Balance | N/A | Goal system produces and consumes zero resources. It only biases behavior weights (multiplicative Layer 5). No resource economy impact -- goals do not create/destroy aura, spirit stones, pills, or materials. This is purely a behavioral steering system. N/A because there is no resource flow to balance. |
| 10 | D2 Extreme Simulation | **WARN** | Dual-goal extreme case: seclusion(meditate=1.8) + breakthrough(meditate=1.6) = product 2.88, clamped to 2.0. With Layer 3 friend-nearby cooperative multiplier (FRIEND_COOPERATIVE_MULTIPLIER, from Phase F behavior-tree.ts L182) and Layer 4 emotion modifiers, the effective meditate weight could stack multiplicatively: Layer1_base * Layer2_trait * Layer3_friend * Layer4_emotion * Layer5_goal(2.0). If each layer contributes even modest multipliers, meditate could dominate to the point of near-deterministic behavior, defeating the weighted-random design intent. Hand calculation: base=20, trait=x1.2, friend=x1.3, joy_emotion=x1.2, goal=x2.0 => 20 * 1.2 * 1.3 * 1.2 * 2.0 = 74.88 vs next highest (rest ~10). Meditate probability ~75%+. This is high but arguably intentional for a "seclusion + breakthrough" disciple. Still, it approaches deterministic. |
| 11 | D3 Formula Verifiability | PASS | PRD SS3.2 L83-87: `Layer5Multiplier(behavior) = clamp(product(goal.behaviorMultipliers[behavior]), 0.5, 2.0)` and `finalWeight(behavior) = max(0, Layer4Weight(behavior) * Layer5Multiplier(behavior))`. All constants sourced from existing code: MAX_ACTIVE_GOALS=2 (personal-goal.ts:30), GOAL_MULTIPLIER_CAP=2.0 (personal-goal.ts:33). Clamp bounds explicitly stated as [0.5, 2.0] (PRD L81). |
| 12 | D4 Sink Completeness | N/A | No new resources introduced by the goal system. Goals themselves have TTL as their "sink" (PRD I3 L50: "every goal must have TTL, auto-clear on expiry"). No resource accumulation risk. N/A because no resource economy involvement. |
| 13 | D5 Second-Order Effects | **WARN** | The five-layer multiplicative stacking (personality * trait * relationship * emotion * goal) has no global cap on the final weight. Each layer has internal bounds (e.g., Layer 5 clamp [0.5, 2.0]), but the product across all layers is unbounded except by `max(0, ...)`. PRD SS3.2 L87 shows `finalWeight = max(0, Layer4Weight * Layer5Multiplier)`, but Layer4Weight itself is already a product of Layers 1-4 with only `max(0,...)` as floor (behavior-tree.ts L211-213). No upper-bound cap exists across the full 5-layer stack. While each layer is individually reasonable, their multiplicative composition could produce extreme weight concentration in specific scenarios. |
| 14 | D6 Spec Completeness | **WARN** | PRD L95 references `getBreakthroughCost(realm, subRealm)` -- this function does not exist. Actual: `getRealmAuraCost(realm, subRealm)` at realm-formulas.ts:38. A developer implementing the breakthrough goal trigger would need to find the correct function. Additionally, PRD SS3.3 revenge trigger (L97) says "rival tag + encounter with affinity delta < -5", but `affinityDelta` is not a direct property of encounter events -- it is computed by soul-engine's AI evaluation (or fallback evaluation) after the encounter SoulEvent is processed. The PRD does not specify where/how this delta < -5 condition is evaluated in the pipeline. |
| 15 | D7 AC-to-PRD Trace | PASS | All 19 ACs across 7 User Stories reference PRD sections that contain complete data (verified in L0 above). Every Data Anchor points to a PRD section with >= 3 rows of actual data. No hollow references found. |

### R4 Project Manager

| # | Dimension | Verdict | Evidence & Analysis |
|---|-----------|:-------:|---------------------|
| 16 | D1 Scope Creep | **WARN** | MASTER-PRD SS5 L121 lists Phase J as "v1.0" with prerequisite "Phase I" (deep world). SOUL-VISION-ROADMAP L302-303 shows "Phase J -- Emergence & Depth" with "prerequisite: Phase I". This Phase J-Goal extracts J3+J4 from the full Phase J and launches independently, bypassing the stated Phase I dependency. While this is pragmatic (Phase I's T2 NPC and causal events are not strictly required for personal goals), it contradicts the documented roadmap ordering. The MASTER-PRD and ROADMAP should be updated to reflect this extraction. |
| 17 | D2 Timeline | PASS | US-JG-01 through US-JG-07 sum to roughly 2M + 5S complexity. With type stubs already in place (personal-goal.ts confirmed), pattern matching RelationshipMemoryManager (already implemented), and zero new external dependencies, estimated effort is within a single session (~6-8h). |
| 18 | D3 Dependency Blocking | **WARN** | (a) PRD revenge trigger (L97) depends on encounter-conflict events producing an "affinity delta < -5" signal, but encounter-tick.handler emits SoulEvents that are consumed by soul-event.handler, which calls soul-engine.evaluateSoulEvent() for AI/fallback evaluation, which then calls applyEvaluationResult() to update affinity. The affinity delta is determined by AI evaluation output (stochastic), not pre-determined by encounter type. The goal system needs to intercept this delta post-evaluation, but the PRD does not specify the interception point. (b) Function name `getBreakthroughCost` (PRD L95) does not exist; actual is `getRealmAuraCost` (realm-formulas.ts:38). |
| 19 | D4 Roadmap Conflict | **WARN** | Per MASTER-PRD SS5 and ROADMAP, Phase J depends on Phase I. Extracting J3+J4 as "Phase J-Goal" is reasonable but creates an unnamed intermediate state. The MASTER-PRD version table (L121) shows Phase J as v1.0 tied to "memory/goal/self-drive" -- launching goals alone means J1 (short-term memory) and J2 (long-term memory summary) remain in the original Phase J, potentially causing confusion about what "Phase J" means. Recommendation: update ROADMAP to explicitly list Phase J-Goal as a sub-phase. |
| 20 | D5 Delivery Verifiability | PASS | Each User Story has concrete, testable ACs. US-JG-03 AC2-3 can be verified via Monte Carlo simulation (precedent: Phase F used N=1000 for trait effects). US-JG-06 can be verified with save/load cycle. US-JG-05 can be verified by MUD log inspection. All ACs are automation-friendly. |

### R5 Paranoid Architect

| # | Dimension | Verdict | Evidence & Analysis |
|---|-----------|:-------:|---------------------|
| 21 | D1 Coupling | **WARN** | Goal system needs to listen to multiple event types: (a) `breakthrough-success` for breakthrough goal completion (US-JG-04 AC1), (b) `encounter-conflict` for revenge trigger (US-JG-01 AC2), (c) affinity change events for friendship trigger (US-JG-01 AC3). Currently these events are consumed by soul-event.handler (TickPhase.SOUL_EVAL=625). The goal-tick handler at SYSTEM_TICK:20 (PRD SS6 L224) runs at phase 500, which is BEFORE soul-event.handler at 625. This means goal-tick cannot react to events from the current tick -- it would react one tick later, or it needs a different placement. The coupling to EventBus event types is manageable via subscription, but the pipeline ordering needs careful design in TDD. |
| 22 | D2 Extensibility | PASS | GoalType is a union type (personal-goal.ts L8-13). Adding a new goal type requires: (1) add to GoalType union, (2) add row to multiplier table, (3) add trigger rule, (4) add MUD text templates. All are additive changes, no modification to core goal-manager logic needed. Data-driven design confirmed by PRD SS3.1-3.5 table-based definitions. |
| 23 | D3 State Pollution | PASS | PRD SS3.6 L157-169: new `goals: PersonalGoal[]` field on LiteGameState. Single writer: goal-tick handler (manages assignment, TTL decrement, removal). No other system writes to goals[]. This matches the RelationshipMemoryManager pattern (single-writer for relationship memories). GameState field has a clear owner. |
| 24 | D4 Performance | PASS | Goal system processes: (a) 8 disciples * 2 max goals = 16 goal TTL decrements per tick (O(n)), (b) periodic scan every 60 ticks over 8 disciples (O(n)), (c) Layer 5 multiplier application in behavior-tree: 8 disciples * 7 behaviors * 2 goals = 112 multiplications per tick (O(n*k), k=constant). All well within performance budget. |
| 25 | D5 Naming Consistency | **WARN** | PRD references `getBreakthroughCost(realm, subRealm)` (L95) but actual function is `getRealmAuraCost(realm, subRealm)` (realm-formulas.ts:38). PRD uses "auto-breakthrough failed" as event name but actual SoulEventType is `'breakthrough-fail'` (soul.ts L97). The type stubs use `ttl: number | null` (personal-goal.ts L24) but PRD SS3.6 L168 says "change to number (remove null, enforce TTL)" -- this modification is documented but the naming inconsistency between current code and PRD target is a source of confusion during implementation. |

---

## L2 CoVe Verification (WARN/BLOCK items only)

### CoVe-1: R1-D4 / R3-D6 / R5-D5 -- `getBreakthroughCost` naming mismatch

**Original Finding**: WARN -- PRD L95 references `getBreakthroughCost()` which does not exist in codebase.

**Verification Questions**:
1. Does `getBreakthroughCost` exist anywhere in `src/`?
2. What is the actual function name for getting breakthrough aura cost?
3. Does the PRD reference cause ambiguity that could block implementation?

**Independent Answers**:
1. Grep `getBreakthroughCost` in src/ returns 0 matches. Confirmed non-existent. (Evidence: grep result above)
2. `getRealmAuraCost(realm: number, subRealm: number): number` at realm-formulas.ts:38. (Evidence: grep result showing function declaration)
3. A developer would need to search the codebase, find `getRealmAuraCost`, and infer it is the intended function. Mild friction, not blocking.

**Comparison**: Consistent with original finding.
**Final Verdict**: Maintain WARN. The function name should be corrected in PRD to `getRealmAuraCost` before TDD authoring.

---

### CoVe-2: R2-D3 -- Zero player agency

**Original Finding**: WARN -- Goal system is fully automatic with no player interaction.

**Verification Questions**:
1. Does the PRD define any player-facing command or UI for goals?
2. Is "manual cancel" the only player interaction point, and is it deferred?
3. Do other automatic systems (traits, emotions, relationships) have player interaction?

**Independent Answers**:
1. PRD contains no command, button, or UI element for players to interact with goals. The only player-visible output is MUD text (PRD SS3.5). (Evidence: searched entire PRD for "command", "input", "player action" -- none found)
2. PRD L117: "manual cancel (reserved)" marked as "not implemented". This is the only potential player lever, and it is deferred. (Evidence: PRD L117)
3. The existing trait system (Phase E) and emotion system (Phase F) are also fully automatic with no player interaction. The relationship system has indirect player influence via judge/storm commands (Phase H-gamma). The goal system follows the same automatic-NPC pattern as traits/emotions. (Evidence: ROADMAP Phase E/F descriptions)

**Comparison**: Finding is accurate but consistent with project design philosophy (automatic NPC systems, player observes). The risk is real but arguably by-design for an observation-focused MUD.
**Final Verdict**: Maintain WARN. Recommend considering a future "encourage/discourage goal" command as a player interaction point (could be deferred to Phase I integration).

---

### CoVe-3: R3-D2 -- Extreme simulation (dual-goal meditate dominance)

**Original Finding**: WARN -- seclusion + breakthrough dual goals produce meditate x2.0 (clamped), which with other layers could approach deterministic.

**Verification Questions**:
1. Can seclusion and breakthrough goals co-exist? (check type conflict)
2. What is the actual max meditate weight with all 5 layers?
3. Does the PRD acknowledge this behavior concentration?

**Independent Answers**:
1. PRD SS3.3 G2 says "same type -> reject". Seclusion and breakthrough are different types, so they CAN co-exist. PRD SS3.3 L103 also says seclusion requires "no active breakthrough goal", so they actually CANNOT co-exist by trigger rules. (Evidence: PRD L65 "seclusion: persistent >= 0.6 AND no active breakthrough goal")
2. Since seclusion explicitly excludes breakthrough co-existence, the maximum meditate Layer 5 multiplier from a single goal is seclusion's 1.8 (not the 2.0 clamped product). For dual-goal: seclusion(1.8) + ambition(1.1) = 1.98, or seclusion(1.8) + friendship(0.9) = 1.62. The worst case is seclusion + ambition = 1.98 on meditate.
3. PRD does not explicitly discuss this, but the clamp [0.5, 2.0] is designed to contain it.

**Comparison**: Original finding overstated -- the seclusion + breakthrough combo is actually impossible per PRD rules. The actual worst case (seclusion + ambition = 1.98) is within clamp bounds and less extreme than feared.
**Final Verdict**: Downgrade to PASS with note. The PRD's trigger guard (seclusion requires no breakthrough) prevents the most extreme scenario. However, the 5-layer multiplicative stacking concern from D5 remains valid as a separate issue.

---

### CoVe-4: R3-D5 -- Five-layer multiplicative stacking without global cap

**Original Finding**: WARN -- No global upper cap across 5 layers.

**Verification Questions**:
1. Does the existing behavior-tree code have any global weight cap after Layer 4?
2. What is the theoretical maximum weight for a single behavior?
3. Are there precedent systems in the codebase with similar uncapped multiplication?

**Independent Answers**:
1. behavior-tree.ts L211-213: `for (const w of weights) { w.weight = Math.max(0, w.weight); }` -- only a floor of 0, no ceiling. (Evidence: behavior-tree.ts L211-213)
2. Theoretical max (meditate): Layer1 base ~20, Layer2 trait max ~x1.5 (14 traits, behavior-weight effects typically +0.1~0.5), Layer3 friend x1.3, Layer4 emotion modifier (varies, up to ~1.5 for joy->meditate), Layer5 x2.0. Product: 20 * 1.5 * 1.3 * 1.5 * 2.0 = 117. Vs idle base ~15 * 0.5 * ... = very low. This would make meditate probability ~85%+.
3. The existing 4-layer system was validated in Phase F with Monte Carlo (N=1000) and found acceptable. Adding Layer 5 extends a proven pattern.

**Comparison**: Consistent. The lack of a global cap is a pre-existing design choice, not introduced by this Phase. Layer 5 amplifies an existing pattern.
**Final Verdict**: Maintain WARN. Recommend adding a note in TDD that Monte Carlo validation should include 5-layer extreme cases, and consider a global weight ratio cap (e.g., no single behavior > 60% of total weight) as a future improvement.

---

### CoVe-5: R4-D1 -- Roadmap ordering (Phase J before Phase I)

**Original Finding**: WARN -- MASTER-PRD and ROADMAP show Phase J depends on Phase I.

**Verification Questions**:
1. Does Phase J-Goal actually depend on any Phase I deliverable?
2. Is there a precedent for extracting sub-phases?

**Independent Answers**:
1. Phase I deliverables (ROADMAP L287-296): T2 NPCs, causal events, Lv.4 events, advanced tags (mentor/admirer/grudge), sect-disciple conflict, social events. None of these are required by the personal goal system. Breakthrough goals need `getRealmAuraCost` (exists), revenge needs encounter-conflict events (exist since F0-alpha), friendship needs affinity tracking (exists since Phase E). All dependencies are already delivered. (Evidence: ROADMAP L287-296 cross-referenced with PRD SS3.3 trigger conditions)
2. Yes: Phase H was split into H-alpha/H-beta/H-gamma. Phase X was split into X-alpha/X-beta/X-gamma. Phase IJ was already a merger of I+J scoped to "design only". Extracting J-Goal as a sub-phase follows established project practice. (Evidence: ROADMAP sub-phase entries)

**Comparison**: The roadmap ordering concern is valid documentation-wise but not a real dependency blocker.
**Final Verdict**: Maintain WARN but downgrade severity. The roadmap documents should be updated to reflect J-Goal as an independent sub-phase, similar to H-alpha/H-beta pattern. Not a technical blocker.

---

### CoVe-6: R4-D3 / R5-D1 -- Revenge trigger event pipeline unclear

**Original Finding**: WARN -- Revenge trigger depends on "encounter + rival + affinity delta < -5" but the delta is computed by soul-engine AI evaluation, and the pipeline ordering (goal-tick at 500 vs soul-event at 625) creates a timing issue.

**Verification Questions**:
1. How does the encounter-conflict event flow through the pipeline currently?
2. Where is the affinity delta computed and applied?
3. Can the goal system access the affinity delta from encounter events?

**Independent Answers**:
1. encounter-tick.handler (TickPhase.ENCOUNTER=610) emits SoulEvent -> EventBus queue -> soul-event.handler (TickPhase.SOUL_EVAL=625) drains queue -> calls soul-engine.evaluateSoulEvent() -> applyEvaluationResult() writes affinity delta to RelationshipEdge. (Evidence: encounter-tick.handler.ts L161-166, soul-event.handler at SOUL_EVAL=625)
2. Affinity delta is computed inside `soul-engine.evaluateSoulEvent()` (either AI evaluation or fallback), then applied in `applyEvaluationResult()` (soul-engine.ts L175-179). The delta is part of `SoulEvaluationResult.relationshipDeltas[].delta`. (Evidence: soul-engine.ts L175-179)
3. The goal-tick handler at SYSTEM_TICK:20 (phase 500) runs BEFORE encounters (610) and soul-eval (625). It cannot react to current-tick encounter events. The goal system would need to either: (a) run a separate listener AFTER soul-eval (e.g., at phase 626), or (b) check affinity changes retrospectively on next tick, or (c) subscribe to EventBus events with a post-evaluation hook. None of these approaches are specified in the PRD.

**Comparison**: Consistent with and amplifies original finding. The pipeline ordering issue is real and needs TDD-level resolution.
**Final Verdict**: Maintain WARN. The PRD correctly identifies the trigger conditions but does not specify the mechanism for detecting "encounter with rival + affinity delta < -5" within the current event pipeline. This MUST be resolved in TDD (Gate 2). The PRD is a "what" document and this is arguably a "how" concern, so it does not rise to BLOCK at Gate 1, but it should be flagged as a TDD critical item.

---

## L3 Structured Debate

No inter-role contradictions detected. All roles that flagged the same issues (getBreakthroughCost naming: R1/R3/R5; pipeline ordering: R4/R5) reached the same WARN verdict. L3 not triggered.

---

## Devil's Advocate

### Historical Pattern Check (from MEMORY)

**Pattern 1**: "PRD proposes changes that conflict with CLAUDE.md constitutional constraints"
- Checked: PRD SS3.6 proposes GameState v6. CLAUDE.md memory red line says "<=200MB" and "localStorage <=5MB". Adding `goals: PersonalGoal[]` (max 16 goals for 8 disciples * 2) is negligible (<1KB). No constitutional conflict.
- Checked: PRD SS3.7 proposes prompt injection. CLAUDE.md AI constraint says "prompt <=1024 tokens". One line of goal text ("Current wish: breakthrough (~300 hours remaining)") adds ~20 tokens. No budget violation.

**Pattern 2**: "PRD references enum values not present in codebase"
- Checked: All 5 GoalType values (breakthrough/revenge/seclusion/friendship/ambition) exist in personal-goal.ts L8-13. No phantom enum issue.
- Checked: PRD references 'rival' and 'friend' tags -- both exist in RelationshipTag (soul.ts L173). No phantom reference.

**Pattern 3**: "PRD uses terminology from different frameworks"
- Checked: PRD uses `persistent`, `smart`, `aggressive` (SS3.1 L65-67) -- these match exactly PersonalityTraits in game-state.ts L103-109 (aggressive, persistent, kind, lazy, smart). No terminology mismatch.

### Hypothetical Scenarios

**Scenario 1: "What if a goal's target disciple is removed from the game?"**
- PRD does not address this. If disciple B (target of a revenge or friendship goal) is somehow removed (though current design has no disciple removal), the goal would reference a non-existent ID. The completion check would silently fail, and the goal would expire by TTL.
- Risk: Low (disciple removal is OUT scope per MASTER-PRD SS4.1 "no dynamic recruit/leave").
- Verdict: Not a current issue but TDD should include a defensive check (targetId validity).

**Scenario 2: "What if all 8 disciples have seclusion goals simultaneously?"**
- With persistent >= 0.6 (about 40-50% of disciples given personality distribution), 3-4 disciples could have seclusion goals. All would strongly prefer meditation (x1.8), leading to a "everyone is meditating" scenario for ~200 ticks.
- Impact: Reduced exploration, farming, alchemy activity. Could stall resource production.
- Risk: Medium -- this is emergent behavior that might feel odd but is self-correcting (TTL=200 ensures it ends).
- Verdict: Acceptable but worth monitoring in playtesting. Consider adding a global cap (e.g., max N disciples with same goal type).

---

## Final Verdict

### **CONDITIONAL PASS**

No BLOCK items. 8 WARN items identified, all verified via CoVe:

| # | Severity | Item | Required Action |
|---|:--------:|------|----------------|
| W1 | Medium | `getBreakthroughCost` naming mismatch | Fix in PRD before TDD: rename to `getRealmAuraCost` |
| W2 | Medium | Revenge trigger pipeline ordering | Explicitly flag as TDD critical design item |
| W3 | Low | Zero player agency | Consider future "encourage/discourage" command; document decision to defer |
| W4 | Low | 5-layer multiplicative stacking | TDD must include Monte Carlo validation for 5-layer extreme cases |
| W5 | Low | Roadmap ordering documentation | Update MASTER-PRD/ROADMAP to list J-Goal as sub-phase |
| W6 | Low | PRD uses "auto-breakthrough" vs actual `breakthrough-fail` event name | Fix event name reference in PRD |
| W7 | Low | Affinity delta < -5 evaluation point unspecified | Flag for TDD resolution |
| W8 | Info | Mass seclusion scenario | Monitor in playtesting; consider optional global same-type cap |

### Improvement Recommendations

1. **Fix naming references before TDD**: Replace `getBreakthroughCost(realm, subRealm)` with `getRealmAuraCost(realm, subRealm)` and `auto-breakthrough failed` with `breakthrough-fail` event in PRD SS3.3. These are the most likely sources of developer confusion.

2. **Add a "TDD Critical Items" section to PRD**: Explicitly list the revenge trigger pipeline mechanism (how to detect affinity delta < -5 post-evaluation) and the goal-tick handler placement in the TickPipeline as items that MUST be resolved in TDD. This prevents the TDD author from overlooking these design decisions.

3. **Update MASTER-PRD SS5 and ROADMAP**: Add Phase J-Goal as an explicit sub-phase (e.g., "Phase J-Goal: personal goals, extracted from J3+J4, no Phase I dependency") to maintain roadmap consistency.

4. **Consider a verification script spec**: PRD SS3.2's 35-value multiplier table and multi-goal stacking formula are ideal candidates for `scripts/lite-goal-sim.ts` Monte Carlo validation. Add a note in PRD or User Stories that a verification script is expected as a Gate 3 deliverable.

---

## Appendix: Role Activation Justification

| Role | Activation | Justification |
|------|:----------:|---------------|
| R1 Devil PM | Mandatory | Standard Gate 1 role |
| R2 Senior Player | Activated | Layer 5 fundamentally changes disciple behavior coherence -- this IS the core experience of "disciples with souls". Behavior shifting from random to purposeful is a core experience change that warrants player perspective review. |
| R3 Numerical Designer | Mandatory | Standard Gate 1 role; multiplier tables and formulas require numerical validation. |
| R4 Project Manager | Activated | GameState v6 migration = cross-version impact. Roadmap J3/J4 extraction = roadmap restructuring. Both trigger R4 activation per review-protocol.md SS "activation rules". |
| R5 Paranoid Architect | Mandatory | Standard Gate 1 role; new GameState field + TickPipeline handler + multi-system event coupling require architectural review. |
