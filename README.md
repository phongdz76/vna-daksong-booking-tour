# VNA Đắk Song Booking Tour

![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge&logo=mongodb)
![React](https://img.shields.io/badge/Frontend-React%20Zalo%20Mini%20App-0088FF?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Backend-NodeJS%20%26%20Express-339933?style=for-the-badge&logo=nodedotjs)

> Zalo Mini App dành cho nền tảng du lịch Đắk Song của Tập đoàn VNA (VNA Group). Ứng dụng cung cấp các dịch vụ khám phá danh lam thắng cảnh, trải nghiệm ẩm thực và đặc biệt là hệ thống Đặt Tour du lịch toàn diện ngay trên nền tảng Zalo.

---

## Tổng quan tính năng (Features)

### Dành cho Khách hàng (User App)
- Khám phá Đắk Song: Đọc các bài viết văn hóa, ẩm thực, ngắm các điểm đến check-in hot.
- Tìm kiếm Tour: Lọc Tour theo giá, chủ đề (thiên nhiên, lịch sử, văn hóa), thời lượng.
- Lên lịch trình: Chọn ngày khởi hành, số lượng người và nhận báo giá tự động.
- Booking & Chốt đơn: Trải nghiệm đặt tour mượt mà, lưu trữ lịch sử đặt chuyến an toàn với Idempotency-Key.

### Dành cho Quản trị viên (Admin Portal)
- Quản lý Nội dung (CMS): Thêm, sửa, xóa các Điểm đến, Bài viết thông qua trình soạn thảo.
- Quản trị Tour: Đóng/mở các chuyến khởi hành, cập nhật giá linh hoạt mà không ảnh hưởng tới đơn cũ.
- Xử lý Đơn hàng: Xem danh sách khách đặt, tiến hành Xác nhận (Duyệt) hoặc Từ chối đơn hàng.
- Dashboard: Thống kê lượng truy cập, lượng đơn đặt và doanh thu theo thời gian thực.

---

## Công nghệ sử dụng (Tech Stack)

### Frontend (Zalo Mini App)
- ReactJS 18 & TypeScript: Logic giao diện an toàn, dễ bảo trì.
- ZaUI (zmp-ui): Bộ UI Components được thiết kế riêng, tối ưu hóa cho màn hình Zalo.
- Vite: Công cụ build siêu tốc.
- React Router (Memory Router): Điều hướng trang mà không phụ thuộc vào URL thanh trình duyệt.

### Backend (RESTful API)
- Node.js & Express (v5.x): Framework API mạnh mẽ, tốc độ cao.
- MongoDB Atlas & Mongoose (v9): Cơ sở dữ liệu linh hoạt, tra cứu Text-Search thần tốc.
- JWT & Bcrypt: Phân quyền và bảo mật tài khoản tuyệt đối.
- Cloudinary & Multer: Quản lý CDN, tự động xử lý và lưu trữ hình ảnh tối ưu trên mây.

---

## Hướng dẫn cài đặt (Installation)

### 1. Chuẩn bị Môi trường
- Đảm bảo đã cài đặt [Node.js](https://nodejs.org/en/) (>= 20.19.0).
- Cài đặt cơ sở dữ liệu [MongoDB](https://www.mongodb.com/).
- Có tài khoản [Cloudinary](https://cloudinary.com/).

### 2. Cấu hình Backend
Di chuyển vào thư mục `backend`:
```bash
cd backend
npm install
```

Tạo file `.env` bằng cách copy từ file mẫu và điền các thông tin của bạn:
```bash
cp .env.example .env
```
Mở file `.env` và điền: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, và cấu hình `CLOUDINARY_...`.

Tạo tài khoản Admin mặc định:
```bash
npm run create:admin
```

Chạy Server:
```bash
npm run dev
```
*(Server sẽ chạy tại `http://localhost:8000`)*

### 3. Cấu hình Frontend
Di chuyển vào thư mục `frontend`:
```bash
cd frontend
npm install
```
Chạy ứng dụng Frontend:
```bash
npm run dev
```

---

## Vệ sinh thư mục

`node_modules/`, `dist/`, `.browser-cache/`, `test-results/`, `tmp/` và cấu hình `.env` được Git bỏ qua. Giữ `package-lock.json`, `.env.example`, mã nguồn, bộ test và license tài nguyên trong dự án.

Kết quả kiểm thử API nằm trong `backend/test-results/`; ảnh chụp và kết quả kiểm thử giao diện nằm trong `frontend/test-results/`. Các file này được tạo lại khi chạy test. Script chuẩn bị ảnh chỉ tải các ảnh local còn dùng trên giao diện.

Tài liệu, bộ Postman, mẫu Stitch và skill dự án đang được giữ trên máy theo các quy tắc ignore hiện có.

Hai script `backend/scripts/seed.js`, `backend/scripts/seedTestUsers.js` và các công cụ `frontend/scripts/prepare-*.mjs` chỉ giữ local, không commit. Dữ liệu seed đã được lưu trong database; ứng dụng đọc nội dung từ API. Các file `frontend/src/data/preview*.ts` và fixture trong bộ test vẫn thuộc mã nguồn vì giao diện xem mẫu và kiểm thử cần import chúng. Chế độ xem mẫu chỉ bật khi chạy dev với `?preview=1`.

## Giấy phép (License)
Bản quyền thuộc về VNA Group. Nghiêm cấm sao chép dưới mọi hình thức nếu không được phép.
