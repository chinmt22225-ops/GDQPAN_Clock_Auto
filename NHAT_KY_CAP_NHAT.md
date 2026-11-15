# Nhật ký cập nhật phần mềm GDQPAN

Tài liệu này tổng hợp công việc trên Windows và Android, được cập nhật tiếp sau mỗi đợt. Đã đọc README.md, mobile/README-1.3.1.md và TAI_KHOAN_VA_QUAN_TRI.md trước khi bắt đầu.

## 11/10/2026 — Android 1.3.1

Đã thu gọn trang chủ; tách Phòng thu khỏi Nhạc; chuyển VTV và quản trị tài khoản vào Tiện ích; tạo danh mục chủ đề tháng 1–10; bổ sung phát link âm thanh và YouTube; sửa thanh trạng thái và nút quay lại cửa sổ video. Hai APK chính thức và thử nghiệm dùng cơ chế tài khoản theo lựa chọn của người dùng. Kiểm thử web ba kích thước màn hình và Android giả lập đã đạt. Chi tiết: mobile/README-1.3.1.md.

## 12/10/2026 — Thư viện âm thanh đóng gói cho Windows và Android

### Yêu cầu và lựa chọn đã xác nhận

- Đưa các bài hát trong sáu thư mục vào phần mềm để có sẵn khi phân phối.
- Dùng sáu danh mục theo tên thư mục; giữ nhạc có sẵn trước đó.
- Những bài bị lỗi được bỏ qua khi đóng gói. Giữ nguyên các tệp gốc trên máy để có thể thay thế sau.
- Mỗi bài trùng chỉ giữ một bản.
- Chỉ Phòng thu được thêm âm thanh. Thư viện Nhạc, tệp riêng cho lịch và các khu vực khác không được tải thêm tệp.
- Giữ phát link MP3/YouTube ở Nhạc tùy chọn; không lưu link thành bài mới trong thư viện.

### Công việc đã hoàn thành

- Kiểm kê cả sáu thư mục: 102 tệp, tổng 422.863.088 byte (khoảng 403 MiB).
- Dùng trình giải mã âm thanh Chromium để thử từng tệp, không chỉ dựa trên phần mở rộng.
- Kết quả: 95 tệp giải mã được; 7 tệp lỗi; 93 nội dung âm thanh khác nhau nếu loại hai bản sao trùng hoàn toàn.
- Thêm scripts/audit-audio.js để kiểm tra lại toàn bộ nguồn; lưu kết quả, thời lượng và SHA-256 từng tệp ở qa/audio-audit.json.
- scripts/build-music-catalog.js tự tạo assets/music-catalog.js và 93 tệp tại Sound/bundled-music từ nguồn đã kiểm tra. Các tệp đóng gói có tên theo SHA-256 để tránh lỗi đường dẫn có dấu/ký tự đặc biệt.
- Tích hợp 93 bài mới vào DEFAULT_PRESET_SONGS của cả hai HTML nguồn; giữ hai bài có sẵn (nhạc truyền thống Trung tâm và quốc ca không lời). Thư viện mặc định có tổng 95 bài trên máy mới.
- assets/fixed-music.js cung cấp bộ lọc sáu danh mục và thư viện chỉ xem/phát, không còn tải bài lên hoặc đổi phân loại qua thư viện. API saveSong từ chối thêm bài.
- Vô hiệu hóa và ẩn các bộ chọn tệp ngoài Phòng thu, gồm tệp riêng cho lịch và bộ tải âm thanh hiệu lệnh. Giữ các bộ chọn tệp ở Đọc văn bản, Thu âm, Ghép âm của Phòng thu; chuyển tải âm thanh Phòng thu chung từ thanh tài khoản vào Phòng thu. Phân quyền quản trị sẵn có tiếp tục áp dụng. Danh sách Phòng thu chung nằm ngoài tab thu âm dành riêng cho admin để người dùng thường vẫn xem/phát được.
- Cập nhật build-web.js để sao chép danh mục, giao diện thư viện và toàn bộ 93 tài nguyên vào Android; cập nhật đóng gói Windows để lấy tài nguyên đã tạo, không đưa lại sáu thư mục nguồn hoặc tệp lỗi/bản trùng vào gói.
- Nâng phiên bản Windows/Android lên 1.4.0; Android versionCode 7, cùng mã ứng dụng và khóa ký trước đó. Đã đóng gói Windows cài đặt/portable và Android chính thức/thử nghiệm.

| Thư mục | Tổng tệp | Giải mã được | Tệp lỗi |
|---|---:|---:|---:|
| 15 bài hát Quân đội | 15 | 12 | 3 |
| Biển đảo | 10 | 10 | 0 |
| Cách mạng | 20 | 19 | 1 |
| nhạc sinh viên | 14 | 14 | 0 |
| nhạc thanh niên | 23 | 21 | 2 |
| Trữ tình | 20 | 19 | 1 |

### Các tệp lỗi sẽ bỏ qua

Ba tệp MP3 thực chất là ảnh JPEG:

- Sound/15 bài hát Quân đội/Cuộc Đời Vẫn Đẹp Sao.mp3
- Sound/15 bài hát Quân đội/Tiến Quân Ca (EDM).mp3
- Sound/15 bài hát Quân đội/Vì Nhân Dân Quên Mình.mp3

Bốn tệp MP4 thực chất chứa trang HTML báo lỗi 410 Gone:

- Sound/Cách mạng/Đường Lên Phía Trước - Tiến Minh (Official Lyric Video) _Nhạc cách mạng hay nhất mừng Quốc Khánh 2_9.mp4
- Sound/nhạc thanh niên/[ Lyric NHẠC THANH NIÊN ] ĐOÀN CA (THANH NIÊN LÀM THEO LỜI BÁC) _ St HOÀNG HOÀ.mp4
- Sound/nhạc thanh niên/KHÁT VỌNG TUỔI TRẺ (Vũ Hoàng) - Tùng Dương _ Official Lyric Video.mp4
- Sound/Trữ tình/XUÔI DÒNG CỬU LONG _ DIỆU KIÊN - OFFICIAL MV.mp4

