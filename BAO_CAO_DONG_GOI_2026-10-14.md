# Sửa bổ sung và đóng gói — 14/10/2026

Người dùng đã cho phép tiếp tục sửa và đóng gói, chọn Windows 1.4.2 / Android 1.4.3. Giữ appId, khóa ký/cơ chế cài đè; tạo Setup/Portable Windows và APK chính thức/thử nghiệm Android. Không triển khai backend ra máy chủ thật.

Kế thừa `THAM_DINH_VA_SUA_LOI_2026-10-13.md` và `NHAT_KY_CAP_NHAT.md`, không bỏ kết quả/giới hạn kiểm thử cũ.

## Kiểm tra trước sửa bổ sung

- Backend 4/4 và policy/preload/TTS 3/3 đạt trong lượt đầu đợt này.
- Windows fetchHttp xử lý Location tương đối như URL tuyệt đối, không giới hạn chuỗi redirect hay kích thước HTML; lỗi được xác định từ mã, sẽ kiểm thử bằng HTTP server QA trước bàn giao.
- Các verifier Windows còn cố định 1.4.0; sẽ tham số hóa để kiểm tra đúng gói mới, không lấy kết quả cũ làm bằng chứng mới.
- Jank giả lập và giới hạn kiểm thử phần cứng ở báo cáo trước chưa được coi đã sửa. Không kết luận nguyên nhân hay tối ưu mò.

## Trạng thái

**Đã sửa bổ sung, tạo đủ gói và hoàn tất các lượt kiểm thử nêu dưới đây.** Windows 1.4.2 và Android 1.4.3 chứa các bản sửa bảo mật/logic của đợt trước. Không khẳng định mọi thiết bị đều mượt hoặc toàn bộ phần mềm không còn lỗi; độ giật trên SwiftShader còn cao.

## Thay đổi và hồi quy

- Kế thừa các sửa XSS lịch/modal/toast/gán TTS, transaction reset/đăng ký/login, schema shared/VTV, đồng bộ trễ sau logout, quyền reader→admin, IPC/VTV, sandbox/webSecurity, cấu hình/meter/TTS và dependency uuid đã ghi trong báo cáo thẩm định trước.
- Thêm `fetch-page.cjs`: resolve redirect tương đối theo URL gốc, chỉ nhận HTTP/HTTPS không userinfo; giới hạn 5 redirect, HTML 2 MiB và timeout từng request 10 giây, trả lỗi HTTP không thành công. Luồng audio/video trực tiếp không bị giới hạn 2 MiB này. HTTP QA fixture kiểm tra relative redirect/loop/size/status/timeout đều đạt.
- Windows package/lock lên 1.4.2, output `dist-1.4.2`; module fetch mới được đưa vào app.asar. Telemetry tài khoản và nhãn UI phiên bản cập nhật.
- Android package/lock lên 1.4.3, versionCode 10; script build lấy versionName từ package.json và tạo chính thức/thử nghiệm. Giữ applicationId `vn.gdqpan.app.mobile`, nhãn ứng dụng cũ và khóa ký. Nhãn phiên bản UI Android được tạo từ package version; hậu tố test được xác định ở versionName của APK.
- Không đổi version 1.0.2 của định dạng JSON xuất cấu hình; đó là schema cũ cần tương thích, không phải số phiên bản ứng dụng.
- Verifier Windows và runtime harness nhận phiên bản gói; kiểm tra main/preload/security/fetch/account/HTML thực tế thay vì đọc gói 1.4.0. README đã cập nhật phiên bản mới.

## Gói bàn giao

| Gói | Đường dẫn tương đối từ root dự án | Kích thước byte |
|---|---|---:|
| Windows Setup 1.4.2 x64 | dist-1.4.2/GDQPAN Setup 1.4.2.exe | 631338663 |
| Windows Portable 1.4.2 x64 | dist-1.4.2/GDQPAN 1.4.2.exe | 630913675 |
| Android chính thức 1.4.3 | mobile/GDQPAN-1.4.3.apk | 535212712 |
| Android thử nghiệm 1.4.3-test | mobile/GDQPAN-1.4.3-test.apk | 535212720 |
| Backend source cập nhật | GDQPAN-account-server-2026-10-14.zip | 23733 |

SHA-256 theo đúng thứ tự trên:

