# BÁO CÁO DỰ ÁN VÀ HƯỚNG DẪN THUYẾT TRÌNH
## HỆ THỐNG ĐẶT TOUR DU LỊCH SINH THÁI VNA ĐẮK SONG

* Đơn vị phát triển: Tập đoàn VNA Group  
* Nền tảng: Zalo Mini App & Web Application (Responsive) & Cổng Quản trị Executive Admin Portal  
* Trạng thái: Đã triển khai trực tuyến (Live trên Vercel Serverless & MongoDB Atlas Cloud)

---

## THÔNG TIN TÊN MIỀN TRỰC TUYẾN VÀ TÀI KHOẢN HỆ THỐNG

* Trang dành cho Khách hàng (User App): https://vna-daksong-frontend.vercel.app
* Cổng Quản trị Điều hành (Admin Portal): https://vna-daksong-frontend.vercel.app/admin
  * Email Admin: vna@gmail.com
  * Mật khẩu Admin: vna@1234
* Máy chủ API Backend (REST API): https://vna-daksong-backend.vercel.app

---

## MỤC LỤC BÀI BÁO CÁO THUYẾT TRÌNH

1. Tổng quan Dự án và Bài toán Thực tế
2. Kiến trúc Hệ thống và Phân tích Lựa chọn Mô hình (Architectural Rationale)
3. Tính năng Nổi bật - Phân hệ Khách hàng (User Application)
4. Tính năng Nổi bật - Phân hệ Quản trị Viên (Executive Admin Portal)
5. Chi tiết Kỹ thuật, Bảo mật và Giải pháp Tối ưu (Engineering Highlights)
6. Kịch bản Thuyết trình Báo cáo Chi tiết (Presentation Script)
7. Định hướng Phát triển Mở rộng (Roadmap)

---

## 1. TỔNG QUAN DỰ ÁN VÀ BÀI TOÁN THỰC TẾ

### 1.1 Bối cảnh Dự án
Huyện Đắk Song (Tỉnh Đắk Nông) sở hữu tài nguyên du lịch sinh thái đặc sắc như Thác Lưu Ly, Thiền viện Trúc Lâm Đạo Nguyên, các quần thể đồi thông nguyên sinh và không gian văn hóa Cồng chiêng Tây Nguyên.

### 1.2 Mục tiêu Hệ thống
Tập đoàn VNA Group phát triển hệ thống nhằm giải quyết các yêu cầu chuyển đổi số:
* Tiếp cận tập khách hàng đa kênh trên nền tảng Zalo Mini App và Web Application.
* Tự động hóa quy trình quản lý lịch khởi hành, tính báo giá, giữ chỗ (giới hạn 50 khách/chuyến), áp dụng ưu đãi và gửi email xác nhận.
* Cung cấp Cổng Quản trị cho ban điều hành theo dõi doanh thu và duyệt đơn theo thời gian thực.

---

## 2. KIẾN TRÚC HỆ THỐNG VÀ PHÂN TÍCH LỰA CHỌN MÔ HÌNH

### 2.1 Kiến trúc Tổng thể (System Architecture)

Dự án được thiết kế theo kiến trúc Micro-services / Decoupled Client-Server:
* Client Layer: React 18, TypeScript, Vite 5, ZaUI, TailwindCSS.
* Server Layer: Node.js Express 5 REST API running as Serverless Functions on Vercel.
* Database Layer: MongoDB Atlas Cloud (Replica Set).

### 2.2 Kiến trúc Backend: Mô hình MVC / Layered Architecture và Lý do Lựa chọn

Backend sử dụng mô hình MVC / Phân tầng chi tiết:
`Routing Layer (routes/)` ➔ `Middleware Layer (middlewares/)` ➔ `Controller Layer (controllers/)` ➔ `Data Layer (models/)` ➔ `Services (utils/)`.

**Lý do lựa chọn mô hình MVC / Layered Architecture:**
1. **Tách biệt Vai trò (Separation of Concerns - SoC):**
   * Routing Layer chỉ đảm nhận việc định tuyến URL và áp dụng filter middleware.
   * Controller Layer tập trung toàn bộ Business Logic (tính giá snapshot, kiểm tra sức chứa 50 chỗ, cộng điểm nâng hạng hội viên, xác thực HMAC ZaloPay).
   * Data Model Layer quản lý tính hợp lệ và chỉ mục (indexing) của cơ sở dữ liệu.
