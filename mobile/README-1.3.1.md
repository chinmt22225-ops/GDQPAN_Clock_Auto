# Android 1.3.1 — giao diện và thư viện nhạc

Đây là tài liệu lịch sử của bản 1.3.1. Bản 1.4.0 bổ sung 93 bài có sẵn và giới hạn thêm âm thanh trong Phòng thu; nhật ký chung được cập nhật tại ../NHAT_KY_CAP_NHAT.md.

Phạm vi: chỉ Android. Kiểm tra mã nguồn hiện tại và APK chính thức 1.2.1 cho thấy trang chủ còn “Nhạc & VTV”, “Thu & ghép âm”; hai nút cùng vào trang Âm thanh chứa cả nhạc và phòng thu. Danh mục nhạc chưa đủ theo yêu cầu ngày 11/10/2026.

## Thay đổi

- Trang chủ: lịch phát tiếp theo, Hiệu lệnh, Nhạc, Nhạc tùy chọn, Phòng thu. Thanh điều hướng giữ Trang chủ, Hiệu lệnh, Nhạc, Lịch phát, Tiện ích.
- Phòng thu là trang riêng, giữ chức năng đọc văn bản, thu âm, ghép âm. Nhạc không chứa phòng thu.
- VTV và quản trị tài khoản chuyển vào Tiện ích. Dữ liệu âm thanh phòng thu được công bố trên máy chủ vẫn truy cập tại khu vực tài khoản.
- Thanh trạng thái dùng nền xanh và biểu tượng sáng; nút quay lại cửa sổ video dùng chiều cao 56dp để không bị cắt trên màn hình mật độ cao.
- Thêm danh mục truyền thống quân đội, truyền thống Trung tâm, cách mạng, quê hương, thanh niên, trẻ, chủ đề từng tháng 1–10. Các nhóm Bolero, trữ tình, khác được giữ để bảo toàn dữ liệu cũ.
- Danh mục mới có thể chọn khi tải lên hoặc đổi phân loại bài hát. Chưa thêm 15 bài quân đội hay 5–6 bài/tháng: người dùng sẽ cung cấp danh sách/link.
- Nhạc tùy chọn hỗ trợ link tệp âm thanh trực tiếp và link video YouTube (watch, youtu.be, shorts, live). YouTube dùng cửa sổ video native sẵn có, có nút Quay lại GDQPAN. Link playlist không có video cụ thể sẽ được báo rõ.
- Bản chính thức có cơ chế tài khoản như bản thử nghiệm, theo lựa chọn của người dùng. Phải có máy chủ tài khoản truy cập được; điện thoại thật dùng HTTPS. Đây không phải bản chạy độc lập không cần đăng nhập.

## Gói cập nhật

- `GDQPAN-1.3.1.apk`: bản chính thức.
- `GDQPAN-1.3.1-test.apk`: bản thử nghiệm cùng nội dung giao diện và chức năng.
- Cùng applicationId `vn.gdqpan.app.mobile`, versionCode 6, cùng khóa debug local đã dùng cho các bản trước. Hai gói thay thế nhau khi cài, không tạo hai ứng dụng riêng. Tên hiển thị cũ GDQPAN 1.2 được giữ.
- Cài đè, không gỡ ứng dụng. APK gốc package `vn.gdqpan.app` là ứng dụng khác.
- Build bằng `powershell -NoProfile -ExecutionPolicy Bypass -File .\build-android.ps1`; có thể chọn `-Channel official` hoặc `-Channel test`.

## Kiểm tra

`node tests/mobile.test.js`: ba màn hình 360×640, 412×915, 820×1180; đăng nhập; điều hướng; không tràn ngang; tách phòng thu; danh mục tháng và form tải lên; phát/dừng nguồn âm thanh; nhận dạng link YouTube và chuyển sang native (mô phỏng cầu nối); lịch thêm/sửa/xóa và lưu sau tải lại; thu âm bằng microphone giả lập; ghép WAV thực tế.

`node tests/android-library.test.js`: chỉ emulator GDQPAN_QA, kiểm tra cài cập nhật hai APK giữ tệp riêng, đăng nhập máy chủ QA tạm thời, giao diện native, mở YouTube và quay lại. Kết quả ở `qa/android-library-results.json`; ảnh ở `qa/android-library-home.png`, `qa/android-youtube.png`.

Kết quả QA: cả hai APK cài cập nhật được và giữ tệp dữ liệu riêng; đăng nhập và các trang chức năng hoạt động. Video YouTube thử nghiệm có thời gian phát tăng liên tục trên emulator. Chưa xác minh trên điện thoại thật hoặc với mọi video; việc phát còn phụ thuộc mạng, đăng nhập và hạn chế của video. Quy định trình phát nhúng: https://developers.google.com/youtube/iframe_api_reference .

Mã nguồn desktop không bị sửa trong đợt này; `build-web.js` áp dụng các thay đổi danh mục riêng khi sinh Android.
