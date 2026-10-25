# Member 4 — Tích hợp và bộ kịch bản demo

## Public module contract

Import module từ một entry point ổn định:

```ts
import { compareRules, explainRules } from './logic/ruleComparison'
import type { AdmissionRuleVersion, RuleComparison, RuleExplanation } from './logic/ruleComparison'

const comparison: RuleComparison = compareRules(previousSnapshot, currentSnapshot)
const explanation: RuleExplanation = explainRules(comparison)
```

Frontend nhận hai object thuần và có thể hiển thị:
- `changes`: danh sách trường thêm, xóa, sửa.
- `affectedPrograms`: chỉ có ID khi institutionId và programId khớp.
- `evidence`, `sources`, `limitations`: bằng chứng, nguồn và giới hạn.
- `impactLevel`: `high`, `medium`, `low` hoặc `requires_review`.
- `impactAssessment`: diễn giải thận trọng cho người dùng.
- `whatChanged`, `potentiallyAffected`, `tuitionImpact`, `nextSteps`, `unknowns`.

## Kết nối frontend service port (PR #5)

PR #3 cung cấp facade `compareAndExplainRules(before, after)`, trả về đồng thời
`comparison` (dữ liệu có cấu trúc) và `explanation` (nội dung hiển thị).
Facade này tương thích với `RuleComparisonPort<Input, Output>` của PR #5:

```ts
import { createRuleService } from '../../services/ruleService'
import {
  compareAndExplainRules,
  type AdmissionRuleVersion,
  type RuleComparisonResult,
} from '../logic/ruleComparison'

const ruleService = createRuleService<AdmissionRuleVersion, RuleComparisonResult>({
  compare: compareAndExplainRules,
})

const result = ruleService.compare(previousSnapshot, currentSnapshot)
// result.comparison.changes
// result.explanation.impactLevel
// result.explanation.whatChanged
```

Trước khi gọi facade, caller phải chuyển từng snapshot sang
`AdmissionRuleVersion` bằng adapter tương ứng; không truyền một
`UniversityProgram` hiện tại làm cả hai phiên bản. Giữ nguyên provenance,
`dataStatus` và các giá trị tuition null khi tạo snapshot. Không nâng
`simulated` hoặc `needs_review` thành `verified`.

## Cách hiểu impactLevel

- `requires_review`: dữ liệu không verified hoặc thiếu URL/năm áp dụng. Không kết luận mức ảnh hưởng.
- `high`: có thay đổi ở phương thức hoặc tiêu chí cốt lõi (ví dụ điểm tối thiểu, thang điểm, điều kiện bắt buộc) và nguồn/năm đều verified.
- `medium`: thay đổi tổ hợp, ưu tiên, học phí hoặc điều kiện khác cần người học kiểm tra.
- `low`: chỉ thay đổi metadata hoặc không phát hiện khác biệt trong các trường đã so sánh.

Đây là mức ưu tiên rà soát theo loại trường dữ liệu, không phải đánh giá pháp lý hay kết luận một học sinh cụ thể đủ/không đủ điều kiện.

## Kịch bản demo

`data/admission-rule-comparison/demo-scenarios.json` có 7 kịch bản: thay đổi phương thức, tổ hợp môn, điểm tối thiểu, ưu tiên, học phí, không thay đổi và thiếu nguồn/năm. Tất cả đều gắn nhãn simulated, không có URL chính thức và không được dùng như dữ liệu tuyển sinh thật.

## Schema chung và adapter

Schema canonical hiện có `UniversityProgram` và `DataSource`; module so sánh dùng snapshot riêng để biểu diễn hai phiên bản theo thời gian. Không ép kiểu hoặc tự suy luận rằng một `UniversityProgram` đơn lẻ là hai phiên bản quy định. Khi PR #4 (adapter schema) được tích hợp, cần review mapping rõ ràng cho từng snapshot, đặc biệt `sourceIds`, `applicableYear`, `status` và tuition nullability. Không tự điền ID nguồn còn thiếu.

PR #5 của frontend đang chuẩn bị service ports; frontend chỉ nên gọi public contract sau khi hai phía thống nhất mapping. PR này không sửa frontend hoặc thay đổi schema chung.

## Kiểm thử

Chạy `npm run test:rule-comparison`. CI chạy bộ này 20 lần. Bộ kiểm thử bao gồm regression cũ, 7 kịch bản demo và phân loại mức độ ảnh hưởng. Chạy `npm run build` để kiểm tra TypeScript/Vite.


## Trạng thái phối hợp frontend — 2026-10-25

Member 5 đã tích hợp public facade `compareAndExplainRules` vào service và panel trên PR #7
(`feat/system-integration`). Member 4 đã rà soát contract ở PR #7:

- Đúng: hai `AdmissionRuleVersion` độc lập, ID khác nhau; không tạo lịch sử từ
  `UniversityProgram` hiện tại; fixture demo giữ nhãn `simulated`; trạng thái
  thiếu nguồn/năm dẫn tới `requires_review`; null học phí vẫn là unknown.
- CI của PR #7 trên head `b5360e9` đã pass build, unit/integration tests và
  Playwright E2E. Đây chỉ là xác nhận kỹ thuật, không xác minh tính đúng của dữ liệu.
- Còn yêu cầu hoàn tất: tăng cường runtime validation trong
  `toAdmissionRuleVersionPair` cho toàn bộ metadata/source/tuition; không ép kiểu
  JSON fixture trước khi validate; hiển thị thêm `whatChanged`, `tuitionImpact`
  và `nextSteps` trong panel.
- Member 2 cần xác nhận presentation/placement của panel trên PR #7.

PR #8 là nhánh tích hợp frontend riêng có phần giao nhau với PR #7; không merge
song song hai nhánh UI này. PR #7 đang được đề xuất làm nhánh tích hợp chính.
PR #3 vẫn là module logic gốc của Member 4 và tiếp tục ở trạng thái Draft.

