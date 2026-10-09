# VNA Đắk Song Booking Tour - Backend

Backend REST API cho Mini App đặt tour VNA Đắk Song. Backend cung cấp:

- Danh mục điểm đến, bài viết và tour.
- Đăng nhập Zalo, đăng nhập mock khi phát triển và đăng nhập admin.
- Quản lý lịch khởi hành.
- Báo giá và đặt tour.
- Quản lý booking, trạng thái thanh toán và lịch sử trạng thái.
- Coupon giảm giá.
- Đánh giá tour.
- Thông báo cho người dùng.
- Upload ảnh lên Cloudinary.
- Tích hợp thanh toán ZaloPay.
- API dashboard cho admin.

Frontend Mini App nằm trong thư mục `../frontend`.

## 1. Công nghệ

- Node.js ESM, yêu cầu Node.js `20.19+` hoặc `22.12+`.
- Express `5`.
- MongoDB và Mongoose.
- JWT với thuật toán HS256.
- Bcrypt cho mật khẩu admin.
- Zalo Graph API cho xác thực người dùng Zalo.
- ZaloPay cho thanh toán.
- Cloudinary và Multer cho upload ảnh.
- Axios, Moment và CryptoJS cho tích hợp thanh toán.

## 2. Cấu trúc thư mục & Kiến trúc ứng dụng

### 2.1 Cấu trúc thư mục chi tiết

```text
backend/
├── config/                  # Cấu hình dịch vụ bên thứ 3 và cơ sở dữ liệu
│   ├── cloudinary.js        # Cấu hình Cloudinary Storage SDK
│   └── db.js                # Kết nối MongoDB với Mongoose
├── controllers/             # Layer xử lý nghiệp vụ chính (Business Logic)
│   ├── articleController.js # Quản lý bài viết cẩm nang du lịch
│   ├── authController.js    # Xác thực Zalo Mini App, Mock Login & Admin Login
│   ├── bookingController.js # Đặt tour, tính toán giá, giữ chỗ & quản lý đơn đặt
│   ├── couponController.js  # Mã giảm giá, kiểm tra điều kiện áp dụng
│   ├── departureController.js# Lịch khởi hành tour, giới hạn 50 khách/chuyến
│   ├── destinationController.js# Quản lý điểm đến du lịch
│   ├── notificationController.js# Thông báo hệ thống & đánh dấu đã đọc
│   ├── paymentController.js # Khởi tạo ZaloPay & xử lý callback IPN
│   ├── reviewController.js  # Đánh giá tour & tính lại điểm rating trung bình
│   └── tourController.js    # Quản lý danh mục tour, giá mở bán & bộ lọc
├── middlewares/             # Các Middleware xử lý request trung gian
│   ├── authMiddleware.js    # Protect (JWT), optionalProtect, adminOnly (Role Check)
│   ├── errorMiddleware.js   # Bắt lỗi 404 Route không tồn tại và Lỗi tập trung (500)
│   └── uploadMiddleware.js  # Multer Memory Storage (Upload ảnh, giới hạn 5MB)
├── models/                  # Mongoose Data Models & Schemas (Data Layer)
│   ├── Article.js           # Schema bài viết / tin tức
│   ├── Booking.js           # Schema đơn đặt tour, trạng thái & snapshot giá
│   ├── Coupon.js            # Schema mã giảm giá & giới hạn lượt dùng
│   ├── Departure.js         # Schema lịch khởi hành, số chỗ đã đặt (tối đa 50)
│   ├── Destination.js       # Schema điểm đến du lịch
│   ├── NotificationRead.js  # Schema theo dõi trạng thái đã đọc thông báo của User
│   ├── PaymentTransaction.js# Schema nhật ký giao dịch ZaloPay
│   ├── Review.js            # Schema đánh giá & bình luận tour
│   ├── Tour.js              # Schema thông tin tour, lịch trình & giá mở bán
│   └── User.js              # Schema thông tin người dùng, hạng thành viên & điểm tích lũy
├── routes/                  # Định nghĩa Endpoints & gán Middleware (Routing Layer)
│   ├── articleRoutes.js     # Route API cẩm nang bài viết
│   ├── authRoutes.js        # Route API đăng nhập & lấy profile
│   ├── bookingRoutes.js     # Route API tạo & quản lý đơn đặt tour
│   ├── couponRoutes.js      # Route API mã giảm giá
│   ├── departureRoutes.js   # Route API lịch khởi hành
│   ├── destinationRoutes.js # Route API điểm đến
│   ├── notificationRoutes.js# Route API thông báo người dùng
│   ├── paymentRoutes.js     # Route API thanh toán ZaloPay & Callback
│   ├── reviewRoutes.js      # Route API đánh giá tour
│   ├── tourRoutes.js        # Route API tour du lịch
│   └── uploadRoutes.js      # Route API upload ảnh lên Cloudinary
├── scripts/                 # Kịch bản hỗ trợ phát triển & khởi tạo dữ liệu
│   ├── seed.js              # Dữ liệu mẫu (Tours, Destinations, Articles, Departures)
│   └── seedTestUsers.js     # Khởi tạo 3 user test theo các hạng thành viên
├── tests/                   # Kịch bản kiểm thử API tự động
│   ├── all-api.test.mjs     # Test suite tổng hợp toàn bộ API
│   └── notifications.test.mjs# Test suite kiểm tra chức năng thông báo
├── utils/                   # Helper utilities & Dịch vụ phụ trợ
│   ├── email.js             # Dịch vụ gửi email xác nhận đặt tour qua Nodemailer (Gmail SMTP)
│   └── reviewStats.js       # Tính toán lại số lượt đánh giá & điểm trung bình của Tour
├── createAdmin.js           # Script khởi tạo tài khoản Admin đầu tiên từ file .env
├── server.js                # Entry point chính của Express Server
├── package.json             # Khai báo dependencies & npm scripts
└── .env.example             # Mẫu khai báo biến môi trường
```

