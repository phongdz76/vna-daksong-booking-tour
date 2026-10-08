**Các sửa lỗi logic backend và cách kiểm tra**

Giữ luồng nghiệp vụ hiện có: booking mới là `pending_confirmation` và `unpaid`; giá lấy từ backend; thanh toán thành công không tự xác nhận tour. Admin chuyển trạng thái theo các nhánh cũ. Hủy/từ chối vẫn yêu cầu lý do; chỉ hoàn thành tour sau giờ kết thúc.

**Cách viết code**

Controller dùng `try/catch` đầy đủ, kiểm tra điều kiện theo từng bước và trả lỗi nghiệp vụ trực tiếp bằng `res.status(...).json(...)`. Các biến giao dịch, đơn hàng và kết quả provider được đặt tên rõ; các nhánh xử lý dùng `if/else` thay cho biểu thức điều kiện lồng nhau. Không dùng helper `httpError`.

Trong transaction, lỗi nghiệp vụ dùng `throw new Error("MÃ_LỖI")` để rollback, sau đó controller bắt mã lỗi và trả HTTP response, giống cách `createBooking` đang xử lý. Lỗi DB ngoài dự kiến vẫn chuyển tới middleware chung để giữ đúng phân loại 400/409/503/500. Chỉ giữ hàm phụ cho xử lý dùng chung: gửi ZaloPay, ghi nhận tiền từ callback/query, đối soát và chuyển trạng thái booking.

**Các lỗi đã sửa trong code**

| Phần | Hành vi sau sửa |
| --- | --- |
| Callback thanh toán | Booking và PaymentTransaction cùng commit hoặc cùng rollback trong transaction MongoDB. Lỗi lưu booking trả `return_code: 0` để provider retry. |
| Callback lặp | Không ghi nhận tiền, lịch sử hoặc số khách lần nữa. Kiểm tra app_id, MAC và amount trước khi chấp nhận. |
| Dữ liệu thanh toán cũ | Callback/query có thể sửa transaction đã success nhưng booking còn unpaid. Tạo thanh toán mới bị chặn khi giao dịch cũ chưa đối soát. |
| Tạo thanh toán đồng thời | Ghi khóa trên Booking trong transaction và dùng unique partial index để chỉ có một giao dịch đang hoạt động cho mỗi đơn. |
| Provider mất mạng | Trả 502 kèm appTransId, giữ giao dịch để query. Không coi timeout là bằng chứng chưa thu tiền. |
| Pending hết hạn | Mặc định 15 phút; query chủ động hoặc đối soát khi tạo lại. Chỉ giải phóng khi provider xác nhận không thanh toán và không còn xử lý. Lỗi MAC/hệ thống không giải phóng giao dịch. |
| Tiền về muộn/trùng | Đơn đã hủy không được mở lại. Giao dịch nhận tiền thừa chuyển refund_pending. Callback sau refund không làm mất trạng thái đã hoàn; khoản tiền mới về sau đó được đánh dấu cần hoàn tiếp. |
| Hủy/từ chối đơn paid | Booking và các transaction success được chuyển sang refund_pending trong cùng transaction MongoDB. |
| Hoàn tiền | Admin chủ động gửi lệnh hoàn toàn bộ tiền. Chỉ query xác nhận thành công mới chuyển refunded. Timeout giữ nguyên refundRequestId, chặn gửi thêm lệnh. |
| Bộ đếm khách | soldCount tăng ở confirmed, giảm khi hủy confirmed. Callback thanh toán không cộng khách. |
| Voucher | Hoàn quota cùng transaction với hủy/từ chối; request thua cạnh tranh không được trừ quota. Booking lưu couponId để việc xóa rồi tạo lại cùng code không ảnh hưởng voucher mới. Đơn cũ chưa có couponId dùng thêm điều kiện ngày tạo. |
| Điểm thành viên | Hoàn thành đơn và cộng điểm cùng transaction; lỗi lưu điểm rollback completed để có thể retry, tránh mất hoặc cộng trùng điểm. |
| Coupon CRUD | Kiểm tra boolean, số, khoảng ngày; chuỗi "false" bị từ chối thay vì chuyển thành true. |
| Đầu vào | address/visitNotes/childPolicy/reason sai kiểu, bookingId sai định dạng trả 400. |
| Upload | Sai loại file hoặc tên field trả 400; lớn hơn 5MB trả 413. |

