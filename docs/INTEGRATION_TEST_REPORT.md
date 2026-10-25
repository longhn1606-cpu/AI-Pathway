# AI Pathway — Integration Test Report

Date: 2026-10-25  
Branch: feat/system-integration

## Test implementation status

Integration test code has been added, but tests have not yet been executed by a confirmed workflow result in this report.

The branch includes:
- tests/admissionsDataValidation.test.mjs
- tests/ruleComparisonAdapter.test.mjs
- tests/integratedRecommendationService.test.mjs
- tests/integratedRuleComparisonService.test.mjs
- scripts/test-recommendation.mjs
- scripts/test-simulation.mjs

CI workflow .github/workflows/system-integration.yml runs npm install, npm run build, npm test and npm run test:recommendation on the integration branch / PR.

**Actual E2E runs completed: 0 / 20.** Unit/integration test files are not counted as E2E runs.

## Integration matrix

| ID | Scenario | Implementation/evidence | Status |
|---|---|---|---|
| IT-01 | Schema compatibility | Member 1 validator suite included | CI pending |
| IT-02 | Dataset → recommendation | Integrated service injects canonical exports; test checks canonical IDs/status | CI pending |
| IT-03 | Dataset → rule comparison | Explicit snapshot service delegates to Member 4 | Partial; snapshot history source unavailable |
| IT-04 | Recommendation → frontend | Frontend service wiring not implemented | Pending |
| IT-05 | Simulation → frontend | Simulation service exists; UI wiring pending | Pending |
| IT-06 | Rule comparison → frontend | Rule service exists; UI wiring pending | Pending |
| IT-07 | Missing data | Null tuition/cutoff remain unknown in source schema/engine | CI pending |
| IT-08 | Invalid input | Member 3 regression suite covers invalid score/scale/budget | CI pending |
| IT-09 | Duplicate IDs | Member 1 validator suite covers duplicate IDs | CI pending |
| IT-10 | Null tuition/cutoff | Member 1 adapter and Member 3 suites cover null behavior | CI pending |
| IT-11 | Provenance | Service test checks DataStatus; adapter suite covers provenance | CI pending |
| IT-12 | Regression | Build + all included suites in CI workflow | CI pending |
| IT-13 | Simulation immutability | Integration test snapshots baseline profile | CI pending |
| IT-14 | Scale mismatch | Member 3 recommendation regression suite | CI pending |
| IT-15 | Ambiguous source mapping | Member 1 exact-unique source resolver tests | CI pending |
| IT-16 | Missing rule evidence | Rule service test preserves missing tuition and simulated status | CI pending |

## Twenty-run E2E plan

When browser/runtime CI is available, submit at least 20 distinct profiles through the actual frontend-to-service path. Vary score boundaries, interest, region, budget and admission method only if the UI collects it. For each run record validation outcome, result/exclusion counts, program IDs/statuses, simulation immutability and rule comparison availability.

Do not create fictitious admissions records. Profile variations are test inputs only; admissions facts must come from canonical data and retain provenance.

## Evidence policy

A run counts only when the actual app and integration path execute. Static inspection, mocks, unit tests, CI build success and PR body claims are not E2E runs. Retain failures and reproduction details; reruns do not erase failed attempts.
