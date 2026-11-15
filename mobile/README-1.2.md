# GDQPAN 1.2 — bản mobile cài song song

Bản Android dùng tên **GDQPAN 1.2**, mã gói `vn.gdqpan.app.mobile`, phiên bản cập nhật `1.2.1` (versionCode 4). Cài APK 1.2.1 đè lên GDQPAN 1.2 đã bàn giao để giữ dữ liệu. APK gốc có mã gói `vn.gdqpan.app`; ứng dụng gốc vẫn được giữ riêng. Muốn chuyển lịch từ ứng dụng gốc, xuất JSON rồi nhập vào ứng dụng mới; kiểm tra lịch trước khi bật tự động phát để tránh hai ứng dụng cùng báo.

## Giao diện và chức năng

Giữ màu xanh–đỏ–vàng, header và thông tin nhận diện. Năm mục ở dưới màn hình: Trang chủ, Sinh hoạt, Âm thanh, Lịch phát, Tiện ích. Trang chủ có lịch tiếp theo; khoảng cách và thẻ đã được thu gọn, các nút vẫn có vùng chạm tối thiểu 48px. Mỗi lịch là một dòng giờ/tên/ngày/bật-tắt; bấm **+ Thêm lịch** hoặc chạm dòng để mở form. Trong form có ngày phát, nội dung đọc và phần mở rộng tệp âm thanh riêng; lưu/hủy/xóa vẫn dùng logic desktop. Chọn tất cả, xóa nhiều lịch và sắp xếp theo giờ được giữ lại. Thanh Dừng vẫn hiển thị khi đang phát.

Logic desktop là nguồn dùng chung: hiệu lệnh, văn bản, nhạc, VTV, thu âm, ghép âm thanh, hành động tùy chỉnh, âm thanh riêng cho lịch, chọn ngày, quản lý lịch và nhập/xuất. Các thao tác báo động và xóa dùng hộp thoại xác nhận. Android thay tích hợp Electron bằng cầu nối native cho báo thức, giọng đọc thiết bị, lưu tệp Downloads và cửa sổ VTV.

## Cài APK và bật báo thức nền

1. Cài `GDQPAN-1.2.1.apk`, mở **GDQPAN 1.2**. Nếu đã có GDQPAN 1.2, chọn cập nhật, không gỡ ứng dụng trước.
2. Vào **Tiện ích → Cấp quyền báo thức**, cho phép thông báo và **Báo thức và lời nhắc** trong cài đặt Android.
3. Chọn **Cho phép màn hình báo thức** và bật quyền hiển thị toàn màn hình trong cài đặt Android nếu được yêu cầu. Bật **Tự động phát lịch**. Trạng thái phải hiển thị “Báo thức chạy nền sẵn sàng”. Kiểm tra giờ/ngày và trạng thái bật của từng lịch.
4. Khi đến giờ lúc khóa màn hình, màn hình báo thức hiển thị giờ, tên lịch và nút lớn **Dừng báo thức**; âm thanh chạy qua dịch vụ native. Thông báo cũng có nút **Dừng**. Khi điện thoại đang được sử dụng, Android có thể hiển thị thông báo nổi; chạm thông báo để mở màn hình báo thức. [Quy định Android về thông báo báo thức](https://developer.android.com/about/versions/14/behavior-changes-14).
5. Cho phép microphone khi thu âm. Tệp xuất được lưu trong Downloads; tệp âm thanh cho lịch được lưu riêng trong ứng dụng.

Âm thanh hiệu lệnh và các mẫu giọng vùng miền có sẵn được lấy từ `www/Sound`. Văn bản tùy ý dùng giọng đọc tiếng Việt của Android; cần cài giọng tiếng Việt nếu thiết bị chưa có. Android không chạy máy chủ Neural/Electron trên máy tính. VTV và nguồn nhạc trực tuyến cần kết nối mạng.

Web xem thử phát lịch khi trang đang mở; phát báo thức khi khóa màn hình là chức năng của APK. Chưa kiểm tra thực tế chính sách tiết kiệm pin của từng hãng điện thoại; không dùng thao tác “Buộc dừng” ứng dụng nếu cần lịch tự chạy.

## Mã nguồn và build

### Nhập bằng giọng nói trong Đọc văn bản

Bấm **Nhập giọng nói**, cấp quyền microphone nếu được hỏi và nói tiếng Việt. Khi nhận được kết quả, ứng dụng mở **Kiểm tra bản chép lời**. Sửa nội dung rồi chọn **Chèn vào nội dung** để thêm sau văn bản đang có; **Hủy** giữ nguyên bản nháp. Bộ nhận dạng của điện thoại có thể dùng mạng. Nếu chưa có dịch vụ nhận dạng, ứng dụng hiển thị hướng dẫn bật/cài dịch vụ thay vì làm mất nội dung.

Android dùng `GdqSpeechPlugin.java` và luồng [RecognizerIntent của Android](https://developer.android.com/reference/android/speech/RecognizerIntent). Web xem thử dùng bộ nhận dạng của trình duyệt nếu có hỗ trợ. Kiểm thử tự động đã xác nhận luồng xem/sửa/chèn/hủy bằng kết quả mô phỏng; độ chính xác tiếng Việt phụ thuộc dịch vụ nhận dạng và microphone, cần kiểm tra trên điện thoại thật.

- `../HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html`: nguồn chức năng desktop, không sửa trực tiếp để tùy biến mobile.
- `build-web.js`: tạo `www/index.html` từ nguồn desktop và nối tích hợp mobile.
- `www/mobile-ui.css`, `www/mobile-ui.js`: bố cục mobile và cầu nối dữ liệu.
- `android/app/src/main/java/vn/gdqpan/app/`: AlarmStore, AlarmReceiver, AlarmPlaybackService, AlarmActivity (màn hình báo thức), GdqAlarmPlugin, VtvActivity và MainActivity.
- `tests/mobile.test.js`, `tests/android.test.js`: kiểm thử web và emulator riêng `emulator-5554`.

Trong thư mục `mobile`, dùng Node.js 22 trở lên:

```powershell
npm ci
npm run build
npm run preview
```

Mở `http://127.0.0.1:4173`. Kiểm thử web cần Chrome và `npm test`. Build Android:

```powershell
.\setup-android.ps1
.\build-android.ps1
```

Script sử dụng JDK/SDK/Gradle trong `D:\GDQPAN\android-build-tools`, sao chép dự án build sang đường dẫn ASCII để tránh lỗi công cụ native với dấu tiếng Việt. APK kết quả ở thư mục `mobile`. Emulator được thiết lập bằng `setup-emulator.ps1`, khởi động bằng `start-emulator.ps1`; sau khi boot xong chạy `node tests/android.test.js`. Kiểm thử Android thay lịch trên emulator QA và không nhắm tới điện thoại thật.

APK bàn giao ký bằng khóa debug local. Khóa này khác APK GitHub cũ nên đã tạo mã gói riêng theo lựa chọn của người dùng. Những bản nâng cấp sau của ứng dụng mới cần giữ cùng khóa ký để cài đè; không tạo lại debug keystore ngẫu nhiên mỗi lần chạy GitHub Actions. Khóa ký và mật khẩu không nằm trong gói mã nguồn bàn giao.

Kết quả kiểm thử và ảnh giao diện nằm trong `qa/` của workspace. Báo cáo thẩm định ở `../THAM_DINH_MOBILE_2026-10-09.md`.