**API bổ sung**

Tất cả dùng `POST`, không cần body, ngoài các header xác thực thông thường.

| API | Quyền | Kết quả |
| --- | --- | --- |
| /api/payments/zalopay/:appTransId/query | Chủ đơn hoặc admin | Đối soát thanh toán; trả status và return_code. |
| /api/payments/zalopay/:appTransId/refund | Admin | Gửi hoàn toàn bộ tiền của transaction refund_pending; 202 nghĩa là đang chờ kết quả. |
| /api/payments/zalopay/:appTransId/refund/query | Admin | Đối soát hoàn tiền; chỉ provider xác nhận thành công mới chuyển refunded. |

`GET /api/bookings/:id` giữ `data` như cũ và thêm `payments`, chứa appTransId, amount, status, refundRequestId, providerRefundId và các mốc thời gian. Chủ đơn/admin có thể tra mã giao dịch; không trả rawCallback.

**Cách test**

Kết quả lượt chạy sau sửa: **220/220 ca đạt**, **49/49 API** và `GET /`, tổng **358 request HTTP**. Database test đã được dọn; các tích hợp ngoài được giả lập.

1. Chạy từ thư mục backend: `npm.cmd run test:api`.
2. Bộ test chạy server/routes/controllers/middleware thật, HTTP thật và MongoDB thật trên database test riêng; tự dọn database sau khi chạy. Không sửa `.env` hoặc dữ liệu ứng dụng.
3. Zalo, ZaloPay và Cloudinary được giả lập ở ranh giới dịch vụ. Các ca đồng thời và fault injection kiểm tra rollback, retry, trùng callback, trùng yêu cầu thanh toán/refund và quota.
4. Đọc kết quả trong [KET_QUA_TEST_TOAN_BO_API.md](KET_QUA_TEST_TOAN_BO_API.md) hoặc [JSON đầy đủ](backend/test-results/all-api-results.json).
5. Test thủ công bằng [hướng dẫn Postman](docs/api_postman_guide.md) và [collection 93 request](docs/postman/VNA_Dak_Song.postman_collection.json). Request 8.9–8.11 dành cho query/refund.

**Phần còn cần xác minh riêng**

- Chưa kiểm thử ZaloPay sandbox thật hoặc chuyển/hoàn tiền thật. Callback mô phỏng không tạo tiền tại nhà cung cấp; không dùng giao dịch mô phỏng để gửi refund thật.
- Chưa có cron tự đối soát; hiện gọi query chủ động hoặc đối soát khi tạo lại thanh toán đã hết hạn. Trường hợp provider trả kết quả chưa rõ tiếp tục giữ giao dịch để tránh thu/hoàn trùng.
- Refund hiện là hoàn toàn bộ transaction. Hạn/phí hủy trong cancellationPolicy vẫn là văn bản, chưa tự tính phí hoặc hoàn một phần.
- Quy tắc dashboard và tích điểm giữ nguyên: dựa trên trạng thái đơn; dashboard không phải báo cáo tiền thực thu, và completed chưa bắt buộc paymentStatus paid.
- Không tự chỉnh database ứng dụng: soldCount, quota hoặc điểm đã lệch từ trước cần đối soát dữ liệu riêng. Các kiểm thử mới xác minh hành vi code sau sửa.
- Unique partial index mới của PaymentTransaction cần được tạo trên môi trường triển khai nếu môi trường đó tắt autoIndex. Bộ test đã khởi tạo index trên database test.

Đối chiếu giao thức với tài liệu chính thức: [query thanh toán](https://docs.zalopay.vn/vi/docs/specs/order-query/), [gửi refund](https://docs.zalopay.vn/vi/docs/specs/order-refund/), [query refund](https://docs.zalopay.vn/vi/docs/specs/order-query-refund/), [mã trạng thái](https://developer.zalopay.vn/v2/reference/errors/overview.html).