```text
B0103E84D4C032C973994F439FADD1FFAFC428B1B8C26D30FB32EE885838A7E1
D786E190747F142598739E2157BD194B3818C9E1CE745695C2C584E1498CF1A7
CC49DE4F3336CCF08DF574012ED5CF1BD2B5839E8A36261CD9E86AC0293EE77F
80AC15EEF8F62B7FBB9D4FDAF039FDCB287AFF100123B9C64DC0F3725A9E0D4B
C237D9A556D8FF01D1D45978BAE3AB59D8F9BCE225324DEF689F4D9B332CE0DC
```

Manifest: `SHA256-RELEASE-2026-10-14.txt`, `SHA256-1.4.2.txt`, `mobile/SHA256-1.4.3.txt`, `qa/release-artifacts-2026-10-14.json`. Các gói cũ được giữ nguyên.

## Kết quả kiểm thử trên mã và gói cuối

| Nhóm | Kết quả và bằng chứng |
|---|---|
| Backend source | 4/4 test đạt: tài khoản/phân quyền/revision, CLI admin, schema/SQL/race, console/sync desktop-mobile. |
| Backend ZIP độc lập | 3/3 test backend đạt ở thư mục staging độc lập. Test UI toàn dự án không đưa vào ZIP vì cần source frontend/mobile. ZIP source khớp `server/src/server.js`; không có database, `.env` thật, node_modules hoặc QA log. |
| Source UI | Desktop/mobile-web: payload lịch/modal/toast/TTS không thực thi; ID có dấu nháy nguyên vẹn; đổi role và delayed snapshot sau logout đạt. `qa/ui-review-after.json`. |
| Web Android | 360×640, 412×915, 820×1180 đạt điều hướng/layout/lịch/thu-ghép/giải mã; recognizer stub chỉ kiểm tra flow, không độ chính xác giọng nói. `mobile/qa/results.json`. |
| Windows tài nguyên | 93 tệp nhạc khớp SHA/kích thước; catalog/account/main/preload/security/fetch/HTML trong app.asar khớp nguồn; thư mục media lỗi/bản trùng không vào gói. `qa/windows-packaged-verification-1.4.2.json`. |
| Windows runtime gói | 15/15 check đạt: main IPC thật/preload/HTML từ app.asar, isolation/sandbox/webSecurity, đăng nhập, file:// decode, merge settings/VTV userData, pause/resume media VTV thật, từ chối cửa sổ lạ và chặn navigation; cả bốn marker XSS false. `qa/windows-packaged-runtime-1.4.2.json`. Harness bỏ bootstrap tray/TTS để cô lập; không chạy toàn bộ Setup trên máy sạch. |
| Windows thư viện gói | 95 bài/93 mới, giải mã mẫu cả sáu nhóm, thư viện không thêm tệp/lịch không upload, Phòng thu còn picker. `qa/electron-library-results.json`. |
| APK tài nguyên | Cả 1.4.3 và 1.4.3-test đủ 93 tệp khớp SHA/kích thước; account/index/CSS/schedule/catalog khớp source generated. `qa/android-packaged-verification-1.4.3.json`. |
| APK cài đè/thư viện/YouTube | Cả hai gói cài đè giữ private files. Marker riêng tạo khi còn 1.4.2 tồn tại sau 1.4.3 và test. 95 bài, decode mẫu sáu nhóm, upload policy và YouTube mở/quay lại đạt; video QA tiến thời gian 0,658→3,384 giây trong lượt này. `mobile/qa/android-library-results-1.4.3.json`, `qa/release-upgrade-signing-2026-10-14.json`. Không bảo đảm mọi video/mạng đều phát được. |
| APK chính thức security audit | Findings/errors rỗng; giữ autoPlay/region, native count=1, micro khởi động tạo blob 6992 byte, schedule/custom action/modal marker đều false. `mobile/qa/release-audit-1.4.3/results.json`. Không suy ra mọi sink đều đã được kiểm tra. |
| APK chính thức alarm regression | 10/10 đạt: refresh/volume/giọng, checkbox/count, báo thức khóa màn hình phát foreground/USAGE_ALARM, Stop và autoPlay=false hủy lịch, không JS error. `mobile/qa/alarm-settings-1.4.3/results.json`. |
| Runtime/TTS/fetch/tooling | Policy/preload/TTS 3/3, fetch HTTP 1/1; Xcode UUID và CLI tương thích đã đạt. |

## Hiệu năng và độ ổn định trên APK 1.4.3

