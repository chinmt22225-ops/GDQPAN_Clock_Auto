# Đơn giản hóa màn hình Tài khoản — 15/10/2026

## Kết quả

Đã cập nhật mã nguồn Windows, Android hiện hành và mobile-prototype. Có ô nhập lại mật khẩu theo xác nhận mới nhất. Chỉ mã nguồn và bản xem thử; không tăng phiên bản, không tạo hoặc ghi đè EXE/APK.

Render Dashboard đã xác nhận backend commit 3150ba6f936c33d99b6ec8ccc07b080c19e963a5 ở trạng thái Live, deployment dep-db8b5e7lk1mc739jc0j0, Auto-Deploy 38.2s. URL https://hethongtruyenthongso-demo.onrender.com/. Không đọc/đổi secret hoặc mật khẩu admin.

## Những gì thay đổi

- Xóa nút Trở lại ứng dụng và logic đóng overlay không điều kiện. Nội dung sau overlay inert, không nhận Tab/chạm. Chỉ kiểm tra phiên và đồng bộ thành công mới mở ứng dụng.
- Hai form Đăng nhập/Đăng ký, giữ account-form/email/password. Thêm account-password-confirm chỉ khi đăng ký, không gửi giá trị xác nhận lên server.
- Sau đăng ký hiện Chờ xác minh/duyệt với hướng dẫn Gmail rồi chờ admin; có Gửi lại xác minh và Về đăng nhập, không vào trang chủ.
- Quên mật khẩu? luôn hiện trên form login, gọi /auth/forgot chỉ với email. Resend mặc định ẩn, chỉ hiện khi login trả EMAIL_UNVERIFIED/thông báo chính xác, hoặc trên trạng thái chờ; không đoán từ lỗi 403 chung.
- account-server đổi thành input hidden, giữ ID, cấu hình assets/server-config.js và cách đọc cấu hình cũ.
- Đăng xuất trong Cài đặt, có xác nhận. Khóa ứng dụng, xóa local token, yêu cầu xóa native session, dừng phát, yêu cầu thu hồi server session. Khi offline báo rõ server chưa xác nhận thu hồi; không tuyên bố thu hồi từ xa thành công khi không kết nối.
- authBusy chặn yêu cầu lặp giữa các hành động form; loading đúng “Đang kết nối máy chủ, vui lòng chờ…”, Enter hoạt động. syncEpoch chặn phản hồi đăng nhập cũ khôi phục phiên sau khi phiên thay đổi; phản hồi logout cũ không ghi đè thông báo lần đăng nhập sau.
- Form tối đa 460px, nút/trường tối thiểu 48px, cuộn trên màn hình thấp. Style giới hạn trong tài khoản.

## Tệp và hàm liên quan

| Tệp | Nội dung |
| --- | --- |
| assets/account.js | api giữ status/code qua ba loại kết nối; init, showMode, authRun, handlers form/logout; mountSettings/parkSettings cho prototype; lockHome |
| assets/account.css | Style form, nút/link, hidden/focus/responsive |
| assets/account-prototype.js | Mới: cầu nối Store với StorageManager của adapter; gắn vào Cài đặt, cập nhật dữ liệu sau sync |
| mobile-prototype.html | Nạp tài khoản; chặn phát lịch/xếp thông báo khi bị khóa; không đổi banner/layout |
| mobile/www/assets/account.js, account.css | Sinh lại qua mobile/build-web.js, giữ gate.restore trước khi gửi form |
| server/src/server.js | fail/validUser/reply bổ sung mã lỗi phân biệt trạng thái |
| server/tests/approval.test.js | Kiểm thử trạng thái và không cấp phiên khi bị chặn |
| server/tests/ui.test.js | Gán server input ẩn trong fixture thay vì gõ |
| scripts/review-account-flow.cjs | Kiểm thử luồng trên bốn giao diện, DB/mailbox QA tạm |
| scripts/review-ui.cjs, mobile/tests/android-release-audit.js | Thay bấm nút bị xóa bằng kiểm tra phiên qua refresh |
| qa/account-simplified-2026-10-15/ | results.json, 16 ảnh thật, trang xem thử |

Bộ tạo web Android cũng tái tạo index/catalog theo quy trình sẵn có. Chưa capacitor sync hoặc build APK. Giữ endpoint, schema SQL, tài khoản cũ, token/session và mã Java lưu phiên mã hóa. Giữ các ID account-server/register/forgot/resend/logout/form. Prototype trước đây thiếu StorageManager, cần cầu nối riêng; APK không dùng cầu nối này.

## Kiểm thử

