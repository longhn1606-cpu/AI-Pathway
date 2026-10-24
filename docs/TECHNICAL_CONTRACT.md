# AI Pathway — Technical Contract

## 1. Product scope
AI Pathway helps Vietnamese high-school students and parents explore universities, majors, admission methods, costs, and application pathways across Vietnam. The product scope is nationwide and covers all major groups. Any narrow discipline set used in a demo is only illustrative and must not be treated as the product's full scope.

## 2. Source of truth
Shared TypeScript contracts live in `src/types/index.ts`. Frontend, data preparation, and service code should import these types rather than redefining equivalent interfaces.

- `DataStatus`: `verified` | `needs_review` | `simulated`
- `AdmissionMethod`: `high_school_exam` | `academic_record` | `competency_assessment` | `direct_admission` | `other`
- `GeographicRegion`: `north` | `central` | `south` | `nationwide`
- `DataSource`: title, URL, applicable year, checked date, status
- `University`: stable ID, name, short name, province, region, website, sources, status
- `UniversityProgram`: stable ID, university ID, program name, major group, tuition range/year, admission methods, historical cutoff/year/scale, sources, status
- `StudentProfile`: expected score and scale, interests, preferred regions, annual budget in VND, preferred admission methods
- `RecommendationResult`: program ID, suitability reasons, warnings, data status

## 3. Data invariants
1. IDs are stable, unique, and treated as opaque strings.
2. Every `UniversityProgram.universityId` references an existing `University.id`.
3. Every `RecommendationResult.programId` references an existing `UniversityProgram.id`.
4. Monetary amounts use VND per academic year. Unknown values are `null`, not zero.
5. A score or cutoff must be interpreted with its corresponding scale; do not compare different scales without an explicit conversion.
6. Admission details and tuition are year-specific. Keep the applicable year and source alongside facts.
7. `verified` should only be used when the source was checked; unverified or incomplete information is `needs_review`; invented/demo data is `simulated`.
8. Never present simulated data as real university or official admissions data.
9. Geographic scope is nationwide. Do not restrict the canonical dataset to technology/AI or any other single major group.

## 4. Service boundary
Keep data access and recommendation logic outside presentational components. Suggested async service contract:

```ts
import type {
  StudentProfile,
  University,
  UniversityProgram,
  RecommendationResult,
} from '../types'

export interface UniversityService {
  getUniversities(): Promise<University[]>
  getProgramsByUniversity(universityId: string): Promise<UniversityProgram[]>
  getRecommendations(profile: StudentProfile): Promise<RecommendationResult[]>
}
```

If the project does not yet have a real API or verified dataset, provide an explicitly named demo/mock implementation and label its output as simulated. Do not imply that demo recommendations are official admission predictions.

## 5. Recommendation behavior
- Filter by the student's declared interests, preferred regions, budget, and preferred admission methods when the relevant data exists.
- Missing values should not silently become zero or a negative match; return a warning or treat the criterion as unknown.
- Historical cutoffs are reference information only and must not be described as a guarantee of admission.
- Return concise, explainable suitability reasons and warnings with every result.
- Do not claim that a student will pass or fail based only on a historical cutoff.

## 6. Frontend integration
- Import shared types from `src/types/index.ts`; avoid parallel local definitions of region, profile, or program domain types where they represent the same concepts.
- UI-specific form values may remain presentation types, but convert them through an explicit mapper to `StudentProfile`.
- Preserve the current responsive UI while moving mock data and filtering logic into a service/module.
- The current frontend's six sample programs are illustrative only. Keep that warning visible until verified records are integrated.
- Do not change the shared schema without coordinating the change with the team.

## 7. Validation and quality gates
Before merging:
1. Install dependencies with the package manager matching the lockfile.
2. Run `npm run build` (currently runs `tsc -b && vite build`).
3. Exercise the E2E checklist in `docs/QA_CHECKLIST.md`.
4. Verify keyboard navigation, labels, responsive layout, and empty states.
5. Confirm no simulated record is presented as verified.
6. Record any manual checks and known limitations in the pull request.

The repository currently defines `dev`, `build`, and `preview` scripts. Do not report lint, unit, or E2E tests as passing unless scripts/tools are added and those checks are actually run.

## 8. Branch and release workflow
- Make integration changes on `feat/frontend-refresh` or a focused feature branch.
- Review the diff and run quality gates before merging to `main`.
- Deploy only after the build and smoke checks pass.
- Keep deployment configuration and secrets in the hosting provider's environment settings; never commit credentials.
