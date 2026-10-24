# AI Pathway — admissions seed data (2026)

This directory contains the data package used by the React demo: 3 universities, 6 selected programs, and historical cutoff records for 2023–2025.

## Files
- `universities.json`: university records and source register.
- `programs.json`: program records, admission-method notes, and unknown tuition values.
- `historical_cutoffs.json`: 36 historical cutoff demo records (9 verified values and 27 simulated placeholders).
- `HISTORICAL_CUTOFFS_README.md`: cutoff status, scoring policy, and source references.
- `DATA_POLICY.md`: rules for status, unknown values, and safe use.
- `DATA_GAPS.md`: known gaps and release checklist.
- `SOURCE_CANDIDATES.md`: source audit and remaining evidence gaps.
- `validate_data.py`: standard-library structural checks, including historical cutoff cross-references and scale bounds.
- `test_validate_data.py`: regression tests for IDs, references, statuses, score scales, and simulation warnings.

## App integration
The React app imports these JSON files directly. It filters the selected programs by interest group, region, and keyword. It does not filter by tuition because tuition is unknown, and it does not use the entered score to estimate admission chances. The UI displays the program status and shows each displayed cutoff with year, method, scale, status, and a source link. Links attached to simulated values are contextual references only and do not verify the invented number.

## Validation status
The GitHub Actions workflow `.github/workflows/demo-checks.yml` is configured to run the TypeScript/Vite build, the structural validator, and the Python regression tests. Do not report checks as passing until the workflow has completed successfully. These checks cannot establish that every real-world admission fact is correct; official sources still require manual claim-by-claim review.

## Known schema limitation
`AdmissionMethodInfo.sourceIds` expects source identifiers, but the shared `DataSource` type has no `id`. This dataset therefore keeps `sourceIds: []` and does not mark those method claims as verified. Do not silently change the shared schema for this demo.

## Demo safety
- Unknown tuition values remain `null`.
- The historical cutoff file covers 2023–2025, not 2026.
- Simulated scores are invented test data, not official cutoffs, and must not be used for actual admissions guidance.
- This dataset is intentionally limited to the selected 3 universities and 6 programs; it is not a national admissions database.
