# Tài khoản, dữ liệu chung và quản trị GDQPAN

Trạng thái: đã triển khai bản kiểm thử local của máy chủ, trang quản trị và kết nối tài khoản cho mobile/desktop. Hướng dẫn tại `server/README.md`. Chưa triển khai VPS hoặc gửi email thật. Chi phí thuê máy chủ sẽ bàn sau khi người dùng thống nhất với nhóm; chưa chọn hoặc đặt mua dịch vụ.

## Yêu cầu đã xác nhận

- Mobile và desktop dùng chung tài khoản, đồng bộ dữ liệu giữa thiết bị.
- Đăng ký bằng email và mật khẩu. Xác minh email xong được sử dụng ngay; admin có thể khóa sau. Không cần admin duyệt trước khi sử dụng.
- Gửi email xác minh và đặt lại mật khẩu tự động. Chưa xác minh email thì chưa được sử dụng.
- Quy mô dự kiến tối đa 100 tài khoản/thiết bị; tổng âm thanh chung tối đa 2–3 GB, không phải 3 GB riêng cho mỗi tài khoản.
- Admin quản lý dữ liệu chung; người dùng chỉ sử dụng, không sửa dữ liệu chung.
- Dữ liệu gồm Thông báo khác & Phòng thu, lịch phát tự động, nhật ký sử dụng và cài đặt.
- Đồng bộ cả tệp âm thanh tải lên, thu âm và ghép thuộc phạm vi trên.
- Chỉ được dùng khi có kết nối máy chủ và tài khoản hợp lệ. Không cho dùng offline.
- Trước mỗi lần phát lịch phải kiểm tra tài khoản/kết nối với máy chủ; nếu không hợp lệ hoặc không kết nối được thì bỏ qua. Không yêu cầu kiểm tra liên tục để dừng một lịch đang phát khi mất mạng.
- Admin chỉnh dữ liệu chung trên cả web quản trị, mobile và desktop.
- Lịch chung phát trên các thiết bị đã đăng nhập bằng tài khoản hợp lệ trong quản trị. Người dùng không tự thêm âm thanh hoặc lịch phát.
- Lịch đồng bộ khi mở lại ứng dụng. Khi admin đổi dữ liệu mà thiết bị chưa mở lại app, lịch đã nhận trên thiết bị vẫn phát nếu tài khoản được máy chủ xác nhận hợp lệ; không tự vô hiệu hóa lịch cũ vì dữ liệu chung có phiên bản mới.
- Trang quản trị: danh sách tài khoản, duyệt/khóa, thiết bị đang dùng, thời hạn sử dụng, phiên bản ứng dụng và thông báo cập nhật. Chức năng duyệt vẫn có thể nằm trong quản trị, nhưng không là điều kiện đăng ký theo lựa chọn đã xác nhận.
- Email admin đầu tiên: chinm.t2.2225@gmail.com. Mật khẩu không được cung cấp hoặc ghi trong tài liệu/mã nguồn. Vai trò admin phải được cấp qua quy trình máy chủ; không được cấp chỉ vì client gửi email này.
- Máy cá nhân có Windows 10, Windows 11 và macOS, không bảo đảm bật liên tục. Đã chọn thuê VPS chạy server và trang quản trị; chưa chọn nhà cung cấp, ngân sách hoặc tên miền.

## Hiện trạng đã kiểm tra

Desktop dùng Electron. Mobile Android được tạo từ cùng nguồn chức năng desktop qua mobile/build-web.js, với giao diện và cầu nối native riêng.

Máy chủ lưu tài khoản, lịch chung, nhật ký và thông báo trong SQLite; tệp âm thanh trong kho riêng. Thiết bị giữ bản đã đồng bộ trong localStorage/IndexedDB. Thu âm và bản ghép có thể gán vào hiệu lệnh/lịch để công bố hoặc lưu tệp rồi tải vào thư viện phòng thu chung. Dữ liệu trước đăng nhập được sao lưu riêng trên thiết bị để admin khôi phục và xem lại trước khi công bố.

Báo thức nền Android chạy qua AlarmReceiver và AlarmPlaybackService từ lịch đã nhận; kiểm tra tài khoản/kết nối ngay trước mỗi lịch. Phiên đăng nhập native được mã hóa bằng Android KeyStore. Bản kiểm thử đã xác nhận phát khi màn hình tắt, bỏ qua tài khoản khóa, bỏ qua máy chủ không kết nối được và nút Dừng; chưa kiểm thử trên điện thoại thật.

## Các quyết định đang chờ

1. Ngân sách/tháng, nhà cung cấp VPS, tên miền và dịch vụ email cụ thể sẽ bàn sau. Xem NGAN_SACH_DU_TRU_GDQPAN.md để trao đổi trong nhóm; không cần đặt mua dịch vụ để chuẩn bị bản kiểm thử local.
2. Cấu hình VPS/tên miền/email cụ thể và thông tin kết nối sẽ được cung cấp khi người dùng thống nhất với nhóm; chưa tự mua hoặc tạo dịch vụ trả phí.

## Điểm cần kiểm chứng khi triển khai

- Máy chủ kiểm tra vai trò với mọi thao tác sửa dữ liệu chung và quản trị, kể cả khi gọi API trực tiếp.
- Tài khoản khóa/hết hạn không được lấy dữ liệu, phát thủ công hoặc thực hiện lịch theo chính sách được chốt; xử lý cả đường phát native Android.
- Đồng bộ nội dung và tệp âm thanh phải hoàn tất nhất quán trước khi thay lịch đang dùng; không ghi đè bản dữ liệu hiện tại bằng bản tải chưa đầy đủ.
- Nhật ký hoạt động của các thiết bị cần phân biệt nguồn; tài khoản người dùng không được tự cấp quyền quản trị.
- Thử đăng ký, đăng nhập, đăng xuất, phân quyền, khóa/hết hạn, mất kết nối, đồng bộ nhiều thiết bị và báo thức khóa màn hình.
- Dữ liệu cũ hiện có cần được bảo toàn; chưa tự chọn nguồn dữ liệu để nhập thành bộ dữ liệu chung.
- Chưa tạo hosting trả phí, triển khai công khai hoặc phát hành bản ứng dụng có tài khoản.
