# 🚀 BÁO CÁO DỰ ÁN & HƯỚNG DẪN THUYẾT TRÌNH
## HỆ THỐNG ĐẶT TOUR DU LỊCH SINH THÁI VNA ĐẮK SONG
> **Đơn vị phát triển:** Tập đoàn VNA Group  
> **Nền tảng:** Zalo Mini App & Web Application (Responsive) & Cổng Quản trị Executive Admin Portal  
> **Trạng thái:** Đã triển khai trực tuyến (Live on Vercel Serverless & MongoDB Atlas)

---

## 📍 LINK DEMO TRỰC TUYẾN & TÀI KHOẢN THỬ NGHIỆM

* 📱 **Trang dành cho Khách hàng (User App)**: [https://vna-daksong-frontend.vercel.app](https://vna-daksong-frontend.vercel.app)
* 🔐 **Cổng Quản trị Điều hành (Admin Portal)**: [https://vna-daksong-frontend.vercel.app/admin](https://vna-daksong-frontend.vercel.app/admin)
  * **Email Admin**: `vna@gmail.com`
  * **Mật khẩu**: `vna@1234`
* 🌐 **Backend RESTful API**: [https://vna-daksong-backend.vercel.app](https://vna-daksong-backend.vercel.app)

---

## 📋 MỤC LỤC BÀI THUYẾT TRÌNH

1. **Tổng quan Dự án & Bài toán Thực tế**
2. **Kiến trúc Công nghệ (Tech Stack)**
3. **Tính năng Nổi bật - Trải nghiệm Khách hàng (User App)**
4. **Tính năng Nổi bật - Cổng Quản trị Viên (Executive Admin Portal)**
5. **Điểm Nổi Bật Kỹ thuật & Bảo mật (Engineering Highlights)**
6. **Kịch bản Thuyết trình & Demo Chi tiết (Presentation Script)**
7. **Định hướng Phát triển (Roadmap)**

---

## 1. TỔNG QUAN DỰ ÁN & BÀI TOÁN THỰC TẾ

### 1.1 Bối cảnh & Mục tiêu
Đắk Song (Đắk Nông) sở hữu tiềm năng du lịch sinh thái hoang sơ vô cùng lớn với các danh thắng như **Thác Lưu Ly**, **Thiền viện Trúc Lâm Đạo Nguyên**, các đồi thông nguyên sinh và nét văn hóa Cồng chiêng Tây Nguyên độc đáo.

**Hệ thống VNA Đắk Song Booking Tour** được Tập đoàn **VNA Group** xây dựng với mục tiêu:
* **Chuyển đổi số ngành du lịch Đắk Song**: Đưa trải nghiệm khám phá và đặt tour sinh thái tiếp cận hàng triệu người dùng ngay trên **Zalo Mini App** và **Nền tảng Web**.
* **Tối ưu hóa quy trình chốt đơn & quản lý vận hành**: Tự động hóa báo giá, giữ chỗ khởi hành, áp dụng mã ưu đãi, gửi email xác nhận và theo dõi trạng thái thanh toán theo thời gian thực.

---

## 2. KIẾN TRÚC CÔNG NGHỆ (TECH STACK)

| Phân hệ | Công nghệ sử dụng | Vai trò & Ưu điểm |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite 5, ZaUI (`zmp-ui`), Vanilla CSS | Type-safe 100%, render mượt mà 60fps, hỗ trợ mượt cho mobile webview Zalo và PC. |
| **Admin Theme** | Executive Green Theme, Glassmorphism, Responsive CSS | Giao diện điều hành cao cấp, bảng điều khiển Emerald Mint sắc nét, realtime toast notification. |
| **Backend** | Node.js Express 5 (ESM), Mongoose 9 | Chuẩn phân tầng Layered Architecture (MVC), xử lý Serverless mượt mà. |
| **Database** | MongoDB Atlas Cloud (Replica Set) | Cơ sở dữ liệu NoSQL linh hoạt, hỗ trợ ACID Transactions, tối ưu Indexing search. |
| **Xác thực & Bảo mật** | JWT (HS256), Bcrypt, Zalo Graph API, HMAC-SHA256 | Đăng nhập Zalo 1-touch, phân quyền RBAC (User / Admin), chống trùng lặp Idempotency. |
| **Dịch vụ Đám mây** | Cloudinary Storage API, Gmail SMTP (Nodemailer), ZaloPay SDK | Tải ảnh chuẩn HD lên mây, gửi email xác nhận tức thì, hỗ trợ thanh toán ZaloPay Sandbox & Cash. |
| **Triển khai (CI/CD)** | Vercel Serverless Functions + GitHub Actions | Tự động build & redeploy tức thì mỗi khi push code lên GitHub `main`. |

---

## 3. TÍNH NĂNG NỔI BẬT - ZALO MINI APP & USER APP

### 🌲 3.1 Khám phá & Cẩm nang Du lịch Đắk Song
* **Địa điểm Nổi bật & Bài viết Văn hóa**: Hình ảnh 4:5 sắc nét, thông tin chi tiết về khoảng cách, địa chỉ và văn hóa bản địa.
* **Bộ lọc Tour Thông minh**: Lọc theo mức giá, thời lượng, chủ đề (*Thiên nhiên, Văn hóa, Ẩm thực, Lịch sử*) và từ khóa tìm kiếm.

### 📅 3.2 Quản lý Lịch khởi hành & Giới hạn Số chỗ Khả dụng
* **Hiển thị trực quan**: Cờ báo *"Còn X/50 chỗ"* theo thời gian thực.
* **Khóa tự động**: Tự động khóa chọn khi chuyến đã đầy (tối đa 50 khách/chuyến) hoặc khi quản trị viên đóng chuyến.

### 💰 3.3 Hệ thống Báo giá Snapshot & Mã Khuyến Mãi (Coupons)
* **Quote Token**: Khóa snapshot giá trong 10 phút, tránh xung đột biến động giá khi khách đang thao tác.
* **Mã ưu đãi**: Áp dụng giảm trực tiếp theo phần trăm (%) hoặc số tiền cố định (đơn tối thiểu, giảm tối đa, giới hạn lượt dùng).

### 📧 3.4 Xác nhận Đơn tự động qua Gmail SMTP (Nodemailer)
* Ngay sau khi tạo đơn thành công, hệ thống gửi **Email HTML xác nhận** thương hiệu VNA Group kèm mã đơn, thông tin lịch trình, điểm đón và hotline hỗ trợ.

### ⭐ 3.5 Điểm thưởng & Hạng Hội viên (Loyalty Tier System)
* **4 Cấp độ**: `Standard` ➔ `Silver` ➔ `Gold` ➔ `Diamond`.
* **Tích điểm tự động**: Tự động cộng điểm thưởng (`10.000đ = 1 điểm`) và tự động nâng hạng khi đơn chuyển sang `completed`.

### 💬 3.6 Đánh giá & Phản hồi Trực quan
* Khách hàng hoàn thành chuyến đi có quyền viết đánh giá 1–5 sao kèm nhận xét. Hệ thống tự động tính lại điểm trung bình rating của Tour.

---

## 4. TÍNH NĂNG NỔI BẬT - CỔNG QUẢN TRỊ ADMIN PORTAL (`/admin`)

### 📊 4.1 Dashboard Điều hành Cao cấp (Executive Realtime Dashboard)
* **Chỉ số kinh doanh tức thì**: Tổng doanh thu thực tế, tổng đơn hàng, tỉ lệ xác nhận chuyến, phân bổ khách hàng.
* **Task Banner Thông minh**: Thẻ thông báo đơn hàng mới cần xác nhận thiết kế Emerald Mint sắc nét.

### 📋 4.2 Quản lý Đơn hàng & Thanh toán (Booking & Payment CMS)
* Xem danh sách đơn, lọc theo trạng thái (`pending_confirmation`, `confirmed`, `completed`, `cancelled`, `rejected`).
* Duyệt xác nhận chuyến, xác nhận thanh toán ZaloPay / Tiền mặt, thực hiện hoàn tiền (Refund).

### 🏕 4.3 Quản lý Danh mục Tour & Lịch khởi hành
* Cấu hình nội dung tour, giá người lớn/trẻ em, thời lượng, chính sách hoàn hủy.
* Tạo lịch khởi hành linh hoạt, tùy chỉnh giới hạn sức chứa tối đa.

### 🏷 4.4 CMS Mã giảm giá & Cloudinary Image Upload
* Quản lý tạo mã giảm giá (tự động viết hoa code), cài đặt thời hạn và quota.
* Upload hình ảnh trực tiếp lên **Cloudinary Cloud** với bộ lọc Multer Memory Storage bảo mật 5MB.

---

## 5. ĐIỂM NỔI BẬT KỸ THUẬT & BẢO MẬT (ENGINEERING HIGHLIGHTS)

1. **Chống lặp đơn lãng phí (`Idempotency-Key`)**:
   * Khi mạng người dùng chập chờn gửi lại 2-3 lần, backend đọc `Idempotency-Key` để trả về đúng đơn hàng cũ mà không tạo thêm đơn trùng.
2. **Kiến trúc Transaction MongoDB**:
   * Đảm bảo tính toàn vẹn dữ liệu khi trừ số chỗ khởi hành và áp dụng mã giảm giá đồng thời.
3. **Xác thực Chữ ký ZaloPay (HMAC-SHA256)**:
   * Kiểm tra chữ ký bảo mật IPN callback từ ZaloPay, tránh tình trạng giả mạo kết quả thanh toán.
4. **Tối ưu Serverless Connection Caching**:
   * Mongoose connection được lưu lại giữa các lần triệu hồi Serverless Function trên Vercel, giúp thời gian phản hồi API đạt dưới 100ms.

---

## 🎙️ 6. KỊCH BẢN THUYẾT TRÌNH & DEMO CHI TIẾT (15 PHÚT)

### ⏱️ PHẦN 1: MỞ ĐẦU & GIỚI THIỆU TỔNG QUAN (2 Phút)
* **Lời chào & Lý do**: *"Kính chào quý hội đồng / đối tác. Hôm nay tôi xin đại diện VNA Group thuyết trình về Hệ thống Đặt tour Du lịch Sinh thái VNA Đắk Song..."*
* **Nhấn mạnh tầm nhìn**: Đưa du lịch sinh thái Đắk Song lên nền tảng số Zalo Mini App & Web, mang lại sự tiện lợi tối đa cho du khách và tối ưu hóa điều hành cho doanh nghiệp.

### ⏱️ PHẦN 2: DEMO LUỒNG KHÁCH HÀNG - USER JOURNEY (5 Phút)
1. **Trải nghiệm Màn hình Khám phá**:
   * Mở link demo: `https://vna-daksong-frontend.vercel.app`
   * Trình bày khả năng xem điểm đến nổi bật (*Thác Lưu Ly, Đồi thông*), cẩm nang du lịch và bộ lọc tìm kiếm tour.
2. **Thao tác Chọn Tour & Đặt Chỗ**:
   * Mở một Tour du lịch (VD: *Trekking Thác Lưu Ly*).
   * Chọn Lịch khởi hành ➔ Giải thích tính năng hiển thị số chỗ khả dụng (*"Còn 48/50 chỗ"*).
   * Chọn số khách (2 người lớn, 1 trẻ em), chọn Mã giảm giá ➔ Hệ thống tự động tính báo giá.
3. **Gửi Đặt Tour & Nhận Email Xác nhận**:
   * Điền tên và số điện thoại liên hệ ➔ Bấm **Gửi yêu cầu đặt tour**.
   * Mở hộp thư Gmail ➔ Cho hội đồng xem **Email HTML xác nhận tự động** vừa gửi về từ VNA Group.
4. **Xem Lịch sử Đơn & Hạng Hội viên**:
   * Mở mục **Tài khoản** ➔ Cho xem thanh tiến trình tích điểm nâng hạng hội viên (`Standard` ➔ `Diamond`).

### ⏱️ PHẦN 3: DEMO CỔNG QUẢN TRỊ ADMIN PORTAL (5 Phút)
1. **Truy cập Admin**:
   * Mở URL: `https://vna-daksong-frontend.vercel.app/admin`
   * Đăng nhập tài khoản `vna@gmail.com` / `vna@1234`.
2. **Trải nghiệm Dashboard Điều hành**:
   * Giới thiệu giao diện **Executive Green Theme**, các chỉ số realtime (Doanh thu, Tỉ lệ xác nhận, Đơn chờ duyệt).
3. **Quản lý & Duyệt Đơn hàng**:
   * Mở danh sách đơn đặt ➔ Tìm đơn hàng vừa tạo ở Phần 2.
   * Thực hiện bấm **Duyệt xác nhận chuyến** hoặc **Hoàn thành chuyến**.
   * Chỉ ra rằng: Sau khi chuyển sang `Completed`, điểm thưởng lập tức được cộng tự động cho khách hàng.
4. **Quản lý CMS & Upload ảnh**:
   * Mở mục Tour / Mã giảm giá / Bài viết ➔ Cho xem tính năng tạo mã ưu đãi và tải ảnh Cloudinary.

### ⏱️ PHẦN 4: KIẾN TRÚC KỸ THUẬT & KHẢ NĂNG MỞ RỘNG (2 Phút)
* Giải thích tính năng bảo mật `Idempotency-Key`, kiến trúc Serverless trên Vercel, MongoDB Atlas Cloud và khả năng chịu tải hàng nghìn truy cập cùng lúc.

### ⏱️ PHẦN 5: KẾT LUẬN & Q&A (1 Phút)
* **Tổng kết**: Dự án đã sẵn sàng 100% về cả sản phẩm thương mại lẫn nền tảng kỹ thuật.
* Cảm ơn và sẵn sàng trả lời các câu hỏi từ Hội đồng.

---

## 🏆 7. ĐỊNH HƯỚNG PHÁT TRIỂN (ROADMAP)

- [x] Triển khai mượt mà trên Vercel Serverless & MongoDB Atlas.
- [x] Tích hợp ZaloPay Sandbox & Gmail SMTP Nodemailer.
- [x] Cổng Admin Điều hành Executive Green Theme.
- [ ] Đăng ký chính thức App ID trên **Zalo Mini App Developer Center**.
- [ ] Kết nối Zalo Notification Service (ZNS) gửi tin nhắn thông báo tự động qua Zalo OA.
- [ ] Mở rộng bản đồ định vị GPS các điểm check-in sinh thái realtime tại Đắk Song.

---
*Bản quyền tài liệu thuộc về VNA Group © 2026. Mọi quyền được bảo lưu.*
