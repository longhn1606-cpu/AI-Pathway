# Recommendation logic (demo)

## Public contract

The implementation imports the canonical domain types from `src/types/index.ts` and exports these functions from `src/logic/recommendation.ts`:

- `recommendPrograms(input: RecommendationInput): RecommendationResponse`
- `compareRecommendations(before, after): RecommendationComparison`

`RecommendationInput` contains `profile: StudentProfile`, `universities: University[]`, and `programs: UniversityProgram[]`. The response contains recommended `RecommendationResult[]`, excluded program IDs with reasons, and deduplicated global warnings. No shared schema fields were added.

## Rules

- `preferredRegions: []` means no region restriction. If `nationwide` appears anywhere in the list, all three university regions are allowed.
- `interests` are matched through a small explicit alias dictionary (for example `technology`, `CNTT`, `công nghệ và kỹ thuật`). Unknown labels are not fuzzy-matched; they do not silently match arbitrary majors.
- A known budget excludes a program only when its known minimum annual tuition exceeds the budget. If the minimum is affordable but the maximum exceeds it, the program is retained with a cost-risk warning.
- Missing tuition, score, scale, cutoff, or cutoff year is unknown—not zero. Different score scales are never compared directly.
- Historical cutoffs only add contextual explanation; they never exclude a program or promise admission.
- Preferred admission methods rank programs when a recorded method matches. Missing method data or no match produces a warning, not an assumed rejection.
- A missing university link excludes the affected program with an explicit data-integrity reason. Duplicate IDs are skipped with a warning.
- `simulated` and `needs_review` records receive visible warnings. A result's `dataStatus` is the most cautious of the linked university, program, source and admission-method statuses.
- Results sort by explainable criterion points, then stable `programId` order. Points are internal only and are not presented as a probability or admission score.

## Test and build

Run:

```sh
npm run test:recommendation
npm run build
```

The recommendation test runner uses the repository's existing TypeScript dependency and Node.js. The build command is the existing `tsc -b && vite build`. Run both locally before merging; this GitHub file-edit workflow does not execute repository commands, so no pass result should be inferred until the commands actually finish successfully.

## Limitations

- The demo fixtures under `src/data/` use explicitly simulated values and `example.invalid` source placeholders. They must not be represented as official university, tuition, admission-method, or cutoff data.
- Major-group matching is intentionally conservative and uses an explicit alias map. The team should agree a canonical major-group vocabulary before expanding aliases.
- The current shared `RecommendationResult` has no numeric score or match-level field. Ranking is therefore expressed only through array order and reasons/warnings.
- This is deterministic filtering/ranking, not an admissions prediction model.
