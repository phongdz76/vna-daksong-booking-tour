# Giao diện VNA Đắk Song

## Xem ngay

Chạy từ thư mục `frontend`:

```powershell
npm.cmd run dev
```

- Giao diện có dữ liệu minh họa: http://localhost:5173/?preview=1
- Giao diện đọc API: http://localhost:5173/
- Đăng nhập thử trên trình duyệt, chưa cần Zalo: http://localhost:5173/login
- Xem mẫu màn chi tiết đơn theo Stitch: http://localhost:5173/my-bookings/preview-order?preview=1
- Xem trang Khám phá theo Stitch: http://localhost:5173/explore?preview=1; dữ liệu thật: http://localhost:5173/explore

Chế độ mẫu chỉ hoạt động khi chạy dev, có nhãn ở đầu màn hình, không gọi API để tạo/hủy đơn và không thu tiền. Sau khi reload, đơn mẫu và lựa chọn chưa gửi được xóa. Không tự chuyển sang dữ liệu mẫu khi API lỗi.

API mặc định là `http://localhost:8000`. Nếu cần đổi, đặt `VITE_API_BASE_URL` trong `.env` theo `.env.example`, dùng URL gốc không có `/api`, rồi chạy lại Vite. Không đặt khóa bí mật backend trong biến `VITE_`.

## Phần đã dựng

