# Bổ sung nhạc 12 tháng — 15/10/2026

## Yêu cầu và xác nhận

Người dùng cung cấp Sound/nhạc 12 tháng.zip để bổ sung cho Windows/Android; chọn tên danh mục Nhạc tháng 1 đến Nhạc tháng 12. Bài trùng bỏ lần xuất hiện sau, giữ danh mục đầu tiên. Giữ thư viện có sẵn trước rồi xử lý nguồn mới theo thứ tự tháng 1–12. Chính sách trước đó: mỗi bài một bản, tệp lỗi bỏ qua, chỉ Phòng thu được thêm âm thanh.

Chưa nhận câu trả lời về chỉ cập nhật nguồn/xem thử hay đóng gói lại, thay hai tệp trong 15102026. Vì vậy, chưa build hoặc ghi đè GDQPAN.exe/GDQPAN.apk ở bước này.

## Phát hiện và xử lý nguồn

- ZIP 351544298 bytes, 86 tệp MP3 trong đủ 12 thư mục số. Bỏ 90 tệp metadata macOS (.DS_Store, AppleDouble/__MACOSX); không đưa vào ứng dụng.
- Tên ZIP không gắn cờ UTF-8 dù dữ liệu tên là UTF-8 kiểu macOS. Đọc lại tên đúng encoding và chuẩn hóa Unicode NFC, giữ đúng tên tiếng Việt. Kiểm tra đường dẫn trước khi ghi; không ghi đè tệp khác nội dung.
- Giải mã đủ **86/86 tệp** bằng AudioContext trong Chrome, tất cả hợp lệ, không có âm thanh mới lỗi. Không tải âm thanh lên dịch vụ ngoài.
- Giữ nguyên ZIP. Nguồn giải nén nằm ở Sound/nhạc 12 tháng/1 đến /12; bản kiểm tra độc lập ở qa/monthly-audio-2026-10-15/extracted.
- Giữ 79 bài mới. Loại 5 lần xuất hiện trùng byte với thư viện trước; trường hợp lặp giữa tháng 1 và tháng 9 nằm trong nhóm trùng này. Loại thêm 2 bản cùng tên với bài đang có: Bác Đang Cùng Chúng Cháu Hành Quân (tháng 2), Như Có Bác Hồ Trong Ngày Vui Đại Thắng (tháng 4). Theo yêu cầu mỗi bài một bản, giữ bản cũ; không âm thầm để getAllSongs che bản mới chỉ vì trùng tên.
- Kết quả catalog: 172 bài tích hợp từ các nguồn và 2 bài có sẵn riêng = **174 bài trong ứng dụng**. Toàn bộ 93 bản ghi catalog cũ được đối chiếu và giữ nguyên ID, tên, danh mục, URL, kích thước và thời lượng. Hai bài preset cũ (Trung tâm và Quốc ca không lời) vẫn có mặt.
- Tổng audit tất cả nguồn 188 tệp; 7 tệp lỗi và 2 bản trùng cũ vẫn bị bỏ như trước. Tổng bản trùng bị bỏ trong catalog là 9, gồm 2 cũ + 7 mới; không nhầm 7 tệp lỗi cũ với ZIP mới.

## Số bài mới theo tháng sau bỏ trùng

| Tháng | Số bài |
| --- | ---: |
| 1 | 6 |
| 2 | 6 |
| 3 | 7 |
| 4 | 7 |
| 5 | 7 |
| 6 | 7 |
| 7 | 7 |
| 8 | 5 |
| 9 | 5 |
| 10 | 7 |
| 11 | 8 |
| 12 | 7 |

## Khôi phục nguồn desktop

Khi bắt đầu, HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html không còn trong thư mục gốc, nhưng main.js và bộ tạo Android vẫn tham chiếu. Người dùng đã cho phép khôi phục từ gói Windows mới nhất đã kiểm thử. Đã trích đúng 1718810 bytes từ qa/package-15102026/windows/win-unpacked/resources/app.asar; không lấy bản nguồn cũ trong ZIP bàn giao. Không tự khôi phục các tệp khác đã bị dọn.

