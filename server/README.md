# GDQPAN — tài khoản Gmail, admin duyệt và quản trị

Cập nhật 15/10/2026: đăng ký mới chỉ nhận @gmail.com; cần xác minh email và admin duyệt. Migration giữ quyền tài khoản cũ. Trang quản trị có Duyệt/Từ chối và audit. Render Free demo chưa bật email: đăng ký/khôi phục bị chặn rõ ràng; không giả lập email trong production.

## Chạy xem thử trên máy này

Yêu cầu Node.js 24 trở lên. Trong thư mục `server`:

```powershell
npm ci
Copy-Item .env.example .env
npm run admin
npm start
```

Chỉ sao chép `.env.example` khi chưa có `.env`; không ghi đè cấu hình đã dùng. Từ ngày 11/10/2026, `npm run admin` tự sinh mật khẩu ngẫu nhiên 32 ký tự và hiện trong cửa sổ lệnh, không cần nhập mật khẩu. Sao chép mật khẩu để đăng nhập; không gửi mật khẩu hoặc ảnh cửa sổ này vào cuộc trò chuyện. Admin đầu tiên là `chinm.t2.2225@gmail.com`, được tạo và xác minh bởi người vận hành máy chủ; đăng ký thông thường không thể tự lấy quyền admin.

Mỗi lần chạy lại `npm run admin` sẽ thay mật khẩu admin và vô hiệu hóa phiên đăng nhập/liên kết đặt lại mật khẩu cũ của admin. Tài khoản user và dữ liệu chung được giữ nguyên. Không chạy lệnh này mỗi lần mở server; dùng `npm start` để mở server. Nếu email cấu hình đã thuộc tài khoản user, lệnh báo lỗi và không tự nâng quyền.

Trang tài khoản/quản trị: http://127.0.0.1:4180/. Web mobile xem thử: http://127.0.0.1:4173/ (chạy `node preview.js` trong `mobile` nếu chưa mở). Nhập địa chỉ máy chủ vào màn hình tài khoản của app, rồi đăng nhập. Máy chủ kiểm thử chỉ nghe trên máy hiện tại, không truy cập được từ điện thoại thật qua Wi-Fi. Emulator dùng `http://10.0.2.2:4180`.

Ở chế độ local, email xác minh/đặt lại mật khẩu được ghi vào `server/data/mailbox.ndjson`, không gửi ra ngoài. Mở liên kết trong bản ghi tương ứng để thử xác minh. Tệp này chứa liên kết riêng tư, không chia sẻ hoặc đóng gói cùng mã nguồn.

## Cách sử dụng

- Người dùng mới đăng ký Gmail/mật khẩu phần mềm, xác minh rồi chờ admin duyệt trên trang quản trị. Admin chỉ duyệt được tài khoản đã xác minh; user không thể tự duyệt. Tài khoản cũ được giữ trạng thái approved khi migration. Admin vẫn có thể khóa hoặc đặt thời hạn.
- Admin chỉnh lịch, nội dung, cài đặt và âm thanh trên mobile/desktop, rồi chọn **Công bố dữ liệu chung**. Trang web quản trị cũng có form sửa lịch/nội dung/cài đặt, tải âm thanh, quản lý tài khoản/thiết bị, xem nhật ký và gửi thông báo cập nhật.
- Trước khi thay dữ liệu trên thiết bị, app lưu bản sao dữ liệu cũ. Admin có thể chọn **Khôi phục dữ liệu trước đăng nhập**, kiểm tra bản chỉnh sửa rồi công bố. Không tự đưa dữ liệu cũ lên máy chủ.
- Tệp thu âm/ghép có thể gán cho hiệu lệnh hoặc lịch để công bố cùng lịch; Trang quản trị có thể quản lý tệp chung; mục tải “Âm thanh phòng thu” chèn thêm trong ứng dụng đã bị bỏ ngày 14/10.
- User không được công bố, thêm lịch hoặc tải âm thanh. Quyền được kiểm tra ở máy chủ, ngoài việc ẩn/khóa điều khiển trên giao diện.
- App đồng bộ khi mở lại hoặc chọn **Đồng bộ**. Lịch đã nhận vẫn phát sau khi admin đổi lịch, nếu tài khoản còn hợp lệ. Lịch mới chưa công bố không được máy chủ cho phép phát tự động.
- Mỗi lần đến giờ, Android kiểm tra máy chủ trước khi phát. Khóa/hết hạn tài khoản hoặc mất kết nối sẽ bỏ qua. Khi đã bắt đầu một lịch hợp lệ, không kiểm tra liên tục để dừng giữa chừng. Màn hình báo thức có **Dừng báo thức**.
- Giới hạn kho âm thanh chung: 3 GB; mỗi lần tải tối đa 100 MB. Các tệp âm thanh gán lịch được tải và lưu trên thiết bị; thư viện phòng thu tải khi phát. Cần đủ dung lượng trống trên thiết bị.

