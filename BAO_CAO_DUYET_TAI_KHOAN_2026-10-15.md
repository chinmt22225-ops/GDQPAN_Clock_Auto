# Gmail, duyệt tài khoản và máy chủ ngoài — 15/10/2026

## Yêu cầu đã xác nhận

Đăng ký mới bằng địa chỉ @gmail.com và mật khẩu của phần mềm, xác minh qua email, sau đó admin duyệt mới được sử dụng. Tài khoản cũ giữ quyền truy cập. Cập nhật Windows/Android và trang quản trị, mục tiêu đưa backend lên máy chủ ngoài để không cần chạy local.

Người dùng chọn DigitalOcean 2GiB + backup tuần làm phương án chính thức về sau, hiện chấp nhận Render Free dùng tạm để trình bày, gồm giới hạn ngủ/mất dữ liệu. Tên mong muốn là hethongtruyenthongso.vn, chưa xác nhận sở hữu/DNS, chưa đăng ký. Ban đầu chọn Gmail SMTP; sau khi xác minh Render Free chặn SMTP 25/465/587, người dùng chọn chỉ triển khai demo, đăng ký thật chưa dùng được do chưa cấu hình email. Người dùng xác nhận đóng gói demo Windows1.4.4 / Android1.4.5, không phát hành chính thức.

## Hiện trạng trước sửa

- Register chấp nhận mọi domain email; sau verify có thể login ngay, không cần admin duyệt.
- SQL users chỉ có verified/status/expires; chưa có trạng thái duyệt.
- Trang admin chỉ khóa/mở/hết hạn; chưa có nút duyệt/từ chối.
- Windows/Android dùng chung account adapter, thông báo cũ không nói chờ duyệt.
- Backend chỉ cấu hình local; Docker/Caddy đã có mẫu nhưng chưa có server ngoài hay SMTP thật.

## Kế hoạch được triển khai trong mã nguồn

1. Migration thêm trạng thái duyệt, tài khoản cũ mặc định approved; đăng ký mới ghi pending tường minh.
2. Chỉ nhận Gmail ở register, gate server kiểm tra verified + approved độc lập với giao diện; reset/verify không tự duyệt.
3. Admin duyệt/từ chối trên web, audit và chặn thao tác từ user.
4. Thông báo đăng ký/đăng nhập Windows/Android hướng dẫn xác minh/chờ duyệt, giữ login cho tài khoản cũ không phải Gmail.
5. Kiểm thử migration/flow/quyền/SQL/hồi quy; chuẩn bị cấu hình triển khai, không giả lập là đã có URL ngoài.

## Kết quả triển khai thật

- API và trang quản trị: **https://hethongtruyenthongso-demo.onrender.com/**. Không cần chạy máy chủ local trên máy Windows để kết nối bản demo này.
- Render service `srv-db7skj8473hc73fqsqn0`, deploy `dep-db7skjg473hc73fqsrs0`, trạng thái Live; Node24.15.0, Singapore, Free $0/month. Build39.8s được ghi trên Dashboard. Người dùng tự đặt ADMIN_BOOTSTRAP_PASSWORD và tự gửi form Deploy; agent không đọc/ghi mật khẩu đó.
- Người dùng đăng nhập trong tab quản trị riêng; agent đã thấy `chinm.t2.2225@gmail.com · Admin`, “Đã kết nối máy chủ”, khối admin và 0 tài khoản chờ duyệt. Không đọc token/mật khẩu và không sửa dữ liệu thật trong phiên này.
- Repo được người dùng xác nhận rõ: `chinmt22225-ops/GDQPAN_Clock_Auto`, nhánh mới `deploy/account-demo-20261015`, commit `218bd080ba7cda9c3b522eb094e68fe1cf4d38b0`. Chỉ17 tệp backend/source/config mẫu/test được tải lên; không .env thật, database, âm thanh, bộ cài hoặc frontend phần mềm. Không thay nhánh main. Staging độc lập `D:/GDQPAN/deploy-account-demo-20261015` giữ để tái lập.
- Auto-review lần đầu chặn push vì thiếu xác nhận cụ thể đích nhận; sau câu trả lời cho phép đúng repo/nhánh, push thành công. Không vượt chặn bằng đường khác.
- Không mua hosting/tên miền, không cấu hình hethongtruyenthongso.vn, không bật SMTP hay gửi email thật. Địa chỉ dùng tạm là onrender.com theo lựa chọn người dùng.

## Các thay đổi đã làm

