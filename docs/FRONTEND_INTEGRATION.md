# Frontend integration contract (prepared ahead of UI merge)

This guide is intentionally separate from `src/App.tsx`: the current frontend is a UI-only demo and uses a different local profile shape. A reusable, tested adapter is now available at `src/adapters/frontendProfileAdapter.ts`; import `toStudentProfile` rather than duplicating the mapping. Do not pass UI-only `demoPrograms` IDs into recommendation logic.

## UI-to-domain mapping

The frontend currently has:

- `score`: string entered on a 30-point scale.
- `interest`: `technology | business | health | education | arts | other | undecided`.
- `region`: `north | central | south | anywhere`.
- `budget`: `under20 | 20to40 | 40to70 | over70 | flexible`.
- `keywords`: free-text search, not a field in the shared recommendation schema.

Map this into `StudentProfile` before calling `demoUniversityService`:

```ts
import type { StudentProfile } from '../types'
// Production adapter: import { toStudentProfile } from '../adapters/frontendProfileAdapter'

type UiProfile = {
  score: string
  interest: 'technology' | 'business' | 'health' | 'education' | 'arts' | 'other' | 'undecided' | ''
  region: 'north' | 'central' | 'south' | 'anywhere' | ''
  budget: 'under20' | '20to40' | '40to70' | 'over70' | 'flexible' | ''
}

export function toStudentProfile(profile: UiProfile): StudentProfile {
  const parsedScore = profile.score.trim() === '' ? null : Number(profile.score)
  const expectedScore =
    parsedScore !== null && Number.isFinite(parsedScore) && parsedScore >= 0 && parsedScore <= 30
      ? parsedScore
      : null

  const budgetCeilings: Record<string, number | null> = {
    under20: 20_000_000,
    '20to40': 40_000_000,
    '40to70': 70_000_000,
    over70: null,
    flexible: null,
  }

  return {
    expectedScore,
    scoreScale: expectedScore === null ? null : 30,
    interests: profile.interest && profile.interest !== 'undecided'
      ? [profile.interest]
      : [],
    preferredRegions: profile.region && profile.region !== 'anywhere'
      ? [profile.region]
      : [],
    // These are upper-bound interpretations of the UI's broad budget bands,
    // not exact personal budgets. No upper bound is represented as null.
    annualBudgetVnd: profile.budget ? budgetCeilings[profile.budget] : null,
    // The current UI does not collect an admission-method preference.
    preferredMethods: [],
  }
}
```

## Calling recommendation and simulation

```ts
import { demoUniversityService } from './recommendationService'

const studentProfile = toStudentProfile(uiProfile)
const report = await demoUniversityService.getRecommendationReport(studentProfile)

// report.results is already ranked. Join by programId against the catalog;
// do not use the UI-only demoPrograms IDs.
const scenario = await demoUniversityService.simulateRecommendations(
  studentProfile,
  { expectedScore: 26, annualBudgetVnd: 40_000_000 },
)
```

Use `report.excluded` and `report.warnings` as visible explanation/context. A recommendation result's `dataStatus` must be displayed; `needs_review` and `simulated` are not equivalent to verified information.

## Joining results to program and university details

The current service exposes `getUniversities()` and `getProgramsByUniversity(universityId)`. A frontend can load the catalog once, index programs by ID, and render `report.results` in their existing order. Keep the program ID as the stable key. After the shared-data PR is merged, switch the service adapter to the canonical dataset; do not invent missing `sourceIds` or replace unknown tuition/cutoff values with zero.

## Important semantic boundaries

- `suitabilityReasons` and result order describe relative fit under explicit heuristic rules. They are not admission probabilities, chances, or guarantees.
- A historical cutoff is only comparable when score scales match exactly. The UI currently collects THPT-style /30 input; do not use it to compare academic-record or competency-assessment cutoffs without a valid method-specific conversion supplied by verified data.
- The current UI does not collect admission method. An empty `preferredMethods` means no method preference is applied, not that every method is available.
- `keywords` remains a separate text-search concern; it must not be silently mapped to major aliases.
- The current demo budget choices are ranges. The adapter uses each bounded range's upper edge as a conservative filter ceiling and leaves unbounded/flexible options as `null`. If the product team wants exact affordability filtering, collect an explicit maximum annual budget instead.
- The current UI requires score input, but the domain supports `null`. Do not fabricate a score when the user has not supplied one.