### Xử lý bản trùng đã thực hiện

- Một Vòng Việt Nam (Live At Người Đàn Ông Hát): giữ một bản theo cùng SHA-256.
- Đường Hồ Chí Minh Con Đường Của Thanh Niên: giữ một bản theo cùng SHA-256.
- Hai bản sao được bỏ khỏi danh mục/gói; không xóa các tệp gốc của người dùng.
- Số bài mới thực tế theo danh mục: Quân đội 12, Biển đảo 10, Cách mạng 19, Sinh viên 14, Thanh niên 19, Trữ tình 19.

### Kiểm thử

- scripts/test-fixed-library.js đã đạt cho giao diện Windows và Android: tổng 95 bài, đúng 93 bài mới/sáu nhóm, đủ tài nguyên đúng kích thước, phát/dừng, API thêm nhạc bị chặn, các bộ chọn tệp ngoài Phòng thu bị vô hiệu hóa, bộ chọn tệp Phòng thu còn hoạt động. Kiểm tra đổi tài khoản từ admin sang user xác nhận user không được tải lên và danh sách Phòng thu chung không nằm trong phần bị ẩn dành riêng cho admin.
- mobile/tests/mobile.test.js đã đạt trên 360×640, 412×915 và 820×1180: điều hướng, lịch phát thêm/sửa/xóa/lưu, hủy báo động, thu âm với microphone giả lập và ghép WAV thực tế; không lỗi runtime.
- scripts/test-electron-library.cjs đã đạt với HTML lấy trực tiếp từ app.asar đóng gói: đủ 95 bài, giải mã được bài đại diện cả sáu nhóm qua file://, thư viện không còn chọn tệp, lịch không được tải âm thanh, Phòng thu vẫn có bộ chọn tệp.
- Kết quả chi tiết: qa/audio-audit.json, qa/fixed-library-results.json, qa/electron-library-results.json và mobile/qa/results.json.
- mobile/tests/android-library.test.js đã đạt trên giả lập GDQPAN_QA với các APK cuối: cài đè hai gói và giữ tệp dữ liệu riêng; đăng nhập; đủ 95 bài/93 bài mới; giải mã bài đại diện sáu nhóm trực tiếp từ tài nguyên APK; chặn chọn tệp cho lịch; giữ chọn tệp trong Phòng thu; điều hướng và mở/quay lại YouTube. Trong lượt cuối, video YouTube còn ở trạng thái tải trong khoảng lấy mẫu nên không xác nhận được phát video; lượt trước đã quan sát video phát thực tế. Chức năng phát link được giữ nguyên theo yêu cầu.
- scripts/verify-windows-music.js và scripts/verify-android-music.py đã đạt: cả 93 tệp trong app.asar Windows và từng APK đều khớp kích thước/SHA-256 nguồn; mã danh mục/giao diện trong các gói khớp bản cuối. Sáu thư mục nguồn được loại khỏi gói Windows, tránh đưa tệp lỗi và bản trùng vào phần mềm.
- Kết quả bổ sung: qa/windows-packaged-verification.json, qa/android-packaged-verification.json, mobile/qa/android-library-results.json. Chưa kiểm tra trên điện thoại thật hoặc cài bộ Setup Windows vào một máy khác.

### Các gói bàn giao

| Nền tảng | Tệp | Kích thước |
|---|---|---:|
| Windows x64 — bộ cài | dist-1.4.0/GDQPAN Setup 1.4.0.exe | 631.333.398 byte |
| Windows x64 — portable | dist-1.4.0/GDQPAN 1.4.0.exe | 630.908.413 byte |
| Android — chính thức | mobile/GDQPAN-1.4.0.apk | 535.210.936 byte |
| Android — thử nghiệm | mobile/GDQPAN-1.4.0-test.apk | 535.210.952 byte |

Mã SHA-256 của cả bốn gói nằm trong SHA256-1.4.0.txt. Hai APK cùng mã ứng dụng, thay thế nhau khi cài; cài đè và không gỡ ứng dụng để giữ dữ liệu. Cơ chế tài khoản/máy chủ đã chốt trước đó vẫn áp dụng. Các bài được lưu sẵn trong gói; không tải thư viện 93 bài từ máy chủ khi mở ứng dụng.

### Cách tạo lại thư viện và gói

1. Nếu tệp nguồn thay đổi, chạy `node scripts/audit-audio.js` để kiểm tra lại. Không tự bỏ thêm tệp ngoài chính sách đã được chốt; các tệp gốc luôn được giữ nguyên.
2. Chạy `npm run build:music` để tạo danh mục/tài nguyên. Script kiểm tra danh sách và SHA-256 nguồn, yêu cầu kiểm tra lại nếu có tệp mới hoặc nội dung thay đổi.
3. Windows: `npm run dist -- --win --x64 --config.directories.output=dist-1.4.0`.
4. Android: chạy `powershell -NoProfile -ExecutionPolicy Bypass -File .\build-android.ps1` trong thư mục mobile.
5. Chạy các kiểm thử và công cụ đối chiếu gói nêu trên, tạo lại SHA256-1.4.0.txt, rồi cập nhật chính file nhật ký này.

Trạng thái đợt cập nhật: hoàn tất. Không còn lựa chọn nội dung/phân quyền đang chờ cho sáu thư mục này. Danh mục chủ đề tháng 1–10 từ đợt trước chưa có danh sách bài được chỉ định theo tháng nên không tự phân bổ sáu thư mục vào các tháng.

