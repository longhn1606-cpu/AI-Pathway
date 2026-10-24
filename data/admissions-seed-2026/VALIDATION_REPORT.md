# Validation report — AI Pathway admissions seed

Date: 2026-10-24

## Scope and checks
- 3 university records and 6 program records.
- Structural validator: expected 0 errors; warnings are expected for missing method-level source IDs.
- Regression tests: 7 standard-library tests covering dataset size, unique IDs, foreign keys, null unknown values, conservative record statuses, method traceability, and source URL/status format.
- This is data-package validation only. It does not test the React/Vite application, TypeScript compilation, or runtime integration.

## Known data gaps
- Tuition and historical cutoff values are intentionally null: verified program/year/method/scale evidence was insufficient.
- All university/program records remain `needs_review`.
- Method records remain `needs_review` with empty `sourceIds`: the shared `DataSource` type does not define an `id`.
- DUT's official 2026 notices establish school-level admission announcements, not a verified method matrix for every program.

## Important
Passing structural tests is not proof that every real-world admission fact is correct. Do not use `needs_review` records to assert eligibility or predict admission chances.
