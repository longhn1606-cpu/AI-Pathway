# Recommendation and simulation logic (demo)

## Public contracts

Canonical domain types are imported from `src/types/index.ts`; the shared schema is not modified.

- `recommendPrograms(input: RecommendationInput): RecommendationResponse`
- `compareRecommendations(before, after): RecommendationComparison`
- `simulateScenario(baseline, changes): SimulationResult`
- `demoUniversityService.getRecommendationReport(profile)` returns results, exclusions and warnings.
- `demoUniversityService.simulateRecommendations(profile, changes)` exposes the scenario workflow through the service boundary.

`RecommendationInput` contains a `StudentProfile`, `University[]`, and `UniversityProgram[]`. The recommendation response contains ordered results, excluded program IDs with reasons, and deduplicated warnings.

`simulateScenario` accepts only profile-field overrides. It returns an independent `scenarioProfile`, the baseline and scenario recommendation responses, and added/removed/retained comparison groups. It does not write to the baseline profile or dataset. The source arrays are passed as read-only inputs to deterministic logic.

## Recommendation rules

- `preferredRegions: []` means no region restriction. `nationwide` permits all regions.
- Major groups use an explicit alias dictionary; unknown labels are not fuzzy-matched.
- A known budget excludes a program only when known minimum annual tuition exceeds the budget. If the maximum exceeds budget while the minimum does not, the program is retained with a cost-risk warning.
- Missing tuition, score, scale, cutoff, or cutoff year is unknown—not zero.
- Invalid tuition (negative/non-finite values or minimum above maximum) is treated as unknown for budget filtering and marks the result `needs_review`; it never becomes a free program or a budget-based exclusion.
- Invalid historical cutoff (negative/non-finite score, non-positive/non-finite scale or year, or cutoff above its scale) is not compared and marks the result `needs_review`.
- Scores are compared only when the student's score scale exactly matches the historical cutoff scale. No conversion is inferred between THPT, academic-record, competency-assessment, or other admission methods.
- Historical cutoffs are contextual only. They neither guarantee admission nor independently exclude a program.
- Preferred admission methods contribute ranking points only when a recorded method matches; missing or unmatched methods produce warnings.
- Missing university references exclude the affected program. Duplicate IDs are skipped with warnings.
- `simulated` and `needs_review` records remain visibly flagged. Source URL syntax checks do not prove that a URL is official or factually correct.
- Results are ranked by transparent internal criterion points, then stable `programId` order. The points are not a probability, chance, or admission score.

### Ranking weights

| Criterion | Internal points | Rule |
|---|---:|---|
| Major-group match | +5 | Exact match after explicit alias normalization |
| Preferred admission method | +3 | At least one recorded method matches |
| Annual tuition fully within budget | +3 | Both known tuition bounds are within budget |
| Minimum tuition within budget, maximum exceeds | +1 | Keep result and emit cost-risk warning |
| Preferred region match | +2 | Region preference is present and matched |
| Historical cutoff context | +2 | Score is at/above cutoff and scales match exactly |

A score below a comparable historical cutoff does not exclude the program and does not subtract points; it adds a warning only. Missing or incomparable score data adds no points. A missing budget or unknown tuition adds no cost points. These are heuristic ordering weights, not calibrated probabilities.


## Simulation workflow

1. Keep the original `StudentProfile` unchanged.
2. Call `simulateScenario(input, profileChanges)`.
3. Read `before` and `after` for full result details.
4. Read `comparison.added`, `removed`, and `retained` to explain membership changes.
5. Inspect result reasons and warnings to explain score, budget, major, region, or method effects.

A scenario can produce unchanged recommendations. That is a valid result and must not be represented as a bug or forced difference.

## Validation

Run:

```sh
npm run test:recommendation
npm run build
```

The recommendation command runs the recommendation regression suite, independent simulation suite, and frontend-profile adapter suite. GitHub Actions is configured to run this command and the production build on pushes to `feat/recommendation-logic`.

## Limitations

- Demo fixtures under `src/data/` are simulated, with `example.invalid` placeholder URLs. They are not official university, tuition, admission-method, or cutoff data.
- The shared `RecommendationResult` has no numeric score field. Ranking is expressed by array order and reasons/warnings.
- This is deterministic filtering and ranking, not an admissions prediction model.
- This module does not perform legal verification of admissions rules or verify source ownership.


## Canonical dataset integration

- Recommendation service now reads `universities`, `programs`, and `historicalCutoffs` from `src/data/admissionsData.ts`; the former demo fixtures remain only for isolated legacy unit tests.
- `src/adapters/recommendationDatasetAdapter.ts` selects a historical cutoff only when the profile explicitly contains exactly one preferred admission method. It selects the unique latest record for that program and method; missing or ambiguous records remain un-compared.
- The adapter preserves cutoff provenance by carrying the source URL, checked date, applicable year, and data status into the derived program record. Simulated cutoff status propagates to the recommendation result.
- When a profile has zero or multiple preferred methods, no single cutoff is inferred because the shared `UniversityProgram` contract contains only one cutoff slot.
- Simulation now re-resolves the canonical dataset for both baseline and scenario profiles, so changing the preferred admission method cannot reuse a cutoff selected for the previous method.
- Canonical data validation and method-specific adapter coverage run in `npm run test:recommendation`.
- `information_technology` in the canonical dataset is normalized as the existing `technology` interest category; no shared schema fields were changed.
