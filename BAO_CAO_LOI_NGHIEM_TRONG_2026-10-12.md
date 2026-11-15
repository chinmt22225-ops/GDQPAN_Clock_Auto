# Báo cáo kiểm tra và bàn giao Windows / Android — 12/10/2026

## 1. Kết luận và phạm vi quyền thực hiện

**Chưa thể kết luận phần mềm đã ổn. Có lỗi nghiêm trọng được tái hiện trên Windows 1.4.0 và Android 1.4.0. Android 1.4.1 đã sửa hai lỗi chức năng được kiểm tra lại, nhưng vẫn còn lỗi thực thi JavaScript từ dữ liệu chung và chưa hoàn tất kiểm thử hiệu năng/ổn định cuối.**

Yêu cầu mới nhất của người dùng: **“Chỉ báo cáo để agent khác sửa”**. Đợt kiểm tra này không sửa mã sản phẩm, không build lại, không phát hành gói mới. Chỉ thêm script QA, lưu kết quả và viết báo cáo. Agent tiếp theo cần lấy quyền sửa từ người dùng trước khi thay đổi sản phẩm; không suy diễn quyền sửa Android trước đây thành quyền sửa Windows trong đợt này.

“iPad” đã được người dùng xác nhận là **máy tính bảng Android cài APK 1.4.0**, không phải iPad Apple. Không có kết quả kiểm thử iOS/Safari trong báo cáo này.

Người dùng yêu cầu dừng khi hạn mức tài khoản Codex còn 5%, rồi ghi báo cáo trung thực. Lần đọc gần lúc lập báo cáo: cửa sổ 5 giờ đã dùng 82% (còn 18%); tuần đã dùng 30% (còn 70%). Chưa chạm mốc dừng. Kết thúc đợt kiểm tra khi đã có kết quả và bàn giao, không cố tiêu hao hạn mức đến 5%.

## 2. Bảng kết quả hiện tại

| Vấn đề | Windows 1.4.0 | Android 1.4.0 | Android 1.4.1 hiện có |
|---|---|---|---|
| Tên hiệu lệnh từ dữ liệu chung thực thi JavaScript | **Nghiêm trọng nhất:** đã thực thi; Node `fs` có sẵn | **Cao:** đã thực thi trong WebView | **Cao:** vẫn thực thi trong WebView |
| Lưu âm lượng trễ ghi đè cấu hình mới | **Cao:** sai giọng, tốc độ, số lần lặp, chuông; cả trường autoPlay bị ghi đè | **Cao:** UI bật tự động phát nhưng dữ liệu tắt, native alarm count=0 | Không tái hiện: giữ autoPlay/giọng, count=1 |
| Phòng thu không khởi động micro | Chưa thấy lỗi khởi động với micro giả lập; chưa thử micro thật | **Cao:** NotAllowedError / Permission denied dù đã cấp RECORD_AUDIO | Khởi động được; bản thu 4.771 byte trong lượt ngắn |
| ANR, độ mượt, khởi động, soak cuối | Chưa kiểm thử hiệu năng đầy đủ | Chưa đánh giá đầy đủ trong đợt này | Còn bằng chứng ANR từ đợt trước, nguyên nhân chưa xác định; QA cuối chưa hoàn tất |

Mức độ là đánh giá kỹ thuật để ưu tiên sửa, không phải điểm CVSS được tính chính thức. Không có bằng chứng hệ thống thật đã bị tấn công.

## 3. Bằng chứng mới và ranh giới kiểm thử

Tất cả đường dẫn tương đối dưới đây tính từ `D:\GDQPAN\Web Báo thức`.

### Windows

