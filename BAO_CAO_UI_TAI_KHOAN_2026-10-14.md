# Cập nhật giao diện tài khoản — 14/10/2026

## Yêu cầu và phạm vi

Người dùng yêu cầu bỏ mục “Âm thanh phòng thu” trong ảnh và đưa nhóm tài khoản/đồng bộ/công bố/khôi phục vào Cài đặt. Người dùng xác nhận áp dụng cho cả Windows và Android, chỉ định thư mục `version_windows`, `mobile` và phiên bản Windows 1.4.3 / Android 1.4.4. Phần đóng gói dưới đây cập nhật trạng thái source-only đã ghi trước đó.

## Đã sửa

- Bỏ input tải âm thanh riêng lên máy chủ, danh sách phát studio chèn thêm và mã tự tạo khối “Âm thanh Phòng thu”. Chức năng thu âm, ghép âm và thêm âm thanh thuộc Phòng thu sẵn có được giữ.
- Không xóa tệp hoặc dữ liệu studio đã lưu trên máy chủ; công bố dữ liệu tiếp tục bảo toàn tham chiếu cũ. Đây là thay đổi giao diện, không phải xóa dữ liệu người dùng.
- Chuyển nhóm tài khoản, đồng bộ, công bố dữ liệu chung, khôi phục dữ liệu trước đăng nhập vào đầu Cài đặt. Ngoài Cài đặt, khối này nằm trong vùng ẩn, không chiếm diện tích trang chính.
- Bố cục hai cột trên màn hình rộng, một cột trên màn hình nhỏ; nút cao ít nhất 48px, email xuống dòng, trạng thái đồng bộ hiển thị trong Cài đặt.
- Giữ trình đăng nhập và cơ chế chặn sử dụng/quyền máy chủ. Màn hình đăng nhập vẫn tự mở khi cần.
- Giữ một phần tử giao diện xuyên suốt việc đóng/mở/chuyển modal để không mất handler hoặc tạo ID trùng.
- Bỏ mã Android cũ chuyển thanh tài khoản vào trang Tiện ích vì mã đó khiến khối Cài đặt bị ẩn.

## Tệp và đồng bộ

`assets/account.js`, `assets/account.css`, `assets/fixed-music.js`, `HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html`, `mobile/www/mobile-library.js`, `scripts/review-ui.cjs`.

Đã chạy `node mobile/build-web.js` và Capacitor sync Android; generated www và native assets đã cập nhật. Phiên bản root 1.4.3, mobile 1.4.4, Android versionCode 11; giữ appId và khóa ký. Không sửa/triển khai backend. Những gói phiên bản cũ được giữ.

## Kiểm thử thực tế

Lệnh: `GDQ_REVIEW_PHASE=account-settings node scripts/review-ui.cjs` trong PowerShell bằng biến môi trường tương ứng. Dùng Chrome headless với máy chủ local/cơ sở dữ liệu tạm, không dùng tài khoản thật.

Kết quả cuối: exit code 0 trên desktop 1366×900 và Android web 390×844. Khối Cài đặt hiển thị, nằm trong chiều ngang viewport, đóng/mở lại thành công, nút Tài khoản mở trình đăng nhập, công bố bị hủy khi không xác nhận, mục tải studio không còn. Chuyển reader→admin, thu âm/meter, payload XSS lịch/modal/toast/TTS và hủy snapshot đến trễ sau logout đều đạt; errors=[] ở cả hai trang.

Bằng chứng: `qa/ui-review-account-settings.json`, `qa/account-settings-desktop.png`, `qa/account-settings-android-web.png`. Một lượt trước đã thất bại ở Android vì mã điều hướng cũ ẩn khối; lỗi được sửa rồi chạy lại đạt. Một lượt sandbox không kết nối được server tạm; kiểm thử cuối chạy với quyền cho phép kết nối local.

## Đóng gói và kiểm thử native bổ sung

