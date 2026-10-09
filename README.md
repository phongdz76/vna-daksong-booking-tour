# VNA Đắk Song Booking Tour

Ứng dụng khám phá du lịch và gửi yêu cầu đặt tour của VNA Group, gồm Zalo Mini App cho khách, cổng web quản trị và REST API.

## Cấu trúc

| Thư mục | Nội dung | Hướng dẫn |
| --- | --- | --- |
| backend/ | Express 5, Mongoose, JWT, ZaloPay, Cloudinary, email SMTP | [README backend](backend/README.md) |
| frontend/ | React 18, TypeScript, Vite 5, ZaUI; khách và admin dùng chung source | [README frontend](frontend/README.md) |

Backend tổ chức theo routes → controllers → models. Frontend dùng pages, components, context, hooks, utils, types và styles. Admin nằm tại frontend/src/pages/Admin và được tải riêng khi mở /admin trên trình duyệt.

## Chức năng hiện có

- Khách: điểm đến, cẩm nang, tìm/lọc tour, lịch khởi hành, số chỗ, ưu đãi, báo giá, gửi và theo dõi yêu cầu đặt tour, đánh giá, thông báo và tài khoản.
- Admin: đăng nhập, dashboard, quản lý đơn và thanh toán, tour, đánh giá, lịch khởi hành, điểm đến, bài viết, mã giảm giá và tải ảnh.
- Backend quyết định giá, điều kiện ưu đãi, quyền truy cập và trạng thái. Idempotency-Key hỗ trợ gửi lại yêu cầu sau lỗi mạng.
- Email thông báo đã nhận yêu cầu gửi qua Gmail SMTP khi cấu hình đầy đủ; logo email nằm tại backend/assets/email/vna-logo.png.
- Trạng thái xác nhận chuyến và trạng thái thanh toán được quản lý riêng. Nhận yêu cầu chưa đồng nghĩa chuyến đã được xác nhận hoặc đã thanh toán.

## Cài đặt và chạy

Yêu cầu Node.js ^20.19.0 hoặc >=22.12.0 theo package.json; MongoDB hỗ trợ transaction, ví dụ Atlas hoặc replica set. Dùng npm ci với package-lock.json đã commit.

Clone repo, mở hai terminal từ thư mục dự án. Trên PowerShell dùng npm.cmd nếu npm.ps1 bị chặn.

Backend:

~~~powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
# Điền MONGO_URI và JWT_SECRET trong .env; không commit file này.
npm.cmd run dev
~~~

Backend mặc định: http://localhost:8000. Để tạo tài khoản admin, điền ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD và chạy npm.cmd run create:admin.

Frontend:

~~~powershell
cd frontend
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
~~~

- Khách: http://localhost:5173/
- Admin: http://localhost:5173/admin
- Xem dữ liệu minh họa khi chạy dev: http://localhost:5173/?preview=1

VITE_API_BASE_URL là URL gốc backend, không thêm /api. Các biến VITE_ xuất hiện trong bundle trình duyệt; chỉ đưa cấu hình công khai vào frontend. Đăng nhập mock chỉ dùng khi phát triển với ALLOW_MOCK_LOGIN=true và không chạy production.

## Kiểm tra và build

~~~powershell
# Từ frontend
npm.cmd run build
npm.cmd run test:ui
npm.cmd run test:notifications
npm.cmd run test:admin

# Từ backend
npm.cmd run test:email
npm.cmd run test:api
npm.cmd run test:notifications
~~~

Test giao diện cần frontend đang chạy và Chrome; có thể đổi UI_BASE_URL và CHROME_PATH. Bộ test dùng response giả lập cho các thao tác ghi. Test API/thông báo cần kết nối MongoDB và dùng database kiểm thử riêng. Test email không gửi SMTP thật.

Lần cập nhật 09/10/2026: typecheck và build frontend thành công; 6/6 test email thành công. Các kết quả này chưa xác nhận giao dịch ZaloPay thật, SMTP thật, SDK trên thiết bị Zalo hoặc phát hành Mini App.

## Chuẩn bị triển khai

Backend dùng npm ci --omit=dev và npm start, nhận PORT từ môi trường. Cấu hình secret trên hosting, đặt NODE_ENV=production và ALLOW_MOCK_LOGIN=false. Frontend cần VITE_API_BASE_URL trỏ tới API HTTPS trước khi build. Web admin cần SPA fallback về index.html cho /admin/*. Bản build Mini App có app-config.json và danh sách asset do Vite tạo.

Đợt cập nhật này đưa source lên GitHub; chưa triển khai hosting hoặc Publish Zalo. Hướng dẫn cấu hình chi tiết nằm trong hai README thành phần.

## File được giữ và bỏ qua

Giữ mã nguồn, package.json, package-lock.json, .env.example, cấu hình build/Mini App, test, hai script kiểm tra UI, ảnh/font đang dùng, license font, nguồn tham khảo ảnh và logo email. Các fixture preview được source import nên vẫn cần commit.

Bỏ qua node_modules, dist/build, cache trình duyệt, báo cáo test, coverage, log, tmp/temp, .env và khóa riêng. Tài liệu nội bộ docs/, skills/, bản xuất thiết kế Stitch, seed local và script prepare-* giữ trên máy theo quy tắc hiện có; không cần để build. Không xóa dữ liệu hoặc file local khi gitignore.

## Giấy phép

Bản quyền thuộc VNA Group. Font Inter kèm license SIL OFL trong frontend/src/assets/fonts/Inter-OFL.txt; nguồn ảnh được ghi trong frontend/src/assets/stitch/.
