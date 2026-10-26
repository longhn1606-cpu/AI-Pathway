# Member 4 — So sánh quy định và giải thích thay đổi

## Phạm vi demo

Module nhận hai snapshot quy định đã được chuẩn hóa; không tự thu thập hoặc diễn giải văn bản pháp luật. Kết quả so sánh bao gồm:
- Trường được thêm, xóa hoặc sửa, kể cả object lồng nhau.
- Định danh trường/ngành, phương thức xét tuyển và metadata nguồn (phiên bản, năm áp dụng, URL, ngày kiểm tra, trạng thái).
- Chương trình chỉ được đánh dấu liên quan khi cả `institutionId` và `programId` khớp.
- Snapshot học phí nếu bên cung cấp dữ liệu có; so sánh khoảng thấp/cao, năm áp dụng, trạng thái và URL nguồn.

## Cách gọi

```ts
const comparison = compareRules(previousRule, currentRule)
const explanation = explainRules(comparison)
```

`explanation` trả về `whatChanged`, `potentiallyAffected`, `tuitionImpact`, `nextSteps`, `unknowns`, `sourceDisclosure` và `limitations`.

## Hợp đồng học phí

Trường `tuition` là tùy chọn và có cấu trúc:
- `minVndPerYear`, `maxVndPerYear`: số tiền VND/năm hoặc `null`.
- `appliedYear`: năm áp dụng hoặc `null`.
- `dataStatus`: `verified`, `needs_review`, hoặc `simulated`.
- `sourceUrl`: URL nguồn hoặc `null`.

Không có snapshot học phí không đồng nghĩa học phí không đổi. Giá trị `null` không phải 0 và module không tự ước tính học phí. Trạng thái `simulated` hoặc `needs_review` phải được hiển thị rõ.

## Giới hạn

- Giải thích hiện dùng template xác định, không gọi LLM/API.
- So sánh dữ liệu không xác minh hiệu lực pháp lý, tính đúng của URL hay toàn bộ nội dung văn bản.
- Không dự đoán khả năng trúng tuyển hoặc đưa ra kết luận tuyển sinh.
- Fixture trong `data/admission-rule-comparison/demo-rules.json` là mô phỏng; học phí đang để null vì bộ dữ liệu demo hiện không có mức học phí đã xác minh.

## Kiểm thử

Chạy `npm run test:rule-comparison`. Workflow `Demo data and app checks` lặp lại bộ regression này 20 lần, đồng thời build, smoke-test preview và kiểm tra dataset.
