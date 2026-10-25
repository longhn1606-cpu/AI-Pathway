# AI Pathway — schema compatibility contract

## Canonical shared schema

`src/types/index.ts` remains the canonical contract. This change does not rename,
remove, or add fields to its interfaces. JSON under
`data/admissions-seed-2026/` remains the canonical demo dataset.

Use `src/data/admissionsData.ts` to import typed universities, programs and
historical cutoffs. The JSON is checked at runtime by
`src/data/admissionsDataValidation.ts` for required fields, enums, nullability,
source metadata, duplicate IDs and cross-record references. Do not create a
second in-code fixture for the same records.

## Source linking

The existing `AdmissionMethodInfo.sourceIds` values are strings, while
`DataSource` has no `id` property. Existing data currently leaves many of
these arrays empty. For backward compatibility, the adapter resolves a legacy
source reference by exact `DataSource.title` match.

Resolution is scoped strictly to `program.sources` for the program being
resolved. Do not fall back to `university.sources`: university-level sources
may describe general information and are not automatically evidence for a
specific program or admission method.

Do not populate empty `sourceIds` merely because a source exists on the
program: that would assert evidence coverage that has not been established.
If no exact match exists, or more than one match exists, keep the reference
unresolved; do not select the first match, add a synthetic ID, or treat it as
verified. The consuming module should surface a lightweight `needs_review`
warning with the `programId`, method index/identifier and unresolved source
title so the record can be checked. The adapter itself remains side-effect
free and does not log or invent UI behavior.

Multiple admission methods may reference the same source. This is allowed
when the source genuinely applies to each method; title uniqueness is checked
within one program's source list for each lookup, not across all methods.
The resolver is covered for unique, missing and ambiguous matches.

## Member 4 rule-comparison boundary (PR #3)

Keep `AdmissionRuleVersion`, `RuleSource` and `TuitionSnapshot` local to
`src/logic/ruleComparison/types.ts`. They represent versioned comparison
snapshots, not replacements for the shared university/program records.

Use `src/logic/adapters/ruleComparisonAdapter.ts` at integration boundaries:

| PR #3 field | Shared field | Mapping |
|---|---|---|
| `institutionId` | `University.id` | Same identifier |
| `programId` | `UniversityProgram.id` | Same identifier; nullable in a rule snapshot |
| `RuleSource.name` | `DataSource.title` | Direct |
| `RuleSource.url` | `DataSource.url` | Direct only when non-null |
| `RuleSource.appliedYear` | `DataSource.applicableYear` | Direct only when non-null |
| `RuleSource.checkedAt` | `DataSource.checkedAt` | Direct only when non-null |
| `RuleSource.dataStatus` | `DataSource.status` | Direct |
| `TuitionSnapshot.minVndPerYear` | `tuitionMinVndPerYear` | Direct; preserve null |
| `TuitionSnapshot.maxVndPerYear` | `tuitionMaxVndPerYear` | Direct; preserve null |
| `TuitionSnapshot.appliedYear` | `tuitionYear` | Direct; preserve null |

A source with missing URL, year or checked date cannot be represented by the
stricter shared `DataSource`; the adapter returns null instead of inventing
values. The rule snapshot itself may retain its nullable metadata.

The rule snapshot's `version` has no equivalent in `DataSource` and remains
local to PR #3. `TuitionSnapshot.sourceUrl` also remains local metadata; it
must not be silently converted into a verified `DataSource`. The adapter
returns tuition values separately from `provenance`; callers must retain both
parts and must not pass only the three tuition fields into comparison logic.

### Confirmed Recommendation contract (Member 3)

Member 3 confirmed on PR #4 that `RecommendationInput` contains only
`profile`, `universities` and `programs`. The historical cutoff collection is
kept separately and passed through `toRecommendationDataset(profile, data)`.
That adapter may populate the three nullable cutoff fields on a program only
when the profile selects exactly one currently eligible method and there is
one unique latest record matching exact `programId + method`, with score and
scale present. Missing, ambiguous, duplicate-latest or ineligible cases remain
unknown; no nearest-year fallback or scale conversion is allowed. Simulation
must resolve again for each scenario. This confirms the intended contract; it
does not mean PR #4 itself implements or owns Member 3's adapter.

### Member 4 contract — confirmed shape, mapping still bounded

Member 4 confirmed the local shapes in `src/logic/ruleComparison/types.ts`:
`AdmissionRuleVersion` requires a complete version snapshot (`id`, institution
identity/name, nullable program identity/name, `source`, `admissionMethod`,
`conditions`, optional tuition); `RuleSource` includes name, nullable URL,
year, version, nullable checked date and status; `TuitionSnapshot` includes
nullable VND range/year plus status and source URL.

The current PR #4 adapter can losslessly map the representable `RuleSource`
fields to/from `DataSource` only when URL, year and checked date are present.
It preserves the local version separately. It maps tuition amount/year and
returns status/source URL in a separate provenance object. Callers must retain
both. The shared schema does not contain publication date, currency, or
versioned historical rule conditions.

**Important boundary:** a current `UniversityProgram` plus its `DataSource`
records is not enough to manufacture two `AdmissionRuleVersion` snapshots.
PR #4 does not contain a verified historical rule-version dataset or complete
`conditions` payload. Therefore the adapter must not invent before/after
versions, `publishedAt`, rule conditions, or official tuition provenance.
Member 4's own PR #3 types remain local; Member 4/Member 1 must validate a
separate explicit mapping once genuine versioned source records are supplied.
The contract confirmation is not a claim that every field is already mapped
or that real-world data has been verified.

## Recommendation boundary (PR #1)

The recommendation engine accepts the shared `University`,
`UniversityProgram` and `StudentProfile` types. Its service should consume
the typed canonical exports from `src/data/admissionsData.ts`, rather than
the separate fictional fixture arrays currently on its feature branch.

Do not treat historical cutoffs as admission guarantees. Keep scale and
method attached to each historical cutoff record. Do not convert scores
between scales without an independently verified conversion rule.

## Known data limitations

- The six demo programs currently carry illustrative 2026 annual tuition ranges:
  HUST 30–45 million VND, DUT 28–38 million VND, and HCMUT 40–80 million
  VND. These are simulated placeholders for UI/demo flows only, not official
  fee quotations or verified school/program-specific amounts. Do not use them
  for real budgeting or advising; replace with official program-level figures
  before any real use. The program `status` remains `needs_review` and does
  not certify these tuition estimates.
- Empty `sourceIds` remain empty until a specific method-to-source relationship
  is verified.
- Simulated cutoff rows remain explicitly simulated and are not official facts.
- A successful TypeScript build validates types, not the factual accuracy of
  source documents or the applicability of a rule version.

## Test boundaries

- `npm test` runs adapter mapping and dataset-validator/resolver unit tests.
- The existing application workflow separately checks TypeScript/build, preview
  smoke test and canonical JSON regression checks.
- These checks establish structural compatibility, not factual verification
  of admissions claims or cross-module integration.
- PR #1 and PR #3 still need their owners to wire the canonical exports and
  rule-comparison adapter at their own module boundaries, followed by combined
  tests on the integrated branch.
