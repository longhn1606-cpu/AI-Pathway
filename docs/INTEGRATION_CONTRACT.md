# AI Pathway — Integration Contract

Audit snapshot: 2026-10-25. This is an observed contract, not a claim that Draft PRs are merged or E2E is complete.

## Architecture and ownership

```text
Canonical JSON + shared types (Member 1)
        |                         |
        v                         v
Recommendation + Simulation    Rule Comparison
(Member 3)                     (Member 4)
        \                         /
         v                       v
          React Frontend (Member 2)
                    |
          Integration adapters/tests
                 (Member 5)
```

Member 1 owns schema, canonical dataset, validator and dataset adapters. Member 2 owns React UI, form mapping and presentation. Member 3 owns recommendation/simulation logic. Member 4 owns rule comparison/explanations. Member 5 owns integration seams, orchestration, integration tests and documentation. No business logic or shared schema is redefined here.

## Shared schema observed in src/types/index.ts

- DataStatus: verified | needs_review | simulated.
- AdmissionMethod: high_school_exam | academic_record | competency_assessment | direct_admission | other.
- GeographicRegion: north | central | south | nationwide.
- DataSource: title, url, applicableYear, checkedAt, status.
- University: id, name, shortName, province, region, website, sources, status.
- AdmissionMethodInfo: method, description, applicableYear, sourceIds, status.
- UniversityProgram: id, universityId, name, majorGroup, nullable tuition min/max/year, admissionMethods, nullable historicalCutoff/year/scale, sources, status.
- StudentProfile: nullable expectedScore/scoreScale, interests, preferredRegions, nullable annualBudgetVnd, preferredMethods.
- RecommendationResult: programId, suitabilityReasons, warnings, dataStatus.

No schema change is proposed.

## Dataset contract observed in PR #4 branch

Canonical exports: universities, programs, historicalCutoffs from src/data/admissionsData.ts. Dataset validation runs before exports. Source resolver supports exact unique title matching only. AdmissionMethodInfo.sourceIds has no confirmed stable ID semantics; do not invent IDs or choose among ambiguous titles.

ID mapping:
- University.id ↔ UniversityProgram.universityId.
- UniversityProgram.id ↔ RecommendationResult.programId.
- Rule comparison institutionId and programId are separate identifiers; member 4 logic requires both to match to identify affected programs.
- Admission methods use exact shared enum values, not display labels.

Nullable tuition/cutoff/source metadata remains null when unknown. Null is not zero and not evidence of no change. Preserve source URL, year, checkedAt and DataStatus.

## Member 3 contract observed in PR #1 branch

RecommendationInput = { profile: StudentProfile; universities: University[]; programs: UniversityProgram[] }.
recommendPrograms(input) returns { results: RecommendationResult[]; excluded: { programId; reasons }[]; warnings: string[] }.
simulateScenario(baseline, changes: Partial<StudentProfile>) returns scenarioProfile, before, after and comparison groups added/removed/retained.
UniversityService currently exposes async dataset getters, getRecommendations, getRecommendationReport and simulateRecommendations.

Important gap: PR #1 service imports src/data/programs.ts and src/data/universities.ts demo fixtures, not Member 1 canonical exports. Add a data-source seam; do not silently substitute fixtures. RecommendationResult has no numeric score/probability. Do not compare scores across incompatible scales or methods. Simulation must preserve baseline profile and read-only dataset.

## Member 4 contract observed in PR #3 branch

Public exports are compareRules and explainRules from src/logic/ruleComparison/index.ts. AdmissionRuleVersion contains id, institutionId, nullable programId, source metadata, nullable admissionMethod, conditions and optional nullable tuition snapshot. RuleSource contains name, nullable url/appliedYear/checkedAt, version and dataStatus. TuitionSnapshot contains nullable min/max/year, status and nullable source URL. RuleComparison and RuleExplanation carry changes, affected programs, evidence, limitations, provenance, impact level and explanation fields.

Import exact types and signatures from Member 4 public module. A current UniversityProgram record is not two historical rule versions. A before/after comparison requires two explicit versioned snapshots with provenance; do not synthesize history.

## Frontend contract and duplicate work

PR #5 branch adds profileAdapter.ts and dependency-injected service ports for recommendation, simulation and rule comparison. Its current budget bands map to annualBudgetVnd=null because ranges are not exact amounts. Current form does not collect admission method, so preferredMethods=[].

PR #6 branch adds frontendProfileAdapter.ts and changes App.tsx. It maps three budget bands to 20/40/70 million VND upper bounds, unlike PR #5. PR #1 also contains src/adapters/frontendProfileAdapter.ts, duplicating the PR #6 path with a separate implementation. These adapters must be reconciled, not blindly merged. Safe default: budget remains null until Member 2/product owner approves a precise interpretation.

## Data flow

1. Frontend validates form and maps it to StudentProfile.
2. Dataset adapter validates canonical JSON and exposes shared types.
3. Recommendation receives profile, universities and programs.
4. Simulation receives baseline plus partial scenario changes and must not mutate baseline.
5. Rule comparison receives two explicit snapshots.
6. Frontend renders results by programId, reasons, warnings, explanation, provenance and status.

Missing values stay null. Invalid required IDs/enums are rejected, not guessed. Simulated never becomes verified. No change is claimed when evidence or one comparison side is missing.

## Known incompatibilities

| Area | Finding | Safe action |
|---|---|---|
| PR #4 | Canonical adapter absent from main at audit | Integrate after owner review/merge or explicit branch dependency |
| PR #1 | Service reads demo fixtures | Inject canonical dataset at service boundary |
| PR #1 / #6 | Duplicate frontendProfileAdapter path | Choose one after Member 2/3 review |
| PR #5 / #6 | Duplicate profile mapping and budget policy conflict | Member 2 confirms canonical adapter and budget semantics |
| Rule history | Canonical dataset is not a versioned history | Require two explicit snapshots |
| Provenance | Rule metadata richer than current source model | Map losslessly or retain unknowns/limitations |
| Runtime API | PR #1 is in-process demo service, not deployed HTTP API | Use local service boundary; do not claim HTTP backend |
| Tests | main package scripts do not expose integration tests | Add integration scripts after dependency reconciliation |

## Changes requiring owner approval

- Shared types/dataset format: Member 1.
- Recommendation ranking/cutoff/simulation semantics: Member 3.
- Rule matching/impact/explanation semantics: Member 4.
- Form contract, budget interpretation and UI states: Member 2.
- Never promote DataStatus or fill null data without evidence.

This contract is an audit baseline. It does not certify end-to-end completion.