2. **Khả năng Bảo trì và Kiểm thử (Maintainability & Testability):**
   * Giảm sự phụ thuộc chéo giữa các module.
   * Dễ dàng xây dựng các bộ kiểm thử tự động (Test suite `all-api.test.mjs` bao phủ 256 kịch bản kiểm thử API).
3. **Tối ưu hóa cho Môi trường Serverless:**
   * Cấu trúc nhẹ giúp giảm thời gian khởi tạo (Cold start) dưới 100ms trên Vercel.

### 2.3 Kiến trúc Frontend: Mô hình Component-Driven & Custom Hooks Pattern

Frontend áp dụng kết hợp các kỹ thuật kiến trúc hiện đại:
1. **Component-Driven Architecture (Kiến trúc Hướng Thành phần):**
   * Giao diện được phân rã thành các thành phần nguyên tử tái sử dụng (Header, BottomNavigation, TourCard, CouponPicker, States).
   * Đảm bảo tính đồng nhất về thiết kế theo Stitch VNA Design System.
2. **Custom Hooks Pattern & Centralized Context State Management:**
   * Quản lý trạng thái phân tầng: AuthContext (phiên đăng nhập), BookingDraftContext (dự thảo đơn), PreviewContext (chế độ xem mẫu).
   * Custom Hooks (useApi, useAdminForm, useAdminQuery) tách toàn bộ logic gọi API và xử lý bất đồng bộ ra khỏi giao diện rendering.
3. **Hybrid Multi-Routing System (Định tuyến Kép):**
   * Tự động chuyển đổi giữa ZMPRouter (trong Zalo Mini App) và BrowserRouter (trên Trình duyệt Web / Admin Portal).
   * Một codebase duy nhất phục vụ song song hai môi trường xuất bản.

---

## 3. TÍNH NĂNG NỔI BẬT - PHÂN HỆ KHÁCH HÀNG (USER APP)

### 3.1 Khám phá và Bộ lọc Nội dung
* Cẩm nang du lịch và danh lam thắng cảnh hiển thị theo tỉ lệ khung hình 4:5.
* Bộ lọc đa tiêu chí: Mức giá, thời lượng, chủ đề (Thiên nhiên, Văn hóa, Ẩm thực, Lịch sử) và tìm kiếm từ khóa.

### 3.2 Lịch khởi hành và Kiểm soát Sức chứa
* Hiển thị trạng thái "Còn X/50 chỗ" theo thời gian thực.
* Tự động khóa chọn khi chuyến khởi hành đã đầy (tối đa 50 khách/chuyến) hoặc bị đóng bởi Admin.

### 3.3 Báo giá Snapshot và Mã Khuyến Mãi (Coupons)
* Quote Token khóa giá snapshot trong 10 phút.
* Hỗ trợ mã giảm giá theo phần trăm (%) hoặc số tiền cố định với các điều kiện ràng buộc.

### 3.4 Email Thông báo qua Gmail SMTP (Nodemailer)
* Tự động gửi email HTML xác nhận đơn tới khách hàng ngay sau khi gửi yêu cầu thành công.

### 3.5 Tích điểm thưởng và Hạng Hội viên
* Hệ thống 4 cấp bậc: Standard ➔ Silver ➔ Gold ➔ Diamond.
* Tự động cộng điểm thưởng (10.000đ = 1 điểm) và nâng hạng khi đơn chuyển sang Completed.

---

## 4. TÍNH NĂNG NỔI BẬT - PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN PORTAL)

### 4.1 Bảng Điều hành Realtime (Dashboard)
* Thiết kế Executive Green Theme, hiển thị tổng doanh thu, tổng đơn hàng, tỉ lệ xác nhận chuyến.
* Task Banner hiển thị các đơn chờ xử lý tức thì.

### 4.2 Quản lý Đơn hàng và Thanh toán
* Quản lý vòng đời đơn hàng: pending_confirmation ➔ confirmed ➔ completed (hoặc cancelled/rejected).
* Đối soát thanh toán ZaloPay tự động và xử lý yêu cầu hoàn tiền (Refund).