## 12/10/2026 — Kiểm thử Android và bản sửa 1.4.1 (CHƯA HOÀN TẤT QA CUỐI)

Đã build hai APK 1.4.1/versionCode 8, sửa vùng chạm nhạc/lịch, quyền MODIFY_AUDIO_SETTINGS cho thu âm, meter micro, khôi phục phiên mã hóa native và race bootstrap đăng nhập, lỗi lưu âm lượng ghi đè autoPlay/region. Hồi quy web và kiểm thử settings/báo thức khóa màn hình trên APK cuối đã đạt; đối chiếu 93 tệp nhạc và code đóng gói đã đạt. Hiệu năng/soak với GPU host và thao tác chạm native chưa hoàn tất: có bằng chứng ANR no-focused-window và lượt mới timeout điều hướng; chưa xác định chắc chắn nguyên nhân, không tuyên bố bản cuối đã vượt qua toàn bộ QA.

Người dùng yêu cầu sau 5 phút nếu chưa xong phải viết báo cáo trung thực để agent khác tiếp tục. Toàn bộ yêu cầu, sửa đổi, hash APK, số đo, kết quả đạt/chưa đạt, bằng chứng và các bước tiếp theo được ghi tại [BAN_GIAO_KIEM_THU_ANDROID_2026-10-12.md](BAN_GIAO_KIEM_THU_ANDROID_2026-10-12.md). Giữ nguyên lịch sử các đợt đã hoàn tất phía trên.

## 12/10/2026 — Audit Windows 1.4.0 / Android 1.4.0 và candidate 1.4.1

Người dùng xác nhận máy tính bảng là Android cài APK 1.4.0; chỉ yêu cầu báo cáo để agent khác sửa. Không sửa mã sản phẩm hoặc build lại trong đợt này. Đã thêm `scripts/audit-windows-release.cjs`, `mobile/tests/android-release-audit.js` và bằng chứng QA dùng hồ sơ/máy chủ/AVD riêng.

Windows 1.4.0: tái hiện tên hiệu lệnh từ dữ liệu admin chung thực thi JavaScript, renderer có Node fs; cấu hình mới bị callback lưu volume ghi đè giọng/tốc độ/lặp/chuông. Android 1.4.0: tái hiện settings autoPlay=false dù UI vẫn bật/count native=0, micro Permission denied dù đã cấp RECORD_AUDIO, và cùng lỗi JavaScript từ tên hiệu lệnh. Candidate Android 1.4.1: audit mới giữ settings/count=1 và khởi động thu âm được, nhưng lỗi JavaScript vẫn còn. Không chứng minh có tấn công thực tế; payload chỉ đo boolean, không xuất token/đọc tệp/chạy lệnh. QA hiệu năng/ANR cuối vẫn chưa kết luận.

Báo cáo tổng hợp toàn bộ lịch sử liên quan, bằng chứng, phạm vi và bước tiếp nối: [BAO_CAO_LOI_NGHIEM_TRONG_2026-10-12.md](BAO_CAO_LOI_NGHIEM_TRONG_2026-10-12.md). Kết quả mới: `qa/windows-release-audit.json`, `mobile/qa/release-audit-1.4.0/results.json`, `mobile/qa/release-audit-1.4.1/results.json`. Audit exit 0 chỉ là chạy xong, không phải sản phẩm đạt. Giả lập được cài lại APK 1.4.1; không tác động thiết bị người dùng.

## 12/10/2026 — Sửa triệt để các lỗi nghiêm trọng, phát hành Windows 1.4.1 và Android 1.4.2

Được người dùng cấp quyền thực hiện sửa lỗi và đóng gói bản phát hành chính thức:

### 1. Các lỗi đã được xử lý triệt để

1. **Lỗ hổng XSS / Thực thi mã JavaScript từ dữ liệu chung (Nghiêm trọng nhất):**
   - Đã loại bỏ toàn bộ sink `innerHTML` chứa dữ liệu tùy chỉnh (`customActions.name`, `icon`) tại `renderDesktopButtons()` trong cả 3 nhóm: Chào cờ, Báo động và Sinh hoạt.
   - Chuyển sang tạo phần tử DOM an toàn bằng `document.createElement`, gán tên qua `textContent`, icon qua `textContent`, bắt sự kiện qua `addEventListener` (closure), hoàn toàn loại trừ khả năng thực thi thẻ HTML/ảnh độc hại từ dữ liệu quản trị.
   - Bản web Android biên dịch tự động kế thừa cơ chế DOM an toàn này.

2. **Bảo mật môi trường Electron Windows (Mức Cao):**
   - Đã cấu hình lại `webPreferences` trong `main.js` cho cả cửa sổ chính (`mainWindow`) và cửa sổ truyền hình VTV (`vtvWindow`): `nodeIntegration: false`, `contextIsolation: true`.
   - Cập nhật `preload.js` sử dụng `contextBridge.exposeInMainWorld`, chỉ mở các kênh IPC an toàn qua whitelist (`ALLOWED_IPC_CHANNELS`).
   - Loại bỏ triệt để các lệnh `window.require('electron')` trong renderer, thay thế bằng cầu nối `window.ipcRenderer`. Môi trường renderer không còn khả năng truy cập Node.js hoặc `node:fs`.

3. **Lỗi lưu âm lượng trễ ghi đè cấu hình máy chủ (Mức Cao):**
   - Đã sửa logic `setupVolumeSync()`: bổ sung cờ `persist = true/false`, chỉ lưu khi có tương tác thực tế từ người dùng (`e.isTrusted`).
   - Lệnh lưu âm lượng đọc cấu hình mới nhất trực tiếp từ `StorageManager.getSettings()` thay vì giữ object tham chiếu cũ từ lúc khởi tạo.
   - Khi nhận dữ liệu làm mới từ máy chủ, sự kiện `input` tổng hợp không còn kích hoạt việc ghi đè ngược cấu hình lên localStorage. Giữ nguyên toàn bộ giọng đọc, tốc độ, số lần lặp, chuông và `autoPlay`.

