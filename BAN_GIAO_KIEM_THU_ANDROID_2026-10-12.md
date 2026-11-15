# BÀN GIAO KIỂM THỬ VÀ SỬA ANDROID GDQPAN — 12/10/2026

## 1. Trạng thái và nguyên tắc sự thật

**CHƯA HOÀN TẤT QA CUỐI. Không được tuyên bố Android 1.4.1 đã vượt qua toàn bộ kiểm thử hoặc đã được duyệt phát hành.** Hai APK 1.4.1 đã xây dựng thành công, một số kiểm thử đã đạt, nhưng phép thử hiệu năng với GPU host và thao tác chạm native còn thất bại/chưa hoàn tất.

Bản bàn giao này được lập theo yêu cầu người dùng: sau 5 phút nếu chưa xong, viết một file Markdown rõ ràng để agent khác tiếp tục; không bịa đặt. Mốc kiểm thời gian ghi nhận: 2026-10-12 13:09:36 UTC (20:09:36 Asia/Bangkok), hạn 13:14:36 UTC. Không có commit, push, PR hay triển khai máy chủ trong đợt kiểm thử này.

Workspace: `D:\GDQPAN\Web Báo thức`; shell PowerShell. Repository có rất nhiều thay đổi/untracked từ các đợt trước. Không reset, clean hoặc hoàn nguyên toàn bộ repository. Không có AGENTS.md được tìm thấy ở D:\GDQPAN hoặc thư mục dự án. Không sử dụng sub-agent.

## 2. Những yêu cầu đã được người dùng chốt

- Kiểm tra mã nguồn hiện tại và bản chính thức; cập nhật đồng thời bản thử nghiệm sau sửa.
- Những thay đổi bố cục từ ảnh chỉ áp dụng Android; người dùng cho phép agent quyết định bố cục UI/UX.
- Trang chủ Android đã tổ chức thành Lịch phát tiếp theo, Hiệu lệnh, Nhạc, Nhạc tùy chọn, Phòng thu; các mục khác truy cập qua điều hướng/Tiện ích.
- Chức năng tài khoản được đưa vào cả Android chính thức; giữ yêu cầu xác thực máy chủ, không tự bỏ qua đăng nhập để làm test chạy được.
- Nhạc tùy chọn giữ phát link âm thanh trực tiếp và YouTube, không lưu/thêm bài vào thư viện.
- Sáu danh mục theo sáu thư mục âm thanh được cung cấp; giữ nhạc có sẵn. Bỏ các tệp lỗi, mỗi bài trùng giữ một bản.
- Chỉ Phòng thu được thêm âm thanh. Các nơi khác bỏ tính năng thêm bài/tải âm thanh. Phân quyền tài khoản hiện có vẫn áp dụng; không tự đổi user thành admin.
- Người dùng sẽ cung cấp nội dung nhạc theo tháng 1–10; chưa tự phân bổ sáu thư mục vào các tháng.
- Yêu cầu hiện tại: kiểm thử Android trên điện thoại giả lập về hiệu năng, ổn định, UI/UX; **sửa các lỗi xác nhận, kiểm thử và đóng gói lại Android**.
- Hỏi người dùng nếu có vấn đề cần lựa chọn/thiếu thông tin; không tự quyết định chính sách sản phẩm. Không cần hỏi lại quyền sửa các lỗi đã được xác nhận vì người dùng đã cho phép.
- Sau mỗi đợt hoàn tất, đọc/cập nhật Markdown tổng kết. Nhật ký cũ: `NHAT_KY_CAP_NHAT.md`; không được làm mất lịch sử cũ.

## 3. Công việc thư viện âm thanh đã xong ở đợt trước

Windows và Android 1.4.0 đã đóng gói thư viện cố định 95 bài = 93 bài mới hợp lệ, độc nhất + 2 bài cũ. Sáu nhóm mới: Quân đội 12, Biển đảo 10, Cách mạng 19, sinh viên 14, thanh niên 19, Trữ tình 19.

