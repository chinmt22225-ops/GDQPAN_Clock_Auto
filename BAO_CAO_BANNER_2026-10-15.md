# Banner mới — source và bản xem thử, 15/10/2026

## Yêu cầu đã xác nhận

- Đổi tên trên banner thành “HỆ THỐNG TRUYỀN THÔNG SỐ”, đặt ở bên phải trên nền ảnh khuôn viên, giữ ảnh.
- Bên trái: “ĐẠI HỌC QUỐC GIA THÀNH PHỐ HỒ CHÍ MINH”, bên dưới “TRUNG TÂM GIÁO DỤC QUỐC PHÒNG AN NINH”, rồi slogan. Tên Trung tâm theo đúng chuỗi người dùng yêu cầu, không có “VÀ”.
- Chữ banner trắng đồng bộ; tên Trung tâm nổi bật hơn bằng cỡ chữ và độ đậm. Khối chữ căn giữa theo chiều dọc với logo.
- Android vẫn giữ tiêu đề ở bên phải khối logo/tên đơn vị theo câu trả lời người dùng; không chuyển tiêu đề xuống dòng riêng dưới toàn bộ khối.
- Chỉ cập nhật mã nguồn và cho xem thử, không đóng gói bản chính thức.

## Thay đổi

1. `HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html`: thay markup tên đơn vị bên trái, chuyển h1 tiêu đề hệ thống sang khối ảnh khuôn viên bên phải, nạp stylesheet banner riêng. Các phần clock/volume/visualizer giữ markup cũ.
2. `assets/banner.css`: style giới hạn trong banner; chữ trắng, tên Trung tâm đậm, tiêu đề phải có bóng chữ và nền ảnh tối nhẹ để dễ đọc. Giữ grid/zoom của ứng dụng Windows. Android bố trí hai cột, logo hình thật, tên đơn vị xuống dòng và khối ảnh/tiêu đề ở bên phải; kích thước riêng cho tablet.
3. `mobile/www/mobile-ui.js`: thay markup banner Android; dùng logo có sẵn, đủ tên Đại học/Trung tâm/slogan.
4. `mobile/build-web.js`: đưa banner.css vào assets được copy. Đã build web và Capacitor copy Android; `mobile/android/app/src/main/assets/public` nhận source mới. Không chạy Gradle assemble/electron-builder, không đổi version hoặc khóa ký.
5. `scripts/preview-banner.cjs`: dựng ảnh trước/sau và so sánh hình học banner/main/footer tại sáu viewport. `scripts/review-ui.cjs` nhận phase banner để tái chạy kiểm thử hồi quy có assertion.

Không chỉnh logic backend/SQL, đăng nhập, thư viện nhạc, thu âm, lịch phát hoặc các bộ cài đã tạo ngày 14/10. CSS bên ngoài banner không được sửa trong đợt này.

## Bản xem thử

Mở `qa/banner-2026-10-15/xem-thu-banner.html`. Đây là bộ ảnh render từ mã nguồn, không phải một phiên đăng nhập hoạt động. Các ảnh full màn hình và banner nằm cùng thư mục.

- Windows: `banner-windows-1920-after.png`, `banner-windows-1366-after.png`, `banner-windows-1024-after.png`.
- Android: `banner-android-360-after.png`, `banner-android-412-after.png`, `banner-android-820-after.png`.

Ảnh được render bằng Chrome headless, tạm ẩn màn hình đăng nhập chỉ trong môi trường xem thử. Dòng đồng hồ trong ảnh không phải bằng chứng kiểm thử đồng hồ/báo thức.

## Kết quả kiểm tra và giới hạn

`qa/banner-2026-10-15/results.json`: sáu viewport đều không tràn ngang. Windows 1920/1366/1024: rect của main trước/sau bằng nhau, chiều cao banner lần lượt 126.484375/126.484375/93.609375 px; footer giữ vị trí/kích thước cũ. Baseline lấy HTML trong app.asar Windows 1.4.3 đã đóng gói.

Android baseline lấy index.html và mobile-ui.js từ APK 1.4.4 đã đóng gói. Header tổng trước→sau: 360px 170.28125→196.9375 (+26.65625); 412px 170.28125→171.3125 (+1.03125); 820px 178.28125→208.0625 (+29.78125). Tên đầy đủ và vị trí bên phải làm banner cao hơn; main giữ kích thước và thay đổi vị trí theo chiều cao banner. Không tuyên bố mọi tọa độ Android giữ nguyên.

