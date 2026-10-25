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

Do not populate empty `sourceIds` merely because a source exists on the
program: that would assert evidence coverage that has not been established.
If no exact match exists, or more than one match exists, keep the reference
unresolved and expose `needs_review`/a warning. The resolver is covered for
unique, missing and ambiguous matches. Do not add a synthetic source ID.

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
must not be silently converted into a verified `DataSource`.

## Recommendation boundary (PR #1)

The recommendation engine accepts the shared `University`,
`UniversityProgram` and `StudentProfile` types. Its service should consume
the typed canonical exports from `src/data/admissionsData.ts`, rather than
the separate fictional fixture arrays currently on its feature branch.

Do not treat historical cutoffs as admission guarantees. Keep scale and
method attached to each historical cutoff record. Do not convert scores
between scales without an independently verified conversion rule.

## Known data limitations

- Tuition values remain null where no sufficiently verified amount exists.
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