Đầu vào 102 tệp: 95 tệp hợp lệ, 7 tệp lỗi; bỏ thêm 2 bản sao cùng SHA-256, còn 93 bài mới. Không xóa các tệp gốc của người dùng.

Ba MP3 thực chất JPEG: Cuộc Đời Vẫn Đẹp Sao; Tiến Quân Ca (EDM); Vì Nhân Dân Quên Mình. Bốn MP4 thực chất HTML 410 Gone: Đường Lên Phía Trước; ĐOÀN CA; KHÁT VỌNG TUỔI TRẺ; XUÔI DÒNG CỬU LONG. Hai bản trùng: Một Vòng Việt Nam (Live At Người Đàn Ông Hát), Đường Hồ Chí Minh Con Đường Của Thanh Niên.

Nguồn kiểm chứng: `qa/audio-audit.json`, `qa/music-catalog-build.json`, `config/music-library-policy.json`, `NHAT_KY_CAP_NHAT.md`. Script `scripts/build-music-catalog.js` tạo `assets/music-catalog.js` và `Sound/bundled-music/<sha256>.mp3`; kiểm tra danh sách/SHA nguồn. Không tự bỏ thêm tệp nếu chính sách chưa chốt.

Windows hiện vẫn là 1.4.0: `dist-1.4.0/GDQPAN Setup 1.4.0.exe`, `dist-1.4.0/GDQPAN 1.4.0.exe`. Không xây dựng lại Windows trong đợt QA Android này. README đã ghi Windows 1.4.0 / Android 1.4.1; điều đó không có nghĩa QA Android cuối đã hoàn tất.

## 4. Các sửa đổi sản phẩm Android đã thực hiện trong đợt này

Các sửa đổi dưới đây đã được xây dựng vào APK mới nhất ở mục 5. Giữ engine Windows như trước; các thay đổi engine JS được áp dụng qua bước chuyển đổi Android trong `mobile/build-web.js`.

| Vấn đề xác nhận | Sửa đổi | Vị trí |
|---|---|---|
| Bộ chọn danh mục nhạc chỉ cao 40px | Override Android thành min-height 48px | mobile/www/mobile-ui.css |
| Ô chọn từng lịch có vùng chạm 22px độc lập | Bọc checkbox trong label 48×48px, đổi cột grid 26→48px | mobile/www/mobile-schedule.js, mobile-ui.css |
| WebView getUserMedia báo Permission denied dù đã cấp RECORD_AUDIO | Bổ sung MODIFY_AUDIO_SETTINGS; Capacitor BridgeWebChromeClient yêu cầu cả hai quyền | mobile/android/app/src/main/AndroidManifest.xml |
| Meter micro gọi vòng cập nhật trước khi isRecording=true, rồi dừng | Lưu callback startMeter và gọi sau MediaRecorder.start/isRecording=true; hỗ trợ cả lúc phải await nhạc nền | mobile/build-web.js → www/index.html |
| Ép tắt ngay sau đăng nhập có thể khôi phục token WebView cũ và nhận 401 | Thêm GdqAccount.restore đọc phiên AES/GCM đã commit đồng bộ trong Android Keystore/SharedPreferences; adapter Android khôi phục token rồi vẫn gọi /session và /shared trước mở khóa | GdqAccountPlugin.java, mobile/build-web.js → www/assets/account.js |
| Đăng nhập rất sớm có thể chạy cùng lúc với restore và bị ghi đè máy chủ | Biểu mẫu inert, chặn submit trong lúc bootstrap restore; gắn các handler sau bootstrap; readonly xử lý session chưa có user | mobile/build-web.js |
| Đồng bộ âm lượng ghi đè autoPlay/region bằng snapshot cũ | updateSliders chỉ lưu khi thao tác input thật; không lưu lúc init hoặc input tổng hợp từ đồng bộ; debounce lấy getSettings mới rồi chỉ thay volume | mobile/build-web.js → www/index.html |

