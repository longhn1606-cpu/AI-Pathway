# Bàn giao — Thành viên 4: So sánh quy định & giải thích

Ngày: 24/10/2026. Module đã đưa vào repo thật `longhn1606-cpu/ai-pathway`, nhánh `feature/member-4-rule-comparison` (chưa merge).

## 1. Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| `compareRules` (added / removed / modified, null, lồng nhau, mảng như tập hợp) | IMPLEMENTED + TESTED |
| Xác định đối tượng liên quan (chỉ theo `institutionId` / `programId`) | IMPLEMENTED + TESTED |
| `explainRulesTemplate` (4 nội dung bắt buộc, không cần API) | IMPLEMENTED + TESTED |
| `explainRules` với provider AI: timeout, lỗi, kiểm tra căn cứ, tự rơi về template | IMPLEMENTED + TESTED (bằng provider giả lập) |
| Nạp/kiểm tra dữ liệu `parseRuleVersions`, luồng `analyzeRuleChange` | IMPLEMENTED + TESTED |
| Dữ liệu `admissionRules.json` | **simulated** — chưa có dữ liệu chính thức |
| Gọi AI thật (backend/proxy giữ API key) | **PENDING** — chưa tồn tại, không có API key |
| Giao diện | **PENDING** — thuộc Thành viên 2 |
| Branch, commit, push, PR | xem báo cáo cuối phiên |

Kết quả chạy thực tế (25/10/2026): typecheck module với đúng tùy chọn của `tsconfig.app.json` exit 0; 95 passed, 0 failed, 0 skipped. **Chưa chạy được `npm run build` đầy đủ** (không cài được dependency trong môi trường này); CI trên GitHub sẽ chạy.
Đã kiểm tra độ nhạy: 8 lỗi cố ý trên bản sao đều làm test đỏ.

## 2. File (đã tích hợp vào repo, nhánh `feature/member-4-rule-comparison`)

```
src/data/admissionRules.json     2 phiên bản GIẢ LẬP (simulated), không URL, không ngày kiểm tra
src/logic/ruleTypes.ts           Type riêng của module; import DataStatus/AdmissionMethod từ src/types (không sửa schema chung)
src/logic/compareRules.ts        compareRules(oldRule, newRule, options?)
src/logic/explainRules.ts        explainRulesTemplate, explainRules (AI + fallback), validateAiNarrative
src/logic/ruleVersions.ts        parseRuleVersions, loadBundledRuleVersions, analyzeRuleChange
tests/rule-comparison/*.test.ts  95 test (+ fixtures.ts)
docs/MEMBER4_HANDOFF.md          tài liệu này
```

Không sửa file nào có sẵn trong repo (không đụng `package.json`, `tsconfig*`, `src/types`, `App.tsx`, workflow CI).
Test đặt ngoài `src/` vì `tsc -b` biên dịch toàn bộ `src/` và repo chưa có `@types/node`.
Không tạo `RuleComparison.tsx`: thuộc Thành viên 2.

## 3. Chạy test và tích hợp

```
npx tsx --test --test-reporter=spec tests/rule-comparison/*.test.ts
```

(`tsx` chưa là devDependency; Thành viên 5 quyết định thêm `tsx`/`@types/node` + script + bước CI, hoặc chuyển test sang Vitest bằng cách đổi `node:test`/`assert` sang `vitest`/`expect`.)

Schema thật có `AdmissionMethod` gồm cả `direct_admission`, `other`: nhãn của module đã bổ sung. `DataSource` của schema chung có `url: string` bắt buộc nên không biểu diễn được dữ liệu giả lập không URL; vì vậy module giữ `RuleSource` riêng theo hợp đồng nội bộ.

Dữ liệu thật hiện có (`data/admissions-seed-2026`) chỉ có phương thức năm 2026, tất cả `needs_review`: chưa có cặp phiên bản quy định thật nào để so sánh.

### Gợi ý dùng cho giao diện (Thành viên 2) — đề xuất, chưa chạy trong UI