## Triển khai thật sau khi thống nhất chi phí

`compose.yml` và `Dockerfile` đã chuẩn bị cho máy chủ Linux với HTTPS qua Caddy. Người vận hành cần chọn VPS/tên miền, cấu hình DNS, SMTP và sao lưu. Đặt `LOCAL_MODE=0`, `PUBLIC_URL=https://...`, nguồn web được phép trong `ALLOWED_ORIGINS`, `SMTP_URL` và `MAIL_FROM`. Không đưa mật khẩu SMTP, `.env`, dữ liệu SQLite hoặc khóa ký vào Git/gói mã nguồn. Email tự động thật cần nhà cung cấp SMTP và xác minh tên miền gửi email; chưa được kiểm thử với dịch vụ thật.

Sao lưu toàn bộ thư mục dữ liệu gồm SQLite và `files`; dùng SQLite backup hoặc dừng máy chủ khi sao chép để bảo đảm nhất quán. Thử phục hồi bản sao trước khi đưa vào sử dụng. Nhật ký và các phiên bản lịch được giữ để hỗ trợ lịch cũ; hiện chưa có tác vụ dọn kho/tệp/phiên bản tự động.

Ngân sách dự trù nằm trong `NGAN_SACH_DU_TRU_GDQPAN.md`. Chưa kiểm thử tải đồng thời 100 thiết bị, kho 3 GB hoặc vận hành VPS. Không dùng bản kiểm thử làm hệ thống chính trước khi kiểm tra SMTP, sao lưu, thiết bị thật và quyền báo thức của từng máy.

## Kiểm thử

```powershell
npm test
node tests/native-account.mjs
```

Lệnh thứ hai chỉ dành cho emulator QA `emulator-5554`, cần công cụ Android tại `D:/GDQPAN/android-build-tools` và APK đã build; không chạy trên điện thoại người dùng. Tài khoản `example.test` trong kiểm thử nằm trong cơ sở dữ liệu tạm, không phải tài khoản sử dụng thật.

Mã nguồn desktop dùng Electron; mã nguồn Android và cách build nằm trong `mobile`. Chưa tạo bản macOS trong môi trường Windows này.

Bản Windows portable: `../dist-account-final/GDQPAN-accounts-test.exe`. Bản này chưa ký bằng chứng thư phát hành Windows. Bộ đóng gói không kèm video MP4/MOV nguồn không được tham chiếu trong ứng dụng. Các tệp nguồn trên máy vẫn được giữ nguyên.

## Render Free demo

Chỉ dùng trình bày, dữ liệu SQLite/files có thể mất khi restart/redeploy, service ngủ sau 15 phút. Gói Free không có shell/persistent disk và chặn SMTP 25/465/587. Không đặt LOCAL_MODE=1 trên máy chủ ngoài.

Chọn Node, root directory server, build `npm ci --omit=dev`, start `npm run start:hosting`; cấu hình NODE_VERSION=24.15.0, LOCAL_MODE=0, HOST=0.0.0.0, DATA_DIR=./data, ALLOWED_ORIGINS=https://localhost. PUBLIC_URL tự lấy RENDER_EXTERNAL_URL nếu chưa đặt. ADMIN_EMAIL là email admin; ADMIN_BOOTSTRAP_PASSWORD là secret 12–128 ký tự do người vận hành nhập trong Render, tuyệt đối không commit hoặc gửi chat. Startup chỉ tạo admin nếu chưa có admin, không thay mật khẩu khi đã có. Khi dữ liệu demo mất, startup tạo lại admin từ secret, không phục hồi dữ liệu cũ.

Không có SMTP_URL/MAIL_FROM thì health trả emailEnabled=false, web quản trị báo chưa có email và API trả 503 cho đăng ký/khôi phục. Muốn gửi email trên Free cần nhà cung cấp HTTPS API hoặc môi trường hỗ trợ SMTP; chưa cấu hình trong đợt demo này.