**Lỗi cuối về âm lượng là lỗi nghiêm trọng đã xác nhận bằng log:** sau /shared autoPlay=true, native sync lần đầu true, rồi 300ms sau settings cũ autoPlay=false được lưu và sync xóa lịch (count=0). Nguyên nhân ở setupVolumeSync của desktop source: biến savedSettings giữ bản cũ, callback setTimeout lưu lại toàn bộ bản đó. Android đã sửa riêng; không áp dụng âm thầm sang Windows.

`mobile/build-web.js` kiểm tra cú pháp account.js được tạo bằng vm.Script; các script JS sửa đổi đã chạy node --check. Source account.js dùng chung tại `assets/account.js` vẫn là bản Windows; adapter Android được sinh vào `mobile/www/assets/account.js`.

Phiên bản Android đã đổi: mobile/package.json và lock 1.4.1; app/build.gradle mặc định versionCode=8/versionName=1.4.1; build-android.ps1 đóng gói 1.4.1 và 1.4.1-test, cùng versionCode 8.

## 5. APK mới nhất — đã build, chưa được coi là QA cuối đạt

| Gói | Kích thước | SHA-256 |
|---|---:|---|
| mobile/GDQPAN-1.4.1.apk | 535211412 byte | 6A88D078A4D960CB763DB707952DC0AF6D2F3AAEF0C4EA8BF35F1A5122BF8AB1 |
| mobile/GDQPAN-1.4.1-test.apk | 535211428 byte | FFBBE9A67BB849D813035AE68318F5A8FCAEF3261C2E4ECBA565C6051BB481B7 |

Hash lưu ở `mobile/SHA256-1.4.1.txt`. Cả hai dùng applicationId `vn.gdqpan.app.mobile`, versionCode 8, tên phiên bản 1.4.1 / 1.4.1-test. Ký theo cách assembleDebug hiện có; certificate SHA-256 của cả hai đã kiểm tra trực tiếp trên APK cuối:

`48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452`

Khớp certificate APK 1.4.0; nhiều lượt adb install -r đã thành công. Hai kênh thay thế nhau, không cài song song. Nhãn launcher cũ GDQPAN 1.2 vẫn giữ; chưa đổi tên ứng dụng. Không tự nâng thành release signing/đưa lên cửa hàng ứng dụng.

`python scripts/verify-android-music.py 1.4.1` đã đạt trên đúng các APK cuối: 93 tệp nhạc khớp kích thước/SHA-256; catalog/fixed-music.js khớp nguồn; index.html, mobile-ui.css, mobile-schedule.js và account.js đóng gói khớp mobile/www. Kết quả: `qa/android-packaged-verification-1.4.1.json`.

## 6. Môi trường giả lập và các đường dẫn

- AVD GDQPAN_QA, cấu hình Pixel 5; Android 15 / API 35 / google_apis x86_64. Model runtime sdk_gphone64_x86_64; không phải điện thoại Pixel thật.
- Serial emulator-5554; phải kiểm tra `adb -s emulator-5554 emu avd name` là GDQPAN_QA trước thao tác sửa/kill/cài.
- RAM yêu cầu launch 2048MB; MemTotal đo 2531956KB. Có 4 CPU theo cấu hình.
- ADB: `D:\GDQPAN\android-build-tools\android-sdk\platform-tools\adb.exe`.
- Emulator: `D:\GDQPAN\android-build-tools\android-sdk\emulator\emulator.exe`.
- SDK build-tools 36.0.0; JDK dưới `D:\GDQPAN\android-build-tools\jdk`; Gradle cache trong android-build-tools/gradle-cache.
- Build project ASCII: `D:\GDQPAN\android-build-tools\project\android` (tránh lỗi công cụ Java với tên thư mục tiếng Việt).
- `mobile/start-emulator.ps1` đã thêm tham số -Gpu swiftshader/host/auto; mặc định vẫn swiftshader. Giả lập hiện chạy **-Gpu host**, no-window, no-snapshot, no-audio, no-boot-anim. Launcher PID khi bắt đầu host: 12232; cần kiểm tra PID hiện tại, không tự coi đó là PID qemu còn sống.
- GLES đã xác nhận: Google (Intel), Android Emulator OpenGL ES Translator (Intel Arc Graphics). Driver 32.0.101.6127. WHPX(10.0.26300) được emulator -accel-check báo usable.
- ADB hiện đã được root trên AVD này để đọc /data/anr. Ứng dụng vẫn chạy UID thông thường; không sửa quyền root trong APK.
- Không có loa/micro thật được đánh giá. no-audio tắt âm thanh ra máy chủ; dumpsys audio chứng minh player Android chạy, không chứng minh chất lượng nghe.
- Các test tự tạo tài khoản admin/máy chủ local trong thư mục temp, dùng adb reverse. Không dùng tài khoản thật, không triển khai VPS, không đưa token QA vào source/APK. Không ghi token/mật khẩu vào báo cáo; logcat của các test đã lọc token/password/Bearer.