```ts
import { loadBundledRuleVersions, analyzeRuleChange } from './logic/ruleVersions'

const { versions, errors } = loadBundledRuleVersions()          // versions để đổ vào hai ô chọn
const result = await analyzeRuleChange(versions, oldId, newId)  // tham số thứ 4 { provider?, timeoutMs? } là tùy chọn
if (result.ok) {
  const e = result.explanation
  // e.banners          → hiển thị nổi bật trước tiên (giả lập / cần kiểm tra)
  // e.changeRows       → bảng thay đổi (fieldLabel, changeTypeLabel, oldText, newText)
  // e.sections         → 4 phần: whatChanged, affected, nextChecks, insufficientData
  // e.sourceLines      → nguồn, năm, trạng thái của hai phiên bản
  // e.generatedBy      → 'template' | 'ai' — PHẢI hiển thị để người dùng biết
  // e.fallbackReason   → null | 'not_configured' | 'provider_error' | 'timeout' | 'invalid_output'
  // e.narrative        → chỉ có khi generatedBy === 'ai'
} else {
  // result.error
}
```

## 4. Quy ước ngữ nghĩa (đã có test)

- Trường **vắng mặt** (hoặc `undefined`) ≠ `null`. Vắng→có = `added`, có→vắng = `removed`. `null` = "chưa có dữ liệu"; `null`→25 là `modified`; `0` ≠ `null`. Không bao giờ hiển thị `null` thành 0.
- Mảng so như **tập hợp** (đổi thứ tự/trùng phần tử không phải thay đổi). Trường nhạy thứ tự khai báo qua `compareRules(a, b, { orderSensitiveFields: [...] })`.
- Đối tượng liên quan chỉ xác định khi cùng `institutionId` **và** cùng `programId` (không null). Còn lại → `affectedStatus = 'undetermined'` kèm lý do; không bao giờ suy ra "toàn trường" hay theo tên gần giống.
- Trạng thái tổng hợp = trạng thái **yếu nhất** của hai phiên bản (`simulated` < `needs_review` < `verified`); không tự nâng cấp.
- Không tự quy đổi điểm: khác phương thức hoặc khác/thiếu `scoreScale` → ghi vào `limitations`, không kết luận tăng/giảm.
- Dữ liệu đầu vào không có ngày hiệu lực → luôn có giới hạn "không kết luận quy định mới đã/đang có hiệu lực".
- AI chỉ được chấp nhận khi qua `validateAiNarrative`: không số/URL ngoài đầu vào, không cam kết đỗ/đủ điều kiện, có nhãn "giả lập" hoặc nhắc kiểm tra khi cần. Không đạt → dùng template, ghi `generatedBy = 'template'`.

## 5. Còn tồn tại / cần thống nhất

2. **Dữ liệu thật** (Thành viên 1): `admissionRules.json` hiện chỉ là kịch bản giả lập; năm 2025/2026 trong đó cũng là giả lập. Khi có hai văn bản chính thức cùng chương trình khác năm, thay bản ghi (giữ đúng 6 trường của `source`; `url`/`checkedAt` chỉ điền khi có thật).
3. **Khóa điều kiện**: `RuleConditions` định kiểu các khóa `minimumScore`, `scoreScale`, `subjectCombination`, `interviewRequired`, `foreignLanguageCertificateRequired`, `notes`. Nếu schema/dữ liệu của Thành viên 1 dùng tên khác, báo lại — khóa lạ vẫn so sánh được nhưng chưa có nhãn tiếng Việt (`fieldLabel` trong `ruleTypes.ts`).
4. **AI thật**: cần một endpoint backend/proxy giữ API key và một `ExplanationProvider` gọi endpoint đó. Chưa làm; theo kế hoạch, chỉ làm khi luồng template đã ổn định.
5. **CI**: workflow hiện chưa chạy test của module này (đề xuất ở mục 3).

## 6. Nói về AI khi trình diễn (Ngày 5)

- Phép so sánh, xác định đối tượng liên quan và các cảnh báo do **logic xác định, có test** thực hiện; kết quả tái lập được.
- AI (nếu bật) chỉ diễn đạt lại kết quả đó; mọi văn bản AI phải qua kiểm tra căn cứ, không đạt thì hệ thống dùng template và nói rõ.
- Thiếu dữ liệu thì hiện "chưa xác định/chưa đủ dữ liệu", không đoán. Demo hiện dùng dữ liệu **giả lập** và luôn có nhãn nổi bật.
