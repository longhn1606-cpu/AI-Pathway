# AI Pathway — admissions seed data (2026)

This directory contains an initial research dataset for a 3-university / 6-program demo.

## Files
- `universities.json`: university records and source register.
- `programs.json`: program records, admission-method notes, tuition/cutoff placeholders.
- `DATA_POLICY.md`: rules for status, unknown values, and safe use.
- `SOURCE_CANDIDATES.md`: source audit and remaining evidence gaps.
- `validate_data.py`: standard-library structural checks.
- `test_validate_data.py`: regression tests.

## Validation status
Local Python structural checks are intended to verify JSON shape, unique IDs, references, and conservative handling of unknown values. They do **not** prove that every admission fact is correct, and they do not replace TypeScript/build/integration tests. No tuition or cutoff values are populated because the reviewed evidence was insufficient. Program-level statuses remain `needs_review`.

## Known schema limitation
`AdmissionMethodInfo.sourceIds` expects source identifiers, but the supplied `DataSource` type has no `id`. This dataset therefore keeps `sourceIds: []` and does not mark those method claims as verified. Coordinate any schema change with the team before integration.
