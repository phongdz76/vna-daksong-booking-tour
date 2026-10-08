**Kết quả kiểm thử toàn bộ API backend**

Thời gian: 2026-10-08T04:31:06.969Z → 2026-10-08T04:32:24.023Z. Lượt chạy: 1791433866969-7e525611.

**Kết quả:** 220 đạt, 0 lỗi / 220 ca; 49/49 API và GET / đã được gọi qua HTTP thật.

**Phạm vi:** chạy server.js cùng routes/controllers/middleware thật, MongoDB thật trong database test riêng. Zalo, ZaloPay và Cloudinary được giả lập tại ranh giới dịch vụ ngoài. Không sửa .env hoặc dữ liệu ứng dụng.

Database test: vna_api_test_1791433866969_7e525611. Kết nối: thành công. Dọn database test: đã xóa database do lượt test tạo.

Chạy lại từ thư mục backend: `npm.cmd run test:api`. File test: [all-api.test.mjs](<backend/tests/all-api.test.mjs>). JSON đầy đủ: [all-api-results.json](<backend/test-results/all-api-results.json>).

**Các ca thất bại**

| STT | Ca | Chi tiết |
| --- | --- | --- |
| — | Không có ca thất bại đã ghi nhận | Các giới hạn tích hợp vẫn áp dụng |

**Độ bao phủ endpoint**

| Method | Path | Số request | Response 2xx | Ca đạt/lỗi | Dịch vụ ngoài |
| --- | --- | --- | --- | --- | --- |
| GET | / | 1 | 1 | 1/0 | — |
| POST | /api/auth/zalo | 7 | 1 | 7/0 | Giả lập provider |
| POST | /api/auth/admin/login | 5 | 1 | 5/0 | — |
| POST | /api/auth/mock | 5 | 2 | 5/0 | — |
| GET | /api/auth/me | 6 | 1 | 6/0 | — |
| GET | /api/destinations | 3 | 3 | 3/0 | — |
| GET | /api/destinations/:id | 9 | 5 | 7/0 | — |
| POST | /api/destinations | 5 | 2 | 5/0 | — |
| PUT | /api/destinations/:id | 2 | 1 | 2/0 | — |
| PATCH | /api/destinations/:id | 2 | 1 | 2/0 | — |
| DELETE | /api/destinations/:id | 2 | 1 | 2/0 | — |
| GET | /api/articles | 2 | 2 | 2/0 | — |
| GET | /api/articles/:id | 7 | 4 | 6/0 | — |
| POST | /api/articles | 3 | 1 | 3/0 | — |
| PUT | /api/articles/:id | 2 | 1 | 2/0 | — |
| PATCH | /api/articles/:id | 2 | 1 | 2/0 | — |
| DELETE | /api/articles/:id | 2 | 1 | 2/0 | — |
| GET | /api/tours/saved | 3 | 2 | 3/0 | — |
| GET | /api/tours | 13 | 7 | 13/0 | — |
| GET | /api/tours/:id/departures | 2 | 2 | 2/0 | — |
| GET | /api/tours/:id | 7 | 4 | 6/0 | — |
| POST | /api/tours/:id/save | 2 | 2 | 2/0 | — |
| POST | /api/tours | 5 | 1 | 5/0 | — |
| PUT | /api/tours/:id | 2 | 1 | 2/0 | — |
| PATCH | /api/tours/:id | 2 | 1 | 2/0 | — |
| DELETE | /api/tours/:id | 2 | 1 | 2/0 | — |
| GET | /api/departures | 2 | 1 | 2/0 | — |
| GET | /api/departures/:id | 5 | 3 | 5/0 | — |
| POST | /api/departures | 4 | 1 | 4/0 | — |
| PUT | /api/departures/:id | 2 | 1 | 2/0 | — |
| PATCH | /api/departures/:id | 4 | 2 | 4/0 | — |
| DELETE | /api/departures/:id | 2 | 1 | 2/0 | — |
| POST | /api/bookings/quote | 45 | 32 | 45/0 | — |
| GET | /api/bookings/dashboard-data | 2 | 1 | 2/0 | — |
| GET | /api/bookings/mine | 1 | 1 | 1/0 | — |
| GET | /api/bookings | 2 | 2 | 2/0 | — |
| GET | /api/bookings/:id | 4 | 3 | 4/0 | — |
| POST | /api/bookings | 44 | 33 | 40/0 | — |
| PATCH | /api/bookings/:id/cancel | 13 | 9 | 11/0 | — |
| PATCH | /api/bookings/:id/status | 14 | 5 | 10/0 | — |
| POST | /api/payments/zalopay/create | 34 | 18 | 26/0 | Giả lập provider |
| POST | /api/payments/zalopay/webhook | 25 | 25 | 18/0 | Giả lập provider |
| POST | /api/payments/zalopay/:appTransId/query | 8 | 4 | 6/0 | Giả lập provider |
| POST | /api/payments/zalopay/:appTransId/refund | 10 | 3 | 5/0 | Giả lập provider |
| POST | /api/payments/zalopay/:appTransId/refund/query | 9 | 6 | 6/0 | Giả lập provider |
| POST | /api/upload | 8 | 1 | 8/0 | Giả lập provider |
| GET | /api/coupons | 3 | 1 | 3/0 | — |
| POST | /api/coupons | 7 | 3 | 6/0 | — |
| PUT | /api/coupons/:id | 3 | 1 | 3/0 | — |
| DELETE | /api/coupons/:id | 3 | 2 | 3/0 | — |

