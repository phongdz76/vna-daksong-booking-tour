# vna-daksong-booking-tour
Zalo Mini App for VNA Group's Đắk Song tourism portal, allowing users to explore destinations, view tours, make bookings, and interact with VNA Group through Zalo OA. Built with React, TypeScript, Node.js, Express, and MongoDB.

## Trạng thái

Đã có bộ khung chạy local: React/TypeScript/ZaUI, router, Axios, Vite build và
Express health API theo cách tổ chức của TaskManager. Trang chủ hiện là màn hình
chờ nội dung. Chưa có giao diện booking, API nghiệp vụ, xác thực Zalo hoặc kết nối
MongoDB Atlas được kiểm chứng; chưa deploy hay thử SDK trên Zalo thật.

Theo thông báo mới, quyền/tài khoản làm việc trên Zalo đang chờ người phụ trách
thêm. Có thể tiếp tục làm UI, API và kiểm thử local; phần SDK và triển khai thật
cần đúng Mini App ID và quyền tương ứng.

## Cấu hình đã chọn và cách chạy

Giữ backend `routes → controllers → models`, frontend `pages/components/hooks/utils/types`
và Axios như TaskManager. Điều chỉnh cho Mini App: root DOM `app`, router ZaUI
trong runtime Zalo, asset tương đối, manifest CSS/JS sinh theo bản build, CORS cho
origin Zalo và adapter SDK riêng. Chưa sao chép luồng email/password hoặc phiên
`localStorage` của TaskManager.

[Chi tiết cấu hình, phần tái sử dụng và phần điều chỉnh](docs/cau-hinh-du-an.md).

Từ thư mục gốc, chạy ở hai terminal PowerShell:

```powershell
# Terminal 1
npm.cmd --prefix backend run dev
```

```powershell
# Terminal 2
npm.cmd --prefix frontend run dev
```

Mở `http://localhost:5173`. Trang `/_dev` chỉ có trong chế độ dev để kiểm tra API.
`GET /api/health` báo tiến trình chạy; `/api/health/ready` trả 503 khi DB chưa
kết nối. Dev vẫn chạy nếu MONGO_URI chưa điền; production yêu cầu DB kết nối.

```powershell
npm.cmd --prefix frontend run build
```

Build kiểm tra TypeScript và xuất `frontend/dist`, gồm `app-config.json` với tên
asset thực tế. Bộ khung chuẩn bị cho Zalo; khả năng SDK/OA hoạt động cần được thử
trên tài khoản và Mini App ID thật. `VITE_ZALO_OA_ID` là ID OA công khai, khác
Mini App ID; để trống đến khi VNA cung cấp đúng thông tin.

Đã kiểm tra: TypeScript và build production; manifest trỏ tới asset có thật;
route `/_dev` được loại khỏi bản production; build có cấu hình OA biên dịch được
SDK thành chunk bất đồng bộ. API đã qua kiểm tra HTTP cho health/readiness,
CORS/preflight, origin bị từ chối, 404, JSON lỗi và yêu cầu DB khi production.
Các kiểm tra dùng local; chưa gọi SDK hoặc kết nối Atlas thật.

Đã chạy thử trang chủ và `/_dev` bằng Chrome headless: React hiển thị được,
Axios gọi được API qua CORS và báo DB `not_configured`. Đã kiểm tra thêm trường
hợp cổng backend bị chiếm: startup báo lỗi, không báo đang lắng nghe nhầm.

## Nghiên cứu và hướng sáng tạo

Thông báo giao bài nhấn mạnh khả năng **nghiên cứu, thực hiện và sáng tạo**.
Định hướng đề xuất là giúp khách hiểu điểm đến, chọn trải nghiệm phù hợp rồi gửi
yêu cầu đặt tour để VNA xử lý. Hai hướng ưu tiên:

- **Mỗi điểm dừng, một câu chuyện:** nội dung địa phương tự biên tập, có nguồn và
  ngày kiểm tra; liên kết với tour thực sự có điểm dừng đó và mở lại từ lịch trình.