Đã chạy review nguồn desktop 1366×900 / Android web 390×844 với account server và DB tạm: errors=[], payload XSS lịch/modal/toast/TTS không thực thi, quyền reader→admin, khối tài khoản trong Cài đặt/đóng mở, recorder có dữ liệu và meter, hủy snapshot đến trễ sau logout đều đạt; không tràn ngang. Kết quả `qa/ui-review-banner.json` đã được assertion độc lập kiểm tra sau chạy (phase banner lúc chạy chưa bật nhánh assertion; sau đó đã thêm phase này vào nhánh để lần sau chạy trực tiếp). Không gán kết quả source cho APK/EXE cũ.

Chưa kiểm thử banner mới trên native emulator hoặc thiết bị thật. Chưa đóng gói bất kỳ EXE/APK mới nào. Các bộ cài Windows 1.4.3 / Android 1.4.4 vẫn có banner trước sửa; bản xem thử mới cần người dùng duyệt trước bước tiếp theo.

## Điều chỉnh tiếp — tiêu đề Android đúng hai dòng

Người dùng yêu cầu nới khối bên phải để tiêu đề chỉ còn hai dòng. Đã tách markup thành hai span: “HỆ THỐNG” / “TRUYỀN THÔNG SỐ”; mỗi span không ngắt dòng. Cột phải dùng max-content theo độ rộng chữ, không giảm cỡ chữ. Trên phone cột tăng từ 92px lên 132.5px; tablet từ 180px lên 190.75px. Phần tên đơn vị vẫn xuống dòng trong cột trái, không đè lên ảnh.

Đã build web và copy Android lại, không tạo EXE/APK. Kiểm tra Chrome ở 320/360/412/820px: hai dòng đúng nội dung, chiều cao h1 bằng hai line-height, chữ nằm trong khối và không tràn ngang trang. Windows 1920/1366/1024 tiếp tục giữ nguyên rect main so với baseline. `results.json` hiện là lượt mới gồm bảy viewport; số đo sáu viewport ở phần trên thuộc lượt đầu trước khi nới cột phải.

Header tổng Android của lượt mới: 320px 253.75px, 360px và 412px 196.9375px, tablet 820px 192.5px. Nới cột phải làm cột trái hẹp hơn và có thể tăng chiều cao khi tên đơn vị xuống dòng, đặc biệt màn hình 320px; không tuyên bố chiều cao giống lượt trước.

Gallery `xem-thu-banner.html` đã dùng ảnh mới `banner-android-360-2-lines.png`, `banner-android-412-2-lines.png`, `banner-android-820-2-lines.png`; có thêm ảnh 320px trong cùng thư mục. Đổi tên ảnh để tránh trình duyệt giữ cache bản ba dòng cũ. Đây là xác minh bố cục, không phải lượt kiểm thử chức năng/native mới.

## Điều chỉnh tiếp — máy tính bảng một dòng

Theo yêu cầu mới, ở breakpoint tablet có sẵn (từ 600px), hai span của tiêu đề chuyển sang inline và h1 không ngắt dòng. Cột ảnh bên phải tự nới theo chữ, font 18px được giữ; ở tablet tiêu đề rộng 276.515625px, khối ảnh cả padding rộng 292.515625px. Phone dưới 600px vẫn hai dòng, không thay CSS Windows.

Build web và copy Android đạt, không tạo bộ cài. Render cuối gồm chín viewport: Windows 1920/1366/1024 giữ rect main; Android 320/360/412 đúng hai dòng, Android 600/820/1180 đúng một dòng. Các assertion line-count, chiều cao h1, chữ trong viewport và không tràn ngang đều đạt (exit0). Header tổng ở tablet 600/820/1180 lần lượt 257.53125/192.5/213.3125px; không tuyên bố header mọi kích thước có chiều cao cố định.

Ảnh tablet xem thử mới `banner-android-820-1-line.png`; gallery đã trỏ đến ảnh này để tránh cache. `results.json` và ảnh `*-after.png` hiện phản ánh lượt một dòng tablet. Không chạy lại kiểm thử chức năng/native vì đây là đổi cách xuống dòng trong CSS banner.
