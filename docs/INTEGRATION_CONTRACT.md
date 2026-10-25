# AI Pathway — Integration Contract

Audit snapshot: 2026-10-25. This contract records the interfaces integrated into Member 5's branch; it does not claim the PRs are merged or E2E is complete.

## Architecture and ownership

```text
Canonical admissions JSON
  -> Member 1 schema / validator / dataset access
  -> Member 3 recommendation + simulation
  -> Member 2 React form / result presentation
  -> Member 5 integration adapters/services

Two versioned rule snapshots
  -> Member 4 compareAndExplainRules
  -> Member 2 rule comparison panel
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

Canonical exports are universities, programs and historicalCutoffs. Dataset validation runs before exports are exposed. Source resolution supports exact unique title matches only; sourceIds has no confirmed stable ID semantics.

Member 5 added src/services/integratedRecommendationService.ts. It injects canonical exports into Member 3's existing recommendPrograms and simulateScenario functions through Member 3's unchanged recommendationDatasetAdapter. It clones profiles, university/program records and nested arrays at the service boundary. It does not import Member 3's demo fixture files or modify ranking/simulation algorithms.

ID mapping:
- University.id ↔ UniversityProgram.universityId.
- UniversityProgram.id ↔ RecommendationResult.programId.
- Admission methods use exact shared enum values.
- No ID is generated or repaired by the integration service.

Null tuition/cutoff stays null. A simulated record remains simulated. A result does not become verified merely because it passes through an adapter.

## Historical cutoff data boundary

Member 1 exposes historicalCutoffs as a separate collection, while Member 3's engine accepts one nullable cutoff tuple on UniversityProgram. Member 3 has now specified the selection policy and supplied `src/adapters/recommendationDatasetAdapter.ts`, synchronized into this branch unchanged:

- Resolve a cutoff only when the profile selects exactly one admission method.
- The program must currently declare that exact method in `admissionMethods`.
- Match by exact `programId` + `method`, require non-null score and scale, then select the latest year only if exactly one record exists for that year.
- If no record exists, the method is not currently offered, multiple methods are selected, or the latest year is ambiguous, preserve the program's existing nullable cutoff tuple unchanged.
- Merge provenance from the selected historical record and combine DataStatus without promoting simulated/needs_review data to verified.
- Keep score scales unchanged; the recommendation engine itself warns rather than comparing unlike scales.

Member 5's service now calls this adapter for every recommendation. Simulation passes a resolver callback so both baseline and scenario profiles are independently re-resolved; changing admission method therefore changes the applicable cutoff without mutating canonical data. This closes the previous integration blocker without changing Member 3's ranking logic or shared schema.

## Recommendation / simulation API

Input: `{ profile: StudentProfile }`.

Recommendation:
- `integratedRecommendationService.recommend(input)` returns Member 3's `{ results, excluded, warnings }`.
- `getRecommendations(input)` returns the results array for legacy consumers.

Simulation:
- `integratedRecommendationService.simulate(input, changes: Partial<StudentProfile>)` returns scenarioProfile, before, after and added/removed/retained comparisons.
- Simulation uses a cloned baseline profile and cloned canonical records. The original profile and canonical provider objects are not exposed for mutation.

## Frontend profile adapter and taxonomy

The integration branch uses the updated PR #6 version of `src/adapters/profileAdapter.ts`, which reuses the PR #5 adapter path and maps bounded budget ranges to conservative ceilings (20/40/70 million VND). Over70/flexible remain null. These are filter thresholds, not estimates of exact household budget.

Member 5 added `src/adapters/recommendationProfileAdapter.ts` because the UI category `technology` does not exactly match the canonical program majorGroup strings. It maps the UI choice to the two observed dataset labels `information_technology` and `engineering`. This is an explicit input taxonomy adapter only; Member 3's ranking logic is unchanged. This mapping should be reviewed if Member 1 changes the dataset taxonomy.

## Frontend service wiring

src/App.tsx now:
- validates the form using validateUiProfile;
- maps the UI profile using toRecommendationProfile;
- calls integratedRecommendationService.recommend;
- renders only results whose programId is returned by the engine;
- displays suitability reasons, warnings and returned DataStatus;
- shows loading, error and empty states;
- calls integratedRecommendationService.simulate for a +1 score scenario and displays before/after and added/removed/retained counts.

Simulation is a counterfactual scenario only. The baseline form/profile remains unchanged.

## Dataset → rule comparison contract

Member 4 public implementation is present on this branch:
- compareRules
- explainRules
- compareAndExplainRules

Member 5 added src/services/integratedRuleComparisonService.ts. Its compare(before, after) delegates to Member 4's compareAndExplainRules and returns { comparison, explanation }.

Member 2's frontend is connected through src/components/RuleComparisonPanel.tsx. It uses the two explicitly simulated snapshots already supplied by Member 4 in data/admission-rule-comparison/demo-rules.json. Both are visibly labelled simulated and the panel renders changed fields, impact level, limitations and data status. The pair adapter runtime-validates both snapshots and rejects missing snapshots, malformed metadata/conditions/tuition, duplicate collection IDs and identical pair IDs. Fixture JSON remains `unknown` until validation succeeds. It preserves nullable source and tuition fields.

Important limitation: these are internal demo scenarios, not official admissions rules. Canonical current-state UniversityProgram records do not encode two historical rule versions. Production comparison still requires two source-backed AdmissionRuleVersion snapshots with distinct IDs and provenance. The panel does not derive or fabricate an old version from the current dataset. It renders Member 4's `whatChanged`, `tuitionImpact`, `nextSteps`, affected-program guidance, source disclosure, unknowns and limitations.

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
| PR #4 | Adapter files are copied as dependency snapshot; PR #4 remains independently owned | Reconcile by file-level diff after its merge |
| PR #1 | Original service uses demo fixtures | Member 5 service injects canonical dataset |
| PR #3 | Requires two versioned snapshots | Member 4's latest `compareRules.ts` and `explainRules.ts` safeguards are synchronized into this branch; service/panel use the explicitly simulated demo pair; production source remains open |
| PR #5/#6 | PR #6 reuses PR #5 adapter with budget ceilings | Integrated branch uses updated PR #6 version |
| Taxonomy | UI technology vs dataset information_technology/engineering | Member 5 adapter maps observed labels; review if taxonomy changes |
| E2E | Browser/runtime test execution pending | Run 20 real submissions in CI/browser environment |

## Owner approval boundaries

- Schema/dataset format: Member 1.
- Ranking/cutoff/simulation semantics: Member 3.
- Rule matching/impact/explanation semantics: Member 4.
- Form fields, budget interpretation and UI states: Member 2.
- No status promotion or null-value imputation without source evidence.

This contract describes integration implementation on the Member 5 branch, not full product completion.


## Historical cutoff integration update — 2026-10-25

The previous historical-cutoff blocker is closed at the adapter/service boundary. The policy is owned by Member 3 and implemented by the synchronized `recommendationDatasetAdapter.ts`. Four new integration cases cover latest unique method-specific cutoff, simulation re-resolution after method change, method not currently declared, and multiple selected methods. CI for commit `71650fd` is pending; do not treat the new tests as passed until the workflow completes.