### 4.3 Quản lý Danh mục Tour, Lịch khởi hành và Mã giảm giá
* Cấu hình chi tiết tour, giá người lớn/trẻ em, điểm đón, lịch trình.
* Quản lý tạo mã ưu đãi và upload hình ảnh chuẩn HD lên Cloudinary Storage.

---

## 5. CHI TIẾT KỸ THUẬT VÀ BẢO MẬT (ENGINEERING HIGHLIGHTS)

1. **Chống lặp đơn lãng phí (Idempotency-Key):**
   * Sử dụng Idempotency-Key để ngăn chặn tạo đơn trùng khi kết nối mạng chập chờn.
2. **Giao dịch Cơ sở Dữ liệu (MongoDB ACID Transactions):**
   * Đảm bảo tính toàn vẹn khi cập nhật đồng thời số chỗ khởi hành và lượt sử dụng mã ưu đãi.
3. **Xác thực Chữ ký Thanh toán (HMAC-SHA256):**
   * Kiểm tra chữ ký IPN callback từ ZaloPay chống giả mạo kết quả thanh toán.
4. **Tối ưu Serverless Connection Caching:**
   * Tái sử dụng kết nối Mongoose giữa các lần triệu hồi hàm Vercel Serverless.

---

## 6. KỊCH BẢN THUYẾT TRÌNH BÁO CÁO CHI TIẾT (15 PHÚT)

### Phần 1: Mở đầu và Giới thiệu Tổng quan (2 Phút)
* Lời chào và giới thiệu lý do phát triển Hệ thống Đặt tour Du lịch Sinh thái VNA Đắk Song.
* Nhấn mạnh mục tiêu số hóa ngành du lịch địa phương của Tập đoàn VNA Group.

### Phần 2: Demo Luồng Trải nghiệm Khách hàng (5 Phút)
1. Mở trang web: https://vna-daksong-frontend.vercel.app
2. Khám phá Điểm đến, Cẩm nang du lịch và Bộ lọc tìm kiếm.
3. Chọn Tour trekking ➔ Chọn lịch khởi hành (minh họa số chỗ 48/50) ➔ Nhập mã giảm giá ➔ Nhận báo giá.
4. Gửi đơn đặt tour ➔ Mở hộp thư Gmail xem Email xác nhận tự động gửi về từ hệ thống.
5. Xem trang Tài khoản ➔ Tiến trình tích điểm nâng hạng hội viên.

### Phần 3: Demo Cổng Quản trị Admin Portal (5 Phút)
1. Truy cập đường dẫn: https://vna-daksong-frontend.vercel.app/admin
2. Đăng nhập tài khoản vna@gmail.com / vna@1234.
3. Trình bày Dashboard Executive Green Theme, xem chỉ số doanh thu realtime.
4. Tìm đơn hàng vừa đặt ở Phần 2 ➔ Thực hiện thao tác Duyệt xác nhận chuyến và Chuyển sang Hoàn thành (Completed).
5. Cho xem điểm thưởng được tự động cộng cho tài khoản khách hàng.

### Phần 4: Kiến trúc Kỹ thuật và Khả năng Mở rộng (2 Phút)
* Phân tích kiến trúc MVC ở Backend, Component-Driven ở Frontend, cơ chế Idempotency-Key và hạ tầng Serverless Vercel.

### Phần 5: Kết luận và Q&A (1 Phút)
* Tổng kết sự sẵn sàng của hệ thống và phản hồi các câu hỏi từ Hội đồng.

---

## 7. ĐỊNH HƯỚNG PHÁT TRIỂN MỞ RỘNG (ROADMAP)

- [x] Triển khai thành công trên Vercel Serverless & MongoDB Atlas Cloud.
- [x] Tích hợp ZaloPay Sandbox & Gmail SMTP Nodemailer.
- [x] Cổng Quản trị Admin Executive Green Theme.
- [ ] Đăng ký chính thức App ID trên Zalo Mini App Developer Center.
- [ ] Tích hợp Zalo Notification Service (ZNS) gửi thông báo qua Zalo Official Account.
- [ ] Mở rộng bản đồ định vị GPS các điểm check-in sinh thái realtime tại Đắk Song.

---
*Bản quyền tài liệu thuộc về VNA Group © 2026. Mọi quyền được bảo lưu.*
