# AI Pathway — Integration Test Report

Date: 2026-10-25  
Branch: feat/system-integration

## Automated test coverage

- tests/admissionsDataValidation.test.mjs
- tests/ruleComparisonAdapter.test.mjs
- tests/integratedRecommendationService.test.mjs
- tests/integratedRuleComparisonService.test.mjs
- tests/recommendationProfileAdapter.test.mjs
- tests/admissionRuleVersionAdapter.test.mjs
- tests/e2e-frontend.mjs

CI runs npm install, npm run build, npm test, installs Playwright/Chromium, starts Vite and executes browser E2E.

## Historical CI evidence (run #96; predates current integration hardening)

**System integration workflow run #96 — SUCCESS** on commit 31246f86ffa43a75307da21fe5e6f08cf2fb31f5:
- Production build: passed.
- npm test: **27/27 passed**.
- Playwright Chromium browser E2E: **20/20 profile submissions passed**; log reports `Frontend E2E profiles completed: 20/20`.
- Browser launch and server readiness checks: passed.

Run #96 predates the deep-validation changes below and must not be used as evidence for them. A new workflow run is required. The updated suite adds malformed source/metadata/conditions/tuition rejection and explicit unknown-tuition UI assertions. Earlier run #96 verified:
- canonical dataset validation, IDs, statuses and provenance;
- recommendation integration and taxonomy mapping;
- null tuition and score-scale mismatch behavior;
- simulation immutability;
- rule snapshot pair validation (missing/duplicate IDs rejected; deeper validation added after run #96);
- frontend comparison of Member 4's explicitly simulated pair;
- 20 distinct profile submissions through the actual React form and service.

Earlier CI failures were handled:
- Initial run failed at setup-node because npm caching expected a lockfile; cache removed.
- A legacy Member 3 runner failed because it required demo fixture files absent from canonical base; that fixture-dependent runner was removed.

## Integration matrix

| ID | Scenario | Implementation | Evidence |
|---|---|---|---|
| IT-01 | Schema compatibility | Member 1 validator tests | Passed run #96 |
| IT-02 | Dataset → recommendation | Canonical service + ID/status assertions | Passed run #96 |
| IT-03 | Dataset → rule comparison | Explicit snapshot service delegates Member 4 | Passed run #96; production history source remains open |
| IT-04 | Recommendation → frontend | App calls service and renders by programId | Passed run #96 |
| IT-05 | Simulation → frontend | App calls simulate and renders scenario counts | Passed run #96 |
| IT-06 | Rule comparison → frontend | RuleComparisonPanel renders simulated demo pair | Passed run #96 |
| IT-07 | Missing data | Null tuition/cutoff preserved | Passed run #96 |
| IT-08 | Invalid input | UI validation and engine safeguards | Passed run #96 |
| IT-09 | Duplicate IDs | Member 1 validator | Passed run #96 |
| IT-10 | Null tuition/cutoff | Null not coerced to zero | Passed run #96 |
| IT-11 | Provenance | DataStatus retained in services/adapters | Passed run #96 |
| IT-12 | Regression | Build + npm test + browser E2E | Passed run #96 |
| IT-13 | Simulation immutability | Service test and browser baseline assertion | Passed run #96 |
| IT-14 | Scale mismatch | Engine warns and does not compare unlike scales | Passed run #96 |
| IT-15 | Ambiguous source mapping | Exact unique source resolver | Passed run #96 |
| IT-16 | Missing rule evidence | Pair adapter rejects missing/duplicate snapshots | Passed run #96 |

## Browser E2E — actual results

**Verified: 20/20 profile submissions passed in run #96.**

The Playwright suite varies score, interest, region and budget through the actual UI form. For selected profiles it runs the +1 score simulation and verifies that the baseline score input remains unchanged. It also checks that the rule comparison panel clearly labels the Member 4 snapshots as simulated and renders changed fields.

## Added validation matrix (verified in latest CI)
- Invalid source URL protocol/type, malformed applied year, invalid checkedAt and unknown data status.
- Invalid institution/program metadata and unsupported admission method.
- Non-object conditions, nested non-finite numbers and non-JSON values.
- Tuition wrong types, negative amounts, inverted min/max range, invalid year/status/source URL.
- Null tuition/source fields remain valid unknowns; they are not coerced to zero.
- Browser assertions cover the tuition unknown-state message and next-step section.

## Evidence policy

A browser run counts only when the real app and integration path execute. Test definitions, mocks, unit tests or build success are not E2E passes. Keep failed attempts and reproduction details; reruns do not erase failures.


## Historical cutoff integration regression coverage — verified in latest CI

- Latest unique record is selected for exact program + single selected method.
- Simulation re-resolves cutoff after the selected admission method changes; before and after states retain distinct source status.
- A historical method not declared by the current program is not mapped.
- Multiple selected methods do not choose an arbitrary cutoff.
- Null remains null for missing/ambiguous records; original canonical arrays/profile are not mutated.

The adapter used is synchronized from Member 3's PR #1 head and the integration service delegates selection to it; Member 5 does not duplicate its selection logic.


## Latest verified CI — 2026-10-25

Commit tested: `e7428857e27bdb96086e3243bfa7bda6c901333b`

**System integration run #40190455660**
- Production build / TypeScript: passed.
- npm test: **38/38 passed**.
- Playwright Chromium: **20/20 profile submissions passed**.
- Includes four historical cutoff adapter/service tests, frontend criteria-based no-fit empty state, tuition unknown disclosure, rule-comparison explanations, and simulation baseline immutability.

**Dataset validation run #40190455663**
- Production build and preview smoke test: passed.
- Dataset structural validation: **0 errors**, 16 warnings (empty method sourceIds remain a documented schema limitation).
- Python regression tests: **10/10 passed**.
- Updated regression keeps program-level cutoff tuple null while allowing the separate 2026 tuition snapshot to remain `needs_review`.

The 2026 tuition snapshot is not verified source-level tuition advice. The demo rule snapshots remain simulated. These data limitations are not covered by a green CI result.
