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
- Latest workflow includes a taxonomy integration test and a Playwright suite that submits 20 distinct profiles through the actual frontend. Its result must be checked before reporting 20/20 E2E success.

## Additional data-contract blocker

The canonical historicalCutoffs collection is separate from UniversityProgram, while Member 3's RecommendationInput accepts only University[] and UniversityProgram[]. A program can have multiple historical cutoff records by year and admission method, but the current shared UniversityProgram schema has only one nullable cutoff tuple. Member 5 does not arbitrarily choose one record or flatten the history. As a result, the recommendation engine currently receives null program-level cutoff fields where they are unknown; the frontend may still show the historical cutoff collection with its own method/year/status/source labels. Member 1 and Member 3 need to agree on a lossless input contract or an explicit selection policy before historical cutoffs can affect recommendation logic.

## Remaining

- Rerun CI after the newest score-scale/null-tuition test addition.
- Rule comparison demo uses Member 4's simulated snapshot pair; production comparison still needs two authentic versioned snapshots from a source-backed history.
- Historical cutoff records remain separate from the single nullable cutoff tuple in Member 3's input; Member 1/3 must agree on a lossless policy before cutoff history influences recommendation.
- After upstream PRs merge, reconcile dependency snapshots with main.

The tested integration flow completed 20/20 browser E2E submissions in run #66. Rule-history and historical-cutoff integration remain explicit data-contract limitations.


## Follow-up: Member 2 / Member 4 integration hardening

- Fixture JSON is assigned to `unknown`; it is not asserted as `AdmissionRuleVersion[]` before runtime validation.
- `validateAdmissionRuleVersions` validates the collection and rejects malformed records or duplicate IDs before the UI can consume them.
- Pair validation now checks source metadata, HTTP(S) URLs, nullable years/timestamps, admission method, nullable program metadata, recursive JSON conditions and all tuition fields/ranges.
- Synchronized Member 4's latest `compareRules.ts` and `explainRules.ts` from `feature/member-4-rule-comparison`, including tuition provenance safeguards.
- Rule panel presents `whatChanged`, `tuitionImpact`, `nextSteps`, source disclosure, unknowns and limitations.
- New adapter and browser regression assertions require a fresh CI run before this follow-up can be marked verified.