### 2.2 Mô hình kiến trúc phân tầng (Layered Architecture)

Hệ thống được thiết kế theo mô hình **MVC / Layered Architecture** chuẩn RESTful API:

```text
[Client: Zalo Mini App / Admin Dashboard]
                  │
                  ▼
         ┌────────────────┐
         │   server.js    │ (Express App & Global Middlewares)
         └───────┬────────┘
                 │
                 ▼
         ┌────────────────┐
         │ Routing Layer  │ (routes/*.js - Express Router + Auth/Upload Middlewares)
         └───────┬────────┘
                 │
                 ▼
         ┌────────────────┐
         │Controller Layer│ (controllers/*.js - Business Logic, Validation, Email & Payment)
         └───────┬────────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
┌──────────────┐   ┌──────────────┐
│  Data Layer  │   │   Services   │
│ (models/*.js)│   │ (utils, SDKs)│
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│   MongoDB    │   │  Cloudinary /│
│   Database   │   │ZaloPay / SMTP│
└──────────────┘   └──────────────┘
```

1. **Routing Layer (`routes/`)**: tiếp nhận yêu cầu từ client, ánh xạ đường dẫn URL và áp dụng các filter middleware thích hợp (`protect`, `adminOnly`, `upload`).
2. **Controller Layer (`controllers/`)**: chứa toàn bộ logic xử lý nghiệp vụ chính:
   - Tính toán tổng tiền tour (giá người lớn, trẻ em, áp dụng voucher khuyến mãi).
   - Kiểm tra và tự động cập nhật số chỗ khả dụng của lịch khởi hành (tối đa 50 khách/chuyến).
   - Xử lý tích điểm thưởng (`points`) và nâng hạng thành viên (`standard` ➔ `silver` ➔ `gold` ➔ `diamond`).
   - Khởi tạo giao dịch ZaloPay & xác thực chữ ký bảo mật HMAC-SHA256 khi nhận IPN callback.
   - Gọi dịch vụ Nodemailer gửi email xác nhận tự động cho khách hàng.
3. **Data Layer (`models/`)**: quản lý truy xuất cơ sở dữ liệu MongoDB thông qua Mongoose ORM với các Schema được định nghĩa chặt chẽ, tối ưu index và tính nhất quán dữ liệu.
4. **Services & Utilities (`utils/`, `config/`)**: tích hợp các dịch vụ bên ngoài như Cloudinary (lưu trữ hình ảnh), Gmail SMTP (gửi thông báo email), Zalo Graph API (xác thực token).