- Backend workspace **9/9 đạt** gồm admin UI, đồng bộ hai client và kiểm tra quyền. Staging trước push **8/8 đạt**, không chứa bài UI phụ thuộc frontend workspace.
- Luồng tài khoản **84/84 kiểm tra**, 21 mỗi Windows 1366×900, Android web 390×844, tablet 1024×768, prototype 390×844; errors=[] cả bốn. Gồm nhập lại sai, đăng ký/chờ/resend, sai mật khẩu, chưa xác minh, chờ duyệt, forgot, loading, chặn gửi lặp, Enter, login thành công, khôi phục phiên, logout/hủy logout, offline, viewport 320×360. Bằng chứng qa/account-simplified-2026-10-15/results.json.
- review-ui.cjs phase account-settings: hai giao diện đạt, JS errors rỗng, recorder có dữ liệu, chống XSS, quyền reader/admin, Settings mount/park, không tràn; shared đến muộn sau logout bị hủy và token vẫn rỗng. qa/ui-review-account-settings.json.
- Electron thật chạy nguồn qua main/preload **18/18 đạt**: sandbox/IPC, login, Settings, 95 bài/giải mã âm thanh, VTV, XSS. qa/windows-source-review-after.json. Profile/server/DB QA tạm; không phải bộ cài mới hoặc máy Windows sạch.
- Cú pháp adapter và bộ tạo Android đạt. Chưa chạy lại APK/emulator/bàn phím Android thật trong đợt chỉ sửa nguồn.

Test ban đầu sai fixture: gõ vào ô ẩn, xóa phiên khi reload, dùng chung nhiều yêu cầu vượt rate limit. Đã sửa fixture (gán input hidden, xóa phiên chỉ lần đầu, server/DB riêng từng giao diện); không đổi throttle để làm test qua. Kết quả trên là lượt cuối. Không dùng mail thật hoặc đổi DB vận hành.

## Xem thử và giới hạn

Mở qa/account-simplified-2026-10-15/xem-thu-tai-khoan.html, chọn thiết bị và Đăng nhập/Đăng ký/Chờ/Cài đặt. Dùng ảnh chụp nguồn đã kiểm thử, không gửi mật khẩu hay tạo tài khoản. Trình duyệt tự động chặn file:// theo URL policy; không vượt chặn. Cung cấp liên kết tệp và ảnh để xem cục bộ; open_in_codex trả queued, không coi là đã mở thành công.

Không sửa header/banner, màu toàn ứng dụng, trang chủ, nhạc, phòng thu, Thời sự. Thay đổi lịch prototype chỉ là chốt quyền tài khoản. Trang admin ngoài giữ nguyên, không tích hợp danh sách duyệt user vào phần mềm.

Demo chưa bật email theo lựa chọn cũ: đăng ký/forgot/resend thật trả lỗi rõ, thành công chỉ kiểm thử bằng mailer QA. Render Free vẫn có cold start và dữ liệu tạm có thể mất khi redeploy/restart. Chưa chuyển DB hoặc tạo tài khoản thật để test.

Bộ cài Windows 1.4.4 / Android 1.4.5-demo cũ không tự chứa giao diện mới. Không đóng gói hoặc phát hành chính thức.

## Bổ sung: đăng xuất và chế độ chạy nền

Phần này cập nhật trạng thái cuối sau yêu cầu tiếp theo của người dùng; các số liệu 84/18 và việc chưa sửa Java ở phần trên thuộc bước giao diện tài khoản trước đó.

### Quyết định đã được người dùng xác nhận

- Đăng xuất giữ màn Đăng nhập, dừng mọi hoạt động nền; không đóng cửa sổ hoặc force-stop tiến trình hệ điều hành khi vẫn cần hiển thị màn Đăng nhập.
- Công tắc Cho phép chạy nền áp dụng Windows/Android, mặc định BẬT. TẮT: chỉ cho hoạt động khi ứng dụng đang hiển thị; chuyển ứng dụng/khóa màn hình thì dừng. BẬT: vẫn cho phép hoạt động nền khi phiên đã đăng nhập.
- Giữ phạm vi mã nguồn và xem thử, không đóng gói mới.

### Những gì đã bổ sung

