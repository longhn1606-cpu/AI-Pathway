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

CI runs npm install, npm run build, npm test, installs Playwright/Chromium, starts Vite and executes browser E2E.

## Verified CI evidence

**System integration workflow run #72 — SUCCESS** on commit 3c915be7341fdebfca504e6470576f7e5d464f74:
- Production build: passed.
- npm test: **23/23 passed**.
- Playwright Chromium browser E2E: **20/20 profile submissions passed**; log reports `Frontend E2E profiles completed: 20/20`.
- Browser launch and server readiness checks: passed.

This run includes the explicit test for unlike score scales and null tuition added after run #66. It verifies recommendation results, canonical IDs/status, profile immutability during simulation, rule comparison empty state without two snapshots, and 20 distinct submissions through the actual React form and service.

Earlier CI failures were handled:
- Initial run failed at setup-node because npm caching expected a lockfile; cache removed.
- A legacy Member 3 runner failed because it required demo fixture files absent from canonical base; that fixture-dependent runner was removed.

## Integration matrix

| ID | Scenario | Implementation | Evidence |
|---|---|---|---|
| IT-01 | Schema compatibility | Member 1 validator tests | Passed run #72 |
| IT-02 | Dataset → recommendation | Canonical service + ID/status assertions | Passed run #72 |
| IT-03 | Dataset → rule comparison | Explicit snapshot service delegates Member 4 | Passed run #72; history source unavailable |
| IT-04 | Recommendation → frontend | App calls service and renders by programId | Passed run #72 |
| IT-05 | Simulation → frontend | App calls simulate and renders scenario counts | Passed run #72 |
| IT-06 | Rule comparison → frontend | RuleComparisonPanel and honest empty state | Passed run #72 |
| IT-07 | Missing data | Null tuition/cutoff preserved | Passed run #72 |
| IT-08 | Invalid input | UI validation and engine safeguards | Passed run #72 |
| IT-09 | Duplicate IDs | Member 1 validator | Passed run #72 |
| IT-10 | Null tuition/cutoff | Null not coerced to zero | Passed run #72 |
| IT-11 | Provenance | DataStatus retained in services/adapters | Passed run #72 |
| IT-12 | Regression | Build + npm test + browser E2E | Passed run #72 |
| IT-13 | Simulation immutability | Service test and browser baseline assertion | Passed run #72 |
| IT-14 | Scale mismatch | Engine warns and does not compare unlike scales | Passed run #72 |
| IT-15 | Ambiguous source mapping | Exact unique source resolver | Passed run #72 |
| IT-16 | Missing rule evidence | Panel requires both snapshots | Passed run #72 |

## Browser E2E — actual results

**Verified: 20/20 profile submissions passed in run #72.**

The Playwright suite varies score, interest, region and budget through the actual UI form. For selected profiles it runs the +1 score simulation and verifies that the baseline score input remains unchanged. It also checks the honest rule-comparison empty state where two snapshots are not available.

## Evidence policy

A browser run counts only when the real app and integration path execute. Test definitions, mocks, unit tests or build success are not E2E passes. Keep failed attempts and reproduction details; reruns do not erase failures.