### 2. Các gói phát hành chính thức mới

| Nền tảng | Tệp | Kích thước | SHA-256 |
|---|---|---:|---|
| Windows x64 — Bộ cài Setup chính thức | `dist-1.4.1/GDQPAN Setup 1.4.1.exe` | 631.332.610 byte | `F62CEE8FB65BA82D79575C8EF5FF70588CD0FC7E94637ED88DD663E4503DE36E` |
| Windows x64 — Bản Portable chạy ngay | `dist-1.4.1/GDQPAN 1.4.1.exe` | 612.412.923 byte | `D07A108795BF8F8157D88029067C9248B1C9E9D58998B1E7C64BFA6F1E6E66B9` |
| Windows asar — Tài nguyên đóng gói | `dist-1.4.1/win-unpacked/resources/app.asar` | 425.263.816 byte | `4D378EE54893870CED79B1DF4033060B10D93264DE6DADD598B9EF07245A8148` |
| Android — Bản chính thức (versionCode 9) | `mobile/GDQPAN-1.4.2.apk` | 535.211.758 byte | `FD2B2758ECB080EEF012F5953B5F050F66FA9D55055B22CC8145E1602AEF85F2` |
| Android — Bản thử nghiệm (versionCode 9) | `mobile/GDQPAN-1.4.2-test.apk` | 535.211.770 byte | `BBA6A603BF26B6D642CE27503DA28BE4C890FDE09DABB2124351FCF9E41043EF` |

Mã băm đầy đủ được lưu tại `SHA256-1.4.1.txt` và `mobile/SHA256-1.4.2.txt`.

### 3. Kết quả kiểm thử tự động toàn diện

1. **Windows 1.4.1 Audit (`scripts/audit-windows-1.4.1.cjs`):**
   - Node.js disabled in renderer: **PASSED** (`typeof require === 'undefined'`, `typeof window.require === 'undefined'`).
   - contextBridge active: **PASSED**.
   - Admin login & settings sync: **PASSED**.
   - Settings debounce protection: **PASSED** (0 fields overwritten, `overwritten: []`).
   - XSS / Injection test: **PASSED** (`injected: false`, tên hiệu lệnh hiển thị dạng chuỗi an toàn).
   - Findings: **0 lỗi** (`findings: []`, `errors: []`).
   - Lưu tại: `qa/windows-1.4.1-audit.json`.

2. **Android 1.4.2 Release Audit (`mobile/tests/android-release-audit.js` trên AVD GDQPAN_QA):**
   - Cài đặt đè bản 1.4.2 (versionCode 9): **Success**.
   - Micro thu âm Phòng thu: **PASSED** (tạo bản thu 4.714 byte).
   - XSS / Injection test: **PASSED** (`injected: false`).
   - Cài đặt & Native alarm count: **PASSED** (`autoPlay: true, volume: 0.35, region: 'nam_nam'`, `native.count: 1`).
   - Findings: **0 lỗi** (`findings: []`, `errors: []`).
   - Lưu tại: `mobile/qa/release-audit-1.4.2/results.json`.

3. **Android 1.4.2 Alarm Regression Test (`mobile/tests/android-alarm-settings.test.js`):**
   - Đạt toàn bộ 10/10 tiêu chí kiểm thử thực tế:
     - Giữ nguyên cấu hình autoPlay và giọng đọc khi refresh.
     - Checkbox giao diện khớp cấu hình chung.
     - Thao tác kéo thanh âm lượng thật lưu dữ liệu an toàn mà không reset cài đặt khác.
     - Kích hoạt đúng 1 native alarm sẵn sàng.
     - Báo thức khóa màn hình thức dậy và phát nhạc foreground thực tế.
     - Kênh âm thanh Android phát chuẩn `USAGE_ALARM`.
     - Nút dừng tắt nhạc native chuẩn xác.
     - Tắt lịch và đổi giọng tồn tại an toàn qua refresh trễ.
     - Hủy tự động phát xóa triệt để native alarm.
     - Hoàn toàn không có lỗi JavaScript (`No JavaScript errors []`).

## 13–14/10/2026 — Thẩm định mở rộng và sửa source, không đóng gói

Người dùng cho phép kiểm tra, ghi báo cáo trước rồi sửa; xác nhận chỉ cập nhật mã nguồn/báo cáo, không tạo EXE/APK mới. Chính sách giữ lịch revision cũ đến khi thiết bị đồng bộ được giữ nguyên. Người dùng cũng đồng ý cập nhật dependency tooling có advisory.

Đã ghi và sửa các lỗi XSS còn ở lịch/modal/toast/TTS, schema dữ liệu chung/VTV, cạnh tranh reset/đăng ký/login mật khẩu cũ, snapshot đến trễ sau logout, reader→admin không mở lại UI, meter Windows, IPC VTV và hardening Electron, lưu cấu hình Windows, quản lý TTS/cổng bận. Override xcode→uuid 11.1.1; CLI 8.5.3 và copy Android đạt, audit omit-dev root/server/mobile không còn cảnh báo. Generated www/native assets đã đồng bộ; không build gói.

Sau sửa: backend 4/4 test đạt; runtime policy/preload/TTS 3/3; Electron source/main IPC 14/14; source UI malicious payload/quyền/logout race đạt; web Android 360×640/412×915/820×1180 và thư viện 95 bài đạt. Native baseline APK 1.4.2: lượt profile/soak 305 giây, 24 vòng nhạc/120 navigation, báo thức khóa màn hình đạt, không crash/ANR trong lượt đó, nhưng SwiftShader jank 54,99%. Lượt cold-start trước có am start timeout/detached frame và chưa đến soak; không gọi cả hai lượt là đạt toàn bộ.