## Những tệp chính đã cập nhật

- config/music-sources.json mới: khai báo 6 thư mục cũ và 12 thư mục tháng, cùng tên danh mục tương ứng.
- scripts/audit-audio.js dùng cấu hình nguồn để có thể kiểm tra lại đủ 18 thư mục.
- scripts/build-music-catalog.js ánh xạ danh mục theo folder, kiểm tra audit khớp cấu hình; bỏ trùng SHA256 và tên NFC; vẫn xác minh SHA từng tệp trước khi đưa vào bundle.
- assets/music-catalog.js, qa/music-catalog-build.json, qa/audio-audit.json và Sound/bundled-music được tạo/cập nhật từ nguồn hợp lệ.
- assets/fixed-music.js và mobile/www/mobile-library.js dùng 12 danh mục mới, bỏ các lựa chọn placeholder Nhạc chủ đề tháng 1–10 chưa có nội dung. Giữ thư viện cũ và cách phát hiện tại.
- mobile/build-web.js cập nhật các lựa chọn tháng; tạo lại www/index.html, catalog và media dùng trong web Android. Sau xác nhận đóng gói vào 15102026_1, đã capacitor sync và build APK mới.
- package.json bổ sung loại trừ thư mục nhạc tháng gốc khi đóng gói Windows, tránh đưa cả bản gốc lẫn bundled-music vào gói. ZIP âm thanh đã bị loại theo quy tắc chung có sẵn.
- scripts/verify-windows-music.js, scripts/verify-android-music.py, scripts/review-windows-source.cjs không còn cố định 93/95 bài; đối chiếu theo catalog hiện hành. Windows verifier loại cả thư mục nguồn nhạc tháng.
- scripts/test-fixed-library.js cập nhật số lượng và các kiểm tra liên quan giao diện thư viện; bỏ phụ thuộc vào thành phần Âm thanh Phòng thu đã bị xóa theo yêu cầu trước đây.
- scripts/audit-monthly-audio.cjs và scripts/review-monthly-music.cjs mới phục vụ kiểm chứng nguồn và UI.

Không thay banner, tài khoản, cơ chế chạy nền, lịch, server hoặc phiên bản kỹ thuật. Không mở lại tính năng tải bài vào thư viện ngoài Phòng thu.

## Kiểm thử và bằng chứng

- qa/monthly-audio-2026-10-15/inventory.json: danh mục tệp ZIP và trùng byte.
- decode-audit.json: 86/86 giải mã được, invalid=[].
- ui-results.json: Windows và Android web đều 174 bài; đủ 12 danh mục; lọc đúng số bài và phát/dừng một bài thật ở từng tháng, tổng 24 lượt trên hai giao diện; lỗi JavaScript rỗng, không tràn ngang.
- npm run test:music đạt trên Windows và Android web: bài cũ giữ nguyên, mọi tệp media catalog có đúng số byte, phát/dừng được, không thêm bài ngoài Phòng thu, reader không tải tệp, thành phần thư viện Phòng thu cũ vẫn bị bỏ.
- Ảnh thật windows-month-12.png và android-month-12.png trong thư mục QA nói trên.

## Trạng thái bàn giao và giới hạn

Người dùng đã chọn đóng gói vào thư mục mới **version_Android_Windows/15102026_1**. Đã hoàn tất đúng hai tệp: GDQPAN.exe (Setup Windows x64, 954245338 bytes) và GDQPAN.apk (860920256 bytes). Hai gói có 172 bài catalog + 2 preset = **174 bài**, gồm 79 bài mới và đủ 12 danh mục tháng. Giữ metadata nội bộ Windows 1.4.5, Android 1.4.6/code13, không hiển thị số phiên bản trên UI. Giữ âm thanh trong gói, không chuyển cloud.