- Script mới: `scripts/audit-windows-release.cjs`.
- Kết quả: `qa/windows-release-audit.json`; lượt hoàn tất 2026-10-12 14:57:14–14:57:20 UTC (21:57 giờ UTC+7).
- Nạp HTML thật từ `dist-1.4.0/win-unpacked/resources/app.asar/HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html`, trong Electron BrowserWindow riêng. Thiết lập Node/isolation/webSecurity giống main window đã đóng gói.
- Dùng hồ sơ Electron riêng, máy chủ cục bộ tạm, tài khoản quản trị QA được đăng nhập thật. Không dùng hồ sơ hay máy chủ của người dùng.
- Đây là kiểm thử runtime của renderer đóng gói. Không chạy toàn bộ main/preload của ứng dụng, không cài Setup lên máy khác. IPC `get-app-settings` được stub trả null; cấu hình ban đầu do fixture tạo. Có micro giả lập và cửa sổ ẩn.
- Kiểm tra độc lập mã `main.js` bên trong app.asar xác nhận `nodeIntegration:true`, `contextIsolation:false`, `webSecurity:false`.
- Script kết thúc exit 0 nghĩa là quy trình audit đã chạy xong; **không nghĩa phần mềm vượt qua kiểm thử**. Kết quả vẫn có hai finding.

### Android

- Script mới: `mobile/tests/android-release-audit.js`.
- Kết quả riêng theo APK: `mobile/qa/release-audit-1.4.0/results.json` và `mobile/qa/release-audit-1.4.1/results.json`.
- Lượt 1.4.0: 15:02:10–15:02:27 UTC; lượt 1.4.1: 15:08:07–15:08:18 UTC ngày 12/10/2026.
- Chạy trên AVD sở hữu cho QA `GDQPAN_QA`, serial `emulator-5554`, Android 15/API 35, x86_64, cấu hình Pixel 5, SwiftShader; không có điện thoại hay máy tính bảng vật lý tham gia.
- Cài APK thật 1.4.0 bằng `install -r -d`, sau đó cài lại APK 1.4.1 bằng `install -r`, không uninstall/wipe. Không thay đổi các APK nguồn.
- Dùng ADB cấp RECORD_AUDIO và CDP/Puppeteer thao tác WebView. Máy chủ/tài khoản quản trị QA riêng. Fixture đồng ý hộp confirm làm mới dữ liệu, không kiểm thử thao tác người dùng trên hộp confirm.
- Lịch fixture là 23:58, tất cả ngày, enabled. Count native đo bằng `GdqMobile.syncAlarms()`; lượt audit mới không chờ báo thức thực sự đến giờ.
- Trước khi kết thúc, fixture công bố lịch rỗng, hiệu lệnh tùy chỉnh rỗng, autoPlay=false, refresh; đóng máy chủ và gỡ ADB reverse do fixture tạo.
- Máy giả lập hiện được đưa lại về APK **1.4.1**. Thiết bị của người dùng không bị tác động. Giả lập có thể còn chạy.
- `checks:[]` của script audit mới không phải xác nhận thiếu kiểm thử: số đo nằm ở `settings`, `recorder`, `sharedContentInjection`; `findings` ghi lỗi phát hiện. Cả hai lượt hoàn tất không ghi pageerror trong `errors`.

## 4. Lỗi bảo mật: dữ liệu chung thực thi JavaScript

### Tái hiện và điều kiện

1. Khởi tạo máy chủ QA, đăng nhập tài khoản admin thật.
2. Admin công bố `customActions` với tên hiệu lệnh chứa thẻ ảnh và handler onerror vô hại.
3. Ứng dụng gọi `GdqAccount.refresh()` và render hiệu lệnh mới.
4. Handler thực thi; boolean `injected=true` được ghi nhận trên Windows và cả hai APK.

Payload chỉ ghi boolean để chứng minh thực thi. Windows kiểm tra hàm `require('node:fs').readFileSync` có sẵn, **không đọc tệp hoặc chạy lệnh hệ điều hành**. Android kiểm tra sự hiện diện của dữ liệu phiên trong localStorage và đối tượng Capacitor; không giữ/xuất giá trị token, không thực hiện lệnh native. Việc kiểm tra phiên có gọi `localStorage.getItem`, vì vậy không được mô tả sai thành “không truy cập dữ liệu phiên”.

**Điều kiện tấn công đã kiểm tra:** dữ liệu được cung cấp qua admin được xác thực. Không chứng minh người chưa đăng nhập hoặc user thường có quyền công bố payload. Rủi ro xuất hiện nếu tài khoản quản trị/máy chủ bị xâm nhập hoặc dữ liệu quản trị chứa nội dung không an toàn. Không chứng minh exploit đầy đủ để đọc tệp hay chạy lệnh; Node API có sẵn là bằng chứng cho khả năng leo thang tác động trên Windows.

### Nguyên nhân trong nguồn

