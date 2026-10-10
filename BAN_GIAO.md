# Nhận source từ Git và đăng nhập Zalo

Source có thể chạy trên máy người nhận. Đăng nhập Zalo thật cần Mini App chạy trong
ứng dụng Zalo, backend HTTPS hoạt động, khóa ứng dụng cha đúng và kết nối MongoDB.
Chỉ clone source hoặc mở localhost trong trình duyệt chưa đáp ứng các điều kiện này.

## 1. Chọn môi trường backend

| Cách chạy | Người nhận cần làm | Phụ thuộc máy người gửi |
| --- | --- | --- |
| Thử tạm trên máy Windows người nhận | Cấu hình backend, chạy script HTTPS, build và deploy Mini App | Không |
| Backend trên máy chủ riêng | Cấu hình backend trên server, HTTPS ổn định, trỏ frontend về API đó | Không |

Đợt thử của dự án ghi nhận Zalo từ chối backend có IP đầu ra ngoài Việt Nam
(`errorCode: -501`, thông báo `IP address not inside Vietnam`). Để thử đăng nhập,
dùng máy/server có IP đầu ra tại Việt Nam; tránh VPN đưa kết nối ra nước ngoài.
Đặt đúng khóa không giải quyết được lỗi vùng IP này.

Backend trên Vercel hiện có trong README chưa giải quyết được lỗi IP đã ghi nhận.
Link `trycloudflare.com` trên máy người gửi cũng không phải API cố định để bàn giao.

## 2. Quyền Zalo và cấu hình riêng

Nếu dùng Mini App hiện có, chủ ứng dụng cần thêm tài khoản Zalo của người nhận
vào tập Developer/Admin phù hợp trước khi họ deploy hoặc mở bản Development.
Chỉ cấp quyền cho người được giao phát triển. Nếu người nhận tạo Mini App riêng,
họ liên kết ID mới trong extension và sử dụng khóa của ứng dụng cha tương ứng.

Chủ database cấp quyền kết nối cần thiết (database user và Network Access),
hoặc người nhận tạo database riêng. Booking cần MongoDB replica set/Atlas.
Không seed hoặc chạy bộ test ghi dữ liệu lên database đang phục vụ khách.

Khóa Zalo, mật khẩu database và tài khoản admin được cấp riêng qua kênh bảo mật,
không commit `.env`, không đặt secret trong frontend `VITE_*`.
Nếu dùng database riêng, người nhận tự đặt `JWT_SECRET`; nếu cùng quản lý một backend,
dùng cấu hình của backend được bàn giao. Cần đổi những khóa/mật khẩu đã bị lộ.

## 3. Cài trên máy Windows người nhận

Cài Git, Node.js `^20.19.0` hoặc `>=22.12.0`, VS Code và Zalo Mini App Extension.
Từ PowerShell:

```powershell
git clone https://github.com/phongdz76/vna-daksong-booking-tour.git
cd vna-daksong-booking-tour
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Chỉ sao chép file mẫu khi chưa có file cấu hình, để không ghi đè thông tin đã điền.
Sửa `backend/.env`, tối thiểu:

```env
PORT=8000
MONGO_URI=<connection string được cấp hoặc database riêng>
JWT_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
ZALO_APP_ID=<ID ứng dụng cha trong Zalo Developers>
ZALO_APP_SECRET=<khóa bí mật của đúng ứng dụng cha>
ALLOW_MOCK_LOGIN=false
```

`ZALO_APP_ID` là ID ứng dụng cha, khác ID Mini App. Xác thực hiện dùng
`ZALO_APP_SECRET` để tạo `appsecret_proof` cho token Mini App.
Cloudinary, email, ZaloPay cấu hình riêng khi thử các chức năng đó; không bắt buộc
để đăng nhập. Không dùng dữ liệu mẫu để khẳng định chức năng đã chạy thực tế.

## 4. Thử đăng nhập trên máy người nhận

Từ thư mục gốc, chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-zalo-local.ps1
npm.cmd run build:zalo --prefix frontend
```

Script tải `cloudflared` chính thức nếu chưa có, chạy backend cổng 8000, kiểm tra
kết nối API/database và tạo HTTPS tạm. Nó tự ghi `VITE_API_BASE_URL` mới vào
`frontend/.env.local`. Nó tắt mock login cho backend này.

Mở thư mục `frontend` trong VS Code, liên kết đúng Mini App ID, đăng nhập extension
bằng tài khoản được cấp quyền, chọn **Deploy → Development** và deploy bản mới.
Quét **QR của bản vừa deploy** bằng Zalo trên điện thoại. Nếu có phiên cũ,
đăng xuất rồi đăng nhập lại; cho phép tên/ảnh nếu muốn hiển thị avatar.

Giữ máy người nhận và mạng hoạt động suốt lúc thử. URL tunnel thay đổi khi tạo
phiên mới; cần build/deploy lại để Mini App trỏ đến URL mới. Để dừng:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-zalo-local.ps1
```

Nếu chỉ sửa khóa trong `backend/.env`, có thể giữ tunnel hiện tại và khởi động lại API:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-zalo-local.ps1 -RestartBackend
```

Log nằm trong `tmp/zalo-local/`. Lỗi `Invalid appsecret_proof` cần kiểm tra đúng
khóa ứng dụng cha; lỗi `IP address not inside Vietnam` cần kiểm tra IP đầu ra backend.
Không đưa token/khóa nguyên văn vào log hay ảnh chụp gửi cho người khác.

## 5. Chạy lâu dài

Đưa backend lên máy chủ có IP đầu ra tại Việt Nam, cấu hình HTTPS ổn định, MongoDB
và secrets phía server. Đặt `NODE_ENV=production`, `ALLOW_MOCK_LOGIN=false`.
Sau đó đặt `VITE_API_BASE_URL=https://<domain-api>` trong cấu hình frontend,
build và deploy lại Mini App. Kiểm tra đăng nhập Zalo thật trước khi nghiệm thu.

Nếu bàn giao frontend đã build, phải cung cấp API đang hoạt động cùng quyền quản lý;
source Git không thay thế server, database hoặc quyền tài khoản dịch vụ.
Muốn người dùng ngoài nhóm phát triển truy cập, cần hoàn tất xác thực, xét duyệt,
cấp quyền API cần thiết và Publish bản đã được duyệt.

## Tài liệu liên quan

- [Backend và checklist bàn giao](backend/README.md)
- [Frontend, build và giới hạn kiểm thử](frontend/README.md)
- [Zalo: giới hạn simulator, HTTPS và tài khoản bản thử](https://docs.zaloplatforms.com/docs/MA/intro/getting-started/frequently-solved-issues)
- [Zalo: xác thực người dùng phía server](https://docs.zaloplatforms.com/docs/MA/intro/best-practices/authen-user)
- [Cloudflare Quick Tunnel: URL thử tạm](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