- SQL migration transaction thêm approval/reviewed_by/reviewed_at. Tài khoản cũ mặc định approved, giữ verified/status/expires; register mới ghi pending tường minh. Migration chạy lại không biến pending thành approved.
- Register mới chỉ nhận @gmail.com; không áp đặt domain Gmail cho login tài khoản cũ. Địa chỉ được chuẩn hóa lowercase/trim nhưng không tự gộp alias Gmail dấu chấm/+.
- validUser chặn mọi API sử dụng nếu user chưa approved; verify/reset không cấp quyền duyệt; PATCH user chỉ admin thực hiện, không đổi role. Duyệt cần email đã verified. Từ chối thu hồi phiên, ghi audit người duyệt/thời gian. Admin bootstrap được tạo theo thao tác người vận hành, không dùng self-register.
- Trang quản trị web riêng có cột chờ/đã duyệt/từ chối và nút Duyệt/Từ chối, vô hiệu Duyệt khi email chưa xác minh. Không đưa danh sách tài khoản hoặc các nút duyệt vào Windows/Android. Người dùng đã hỏi về giao diện web khác phần mềm; đã giải thích đây là trang admin riêng, giữ bố cục web đơn giản có sẵn và thêm chức năng duyệt, không thiết kế lại dashboard trong đợt này.
- Health công khai trả emailEnabled=false ở demo. API register/forgot/resend trả503 rõ ràng khi chưa có email, không tạo user/link mồ côi; web admin vô hiệu nút tương ứng. Không đặt LOCAL_MODE=1 để mô phỏng email trên server ngoài.
- Windows/Android account adapter hướng dẫn Gmail + mật khẩu riêng của phần mềm, chờ admin duyệt; có thông báo demo chưa email. Banner điện thoại2 dòng/tablet1 dòng và bố cục chính đã duyệt được đóng gói vào demo.
- assets/server-config.js chỉ có URL công khai và cờ demo, không secret. Demo thay địa chỉ local cũ bằng URL Render, xóa token local cũ; native restore cũng áp dụng chuyển đổi. Khi người dùng đổi server, client hủy epoch/phiên cũ. Health không gửi Bearer token. Không tự thay server HTTPS khác mà người dùng đã cấu hình.
- Health/login/session ở đúng server demo có timeout90s và thông báo chờ khởi động; lệnh authorize/lịch vẫn giữ timeout cũ, không mở rộng quyền hoặc thời hạn lịch. Electron thông báo lỗi server ngoài không yêu cầu mở file .bat local.
- start:hosting tạo admin lần đầu từ secret do người vận hành nhập; không thay mật khẩu khi admin đã tồn tại. Nếu dữ liệu demo mất, tạo lại admin từ secret, không phục hồi dữ liệu người dùng. Có test bảo vệ không nâng user thành admin.

Các tệp chính: server/src/server.js, server/src/start.js, server/public/index.html/app.js, server/package.json/Dockerfile/README.md, assets/account.js/server-config.js, main.js, HTML desktop, mobile/build-web.js/build-android.ps1/Gradle/package+lock, generated www/native assets; scripts set-server-url và verifier/runtime được cập nhật.

## Kiểm thử và bằng chứng

- Workspace backend:8/8 test đạt, gồm migration/Gmail/approval/rejection/reset, SQL integrity/foreign keys, seed admin, concurrency, UI thật Duyệt/Từ chối và Windows/Android sync/quyền. UI source review sau client đổi server/timeout đạt, errors=[]; `qa/ui-review-after.json`, `server/qa/ui-results.json`, screenshot admin UI trong server/qa.
- Gói backend staging độc lập:7/7 test cuối đạt, npm ci omit-dev audit0. Lượt đầu có một test-file admin-cli thất bại không có stack chi tiết; chạy riêng đạt và chạy lại cả suite đạt. Chưa xác định nguyên nhân lượt đầu, không khẳng định đã sửa một lỗi production từ hiện tượng đó.
- Server ngoài:6 kiểm tra HTTPS/root, session401 khi chưa login, origin lạ403, Android origin https://localhost được phép, đăng ký503 vì chưa email. `qa/render-demo-smoke-2026-10-15.json`.
- Windows app.asar demo:18/18 runtime check gồm URL Render mặc định, sandbox/isolation/IPC, settings merge, VTV pause/resume, thư viện95 bài và decode, marker XSS. `qa/windows-packaged-runtime-1.4.4.json`. Harness bỏ bootstrap/tray/TTS và dùng profile/DB QA tạm; log IPC từ chối là kiểm tra âm tính mong đợi.
- Windows và APK:93 bài mới đối chiếu size/SHA256, UI/account/banner/server-config đúng source; `qa/windows-packaged-verification-1.4.4.json`, `qa/android-packaged-verification-1.4.5-demo.json`.
- APK cài đè emulator GDQPAN_QA bằng install-r, code12/versionName1.4.5-demo/appId giữ nguyên; tệp đánh dấu files/qa-demo-upgrade-145 vẫn tồn tại. Native audit: URL Render mặc định đúng, khối tài khoản trong Cài đặt, recorder5676 bytes, shared settings/1 native alarm đúng, XSS markers không thực thi, findings/errors=[]; `mobile/qa/release-audit-1.4.5-demo/results.json`.
- Native alarm regression:10/10, âm lượng không reset autoplay/voice, báo thức khóa màn hình phát USAGE_ALARM, Stop tắt, off xóa alarm, không lỗi JS; `mobile/qa/alarm-settings-1.4.5-demo/results.json`. Các test authenticated runtime dùng backend/tài khoản QA local, không dùng mật khẩu admin server thật. Server thật được kiểm tra public/API và phiên web admin do người dùng tự login.
- APK chữ ký kiểm tra đạt, SHA256 certificate `48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452` trùng khóa cũ. Pipeline assembleDebug; không phải Play Store release. Windows EXE NotSigned, không có Authenticode.
- Giả lập do phiên này khởi động đã dừng, không xóa dữ liệu. Hạn mức tài khoản đọc trong phiên còn66% ở cửa sổ5h, chưa chạm mốc dừng5% người dùng đặt.

