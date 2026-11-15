# Đóng gói Windows và Android — 15/10/2026

Kế thừa báo cáo đóng gói 14/10/2026 và BAO_CAO_DON_GIAN_TAI_KHOAN_2026-10-15.md. Đây là trạng thái của hai tệp bàn giao mới, không dùng bằng chứng gói cũ để kết luận gói mới.

## Yêu cầu và lựa chọn đã xác nhận

- Thư mục bàn giao: version_Android_Windows/15102026, chỉ hai tệp GDQPAN.exe và GDQPAN.apk.
- Windows là bộ cài Setup NSIS x64 cho máy chưa cài ứng dụng, không tạo Portable hoặc bản thử nghiệm trong thư mục này. Android là một APK đầy đủ.
- Không hiển thị số phiên bản trong giao diện. Mã kỹ thuật nội bộ đã được người dùng đồng ý: Windows 1.4.5, Android 1.4.6/versionCode13. Giữ appId và khóa Android trước đây.
- Âm thanh vẫn tích hợp trong ứng dụng. Không triển khai kho cloud âm thanh, không mua dịch vụ hoặc tải âm thanh lên bên thứ ba.

## Gói cuối và đối chiếu

| Nền tảng | Tệp trong thư mục 15102026 | Bytes | SHA256 |
| --- | --- | ---: | --- |
| Windows Setup x64 | GDQPAN.exe | 631361832 | 2a99cfc22815efcf64354a98aa22d29ee9b9dc07cf1fc75dbbc2a679d1ae4abd |
| Android APK | GDQPAN.apk | 535221673 | a29237cbbe41b9f4137af8ae8aeeeb4c8b6f4fda943cbfacc48453444961e41a |

Đã xác nhận thư mục đích có đúng hai tệp; SHA256 của từng bản sao bằng đúng đầu ra build đã kiểm tra. Manifest máy đọc: qa/delivery-15102026.json. Báo cáo/hash không đặt trong thư mục bàn giao để giữ đúng yêu cầu hai tệp.

Đầu ra trung gian phục vụ kiểm thử ở qa/package-15102026/windows và mobile/GDQPAN-1.4.6.apk; không phải lựa chọn tải thêm cho người dùng. Các bộ cài lịch sử không bị ghi đè hoặc xóa.

## Cloud âm thanh: đã đánh giá, chưa triển khai

Object storage như Cloudflare R2 có thể phục vụ tệp âm thanh qua HTTP. Tuy nhiên, Android hiện đọc âm báo thức từ assets/tệp cục bộ; muốn bỏ tệp khỏi APK phải thêm tải xuống, manifest/kiểm tra toàn vẹn, cache, cơ chế thiếu tệp/mất mạng và kiểm thử receiver khi ứng dụng không mở. Chỉ đổi đường dẫn sang URL không đủ để giữ hành vi báo thức hiện tại.

Chưa có kho âm thanh/tên miền/quyền quản trị cloud được cấu hình cho ứng dụng. R2 public development URL có giới hạn và không dành cho production. Render Free đang chạy tài khoản có filesystem tạm, không phù hợp làm kho tệp âm thanh bền vững ghi thêm lúc runtime. Theo điều kiện người dùng cho phép bỏ qua nếu phức tạp, đợt này giữ nhạc cục bộ.

