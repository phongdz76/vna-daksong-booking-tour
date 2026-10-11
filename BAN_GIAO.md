# Tài Liệu Bàn Giao & Hướng Dẫn Vận Hành Dự Án
## Hệ Thống Đặt Tour Du Lịch Sinh Thái VNA Đắk Song (Zalo Mini App & Web Portal)

Tài liệu này được biên soạn cho hai nhóm đối tượng tiếp nhận:
- Mục I: Dành cho người không học IT (Hướng dẫn từng bước trực quan, thao tác đơn giản trên giao diện đồ họa).
- Mục II: Dành cho lập trình viên và kỹ sư IT (Quy trình dòng lệnh CLI, kiến trúc hệ thống, kiểm thử tự động và triển khai Production).

Kho lưu trữ GitHub: https://github.com/phongdz76/vna-daksong-booking-tour.git

---

## MỤC LỤC TỔNG QUAN

- [MỤC I: HƯỚNG DẪN DÀNH CHO NGƯỜI KHÔNG HỌC IT](#mục-i-hướng-dẫn-dành-cho-người-không-học-it)
  - [1. Cài đặt các phần mềm cần thiết (Chỉ làm 1 lần duy nhất)](#1-cài-đặt-các-phần-mềm-cần-thiết-chỉ-làm-1-lần-duy-nhất)
  - [2. Tải dự án từ GitHub về máy tính](#2-tải-dự-án-từ-github-về-máy-tính)
  - [3. Mở dự án và cài đặt thư viện](#3-mở-dự-án-và-cài-đặt-thư-viện)
  - [4. Cấu hình thông số kết nối (.env)](#4-cấu-hình-thông-số-kết-nối-env)
  - [5. Khởi chạy hệ thống](#5-khởi-chạy-hệ-thống)
    - [Lựa chọn 1: Xem và thử nghiệm ngay trên trình duyệt máy tính (Khuyên dùng)](#lựa-chọn-1-xem-và-thử-nghiệm-ngay-trên-trình-duyệt-máy-tính-khuyên-dùng)
    - [Lựa chọn 2: Mở ứng dụng Zalo Mini App trên điện thoại](#lựa-chọn-2-mở-ứng-dụng-zalo-mini-app-trên-điện-thoại)
  - [6. Bảng xử lý các sự cố thường gặp cho người mới](#6-bảng-xử-lý-các-sự-cố-thường-gặp-cho-người-mới)
- [MỤC II: HƯỚNG DẪN DÀNH CHO LẬP TRÌNH VIÊN VÀ KỸ SƯ IT](#mục-ii-hướng-dẫn-dành-cho-lập-trình-viên-và-kỹ-sư-it)
  - [1. Yêu cầu hệ thống (Prerequisites)](#1-yêu-cầu-hệ-thống-prerequisites)
  - [2. Quy trình khởi động nhanh (Quick Start CLI)](#2-quy-trình-khởi-động-nhanh-quick-start-cli)
  - [3. Đặc tả biến môi trường (Environment Variables Specification)](#3-đặc-tả-biến-môi-trường-environment-variables-specification)
  - [4. Kiến trúc hệ thống và luồng xử lý dữ liệu](#4-kiến-trúc-hệ-thống-và-luồng-xử-lý-dữ-liệu)
  - [5. Các chế độ chạy phát triển (Development & Tunneling Workflows)](#5-các-chế-độ-chạy-phát-triển-development--tunneling-workflows)
  - [6. Bộ lệnh kiểm thử tự động và quản trị dữ liệu](#6-bộ-lệnh-kiểm-thử-tự-động-và-quản-trị-dữ-liệu)
  - [7. Cơ chế xác thực Zalo và lưu ý bảo mật địa chỉ IP](#7-cơ-chế-xác-thực-zalo-và-lưu-ý-bảo-mật-địa-chỉ-ip)
  - [8. Quy trình Build và Triển khai Production](#8-quy-trình-build-và-triển-khai-production)
  - [9. Tài liệu tham chiếu](#9-tài-liệu-tham-chiếu)

---

# MỤC I: HƯỚNG DẪN DÀNH CHO NGƯỜI KHÔNG HỌC IT

Phần này được thiết kế để bất kỳ ai không có kiến thức kỹ thuật lập trình cũng có thể tự thao tác từng bước để tải và khởi chạy hệ thống trên máy tính của mình.

## 1. Cài đặt các phần mềm cần thiết (Chỉ làm 1 lần duy nhất)

Máy tính Windows của bạn cần có 2 phần mềm miễn phí nền tảng sau:

### 1.1 Node.js (Bộ công cụ giúp máy tính đọc và chạy được mã nguồn)
- Bước 1: Mở trình duyệt web, truy cập đường link: https://nodejs.org
- Bước 2: Nhấp chuột vào nút màu xanh có chữ LTS (Recommended for Most Users) để tải bản ổn định (v20 hoặc v22).
- Bước 3: Mở file cài đặt vừa tải về trong thư mục Downloads của máy tính.
- Bước 4: Bấm nút Next liên tục -> Đánh dấu tích vào ô đồng ý điều khoản "I accept the terms in the License Agreement" -> Tiếp tục bấm Next -> Install -> Chọn Finish khi cài đặt hoàn tất.

### 1.2 Visual Studio Code (VS Code - Phần mềm mở xem và quản lý dự án)
- Bước 1: Truy cập đường link: https://code.visualstudio.com
- Bước 2: Bấm vào nút Download for Windows.
- Bước 3: Mở file vừa tải về, bấm Next qua các bước cho đến khi cài đặt xong rồi bấm Finish.

---

## 2. Tải dự án từ GitHub về máy tính

Khuyên dùng cách tải trực tiếp file nén ZIP để thao tác nhanh nhất bằng chuột:
1. Mở trình duyệt web và truy cập đường link GitHub của dự án:
   https://github.com/phongdz76/vna-daksong-booking-tour
2. Nhấp chuột vào nút màu xanh lá cây có chữ Code ở góc trên bên phải của danh sách tập tin.
3. Nhấp chọn dòng Download ZIP trong bảng thả xuống.
4. Mở thư mục Downloads trên máy tính -> Nhấp chuột phải vào file ZIP vừa tải về -> Chọn Extract All... (hoặc Giải nén tại đây).
5. Bạn sẽ thu được một thư mục chứa toàn bộ mã nguồn của dự án có tên `vna-daksong-booking-tour`.

---

## 3. Mở dự án và cài đặt thư viện

### 3.1 Mở thư mục dự án bằng VS Code
1. Mở phần mềm Visual Studio Code trên máy tính.
2. Trên thanh menu trên cùng, bấm File -> Chọn Open Folder... (hoặc Mở thư mục).
3. Tìm và chọn đúng thư mục `vna-daksong-booking-tour` vừa giải nén ở Bước 2 -> Bấm nút Select Folder.
4. Nếu VS Code hiển thị hộp thoại hỏi "Do you trust the authors of the files in this folder?", hãy nhấp vào nút xanh Yes, I trust the authors.

### 3.2 Mở khung gõ lệnh (Terminal) trong VS Code
1. Trên thanh menu trên cùng của VS Code, chọn Terminal -> New Terminal (hoặc nhấn tổ hợp phím Ctrl + ` cạnh phím số 1 trên bàn phím).
2. Một khung gõ lệnh màu đen sẽ xuất hiện ở góc dưới màn hình làm việc.

### 3.3 Cài đặt các gói thư viện
Sao chép 2 dòng lệnh sau, dán vào khung Terminal vừa mở rồi nhấn phím Enter trên bàn phím:

```powershell
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
```
Chờ khoảng 1 đến 2 phút để máy tính tự động tải toàn bộ các gói thư viện cần thiết cho cả Backend và Frontend.

---

## 4. Cấu hình thông số kết nối (.env)

Hệ thống cần tập tin cấu hình mang tên `.env` để lưu trữ đường dẫn cơ sở dữ liệu và các khóa bảo mật.

### 4.1 Tạo tập tin cấu hình từ mẫu có sẵn
Dán 2 dòng lệnh sau vào khung Terminal trong VS Code rồi nhấn Enter:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

### 4.2 Điền thông tin do bên bàn giao cung cấp
Ở cột danh sách tập tin bên trái màn hình VS Code:
1. Nhấp mở thư mục `backend` -> Nhấp đúp vào file `.env`.
2. Kiểm tra các dòng thông số do bên bàn giao gửi:
   - `PORT=8000`
   - `MONGO_URI`: Chuỗi kết nối cơ sở dữ liệu MongoDB Atlas đã được cấp.
   - `JWT_SECRET`: Chuỗi khóa bí mật mã hóa hệ thống.
   - `ZALO_APP_ID` và `ZALO_APP_SECRET`: Mã ứng dụng cha trên Zalo Developers.
   - `ALLOW_MOCK_LOGIN=false`
3. Nhấn tổ hợp phím `Ctrl + S` để lưu tập tin lại.

Lưu ý: Nếu bạn chỉ chạy thử nghiệm trên máy tính để xem giao diện và tính năng tour, chuỗi `MONGO_URI` đã được bên bàn giao cấu hình sẵn trong bộ thông tin mật.

---

## 5. Khởi chạy hệ thống

Bạn có 2 lựa chọn để xem và trải nghiệm sản phẩm:

### Lựa chọn 1: Xem và thử nghiệm ngay trên trình duyệt máy tính (Khuyên dùng)
Đây là cách nhanh nhất và tiện lợi nhất để kiểm tra giao diện, đặt tour và xem trang quản trị mà không cần thao tác qua ứng dụng điện thoại.

#### Bước A: Khởi động máy chủ Backend
1. Tại khung Terminal trong VS Code, gõ lệnh sau và nhấn Enter:
   ```powershell
   npm --prefix backend start
   ```
2. Khi thấy màn hình xuất hiện thông báo cổng `8000` và kết nối cơ sở dữ liệu thành công là máy chủ Backend đã sẵn sàng.

#### Bước B: Khởi động giao diện Frontend
1. Nhấp vào biểu tượng dấu cộng (+) ở góc trên bên phải của khung Terminal để mở thêm một thẻ Terminal thứ hai.
2. Dán lệnh sau vào thẻ mới này và nhấn Enter:
   ```powershell
   npm --prefix frontend run dev
   ```
3. Màn hình sẽ hiển thị thông báo liên kết web: `http://localhost:5173`.

#### Bước C: Mở ứng dụng trên trình duyệt web (Google Chrome, Cốc Cốc, Microsoft Edge)
- Giao diện dành cho khách hàng đặt tour: Truy cập địa chỉ http://localhost:5173
- Cổng Quản trị Điều hành (Admin Portal): Truy cập địa chỉ http://localhost:5173/admin
  - Email đăng nhập Quản trị viên: vna@gmail.com
  - Mật khẩu đăng nhập: vna@1234
  (Đây là tài khoản quản trị mẫu đã được cấp đầy đủ quyền duyệt đơn, quản lý tour và cập nhật nội dung).

---

### Lựa chọn 2: Mở ứng dụng Zalo Mini App trên điện thoại

#### Bước 1: Cài tiện ích mở rộng Zalo Mini App trên VS Code (Chỉ làm 1 lần)
1. Bấm vào biểu tượng 4 ô vuông (Extensions) ở thanh dọc bên trái ngoài cùng của VS Code.
2. Ở ô tìm kiếm phía trên, gõ từ khóa: Zalo Mini App.
3. Bấm nút Install tại tiện ích mở rộng chính thức của Zalo Mini App.

#### Bước 2: Chạy kịch bản kết nối tự động
Mở khung Terminal tại thư mục gốc của dự án và chạy dòng lệnh sau:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-zalo-local.ps1
npm.cmd run build:zalo --prefix frontend
```
Kịch bản này sẽ tự động bật máy chủ Backend và tạo một đường truyền HTTPS bảo mật tạm thời phục vụ cho Zalo Mini App.

#### Bước 3: Đăng nhập và quét mã QR trên ứng dụng Zalo
1. Nhấp vào biểu tượng Zalo Mini App ở thanh công cụ bên trái của VS Code.
2. Bấm nút Login with Zalo và dùng điện thoại quét mã để đăng nhập tài khoản Zalo của bạn (tài khoản này cần được chủ dự án thêm vào danh sách Developer/Admin trên trang Zalo Mini App Center).
3. Trong tiện ích mở rộng, chọn Deploy -> Development.
4. Màn hình sẽ xuất hiện một Mã QR Code.
5. Mở ứng dụng Zalo trên điện thoại di động -> Bật tính năng quét mã QR -> Quét mã QR trên màn hình máy tính để trải nghiệm ứng dụng trực tiếp trên điện thoại.

#### Cách tắt chương trình khi dừng sử dụng:
Khi không còn sử dụng, mở Terminal và chạy lệnh sau để đóng toàn bộ các tiến trình ngầm:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-zalo-local.ps1
```

---

## 6. Bảng xử lý các sự cố thường gặp cho người mới

| Hiện tượng | Nguyên nhân | Cách xử lý đơn giản |
| :--- | :--- | :--- |
| `npm : The term 'npm' is not recognized` | Máy tính vừa cài xong Node.js nhưng VS Code chưa nhận đường dẫn môi trường. | Đóng hoàn toàn VS Code và mở lại. Nếu vẫn báo lỗi, hãy khởi động lại máy tính. |
| `Port 8000 is already in use` | Cổng 8000 đang bị tiến trình chạy từ lần trước chiếm giữ. | Chạy lệnh `powershell -ExecutionPolicy Bypass -File scripts/stop-zalo-local.ps1` để tự động giải phóng cổng. |
| Màn hình web quay tròn, không hiện dữ liệu tour | Chưa điền đúng `MONGO_URI` trong file `backend/.env` hoặc mất kết nối mạng. | Mở file `backend/.env`, kiểm tra lại chuỗi kết nối MongoDB và kiểm tra mạng Internet của máy tính. |
| Zalo báo lỗi `-501: IP address not inside Vietnam` | Máy tính đang bật phần mềm VPN (1.1.1.1, WARP, ExpressVPN...) khiến IP ra nước ngoài. | Tắt toàn bộ các ứng dụng VPN hoặc đổi IP trên máy tính để giữ nguyên kết nối IP tại Việt Nam. |
| Không hiện mã QR trong Zalo Extension | Chưa đăng nhập tài khoản Zalo trong extension hoặc chưa liên kết đúng Mini App ID. | Đăng nhập lại tài khoản Zalo trong extension và kiểm tra xem tài khoản đã được cấp quyền Developer chưa. |

---

# MỤC II: HƯỚNG DẪN DÀNH CHO LẬP TRÌNH VIÊN VÀ KỸ SƯ IT

Phần này cung cấp đầy đủ thông số kỹ thuật, quy trình dòng lệnh CLI, kiến trúc hệ thống, danh mục kiểm thử tự động và hướng dẫn triển khai Production dành cho kỹ sư phần mềm.

## 1. Yêu cầu hệ thống (Prerequisites)

- Node.js runtime: `^20.19.0` hoặc `>=22.12.0` (được cấu hình tường minh trong trường `engines` của cả backend và frontend).
- Trình quản trị gói: `npm` (khuyến nghị dùng `npm ci` nhằm đảm bảo tính toàn vẹn của tệp `package-lock.json`).
- Cơ sở dữ liệu: MongoDB phiên bản 6.0 trở lên (yêu cầu mô hình Replica Set để thực thi Multi-document ACID Transactions trong phân hệ đặt tour).
- Hệ điều hành: Windows (dành cho kịch bản PowerShell tự động hóa Cloudflare Tunnel), Linux/macOS hỗ trợ đầy đủ các lệnh Node CLI tiêu chuẩn.

---

## 2. Quy trình khởi động nhanh (Quick Start CLI)

```powershell
# 1. Tải mã nguồn về máy
git clone https://github.com/phongdz76/vna-daksong-booking-tour.git
cd vna-daksong-booking-tour

# 2. Cài đặt các gói phụ thuộc (Clean install)
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend

# 3. Khởi tạo tập tin môi trường
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local

# 4. Khởi chạy môi trường phát triển cục bộ
# Terminal A - Backend API (Cổng 8000, nodemon tự động reload)
npm --prefix backend run dev

# Terminal B - Frontend Web/ZMP (Cổng 5173, Vite HMR)
npm --prefix frontend run dev
```

---

## 3. Đặc tả biến môi trường (Environment Variables Specification)

### 3.1 Cấu hình Backend (`backend/.env`)

| Tên biến | Kiểu dữ liệu | Bắt buộc | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | Có | Cổng mạng lắng nghe của Express REST API (mặc định `8000`). |
| `MONGO_URI` | String | Có | Chuỗi kết nối MongoDB Atlas (bắt buộc dạng Replica Set URI). |
| `JWT_SECRET` | String | Có | Khóa bí mật dùng để ký và giải mã JWT token (tối thiểu 32 ký tự). |
| `ZALO_APP_ID` | String | Có | App ID của ứng dụng cha trên nền tảng Zalo Developers Platform. |
| `ZALO_APP_SECRET` | String | Có | Secret key của ứng dụng cha, phục vụ tạo `appsecret_proof` gọi Graph API. |
| `ALLOW_MOCK_LOGIN`| Boolean | Tùy chọn | Bật/tắt cơ chế giả lập đăng nhập khi thử nghiệm (`false` trên Production). |
| `CLIENT_URL` | String | Tùy chọn | Domain client dùng cho luồng chuyển hướng thanh toán (mặc định `http://localhost:5173`). |
| `CLOUDINARY_*` | String | Tùy chọn | `CLOUD_NAME`, `API_KEY`, `API_SECRET` phục vụ tải ảnh media lên CDN Cloudinary. |
| `EMAIL_*` | String | Tùy chọn | `EMAIL_USER`, `EMAIL_PASS` (Gmail App Password) gửi email xác nhận đặt chỗ. |
| `ZALOPAY_*` | String | Tùy chọn | Cấu hình tích hợp cổng thanh toán trực tuyến ZaloPay Sandbox/Production. |

### 3.2 Cấu hình Frontend (`frontend/.env.local`)

| Tên biến | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | String | Điểm cuối kết nối API Backend (`http://localhost:8000` hoặc Cloudflare Tunnel HTTPS). |
| `VITE_ZALO_OA_ID` | String | ID của Zalo Official Account chính thức phục vụ liên kết quan tâm OA. |
| `VITE_SUPPORT_PHONE`| String | Số điện thoại đường dây nóng hiển thị công khai trên giao diện người dùng. |

---

## 4. Kiến trúc hệ thống và luồng xử lý dữ liệu

Dự án áp dụng kiến trúc Micro-services / Decoupled Client-Server:

```
[Khách hàng / Quản trị viên]
       │
       ▼
[Frontend: Vite + React 18 + ZaUI + TailwindCSS + TypeScript]
       │  (Giao thức REST API qua Axios)
       ▼
[Backend: Node.js Express 5 - Mô hình MVC Phân tầng Layered Architecture]
  ├── routes/          (Định tuyến và phân luồng endpoints)
  ├── middlewares/     (Bảo vệ JWT, phân quyền Admin/User, kiểm tra dữ liệu đầu vào)
  ├── controllers/     (Xử lý logic nghiệp vụ đặt tour, duyệt đơn, áp mã giảm giá)
  ├── models/          (Định nghĩa lược đồ Mongoose Schemas & quan hệ dữ liệu)
  └── utils/           (Dịch vụ tiện ích: Xác thực Zalo token, gửi email, CDN Cloudinary)
       │
       ▼
[Cơ sở dữ liệu: MongoDB Atlas Cloud - Mô hình Replica Set ACID Transactions]
```

Các điểm cốt lõi về kỹ thuật:
- Quản lý đồng thời và chống vượt chỗ (Concurrency Control): Sử dụng MongoDB Session Transaction (`startSession` / `withTransaction`) đảm bảo số chỗ khả dụng (tối đa 50 khách/chuyến) không bị vượt quá khi có nhiều yêu cầu đặt chỗ đồng thời.
- Phòng vệ dữ liệu đầu vào (Input Validation): Middleware kiểm duyệt chặt chẽ mọi tham số query và request body nhằm ngăn ngừa nguy cơ NoSQL Injection.
- Bảo mật xác thực (Authentication Guard): Kiểm tra JWT Bearer token qua tiêu đề `Authorization`, phân tách rạch ròi giữa phân hệ khách hàng và Cổng Quản trị Điều hành.

---

## 5. Các chế độ chạy phát triển (Development & Tunneling Workflows)

### 5.1 Chế độ phát triển Web cục bộ (Local Web Development)
Sử dụng để phát triển tính năng, kiểm thử giao diện người dùng và trang Admin trên trình duyệt máy tính:
- Khởi chạy Backend: `npm --prefix backend run dev` (Nodemon tự động lắng nghe và nạp lại mã).
- Khởi chạy Frontend: `npm --prefix frontend run dev` (Vite dev server, cố định cổng 5173).

### 5.2 Chế độ Zalo Mini App Local Tunnel (Kịch bản tự động hóa)
Nền tảng Zalo yêu cầu máy chủ Backend phải sở hữu chứng chỉ HTTPS công khai hợp lệ. Kịch bản PowerShell trong thư mục `scripts/` thực hiện trọn vẹn quy trình này:

1. Khởi động phiên làm việc cục bộ:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-zalo-local.ps1
   ```
   Cơ chế vận hành của kịch bản:
   - Tự động tải tệp thực thi `cloudflared.exe` phiên bản chính thức từ Cloudflare Releases vào thư mục `tmp/zalo-local/` nếu chưa có.
   - Kích hoạt tiến trình Backend chạy ngầm trên cổng 8000 với tham số `ALLOW_MOCK_LOGIN=false`.
   - Mở đường hầm Cloudflare Quick Tunnel trỏ về `http://127.0.0.1:8000` và nhận diện đường dẫn HTTPS công khai dạng `https://*.trycloudflare.com`.
   - Tự động cập nhật giá trị `VITE_API_BASE_URL` mới vào tập tin `frontend/.env.local`.

2. Đóng gói và phát hành bản thử nghiệm:
   ```powershell
   npm.cmd run build:zalo --prefix frontend
   ```
   Mở tiện ích mở rộng Zalo Mini App trong VS Code -> Chọn Deploy -> Development và quét mã QR trên điện thoại.

3. Khởi động lại Backend khi thay đổi cấu hình `.env` mà vẫn giữ nguyên đường hầm HTTPS:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-zalo-local.ps1 -RestartBackend
   ```

4. Dừng toàn bộ phiên làm việc:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-zalo-local.ps1
   ```

---

## 6. Bộ lệnh kiểm thử tự động và quản trị dữ liệu

Hệ thống tích hợp sẵn bộ kịch bản kiểm thử tự động và khởi tạo dữ liệu trong tệp `backend/package.json`:

### 6.1 Kiểm thử API và nghiệp vụ hệ thống
```powershell
# Chạy bộ kiểm thử toàn diện toàn bộ REST API
npm --prefix backend run test:api

# Kiểm thử luồng xác thực Zalo login token và chữ ký bảo mật
npm --prefix backend run test:auth

# Kiểm thử luồng gửi email xác nhận đặt tour
npm --prefix backend run test:email

# Xem trước mẫu email HTML trên trình duyệt
npm --prefix backend run preview:email

# Kiểm thử tính hợp lệ của bộ lọc và kiểm soát đầu vào
npm --prefix backend run test:validation

# Kiểm thử dữ liệu địa điểm du lịch và tọa độ bản đồ
npm --prefix backend run test:locations
```

### 6.2 Khởi tạo tài khoản Quản trị và dữ liệu mẫu
```powershell
# Khởi tạo tài khoản Admin mặc định dựa trên cấu hình trong .env
npm --prefix backend run create:admin

# Cập nhật danh mục các điểm du lịch sinh thái Đắk Song
npm --prefix backend run update:sample-destinations

# Cập nhật nội dung chi tiết và bảng giá tour tiêu chuẩn
npm --prefix backend run update:tour-content
npm --prefix backend run update:tour-prices
```

---

## 7. Cơ chế xác thực Zalo và lưu ý bảo mật địa chỉ IP

1. Cơ chế xác thực Token phía máy chủ (Server-side Authentication):
   - Ứng dụng Frontend gọi ZMP SDK `getAccessToken()` trên thiết bị người dùng.
   - Frontend gửi access token về endpoint `POST /api/auth/zalo-login`.
   - Backend sử dụng `ZALO_APP_SECRET` của ứng dụng cha để tạo mã băm HMAC-SHA256 (`appsecret_proof`).
   - Backend gửi yêu cầu xác thực sang Graph API của Zalo: `https://graph.zalo.me/v2.0/me?access_token=...&appsecret_proof=...` để tiếp nhận định danh `id`, `name`, `picture`.
   - Backend phát hành JWT Token trả về cho máy khách duy trì phiên đăng nhập.

2. Lưu ý sống còn về địa chỉ IP mạng (Khắc phục triệt để lỗi `-501`):
   - Nền tảng Zalo áp dụng chính sách từ chối xác thực đối với các máy chủ Backend có địa chỉ IP mạng nằm ngoài lãnh thổ Việt Nam (`errorCode: -501`, thông báo `IP address not inside Vietnam`).
   - Khi chạy thử nghiệm tại máy cá nhân: Tuyệt đối không bật các ứng dụng đổi IP hoặc VPN ra máy chủ quốc tế.
   - Khi triển khai môi trường Production: Bắt buộc lựa chọn nhà cung cấp máy chủ đám mây hoặc VPS có dải IP đặt tại Việt Nam.

---

## 8. Quy trình Build và Triển khai Production

### 8.1 Đóng gói mã nguồn Frontend
```powershell
# Kiểm tra định kiểu TypeScript và đóng gói cho môi trường Web/Vercel (thư mục đầu ra: dist)
npm --prefix frontend run build

# Kiểm tra định kiểu TypeScript và đóng gói cho Zalo Mini App (thư mục đầu ra: dist/www)
npm --prefix frontend run build:zalo
```

### 8.2 Triển khai Backend lên máy chủ Production
1. Thiết lập các biến môi trường trực tiếp trên hệ điều hành máy chủ:
   - `NODE_ENV=production`
   - `ALLOW_MOCK_LOGIN=false`
   - Cung cấp đầy đủ `MONGO_URI`, `JWT_SECRET`, `ZALO_APP_ID`, `ZALO_APP_SECRET`.
2. Khởi chạy thông qua trình quản lý tiến trình (PM2 hoặc Docker Container):
   ```bash
   pm2 start server.js --name "vna-daksong-backend"
   ```
3. Cấu hình Reverse Proxy Nginx đi kèm chứng chỉ bảo mật SSL HTTPS hợp lệ.
4. Trỏ biến `VITE_API_BASE_URL` của Frontend về tên miền chính thức và thực hiện phát hành phiên bản được kiểm duyệt trên Zalo Mini App Center.

---

## 9. Tài liệu tham chiếu

- [Báo Cáo Dự Án và Kịch Bản Thuyết Trình Chi Tiết](PRESENTATION_GUIDE.md)
- [Tài Liệu Tổng Quan Hệ Thống README](README.md)
- [Tài Liệu Kỹ Thuật Dành Cho Lập Trình Viên Zalo Mini App](https://docs.zaloplatforms.com/docs/MA/intro/getting-started/frequently-solved-issues)
- [Hướng Dẫn Xác Thực Người Dùng Phía Server Của Zalo](https://docs.zaloplatforms.com/docs/MA/intro/best-practices/authen-user)