## 3. Cài đặt

```powershell
cd backend
npm install
```

Tạo file môi trường từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Không commit `.env`. Các secret chỉ được đặt ở server hoặc secret manager.

## 4. Biến môi trường

### Tối thiểu để chạy API

```env
PORT=8000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/vna_daksong
JWT_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
```

`JWT_SECRET` được dùng để ký session token và quote token. Không dùng secret ngắn hoặc secret mặc định.

### Đăng nhập Zalo

```env
ZALO_APP_SECRET=<App Secret của Mini App>
```

Backend gọi Zalo Graph API để xác thực `accessToken` do Mini App gửi lên. App Secret không được đưa vào frontend hoặc biến `VITE_*`.

### Mock login development

```env
NODE_ENV=development
ALLOW_MOCK_LOGIN=true
```

Mock login luôn bị từ chối khi `NODE_ENV=production` hoặc `ALLOW_MOCK_LOGIN` khác `true`. Production phải đặt:

```env
NODE_ENV=production
ALLOW_MOCK_LOGIN=false
```

### Admin

Các biến này được dùng bởi `npm run create:admin`:

```env
ADMIN_NAME=VNA Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<tối thiểu 8 ký tự, tối đa 72 byte>
```

### Cloudinary

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### SMTP gửi email xác nhận đặt tour

Khi khách nhập email ở bước thông tin liên hệ, backend gửi email xác nhận yêu cầu đặt tour sau khi booking được tạo. Cấu hình SMTP trong `backend/.env`:

```env
EMAIL_USER=email-cua-ban@gmail.com
EMAIL_PASS=gmail-app-password
```

Backend dùng Nodemailer với `service: "gmail"`, giống project TaskManager. `EMAIL_PASS` phải là Gmail App Password, không phải mật khẩu Gmail thông thường. Nếu chưa cấu hình email, booking vẫn được tạo nhưng backend sẽ ghi log cảnh báo và không gửi email.

### ZaloPay

```env
ZALOPAY_APP_ID=
ZALOPAY_KEY1=
ZALOPAY_KEY2=
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
```

Dùng credential sandbox khi development và credential production riêng khi phát hành. `CLIENT_URL` được dùng để tạo `redirecturl` cho giao dịch:

```env
CLIENT_URL=http://localhost:5173
```

## 5. Chạy server

Development với Nodemon:

```powershell
npm run dev
```

Production:

```powershell
npm start
```

Server mặc định chạy tại `http://localhost:8000`.

Health/root endpoint:

```http
GET /
```

Response:

```json
{
  "service": "VNA Dak Song Booking API"
}
```

API base URL:

```text
http://localhost:8000/api
```

## 6. Authentication và phân quyền

### Session token

Các endpoint private nhận:

```http
Authorization: Bearer <token>
```

JWT session có issuer `vna-daksong-api`, audience `session`, thời hạn 1 ngày. Backend luôn đọc role và trạng thái active từ database, không tin role tự chèn trong JWT.

### Middleware

- `protect`: bắt buộc token hợp lệ và user đang active.
- `optionalProtect`: không có token thì tiếp tục như guest; nếu có token thì phải xác thực.
- `adminOnly`: yêu cầu `req.user.role === "admin"`.

### Quyền

| Vai trò | Quyền |
|---|---|
| Guest | Đọc nội dung public, xem tour và lấy quote |
| User | Đăng nhập, lưu tour, đặt tour, xem/hủy đơn của mình, thanh toán, đánh giá, xem thông báo |
| Admin | Đăng nhập admin và quản lý dữ liệu, booking, coupon, upload, refund, dashboard |

## 7. Danh sách API

Tất cả endpoint bên dưới có prefix `/api`.

### 7.1. Authentication

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| POST | `/auth/zalo` | Public | Đổi Zalo access token thành session |
| POST | `/auth/mock` | Development | Tạo/đăng nhập user mock bằng tên và số điện thoại |
| POST | `/auth/admin/login` | Public | Admin đăng nhập bằng email và mật khẩu |
| GET | `/auth/me` | User | Lấy profile user hiện tại |