- Trang chủ theo thứ tự Stitch: hero, điểm đến nổi bật và tour đề xuất.
- Khám phá đã dựng lại theo `kh_m_ph_vna_k_song`: tiêu đề giữa, thanh Điểm đến/Cẩm nang, bộ lọc cuộn ngang, lưới hai cột với ảnh 4:5, tên và thông tin dưới ảnh, bài cẩm nang có nút mở rộng. Nút tim lưu địa điểm trên thiết bị (trình duyệt dùng sessionStorage, trong Zalo dùng adapter nativeStorage), riêng với tour đã lưu của tài khoản. Preview dùng sáu địa điểm, ảnh và khoảng cách từ Stitch, có nhãn minh họa; API dùng tên/ảnh/địa chỉ thật, không tự thêm khoảng cách hoặc nhãn Hot. Cẩm nang API lấy `visitNotes` của các địa điểm đang hiển thị; chưa có API bài viết riêng. Thời tiết chỉ minh họa trong preview. Chi tiết điểm đến và tour liên quan giữ luồng hiện có.
- Danh sách tour: tìm kiếm, chủ đề, sắp xếp, thời lượng, phân trang API.
- Chi tiết tour: gallery, nội dung trên nền trắng, thông tin chuyến, lịch trình dọc, bản đồ minh họa ở chế độ mẫu và chính sách. Chuyến mở quyết định khả năng đặt; giá lấy từ Departure/API.
- Chọn chuyến khởi hành & Số chỗ khả dụng: Hiển thị trực quan cờ *"Còn X/50 chỗ"* (tối đa 50 người/chuyến), tự động khóa chọn khi hết chỗ hoặc chuyến bị đóng. Chọn số lượng người lớn, trẻ em và mã giảm giá (coupon) hợp lệ ➔ nhận báo giá tự động trước khi gửi đơn đặt tour.
- Đánh giá tour từ API thật: sao trung bình, số lượt, phân bố 1–5 sao, danh sách nhận xét có phân trang. Đơn `completed` của chính khách được đánh giá một lần; chủ được sửa/xóa. Vào Tài khoản → Lịch sử chuyến đi → đơn hoàn thành → Viết / xem đánh giá. Tour chưa có đánh giá hiển thị trạng thái trống; lỗi tải có nút thử lại. Bản `preview=1` ghi rõ các nhận xét chỉ là minh họa.
- Chọn chuyến/người lớn/trẻ em/coupon → lấy báo giá → kiểm tra thông tin liên hệ → gửi yêu cầu.
- Kết quả gửi, danh sách, chi tiết và hủy yêu cầu; trạng thái đơn và tiền hiển thị riêng. Tự động gửi email xác nhận đặt tour qua Nodemailer SMTP sau khi tạo đơn thành công.
- Chi tiết đơn đã dựng lại theo `chi_ti_t_n_h_ng_vna_k_song`: thẻ trạng thái, tiến trình dọc, phiếu đặt tour với đường xé, lịch khởi hành/điểm đón/liên hệ và bảng kê tiền từ snapshot. **Chờ xác nhận chuyến** nghĩa là VNA chưa xác nhận nhận và tổ chức chuyến; **Thanh toán thành công** chỉ hiển thị khi backend trả `paymentStatus=paid`. Hai trạng thái có thể cùng xuất hiện. Có nút cập nhật từ API; đã trả tiền thì ẩn nút ZaloPay, đơn hủy/hoàn thành không còn nút thanh toán/hủy. Bản này giữ quy trình xác nhận chuyến của backend. QR chỉ minh họa trong preview; đơn thật hiển thị mã đơn, chưa có nghiệp vụ check-in bằng QR. Hotline chỉ gọi khi được cấu hình số chính thức; không tự lấy số minh họa của Stitch làm hotline thật.
- Trang tài khoản và màn đăng nhập có ảnh nền, logo VNA bo góc, form thử nghiệm và nút khám phá. Chạy dev ngoài Zalo: nhập tên, số điện thoại rồi gọi `/auth/mock`; backend cần `ALLOW_MOCK_LOGIN=true` và không chạy production. Trong Zalo dùng adapter SDK rồi gọi `/auth/zalo`; kiểm tra phiên qua `/auth/me`. Bản xem mẫu không tạo phiên thật; dùng liên kết chuyển sang chế độ API trên màn đăng nhập.
- Khi bấm đăng nhập Zalo, SDK xin phép tên/ảnh đại diện. Từ chối quyền vẫn đăng nhập bằng ID. Khi đồng ý, backend xác minh và lưu hồ sơ trực tiếp từ Zalo; avatar hiện ở header và trang Tài khoản, ảnh lỗi dùng icon tài khoản. Sau khi deploy bản mới, tài khoản đã đăng nhập trước đó cần đăng xuất rồi đăng nhập lại để đồng bộ avatar. Chỉ build/test API chưa xác nhận quyền và avatar trên Zalo thật.
- Kiểm tra đợt avatar: build Zalo và 23 kiểm thử auth backend đã qua; 40 kiểm tra notification/header bằng Chromium đã qua. Harness bố cục thay SDK bằng adapter lưu trữ trong bộ nhớ, không cấp token giả hoặc giả lập đăng nhập thành công. `test:ui` tổng thể còn dừng ở bước gửi booking preview vì fixture chưa điền email bắt buộc; cần cập nhật dữ liệu và thao tác đăng nhập Web của harness trước khi dùng làm kiểm tra toàn luồng.
- Màn tài khoản đã dựng lại theo Stitch: hồ sơ cá nhân với thanh tiến trình nâng hạng hội viên (`Tier Progress Bar` 4 cấp: Standard ➔ Silver ➔ Gold ➔ Diamond), 3 ô thống kê, chuyến đã xác nhận sắp khởi hành, các nhóm hoạt động/cài đặt/hỗ trợ và thanh điều hướng 5 mục. Dữ liệu thật lấy từ hồ sơ, đơn theo trạng thái và tour đã lưu; bản mẫu có nhãn riêng. Có thể mở danh sách tour đã lưu, xem hướng dẫn và đăng xuất.
- **Cổng Quản trị Viên (Admin Portal)** tại `/admin`: Được thiết kế lại chuẩn Executive Green Theme với Dashboard làm mới dữ liệu realtime, thẻ bài viết thông báo đơn chờ (`.task-banner`) Emerald Mint sắc nét không bị dư viền, badge thông báo Sidebar Coral Rose Glassmorphic, quản lý đơn đặt, tour, lịch khởi hành, điểm đến, bài viết và mã giảm giá.