## 7. Kết quả đã đạt — phân biệt đúng build và cách thử

### 7.1 Hồi quy web trên source Android cuối

`node mobile/tests/mobile.test.js` chạy lại sau sửa lưu âm lượng, exit 0: 360×640, 412×915, 820×1180; điều hướng, lịch thêm/sửa/xóa/lưu, hủy báo động, thu âm bằng micro giả, giải mã/ghép WAV. Đây là Chrome trên Windows với fake microphone, không thay thế kiểm thử native Android.

### 7.2 Thu âm và UI trên giả lập SwiftShader, build 1.4.1 trước sửa lưu âm lượng

Ở `mobile/qa/performance-1.4.1/results.json`: bộ chọn 48px và label chọn lịch 48×48px đã đạt; chạm mép label đổi trạng thái; không tràn ngang ở small/large, landscape; keyboard link trong viewport; OS font_scale=1.3 không tràn ngang. Các thao tác chạm trong lượt này chủ yếu dùng CDP/Puppeteer, Native Back/keyboard/OS settings dùng ADB.

Thu âm native + ghép hai đoạn: 34811 byte bản thu, 1962284 byte WAV ghép, 9.72 giây, meterTicks 168. Xác nhận recorder chạy và meter cập nhật; không khẳng định chất lượng micro thật.

Năm cold start giữ session, có test làm cache WebView chứa token QA cũ rồi force-stop để kiểm chứng restore từ phiên native. Thời gian native TotalTime: 6070, 3378, 6921, 3830, 3579ms. Trung vị 3830ms; khoảng 3378–6921ms. Navigation loadEventEnd trung vị khoảng 2887.8ms, khoảng 2579.1–4844.7ms. UI/accountReadyIncludingAutomation có overhead công cụ, không được dùng làm thời gian khởi động của app.

Soak 303.9 giây: 15 vòng nhạc play/pause/resume/stop + mở/đóng danh mục, 75 lần điều hướng trong soak. Không JS error, không fatal crash/ANR được ghi nhận trong lượt này. PSS **tiến trình chính** 121663→130026KB, cao nhất 132337KB; chưa gồm renderer WebView. JS heap 7508244→7929052 byte. Sau vòng 4: DOM documents 4, nodes 7578–7579, eventListeners 745. Không chứng minh ứng dụng không rò rỉ bộ nhớ dài hạn.

Mất máy chủ chặn phát mới; khôi phục server/session đo 562ms trong test local.

**Lượt này không phải toàn bộ đạt:** báo thức khóa màn hình thất bại vì lỗi âm lượng ghi autoPlay=false/count=0. Đã sửa sau đó và kiểm thử riêng như mục 7.3. APK trong lượt này có cùng versionName 1.4.1 nhưng khác hash với APK cuối; không được nhầm chỉ vì cùng tên phiên bản.