`POST /auth/zalo` body:

```json
{
  "accessToken": "zalo-access-token"
}
```

`POST /auth/mock` body:

```json
{
  "name": "Khách thử nghiệm",
  "phone": "0900000000"
}
```

`POST /auth/admin/login` body:

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

Response session thành công có dạng:

```json
{
  "user": {},
  "token": "...",
  "tokenType": "Bearer",
  "expiresIn": 86400
}
```

### 7.2. Destinations

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/destinations` | Public/optional | Danh sách điểm đến |
| GET | `/destinations/:id` | Public/optional | Chi tiết điểm đến |
| POST | `/destinations` | Admin | Tạo điểm đến |
| PUT/PATCH | `/destinations/:id` | Admin | Cập nhật điểm đến |
| DELETE | `/destinations/:id` | Admin | Archive/xóa điểm đến theo nghiệp vụ |

### 7.3. Articles

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/articles` | Public/optional | Danh sách bài viết |
| GET | `/articles/:id` | Public/optional | Chi tiết bài viết |
| POST | `/articles` | Admin | Tạo bài viết |
| PUT/PATCH | `/articles/:id` | Admin | Cập nhật bài viết |
| DELETE | `/articles/:id` | Admin | Xóa/archive bài viết |

Bài viết và điểm đến draft không hiển thị cho guest. Một số thông báo xuất bản được tạo khi nội dung được publish.

### 7.4. Tours

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/tours` | Public/optional | Danh sách tour |
| GET | `/tours/:id` | Public/optional | Chi tiết tour |
| GET | `/tours/saved` | User | Tour đã lưu của user |
| POST | `/tours/:id/save` | User | Lưu/bỏ lưu tour |
| POST | `/tours` | Admin | Tạo tour |
| PUT/PATCH | `/tours/:id` | Admin | Cập nhật tour |
| DELETE | `/tours/:id` | Admin | Archive/xóa tour |
| GET | `/tours/:id/departures` | Public/optional | Lịch khởi hành của tour |
| GET | `/tours/:id/reviews` | Public/optional | Review của tour |
| GET | `/tours/:id/reviews/eligibility` | User | Kiểm tra user có được review không |
| POST | `/tours/:id/reviews` | User | Tạo review |

Query thường dùng cho `GET /tours`:

```text
q
status                 # admin có thể đọc draft/published/archived
destinationId
theme                  # nature, culture, food, history
maxDurationHours
dateFrom
dateTo
minPrice
maxPrice
sort                   # newest, duration, price_asc, price_desc, most_bought
page
limit
```

Tìm kiếm `q` là tìm chuỗi con, không phân biệt hoa thường, trên tên, summary và description.

### 7.5. Departures

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/departures` | Admin | Danh sách lịch khởi hành |
| GET | `/departures/:id` | Admin | Chi tiết lịch |
| POST | `/departures` | Admin | Tạo lịch |
| PUT/PATCH | `/departures/:id` | Admin | Cập nhật lịch |
| DELETE | `/departures/:id` | Admin | Xóa/đóng lịch |

Lịch của một tour được đọc qua `GET /tours/:id/departures`.

Departure kiểm tra trạng thái `open`, `bookingDeadline` và `departureAt` trước khi cho quote hoặc đặt tour.

### 7.6. Booking và quote

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| POST | `/bookings/quote` | Public/optional | Tính báo giá |
| POST | `/bookings` | User | Tạo booking |
| GET | `/bookings/mine` | User | Danh sách booking của user |
| GET | `/bookings/:id` | User/Admin | Chi tiết booking được phép xem |
| PATCH | `/bookings/:id/cancel` | User | User hủy booking đủ điều kiện |
| GET | `/bookings` | Admin | Danh sách toàn hệ thống |
| PATCH | `/bookings/:id/status` | Admin | Đổi trạng thái booking |
| GET | `/bookings/dashboard-data` | Admin | Thống kê dashboard |

`POST /bookings/quote` body:

```json
{
  "departureId": "ObjectId",
  "adults": 2,
  "children": 1,
  "couponCode": "WELCOME10"
}
```

Quote token có thời hạn tối đa 10 phút và khóa snapshot giá tại thời điểm báo giá.

