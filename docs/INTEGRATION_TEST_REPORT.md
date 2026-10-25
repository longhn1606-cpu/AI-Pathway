# AI Pathway — Integration Test Report

Date: 2026-10-25  
Branch: feat/system-integration

## Test implementation

The branch includes:
- tests/admissionsDataValidation.test.mjs
- tests/ruleComparisonAdapter.test.mjs
- tests/integratedRecommendationService.test.mjs
- tests/integratedRuleComparisonService.test.mjs
- tests/recommendationProfileAdapter.test.mjs

CI workflow .github/workflows/system-integration.yml runs npm install, npm run build and npm test.

## CI evidence

- Run #19 failed at setup-node because npm caching was enabled but the repository has no lockfile. No install/build/tests ran.
- Run #21: production build passed; npm test passed 19/19; a separate legacy Member 3 test command failed because its demo fixture files were absent from the integration branch.
- The fixture-dependent test runner was removed. The latest branch adds frontend wiring and a recommendation profile adapter test; its workflow is pending at the time of this report.
- The previous 19/19 result applies only to the test set before the newest adapter test; it is not a pass claim for the current head.

Actual browser E2E runs completed: 0 / 20.

## Integration matrix

| ID | Scenario | Implementation/evidence | Status |
|---|---|---|---|
| IT-01 | Schema compatibility | Member 1 validator tests | Previously passed in npm test; rerun latest CI |
| IT-02 | Dataset → recommendation | Canonical service test checks IDs/status | Previously passed in npm test; rerun latest CI |
| IT-03 | Dataset → rule comparison | Explicit snapshot service delegates to Member 4 | Service test passed previously; history source unavailable |
| IT-04 | Recommendation → frontend | App.tsx calls service and renders results by programId | Build pending latest head |
| IT-05 | Simulation → frontend | App calls simulate and renders before/after counts | Build pending latest head |
| IT-06 | Rule comparison → frontend | RuleComparisonPanel connected; empty state without snapshots | Build pending latest head |
| IT-07 | Missing data | Null tuition/cutoff retained | Covered by validator/adapter/engine |
| IT-08 | Invalid input | validateUiProfile and engine safeguards | Build/test pending latest head |
| IT-09 | Duplicate IDs | Member 1 validator rejects duplicates | Previously covered; rerun latest CI |
| IT-10 | Null tuition/cutoff | Null not coerced to zero | Previously covered; rerun latest CI |
| IT-11 | Provenance | DataStatus retained in service and comparison | Previously covered; rerun latest CI |
| IT-12 | Regression | Production build + npm test workflow | Pending latest head |
| IT-13 | Simulation immutability | Integration test snapshots baseline profile | Previously covered; rerun latest CI |
| IT-14 | Scale mismatch | Member 3 engine behavior unchanged | Existing engine contract; full test suite pending |
| IT-15 | Ambiguous source mapping | Exact unique source resolver | Previously covered; rerun latest CI |
| IT-16 | Missing rule evidence | Rule panel requires both snapshots; no fabricated comparison | Service/UI implementation present |

## Twenty-run E2E plan

When browser/runtime CI is available, submit at least 20 distinct profiles through the actual frontend-to-service path. Vary score boundaries, interest, region, budget and admission method only if the UI collects it. For each run record validation outcome, result/exclusion counts, program IDs/statuses, simulation immutability and rule comparison availability.

Do not create fictitious admissions records. Profile variations are test inputs only; admissions facts must come from canonical data and retain provenance.

## Evidence policy

A run counts only when the actual app and integration path execute in a browser/runtime. Static inspection, mocks, unit tests, CI build success and PR body claims are not E2E runs. Retain failures and reproduction details; reruns do not erase failed attempts.