- assets/runtime.js mới: quản lý trạng thái phiên/foreground và lựa chọn riêng của thiết bị, key gdqpan_background_enabled, mặc định true. Không đưa lựa chọn này vào shared settings của máy chủ. Theo dõi visibility và thông báo native/Electron; khóa mọi lệnh phát khi không được phép hoạt động.
- account.js/account.css: checkbox và mô tả trong Cài đặt, cạnh phần tài khoản; đăng xuất gọi dừng runtime trước khi chờ mạng. authorize kiểm tra runtime cả trước và sau khi gọi máy chủ; wrapper phát âm thanh không bỏ qua runtime dù đang ở luồng phát lịch đã xác thực.
- Dừng nhạc, giọng đọc, VTV, microphone/thu âm, các timeout phát đã có; dùng handleStopAll(true) để không khôi phục nhạc từ snapshot. Nếu yêu cầu mở microphone đang chờ khi đăng xuất, recorder được dừng ngay sau khi khởi tạo xong. Vẫn giữ vòng lặp giao diện cần thiết để màn Đăng nhập hoạt động.
- main.js/preload.js: IPC giới hạn gdqpan-runtime-state và thông báo foreground; không khởi động dịch vụ TTS/khay ngay ở màn đăng nhập. Khi đăng xuất dừng TTS, đóng VTV, gỡ tray. Khi TẮT nền theo dõi focus/minimize/khóa màn hình, tính cả cửa sổ VTV của cùng ứng dụng. Hàng đợi dịch vụ kiểm tra lại trạng thái sau khi khởi động bất đồng bộ.
- Android RuntimePolicy.java mới: theo dõi lifecycle các Activity, trạng thái màn hình, lưu lựa chọn và trạng thái xác thực; hủy AlarmManager, dừng AlarmPlaybackService, native TTS và VTV khi không được phép. Dừng TTS trực tiếp qua plugin public với callback nội bộ, không phụ thuộc WebView tiếp tục chạy JavaScript. Không sửa dependency trong node_modules.
- MainActivity.java cài lifecycle. GdqAccountPlugin.configure với token rỗng vô hiệu policy ngay. GdqAlarmPlugin thêm runtime và kiểm tra token của phiên khi nhận sync. AlarmStore/AlarmReceiver/AlarmPlaybackService kiểm tra policy, kể cả sau khi chờ máy chủ; khóa việc arm/cancel để giảm race khi đăng xuất. Service không tự khôi phục VTV khi đã bị dừng bởi policy.
- mobile/www/mobile-ui.js: không poll/sync khi bị chặn; giữ token tại thời điểm bắt đầu đồng bộ và kiểm tra lại trước khi gửi native, ngăn kết quả tải cũ đồng bộ cho phiên mới. Build-web sao chép runtime.js sang Android.
- Desktop HTML chỉ thêm runtime script và chốt quyền trong vòng lịch VTV. Prototype thêm script/chốt quyền, hủy thông báo legacy, không phát bù khi đã TẮT nền; cầu nối prototype nhận sự kiện runtime để đồng bộ thông báo.

### Kết quả kiểm thử cuối cho phần bổ sung

- **104/104 kiểm tra luồng**: 26 trên mỗi Windows web, Android web, tablet và prototype; errors=[] cả bốn. Gồm BẬT mặc định, chuyển tab thật khi TẮT thì chặn phát, quay lại cho phép, BẬT vẫn cho phép khi bị ẩn, đăng xuất vô hiệu runtime dù BẬT nền. results.json và các ảnh Settings trong qa/account-simplified-2026-10-15 đã được cập nhật.
- **23/23 kiểm tra Electron nguồn đạt**, thêm chính sách dịch vụ khi khóa màn hình và gỡ khay/dừng dịch vụ/VTV sau đăng xuất. Harness dùng main/preload thật nhưng mock TTS server để không khởi động/đụng cổng dịch vụ thật; kiểm tra trạng thái/đường gọi, không coi là đo tiến trình TTS thật trên máy người dùng. qa/windows-source-review-after.json.
- **Backend 9/9 đạt** và UI hồi quy hai giao diện đạt, gồm recorder, phân quyền, XSS và shared đến muộn sau logout. Một số lượt UI test cũ bị race khi bấm Refresh liên tiếp trước khi dữ liệu quản trị tải xong; fixture được sửa chờ response/network idle, không sửa trang admin hoặc backend để làm test qua.
- **Android compileDebugJavaWithJavac BUILD SUCCESSFUL**, có biên dịch RuntimePolicy và các Java đã đổi, không chạy assemble/package. Log qa/account-simplified-2026-10-15/android-runtime-compile.log. Cảnh báo SDK XML/Gradle deprecated không làm compile thất bại.
- Chưa chạy thay đổi native này trên emulator/điện thoại thật vì không tạo APK trong phạm vi hiện tại. Chưa xác nhận bằng thực nghiệm native rằng mọi báo thức/giọng đọc đều ngừng trên thiết bị thật; cần build QA và kiểm thử đăng xuất khi đang phát, khóa màn hình ở cả hai chế độ, mở lại và receiver sau reboot trước khi phát hành. Không dùng kết quả compile để khẳng định runtime Android đã đạt.

Máy chủ demo không cần đổi hoặc triển khai lại cho công tắc này. Các bộ cài cũ giữ nguyên, chỉ nguồn và ảnh xem thử được cập nhật.

## Cập nhật sau khi người dùng cho phép đóng gói

Đã đóng gói hai tệp mới vào version_Android_Windows/15102026: GDQPAN.exe (Setup Windows x64) và GDQPAN.apk. Không hiển thị số phiên bản trong giao diện; metadata nội bộ Windows1.4.5/Android1.4.6/code13 theo xác nhận người dùng. Native policy Android đã được kiểm thử trên APK mới và đạt 15/15, khắc phục giới hạn chưa chạy APK nêu ở các bước trước. Native audit không có findings/JS errors; Windows packaged runtime 23/23. Cloud âm thanh đã được đánh giá nhưng chưa triển khai vì cần tải/cache và thay đổi phát nền. Báo cáo gói, SHA256 và các giới hạn hiện tại nằm trong BAO_CAO_DONG_GOI_2026-10-15.md; các câu chưa đóng gói/chưa chạy native ở phần trước là lịch sử của bước nguồn, không phải trạng thái cuối.