**Thư mục 15102026 giữ nguyên**, đã kiểm tra lại SHA256 cả hai tệp so với trước khi đóng gói. Các source ZIP bàn giao trước đó vẫn là snapshot lịch sử, không tự cập nhật.

### Kiểm thử trên hai gói mới

- Windows packaged runtime: 23/23 đạt, không fatal; chạy main/preload/HTML từ app.asar mới, kiểm tra thư viện 174 bài/giải mã âm thanh, tài khoản/Cài đặt, sandbox/IPC, VTV, XSS, runtime/tray và logout. Kết quả: qa/windows-packaged-runtime-1.4.5.json.
- Windows và Android: đối chiếu SHA256/byte đủ 172 tệp catalog với nguồn hiện hành, UI/runtime/account/banner khớp nguồn. Windows không chứa thư mục nhạc gốc dư thừa. Kết quả: qa/windows-packaged-verification-1.4.5.json, qa/android-packaged-verification-1.4.6.json. Hai tên kết quả này đã được cập nhật cho gói mới; kết quả nguồn chi tiết trước đó vẫn trong báo cáo lịch sử.
- APK mới cài đè thành công trên AVD GDQPAN_QA. Kiểm tra thực tế thư viện 174 bài, đủ 12 lựa chọn tháng, số bài từng tháng đúng; phát/dừng một bài thật ở mỗi tháng (12 lượt), không tràn ngang. Native audit findings=[], errors=[]; tài khoản trong Cài đặt, đồng bộ volume/voice/autoplay đúng, 1 alarm native, thu âm 5697 bytes, marker XSS không thực thi. Bằng chứng: mobile/qa/release-audit-1.4.6-monthly-15102026_1/results.json và monthly-music.png. Bổ sung nhánh GDQ_QA_MONTHLY=1 trong mobile/tests/android-release-audit.js để tái kiểm tra.
- Đã logout QA sau test, xác nhận token native rỗng, dừng đúng giả lập được khởi động trong lượt này. Tài khoản/backend/DB QA tạm; không sửa tài khoản thật.
- APK xác minh chữ ký đạt, cùng certificate SHA256 48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452. APK vẫn theo pipeline assembleDebug để cài trực tiếp, không phải gói phát hành Play Store. Windows Setup NotSigned.
- Build thành công; còn cảnh báo tooling Gradle về flatDir/deprecation, chưa phải lỗi build/runtime đã xác nhận.

### Mã kiểm tra tệp bàn giao

| Tệp | SHA256 |
| --- | --- |
| GDQPAN.exe | c72730775262f660c00b6cc86ebfc5503970edd54cefa1ca48dbe97bf70e38da |
| GDQPAN.apk | 803252d48e26708e9d9499aea0ebc8d4a2406e4576bcc66a6960bc681b2a75fe |

Manifest: qa/delivery-15102026_1.json. Hash tệp đích đã đối chiếu với tệp build, thư mục bàn giao chỉ có đúng hai bộ cài. Log: qa/package-windows-15102026_1.log, qa/package-android-15102026_1.log, qa/native-monthly-15102026_1.log.

Chưa thử Setup trên Windows sạch hoặc điện thoại/tablet vật lý; lượt này không lặp lại kiểm thử Doze/báo thức khóa màn hình nhiều giờ hay toàn bộ bài nhạc trong runtime native. 86/86 MP3 nguồn đã giải mã trên Chrome trước đó; kiểm thử native tháng dùng 12 bài đại diện. Không kết luận phần mềm không còn mọi lỗi. Backend demo Render không đổi; emailEnabled=false nên đăng ký/xác minh/quên mật khẩu qua email thật vẫn chưa hoạt động theo lựa chọn demo trước đây. Âm thanh bổ sung làm bộ cài lớn hơn; không có cloud audio trong đợt này.
