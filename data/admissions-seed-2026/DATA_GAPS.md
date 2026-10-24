# DATA_GAPS — AI Pathway demo

Snapshot: 2026-10-25. This file records known limitations rather than filling gaps with guesses.

## Scope
- Three universities: HUST, DUT, HCMUT.
- Six selected programs.
- Historical cutoff demo records cover 2023–2025.
- The app reads `universities.json`, `programs.json`, and `historical_cutoffs.json` from this folder.

## Known gaps and handling
| Field / topic | Current state | Demo handling |
|---|---|---|
| Tuition by program and year | Not sufficiently verified for all six programs | Keep `null`; UI says unavailable and does not filter programs by budget |
| Program-level admission method mapping | Method descriptions exist but source IDs cannot be populated with the shared `DataSource` schema (no source ID field) | Keep `needs_review`; do not present as confirmed |
| Historical cutoffs | 9 records verified from previously identified official announcements; 27 numeric placeholders are simulated | Every simulated row has `status: simulated` and an explicit warning in `notes` |
| 2026 cutoffs | Not included in historical dataset | Do not infer or invent 2026 cutoffs |
| Source coverage | A source URL can be contextual and may not substantiate every program-specific claim | Check the exact claim and applicable year before upgrading status |
| Admission prediction | No validated model or complete comparable cutoff history | The entered score is not used to estimate admission chances |

## Release checklist
- [x] JSON files parse and use the agreed field names.
- [x] Simulated cutoff rows are explicitly labeled.
- [x] Unknown tuition values remain null.
- [ ] Confirm every official source URL and claim manually.
- [ ] Confirm labels and links in a live browser after CI/build.
- [ ] Replace or remove simulated values before any real admissions guidance.

**Important:** This is a demo dataset, not a complete or authoritative admissions database. Do not use simulated values for actual application decisions.