- Windows Setup và Portable xuất trong `version_windows/dist-1.4.3`; Android chính thức và thử nghiệm xuất trong `mobile/GDQPAN-1.4.4.apk`, `mobile/GDQPAN-1.4.4-test.apk`.
- Windows Electron chạy code từ app.asar mới đạt 17/17 kiểm tra: nhóm tài khoản trong Cài đặt, vùng ẩn ngoài trang chính, login IPC, 95 bài/decode audio file, lưu/merge settings, VTV IPC pause/resume, chặn nguồn không tin cậy, payload XSS. Harness bỏ bootstrap/tray/TTS và dùng profile/DB tạm. Log IPC từ chối truy cập là kiểm tra âm tính có chủ đích. Bằng chứng `qa/windows-packaged-runtime-1.4.3.json`.
- Android chính thức và test được cài bằng `adb install -r` trên AVD GDQPAN_QA. Trước đó là APK 1.4.3/code10; tệp `files/qa-ui-update-144` được tạo trước nâng cấp, vẫn tồn tại qua hai bản code11. Không gỡ ứng dụng/xóa dữ liệu.
- Cả hai APK chạy native audit đạt: nhóm tài khoản trong Cài đặt, nằm trong viewport, không còn tải studio, mở tài khoản và đóng/mở lại Cài đặt; settings .35/nam_nam/autoPlay true đúng, native sync trả count1; microphone thu được 4709 bytes ở official, 5701 bytes ở test; các payload XSS lịch/action/modal không thực thi; findings=[], errors=[], không có fatal. Bằng chứng `mobile/qa/release-audit-1.4.4/results.json`, `mobile/qa/release-audit-1.4.4-test/results.json` và screenshot trong từng thư mục.
- Đối chiếu thư viện 93 bài mới theo SHA-256/size và nguồn UI trong hai APK và Windows đạt. Kiểm tra 95 tổng bài trên runtime Windows. Bằng chứng `qa/android-packaged-verification-1.4.4.json`, `qa/windows-packaged-verification-1.4.3.json`.
- Hai APK xác minh chữ ký thành công; certificate SHA256 `48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452`, trùng khóa trước. Pipeline vẫn assembleDebug, không phải chữ ký Play Store. Windows EXE không có Authenticode.
- Build Windows đầu bị DNS sandbox, Android bị chặn daemon local; chạy lại với quyền kết nối được cho phép và build thành công. Gradle cảnh báo flatDir, SDK XML và API deprecated; không phải lỗi build.
- Lượt Windows đầu chứa `Sound/nhạc 12 tháng.zip` (351544298 bytes), không thuộc tài nguyên phát trực tiếp. Thêm exclude `!Sound/**/*.zip` và đóng gói lại; không xóa ZIP nguồn, không tự tích hợp nội dung mới bên trong. SHA-256 cuối nằm trong manifest `SHA256-UI-RELEASE-2026-10-14.txt`; machine-readable `qa/release-ui-artifacts-2026-10-14.json`.

## Giới hạn

Chưa cài Windows Setup trên máy sạch hoặc kiểm thử trên điện thoại/máy tính bảng thật. Không đo lại soak/FPS trong đợt chỉnh UI này; kết quả hiệu năng giả lập 1.4.3 trước đó không đại diện cho 1.4.4. Chưa triển khai backend. Phần mềm đang cài chỉ nhận thay đổi sau khi người dùng chạy bộ cài/APK mới; không tự cập nhật ứng dụng đang mở.

## Gói cuối đã xác minh

| Gói | Dung lượng (bytes) | SHA-256 |
| --- | ---: | --- |
| version_windows/dist-1.4.3/GDQPAN Setup 1.4.3.exe | 631340332 | AD116026981CAD9C75D622B79109CD0235E0D9AE9F1031D6A466D207939B3A9A |
| version_windows/dist-1.4.3/GDQPAN 1.4.3.exe | 630915294 | A36B283E74BE3DC8731208872F6126000CFDBE147FDC7E1C8A94FE35ED653640 |
| mobile/GDQPAN-1.4.4.apk | 535212684 | 3DED848E923928432A1C54B7405F8D61AEA961AAB9820671075A87AC3A43CD34 |
| mobile/GDQPAN-1.4.4-test.apk | 535212700 | A8AF02133D55B92D542DA73EF4D7C21E9226F043F8FAEF6B035B2CE2F1BA93BF |

Build Windows cuối exit0; app.asar không có ZIP, verifier và runtime 17/17 đạt sau đóng gói lại. Build Android cả hai variant exit0. Giả lập do phiên này khởi động đã dừng sau kiểm thử; không xóa dữ liệu. Hạn mức tài khoản đọc trong phiên còn trên 5%; không chạm ngưỡng dừng của người dùng.