Lượt mới chạy trên AVD GDQPAN_QA, Android 15/API35, x86_64, SwiftShader, không thiết bị thật. `mobile/qa/performance-1.4.3-release/results.json`:

- **27/27 check chức năng đạt**, findings/errors rỗng và không thấy fatal crash/ANR trong log của lượt này. Các check không có ngưỡng bắt buộc về jank, vì vậy findings rỗng không có nghĩa hiệu năng đạt yêu cầu.
- Một cold start native **4055 ms**; UI/account including automation khoảng 18–19 giây gồm CDP/uiautomator, không gọi đó là thời gian mở app thuần.
- Native touch trên viewport 360/412, thư viện hàng cuối, category 48px, label lịch 48×48px, keyboard, landscape/font scale 1.3, micro/ghép âm đều đạt. Tablet 820×1180 chỉ là kiểm thử browser source.
- Thu native 4428 byte; WAV ghép **1916204 byte / 9,48 giây**, meter172 tick, merge khoảng763,8 ms. Không đánh giá chất lượng microphone vật lý.
- Soak **308,662 giây**, **21 vòng nhạc**, **105 lần điều hướng**. PSS main **120879→125709 KB**, max **131671 KB**; JS heap **7466708→7807900 byte**. DOM ổn định sau vòng4 khoảng7578–7579 nodes/745 listeners; chưa gồm renderer PSS và chưa chứng minh không leak dài hạn.
- **Jank còn cao: 1204/1306 frames =92,19%**, p50 **73 ms**, p95 **200 ms**, p99 **450 ms**. Không khẳng định bản mới mượt, không kết luận chắc chắn app regressed từ55% của lượt khác vì chưa có đối chứng cùng điều kiện. Snapshot CPU sau test cho thấy qemu dùng khoảng1,58 CPU-second trong1 giây, nhưng không đủ xác định nguyên nhân.
- Máy chủ mất kết nối chặn phát mới, phục hồi khoảng1112 ms trong fixture. Báo thức khóa màn hình cuối và Stop đạt. Không phát sinh crash/ANR được ghi nhận trong lượt này.

## Ký, cài đặt và backend

- Cả APK có versionCode10, cùng chứng chỉ SHA-256 `48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452` như gói trước. Chạy quy trình assembleDebug hiện có, dùng khóa debug cũ để cài đè; chưa tạo quy trình release/Play Store với khóa phát hành mới.
- Windows ProductVersion/FileVersion xác nhận1.4.2. Kiểm tra Authenticode trả **NotSigned** cho Setup và Portable; log builder “signing” không được coi là đã có chứng chỉ publisher hợp lệ.
- Android: cài đè, không uninstall để giữ dữ liệu. Chính thức và test cùng appId nên thay thế nhau; giữ hai file làm hai lựa chọn, không coi là hai ứng dụng song song.
- Backend source ZIP cần cập nhật riêng khi vận hành máy chủ. Giữ `.env`, `DATA_DIR`, SQLite và thư mục files hiện có; cài dependency theo package-lock với Node24+, rồi restart dịch vụ theo quy trình của máy chủ. Gói không chứa dữ liệu/secret thật và **chưa được triển khai tự động**.

## Giới hạn và bước tiếp theo

Chưa thử Windows Setup trên máy sạch/Program Files, điện thoại/tablet vật lý, nhiều phiên bản Android, pin/Doze nhiều giờ, toàn bộ media/network/CDN/TTS online, SMTP/TLS production hoặc tải lớn. Các test hiện xác nhận các bản sửa trong phạm vi đã thử, không chứng nhận hệ thống sạch lỗi tuyệt đối.

Hiệu năng SwiftShader là phần chưa đạt độ mượt; cần kiểm thử có đối chứng trên GPU/thiết bị thật trước khi quyết định tối ưu UI. Không sửa CSS/logic mò hoặc bật lại webSecurity=false để che lỗi. Các báo cáo cũ giữ nguyên lịch sử, báo cáo này là trạng thái gói mới nhất.

Đã kiểm tra kết quả cuối và hash báo cáo; lưu summary tại `qa/release-summary-2026-10-14.json`. Sau kiểm thử đã tắt đúng AVD GDQPAN_QA do đợt này khởi động, không uninstall/xóa dữ liệu. APK mới nhất còn trong AVD là chính thức1.4.3. Thư mục staging backend trong qa chỉ chứa source/test, được giữ lại để truy vết.
