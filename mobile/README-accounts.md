# GDQPAN 1.2 — bản kiểm thử tài khoản 1.3.0

APK: `GDQPAN-1.3.0-test.apk`, versionCode 5. Tên hiển thị vẫn **GDQPAN 1.2**, gói `vn.gdqpan.app.mobile` theo lựa chọn cài song song với ứng dụng gốc. Dùng cùng khóa debug của bản 1.2.1 trong workspace, cài cập nhật vào GDQPAN 1.2; không gỡ ứng dụng để cập nhật. APK gốc `GDQPAN.apk` được giữ nguyên.

Bản này bắt buộc máy chủ tài khoản hợp lệ. Chưa có VPS, nên cần chạy máy chủ local/emulator để xem thử; điện thoại thật cần địa chỉ HTTPS có thể truy cập. Cấu hình tài khoản và hướng dẫn admin nằm trong `../server/README.md`.

Mã nguồn giữ các chức năng desktop, nhập giọng nói có xem/chèn bản chép lời, lịch gọn với nút **+**, hộp thoại xác nhận thao tác và báo thức nền có màn hình **Dừng**. Quyền của user được giới hạn theo dữ liệu chung do admin công bố.

Build bằng `powershell -NoProfile -ExecutionPolicy Bypass -File .\build-android.ps1` trong thư mục mobile. Bản kiểm thử chưa thay thế bản ổn định hoặc kiểm thử trên điện thoại thật. Bản macOS cần build trên máy Mac.