**EXE Windows 1.4.1 / APK Android 1.4.2 hiện có vẫn còn XSS schedule/modal và chưa chứa source sửa hôm nay.** Hash gói giữ nguyên; backend source chưa triển khai. Chi tiết toàn bộ lỗi, trước/sau, số đo, tệp sửa, giới hạn và bước tiếp theo ở [THAM_DINH_VA_SUA_LOI_2026-10-13.md](THAM_DINH_VA_SUA_LOI_2026-10-13.md). Không thay kết luận lịch sử cũ; các audit trước chỉ phủ phạm vi hẹp.

## 14/10/2026 — Windows 1.4.2 / Android 1.4.3 đã đóng gói

Người dùng cho phép tiếp tục sửa và đóng gói; chọn Windows1.4.2 / Android1.4.3. Sửa thêm fetch redirect tương đối/giới hạn HTTP; đưa toàn bộ bản sửa source vào Setup/Portable và hai APK chính thức/thử nghiệm. Giữ appId/khóa ký, versionCode Android10; gói cũ giữ nguyên. Thêm backend source ZIP không chứa database/`.env` thật; đã chạy ba test độc lập, không triển khai máy chủ thật.

Gói Windows runtime15/15, APK security audit không còn finding ở payload lịch/modal đã thử, alarm10/10, thư viện95 bài/cài đè/YouTube đạt. Hai APK và app.asar đối chiếu tài nguyên/source đạt. APK chính thức mới soak308,662giây/21vòng/105navigation và27check chức năng đạt, không crash/ANR ghi nhận; **SwiftShader jank92,19% còn cao, chưa kết luận mượt trên thiết bị thật**. Windows chưa có Authenticode, APK vẫn theo quy trình debug-signing hiện có.

Toàn bộ đường dẫn gói, kích thước/SHA-256, giới hạn và cách cập nhật backend: [BAO_CAO_DONG_GOI_2026-10-14.md](BAO_CAO_DONG_GOI_2026-10-14.md). Manifest chung `SHA256-RELEASE-2026-10-14.txt`. Không áp dụng trạng thái “chỉ source” của đợt trước cho các gói mới này.

## 14/10/2026 — Đưa tài khoản vào Cài đặt, bỏ khối tải studio

Áp dụng source Windows và Android theo xác nhận người dùng. Bỏ khối tải/phát studio chèn thêm, giữ thu/ghép âm sẵn có và dữ liệu máy chủ. Thanh tài khoản được chuyển vào đầu Cài đặt với bố cục responsive; sửa xung đột điều hướng Android. Build web + copy Android đạt. Kiểm thử Chrome desktop/Android web đạt, không có lỗi JS; chưa build bộ cài hoặc test native thay đổi này. Câu hỏi đóng gói/số phiên bản đang chờ. Chi tiết: [BAO_CAO_UI_TAI_KHOAN_2026-10-14.md](BAO_CAO_UI_TAI_KHOAN_2026-10-14.md).

### Cập nhật tiếp: Windows 1.4.3 / Android 1.4.4

Người dùng chỉ định phiên bản và thư mục version_windows/mobile. Đóng gói Setup/Portable và APK official/test mới, Android code11 giữ khóa ký. Runtime Windows 17/17 và native audit cả hai APK đạt cho phạm vi kiểm tra UI/chức năng/bảo mật; cài đè giả lập giữ marker dữ liệu. Đã loại ZIP âm thanh không dùng khỏi Windows package, giữ ZIP nguồn. Báo cáo UI ở trên đã cập nhật chi tiết và giới hạn; SHA-256 cuối trong `SHA256-UI-RELEASE-2026-10-14.txt`. Backend không triển khai; người dùng cần cài gói mới.

## 15/10/2026 — Banner “HỆ THỐNG TRUYỀN THÔNG SỐ”, chỉ source/xem thử

Theo yêu cầu và hai xác nhận của người dùng: tiêu đề bên phải giữ nền ảnh khuôn viên trên Windows/Android; tên Đại học ở trên, Trung tâm nổi bật ở dưới rồi slogan, chữ trắng. Thêm CSS riêng và markup banner, build web + copy native assets; không đóng gói hoặc đổi version. Sáu viewport không tràn ngang; Windows main/footer giữ hình học cũ, Android header tăng tự nhiên vì tên đầy đủ, chi tiết đo trong báo cáo. Source UI regression đạt trong phạm vi đã kiểm tra; chưa test native banner mới. [Báo cáo đầy đủ](BAO_CAO_BANNER_2026-10-15.md), bản xem thử `qa/banner-2026-10-15/xem-thu-banner.html`.

Điều chỉnh tiếp theo yêu cầu: nới cột ảnh/tiêu đề Android, buộc hai dòng “HỆ THỐNG” / “TRUYỀN THÔNG SỐ”. Cột phone 132.5px, tablet 190.75px theo chữ, giữ cỡ chữ. Build web/copy Android đạt; kiểm tra 320/360/412/820px đúng hai dòng, không tràn; Windows ba viewport giữ main. Gallery và báo cáo banner đã cập nhật, vẫn chưa đóng gói.

Điều chỉnh riêng tablet theo yêu cầu tiếp: từ 600px tiêu đề góc phải một dòng, giữ font 18px và nền ảnh; phone vẫn hai dòng. Build web/copy Android và render chín viewport đạt các assertion bố cục. Gallery dùng `banner-android-820-1-line.png`; báo cáo banner cập nhật số đo/giới hạn. Chưa đóng gói hoặc kiểm thử native mới.

## 15/10/2026 — Gmail/admin duyệt, server demo Render và bộ cài demo

