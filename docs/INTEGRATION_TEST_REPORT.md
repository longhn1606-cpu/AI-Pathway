# AI Pathway — Integration Test Report

Date: 2026-10-25  
Branch: feat/system-integration

## Execution status

NOT EXECUTED. No end-to-end run has been counted. This session's GitHub repository integration can inspect repository content and CI-reported information but does not provide a Node.js shell to install dependencies or run the app. main package.json currently has no integration test script.

Actual E2E runs completed in this session: 0 / 20.

## Required integration matrix

| ID | Scenario | Expected assertion | Status |
|---|---|---|---|
| IT-01 | Schema compatibility | Canonical records satisfy shared interfaces/enums | Pending |
| IT-02 | Dataset → recommendation | IDs and canonical records reach engine intact | Blocked by PR #4 integration |
| IT-03 | Dataset → rule comparison | Two snapshots preserve version/source/status | Blocked: snapshot source not established |
| IT-04 | Recommendation → frontend | UI renders results by programId, reasons and status | Pending |
| IT-05 | Simulation → frontend | Before/after render and baseline remains unchanged | Pending |
| IT-06 | Rule comparison → frontend | Changed fields, affected programs, impact and explanation render | Pending |
| IT-07 | Missing data | Null cutoff/tuition remain unknown and warn appropriately | Pending |
| IT-08 | Invalid input | Invalid score/scale/budget handled by agreed contract | Pending |
| IT-09 | Duplicate IDs | Dataset validator rejects duplicate IDs | Pending |
| IT-10 | Null tuition/cutoff | Null is not coerced to zero or unchanged | Pending |
| IT-11 | Provenance | URL/year/checkedAt/DataStatus survive adapters | Pending |
| IT-12 | Regression | Module tests and frontend build pass after integration | Pending |
| IT-13 | Simulation immutability | Baseline profile and dataset remain unchanged | Pending |
| IT-14 | Scale mismatch | No cross-scale cutoff comparison or implicit conversion | Pending |
| IT-15 | Ambiguous source mapping | No arbitrary source choice or invented source ID | Pending |
| IT-16 | Missing rule evidence | No change claim without comparable snapshots | Pending |

## Twenty-run E2E plan

When dependencies are available in a runnable branch, execute at least 20 distinct profile submissions through the actual frontend-to-service path. Vary score boundaries, interest, region, method where collected and budget availability. Record run number, validation outcome, result/exclusion counts, program IDs/statuses, simulation immutability and rule-comparison availability.

Do not create fictitious admissions records. Profile variations are test inputs only; admissions facts must come from canonical dataset and retain provenance.

## Evidence policy

A run counts only when the actual app and integration path execute. Unit-test totals, static inspection, mocks, PR body statements and simulated fixtures are not E2E runs. Retain failures and reproduction details; reruns do not erase failed attempts.
