# AI Pathway — Integration Audit and Progress Report

Date: 2026-10-25  
Branch: feat/system-integration  
Repository: longhn1606-cpu/AI-Pathway

## PR status

PR #1, #3, #4, #5, #6 and #7 are open; PR #2 is closed. PR #7 remains Draft. Member 5 did not merge or modify another member's PR.

PR #4 head ae497a0587783950f3f27a2c561a4b46addc4a1c has two independently retrieved successful workflows: Adapter unit tests (#34) and Demo data/app checks (#110).

PR #6 reuses PR #5 profileAdapter.ts and maps bounded budget ranges to conservative ceilings; over70/flexible remain null.

## Integrated branch contents

- Member 1 dependency snapshot: admissionsData.ts, admissionsDataValidation.ts, ruleComparisonAdapter.ts.
- Member 3 engine snapshot: recommendation.ts, simulation.ts.
- Member 4 engine snapshot: ruleComparison/types.ts, compareRules.ts, explainRules.ts, compareAndExplainRules.ts, index.ts.
- Member 5 services: integratedRecommendationService.ts, integratedRuleComparisonService.ts.
- Member 5 adapters: recommendationProfileAdapter.ts and updated PR #6 profileAdapter.ts.
- Frontend: App.tsx calls recommendation/simulation; RuleComparisonPanel.tsx connects to rule comparison service.
- Tests: dataset validator, rule adapter, integrated recommendation, integrated rule comparison, profile taxonomy adapter, and a Playwright 20-profile E2E runner.
- CI: system-integration.yml runs build, unit/integration tests and browser E2E.

These are dependency snapshots on the isolated integration branch. Original member branches and PRs remain untouched; reconcile with upstream files after their PRs merge.

## Integration implemented

1. Dataset → recommendation/simulation: canonical exports injected into Member 3 engine; IDs/status/nullability preserved; profile and dataset records cloned at service boundary.
2. UI → recommendation: form validation, profile mapping and service call; render by programId with reasons/warnings/status.
3. UI → simulation: +1 score scenario with before/after/added/removed/retained counts; baseline form state unchanged.
4. Rule comparison → UI: connected panel uses Member 4's two existing simulated demo snapshots; both are labelled simulated and the pair adapter rejects missing/duplicate version IDs. No official rule is claimed.
5. Taxonomy: UI technology maps to observed canonical labels information_technology and engineering; Member 3 ranking code unchanged.

## CI evidence and issue handling

- First CI attempt failed before install because setup-node npm cache expected a lockfile; cache removed.
- Next attempt: build passed and npm test passed 19/19; legacy Member 3 test runner failed because its demo fixture files were not present in canonical base. That fixture-dependent runner was removed.
- Subsequent run #47: production build and npm test completed successfully. This was before the latest taxonomy test and Playwright E2E workflow were added.
- Latest workflow includes taxonomy, method-specific cutoff resolver tests and a Playwright suite that submits 20 distinct profiles through the actual frontend. Final result: 20/20 E2E passed in run #40190455660.

## Historical cutoff integration update

Member 3 supplied the explicit method-specific selection policy and `recommendationDatasetAdapter.ts`. Member 5 synchronized the adapter and wired it into `integratedRecommendationService`:
- A cutoff is resolved only for exactly one selected method that the current program declares.
- Exact programId + method match; latest year must have one unique record.
- Missing, ambiguous, multi-method, or currently unsupported methods preserve null cutoff fields.
- DataStatus/provenance are preserved; score scale is not converted.
- Simulation re-runs the resolver for both baseline and scenario profiles.

Four integration tests were added for latest unique record, method change in simulation, unsupported current method, and multi-method ambiguity. The previous cutoff adapter contract blocker is closed; all four passed in the latest 38/38 npm test run.

## Remaining

- Reconcile dependency snapshots with main after upstream PRs merge.
- Rule comparison demo uses Member 4's simulated snapshot pair; production comparison still needs two authentic versioned snapshots from a source-backed history.
- Historical cutoff history now flows through Member 3's explicit method-specific adapter; ambiguous or unavailable records remain unknown.
- After upstream PRs merge, reconcile dependency snapshots with main.