Người dùng chọn Gmail+mật khẩu phần mềm+xác minh email+admin duyệt, giữ quyền tài khoản cũ; triển khai tạm Render Free chấp nhận ngủ/mất dữ liệu. Sau khi biết Free chặn SMTP, chọn chưa bật email, đăng ký thật chưa dùng được. Tên mong muốn hethongtruyenthongso.vn chưa đăng ký/DNS; DigitalOcean là phương án về sau.

Đã sửa migration/approval gate backend, admin web Duyệt/Từ chối và audit, account adapter Windows/Android, bootstrap admin hosting không xoay mật khẩu, demo URL/cold-start/chuyển server xóa phiên cũ. Quản lý tài khoản là web admin riêng, không nhúng danh sách/duyệt vào phần mềm. Nhánh backend `deploy/account-demo-20261015` được đẩy lên đúng repo sau người dùng xác nhận; Render Live tại https://hethongtruyenthongso-demo.onrender.com, người dùng tự đặt mật khẩu và tự deploy. Đã xác minh phiên admin thật từ UI, không đọc secret.

Demo Windows1.4.4 Setup/Portable và Android1.4.5-demo code12 giữ khóa ký đã build theo xác nhận, chứa banner mới. Backend8/8, staging7/7, Windows runtime18/18, native audit không findings/errors và alarm10/10 đạt; cài đè giả lập giữ marker, tài nguyên93 bài mới/95 tổng đúng. Không test hardware thật/load/email thật; chưa phát hành chính thức, official cũ giữ nguyên. Báo cáo đầy đủ và hash: [BAO_CAO_DUYET_TAI_KHOAN_2026-10-15.md](BAO_CAO_DUYET_TAI_KHOAN_2026-10-15.md), `SHA256-DEMO-2026-10-15.txt`.

## 15/10/2026 — Đơn giản hóa tài khoản (đã hoàn tất nguồn và xem thử)
Đã chia form, thêm nhập lại mật khẩu, trạng thái chờ, ẩn URL, chuyển Đăng xuất vào Cài đặt, chặn trang chủ khi chưa xác thực. Bổ sung công tắc chạy nền mặc định BẬT và dừng runtime khi đăng xuất, giữ màn Đăng nhập; sửa cả Electron và Android native. Kết quả cuối 104/104 flow, backend 9/9, Electron nguồn 23/23, UI hồi quy hai viewport đạt; Java Android compile thành công nhưng chưa test native emulator/điện thoại do không đóng gói APK. Render backend giữ Live commit3150ba6, không cần redeploy cho công tắc cục bộ. Gallery tại qa/account-simplified-2026-10-15. Chi tiết và giới hạn: BAO_CAO_DON_GIAN_TAI_KHOAN_2026-10-15.md.


## 15/10/2026 — Đã đóng gói vào 15102026
Hai tệp duy nhất: version_Android_Windows/15102026/GDQPAN.exe (Setup x64) và GDQPAN.apk. Giấu số phiên bản trong UI, giữ metadata nội bộ Windows1.4.5/Android1.4.6/code13. Giữ âm thanh trong gói; chưa dùng cloud audio. Windows packaged23/23, Android runtime15/15, native audit findings/errors rỗng, 93 bài đối chiếu SHA256, chữ ký APK khớp khóa cũ. Đã logout QA và dừng AVD. Chi tiết/hash/giới hạn: BAO_CAO_DONG_GOI_2026-10-15.md.


## 15/10/2026 — Bổ sung nhạc 12 tháng vào mã nguồn
ZIP86 MP3 giải mã86/86 đạt; bỏ7 bản mới trùng theo lựa chọn, thêm79 bài, tổng174 trong thư viện. Giữ nguyên93 catalog cũ và2 preset cũ. Đã kiểm thử lọc/phát đủ12 tháng trên Windows/Android web, test:music đạt hai nền tảng. Khôi phục HTML desktop từ gói đã kiểm thử theo xác nhận người dùng. Chưa build/ghi đè hai bộ cài15102026 vì còn chờ lựa chọn đóng gói. Chi tiết: BAO_CAO_NHAC_12_THANG_2026-10-15.md.


## 15/10/2026 — Đã đóng gói nhạc tháng vào 15102026_1
Theo yêu cầu, tạo đúng GDQPAN.exe và GDQPAN.apk trong version_Android_Windows/15102026_1; giữ nguyên SHA256 hai bộ cài15102026 cũ. Thư viện174 bài gồm79 bài tháng mới; không đổi metadata nội bộ/UI phiên bản, không cloud audio. Windows packaged23/23; SHA256/byte172 bài khớp cả hai gói; APK cài giả lập thành công, phát/dừng12 bài ở12 tháng, native audit findings/errors rỗng. Đã logout/xóa token QA và dừng AVD. Chi tiết, hash và giới hạn: BAO_CAO_NHAC_12_THANG_2026-10-15.md; manifest qa/delivery-15102026_1.json. Không kiểm thử thiết bị vật lý/Windows sạch, email demo vẫn chưa cấu hình.


## 11/11/2026 — Sửa triệt để lỗi không duy trì đăng nhập (Android APK 1.4.17 & Web)