- `HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html:7339` bắt đầu `renderDesktopButtons()`; `:7343` `formatActionText()` không chuyển tên thành văn bản an toàn; `:7371` đưa tên tùy chỉnh vào `innerHTML`. Các nhóm alarm/daily có sink tương tự. Icon và tên trong inline onclick cũng cần rà soát.
- `assets/account.js:40` nhận dữ liệu chung vào localStorage; sự kiện `gdqpan-shared` dẫn đến render lại tại HTML khoảng `:12281`.
- `server/src/server.js:60–68` kiểm tra customActions là array, chưa kiểm tra chặt từng phần tử/name/icon/group. PUT `/api/shared` có yêu cầu admin; không được bỏ qua điều kiện này khi mô tả lỗi.
- `main.js:176–179` bật Node, tắt context isolation và web security. Cửa sổ VTV khoảng `:570–574` có cấu hình tương tự. Chưa thấy guard `setWindowOpenHandler`/`will-navigate` trong phần mã đã rà soát.
- Build Android 1.4.1 hiện có vẫn giữ sink hiệu lệnh; bản sửa Android trước đây không xử lý lỗi này.

### Hướng sửa cho agent tiếp theo (chưa thực hiện)

Ưu tiên chuyển nội dung dữ liệu sang `textContent`/DOM an toàn; gắn listener bằng closure thay vì nhúng tên vào onclick. Kiểm tra schema customActions phía server và kiểm tra các sink tương tự ở lịch, danh sách, nội dung nhập/đồng bộ. Windows cần chuyển API cần thiết sang preload/contextBridge có giới hạn, bật context isolation và sandbox phù hợp, tắt Node trong renderer, khôi phục webSecurity, giới hạn navigation/new windows. Phải kiểm thử lại âm thanh file://, IPC, đăng nhập và VTV sau thay đổi; không sửa cờ Electron đơn lẻ rồi coi là xong.

