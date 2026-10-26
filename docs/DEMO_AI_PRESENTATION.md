# Kịch bản thuyết trình demo AI Pathway

## Mục tiêu trình diễn

Cho người xem thấy AI Pathway hỗ trợ học sinh đi từ hồ sơ cá nhân đến một danh sách lựa chọn có lý do, nguồn tham khảo và giới hạn rõ ràng. Sản phẩm hỗ trợ ra quyết định; không quyết định thay học sinh và không dự đoán chắc chắn đỗ/trượt.

## Kịch bản thao tác trực tiếp (3–5 phút)

### 1. Mở đầu — vấn đề (20–30 giây)

> Học sinh thường phải tự tổng hợp điểm, sở thích, khu vực, học phí và thông tin tuyển sinh từ nhiều nơi. AI Pathway gom các tiêu chí đó vào một luồng khám phá để giúp các bạn bắt đầu có hệ thống hơn.

### 2. Nhập hồ sơ mẫu (45–60 giây)

Dùng hồ sơ demo sau:
- Điểm dự kiến: **24.5/30**
- Nhóm ngành: **Công nghệ và kỹ thuật**
- Khu vực: **Toàn quốc**
- Ngân sách: **Linh hoạt / cần tư vấn**
- Phương thức xét tuyển: chọn **Thi tốt nghiệp THPT** (có thể để các phương thức khác trống)
- Từ khóa: để trống để không thu hẹp kết quả ngoài dự kiến.

Nhấn **“Khám phá lựa chọn”**. Nếu số lượng kết quả khác dự kiến, hãy dùng kết quả thực tế đang hiển thị; không khẳng định trước rằng một trường/ngành cụ thể chắc chắn sẽ xuất hiện.

### 3. Giải thích khu vực gợi ý (60–90 giây)

Tại mục **“Vì sao hệ thống gợi ý những lựa chọn này?”**, giải thích theo ba lớp:
1. **Hồ sơ:** hệ thống đọc các tiêu chí học sinh vừa cung cấp.
2. **Đối chiếu:** recommendation engine lọc/xếp các chương trình theo dữ liệu và quy tắc hiện có; mỗi thẻ hiển thị lý do gợi ý và các lưu ý.
3. **Kiểm chứng:** người xem có thể mở nguồn tham khảo và kiểm tra trạng thái dữ liệu. Thiếu dữ liệu không được coi là bằng chứng tích cực hay tiêu cực.

Mở phần **“AI đang làm gì trong bản demo này?”** để nói rõ phạm vi kỹ thuật hiện tại.

### 4. Trình diễn mô phỏng (30–45 giây, tùy chọn)

Nhấn **“Mô phỏng +1 điểm”** khi nút đang khả dụng. So sánh số lượng gợi ý trước/sau và giải thích đây là kịch bản giả định để quan sát độ nhạy của kết quả, không phải dự báo tuyển sinh.

### 5. So sánh quy định và kết thúc (45–60 giây)

Cuộn đến **“So sánh thay đổi quy định tuyển sinh”**. Mở một vài mục chi tiết, chẳng hạn điểm thay đổi hoặc nguồn dữ liệu. Nhấn mạnh nhãn `simulated` nghĩa là kịch bản minh họa, không phải quy định tuyển sinh chính thức đã xác minh.

> Kết luận: AI Pathway giúp người học cấu trúc hồ sơ, khám phá lựa chọn, hiểu lý do gợi ý và biết bước tiếp theo cần kiểm tra. Học sinh vẫn là người quyết định cuối cùng.

## Cách mô tả AI chính xác

**Nên nói**
- “Bản demo đang dùng recommendation engine chạy trong ứng dụng để đối chiếu hồ sơ với dữ liệu chương trình.”
- “Hệ thống giải thích các lý do gợi ý và cho phép kiểm tra nguồn/trạng thái dữ liệu.”
- “Thiết kế này là nền tảng để tích hợp mô hình AI tạo sinh qua backend trong giai đoạn sau.”

**Không nên nói**
- “ChatGPT/LLM đang tạo ra các gợi ý trực tiếp” — chưa xác nhận ứng dụng gọi mô hình ngôn ngữ qua API.
- “AI dự đoán chính xác khả năng đỗ” — tính năng này không được hỗ trợ.
- “Tất cả điểm chuẩn/học phí đều chính thức” — dữ liệu có trạng thái khác nhau; phải xem từng bản ghi.

## Phân vai nhóm (gợi ý)

- **Thành viên 1 — Bối cảnh và dữ liệu:** nêu vấn đề, giới thiệu dữ liệu tham khảo và vì sao cần kiểm tra nguồn.
- **Thành viên 2 — Frontend:** thao tác nhập hồ sơ, chỉ ra nút khám phá và khu vực giải thích mới.
- **Thành viên 3 — Logic gợi ý:** giải thích cách các tiêu chí hồ sơ được dùng để lọc/xếp lựa chọn; nhấn mạnh đây là engine quy tắc trong bản demo.
- **Thành viên 4 — Quy định và giới hạn dữ liệu:** mở bảng so sánh, giải thích trạng thái `simulated` và `needs_review`.
- **Người thuyết trình chính:** kết nối các phần, nhấn mạnh lợi ích với học sinh và giới hạn của demo.

Nếu nhóm ít người, có thể gộp vai 1+4 hoặc 2+3.

## Checklist trước giờ trình bày

- [ ] Mở website và thử luồng hồ sơ từ đầu đến cuối.
- [ ] Dùng hồ sơ mẫu trên; kiểm tra trước số kết quả thực tế.
- [ ] Mở ít nhất một lý do gợi ý và một nguồn tham khảo.
- [ ] Thử nút mô phỏng nếu khả dụng.
- [ ] Mở một mục so sánh quy định; nói rõ dữ liệu mô phỏng.
- [ ] Kiểm tra trên điện thoại và laptop; giữ zoom trình duyệt dễ đọc.
- [ ] Có ảnh chụp màn hình dự phòng nếu mạng hoặc website gặp sự cố.
- [ ] Không nhập thông tin cá nhân thật của học sinh trong buổi demo.

## Câu trả lời ngắn nếu hội đồng hỏi “AI nằm ở đâu?”

“AI Pathway hiện thể hiện phần hỗ trợ thông minh ở luồng phân tích hồ sơ và giải thích gợi ý. Ở phiên bản demo này, phần tính toán là recommendation engine nội bộ dựa trên quy tắc và dữ liệu; chúng em chưa tuyên bố đã tích hợp mô hình ngôn ngữ qua API. Bước phát triển tiếp theo là đưa lớp AI tạo sinh vào backend để diễn giải kết quả có căn cứ, đồng thời giữ kiểm soát nguồn dữ liệu và giới hạn.”