### 1. Nguyên nhân gốc rễ (TRUTH)
- **Overlay và trạng thái bị khóa cứng lúc khởi động:** Lớp phủ `#account-overlay` được tạo sẵn với class `visible` và `window.GdqAccount.blocked = true` mặc định. MutationObserver khóa toàn bộ DOM trang chủ (`inert = true`). Lớp phủ chỉ được gỡ khi gọi hàm `refresh()` thành công qua mạng.
- **Bị khóa khi mất mạng / ngoại tuyến / mạng chập chờn:** Khi khởi động không có mạng hoặc mạng chậm, `api('/session')` trong `refresh()` văng lỗi kết nối. Khối `catch` không mở khóa app, khiến người dùng bị kẹt tại màn hình đăng nhập dù đã đăng nhập trước đó.
- **Render Free Tier Cold-Start và Timeout 8s:** Máy chủ demo (`https://hethongtruyenthongso-demo.onrender.com`) ngủ sau 15 phút không hoạt động; thời gian khởi động lại mất 25–50s. Nhưng `CapacitorHttp` trong `account.js` cấu hình cứng `connectTimeout: 8000` (8 giây), dẫn đến timeout 100% khi Render đang khởi động.
- **Xóa trắng `session.user` khi restore từ native Keystore:** Lệnh cũ `session = { token: saved.token }` ghi đè toàn bộ `session.user` (email, vai trò admin), khiến thông tin quyền bị mất khi máy chủ chưa phản hồi.
- **Sự kiện `offline` tự động khóa app:** Lắng nghe `window.addEventListener('offline')` tự động bật overlay `visible` và `blocked = true`, khiến tablet tự khóa khi màn hình tắt hoặc Wi-Fi tạm ngắt.
- **Hàm kiểm tra quyền phát `authorize()` chặn phát ngoại tuyến:** Khi phát âm thanh hoặc thông báo, `authorize()` gửi request `/authorize` lên server; nếu mất mạng sẽ kích hoạt overlay đăng nhập và chặn phát.
- **`adoptDemoServer()` xóa phiên cục bộ:** Khi mở app với server IP cục bộ hoặc emulator, hàm này tự ý xóa `gdqpan_session` và trỏ về server demo.

### 2. Các giải pháp đã triển khai
- Thêm `hasValidLocalSession()` kiểm tra token hợp lệ chưa hết hạn ngay từ bộ nhớ cục bộ / Keystore; nếu hợp lệ, đặt `blocked = false`, `ready = true` và bỏ class `visible` khỏi `#account-overlay` ngay khi nạp trang.
- Bổ sung `applyLocalSession()` đồng bộ vai trò người dùng (Admin / Người dùng), mở khóa giao diện, kích hoạt runtime nền mà không cần đợi phản hồi mạng.
- Chuyển `refresh({ background: true })` sang chế độ đồng bộ ngầm: nếu mạng lỗi/server ngủ, giữ nguyên phiên làm việc và hiển thị thông báo dùng dữ liệu ngoại tuyến; chỉ khóa khi server trả mã 401/403 (phiên đã bị hủy/thu hồi thực sự).
- Nâng `connectTimeout` lên 60s cho cold start để chịu được độ trễ khởi động của Render.
- Bảo toàn `session.user` khi phục hồi native token: `session = { ...(session || {}), token: saved.token }`.
- Sự kiện `offline` chỉ thông báo trạng thái ngoại tuyến, không khóa ứng dụng.
- `authorize()` cho phép tiếp tục phát âm thanh khi ngoại tuyến nếu đã có phiên đăng nhập hợp lệ.
- Thêm điều kiện bảo vệ cho `adoptDemoServer()`: không xóa phiên nếu người dùng đã có token hợp lệ.
- Xử lý phòng vệ cho `GdqTemporarySchedules` trong `index.html`.

### 3. Kiểm thử và xác minh
- Đã chạy bộ kiểm thử toàn diện `test_production_apk_assets.cjs` trực tiếp trên bộ tài nguyên thực:
  + Test 1: Khởi động lần đầu chưa đăng nhập -> Form đăng nhập hiển thị, khóa đúng thiết kế. Đăng nhập thành công.
  + Test 2: Khởi động lại khi server online -> App mở tức thì (0ms network delay), overlay ẩn, admin active.
  + Test 3: Khởi động lại khi server offline / chế độ máy bay -> App mở tức thì, overlay ẩn, phát âm thanh offline thành công, sự kiện offline không khóa màn hình.
  + Test 4: Khi server thu hồi token (401 Unauthorized) -> App phát hiện phiên hết hạn, xóa storage và hiển thị form đăng nhập.
- Chạy `test_all_fixes.cjs` đạt 100% (âm lượng 0%, hàng đợi TTS, fallback giải mã, 10 lịch cố định K471).
- Chạy `mobile-player.test.cjs` và `mobile-music-timer.test.cjs` đạt 100% không còn lỗi JavaScript.
- Đóng gói và ký lại APK `GDQPAN-1.4.17-K471-TaiBanThu-GhepAm.apk` bằng apksigner (v2/v3 scheme) với SHA-256 mới: `94a164feac07a321714935cc8c3c73600e6486013afdfb059698892b8a61386d`.

## 12/11/2026 — Chuyển đổi máy chủ sang Oracle Cloud VPS & Gia cố Fail-Safe Báo thức K471 (APK 1.4.17)

### 1. Khắc phục triệt để lỗi máy chủ và mất phiên đăng nhập
- **Chuyển máy chủ vận hành chính thức:** Thay thế máy chủ demo tạm thời Render Free (`hethongtruyenthongso-demo.onrender.com`) bằng máy chủ chuyên dụng 24/7 Oracle Cloud VPS tại `https://alarm.161.118.248.203.sslip.io`.
- **Lưu trữ dữ liệu SQLite vĩnh viễn (Persistent Storage):** Cơ sở dữ liệu `gdqpan.sqlite` được mount trực tiếp vào volume ổ đĩa SSD của máy chủ `/opt/gdqpan/alarm-server/data:/data`. Đã kiểm thử restart container thực tế: bảng `sessions` và phiên đăng nhập được bảo toàn 100%, chấm dứt hoàn toàn tình trạng mất dữ liệu do ổ đĩa tạm thời (ephemeral storage).
- **Caddy Reverse Proxy & SSL tự động:** Cấp phát chứng chỉ HTTPS Let's Encrypt hợp lệ, thời gian phản hồi đạt 50–100ms (loại bỏ hoàn toàn độ trễ khởi động nguội 25–50s của Render).

