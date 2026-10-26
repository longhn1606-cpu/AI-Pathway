# AI Pathway

**AI Pathway** là bản demo hỗ trợ học sinh khám phá các chương trình đại học phù hợp với định hướng, khu vực và thông tin hồ sơ ban đầu. Dự án tập trung vào việc trình bày dữ liệu tuyển sinh có nguồn tham khảo và thể hiện rõ những thông tin còn cần xác minh.

> **Lưu ý:** Đây là bản demo, không phải hệ thống tư vấn tuyển sinh chính thức và không thay thế đề án tuyển sinh của trường. Hãy mở nguồn chính thức để kiểm tra thông tin trước khi đưa ra quyết định.

## Tính năng trong bản demo

- Nhập hồ sơ cơ bản: điểm dự kiến, nhóm quan tâm, khu vực, ngân sách tham khảo và từ khóa.
- Lọc danh sách chương trình từ bộ dữ liệu được lưu trong repository theo các tiêu chí giao diện hỗ trợ.
- Xem trường, chương trình, phương thức tuyển sinh, nguồn tham khảo và trạng thái dữ liệu.
- Hiển thị các trạng thái dữ liệu riêng biệt: `verified` (đã xác minh), `needs_review` (cần xác minh) và `simulated` (mô phỏng), khi có trong dữ liệu.

Một số tiêu chí, chẳng hạn ngân sách, có thể chỉ đóng vai trò thông tin tham khảo trong bản demo; không nên hiểu kết quả hiển thị là cam kết về khả năng chi trả hoặc khả năng trúng tuyển.

## Công nghệ

- React 19
- TypeScript
- Vite 6

Ứng dụng hiện là frontend sử dụng dữ liệu JSON cục bộ. README này không giả định có backend hoặc API triển khai riêng.

## Yêu cầu

- Node.js phiên bản tương thích với Vite 6
- npm

## Chạy ứng dụng tại máy

1. Clone repository và vào thư mục dự án:

   ```bash
   git clone https://github.com/longhn1606-cpu/AI-Pathway.git
   cd AI-Pathway
   ```

2. Cài đặt dependencies:

   ```bash
   npm install
   ```

3. Khởi động máy chủ phát triển:

   ```bash
   npm run dev
   ```

4. Mở địa chỉ local mà Vite hiển thị trong terminal.

## Kiểm tra bản build

```bash
npm run build
npm run preview
```

- `npm run build`: kiểm tra TypeScript và tạo bản build production.
- `npm run preview`: chạy thử bản build production tại máy.

## Dữ liệu và độ tin cậy

Dữ liệu demo nằm trong `data/admissions-seed-2026/`, bao gồm thông tin trường, chương trình và dữ liệu điểm chuẩn lịch sử. Mỗi bản ghi có thể chứa nguồn, năm áp dụng và trạng thái dữ liệu.

- Không coi trường dữ liệu còn thiếu là giá trị bằng 0.
- Không diễn giải dữ liệu `needs_review` hoặc `simulated` thành thông tin chính thức.
- Nguồn được liệt kê là điểm bắt đầu để kiểm tra; người dùng cần xác nhận nội dung, năm áp dụng và tính cập nhật trên trang chính thức.
- Dữ liệu điểm chuẩn lịch sử có thể chưa đầy đủ. Khi chưa có dữ liệu phù hợp, không nên suy ra điểm chuẩn.
- Ngân sách nhập vào không đồng nghĩa học phí đã được xác minh hoặc chương trình chắc chắn phù hợp về tài chính.

## Cấu trúc thư mục chính

```text
.
├── data/
│   └── admissions-seed-2026/   # Dữ liệu tuyển sinh demo dạng JSON
├── src/
│   ├── App.tsx                 # Giao diện và luồng tương tác chính
│   ├── index.css               # Kiểu dáng giao diện
│   ├── main.tsx                # Điểm khởi chạy React
│   └── types/                  # Kiểu dữ liệu dùng chung
├── index.html
├── package.json
└── README.md
```

## Phạm vi và giới hạn

- Đây là bản demo phục vụ trình diễn và đánh giá luồng giao diện.
- Kết quả lọc không phải dự báo xác suất trúng tuyển.
- Không dùng dữ liệu demo để thay thế thông báo tuyển sinh, học phí hoặc điểm chuẩn chính thức của trường.
- Các chức năng phụ thuộc dữ liệu xác minh hoặc dịch vụ phía máy chủ chỉ nên được xem là có sẵn khi đã được tích hợp và kiểm thử trên nhánh/bản phát hành tương ứng.

## Đóng góp

Khi thay đổi dữ liệu hoặc giao diện, vui lòng giữ nguyên nguồn và trạng thái xác minh; bổ sung kiểm thử phù hợp và không tự điền giá trị còn thiếu bằng dữ liệu phỏng đoán.
