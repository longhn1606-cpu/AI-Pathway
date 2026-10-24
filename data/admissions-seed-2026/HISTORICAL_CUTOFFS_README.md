# Historical admission cutoffs (2023–2025)

File: `historical_cutoffs.json`

## Purpose and safety
This file supports a clickable/demo prototype only. Every record is explicitly labeled by status. **Simulated scores are invented test data, not official admissions cutoffs.** They must not be presented as real or used for actual admissions guidance.

## Revised demo selection
- DUT: uses **Công nghệ thông tin (7480201)** and **Kỹ thuật máy tính (7480106)**.
- HCMUT: uses **Khoa học Máy tính (admission code 106)** and **Kỹ thuật Máy tính (admission code 107)**. The former broad group code 108 was removed from the demo program list.
- HUST: retains IT1 and EE2.
- Internal program IDs are project identifiers, not official admissions codes.

## Data status
- 36 rows cover six demo programs across 2023–2025.
- 9 numeric cutoffs are marked `verified` from previously identified official university announcements.
- 27 numeric values are marked `simulated` and are present only so the demo UI can show populated charts/tables.
- No rows are null in this demo-ready version. If a record needs to represent unknown real-world data, revert it to `cutoffScore: null` and `status: needs_review`.
- For every simulated record, the linked official page is contextual only and **does not substantiate the simulated number**. The notes repeat this warning per record.

## Verified values currently included
- HUST IT1 (Computer Science): 2023 high-school exam 29.42/30; 2023 competency assessment/TSA 83.90/100; 2024 high-school exam 28.53/30; 2024 TSA 83.82/100; 2025 high-school exam 29.19/30.
- HUST EE2 (Control and Automation): 2023 high-school exam 27.57/30; 2023 TSA 72.23/100; 2025 high-school exam 28.48/30.
- DUT Kỹ thuật máy tính (7480106): 2024 high-school exam 25.82/30.

## Official reference URLs
- HUST 2023: https://ts.hust.edu.vn/vi/tin-tuc/diem-chuan-trung-tuyen-dai-hoc-he-chinh-quy-nam-2023
- HUST 2024: https://ts.hust.edu.vn/vi/tin-tuc/diem-chuan-dai-hoc-bach-khoa-ha-noi-2024-diem-thi-dgtd-cao-nhat-83-82-diem-thi-tot-nghiep-thpt-cao-nhat-28-53
- HUST 2025: https://ts.hust.edu.vn/en/tin-tuc/diem-chuan-cao-nhat-dh-bach-khoa-ha-noi-2025-29-39-diem-thpt-tuong-duong-93-96-diem-xttn-va-86-97-diem-tsa
- DUT 2024: https://dut.udn.vn/Tintuc/Tintuc/id/9602
- HCMUT 2023 program code reference: https://fme.hcmut.edu.vn/thong-tin-tuyen-sinh-dai-hoc-chinh-quy-2023-truong-dai-hoc-bach-khoa.html
- HCMUT holistic cutoff 2024: https://fme.hcmut.edu.vn/cong-bo-diem-chuan-cua-phuong-thuc-xet-tuyen-tong-hop-nam-2024.html
- HCMUT holistic cutoff 2025: https://fme.hcmut.edu.vn/cong-bo-diem-chuan-cua-phuong-thuc-xet-tuyen-tong-hop-nam-2025.html

## Policy
Only compare cutoffs when university, program, year, admission method, and score scale match. A null score means unknown, not zero. A `simulated` score is a clearly labeled placeholder and never a real cutoff.