## Bộ cài demo cuối

| Gói | Bytes | SHA256 |
| --- | ---: | --- |
| version_windows/demo-1.4.4/GDQPAN Setup 1.4.4.exe | 631340870 | 58843921F4A88BCDB0B831046889AD4B6C49A3DBBC7943F876D2C0EDA2335853 |
| version_windows/demo-1.4.4/GDQPAN 1.4.4.exe | 630915874 | 5CD1DB4C43D35B08B0D92494C2493893AA193CB15479417873DB644758B51B8A |
| mobile/GDQPAN-1.4.5-demo.apk | 535215020 | 6C0E7C74771DC3AC89C439486CF40B4AF5434E8A48BD7C9728084583B60BF26F |

Manifest `SHA256-DEMO-2026-10-15.txt`, machine-readable `qa/demo-artifacts-2026-10-15.json`, tổng kết `qa/account-demo-summary-2026-10-15.json`. Gói official cũ giữ nguyên, không công bố release chính thức hoặc upload EXE/APK lên server demo.

## Cách dùng và giới hạn thực tế

Cài bản demo mới hoặc chạy Portable; máy chủ gợi ý https://hethongtruyenthongso-demo.onrender.com. Đăng nhập admin chinm.t2.2225@gmail.com bằng mật khẩu người dùng đã tự nhập trên Render, không có mật khẩu trong báo cáo. Quản lý/duyệt user tại trang web riêng cùng URL. Dữ liệu demo ban đầu mới, không sao chép DB/tệp private từ máy local; policy giữ tài khoản cũ đã được kiểm thử trên migration nhưng chưa chuyển tài khoản/dữ liệu local thật lên Render.

**Đăng ký người dùng thật hiện chưa hoạt động**, đúng lựa chọn demo chưa email. Để bật cần cấu hình gửi thư thật trên môi trường phù hợp, kiểm thử SMTP/API email và xác minh/duyệt ngoài môi trường QA. Render Free chặn SMTP25/465/587; Gmail SMTP không dùng được trên gói này.

Render Free ngủ khi không có hoạt động, cold start có thể hơn50 giây; timeout90s không bảo đảm mọi cold start thành công. SQLite/tệp có thể mất khi restart/redeploy, admin được seed lại từ secret; không có backup bền vững. Không dùng demo làm hệ thống báo thức vận hành thật. Nguồn: [Render Free](https://render.com/docs/free). Không đo lại FPS/soak hoặc kiểm thử tải thật trong đợt này; chưa test máy Windows sạch, điện thoại/tablet thật, Gmail email thật hoặc DNS .vn.

Về sau: DigitalOcean Singapore2GiB50GiB12USD/tháng + backup tuần20% =14.40USD/tháng, chưa thuế/tên miền; dịch vụ chưa mua. [Giá VPS](https://www.digitalocean.com/pricing/droplets), [backup](https://www.digitalocean.com/pricing/backups). Cần đăng ký/sở hữu và cấu hình DNS hethongtruyenthongso.vn, triển khai storage/backup và email, chuyển dữ liệu có kiểm soát trước vận hành chính thức.