Với đơn ZaloPay chưa thanh toán, danh sách đơn, chi tiết đơn và màn kết quả tự kiểm tra mỗi 5 giây khi đang mở, đồng thời kiểm tra khi quay lại trang. Frontend gọi backend đối soát giao dịch rồi đọc lại `Booking.paymentStatus`; chỉ khi backend lưu `paid`, dòng **Chưa thanh toán** mới đổi thành **Đã thanh toán** mà không cần tải lại trang hay admin duyệt tiền. Trạng thái xác nhận chuyến vẫn hiển thị riêng. Kết quả chưa rõ hoặc lỗi kết nối không được coi là đã thanh toán; có nút kiểm tra lại. Không dùng tham số trên URL để quyết định thanh toán thành công.

Đơn `cash_on_arrival` không thu tiền khi gửi yêu cầu. Giao diện đã có nút mở thanh toán ZaloPay cho đơn đủ điều kiện; chưa thử giao dịch ZaloPay thật, SDK trên Zalo thật và chưa phát hành Mini App.

Giá thật lấy từ API quote; không gửi tổng tiền do frontend tự tính vào API tạo booking. Khi quote hết hạn hoặc backend báo giá thay đổi, khách phải kiểm tra lại và đồng ý lần nữa. Sau lỗi mạng khi tạo đơn, giữ cả Idempotency-Key và payload để thử lại cùng yêu cầu. Lựa chọn/form được giữ trong bộ nhớ khi điều hướng và đăng nhập, chưa lưu qua reload.

## Kiểm tra

```powershell
npm.cmd run build
npm.cmd run test:ui
```

`test:ui` cần dev server đang chạy và Chrome được cài tại đường dẫn mặc định trên Windows; có thể đặt `CHROME_PATH` hoặc `UI_BASE_URL` để thay đổi. Script dùng Chrome headless, không cài thêm thư viện kiểm thử.

Bài kiểm tra thử các màn đại diện ở 360/390/430px, luồng đơn mẫu, báo giá thay đổi và gửi lại sau lỗi kết nối. Phần thanh toán kiểm tra dòng trạng thái tự đổi sau đối soát, giữ trạng thái chuyến riêng, không tải lại toàn trang, không tin URL hay kết quả chưa được backend lưu, và thử lại sau lỗi đối soát. Ảnh dòng đã thanh toán nằm ở `test-results/booking-payment-paid-390.png`. Phần đánh giá kiểm tra trạng thái trống, link từ đơn hoàn thành, gửi trùng, sửa/xóa, cập nhật thống kê, hiển thị nhận xét dưới dạng văn bản và thử lại khi API lỗi. Các bài kiểm tra API ghi dữ liệu được chặn tại trình duyệt và trả response giả lập; không ghi vào database thật. Kiểm tra đọc API thật chỉ chạy khi backend phản hồi, kết quả có cờ `liveApiTested`. Hướng dẫn API và quyền đánh giá nằm trong [README backend](../backend/README.md); tài liệu nghiên cứu chi tiết được giữ local trong docs/.

Ảnh chụp và báo cáo được lưu trong `test-results/`: `home-390.png`, `tour-detail-390.png`, `booking-review-390.png`, `login-390.png`, các ảnh toàn màn `*-full-390.png` và `ui-results.json`. Bài kiểm tra đăng nhập thử được chặn API và kiểm tra tên, số điện thoại, lưu phiên, quay về trang yêu cầu. Kết quả kiểm tra trình duyệt không xác nhận tích hợp Zalo hay thanh toán thật.

Nếu máy có bộ Stitch và công cụ thiết kế local (được gitignore), sau khi chạy kiểm tra có thể tạo bản đối chiếu hình ảnh:

```powershell
node scripts/prepare-visual-comparison.mjs
```