Hiệu năng SwiftShader không tốt: gfxinfo-soak 1706 frames, janky 1344 (78.78%), p50 69ms, p95 500ms, p99 950ms. CPU sample 30.181s: native main process khoảng 51.46% của một lõi, WebView main-thread TaskDuration/wall khoảng 36.08%; không phải CPU toàn ứng dụng/thiết bị. File `cpu-sample.json`. Không kết luận Android thật cũng có các số này hoặc đã mượt.

### 7.3 Kiểm thử settings + báo thức trên APK cuối / GPU host

`node mobile/tests/android-alarm-settings.test.js` đã chạy đạt, exit 0; `mobile/qa/alarm-settings-1.4.1/results.json`, endedAt 2026-10-12T12:57:15.044Z:

1. /shared bật autoPlay=true, volume=.35, region=nam_nam; sau >300ms vẫn giữ đúng cả ba.
2. Checkbox tự động phát theo dữ liệu chung.
3. Chạm đổi volume thật trong WebView, volume thành .8; autoPlay/region giữ đúng.
4. Công bố vào máy chủ QA; native sync count=1, exact/fullScreen/notifications=true.
5. Home + khóa màn hình; AlarmPlaybackService chạy foreground.
6. dumpsys audio có player state:started với USAGE_ALARM.
7. Dừng service kết thúc phát.
8. /shared tắt autoPlay, đổi volume=.15, region=trung_nu; sau debounce vẫn đúng; count=0.
9. Không JS errors.

Lượt trước của test này lấy mẫu audio sau 500ms quá sớm: foreground service có nhưng audio chưa started; log cho thấy AudioFocus bị từ chối hai lần rồi retry ở khoảng 1.8s. Test được sửa chờ/poll player tối đa 12s. Không sửa service để bỏ qua AudioFocus. Lượt sau đã thực sự quan sát được USAGE_ALARM/player started.

## 8. Các thất bại/chưa xác minh — KHÔNG bỏ qua

### 8.1 Android 1.4.0 baseline không hoàn tất

`mobile/qa/performance-1.4.0/results.json` có fatal do attach đọc pid quá sớm khi restart font-scale, cùng một phát hiện recorder chưa khởi động. Baseline đã có khoảng 5 phút loop, nhưng không phải test đầy đủ đạt. Một lượt đầu còn gặp kết nối QA server khi restore; không tự coi mọi timeout là crash sản phẩm.

### 8.2 GPU host: ANR/no-focused-window chưa giải quyết xong

Lượt `GDQ_QA_LABEL=1.4.1-host` dùng APK cuối đạt năm khởi động và layout small, nhưng timeout khi native Back đóng modal. Screenshot failure chỉ có wallpaper. Native window focus sau đó là hộp thoại Application Not Responding.

Bằng chứng: `mobile/qa/performance-1.4.1-host/results.json`, `failure.png`, `lastanr.txt`, `anr-main.txt`. ANR 19:59:09 local: **Input dispatching timed out (Application does not have a focused window)**. Log cũng có ANR của com.google.android.inputmethod.latin. Trace đọc từ /data/anr/anr_2026-10-12-19-59-04-908: luồng main (sysTid 4467, tên qpan.app.mobile) ở Looper/nativePollOnce; RenderThread ở waitForWork. Chưa thấy bằng chứng app JS/Java bị deadlock trong các stack được xem.

**Đây chỉ là bằng chứng hỗ trợ nghi vấn lớp focus/giả lập/cách đổi display, không đủ kết luận nguyên nhân chắc chắn là driver/giả lập, cũng không đủ khẳng định ứng dụng không có lỗi.** Không ghi rằng đã sửa ANR.

Lượt host đầu native TotalTime 1939/1553/1993/1677/1572ms (trung vị 1677ms). Chỉ là phép đo của lượt bị lỗi, chưa có soak host hoàn chỉnh.