The tested integration flow completed 20/20 browser E2E submissions in run #40190455660. Historical cutoff integration now uses Member 3's method-specific resolver. Rule-history remains a production data limitation because the current fixture pair is simulated.


## Follow-up: Member 2 / Member 4 integration hardening

- Fixture JSON is assigned to `unknown`; it is not asserted as `AdmissionRuleVersion[]` before runtime validation.
- `validateAdmissionRuleVersions` validates the collection and rejects malformed records or duplicate IDs before the UI can consume them.
- Pair validation now checks source metadata, HTTP(S) URLs, nullable years/timestamps, admission method, nullable program metadata, recursive JSON conditions and all tuition fields/ranges.
- Synchronized Member 4's latest `compareRules.ts` and `explainRules.ts` from `feature/member-4-rule-comparison`, including tuition provenance safeguards.
- Rule panel presents `whatChanged`, `tuitionImpact`, `nextSteps`, source disclosure, unknowns and limitations.
- Runtime validation, fixture-before-validation removal, explanation rendering and tuition provenance safeguards passed in the latest CI run.


## Latest verified run — commit e7428857

**System integration — run 40190455660**
- TypeScript + production build: passed.
- `npm test`: 38/38 passed.
- Playwright Chromium: 20/20 profile submissions passed.
- E2E covers criteria-based empty state when all programs are excluded by budget, simulation baseline immutability, simulated rule fixture disclosure, tuition unknown disclosure and next-step rendering.

**Dataset validation — run 40190455663**
- Production build and preview smoke test: passed.
- Dataset structure validator: 0 errors, 16 warnings (empty method sourceIds are known schema limitation).
- Python regression tests: 10/10 passed.
- Regression now verifies null program-level cutoff tuple while accepting the separately sourced 2026 tuition snapshot in `needs_review`; it does not promote tuition to verified.

Links:
- https://github.com/longhn1606-cpu/AI-Pathway/actions/runs/40190455660
- https://github.com/longhn1606-cpu/AI-Pathway/actions/runs/40190455663


## Final integration audit — 2026-10-25 (Member 5 follow-up)

### Live PR and owner-confirmation check

- PR #7 remains **Open / Draft**, head before this follow-up: `1c4bdcf045a5406f63bee4ea2320ada7793411ac`. It has not been merged.
- Member 3 explicitly confirmed the `RecommendationInput` shape and the `HistoricalCutoff` adapter policy in PR #4 discussion comment `6397561064`. The integration uses the three-part input (`profile`, `universities`, `programs`) and resolves history outside the raw input through exact program + single currently eligible method + unique latest record. No shared schema expansion is needed.
- Member 4's latest rule-comparison branch is synchronized byte-for-byte for `types.ts`, `compareRules.ts`, `explainRules.ts`, and `index.ts` (matching blob SHAs checked on 2026-10-25). This includes same-institution/program scope safeguards and additive affected-entity fields. The facade signature remains compatible with PR #7.
- No Member 2 approval/review was found on PR #7 at this audit. Presentation/wording review is still outstanding; no review submission or approval is inferred from the passing CI.
- Member 1 has not yet confirmed reconciliation of the stale tuition regression expectation in PR #4. The PR #7 integration snapshot test accepts the six 2026 tuition fixtures only while retaining `needs_review`; cutoff tuple fields remain null where the canonical historical collection is the source of record.

### Validation-failure UI edge case

- Current `src/App.tsx` clears `recommendationResponse`, `simulationResult`, and `submittedProfile` when profile validation fails, so the UI returns to the initial results empty state rather than retaining a stale submitted profile.
- Added E2E assertions in commit `8b2282fe0740ff7d0fd0968cc10109a842b67efe` to verify that an invalid submission clears the profile summary and restores the initial results empty state. CI for this new commit must complete before treating the added assertions as passed.

### Current remaining blockers

