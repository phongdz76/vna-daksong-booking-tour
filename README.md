# VNA ĐẮK SONG BOOKING TOUR

Ứng dụng khám phá du lịch và gửi yêu cầu đặt tour của VNA Group, gồm Zalo Mini App cho khách hàng, Cổng Web Quản trị Điều hành (Executive Admin Portal) và RESTful API Backend.

* Tài liệu Báo cáo và Hướng dẫn Thuyết trình Chi tiết: [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md)

## ĐƯỜNG DẪN TRỰC TUYẾN (LIVE DEMO ON VERCEL)

* App Khách hàng (User App): https://vna-daksong-frontend.vercel.app
* Cổng Quản trị Admin (Admin Portal): https://vna-daksong-frontend.vercel.app/admin (Tài khoản Admin: `vna@gmail.com` / Mật khẩu: `vna@1234`)
* Máy chủ API Backend: https://vna-daksong-backend.vercel.app

---

## KIẾN TRÚC VÀ PHÂN TÍCH LỰA CHỌN MÔ HÌNH (ARCHITECTURAL RATIONALE)

### 1. Kiến trúc Backend: Mô hình MVC / Layered Architecture
Backend tổ chức phân tầng chặt chẽ: `routes/` ➔ `middlewares/` ➔ `controllers/` ➔ `models/` ➔ `utils/`.

**Lý do lựa chọn mô hình MVC / Phân tầng (Why MVC?):**
* **Tách biệt vai trò (Separation of Concerns):** Routing chỉ thực hiện định tuyến và phân quyền middleware (`protect`, `adminOnly`, `upload`). Controller xử lý toàn bộ Business Logic (snapshot giá, kiểm tra slot 50 chỗ, tích điểm nâng hạng hội viên, HMAC ZaloPay). Model quản lý schema và ràng buộc toàn vẹn dữ liệu.
* **Dễ bảo trì và kiểm thử:** Các module độc lập giúp dễ dàng mở rộng tính năng và duy trì bộ kiểm thử tự động (Test suite `all-api.test.mjs` bao phủ 256 kịch bản API).
* **Tối ưu Serverless:** Cấu trúc gọn nhẹ kết hợp với Mongoose Connection Caching cho thời gian khởi tạo Serverless Function trên Vercel dưới 100ms.

### 2. Kiến trúc Frontend: Component-Driven Architecture & Custom Hooks Pattern
Frontend tổ chức theo cấu trúc module: `pages/`, `components/`, `context/`, `hooks/`, `utils/`, `types/`, `styles/`.

**Các mô hình và kỹ thuật áp dụng trên Frontend:**
* **Component-Driven Architecture:** Giao diện được xây dựng từ các thành phần nguyên tử tái sử dụng (Header, BottomNavigation, TourCard, CouponPicker, States), đảm bảo tính nhất quán theo Stitch VNA Design System.
* **Custom Hooks & Centralized Context State Management:** `AuthContext` (quản lý phiên), `BookingDraftContext` (dự thảo đơn), `PreviewContext` (xem mẫu). Các Custom Hooks (`useApi`, `useAdminForm`, `useAdminQuery`) phân tách toàn bộ logic gọi API và xử lý bất đồng bộ ra khỏi giao diện rendering.
* **Hybrid Multi-Routing System:** Sử dụng linh hoạt `ZMPRouter` (khi chạy trong Zalo Mini App) và `BrowserRouter` (khi chạy trên Web / Admin Portal).

---

## CẤU TRÚC THƯ MỤC DỰ ÁN

| Thư mục | Nội dung | Hướng dẫn |
| --- | --- | --- |
| backend/ | Express 5, Mongoose, JWT, ZaloPay, Cloudinary, Nodemailer SMTP | [README backend](backend/README.md) |
| frontend/ | React 18, TypeScript, Vite 5, ZaUI; Khách hàng và Admin dùng chung mã nguồn | [README frontend](frontend/README.md) |

---

## CHỨC NĂNG HỆ THỐNG

* **Phân hệ Khách hàng:** Khám phá điểm đến, bài viết cẩm nang, tìm/lọc tour, quản lý lịch khởi hành và sức chứa 50 chỗ/chuyến, báo giá snapshot token (10 phút), áp dụng mã giảm giá, gửi yêu cầu đặt tour, nhận email HTML xác nhận qua Nodemailer SMTP, đánh giá tour và tích điểm nâng hạng hội viên 4 cấp (`Standard` ➔ `Silver` ➔ `Gold` ➔ `Diamond`).
* **Phân hệ Quản trị Viên (Admin Portal):** Đăng nhập Admin, Dashboard điều hành Executive Green Theme với chỉ số realtime, duyệt và chuyển trạng thái đơn hàng, đối soát ZaloPay/Refund, quản lý danh mục Tour, lịch khởi hành, mã giảm giá và upload ảnh chuẩn HD lên Cloudinary.

---

## HƯỚNG DẪN CÀI ĐẶT VÀ PHÁT TRIỂN LOCAL

Yêu cầu Node.js `^20.19.0` hoặc `>=22.12.0`; Cơ sở dữ liệu MongoDB hỗ trợ transaction (MongoDB Atlas hoặc Replica Set).

### 1. Khởi chạy Backend

~~~powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
# Điền MONGO_URI và JWT_SECRET trong .env
npm.cmd run dev
~~~

* Backend chạy tại: `http://localhost:8000`
* Khởi tạo tài khoản Admin: Điền `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `.env` rồi chạy `npm.cmd run create:admin`.
* Khởi tạo dữ liệu mẫu: `node scripts/seed.js`

### 2. Khởi chạy Frontend

~~~powershell
cd frontend
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
~~~

* App Khách hàng: `http://localhost:5173/`
* Cổng Admin: `http://localhost:5173/admin`
* Chế độ xem mẫu preview: `http://localhost:5173/?preview=1`

---

## GIẤY PHÉP VÀ BẢN QUYỀN

Bản quyền thuộc về VNA Group. Font Inter kèm giấy phép SIL OFL lưu tại `frontend/src/assets/fonts/Inter-OFL.txt`.