Nguồn chính thức đã đọc: [Render Free](https://render.com/docs/free), [R2 Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 Limits](https://developers.cloudflare.com/r2/platform/limits/).

## Thay đổi nguồn cho lần đóng gói

- package.json/package-lock.json Windows và mobile/package+lock cập nhật mã kỹ thuật nội bộ; account.js gửi đúng metadata thiết bị. Không đưa mã phiên bản trở lại giao diện.
- Desktop HTML xóa badge phiên bản trong Cài đặt và dòng phiên bản cũ trong Giới thiệu. Giữ bố cục và tính năng khác.
- Android strings.xml và capacitor.config.json đổi tên hiển thị GDQPAN 1.2 thành GDQPAN; build.gradle và build-android.ps1 dùng versionCode13, versionName1.4.6. Giữ applicationId vn.gdqpan.app.mobile.
- Bộ tạo web không chèn badge phiên bản nữa. Tạo lại www và capacitor sync vào native assets.
- Verifier gói được bổ sung kiểm tra runtime.js để bảo đảm mã chính sách chạy nền có trong cả hai gói.
- Thêm mobile/tests/android-runtime-policy.test.js để kiểm tra chính sách chạy nền và đăng xuất trên APK thực tế. Không sửa runtime ứng dụng vì lượt chờ test đầu tiên.

## Kiểm thử trên đúng gói mới

- Windows: **23/23 đạt** khi chạy main/preload/HTML từ app.asar của gói 1.4.5. Gồm sandbox/IPC, đăng nhập, Cài đặt, 95 bài/giải mã âm thanh, VTV, XSS, chính sách TTS/tray và logout. Harness dùng profile/DB QA tạm, mock dịch vụ TTS để không chiếm cổng thật; không phải bài cài Setup vào Windows sạch. qa/windows-packaged-runtime-1.4.5.json.
- Windows và APK: 93 bài mới được đối chiếu byte/SHA256 với catalog; nguồn UI/account/runtime/banner/server-config khớp nguồn hiện tại; Windows không chứa sáu thư mục âm thanh gốc trùng với bundled-music. qa/windows-packaged-verification-1.4.5.json và qa/android-packaged-verification-1.4.6.json.
- Android native: **15/15 đạt**, errors=[]. TẮT chạy nền: lưu native preference, hủy hoạt động nền và không phát qua giờ báo thức khi khóa màn hình. Quay lại foreground cho phép hoạt động tiếp. BẬT: báo thức chạy trên màn hình khóa, audio player có USAGE_ALARM thực sự started. Đăng xuất khi đang phát dừng foreground service, vô hiệu runtime, xóa phiên mã hóa và giữ màn Đăng nhập. Số phiên bản không còn trên tiêu đề Cài đặt. mobile/qa/runtime-policy-1.4.6/results.json.
- Native audit bổ sung: findings=[], errors=[]; phần tài khoản nằm trong Cài đặt/không tràn, đồng bộ volume/voice/autoplay không ghi đè sai, 1 alarm native, thu âm 5048 byte, các marker XSS không thực thi. mobile/qa/release-audit-1.4.6/results.json.
- Policy/preload/TTS và fetch: **4/4 đạt** trong lượt này.
- Lượt native policy đầu bị timeout ở thao tác logout vì bài test chưa chờ overlay đồng bộ biến mất sau khi quay lại ứng dụng. Kiểm tra lại thao tác trực tiếp thành công; sửa fixture chờ đồng bộ xong và chạy lại toàn bộ 15 kiểm tra đạt trên cùng APK, không rebuild ứng dụng để bỏ qua lỗi.
- Android manifest được kiểm tra: nhãn GDQPAN, appId giữ nguyên, versionCode13, versionName1.4.6, minSdk24, targetSdk36.
- APK signature verification đạt. Certificate SHA256 48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452 trùng khóa debug cũ. Pipeline assembleDebug; không phải bản ký phát hành Play Store. Windows Setup NotSigned, không có chứng thư Authenticode.
- Test dùng AVD GDQPAN_QA và tài khoản/backend QA tạm, không dùng mật khẩu admin thật hoặc sửa DB người dùng. Sau cùng đã logout QA, xác nhận native token rỗng và dừng đúng giả lập do lượt này khởi động, không uninstall/xóa dữ liệu.

## Máy chủ và các giới hạn còn lại

Máy chủ mặc định vẫn https://hethongtruyenthongso-demo.onrender.com. Health thực tế trong lượt đóng gói trả ok=true, emailEnabled=false. Máy mới không cần chạy server tài khoản local để kết nối URL này, nhưng cần Internet và tài khoản được cấp/đã có quyền truy cập.

**Đăng ký Gmail mới, gửi lại xác minh và quên mật khẩu thật vẫn chưa hoạt động vì chưa cấu hình email**, đúng lựa chọn demo trước đây. Không đưa mật khẩu admin vào bộ cài. Không triển khai lại backend trong đợt này. Render Free vẫn có cold start và dữ liệu tạm; chưa phải cấu hình backend vận hành bền vững.

Chưa thử Setup trên máy Windows sạch, điện thoại/tablet vật lý, nhiều phiên bản Android, Doze/pin nhiều giờ hoặc toàn bộ tình huống mạng/CDN/TTS. Không kết luận phần mềm không còn mọi lỗi hoặc đã đạt chứng nhận production/Play Store. Hai tệp là bộ cài đầy đủ tại chỗ theo pipeline hiện có, không phải gói cập nhật nhỏ hoặc source ZIP.

## 15/10/2026 — Gói bổ sung nhạc tại 15102026_1

Đã đóng gói theo chỉ định mới vào version_Android_Windows/15102026_1, đúng hai tệp GDQPAN.exe (Windows NSIS Setup x64) và GDQPAN.apk; không Portable hoặc source ZIP. Chứa 174 bài (172 catalog + 2 preset), thêm79 bài tháng, giữ metadata nội bộ Windows1.4.5/Android1.4.6/code13 và ẩn số phiên bản trên UI. Không chuyển cloud. Folder15102026 cũ đã đối chiếu SHA256 trước/sau, không đổi.

Windows23/23 packaged runtime đạt. Cả hai gói đối chiếu SHA256/byte đủ172 catalog, mã UI/account/runtime/banner khớp. APK cài đè AVD thành công, đủ12 tháng/số bài đúng và phát/dừng12 bài đại diện; native audit findings/errors rỗng, ghi âm5697 bytes, nativealarm1, XSS marker không chạy. Đã logout QA, xác nhận native token rỗng và dừng AVD. Không thử Windows sạch/thiết bị vật lý; không lặp lại bài dài Doze/khóa màn hình của lượt trước. APK vẫn assembleDebug/certificate cũ; Setup Windows NotSigned. Backend demo/email chưa cấu hình giữ nguyên.

GDQPAN.exe: 954245338 bytes, SHA256 c72730775262f660c00b6cc86ebfc5503970edd54cefa1ca48dbe97bf70e38da.
GDQPAN.apk: 860920256 bytes, SHA256 803252d48e26708e9d9499aea0ebc8d4a2406e4576bcc66a6960bc681b2a75fe.

Manifest qa/delivery-15102026_1.json; chi tiết/bằng chứng tại BAO_CAO_NHAC_12_THANG_2026-10-15.md. Hash phần15102026 ở trên là lịch sử, không thay bằng hash mới. Hai JSON verifier theo tên phiên bản và windows-packaged-runtime-1.4.5.json hiện phản ánh gói15102026_1 mới.
