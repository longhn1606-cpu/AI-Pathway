# AI Pathway — Integration Audit Report

Date: 2026-10-25  
Branch: feat/system-integration  
Repository: longhn1606-cpu/AI-Pathway

## Scope and method

Inspected main, shared types, package scripts, frontend entry point, changed-file lists for PRs #1/#3/#4/#5/#6, and representative source files on their feature branches.

main contains shared types and a React/Vite frontend using admissions seed JSON. package.json on main exposes dev/build/preview only, with no test script. Canonical src/data/admissionsData.ts and Member 3/4 modules inspected in PR branches are not present on main in this audit.

PR descriptions contain historical CI claims. These are recorded as PR-reported evidence, not independently re-run here.

## PR inventory

| PR | Scope | Branch observed | Assessment |
|---|---|---|---|
| #1 | Recommendation, simulation, Member 3 profile adapter/service | feat/recommendation-logic | Engine exists in branch; service reads demo fixtures, not canonical dataset adapter |
| #3 | Rule comparison/explanation | feature/member-4-rule-comparison | Public module exists; requires two explicit versioned snapshots |
| #4 | Shared schema dataset adapters/validation | chore/shared-schema-adapters | Critical dependency; not on main at audit |
| #5 | Frontend ports/status badge/profile adapter | feat/frontend-integration | Preparation only; PR description says UI not yet wired |
| #6 | Frontend profile adapter | feat/frontend-profile-integration | Changes App.tsx; duplicates mapping; does not connect recommendation/simulation per description |

The PR search payload did not provide authoritative state/check fields. Therefore this report does not label any PR merged/open/closed based on that incomplete response. Review links:
- https://github.com/longhn1606-cpu/AI-Pathway/pull/1
- https://github.com/longhn1606-cpu/AI-Pathway/pull/3
- https://github.com/longhn1606-cpu/AI-Pathway/pull/4
- https://github.com/longhn1606-cpu/AI-Pathway/pull/5
- https://github.com/longhn1606-cpu/AI-Pathway/pull/6

## Findings

Critical:
1. PR #4 canonical dataset adapter is not on main; Member 3 service cannot yet consume canonical data directly.
2. PR #1 and PR #6 both add src/adapters/frontendProfileAdapter.ts with distinct implementations.
3. PR #5 and PR #6 duplicate form mapping and disagree on budget semantics: null-preserving vs upper-bound conversion.
4. Current dataset records do not provide two historical rule snapshots for Member 4.

High:
1. PR #1 service reads src/data/programs.ts and src/data/universities.ts, not Member 1's canonical exports.
2. RecommendationResult has no numeric score; UI must not invent probability.
3. AdmissionMethodInfo.sourceIds has no confirmed stable source-ID contract.
4. main package scripts do not include module/integration test commands from feature branches.

Medium:
1. Rule comparison requires richer source/version metadata than a single current program record provides.
2. PR #5 service ports are not a connected runtime flow.
3. Current frontend's local filtering is not evidence that recommendation/simulation engines are called.

## Safe actions performed

- Created feat/system-integration from main. No other branch modified.
- No schema, dataset, recommendation, simulation or rule-comparison business logic changed.
- Added this audit and an observed integration contract.
- Kept budget null until owner approval; rule comparison remains unavailable without two explicit snapshots.
- Preserved the rule that simulated data cannot be represented as verified.

## Next sequence

1. Member 1 confirms PR #4 validation and readiness.
2. Member 2 resolves PR #5/#6 duplicate adapter and budget policy with Member 3.
3. Inject canonical dataset into Member 3's existing service boundary without changing ranking logic.
4. Agree on a lossless mapping or explicit snapshot source for Member 4.
5. Wire frontend ports to agreed exports.
6. Add cross-module tests and execute actual app flow in CI or local runtime.

## Limitations

No npm/Vite/browser tests or 20 E2E runs were executed. The GitHub repository connector used here can inspect and modify repository content but does not provide a Node.js shell. No test pass is claimed.