Force-stop rồi launch lại đã khôi phục focus MainActivity. Script được đổi cách thử: force-stop trước wm size/density rồi khởi động lại, kiểm tra native window focus, lấy native WebView bounds bằng uiautomator; chuyển một số chạm sang adb input tap thay CDP.

### 8.3 Lượt mới nhất với cold profiles cũng FAILED

Tool session 62913 / Node PID lúc chạy 22016 đã kết thúc **exit 1** lúc kiểm tra chuyển trang bằng tapNative. File kết quả: `mobile/qa/performance-1.4.1-host-cold-profiles/results.json`.

- Năm lượt mở lại và giữ session đã in PASS.
- Profile small/home kiểm tra không tràn ngang PASS.
- Sau đó navigate sang trang khác timeout 30000ms (`navigate`, android-performance.test.js).
- Chưa chạy được đủ small/large, ghi âm, soak, chữ lớn, alarm trong lượt này.
- Sau khi kết thúc, native focus đọc được là MainActivity; page vẫn home. Cleanup đã reset wm/density: viewport đọc lại 393×778, DPR 2.75. Không dùng kích thước sau cleanup để suy ra tọa độ lúc thất bại.
- **Hàm tapNative mới chưa chứng minh ánh xạ CSS/DPR/native WebView bounds đúng.** Phải kiểm tra tọa độ thực tế và screenshot/XML; không tự kết luận timeout là lỗi điều hướng của app.
- results.findings có thể rỗng trong khi results.fatal có timeout. findings=[] không đồng nghĩa test đạt.

### 8.4 Chưa làm ở APK cuối

- Chưa chạy `GDQ_QA_VERSION=1.4.1 node mobile/tests/android-library.test.js` để xác minh cài đè hai kênh, marker dữ liệu, decode sáu nhóm, YouTube open/back trên đúng APK cuối.
- Chưa có phép thử hiệu năng/soak hoàn chỉnh bằng GPU host với input/focus đã xác minh.
- Chưa có kiểm thử điện thoại thật, nhiều API Android, test chạy 24/7, chất lượng nghe/micro thật, hay xác nhận YouTube playback ổn định trên APK cuối.
- Chưa có kết luận rằng ANR/no-focused-window đã được giải quyết.

## 9. Tình trạng tiến trình khi bàn giao

Lượt performance session 62913 đã báo exit 1; không còn cần chờ nó để hoàn thành soak. Script finally ghi results, disconnect browser, đóng server QA, xóa thư mục temp có kiểm tra phạm vi. Cần kiểm tra tiến trình thực tế trước chạy mới; không chạy hai test adb song song trên cùng AVD.

Tool session 32175 (read-only kiểm certificate/Get-NetTCPConnection) cũng đã kết thúc. Kiểm tra cuối bằng Get-CimInstance không còn node.exe chạy android-performance.test.js; Get-NetTCPConnection không có listener thuộc PID 22016. Không có test Android nào được giữ chạy ngầm để agent tiếp tục chờ. Agent kế tiếp cần chạy lại sau khi sửa/kiểm chứng harness.

Giả lập vẫn tồn tại; ADB forward tcp:9223 có thể trỏ PID cũ. Khi force-stop/relaunch luôn lấy pid mới và forward lại. Đừng dùng token/server QA cũ còn trong localStorage làm tài khoản thật; test mới tự tạo server và đăng nhập.

## 10. Bước tiếp theo cho agent

