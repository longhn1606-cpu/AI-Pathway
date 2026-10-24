# Historical admission cutoffs (2023–2025)

File: `historical_cutoffs.json`

## Data status
- 36 rows cover the six demo programs across 2023–2025.
- 8 numeric cutoffs are marked `verified`, currently from official Hanoi University of Science and Technology (HUST) announcements.
- 28 rows remain `needs_review` with `cutoffScore: null`. These are explicit gaps, not zero scores and not claims that no cutoff existed.

## Verified values currently included
- HUST IT1 (Computer Science): 2023 high-school exam 29.42/30; 2023 TSA 83.90/100; 2024 high-school exam 28.53/30; 2024 TSA 83.82/100; 2025 high-school exam 29.19/30.
- HUST EE2 (Control and Automation): 2023 high-school exam 27.57/30; 2023 TSA 72.23/100; 2025 high-school exam 28.48/30.

Official HUST sources:
- 2023: https://ts.hust.edu.vn/vi/tin-tuc/diem-chuan-trung-tuyen-dai-hoc-he-chinh-quy-nam-2023
- 2024: https://ts.hust.edu.vn/vi/tin-tuc/diem-chuan-dai-hoc-bach-khoa-ha-noi-2024-diem-thi-dgtd-cao-nhat-83-82-diem-thi-tot-nghiep-thpt-cao-nhat-28-53
- 2025: https://ts.hust.edu.vn/en/tin-tuc/diem-chuan-cao-nhat-dh-bach-khoa-ha-noi-2025-29-39-diem-thpt-tuong-duong-93-96-diem-xttn-va-86-97-diem-tsa

## Why many values are null
- DUT historical result pages and HCMUT's composite-admission result portal need further row-by-row verification for each program, year, method, and scale.
- HCMUT's composite admission is a multi-factor score; a university-wide range or a different program's cutoff must not be copied into an individual program record.
- A cutoff is recorded only when the official evidence supports the exact program/year/method/scale combination.

## Usage guidance
- Filter by `programId`, `year`, and `method`.
- Compare only records with matching scales and equivalent admission methods.
- Do not use historical cutoffs as guarantees of admission.
- The existing `UniversityProgram.historicalCutoff` field is not sufficient for multi-year/multi-method history; this separate file preserves the dimensions without overwriting the current schema.

Last checked: 2026-10-24.