`POST /bookings` yêu cầu:

```http
Authorization: Bearer <user-token>
Idempotency-Key: <chuỗi tối thiểu 8 ký tự>
```

Body tối thiểu:

```json
{
  "quoteToken": "...",
  "contact": {
    "name": "Nguyễn Văn A",
    "phone": "0900000000"
  },
  "note": "",
  "couponCode": "WELCOME10",
  "paymentMethod": "cash_on_arrival"
}
```

Nếu gửi lại cùng `Idempotency-Key` và cùng payload, backend trả lại booking cũ. Nếu dùng cùng key cho payload khác, backend trả `409`.

Trạng thái booking:

```text
pending_confirmation
confirmed
completed
cancelled
rejected
```

Trạng thái thanh toán:

```text
unpaid
paid
refund_pending
refunded
```

Hai nhóm trạng thái độc lập. Booking lưu snapshot tour, lịch, giá, giảm giá và chính sách để dữ liệu đơn không thay đổi khi catalog thay đổi.

Khi admin chuyển booking sang `completed`, backend tính điểm thưởng (`10.000 đ = 1 điểm`), cộng `loyaltyPoints` và tự động cập nhật hạng thành viên:

```text
Dưới 1.000 điểm      -> Hạng Bạc
Từ 1.000 - 4.999 điểm -> Hạng Vàng
Từ 5.000 điểm trở lên -> Hạng Kim Cương
```

Hạng thành viên hiện chưa tự tạo giảm giá. Giảm giá thực tế chỉ đến từ coupon hợp lệ.

### 7.7. Coupons