1. Đọc file này, NHAT_KY_CAP_NHAT.md, git status; xác nhận APK/hash mới nhất chưa bị thay đổi.
2. Kiểm tra AVD name, boot_completed, renderer, window focus, trạng thái node tests. Không wipe AVD hoặc gỡ app nếu muốn kiểm chứng cài đè giữ dữ liệu.
3. Debug tapNative có kiểm chứng: log CSS rect, DPR, XML bounds, tọa độ adb tap; chụp screenshot trước/sau; kiểm tra native focus; đừng dùng CDP getPage/layout để thay thế bằng chứng thao tác input thực sự tới app.
4. Tách môi trường giả lập khỏi lỗi sản phẩm: tái hiện no-focused-window, xem cả app và IME/system traces; thử cấu hình display khi app đã dừng. Không sửa app để che timeout nếu chưa xác định nguyên nhân.
5. Sau khi harness đáng tin, chạy lại performance với output label mới để giữ bằng chứng các lần FAILED. Chỉ đánh dấu đạt nếu không fatal, không findings, có endedAt và kiểm tra logcat/ANR đúng PID/timeline.
6. Chạy regression Android library hai kênh trên APK cuối; xác nhận số bài 95/93, cấm thêm ngoài Studio, Studio vẫn được thêm theo vai trò, cài đè giữ marker, YouTube open/back. Nếu playback không quan sát được, ghi rõ chưa xác nhận, không tự ghi PASS playback.
7. Nếu sửa sản phẩm thêm: build cả hai kênh, test phần liên quan, chạy verify-android-music.py, kiểm certificate/versionCode/hash. Không mở rộng sửa Windows hoặc đổi chính sách tài khoản khi chưa có quyền.
8. Cập nhật NHAT_KY_CAP_NHAT.md với kết quả cuối/bằng chứng/giới hạn; cập nhật hash nếu APK thay đổi. Chỉ bàn giao như bản hoàn tất sau các bước cần thiết đạt.

## 11. Lệnh chạy lại (PowerShell từ thư mục dự án)

```powershell
# Kiểm tra thiết bị
& 'D:\GDQPAN\android-build-tools\android-sdk\platform-tools\adb.exe' -s emulator-5554 emu avd name
& 'D:\GDQPAN\android-build-tools\android-sdk\platform-tools\adb.exe' -s emulator-5554 shell getprop sys.boot_completed

# Build hai APK, giữ signing hiện có
powershell -NoProfile -ExecutionPolicy Bypass -File mobile/build-android.ps1

# Hồi quy web (không thay thế native)
node mobile/tests/mobile.test.js

# Kiểm thử settings/lockscreen đã đạt, có thể chạy lại nếu sửa liên quan
$env:GDQ_QA_VERSION='1.4.1'
node mobile/tests/android-alarm-settings.test.js

# Native library, còn cần chạy trên APK cuối
node mobile/tests/android-library.test.js

# Performance: sửa/kiểm chứng harness trước; dùng label mới để không ghi đè FAILED
$env:GDQ_QA_LABEL='1.4.1-next-verified-input'
node mobile/tests/android-performance.test.js

# Đối chiếu 93 assets và code trong cả hai APK
python scripts/verify-android-music.py 1.4.1
```

Khởi động GPU host khi AVD đã dừng: `powershell -NoProfile -ExecutionPolicy Bypass -File mobile/start-emulator.ps1 -Gpu host`. Không khởi động instance thứ hai khi GDQPAN_QA đang chạy. Kill đúng AVD bằng adb emu kill sau khi xác minh tên; không kill chung emulator/node của công việc khác.

## 12. Điều không được ghi sai trong báo cáo tiếp theo

- Build thành công không đồng nghĩa kiểm thử hoàn tất.
- Nhiều file cùng versionName 1.4.1 đã được tạo trong quá trình sửa; dùng hash để phân biệt.
- findings rỗng không đồng nghĩa PASS nếu fatal/timeout.
- Không coi UIReadyIncludingAutomation là thời gian khởi động native.
- Không coi PSS main process là RAM toàn ứng dụng; không coi CPU một tiến trình là CPU cả thiết bị.
- Chưa được khẳng định ANR là do GPU, cũng chưa được khẳng định đã sửa được ANR.
- Thu âm micro giả/giả lập và player started không chứng minh chất lượng audio thật.
- Chưa có QA native library hai kênh và soak host cuối đầy đủ.
- Không đổi nhật ký cũ thành “hoàn tất” khi các mục trên còn tồn tại.