**Toàn bộ ca kiểm thử**

| STT | Kết quả | Ca | Loại | Bằng chứng/lỗi |
| --- | --- | --- | --- | --- |
| 1 | PASS | Server phản hồi đúng tên service | contract | GET / → 200 |
| 2 | PASS | API không tồn tại trả 404 | contract | {"message":"Không tìm thấy API.","code":"NOT_FOUND"} |
| 3 | PASS | JSON lỗi cú pháp trả 400 | contract | {"message":"Unexpected end of JSON input"} |
| 4 | PASS | Admin đăng nhập thành công, không lộ password | contract | POST /api/auth/admin/login → 200 |
| 5 | PASS | Admin sai mật khẩu trả 401 | contract | {"message":"Email hoặc mật khẩu không đúng."} |
| 6 | PASS | Admin thiếu email trả 400 | contract | {"message":"Email is required"} |
| 7 | PASS | Admin password quá 72 byte trả 400 | contract | {"message":"Mật khẩu không hợp lệ."} |
| 8 | PASS | Mock login bị chặn khi chưa bật | contract | POST /api/auth/mock → 403 |
| 9 | PASS | Mock login bị chặn ở production | contract | POST /api/auth/mock → 403 |
| 10 | PASS | Mock đăng nhập khách A | contract | POST /api/auth/mock → 200 |
| 11 | PASS | Mock đăng nhập khách B | contract | POST /api/auth/mock → 200 |
| 12 | PASS | Mock thiếu số điện thoại trả 400 | contract | {"message":"Số điện thoại không hợp lệ."} |
| 13 | PASS | GET me đúng khách và không trả password | contract | GET /api/auth/me → 200 |
| 14 | PASS | GET me không token trả 401 | contract | {"message":"Bạn cần đăng nhập để tiếp tục.","code":"AUTH_REQUIRED"} |
| 15 | PASS | GET me token sai trả 401 | contract | {"message":"Token không hợp lệ hoặc đã hết hạn.","code":"INVALID_TOKEN"} |
| 16 | PASS | Token hết hạn trả 401 | contract | GET /api/auth/me → 401 |
| 17 | PASS | Token sai audience trả 401 | contract | GET /api/auth/me → 401 |
| 18 | PASS | Khóa user có hiệu lực với token đang còn hạn | contract | GET /api/auth/me → 401 |
| 19 | PASS | Quyền admin lấy từ DB, không tin role tự chèn vào JWT | contract | GET /api/coupons → 403 |
| 20 | PASS | Zalo đăng nhập thành công qua provider giả lập | external-mocked | POST /api/auth/zalo → 200 |
| 21 | PASS | Zalo thiếu accessToken trả 400 | contract | {"message":"accessToken is required"} |
| 22 | PASS | Zalo token có xuống dòng trả 400 | contract | {"message":"accessToken không hợp lệ."} |
| 23 | PASS | Zalo provider invalid trả 401 | external-mocked | POST /api/auth/zalo → 401 |
| 24 | PASS | Zalo provider bad-id trả 401 | external-mocked | POST /api/auth/zalo → 401 |
| 25 | PASS | Zalo provider network-error trả 502 | external-mocked | POST /api/auth/zalo → 502 |
| 26 | PASS | Zalo thiếu cấu hình trả 503 | contract | POST /api/auth/zalo → 503 |
| 27 | PASS | Admin CREATE Destination | contract | POST /api/destinations → 201 |
| 28 | PASS | Admin CREATE Article | contract | POST /api/articles → 201 |
| 29 | PASS | Admin CREATE Tour | contract | POST /api/tours → 201 |
| 30 | PASS | Admin CREATE Departure | contract | POST /api/departures → 201 |
| 31 | PASS | Admin CREATE Coupon | contract | POST /api/coupons → 201 |
| 32 | PASS | READ list destinations | contract | GET /api/destinations → 200 |
| 33 | PASS | READ detail destinations | contract | GET /api/destinations/6ac71c8e888a0e02336bdab1 → 200 |
| 34 | PASS | Admin PUT destinations rồi đọc lại | contract | PUT /api/destinations/6ac71c8e888a0e02336bdab1 → 200; GET /api/destinations/6ac71c8e888a0e02336bdab1 → 200 |
| 35 | PASS | Admin PATCH destinations rồi đọc lại | contract | PATCH /api/destinations/6ac71c8e888a0e02336bdab1 → 200; GET /api/destinations/6ac71c8e888a0e02336bdab1 → 200 |
| 36 | PASS | Khách không CREATE destinations | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 37 | PASS | Khách không PUT destinations | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 38 | PASS | Khách không PATCH destinations | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 39 | PASS | Khách không DELETE destinations | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 40 | PASS | ID không hợp lệ khi đọc destinations | contract | {"message":"Invalid destination ID"} |
| 41 | PASS | ID không tồn tại khi đọc destinations | contract | {"message":"Điểm đến không tồn tại."} |
| 42 | PASS | READ list articles | contract | GET /api/articles → 200 |
| 43 | PASS | READ detail articles | contract | GET /api/articles/6ac71c8e888a0e02336bdab2 → 200 |
| 44 | PASS | Admin PUT articles rồi đọc lại | contract | PUT /api/articles/6ac71c8e888a0e02336bdab2 → 200; GET /api/articles/6ac71c8e888a0e02336bdab2 → 200 |
| 45 | PASS | Admin PATCH articles rồi đọc lại | contract | PATCH /api/articles/6ac71c8e888a0e02336bdab2 → 200; GET /api/articles/6ac71c8e888a0e02336bdab2 → 200 |
| 46 | PASS | Khách không CREATE articles | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 47 | PASS | Khách không PUT articles | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 48 | PASS | Khách không PATCH articles | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 49 | PASS | Khách không DELETE articles | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 50 | PASS | ID không hợp lệ khi đọc articles | contract | {"message":"Invalid article ID"} |
| 51 | PASS | ID không tồn tại khi đọc articles | contract | {"message":"Bài viết không tồn tại."} |
| 52 | PASS | READ list tours | contract | GET /api/tours → 200 |
| 53 | PASS | READ detail tours | contract | GET /api/tours/6ac71c8e888a0e02336bdab3 → 200 |
| 54 | PASS | Admin PUT tours rồi đọc lại | contract | PUT /api/tours/6ac71c8e888a0e02336bdab3 → 200; GET /api/tours/6ac71c8e888a0e02336bdab3 → 200 |
| 55 | PASS | Admin PATCH tours rồi đọc lại | contract | PATCH /api/tours/6ac71c8e888a0e02336bdab3 → 200; GET /api/tours/6ac71c8e888a0e02336bdab3 → 200 |
| 56 | PASS | Khách không CREATE tours | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 57 | PASS | Khách không PUT tours | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 58 | PASS | Khách không PATCH tours | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 59 | PASS | Khách không DELETE tours | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 60 | PASS | ID không hợp lệ khi đọc tours | contract | {"message":"ID tour không hợp lệ."} |
| 61 | PASS | ID không tồn tại khi đọc tours | contract | {"message":"Tour không tồn tại."} |
| 62 | PASS | READ list departures | contract | GET /api/departures → 200 |
| 63 | PASS | READ detail departures | contract | GET /api/departures/6ac71c8e888a0e02336bdab4 → 200 |
| 64 | PASS | Admin PUT departures rồi đọc lại | contract | PUT /api/departures/6ac71c8e888a0e02336bdab4 → 200; GET /api/departures/6ac71c8e888a0e02336bdab4 → 200 |
| 65 | PASS | Admin PATCH departures rồi đọc lại | contract | PATCH /api/departures/6ac71c8e888a0e02336bdab4 → 200; GET /api/departures/6ac71c8e888a0e02336bdab4 → 200 |
| 66 | PASS | Khách không CREATE departures | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 67 | PASS | Khách không PUT departures | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 68 | PASS | Khách không PATCH departures | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 69 | PASS | Khách không DELETE departures | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 70 | PASS | ID không hợp lệ khi đọc departures | contract | {"message":"Invalid ID"} |
| 71 | PASS | ID không tồn tại khi đọc departures | contract | {"message":"Chuyến không tồn tại"} |
| 72 | PASS | Admin READ và lọc Coupon | contract | GET /api/coupons?isActive=true&sort=oldest&page=1&limit=100 → 200 |
| 73 | PASS | Admin UPDATE Coupon | contract | PUT /api/coupons/6ac71c8f888a0e02336bdab5 → 200 |
| 74 | PASS | Coupon trùng code trả 400 | contract | {"message":"Mã giảm giá đã tồn tại."} |
| 75 | PASS | Coupon percentage quá 100 trả 400 | contract | {"message":"Phần trăm giảm không được vượt quá 100%."} |
| 76 | PASS | Khách bị chặn Coupon GET | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 77 | PASS | Khách bị chặn Coupon POST | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 78 | PASS | Khách bị chặn Coupon PUT | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 79 | PASS | Khách bị chặn Coupon DELETE | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 80 | PASS | Danh sách phân trang giới hạn tối đa 100 | contract | GET /api/destinations?page=0&limit=1000 → 200 |
| 81 | PASS | Text search có index: destinations | contract | GET /api/destinations?q=API → 200 |
| 82 | PASS | Text search có index: articles | contract | GET /api/articles?q=API → 200 |
| 83 | PASS | Text search có index: tours | contract | GET /api/tours?q=API → 200 |
| 84 | PASS | Tour lọc giá/ngày/chủ đề/thời lượng/điểm đến | contract | GET /api/tours?destinationId=6ac71c8e888a0e02336bdab1&theme=nature&maxDurationHours=4&minPrice=400000&maxPrice=600000&dateFrom=2026-10-13T04%3A31%3A17.198Z&dateTo=2026-10-16T04%3A31%3A17.198Z&sort=price_asc → 200 |
| 85 | PASS | Tour sort newest | contract | {"data":[{"_id":"6ac71c8e888a0e02336bdab3","name":"API TEST TOUR 1791433866969-7e525611","slug":"api-test-tour-1791433866969-7e525611","summary":"Tóm tắt tour đã sửa","durationHours":4,"themes":["nature"],"destinationIds":["6ac71c8e888a0e02336bdab1"],"itinerary":[{"title":"Điểm dừng demo","description":"Hoạt động giả lập.","destinationId":"6ac71c8e888a0e02336bdab1"}],"images":[],"meetingPoint":"Điểm hẹn demo","includes":["Dịch vụ demo"],"excludes":[],"childPolicy":"Giá trẻ em theo chuyến demo.","cancellationPolicy":"Chính sách demo.","status":"published","soldCount":0,"createdAt":"2026-10-08T04:31:10.810Z","updatedAt":"2026-10-08T04:31:14.080Z","__v":2,"priceFrom":500000,"hasUpcomingDeparture":true}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}} |
| 86 | PASS | Tour sort duration | contract | {"data":[{"_id":"6ac71c8e888a0e02336bdab3","name":"API TEST TOUR 1791433866969-7e525611","slug":"api-test-tour-1791433866969-7e525611","summary":"Tóm tắt tour đã sửa","durationHours":4,"themes":["nature"],"destinationIds":["6ac71c8e888a0e02336bdab1"],"itinerary":[{"title":"Điểm dừng demo","description":"Hoạt động giả lập.","destinationId":"6ac71c8e888a0e02336bdab1"}],"images":[],"meetingPoint":"Điểm hẹn demo","includes":["Dịch vụ demo"],"excludes":[],"childPolicy":"Giá trẻ em theo chuyến demo.","cancellationPolicy":"Chính sách demo.","status":"published","soldCount":0,"createdAt":"2026-10-08T04:31:10.810Z","updatedAt":"2026-10-08T04:31:14.080Z","__v":2,"priceFrom":500000,"hasUpcomingDeparture":true}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}} |
| 87 | PASS | Tour sort price_desc | contract | {"data":[{"_id":"6ac71c8e888a0e02336bdab3","name":"API TEST TOUR 1791433866969-7e525611","slug":"api-test-tour-1791433866969-7e525611","summary":"Tóm tắt tour đã sửa","durationHours":4,"themes":["nature"],"destinationIds":["6ac71c8e888a0e02336bdab1"],"itinerary":[{"title":"Điểm dừng demo","description":"Hoạt động giả lập.","destinationId":"6ac71c8e888a0e02336bdab1"}],"images":[],"meetingPoint":"Điểm hẹn demo","includes":["Dịch vụ demo"],"excludes":[],"childPolicy":"Giá trẻ em theo chuyến demo.","cancellationPolicy":"Chính sách demo.","status":"published","soldCount":0,"createdAt":"2026-10-08T04:31:10.810Z","updatedAt":"2026-10-08T04:31:14.080Z","__v":2,"priceFrom":500000,"hasUpcomingDeparture":true}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}} |
| 88 | PASS | Tour sort most_bought | contract | {"data":[{"_id":"6ac71c8e888a0e02336bdab3","name":"API TEST TOUR 1791433866969-7e525611","slug":"api-test-tour-1791433866969-7e525611","summary":"Tóm tắt tour đã sửa","durationHours":4,"themes":["nature"],"destinationIds":["6ac71c8e888a0e02336bdab1"],"itinerary":[{"title":"Điểm dừng demo","description":"Hoạt động giả lập.","destinationId":"6ac71c8e888a0e02336bdab1"}],"images":[],"meetingPoint":"Điểm hẹn demo","includes":["Dịch vụ demo"],"excludes":[],"childPolicy":"Giá trẻ em theo chuyến demo.","cancellationPolicy":"Chính sách demo.","status":"published","soldCount":0,"createdAt":"2026-10-08T04:31:10.810Z","updatedAt":"2026-10-08T04:31:14.080Z","__v":2,"priceFrom":500000,"hasUpcomingDeparture":true}],"pagination":{"page":1,"limit":10,"total":1,"pages":1}} |
| 89 | PASS | Tour query sai: theme=bad | contract | {"message":"Chủ đề không hợp lệ."} |
| 90 | PASS | Tour query sai: sort=bad | contract | {"message":"Tùy chọn sắp xếp không hợp lệ."} |
| 91 | PASS | Tour query sai: minPrice=999&maxPrice=1 | contract | {"message":"minPrice phải nhỏ hơn hoặc bằng maxPrice."} |
| 92 | PASS | Tour query sai: maxDurationHours=0 | contract | {"message":"maxDurationHours không hợp lệ."} |
| 93 | PASS | Tour query sai: dateFrom=bad-date | contract | {"message":"dateFrom không hợp lệ."} |
| 94 | PASS | Chuyến công khai nằm dưới /tours/:id/departures | contract | GET /api/tours/6ac71c8e888a0e02336bdab3/departures → 200 |
| 95 | PASS | Danh sách chuyến quản trị chặn user | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 96 | PASS | Nội dung draft chỉ admin thấy | contract | POST /api/destinations → 201; GET /api/destinations/6ac71c95888a0e02336bdabb → 404; GET /api/destinations/6ac71c95888a0e02336bdabb → 200 |
| 97 | PASS | Catalog token sai không được bỏ qua | contract | {"message":"Token không hợp lệ hoặc đã hết hạn.","code":"INVALID_TOKEN"} |
| 98 | PASS | Published Destination thiếu nguồn trả 400 | contract | {"message":"Nội dung xuất bản cần có ít nhất một nguồn."} |
| 99 | PASS | Published Article thiếu nguồn trả 400 | contract | {"message":"Nội dung xuất bản cần có ít nhất một nguồn."} |
| 100 | PASS | Published Tour thiếu itinerary trả 400 | contract | {"message":"Tour xuất bản cần có lịch trình."} |
| 101 | PASS | Điểm dừng ngoài destinationIds bị chặn | contract | {"message":"Điểm dừng phải thuộc destinationIds của tour."} |
| 102 | PASS | Hạn đặt sau khởi hành trả 400 | contract | {"message":"Hạn đặt phải trước thời điểm khởi hành."} |
| 103 | PASS | Giá chuyến dạng chuỗi bị chặn | contract | {"message":"Invalid adultPrice"} |
| 104 | PASS | Lưu tour và đọc danh sách saved | contract | POST /api/tours/6ac71c8e888a0e02336bdab3/save → 200; GET /api/tours/saved → 200 |
| 105 | PASS | Bỏ lưu tour bằng toggle | contract | POST /api/tours/6ac71c8e888a0e02336bdab3/save → 200; GET /api/tours/saved → 200 |
| 106 | PASS | Saved tour không token trả 401 | contract | {"message":"Bạn cần đăng nhập để tiếp tục.","code":"AUTH_REQUIRED"} |
| 107 | PASS | Quote tính đúng 2 người lớn + 1 trẻ em | contract | POST /api/bookings/quote → 200 |
| 108 | PASS | Quote chặn adults bằng 0 | contract | {"message":"Số lượng người lớn không hợp lệ."} |
| 109 | PASS | Quote chặn adults dạng chuỗi | contract | {"message":"Số lượng người lớn không hợp lệ."} |
| 110 | PASS | Quote chặn adults số lẻ | contract | {"message":"Số lượng người lớn không hợp lệ."} |
| 111 | PASS | Quote chặn children âm | contract | {"message":"Số lượng trẻ em không hợp lệ."} |
| 112 | PASS | Quote chặn vượt 10 khách | contract | {"message":"Mỗi yêu cầu nhận tối đa 10 khách."} |
| 113 | PASS | Quote chặn ID sai | contract | {"message":"departureId không hợp lệ."} |
| 114 | PASS | Quote chặn chuyến không tồn tại | contract | {"message":"Chuyến không tồn tại."} |
| 115 | PASS | Quote chặn coupon không tồn tại | contract | {"message":"Mã giảm giá không tồn tại."} |
| 116 | PASS | Quote trẻ em yêu cầu childPolicy | contract | POST /api/bookings/quote → 400 |
| 117 | PASS | Quote coupon đúng, chưa trừ quota | contract | POST /api/bookings/quote → 200 |
| 118 | PASS | Quote chặn coupon inactive | contract | POST /api/bookings/quote → 400 |
| 119 | PASS | Quote chặn coupon expired | contract | POST /api/bookings/quote → 400 |
| 120 | PASS | Quote chặn coupon quota exhausted | contract | POST /api/bookings/quote → 400 |
| 121 | PASS | Quote chặn coupon minimum order | contract | POST /api/bookings/quote → 400 |
| 122 | PASS | Tạo booking A pending_confirmation/unpaid | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201 |
| 123 | PASS | Replay cùng payload/key trả đúng đơn cũ | contract | POST /api/bookings → 200 |
| 124 | PASS | Cùng key đổi payload trả 409 | contract | POST /api/bookings → 409 |
| 125 | PASS | Thứ tự khóa contact không gây conflict | contract | POST /api/bookings → 200 |
| 126 | PASS | 5 request đồng thời cùng key chỉ tạo một booking | concurrency | {"statuses":[200,201,200,200,200],"documents":1} |
| 127 | PASS | Tạo booking chặn thiếu quoteToken | contract | {"message":"quoteToken là bắt buộc."} |
| 128 | PASS | Tạo booking chặn thiếu contact | contract | {"message":"Thông tin liên hệ là bắt buộc."} |
| 129 | PASS | Tạo booking chặn contact thiếu phone | contract | {"message":"Số điện thoại liên hệ là bắt buộc."} |
| 130 | PASS | Tạo booking chặn thiếu header | contract | {"message":"Header Idempotency-Key là bắt buộc (ít nhất 8 ký tự)."} |
| 131 | PASS | Tạo booking chặn key quá ngắn | contract | {"message":"Header Idempotency-Key là bắt buộc (ít nhất 8 ký tự)."} |
| 132 | PASS | QuoteToken bị sửa trả 409 | contract | POST /api/bookings → 409 |
| 133 | PASS | QuoteToken hết hạn trả 409 | contract | POST /api/bookings → 409 |
| 134 | PASS | Thay giá sau quote: 409, rollback quota coupon | contract | POST /api/bookings/quote → 200; PATCH /api/departures/6ac71c8e888a0e02336bdab4 → 200; POST /api/bookings → 409 |
| 135 | PASS | Hạ maxGuests sau quote được kiểm tra lúc tạo | contract | POST /api/bookings/quote → 200; POST /api/bookings → 400 |
| 136 | PASS | Đóng chuyến sau quote chặn tạo booking | contract | POST /api/bookings/quote → 200; POST /api/bookings → 409 |
| 137 | PASS | Khách xem mine chỉ có đơn của mình | contract | GET /api/bookings/mine?status=pending_confirmation → 200 |
| 138 | PASS | Khách B GET bookings không thấy đơn A | contract | GET /api/bookings → 200 |
| 139 | PASS | Khách A đọc detail của mình | contract | GET /api/bookings/6ac71c99888a0e02336bdac2 → 200 |
| 140 | PASS | Khách B không đọc detail A | contract | {"message":"Đơn không tồn tại."} |
| 141 | PASS | Admin list booking theo code/departure | contract | GET /api/bookings?code=VNA-4C6D130CE4EE&departureId=6ac71c8e888a0e02336bdab4 → 200 |
| 142 | PASS | Khách không gọi admin status | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 143 | PASS | Admin confirmed A, paymentStatus vẫn unpaid | contract | PATCH /api/bookings/6ac71c99888a0e02336bdac2/status → 200 |
| 144 | PASS | Không confirmed A hai lần | contract | {"message":"Không thể chuyển trạng thái đơn theo yêu cầu."} |
| 145 | PASS | Không completed A trước khi tour kết thúc | contract | {"message":"Tour chưa kết thúc nên chưa thể hoàn thành."} |
| 146 | PASS | Không đổi lịch chuyến đã có booking | contract | {"message":"Chuyến đã có yêu cầu đặt. Hãy tạo chuyến mới và xử lý với khách trước khi đổi lịch."} |
| 147 | PASS | Admin dashboard có trạng thái và tổng giá trị đơn | contract | GET /api/bookings/dashboard-data → 200 |
| 148 | PASS | Dashboard chặn khách | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 149 | PASS | Tạo B và hủy bắt buộc lý do | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; PATCH /api/bookings/6ac71ca1888a0e02336bdac8/cancel → 400 |
| 150 | PASS | Sai chủ không hủy B | contract | {"message":"Đơn không tồn tại."} |
| 151 | PASS | Chủ đơn hủy B và không hủy lần hai | contract | PATCH /api/bookings/6ac71ca1888a0e02336bdac8/cancel → 200; PATCH /api/bookings/6ac71ca1888a0e02336bdac8/cancel → 409 |
| 152 | PASS | Không mở lại đơn đã hủy | contract | {"message":"Không thể chuyển trạng thái đơn theo yêu cầu."} |
| 153 | PASS | Coupon tạo C tăng quota, hủy hoàn quota | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; PATCH /api/bookings/6ac71ca2888a0e02336bdac9/cancel → 200 |
| 154 | PASS | Admin rejected cần lý do và không mở lại | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; PATCH /api/bookings/6ac71ca3888a0e02336bdaca/status → 400; PATCH /api/bookings/6ac71ca3888a0e02336bdaca/status → 200; PATCH /api/bookings/6ac71ca3888a0e02336bdaca/status → 409 |
| 155 | PASS | Completed sau giờ kết thúc cộng điểm đúng một lần (fixture quá khứ) | contract | {"fixture":"Chỉ database test; departureAt quá khứ","pointsAdded":135} |
| 156 | PASS | ZaloPay chặn khách thanh toán đơn người khác | contract | {"message":"Không có quyền thanh toán đơn này."} |
| 157 | PASS | ZaloPay chặn đơn đã cancelled | contract | {"message":"Đơn hàng không thể thanh toán ở trạng thái hiện tại."} |
| 158 | PASS | ZaloPay booking không tồn tại trả 404 | contract | {"message":"Không tìm thấy đơn hàng."} |
| 159 | PASS | ZaloPay thiếu cấu hình trả 503 | contract | POST /api/payments/zalopay/create → 503 |
| 160 | PASS | ZaloPay tạo giao dịch, xác minh MAC gửi provider | external-mocked | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200 |
| 161 | PASS | ZaloPay chặn tạo tiếp khi đã pending | contract | {"message":"Đã có giao dịch đang chờ. Hãy truy vấn trạng thái giao dịch.","code":"PAYMENT_PENDING","appTransId":"261008_0982fcfe2db2711150a98b41"} |
| 162 | PASS | Webhook sai MAC trả return_code -1 | contract | POST /api/payments/zalopay/webhook → 200 |
| 163 | PASS | Webhook đúng MAC nhưng sai app_id bị chặn | contract | POST /api/payments/zalopay/webhook → 200 |
| 164 | PASS | Webhook transaction không tồn tại bị chặn | contract | POST /api/payments/zalopay/webhook → 200 |
| 165 | PASS | Webhook đúng chữ ký: paid, không tự confirmed | contract | POST /api/payments/zalopay/webhook → 200; GET /api/bookings/6ac71ca5888a0e02336bdacd → 200 |
| 166 | PASS | Webhook success replay không lặp payment_received | contract | POST /api/payments/zalopay/webhook → 200 |
| 167 | PASS | Không tạo giao dịch cho đơn đã paid | contract | {"message":"Đơn hàng đã được thanh toán hoặc đang hoàn tiền."} |
| 168 | PASS | Hủy đơn paid chuyển Booking refund_pending | contract | PATCH /api/bookings/6ac71ca5888a0e02336bdacd/cancel → 200 |
| 169 | PASS | Tiền về sau khi hủy: không mở lại booking | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; PATCH /api/bookings/6ac71ca9888a0e02336bdacf/cancel → 200; POST /api/payments/zalopay/webhook → 200 |
| 170 | PASS | Webhook sai amount bị từ chối | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200 |
| 171 | PASS | Provider từ chối: API 400 và transaction failed | external-mocked | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 400 |
| 172 | PASS | Admin upload ảnh thành công qua Cloudinary giả lập | external-mocked | POST /api/upload → 200 |
| 173 | PASS | Upload không file trả 400 | contract | {"message":"Vui lòng chọn ảnh để upload.","code":"NO_FILE_PROVIDED"} |
| 174 | PASS | Upload chặn khách | contract | {"message":"Chỉ nhân viên quản trị được thực hiện thao tác này.","code":"ADMIN_REQUIRED"} |
| 175 | PASS | Upload không đăng nhập trả 401 | contract | {"message":"Bạn cần đăng nhập để tiếp tục.","code":"AUTH_REQUIRED"} |
| 176 | PASS | Cloudinary lỗi trả 500 có kiểm soát | external-mocked | POST /api/upload → 500 |
| 177 | PASS | Đầu vào sai: Destination.address object phải trả 400 | regression | POST /api/destinations → 400 |
| 178 | PASS | Đầu vào sai: Tour.childPolicy object phải trả 400 | regression | POST /api/tours → 400 |
| 179 | PASS | Đầu vào sai: bookingId ZaloPay phải trả 400 | regression | POST /api/payments/zalopay/create → 400 |
| 180 | PASS | File không phải ảnh phải trả 400 | regression | POST /api/upload → 400 |
| 181 | PASS | File lớn hơn 5MB phải trả 413 | regression | POST /api/upload → 413 |
| 182 | PASS | Sai field upload phải trả 400 | regression | POST /api/upload → 400 |
| 183 | PASS | Coupon validUntil trước validFrom phải bị từ chối | regression | POST /api/coupons → 400 |
| 184 | PASS | Coupon isActive chuỗi false không được bật mã | regression | PUT /api/coupons/6ac71cae888a0e02336bdad6 → 400 |
| 185 | PASS | Reason sai kiểu ở confirmed phải trả 400 | regression | POST /api/bookings/quote → 200; POST /api/bookings → 201; PATCH /api/bookings/6ac71cae888a0e02336bdad7/status → 400 |
| 186 | PASS | Thanh toán + confirm chỉ tăng soldCount một lần | regression | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200; PATCH /api/bookings/6ac71caf888a0e02336bdad8/status → 200 |
| 187 | PASS | Hủy booking paid đồng bộ PaymentTransaction refund_pending | regression |  |
| 188 | PASS | Callback refund_pending gửi lại không thêm lịch sử trùng | regression | POST /api/payments/zalopay/webhook → 200 |
| 189 | PASS | Webhook retry khôi phục booking nếu save lỗi lần đầu | fault-injection | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/webhook → 200 |
| 190 | PASS | Mất mạng giữ claim; đối soát được tiền đã thu mà không tạo giao dịch mới | fault-injection | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 502; POST /api/payments/zalopay/create → 409; POST /api/payments/zalopay/261008_17128cb59712b0851072a7ae/query → 200 |
| 191 | PASS | Hai request hủy đồng thời không làm quota coupon âm | concurrency | POST /api/bookings/quote → 200; POST /api/bookings → 201; PATCH /api/bookings/6ac71cb5888a0e02336bdade/cancel → 200; PATCH /api/bookings/6ac71cb5888a0e02336bdade/cancel → 409 |
| 192 | PASS | Xóa rồi tạo lại cùng mã coupon: hủy đơn cũ không trừ quota mã mới | regression | POST /api/coupons → 201; POST /api/bookings/quote → 200; POST /api/bookings → 201; DELETE /api/coupons/6ac71cb6888a0e02336bdadf → 200; POST /api/coupons → 201; PATCH /api/bookings/6ac71cb7888a0e02336bdae0/cancel → 200 |
| 193 | PASS | Năm yêu cầu tạo thanh toán đồng thời chỉ tạo một giao dịch | concurrency | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/create → 409; POST /api/payments/zalopay/create → 409; POST /api/payments/zalopay/create → 409; POST /api/payments/zalopay/create → 409 |
| 194 | PASS | Năm callback đồng thời chỉ ghi nhận tiền một lần | concurrency | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/webhook → 200 |
| 195 | PASS | Hủy và callback đồng thời đồng bộ trạng thái cần hoàn tiền | concurrency | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; PATCH /api/bookings/6ac71cbb888a0e02336bdaea/cancel → 200; POST /api/payments/zalopay/webhook → 200 |
| 196 | PASS | Query chặn người không phải chủ đơn; admin được đối soát | contract | POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/query → 403; POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/query → 401; POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/query → 200 |
| 197 | PASS | Callback sai amount sau success không được hạ trạng thái | regression | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/webhook → 200 |
| 198 | PASS | Query sai amount không đánh dấu booking paid | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/261008_c2fe6d383098fd6f0baf975b/query → 502 |
| 199 | PASS | Giao dịch pending hết hạn được query rồi cho thanh toán lại | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/261008_94fb3dc4ee1f496d730107e0/query → 200; POST /api/payments/zalopay/create → 200 |
| 200 | PASS | Query lỗi MAC/hệ thống không tự giải phóng giao dịch cũ | contract | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/261008_5ab1493b960b01d7010ce064/query → 200; POST /api/payments/zalopay/create → 409 |
| 201 | PASS | Query mất mạng không thay đổi kết quả đã lưu | fault-injection | POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/query → 502 |
| 202 | PASS | Legacy transaction success nhưng booking unpaid được callback sửa lại | regression | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200 |
| 203 | PASS | Legacy success/unpaid không được tạo thêm giao dịch | regression | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/create → 400 |
| 204 | PASS | Admin đọc booking lấy được mã giao dịch để xử lý hoàn tiền | contract | GET /api/bookings/6ac71ca9888a0e02336bdacf → 200 |
| 205 | PASS | Refund chỉ dành cho admin và đơn cần hoàn tiền | contract | POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund → 403; POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund/query → 403; POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund → 401; POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/261008_8a2b15d611943a5321ddaa9e/refund → 409; POST /api/payments/zalopay/261008_8a2b15d611943a5321ddaa9e/refund/query → 409 |
| 206 | PASS | Admin gửi refund không báo refunded trước khi provider xác nhận | external-mocked | POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund → 202; POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund → 409; POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund/query → 200 |
| 207 | PASS | Query refund thành công đồng bộ hai model, replay không lặp lịch sử | external-mocked | POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund/query → 200; POST /api/payments/zalopay/261008_6f13b6c7611fe70619f0f6fc/refund/query → 200; POST /api/payments/zalopay/webhook → 200 |
| 208 | PASS | Refund mất mạng giữ cùng request ID, không gửi thêm lệnh hoàn tiền | fault-injection | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200; PATCH /api/bookings/6ac71ccd888a0e02336bdafb/cancel → 200; POST /api/payments/zalopay/261008_149cdca2e30797acd71475bc/refund → 502; POST /api/payments/zalopay/261008_149cdca2e30797acd71475bc/refund → 409; POST /api/payments/zalopay/261008_149cdca2e30797acd71475bc/refund/query → 200 |
| 209 | PASS | Hai request refund đồng thời chỉ gửi một lệnh tới provider | concurrency | POST /api/payments/zalopay/261008_0982fcfe2db2711150a98b41/refund → 202; POST /api/payments/zalopay/261008_0982fcfe2db2711150a98b41/refund → 409 |
| 210 | PASS | Query refund lỗi lưu booking rollback cả transaction | fault-injection | POST /api/payments/zalopay/261008_0982fcfe2db2711150a98b41/refund/query → 500; POST /api/payments/zalopay/261008_0982fcfe2db2711150a98b41/refund/query → 200 |
| 211 | PASS | Tiền mới về sau khi đã refund phải chuyển lại refund_pending | regression | POST /api/payments/zalopay/webhook → 200 |
| 212 | PASS | Hai giao dịch nhận tiền: giao dịch thứ hai cần refund, đơn vẫn paid | regression | POST /api/bookings/quote → 200; POST /api/bookings → 201; POST /api/payments/zalopay/create → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/webhook → 200; POST /api/payments/zalopay/LEGACY-DUP-1791433866969-7e525611/refund → 202; POST /api/payments/zalopay/LEGACY-DUP-1791433866969-7e525611/refund/query → 200 |
| 213 | PASS | Lỗi lưu điểm rollback completed và retry cộng đúng một lần | fault-injection | PATCH /api/bookings/6ac71cd4888a0e02336bdb01/status → 500; PATCH /api/bookings/6ac71cd4888a0e02336bdb01/status → 200 |
| 214 | PASS | Khách được hủy booking A đã confirmed | contract | PATCH /api/bookings/6ac71c99888a0e02336bdac2/cancel → 200 |
| 215 | PASS | Admin DELETE Coupon xóa document | contract | DELETE /api/coupons/6ac71c8f888a0e02336bdab5 → 200 |
| 216 | PASS | Admin DELETE Departure là đóng nhận đặt | contract | DELETE /api/departures/6ac71c8e888a0e02336bdab4 → 200; GET /api/tours/6ac71c8e888a0e02336bdab3/departures → 200 |
| 217 | PASS | Admin DELETE tours archive, khách không thấy | contract | DELETE /api/tours/6ac71c8e888a0e02336bdab3 → 200; GET /api/tours/6ac71c8e888a0e02336bdab3 → 404; GET /api/tours/6ac71c8e888a0e02336bdab3 → 200 |
| 218 | PASS | Admin DELETE articles archive, khách không thấy | contract | DELETE /api/articles/6ac71c8e888a0e02336bdab2 → 200; GET /api/articles/6ac71c8e888a0e02336bdab2 → 404; GET /api/articles/6ac71c8e888a0e02336bdab2 → 200 |
| 219 | PASS | Admin DELETE destinations archive, khách không thấy | contract | DELETE /api/destinations/6ac71c8e888a0e02336bdab1 → 200; GET /api/destinations/6ac71c8e888a0e02336bdab1 → 404; GET /api/destinations/6ac71c8e888a0e02336bdab1 → 200 |
| 220 | PASS | Đã gọi đủ mọi endpoint đang mount | coverage | {"apiEndpoints":49,"coveredApiEndpoints":49} |

**Giới hạn**

Bao phủ tất cả endpoint không đồng nghĩa đã kiểm tra mọi nhánh, mọi payload hay tích hợp nhà cung cấp thật. Các ca fault-injection cố tình gây lỗi lưu DB/provider để kiểm tra khả năng khôi phục; không mô tả một sự cố sản xuất đã xảy ra.

- Chưa xác minh: Zalo thật với access token người dùng.
- Chưa xác minh: Thanh toán/callback ZaloPay sandbox thật.
- Chưa xác minh: Upload vào Cloudinary thật.
- Chưa xác minh: Mọi tổ hợp dữ liệu và mọi lịch thực thi đồng thời; endpoint coverage không phải exhaustive path coverage.