Tất cả endpoint coupon yêu cầu Admin:

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/coupons` | Danh sách coupon |
| POST | `/coupons` | Tạo coupon |
| PUT | `/coupons/:id` | Cập nhật coupon |
| DELETE | `/coupons/:id` | Xóa/vô hiệu hóa coupon |

Trường chính:

```json
{
  "code": "WELCOME10",
  "description": "Giảm cho khách mới",
  "discountType": "percentage",
  "discountValue": 10,
  "maxDiscount": 200000,
  "minOrderValue": 500000,
  "validFrom": "2026-01-01T00:00:00.000Z",
  "validUntil": "2026-12-31T23:59:59.000Z",
  "usageLimit": 100,
  "isActive": true
}
```

Hỗ trợ giảm phần trăm hoặc số tiền cố định. Backend kiểm tra thời gian hiệu lực, số lượt dùng, đơn tối thiểu và giới hạn giảm tối đa.

### 7.8. Reviews

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| POST | `/tours/:tourId/reviews` | User | Tạo review |
| PATCH | `/reviews/:id` | Chủ review | Sửa review |
| DELETE | `/reviews/:id` | Chủ review | Xóa review |
| GET | `/tours/:tourId/reviews` | Public/optional | Danh sách và thống kê |
| GET | `/tours/:tourId/reviews/eligibility` | User | Kiểm tra điều kiện |

User chỉ được review tour đã có booking `completed`, mỗi user chỉ có một review cho mỗi tour. Review có rating và nội dung; thống kê trung bình/phân bố sao được tính từ dữ liệu review.

### 7.9. Notifications

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | `/notifications` | Public/optional | Lấy thông báo theo user nếu đã đăng nhập |
| PATCH | `/notifications/:id/read` | User | Đánh dấu một thông báo đã đọc |
| PATCH | `/notifications/read-all` | User | Đánh dấu tất cả đã đọc |

Thông báo được giới hạn theo user hiện tại. Read state không được chia sẻ giữa các tài khoản.

### 7.10. Payments - ZaloPay

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| POST | `/payments/zalopay/create` | User | Tạo giao dịch |
| POST | `/payments/zalopay/webhook` | ZaloPay | Nhận callback |
| POST | `/payments/zalopay/:appTransId/query` | User | Đối soát giao dịch |
| POST | `/payments/zalopay/:appTransId/refund` | Admin | Tạo yêu cầu hoàn tiền |
| POST | `/payments/zalopay/:appTransId/refund/query` | Admin | Kiểm tra hoàn tiền |

Backend ký request/kiểm tra callback bằng key ZaloPay. Kết quả timeout hoặc provider không rõ ràng không được tự coi là thanh toán thành công. Chỉ khi backend ghi nhận `paymentStatus=paid` thì frontend mới hiển thị đã thanh toán.

Webhook phải là URL HTTPS public và không yêu cầu JWT:

```text
POST https://<backend-domain>/api/payments/zalopay/webhook
```

### 7.11. Upload

| Method | Endpoint | Quyền | Content-Type |
|---|---|---|---|
| POST | `/upload` | Admin | `multipart/form-data` |

Tên field file là `image`. Chỉ nhận file ảnh, lưu trong memory và upload lên Cloudinary folder `vna-daksong`. Kích thước tối đa 5 MB. Response trả `url` và `public_id`.

## 8. Models và trạng thái dữ liệu

### User

- `name`, `zaloId`, `email`, `avatar`.
- `role`: `user` hoặc `admin`.
- `active`.
- `savedTours`.
- `membershipTier`: `Bạc`, `Vàng`, `Kim Cương`.
- `loyaltyPoints`.
- Mật khẩu admin được lưu hash và không trả trong JSON.

### Tour

- `name`, `slug`, `summary`, `description`.
- `durationHours`, `themes`, `destinationIds`.
- `itinerary`, `images`, `meetingPoint`.
- `includes`, `excludes`, `childPolicy`, `cancellationPolicy`.
- `status`: `draft`, `published`, `archived`.
- `soldCount`.
- Có text index trên name, summary, description.

### Departure

- `tourId`.
- `departureAt`, `bookingDeadline`.
- `adultPrice`, `childPrice`.
- `maxGuestsPerBooking`.
- `maxCapacity`: Sức chứa tối đa của chuyến (mặc định 50 khách).
- `status`: `open` hoặc `closed`. Tự động chuyển `closed` hoặc báo `409 Conflict` khi đã hết chỗ.

### Destination

Điểm đến có nội dung mô tả, slug, category, ảnh, địa chỉ, nguồn và trạng thái xuất bản.

### Article

Bài viết có title, slug, summary, content, category, ảnh, nguồn và trạng thái draft/published/archived.

### Booking

Booking liên kết user, tour, departure và snapshot giá. Có:

- `code`.
- `adults`, `children`, `contact`, `note`.
- `status`, `paymentStatus`, `paymentMethod`.
- `couponCode`, `couponId`.
- `history`.
- Tự động gửi email xác nhận đặt tour qua Gmail SMTP (Nodemailer) tới email liên hệ của khách hàng.
- `idempotencyKey` và `requestHash` được ẩn khỏi response public.

### Coupon

Hỗ trợ `percentage` và `fixed`, giới hạn thời gian, số lượt dùng, đơn tối thiểu và mức giảm tối đa.

### PaymentTransaction

Lưu giao dịch ZaloPay, `appTransId`, số tiền, trạng thái provider, mã giao dịch ZaloPay, callback và thông tin refund.

### Review

Lưu tour, user, rating, nội dung và timestamp. Có ràng buộc không review trùng theo user/tour.

### NotificationRead

Lưu trạng thái đọc theo user và notification event.

## 9. Luồng nghiệp vụ chính

### Đặt tour

```text
Chọn departure
  -> POST /bookings/quote
  -> nhận quoteToken và snapshot giá
  -> user đăng nhập
  -> POST /bookings với Bearer + Idempotency-Key
  -> backend kiểm tra quote, tồn tại departure, trạng thái và sức chứa
  -> tạo booking trong MongoDB transaction
  -> trả booking pending_confirmation
```

### Xác nhận và hoàn thành

```text
pending_confirmation
  -> admin xác nhận: confirmed
  -> sau chuyến đi admin hoàn thành: completed
  -> cộng loyalty points và cập nhật hạng
```

Từ chối/hủy booking đã thanh toán có thể tạo trạng thái cần hoàn tiền tùy nghiệp vụ thanh toán.

### Thanh toán

```text
booking unpaid
  -> create ZaloPay order
  -> user thanh toán
  -> ZaloPay webhook hoặc query
  -> backend kiểm tra chữ ký, số tiền và transaction
  -> cập nhật paid/refund_pending/refunded