- **Đắk Song theo quỹ thời gian:** lọc tour theo thời lượng và chủ đề, giải thích
  vì sao phù hợp từ dữ liệu; thông báo rõ khi không có kết quả.

Luồng demo đề xuất: **khám phá → tour liên quan → chọn chuyến/số khách → kiểm tra
giá → gửi yêu cầu → VNA xác nhận → khách xem trạng thái**. Cho xem nội dung công
khai; dùng danh tính Zalo do backend xác minh khi đặt/xem đơn cá nhân. Booking
mới gửi ở trạng thái chờ xác nhận, chưa phải xác nhận chỗ hoặc thanh toán.

Đã tham khảo luồng chọn dịch vụ của
[Klook](https://www.klook.com/vi/activity/38096-da-lat-day-tour-discovering-new-tourist-attractions/),
hướng dẫn booking của
[Vietravel](https://vietravel.com/vn/tin-tuc-du-lich/huong-dan-dat-tour-du-lich-vietravel-voi-6-buoc-don-gian-v14344.aspx)
và các repo ZaUI. Gợi ý theo thời gian/sở thích đã có tiền lệ trong
[cổng du lịch Quảng Bình](https://dulich.quangtri.gov.vn/vi/detailnews/?id=news_12007&t=du-lich-quang-binh-khai-truong-cong-thong-tin-du-lich-va-ung-dung-du-lich-thong-minh).
Phần nhóm cần tự phát triển là nội dung Đắk Song, cách kết hợp trải nghiệm và mã
thực hiện; chưa tuyên bố ý tưởng độc nhất hoặc nhu cầu đã được người dùng xác nhận.

Chất liệu nghiên cứu ban đầu gồm thiên nhiên và văn hóa M’nông theo
[bài viết về Đắk Song ngày 29/05/2024](https://baolamdong.vn/dak-song-phat-huy-tiem-nang-du-lich-van-hoa-213978.html).
Cần VNA xác nhận tour, địa chỉ hiện hành, lịch, giá, nội dung và quyền dùng ảnh
trước khi đưa vào vận hành. Các template cần kiểm tra điều khoản sử dụng trước
khi lấy mã hoặc tài nguyên; xem phân tích cụ thể trong báo cáo.

- [Báo cáo nghiên cứu và kế hoạch — Markdown](docs/nghien-cuu-va-sang-tao.md)
- [Bản Word (.docx)](docs/VNA_Dak_Song_Bao_cao_nghien_cuu.docx)

Tài liệu phiên bản 0.2 ngày 07/10/2026 phân biệt rõ đề xuất, phần đã chuẩn bị và
phần chưa thực hiện. Khi hoàn thành dự án, bổ sung ảnh/demo, phạm vi đã làm và
kết quả kiểm thử thực tế vào báo cáo rồi xuất lại Word:

```powershell
node scripts/export-research-report.mjs
```

Mốc bàn giao theo đề bài: trước **08:00 ngày 12/10/2026**, giờ Việt Nam. Mục tiêu
là demo một luồng hoạt động và chứng minh quyết định riêng; phát hành công khai
còn phụ thuộc quy trình [xét duyệt Zalo](https://docs.zaloplatforms.com/docs/MA/intro/public-mini-program).

## Hướng dẫn sản phẩm và agent skill

[Skill VNA Đắk Song Mini App](skills/vna-daksong-miniapp/SKILL.md) ghi lại phạm vi,
luồng booking và cách agent triển khai theo stack đã chọn.

- [Luồng và màn hình](skills/vna-daksong-miniapp/references/product-flow.md)
- [Hướng giao diện, wireframe và repo tham khảo](skills/vna-daksong-miniapp/references/frontend-direction.md)
- [Cách xây dựng và triển khai](skills/vna-daksong-miniapp/references/implementation-deployment.md)

Các tài liệu là thiết kế đề xuất, chưa phải tính năng đã được lập trình.

## Công nghệ

- Frontend: React 18, TypeScript, Vite 7, ZMP SDK (`zmp-sdk`), ZaUI (`zmp-ui`).
- Điều hướng: React Router 6, cùng phiên bản major mà ZaUI sử dụng.
- HTTP client: Axios, theo cách tổ chức của TaskManager.
- Backend: Node.js, Express 5, MongoDB Atlas qua Mongoose 9, CORS, dotenv.
- Công cụ frontend: TypeScript, Vite và React plugin.
- Khi viết server, dùng chế độ `node --watch` có sẵn thay cho nodemon.
- Node.js: `^20.19.0 || >=22.12.0`; npm 10 được sử dụng khi thiết lập.

React 18 được chọn vì dependency `@react-spring/web@9.5.5` của ZaUI hiện khai báo
hỗ trợ React 16/17/18. Không dùng `--force` hay `--legacy-peer-deps` để bỏ qua xung đột.

## Cấu trúc theo TaskManager

```text
backend/
  config/          # Cấu hình và kết nối MongoDB
  routes/          # Khai báo endpoint
  controllers/     # Xử lý request và nghiệp vụ
  models/          # Mongoose schema
  middlewares/     # Xác thực, phân quyền, xử lý lỗi
  utils/           # Hàm dùng chung
frontend/
  src/
    pages/         # Màn hình
    components/    # Thành phần giao diện dùng chung
    hooks/         # React hooks
    context/       # State dùng chung
    routes/        # Điều hướng
    utils/         # API paths, HTTP client, helpers
    types/         # Kiểu dữ liệu TypeScript
```

Backend giữ cách phân lớp `routes → controllers → models` của TaskManager.
Các file `.gitkeep` đã được bỏ; những thư mục chưa có code chỉ tồn tại trên máy,
Git sẽ lưu chúng khi có file bên trong.
Frontend đặt trực tiếp trong `frontend/`, không lồng thêm thư mục tên ứng dụng.

## Cài thư viện khi clone repo

Chạy từ thư mục gốc:

```powershell
Set-Location frontend
npm.cmd ci
Set-Location ../backend
npm.cmd ci
Set-Location ..
```

Giữ cả hai file `package-lock.json` trong Git để các thành viên cài cùng phiên bản.
`node_modules/` không được commit.

## Cấu hình môi trường

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

Chỉ sao chép khi chưa có `.env` để tránh ghi đè cấu hình cá nhân.
Điền `MONGO_URI` bằng connection string của MongoDB Atlas trong `backend/.env`.
Giữ MongoDB credentials, Zalo app secret và access token ở backend.
Biến `VITE_*` là cấu hình công khai được đóng gói vào frontend.

Khi triển khai Mini App, cấu hình API HTTPS và CORS cho origin thực tế của Zalo.
Không sao chép cơ chế dùng `localStorage` của TaskManager sang Mini App;
sử dụng cơ chế lưu trữ phù hợp của ZMP SDK khi triển khai xác thực.

## Công cụ Zalo và kiểm tra dependency

ZMP SDK và ZaUI đã được cài. Chưa cài ZMP CLI trong repo: phiên bản CLI 4.0.3
kéo theo nhiều dependency cũ có cảnh báo bảo mật. Sẽ chọn công cụ Zalo phù hợp
khi cấu hình chạy và triển khai Mini App.

Kết quả audit khi thiết lập: backend có 0 cảnh báo; frontend còn 8 cảnh báo
(4 moderate, 4 high) trong cây dependency của ZMP SDK và ZaUI/React Router 6.
Chưa có cách sửa toàn bộ trong các phiên bản tương thích đã chọn; không ép hạ SDK
hoặc đổi major của dependency nội bộ bằng `npm audit fix --force`.

Chưa đăng nhập, tạo Mini App hoặc deploy. Bước cấu hình Zalo sẽ cần Mini App ID
và tài khoản có quyền quản lý tương ứng.

Tài liệu chính thức:

- [Khởi tạo project Zalo Mini App](https://docs.zaloplatforms.com/docs/MA/intro/getting-started/dev-use-command-line)
- [ZaUI](https://docs.zaloplatforms.com/docs/MA/zaui)
