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

The CI workflow runs npm install, npm run build, npm test, installs Playwright/Chromium, starts Vite and runs browser E2E.

## Verified CI evidence

**System integration workflow run #66 — SUCCESS** on commit 5c0c118b34268a885f3c6858b8668b36d04a85b7:
- Production build: passed.
- npm test: 22/22 passed.
- Playwright browser E2E: log reports `Frontend E2E profiles completed: 20/20`.
- Chromium installation and browser launch: passed.

This confirms 20 distinct profile submissions through the React form and integrated service on that tested commit. The run checks recommendation cards, no service error, simulation behavior and baseline score immutability, and the rule-comparison empty state.

After run #66, one additional integration test was added for score-scale mismatch and null tuition. The newest commit's CI must rerun before claiming that newest test has passed. The 20/20 E2E result is verified for run #66; the newest source changes since then are test-only plus documentation, not application logic.

Earlier CI failures were handled:
- Initial run failed at setup-node because npm caching expected a lockfile; cache removed.
- A legacy fixture-dependent Member 3 test runner failed because its demo fixture files were absent from the canonical base; that runner was removed.
- Run #66 supersedes those failures with the canonical dataset integration suite and browser E2E.

## Integration matrix

| ID | Scenario | Implementation | Evidence |
|---|---|---|---|
| IT-01 | Schema compatibility | Member 1 validator tests | Passed in run #66 |
| IT-02 | Dataset → recommendation | Canonical service + ID/status assertions | Passed in run #66 |
| IT-03 | Dataset → rule comparison | Explicit snapshot service delegates Member 4 | Passed in run #66; historical source unavailable |
| IT-04 | Recommendation → frontend | App calls service and renders by programId | Passed in build + E2E run #66 |
| IT-05 | Simulation → frontend | App calls simulate and renders scenario counts | Passed in E2E run #66 |
| IT-06 | Rule comparison → frontend | RuleComparisonPanel and honest empty state | Passed in E2E run #66 |
| IT-07 | Missing data | Null tuition/cutoff preserved | Passed in run #66 |
| IT-08 | Invalid input | UI validation and engine safeguards | Build/tests passed in run #66 |
| IT-09 | Duplicate IDs | Member 1 validator | Passed in run #66 |
| IT-10 | Null tuition/cutoff | Null not coerced to zero | Passed in run #66; extra scale/null test pending rerun |
| IT-11 | Provenance | DataStatus retained in services/adapters | Passed in run #66 |
| IT-12 | Regression | Build + npm test + browser E2E | Passed in run #66 |
| IT-13 | Simulation immutability | Service test and browser baseline assertion | Passed in run #66 |
| IT-14 | Scale mismatch | Engine warns and does not compare unlike scales | New explicit integration test added; rerun pending |
| IT-15 | Ambiguous source mapping | Exact unique source resolver | Passed in run #66 |
| IT-16 | Missing rule evidence | Panel requires both snapshots | Passed in run #66 |

## Browser E2E — actual results

**Verified: 20/20 profile submissions passed in run #66.**

The Playwright suite varies score, interest, region and budget through the actual UI form. For selected profiles it runs the +1 score simulation and verifies that the baseline score input remains unchanged. It also checks the honest rule-comparison empty state where two snapshots are not available.

## Evidence policy

A browser run counts only when the real app and integration path execute. Test definitions, mocks, unit tests or build success are not E2E passes. Keep failed attempts and reproduction details; reruns do not erase failures.