1. Obtain Member 2's explicit review of the integrated form validation, result empty states, and RuleComparisonPanel placement/wording.
2. Obtain Member 1's reconciliation/confirmation for the tuition dataset regression expectation on PR #4.
3. Re-run and record CI on the follow-up commit above.
4. After upstream PR merges, compare dependency snapshots against the merged base and resolve any conflicts. PR #1 overlaps with recommendation/simulation content integrated in PR #7; PR #8 overlaps with frontend rule-comparison UI. Do not merge overlapping branches together without an explicit integration plan.
5. Keep source-backed historical rule versions and verified tuition as production data requirements. The current rule pair is simulated and tuition fixtures are `needs_review`.

PR #7 remains Draft until these review/coordination items and the new CI run are complete. No merge was performed.


## Member 1 dataset regression confirmation and latest CI — 2026-10-25

Member 1 confirmed on PR #4 head `e983235f7073859fad42250d1fb8bd0e980d82cd` that the six 2026 tuition demo fixtures are intentional and must remain visibly `simulated`: HUST 30–45m VND/year; DUT 28–38m; HCMUT 40–80m (and the remaining three fixture records as defined in the canonical dataset). Historical cutoff fields `historicalCutoff`, `cutoffYear`, and `cutoffScale` remain null when no evidence exists; never coerce them to zero/defaults. This confirmation is limited to demo fixture correctness, not official tuition verification or PR approval.

The corresponding integration regression already preserves the same boundary: it accepts structurally valid 2026 tuition fixtures while requiring `simulated` status and null historical cutoff tuple. No canonical data or Member 1 branch was modified by Member 5.

**CI verified:**
- PR #4 head `e983235f`: Demo data/app checks run #350 SUCCESS; Adapter unit tests run #58 SUCCESS.
- PR #7 head `8708529aa8dc40280383e9933a79917a7148b9b9`: System integration run #162 SUCCESS, including build, npm tests and Chromium browser E2E; Demo data/app checks run #358 SUCCESS, including Member 4 regression ×20, preview smoke, dataset validator and Python regression.

Remaining review blocker: Member 2's explicit frontend/UI review is still pending. PR #7 remains Open/Draft; no approval or merge is inferred from CI success.


## Superseding status update — 2026-10-25, PR #7 head 8ef9a99

A fresh GitHub read confirms the current `feat/system-integration` head is `8ef9a99a0caad38d4663d9f68756a8ca9ed234b0`. PR #7 remains Open / Draft and has not been merged.

### Latest CI on the exact head
- System integration run #192 (`40195320245`): SUCCESS — build, `npm test`, Playwright Chromium setup and browser E2E.
- System integration run #191 (`40195315594`): SUCCESS — same job sequence, all steps passed.
- Demo data/app run #388 (`40195320251`): SUCCESS — build/type-check, Member 4 rule comparison regression ×20, production preview smoke, dataset validator and Python regression.
- Demo data/app run #387 (`40195315549`): SUCCESS — same validation sequence, all steps passed.

Earlier run #178 (`40194278083`) failed during `npm test`, before browser E2E. The latest branch head contains the subsequent source-year fixture correction, and both later integration runs now pass. The failed run remains part of the audit trail.

### Owner review and acceptance status
- Member 2's implementation review and UI/interaction fixes are complete, as confirmed in the project handoff. This does not equal a manual browser/device acceptance sign-off.
- Member 1 confirmed the 2026 tuition fixture intent and the null cutoff policy; this is not official tuition-source verification.
- Member 3's recommendation/simulation adapter contract and Member 4's rule-comparison implementation remain integrated as documented above.
- CI Chromium E2E passed on the exact current head. A separate manual browser/device review has not been evidenced and is still an acceptance item.

### Remaining demo caveats
1. Dataset validation still reports 16 warnings; do not suppress or reinterpret them as verified data.
2. Tuition fixtures and rule-comparison snapshots remain demo/simulated or review-status data, not official source-backed facts.
3. Missing/ambiguous historical cutoff values remain null; incompatible scales are not auto-converted.
4. Reconcile dependency snapshots against main after upstream PRs merge, especially overlapping recommendation/simulation and frontend rule-comparison files.

No PR was promoted from Draft, approved or merged as part of this audit.
