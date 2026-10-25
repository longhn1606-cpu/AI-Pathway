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
