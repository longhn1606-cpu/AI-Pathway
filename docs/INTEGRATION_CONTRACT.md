# AI Pathway — Integration Contract

Audit snapshot: 2026-10-25. This contract records the interfaces integrated into Member 5's branch; it does not claim the PRs are merged or E2E is complete.

## Architecture and ownership

```text
Canonical admissions JSON
  -> Member 1 schema / validator / dataset access
  -> Member 3 recommendation + simulation
  -> Member 2 React form / result presentation
  -> Member 5 integration services and tests

Versioned rule snapshots
  -> Member 4 compareAndExplainRules
  -> Member 2 comparison presentation
  -> Member 5 service boundary
```

Member 1 owns shared schema and canonical dataset. Member 2 owns frontend/form/presentation. Member 3 owns recommendation/simulation logic. Member 4 owns rule comparison/explanation logic. Member 5 owns adapters, orchestration, integration tests and documentation. Member 5 does not change another member's business rules.

## Shared schema

Observed in src/types/index.ts:
- DataStatus: verified | needs_review | simulated.
- AdmissionMethod: high_school_exam | academic_record | competency_assessment | direct_admission | other.
- GeographicRegion: north | central | south | nationwide.
- University and UniversityProgram use stable id/universityId linkage.
- UniversityProgram tuition min/max/year and historical cutoff/year/scale are nullable.
- StudentProfile score/scale/budget are nullable; interests, preferredRegions and preferredMethods are arrays.
- RecommendationResult identifies a program by programId and includes reasons, warnings and dataStatus. It has no numeric probability field.

No schema change is made in this integration branch.

## Dataset → recommendation contract

Member 1's PR #4 files are present as an explicit dependency snapshot on this branch:
- src/data/admissionsData.ts
- src/data/admissionsDataValidation.ts
- src/logic/adapters/ruleComparisonAdapter.ts

The canonical exports are universities, programs and historicalCutoffs. Dataset validation runs before canonical exports are exposed. Source resolution supports exact unique title matches only; sourceIds has no confirmed stable ID semantics.

Member 5 added src/services/integratedRecommendationService.ts. It injects canonical exports into Member 3's existing recommendPrograms and simulateScenario functions. It clones profiles, university/program records and nested arrays at the service boundary. It does not import Member 3's demo fixture files or modify ranking/simulation algorithms.

ID mapping:
- University.id ↔ UniversityProgram.universityId.
- UniversityProgram.id ↔ RecommendationResult.programId.
- Admission methods use exact shared enum values.
- No ID is generated or repaired by the integration service.

Null tuition/cutoff stays null. A simulated record remains simulated. A result does not become verified merely because it passes through an adapter.

## Recommendation / simulation API

Input:
`{ profile: StudentProfile }`

Recommendation:
`integratedRecommendationService.recommend(input)` returns Member 3's `{ results, excluded, warnings }`.
`getRecommendations(input)` returns the results array for legacy consumers.

Simulation:
`integratedRecommendationService.simulate(input, changes: Partial<StudentProfile>)` returns scenarioProfile, before, after and added/removed/retained comparisons.

Simulation uses a cloned baseline profile and cloned canonical records. The original profile and canonical provider objects are not exposed for mutation.

## Dataset → rule comparison contract

Member 4 public implementation is present on this branch:
- compareRules
- explainRules
- compareAndExplainRules

Member 5 added src/services/integratedRuleComparisonService.ts. Its compare(before, after) method delegates to Member 4's compareAndExplainRules and returns { comparison, explanation }.

Important limitation: canonical current-state UniversityProgram records do not encode two historical rule versions. The service therefore requires callers to supply two explicit AdmissionRuleVersion snapshots with source/version/year/status metadata. It does not derive or fabricate an old version from the current dataset. If either snapshot or provenance is missing, the Member 4 explanation should retain limitations/requires_review.

## Frontend contract and profile adapter decision

PR #5 exposes profileAdapter.ts and dependency-injected ports. PR #6 was updated to reuse the PR #5 profile adapter rather than define another adapter path. Its budget bands map to conservative upper-bound thresholds (20/40/70 million VND); over70/flexible remain null. This is an explicit threshold policy, not an assertion of exact household budget. The form still does not collect admission method, so preferredMethods remains [].

PR #1's separate src/adapters/frontendProfileAdapter.ts is not copied into this integration branch. The integrated services consume the shared StudentProfile directly.

The current frontend still needs to be wired to these integration services. No claim is made that the React UI already calls them.

## Rule and provenance safeguards

- Rule comparison needs two explicitly versioned snapshots; current dataset alone is insufficient.
- No change is claimed if evidence is insufficient or one side is missing.
- Preserve source URL, version, applied year, checkedAt and DataStatus.
- Do not treat null tuition as zero or no change.
- Do not infer a stable source ID from source title.
- Do not treat simulated fixtures as official admissions facts.

## Known remaining incompatibilities

| Area | Finding | Action |
|---|---|---|
| PR #4 | Adapter files are copied as dependency snapshot; PR #4 remains independently owned | Keep PR #4 unmerged/unmodified; reconcile by file-level diff after its merge |
| PR #1 | Original service uses demo fixtures | Member 5's integration service injects canonical dataset |
| PR #3 | Requires two versioned snapshots | Service boundary accepts explicit snapshots; snapshot history source remains open |
| PR #5/#6 | Profile mapping and budget policy changed during PR #6 update | Reuse PR #5 adapter; confirm final UI contract with Member 2 |
| Frontend | App still does not invoke integrated services | Wire after owners confirm the exported API and presentation |
| E2E | Browser/runtime execution not available through repository connector | Use CI/local runner and record actual runs |

## Owner approval boundaries

- Schema/dataset format: Member 1.
- Ranking/cutoff/simulation semantics: Member 3.
- Rule matching/impact/explanation semantics: Member 4.
- Form fields, budget interpretation and UI states: Member 2.
- No status promotion or null-value imputation without source evidence.

This contract describes service-level integration on the Member 5 branch, not full product completion.