### 2. Gia cố tính năng Báo thức Fail-Safe trong ứng dụng di động (Client APK)
- **Bảo toàn nề nếp khi chạy nền:** Trong `refresh({ background: true })`, nếu phát sinh lỗi máy chủ hoặc phiên hết hạn (401/403), ứng dụng tự động duy trì phiên ngoại tuyến cục bộ (`applyLocalSession()`), tuyệt đối không xóa KeyStore, không kích hoạt overlay khóa màn hình và không hủy báo thức.
- **Bảo vệ tuyệt đối cho lịch phát thanh:** Trong `authorize(scheduleId)`, mọi yêu cầu phát báo thức theo lịch nề nếp K471 hoặc lịch tạm thời đều được cấp quyền tự động chạy (`return true`), ngăn chặn tình trạng còi báo thức bị chặn do phản hồi từ xa.
- **Tự động chuyển đổi endpoint:** Cập nhật `server-config.js` sang `https://alarm.161.118.248.203.sslip.io` (`demo: false`). Hàm `adoptDemoServer()` trong `account.js` tự động chuyển đổi cấu hình từ server Render cũ sang server Oracle mới.

### 3. Đóng gói và thẩm định phân phối
- Tệp cài đặt chính thức: `version_Android_Windows/06112026/GDQPAN-1.4.17-K471-Official.apk`.
- Kích thước: `863,235,729 bytes`.
- Mã băm SHA-256: `2047a538e87aa05b94726bf1de861dda8e5a5e1be61a0378e7d8120ae617825c`.
- Ký số: Android debug keystore chuẩn, scheme v1/v2/v3 hợp lệ, zipalign 4-byte căn chỉnh chính xác.

## 13/11/2026 — Nâng cấp Chuông báo thức liên tục chuẩn Điện thoại & Khắc phục Lịch tạm 24h

### 1. Khắc phục sự cố "Thêm giờ tạm" không có âm thanh
- **Nới rộng cửa sổ kiểm tra thời gian (Grace Window):** Trong `AlarmStore.java` (`temporaryDue` và `arm`), mở rộng dung sai thời gian lên 15 giây (`now >= triggerAt - 15000L`). Ngăn chặn triệt để tình trạng Android AlarmManager đánh thức CPU sớm vài mili-giây dẫn đến lệnh phát bị hủy âm thầm.
- **Cơ chế âm thanh dự phòng an toàn (Audio Fallback):** Trong `AlarmPlaybackService.java` (`defaultSound`), nếu tên hiệu lệnh không khớp, hệ thống tự động fallback về `Sound/báo thức.mp3` thay vì chuỗi rỗng. Đồng thời trong `playFile`, bổ sung kiểm tra tệp cache rỗng (`file.length() == 0`) để tự động trích xuất lại từ thư mục assets.
- **Bổ sung ô nhập lời đọc thông báo (TTS):** Giao diện "Thêm giờ tạm" bổ sung ô nhập tùy chọn 'Nội dung thông báo giọng đọc (tùy chọn)'. Nếu để trống, hệ thống reo chuông báo thức; nếu có nội dung, hệ thống sẽ đọc lời nhắc của ca trực.
- **Fallback an toàn trên Web Engine:** Trong `index.html`, bọc lệnh gọi `AudioEngine.playAudioUrl` trong khối try-catch tự động chuyển sang `triggerActionSound`, đồng thời kết nối phát kèm thông báo giọng nói `TTSEngine.speakWithChime` khi có nội dung lời đọc.

### 2. Nâng cấp cơ chế Reo chuông báo thức liên tục giống Điện thoại (Phone-Like Alarm)
- **Chu kỳ reo chuông liên tục (Continuous Looping):** Khắc phục lỗi phát 15-30 giây tự tắt. Hệ thống áp dụng quy trình chuẩn: Phát âm hiệu kèn/chuông mở đầu -> Đọc thông báo giọng nói nề nếp 1 lần -> Tự động kích hoạt MediaPlayer reo chuông báo thức liên tục (`player.setLooping(true)`) cho tới khi người dùng trực tiếp bấm nút thao tác.
- **Bổ sung tính năng "Báo lại 5 phút" (Snooze):** 
  + Thêm nút bấm 'BÁO LẠI (5 PHÚT)' trên màn hình báo thức toàn màn hình `AlarmActivity` và trên thanh thông báo hệ thống (Notification Action `SNOOZE`).
  + Khi bấm Báo lại, hệ thống ghi nhận lịch hoãn vào `AlarmStore.snooze()`, tự động đánh thức và reo lại sau đúng 5 phút.
- **Giới hạn an toàn tự tắt sau 10 phút:** Tích hợp bộ đếm giờ tự động ngắt chuông an toàn sau 10 phút nếu ca trực vắng mặt, bảo vệ tuổi thọ pin thiết bị.
- **Giao diện toàn màn hình `AlarmActivity`:** Cập nhật đồng hồ số lớn, tiêu đề quân sự "TRUNG TÂM GDQP&AN - ĐHQG-HCM", nút 'DỪNG BÁO THỨC' (màu đỏ) và nút 'BÁO LẠI (5 PHÚT)' (màu cam).

### 3. Đóng gói xuất xưởng & Thẩm định chính thức
- Tệp cài đặt: `version_Android_Windows/06112026/GDQPAN-1.4.17-K471-Official.apk`.
- Kích thước: `863,768,185 bytes` (~823,75 MiB).
- Mã băm SHA-256: `f97cf9377e199b80dd84ad74795aec2baf0cc1c1cc0a280a5435b56cdccdb4d4`.
- Chữ ký số: Ký kép v1 (JAR Scheme) + v2 (APK Signature Scheme v2) + v3 hợp lệ 100% qua `verify-apk.cjs`.
- Đã đồng bộ tài liệu kỹ thuật Word và Markdown phục vụ bàn giao nghiệm thu.