```

## 10. Tạo admin và dữ liệu test

### Tạo admin

Điền `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` trong `.env`, sau đó:

```powershell
npm run create:admin
```

Script không ghi đè admin đã tồn tại.

### Seed dữ liệu mẫu

`backend/scripts/seed.js` xóa các departure, tour, article và destination hiện có rồi tạo dữ liệu mẫu. Chỉ chạy trên database development:

```powershell
node scripts/seed.js
```

Không chạy script này trên production.

### Tạo ba user test theo hạng

`backend/scripts/seedTestUsers.js` tạo/cập nhật:

| Hạng | Zalo ID mặc định | Điểm |
|---|---|---:|
| Bạc | `mock_test_bac` | 0 |
| Vàng | `mock_test_vang` | 1.000 |
| Kim Cương | `mock_test_kimcuong` | 5.000 |

Chạy:

```powershell
node scripts/seedTestUsers.js
```

Để login mock theo số điện thoại của frontend, đặt Zalo ID tương ứng dạng `mock_<phone>` trước khi chạy script.

## 11. Error response

Lỗi thường có dạng:

```json
{
  "message": "Mô tả lỗi",
  "code": "ERROR_CODE"
}
```

Các nhóm lỗi chính:

- `401`: thiếu hoặc token không hợp lệ.
- `403`: không đủ quyền hoặc tài khoản bị khóa.
- `404`: resource/API không tồn tại.
- `409`: xung đột trạng thái, duplicate hoặc idempotency key khác payload.
- `400`: input/validation không hợp lệ.
- `413`: payload/file quá lớn.
- `503`: thiếu cấu hình hoặc MongoDB không hỗ trợ transaction.
- `500`: lỗi xử lý server.

## 12. Test

Backend test dùng MongoDB và tự khởi động server test:

```powershell
npm run test:api
npm run test:notifications
```

Test API bao phủ auth, phân quyền, catalog, booking, quote, coupon, review, thanh toán ZaloPay, idempotency, refund và các lỗi đầu vào. Test notification bao phủ quyền xem, phân trang, read/read-all và thông báo phát hành nội dung.

Không chạy test trên database production. Nên dùng database test riêng trong `.env` hoặc môi trường CI.

## 13. Deploy

Backend có thể chạy trên Render, Railway, Fly.io, VPS hoặc container Node.js.

Quy trình cơ bản:

```powershell
cd backend
npm ci
npm start
```

Production cần:

1. MongoDB Atlas hoặc MongoDB replica set vì booking dùng transaction.
2. HTTPS public cho API.
3. Secret production riêng.
4. `NODE_ENV=production`.
5. `ALLOW_MOCK_LOGIN=false`.
6. Zalo App Secret đúng với Mini App đang chạy.
7. Cloudinary production nếu dùng upload.
8. ZaloPay production credentials nếu bật thanh toán.
9. Webhook ZaloPay trỏ về backend public.
10. Không chạy seed dữ liệu mẫu trên production.

Sau deploy, kiểm tra:

```text
GET https://<backend-domain>/
GET https://<backend-domain>/api/tours
```

## 14. Checklist bàn giao

- [ ] Đã tạo `.env` từ `.env.example`.
- [ ] `MONGO_URI` trỏ đúng database cần dùng.
- [ ] `JWT_SECRET` dài và ngẫu nhiên.
- [ ] Đã tạo admin bằng `npm run create:admin`.
- [ ] Đã seed dữ liệu development nếu cần.
- [ ] Đã test Zalo login với App Secret đúng.
- [ ] Đã test quote và booking bằng user test.
- [ ] Đã test idempotency khi gửi lại request.
- [ ] Đã test admin đổi trạng thái booking.
- [ ] Đã test coupon hợp lệ/hết hạn/hết lượt.
- [ ] Đã test review sau booking completed.
- [ ] Đã test webhook/query ZaloPay nếu bật payment.
- [ ] Đã test upload ảnh lên Cloudinary.
- [ ] Đã tắt mock login khi production.
- [ ] Đã cấu hình HTTPS và webhook public.

## 15. Lưu ý an toàn

- Không commit `.env`, MongoDB URI, JWT secret, Cloudinary secret hoặc ZaloPay key.
- Không gửi secret trong frontend.
- Không dùng database production cho seed/test.
- Không bật `ALLOW_MOCK_LOGIN` ở production.
- Không coi timeout của ZaloPay là thanh toán thất bại hoặc thành công nếu chưa đối soát.
- Không dùng tổng tiền do frontend tự tính để ghi nhận booking; backend dùng quote snapshot.
- Giữ `Idempotency-Key` khi retry request tạo booking sau lỗi mạng.

## Mẫu email ghi nhận đặt tour

Email gửi sau khi tạo booking dùng mẫu HTML màu xanh VNA, kèm bản văn bản thuần
và logo nhúng trong thư. Trạng thái chuyến/thanh toán và giá lấy từ booking đã lưu;
ảnh bìa lấy từ tour hiện tại nếu có. Không dùng email ghi nhận để báo đã xác nhận
chuyến hoặc đã thu tiền khi backend chưa ghi nhận các trạng thái đó.

`EMAIL_APP_URL` là URL gốc của giao diện khách đã triển khai, dùng để tạo nút mở
`/my-bookings/:id`. Không cấu hình URL thì thư hướng dẫn mở mục Đơn hàng trong
Mini App. `EMAIL_SUPPORT_PHONE` và `EMAIL_SUPPORT_ADDRESS` là thông tin hỗ trợ
tùy chọn. Các biến này được mô tả trong `.env.example`; không đưa bí mật vào HTML.

Chạy `npm run preview:email` để tạo `test-results/booking-email-preview.html`
với dữ liệu minh họa và ảnh nhúng; không gửi email. Chạy `npm run test:email`
để kiểm tra nội dung, escape dữ liệu, giờ Việt Nam và MIME bằng transport offline.

## Cập nhật bàn giao 09/10/2026

- Cài dependency từ lockfile bằng npm.cmd ci. Lệnh chạy: npm.cmd run dev hoặc npm.cmd start. Trên PowerShell dùng npm.cmd nếu npm.ps1 bị chặn.
- Email yêu cầu đặt tour dùng Nodemailer, config/mailer.js, utils/email.js và assets/email/vna-logo.png. Cần EMAIL_USER và EMAIL_PASS (Gmail App Password); EMAIL_APP_URL cấu hình link mở đơn. EMAIL_SUPPORT_PHONE và EMAIL_SUPPORT_ADDRESS là liên hệ hỗ trợ hiển thị trong email. Thiếu cấu hình SMTP thì bỏ qua email; email nhận yêu cầu chưa phải xác nhận chuyến.
- npm.cmd run test:email kiểm tra nội dung, snapshot giá, timezone Việt Nam, escape HTML, trạng thái chuyến/thanh toán và MIME có logo; không gửi email thật. Đợt này đã qua 6/6 test. npm.cmd run preview:email tạo bản xem mẫu local trong thư mục kết quả kiểm thử.
- GET /api/coupons/available trả ưu đãi khả dụng; giá và điều kiện được kiểm tra lại tại API quote/booking. Admin tạo ưu đãi để backend sinh mã.
- Các script scripts/seed.js và scripts/seedTestUsers.js được giữ local, không có trong clone GitHub. Không cần chạy seed để khởi động với database đã có dữ liệu. Tạo admin bằng createAdmin.js là công cụ được commit.
- Test API và thông báo dùng database tạm riêng trên MongoDB; cần tài khoản có quyền tạo/xóa database kiểm thử. Kết quả test-results/ là file sinh tự động, không commit.
- CLIENT_URL hiện được dùng cho URL chuyển về frontend sau thanh toán. server.js hiện gọi cors() cho phép origin mặc định; CLIENT_URL không thiết lập CORS allowlist.
- Secret chỉ nằm trong .env hoặc môi trường hosting. Giữ .env.example và package-lock.json trong Git. Với production dùng npm ci --omit=dev, npm start, NODE_ENV=production và ALLOW_MOCK_LOGIN=false.

Đợt cập nhật này chỉ push source lên GitHub, chưa triển khai hosting, chưa thử SMTP/ZaloPay thật hoặc xác minh Zalo trên thiết bị.