Lý do cần cô lập renderer được hỗ trợ bởi [tài liệu bảo mật chính thức Electron](https://www.electronjs.org/docs/latest/tutorial/security). Tài liệu không thay thế bằng chứng runtime của dự án.

## 5. Lỗi cấu hình / báo thức

### Windows 1.4.0

Fixture bắt đầu với cấu hình cũ, nhận cấu hình mới từ máy chủ. Ngay sau refresh dữ liệu đúng, sau 900 ms bị ghi đè:

| Trường | Máy chủ / ngay sau refresh | Sau chờ callback |
|---|---|---|
| volume | 0.35 | 0.35 |
| region | nam_nam | bac_nu |
| rate | 1.2 | 0.8 |
| repeatTimes | 5 | 2 |
| chimeBeforeSpeech | true | false |
| autoPlay | true | false |

`setupVolumeSync()` tại HTML `:7300` giữ một object `savedSettings` cũ. Callback khoảng `:7322–7323` đổi volume rồi lưu lại toàn object sau debounce 300 ms. Refresh tài khoản cập nhật settings và phát input tổng hợp cho slider, kích hoạt callback dùng object cũ.

Sai giọng/tốc độ/số lần lặp/chuông được xác nhận. **Chưa chứng minh trường autoPlay làm tắt bộ lịch Windows**, vì hành vi scheduler Windows không được kiểm thử ở audit này; không suy luận kết quả Android sang Windows.

### Android 1.4.0

Máy chủ gửi `{autoPlay:true, volume:0.35, region:'nam_nam'}`. Sau 900 ms lưu thành `autoPlay:false`, `region:'bac_nu'`. Checkbox giao diện vẫn true nhưng `native.count=0`, trong khi quyền exact/fullScreen/notifications đều true. Người dùng có thể tưởng đã bật lịch, nhưng native không có lịch được kích hoạt. Đây là lỗi chức năng cốt lõi nghiêm trọng.

Kiểm thử cũ `mobile/tests/android-alarm-settings.test.js` chạy lại với 1.4.0 còn thất bại ở assertion đầu; `mobile/qa/alarm-settings-1.4.0/results.json` cũng có các pageerror “Cannot read properties of undefined (reading 'role')”. Lượt đó không đến bước báo thức khóa màn hình. Lỗi role chưa được phân tích/tái hiện độc lập, không thêm kết luận về nguyên nhân hoặc mức độ. Audit mới dùng đăng nhập thật tái hiện settings/count mà không có các pageerror ấy.

### Android 1.4.1

Audit mới trên APK hash hiện tại giữ `autoPlay:true`, volume 0.35, region nam_nam; checkbox true; native count=1. Kết quả kiểm thử khóa màn hình trước đó tại `mobile/qa/alarm-settings-1.4.1/results.json` cũng đạt: phát foreground native, USAGE_ALARM, dừng phát và autoPlay=false hủy lịch. Cần giữ các hồi quy này khi sửa bảo mật.

Hướng sửa Windows: chỉ lưu sau tương tác volume thực sự, đọc settings mới nhất trước khi thay volume; không lưu toàn object bị giữ từ bootstrap, không để input tổng hợp của refresh gây persist. Android có transform tương ứng trong quy trình build; không mặc định Windows đã nhận bản sửa.

## 6. Phòng thu

Android 1.4.0: đã cấp RECORD_AUDIO nhưng `VoiceRecorder.start()` trả NotAllowedError / Permission denied. Bản này thiếu MODIFY_AUDIO_SETTINGS; Capacitor BridgeWebChromeClient yêu cầu cả hai quyền trong luồng micro. Candidate đã thêm quyền này vào `mobile/android/app/src/main/AndroidManifest.xml:58`.

Android 1.4.1: audit mới khởi động được và tạo blob 4.771 byte sau 500 ms. Đây không phải đánh giá chất lượng âm thanh micro thật. Đợt trước đã có thu/ghép hai đoạn và meter cập nhật; xem báo cáo bàn giao Android cũ để phân biệt APK trước/sau sửa settings.

Windows: micro giả lập khởi động và tạo 22.597 byte. Meter 0 tick nhưng control requestAnimationFrame chỉ 2 tick trong cửa sổ ẩn; **không đủ để kết luận runtime meter hỏng**. Trong nguồn có thứ tự gọi `updateMeter()` trước khi đặt isRecording=true khoảng HTML `:5665`, `:5717`; cần kiểm thử cửa sổ hiển thị/micro thật để xác nhận. Không xếp finding meter đã xác nhận trong bảng lỗi nghiêm trọng.

## 7. Hiệu năng, ổn định, UI/UX — phần chưa kết luận

Lịch sử chi tiết nằm ở `BAN_GIAO_KIEM_THU_ANDROID_2026-10-12.md`. Báo cáo này đọc và kế thừa kết quả cũ, không tuyên bố đã chạy lại toàn bộ:

- Vùng chạm danh mục/label chọn lịch 48px, kiểm tra small/large/landscape/font scale 1.3 đã có kết quả đạt trong một lượt 1.4.1 trước sửa settings. Web UI từng kiểm tra 360×640, 412×915, 820×1180. Không thay thế kiểm thử máy tính bảng Android vật lý.
- Soak SwiftShader khoảng 303.9 giây/15 vòng ghi nhận không JS error/fatal crash/ANR ở lượt đó. PSS tiến trình chính 121.663→130.026 KB, max 132.337 KB; chưa bao gồm renderer. Heap khoảng 7,51→7,93 MB; không đủ chứng minh không rò rỉ dài hạn.
- SwiftShader có 78,78% janky frames/1.706 frames, p50 69 ms, p95 500 ms, p99 950 ms. Những số này không phải hiệu năng điện thoại thật và không được mô tả là mượt.
- Lượt GPU host trên APK cuối có ANR “Application does not have a focused window”; Gboard cũng có ANR. Trace main/render idle không đủ chứng minh nguyên nhân do GPU/giả lập. Chưa xác nhận lỗi ổn định đó đã sửa.
- Bằng chứng: `mobile/qa/performance-1.4.1-host/results.json`, `lastanr.txt`, `anr-main.txt`, `failure.png`; lượt cold profiles `mobile/qa/performance-1.4.1-host-cold-profiles/results.json` còn timeout điều hướng.
- Chưa có full soak/native touch trên APK cuối được kết luận đạt; chưa đo tổng bộ nhớ/CPU gồm WebView renderer; chưa đánh giá pin, mất mạng dài hạn, thiết bị thật hoặc tablet thật. Windows chưa có full soak hay cài Setup trên máy sạch.

## 8. Những yêu cầu và thay đổi trước đây phải giữ nguyên

Đây là tóm tắt lịch sử từ `NHAT_KY_CAP_NHAT.md` và báo cáo bàn giao Android cũ, không phải việc mới làm trong audit:

1. Android được phép quyết định bố cục UI/UX, gọi “Thu & ghép âm” thành “Phòng thu”, không đặt Phòng thu trùng trong Nhạc. Yêu cầu bố cục ban đầu chỉ áp dụng Android.
2. Tài khoản áp dụng cho cả bản chính thức và thử nghiệm. Cập nhật cần đồng thời các gói đã được người dùng chỉ định khi có quyền thực hiện.
3. Giữ phát link âm thanh trực tiếp và YouTube ở Nhạc tùy chọn; không lưu/thêm bài từ link vào thư viện.
4. Sáu thư mục nhạc dùng đúng nhóm tên thư mục, giữ nhạc có sẵn. Mỗi bài giữ một bản. Chỉ Phòng thu được thêm âm thanh, các phần khác bỏ tính năng thêm âm thanh.
5. 102 tệp đầu vào: 7 tệp lỗi được người dùng cho bỏ qua, 2 bản sao cùng SHA-256 chỉ giữ một bản; còn 93 bài mới + 2 bài cũ = 95 bài. Nhóm mới: Quân đội 12, Biển đảo 10, Cách mạng 19, sinh viên 14, thanh niên 19, Trữ tình 19. Không xóa nguồn người dùng.
6. Thư viện đóng gói sẵn, không cần tải 93 bài từ máy chủ khi mở. Danh mục tháng 1–10 chưa có danh sách phân bổ người dùng cung cấp, không tự phân bổ.
7. Các kiểm thử thư viện/web/Electron/APK và đối chiếu tài nguyên đã có bằng chứng đạt trong nhật ký. Điều đó không phủ định các lỗi mới nêu ở báo cáo này.
8. Candidate Android 1.4.1 đã sửa vùng chạm, micro/meter, khôi phục phiên native mã hóa, bootstrap form inert tránh race, lưu volume. Các bản sửa đó chưa giải quyết XSS và chưa hoàn tất QA hiệu năng cuối.

## 9. Danh tính gói và hash

| Gói | SHA-256 |
|---|---|
| Windows portable `dist-1.4.0/GDQPAN 1.4.0.exe` | D6ED099C7A7B228148B8C1B779766183356FD18895CB375FD3C1F231994D434B |
| Windows Setup `dist-1.4.0/GDQPAN Setup 1.4.0.exe` | 4FB59AEB24C683DFD420E1B016046A74ED2BE16696A4AF413EB69277E6822B14 |
| Android official `mobile/GDQPAN-1.4.0.apk` | 502E11198F6A8A8BCA004B4129344BBB86CED1F4C189B23EE5880AD9589DC6D9 |
| Android test `mobile/GDQPAN-1.4.0-test.apk` | B0C7BEA99801D505BDE4F21C2E3531718462221AC6C1CC6FF8528940009F987C |
| Android candidate `mobile/GDQPAN-1.4.1.apk` | 6A88D078A4D960CB763DB707952DC0AF6D2F3AAEF0C4EA8BF35F1A5122BF8AB1 |
| Android candidate test `mobile/GDQPAN-1.4.1-test.apk` | FFBBE9A67BB849D813035AE68318F5A8FCAEF3261C2E4ECBA565C6051BB481B7 |
| Windows app.asar thực sự được audit | 5EA006263DBD92D740582587F7FC495AFEC1967568D7CE57E80195ED67903A37 |

Hash hai APK official 1.4.0/1.4.1 và app.asar được tính lại trong đợt này. Các hash Setup/portable/test kế thừa `SHA256-1.4.0.txt` / `mobile/SHA256-1.4.1.txt`, chưa tính lại trong đợt audit này. Không chạy runtime audit mới trên APK `-test`; không được coi hai nhãn chính thức/thử nghiệm là cùng file.

Android applicationId `vn.gdqpan.app.mobile`; 1.4.0 versionCode 7, candidate 1.4.1 versionCode 8. APK hiện có dùng quy trình ký debug; chứng chỉ SHA-256 đã kiểm tra ở đợt trước: `48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452`. Không tự đổi key/appId hoặc uninstall để tránh mất khả năng cập nhật/dữ liệu.

## 10. Quy trình tiếp nối cho agent khác

### Quyền và thứ tự

1. Đọc báo cáo này, `NHAT_KY_CAP_NHAT.md`, `BAN_GIAO_KIEM_THU_ANDROID_2026-10-12.md` và hướng dẫn AGENTS nếu có. Xin người dùng quyền sửa theo phạm vi mới nhất; hiện chỉ có quyền báo cáo.
2. Khi được phép, ưu tiên XSS và đặc quyền renderer Windows; kế tiếp settings Windows / hồi quy alarm Android; sau đó điều tra ANR và hoàn tất UI/hiệu năng tablet. Các quyết định sản phẩm chưa rõ phải hỏi người dùng.
3. Sửa ở nguồn/build transform thích hợp, không sửa trực tiếp app.asar/APK. Giữ các chính sách nhạc/Phòng thu/link/tài khoản đã chốt.
4. Kiểm thử payload vô hại qua admin QA: tên hiển thị thành văn bản, không chạy handler, Node không lộ trong renderer; xác nhận lịch/phòng thu/VTV/IPC còn hoạt động. Rà soát các sink khác, không chỉ chặn đúng payload fixture.
5. Kiểm thử settings với cả refresh tổng hợp và volume chạm thật; giọng/tốc độ/lặp/chuông không bị ghi đè; Android count đúng và phát được khi khóa màn hình, stop/off hủy đúng.
6. Thu/ghép/meter native, từ chối/cấp lại quyền, chọn tệp Phòng thu, UI điện thoại/tablet; chạy soak/cold start native có logcat/gfxinfo/memory cả renderer; xác định ANR thay vì quy cho môi trường khi chưa có bằng chứng.
7. Nếu được phép đóng gói, kiểm tra cả gói chính thức/thử nghiệm, ký/cài đè giữ dữ liệu, đối chiếu tài nguyên/hash. Chưa có số phiên bản mới được quyết định trong đợt này. Cập nhật lại một báo cáo tổng hợp và nhật ký sau khi hoàn tất.

### Lệnh tái hiện audit (PowerShell, root dự án)

```powershell
Set-Location -LiteralPath 'D:\GDQPAN\Web Báo thức'
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
.\node_modules\.bin\electron.cmd scripts/audit-windows-release.cjs

# Chỉ trên AVD GDQPAN_QA; xác nhận adb emu avd name trước khi thay APK.
$env:GDQ_QA_VERSION='1.4.1'
node mobile/tests/android-release-audit.js

# Bộ hồi quy riêng; cần đúng APK/version đã cài.
node mobile/tests/android-alarm-settings.test.js
```

ADB: `D:\GDQPAN\android-build-tools\android-sdk\platform-tools\adb.exe`. Script khởi động AVD: `mobile/start-emulator.ps1 -Gpu swiftshader`. Hai bản APK dùng thử đường dẫn ASCII trong `D:\GDQPAN\android-build-tools\review-1.4.0.apk` và `review-1.4.1.apk` là bản copy phục vụ ADB, không phải phát hành mới.

Audit Windows dùng hồ sơ tạm được ghi ở `qa/windows-release-audit-temp.json`, hiện là `C:\Users\ADMIN\AppData\Local\Temp\gdqpan-release-audit-KSXc0Q`. Chưa dọn hồ sơ này; chỉ chứa dữ liệu QA. Nếu dọn, phải xác minh đường dẫn tuyệt đối nằm trong Temp với prefix đã biết và Electron đã thoát; không xóa dữ liệu người dùng. Android audit xóa database tạm sau mỗi lượt nhưng có thể còn các ADB forward phục vụ CDP; kiểm tra trước khi tái sử dụng cổng 9223.

## 11. Trạng thái bàn giao

Đợt **kiểm tra và báo cáo** hoàn tất với các giới hạn đã ghi. Đợt **sửa lỗi, QA cuối và phát hành lại** chưa thực hiện và không nằm trong quyền mới nhất. Không có cơ sở tuyên bố Windows/Android đã sạch lỗi nghiêm trọng hoặc candidate 1.4.1 đã đủ điều kiện phát hành.