Mở `test-results/comparison.html` để xem ảnh Stitch và ảnh giao diện cạnh nhau ở chiều rộng 390px. Trang chủ, Khám phá, chi tiết tour, xác nhận và tài khoản đã được sửa bố cục theo Stitch; đăng nhập được điều chỉnh thêm cho việc thử trên trình duyệt. Ảnh riêng của tài khoản nằm ở `account-390.png` và `account-full-390.png`; Khám phá nằm ở `explore-390.png`, `explore-full-390.png` và `explore-api-390.png` nếu backend có điểm đến. Nội dung mẫu như ngày chuyến đi và số tour đã lưu có thể khác mẫu gốc; không khẳng định giống hoàn toàn từng pixel. Những màn khác chưa được đối chiếu đầy đủ.

## Nguồn thiết kế và ảnh

Bố cục/màu dựa trên thư mục `stitch_vna_k_song_booking_tour` được giữ local. Ảnh cần cho giao diện được commit tại `src/assets/stitch/`, URL gốc nằm trong `sources.json` và `reference-sources.json`. Các script `scripts/prepare-*.mjs` chỉ giữ trên máy thiết kế, không cần để build hoặc chạy app. Font Inter lưu local cùng license SIL OFL tại `src/assets/fonts/`, không phụ thuộc Google Fonts khi mở giao diện. Ảnh không được xác minh là ảnh thực tế của từng địa điểm; tên/giá mẫu chưa phải sản phẩm mở bán. Ở chế độ API, ảnh tour/điểm đến lấy từ dữ liệu backend; ảnh lỗi có placeholder, không thay bằng ảnh mẫu.

Logo dùng asset VNA hiện có. Header do frontend dựng; `app-config.json` ẩn action bar mặc định để tránh trùng header. Browser dùng BrowserRouter; trong Zalo dùng ZMPRouter theo app ID. Phần này cần kiểm tra lại trên thiết bị Zalo trước khi phát hành.

## Cài đặt từ GitHub và cổng quản trị

Từ thư mục frontend, chạy npm.cmd ci, sao chép .env.example thành .env rồi đặt VITE_API_BASE_URL theo API đang dùng. Node.js yêu cầu ^20.19.0 hoặc >=22.12.0. Sau đó chạy npm.cmd run dev.

Admin mở tại http://localhost:5173/admin; tài khoản tạo bằng npm.cmd run create:admin ở backend. Entry main.tsx tải UserApp hoặc pages/Admin/AdminApp theo môi trường và URL; phiên admin tách khỏi phiên khách. Test admin: npm.cmd run test:admin khi dev server đang chạy. Admin dùng API thật khi chạy ứng dụng, còn test chặn request và dùng fixture.

Build web/Vercel: npm.cmd run build; đầu ra là dist/. Xem build bằng npm.cmd run preview tại http://localhost:4173. Web hosting cần chuyển /admin/* về index.html. Khi đổi API production, đặt VITE_API_BASE_URL trước khi build. dist/app-config.json được sinh tự động với tên asset thực tế, không commit dist/.

Build Zalo: npm.cmd run build:zalo; đầu ra là www/. Zalo Mini App Extension cũng build vào www/ khi bấm Deploy. zmp-vite-plugin được bật trong vite.config.ts để tạo đúng thư mục và app-config.json. Nếu extension báo ENOENT khi đọc frontend/www, kiểm tra plugin và build lại. Liên kết Mini App ID, đăng nhập bằng tài khoản có quyền, chọn Development rồi Deploy; mở QR trong kết quả deploy. www/ là đầu ra build, không commit. Build thành công chưa xác nhận SDK chạy trên điện thoại hoặc deploy thành công.

Các file src/data/preview*.ts, src/assets/, scripts/check-ui.mjs, scripts/check-notifications-ui.mjs và tests/admin-ui.mjs được giữ trong Git vì ứng dụng hoặc kiểm thử cần chúng. Bản thiết kế và công cụ prepare-* giữ local. Đã xác minh typecheck và build thành công ngày 09/10/2026; chưa xác minh SDK trên thiết bị Zalo trong đợt này.
