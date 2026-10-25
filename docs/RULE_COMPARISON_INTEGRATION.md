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


## Trạng thái phối hợp frontend — cập nhật 2026-10-25

PR #7 (`feat/system-integration`) là nhánh tích hợp chính do Member 5 điều phối.
Tại head `05a55f3cebb34843dc6c16539efab7d0fe655a62`, các yêu cầu tích hợp
đã được phản ánh trong diff:

- Service `integratedRuleComparisonService` gọi public facade
  `compareAndExplainRules`; không sao chép thuật toán so sánh.
- Adapter runtime kiểm tra collection, ID trùng, metadata trường/ngành,
  source URL/protocol, năm/ngày, trạng thái dữ liệu, admission method,
  conditions đệ quy và toàn bộ tuition fields/ranges.
- Fixture JSON được nhận dưới dạng `unknown`, validate trước khi đưa vào
  selectors/service; không ép kiểu fixture trước validation.
- Panel hiển thị `whatChanged`, `tuitionImpact`, `nextSteps`, chương trình
  có thể bị ảnh hưởng, nguồn, unknowns và limitations.
- Null học phí được giữ là unknown; dữ liệu simulated/needs_review hoặc thiếu
  provenance không được nâng thành verified.
- CI `Demo data and app checks` trên head này đã thành công
  (run `40189002900`). Workflow `System integration checks` (run
  `40189002915`) thất bại ở browser E2E: assertion tại
  `tests/e2e-frontend.mjs:67` không tìm thấy wording
  `Chưa có snapshot học phí`. Build và unit/integration tests đã pass; cần
  Member 5/2 đồng bộ wording UI với assertion hoặc cập nhật assertion theo
  output đúng, sau đó chạy lại E2E. CI chỉ xác nhận kỹ thuật, không xác minh
  tính đúng hoặc hiệu lực pháp lý của dữ liệu tuyển sinh.

### Việc còn lại theo phân công

- **Member 5:** theo dõi kết quả workflow `System integration checks`, xử lý
  lỗi nếu có và chốt đồng bộ dependency từ PR #1/#3/#4.
- **Member 2:** review vị trí, wording, khả năng đọc và luồng thao tác của
  `RuleComparisonPanel`; xác nhận presentation trên nhánh tích hợp.
- **Member 1 / nhóm dữ liệu:** cung cấp hai snapshot quy định thực tế có nguồn,
  năm áp dụng và ngày kiểm tra rõ ràng. Fixture hiện tại vẫn là simulated,
  không thể dùng để xác nhận độ chính xác nghiệp vụ.
- **Member 4:** tiếp tục review kết quả giải thích trên snapshot thực tế khi
  dữ liệu có provenance được bàn giao; không tự tạo dữ liệu tuyển sinh chính thức.

PR #8 vẫn là nhánh tích hợp UI riêng có phạm vi giao nhau; không merge song song
với PR #7. PR #3 tiếp tục là nguồn logic gốc của Member 4 và vẫn ở trạng thái
Draft; không merge nếu chưa có yêu cầu rõ ràng và chưa hoàn tất review chung.


## Contract nghiệp vụ đã chốt — 2026-10-25

### Input và output

- `AdmissionRuleVersion`: một snapshot độc lập, có ID, institution/program identity,
  phương thức, conditions, source metadata và trạng thái dữ liệu.
- `RuleComparisonInput`: cặp `before` / `after` của hai snapshot.
- `RuleComparisonResult`: facade trả về `comparison` và `explanation`.
- `RuleChange` / `ChangedField`: mỗi khác biệt có `field`, `changeType`,
  `oldValue`, `newValue`; giá trị null khác với trường bị thiếu.
- `affectedUniversities`: chỉ có institutionId khi hai snapshot cùng trường.
- `affectedMajors` (và alias tương thích `affectedPrograms`): chỉ có programId
  khi cả institutionId và programId cùng khớp.

### Quy tắc so sánh an toàn

1. So sánh điều kiện tuyển sinh/học phí chỉ khi hai snapshot có cùng
   `institutionId` và cùng `programId` (hai giá trị programId null được hiểu
   là cùng phạm vi cấp trường). Nếu identity khác, chỉ báo cáo thay đổi định danh;
   không so sánh điều kiện giữa hai trường/ngành khác nhau.
2. Các mảng `conditions.combinations` và
   `conditions.subjectCombinations` được xem là tập hợp; đổi thứ tự không phải
   thay đổi. Các đường dẫn khác giữ nguyên thứ tự trừ khi caller cấu hình thêm.
3. Điều kiện, chỉ tiêu, công thức/thang điểm được so sánh đệ quy khi có trong cả
   snapshot. Engine không tự tạo trường hoặc suy diễn giá trị không được cung cấp.
4. `null` và trường vắng mặt là hai trạng thái khác nhau. Thiếu snapshot học phí
   không đồng nghĩa học phí bằng 0 hoặc không thay đổi.
5. Explanation lấy trực tiếp `changes`, ID ảnh hưởng, nguồn và limitations từ
   kết quả comparison. Mức độ ảnh hưởng là nhãn ưu tiên rà soát, không phải dự báo
   trúng tuyển hoặc kết luận pháp lý.

### Trạng thái nguồn

- `verified`: được đánh dấu đã xác minh trong dữ liệu đầu vào; engine không tự
  kiểm chứng tính pháp lý của URL hoặc văn bản.
- `needs_review`: còn cần rà soát; không được trình bày như dữ liệu xác nhận.
- `simulated`: dữ liệu minh họa; kết quả phải nêu rõ không phải quy định chính thức.
- Năm áp dụng, URL nguồn và trạng thái từng snapshot luôn được công khai trong
  `sourceDisclosure`; thiếu nguồn/năm làm impact thành `requires_review`.

### Giới hạn

Engine hiện là bộ so sánh deterministic theo cấu trúc dữ liệu, không trích xuất
văn bản pháp luật, không tự tìm nguồn, không xác thực chữ ký/hiệu lực văn bản và
không tính xác suất trúng tuyển. Các trường chỉ tiêu/cách tính điểm chỉ được phát
hiện nếu adapter cung cấp chúng dưới `conditions` với cùng schema/path ở cả hai
snapshot. Demo scenarios hiện vẫn là simulated.
