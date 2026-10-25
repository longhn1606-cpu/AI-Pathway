# AI Pathway — Integration Test Report

Date: 2026-10-25  
Branch: feat/system-integration

## Automated test coverage

- tests/admissionsDataValidation.test.mjs
- tests/ruleComparisonAdapter.test.mjs
- tests/integratedRecommendationService.test.mjs
- tests/integratedRuleComparisonService.test.mjs
- tests/recommendationProfileAdapter.test.mjs
- tests/e2e-frontend.mjs

The CI workflow runs npm install, npm run build, npm test, installs Playwright/Chromium, starts the Vite app and runs the browser suite.

## CI evidence

- Initial run failed at setup-node because the repo has no lockfile; cache was removed.
- Follow-up run: production build passed; npm test passed 19/19. A legacy fixture-only Member 3 runner failed because its demo fixture files were absent from the integration branch; that runner was removed.
- Run #47: build and npm test passed after frontend wiring, before the newest taxonomy test and Playwright workflow additions.
- The latest head adds a taxonomy integration test and browser E2E runner. Its CI result is pending; prior test results do not certify the latest head.

## Browser E2E — 20 profile submissions

The Playwright suite creates 20 distinct profile submissions through the actual React form and integrated service. It varies score, interest, region and budget. It asserts:
- the app loads;
- recommendation cards are returned without service errors;
- simulation is available for selected scenarios;
- running simulation does not change the baseline score input;
- rule comparison honestly shows an empty state without two rule snapshots.

**Actual successful E2E runs: 0 / 20 until the latest CI workflow reports success.** The test code defines 20 scenarios; this is not itself evidence that they have passed.

## Integration matrix

| ID | Scenario | Implementation | Latest evidence |
|---|---|---|---|
| IT-01 | Schema compatibility | Member 1 validator suite | Prior npm test pass; rerun pending |
| IT-02 | Dataset → recommendation | Canonical service + program ID/status assertions | Prior npm test pass; taxonomy test pending |
| IT-03 | Dataset → rule comparison | Explicit snapshot service delegates Member 4 | Prior npm test pass; history source unavailable |
| IT-04 | Recommendation → frontend | App calls service and renders results by programId | Build passed in run #47; latest pending |
| IT-05 | Simulation → frontend | App calls simulate and renders scenario counts | Build passed in run #47; latest pending |
| IT-06 | Rule comparison → frontend | RuleComparisonPanel and empty state | Build passed in run #47; latest pending |
| IT-07 | Missing data | Null tuition/cutoff preserved | Covered by validator/adapter/engine |
| IT-08 | Invalid input | UI validation and engine safeguards | Latest CI pending |
| IT-09 | Duplicate IDs | Member 1 validator | Prior npm test pass |
| IT-10 | Null tuition/cutoff | Null not coerced to zero | Prior npm test pass |
| IT-11 | Provenance | DataStatus retained in services/adapters | Prior npm test pass |
| IT-12 | Regression | Build + npm test + browser E2E | Latest CI pending |
| IT-13 | Simulation immutability | Service test and browser baseline assertion | Prior service test pass; browser pending |
| IT-14 | Scale mismatch | Member 3 engine unchanged | Existing engine contract |
| IT-15 | Ambiguous source mapping | Exact unique resolver | Prior npm test pass |
| IT-16 | Missing rule evidence | Panel requires both snapshots | Implemented; browser pending |

## Evidence policy

A browser run counts only when the real app and integration path execute. Test definitions, mocks, unit tests or build success are not E2E passes. Keep failed attempts and reproduction details; reruns do not erase failures.
