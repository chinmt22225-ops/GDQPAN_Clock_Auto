# Thẩm định và kế hoạch cập nhật giao diện Android từ bản 15102026_1

Ngày lập: 19/10/2026. Phạm vi hiện tại: khảo sát, phân tích ảnh tham chiếu và lập kế hoạch; chưa thay đổi mã ứng dụng hoặc tạo APK mới.

## 1. Kết luận thẩm định

**Khả thi, không cần viết lại ứng dụng.** Bản Android dùng Capacitor/WebView, có lớp giao diện di động riêng và dùng chung phần xử lý âm thanh, thu âm, thư viện, lịch phát với bản Windows. Ảnh khách hàng yêu cầu vẫn theo cấu trúc Trang chủ hiện có, do đó nên cập nhật lớp trình bày, giữ các đầu mối dữ liệu và xử lý nghiệp vụ.

Mức độ công việc: trung bình. Trang chủ tương đối thuận lợi; rủi ro tập trung ở banner trên màn hình nhỏ, bố cục máy tính bảng, thanh phát nổi, và hồi quy lịch phát native sau nâng cấp.

### Căn cứ đã kiểm tra trực tiếp

- Thư mục `version_Android_Windows/15102026_1/` chứa `GDQPAN.apk` và `GDQPAN.exe`, là thư mục bàn giao bộ cài.
- `qa/delivery-15102026_1.json` ghi Android 1.4.6; `qa/android-badging-15102026_1.txt` ghi application ID `vn.gdqpan.app.mobile`, versionCode 13, minSdk 24, targetSdk 36. Thông tin manifest này lấy từ báo cáo có sẵn, chưa chạy lại công cụ badging trong lượt thẩm định.
- Đã mở APK dưới dạng ZIP và so sánh nội dung: `assets/public/index.html`, `mobile-ui.css`, `mobile-ui.js`, `assets/banner.css` đều khớp hoàn toàn với các tệp tương ứng trong `mobile/www/`.
- APK có sẵn `assets/public/assets/logo_gdqpan.png` và `banner_campus.jpg`; có thể tái sử dụng làm đầu vào thiết kế. Chưa xác nhận ảnh khuôn viên này trùng chính xác với ảnh trong mẫu.
- `mobile/build-web.js` lấy HTML từ `HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html`, bổ sung các adapter mobile và tạo `mobile/www/index.html`.
- `mobile/www/mobile-library.js` đã tạo đúng bốn lối tắt: Hiệu lệnh, Nhạc, Nhạc tùy chọn, Phòng thu. `mobile-ui.js` đã có lịch phát kế tiếp và điều hướng năm mục.
- Cây làm việc có nhiều thay đổi từ trước; cần giữ nguyên và xác lập danh sách tệp cho đợt cập nhật này.

Đây là thẩm định dựa trên ảnh, mã nguồn và tài nguyên APK. Chưa chạy APK trên thiết bị hoặc emulator trong lượt này; không xem kết quả kiểm thử cũ là bằng chứng cho giao diện mới.

## 2. Phạm vi điện thoại, tablet và iPad

1. **Điện thoại Android và máy tính bảng Android:** thuộc cùng đợt cập nhật APK, hỗ trợ cả dọc và ngang.
2. **iPad thật, chạy iPadOS:** APK Android không cài được. Có thể dùng thiết kế responsive chung làm nền tảng, nhưng chạy web/PWA trên Safari hoặc tạo ứng dụng iOS là phạm vi riêng. Đặc biệt phải đánh giá lại báo thức khi khóa màn hình, phát nền, giọng đọc và quyền micro; không suy ra tương đương với Android.

Giả định để triển khai kế hoạch chính: khách hàng đang yêu cầu điện thoại và tablet Android. Nếu “iPad” là thiết bị Apple thực tế, bổ sung nhánh khảo sát iPadOS trước khi cam kết tính năng và lịch bàn giao nền tảng đó.

## 3. Phân tích ảnh tham chiếu và hướng điều chỉnh

Ảnh mẫu là ảnh chụp 575 × 1280 pixel. Đây là kích thước ảnh, không phải chiều rộng CSS bắt buộc. Cần tái tạo ngôn ngữ thiết kế và thứ bậc thông tin, không kéo giãn toàn bộ ảnh thành nền giao diện.

| Khu vực | Hiện trạng qua mã nguồn | Đề xuất theo ảnh mẫu |
|---|---|---|
| Banner | Logo thật, tên đơn vị trắng, ảnh bên phải trong khối chữ nhật bo góc | Nền xanh đậm, dải chuyển sắc xanh/vàng, tên Trung tâm vàng kem, slogan nghiêng, ảnh bên phải có đường viền và góc cắt |
| Tiêu đề hệ thống | Phone hai dòng, từ 600px trở lên một dòng theo CSS hiện có | Phone hai dòng như mẫu; tablet cho phép hai dòng nếu cần giữ cân đối, không để tiêu đề ép tên đơn vị quá hẹp |
| Đồng hồ và âm lượng | Các phần tử dữ liệu có sẵn, kích thước nhỏ và nền tương đối phẳng | Gom trong một khung xanh bo góc, đồng hồ đỏ cam có sáng nhẹ, ngày bên dưới, âm lượng bên phải và vạch chia dọc |
| Tiêu đề Trang chủ | Chữ tiêu đề đơn giản | Icon nhà màu xanh, chữ đậm, gạch nhấn dưới tiêu đề |
| Lịch phát tiếp theo | Đã tính lịch đang bật, có trạng thái rỗng và liên kết xem lịch | Thẻ trắng lớn, icon loa, nhãn xanh đậm, liên kết nằm cùng hàng khi đủ rộng |
| Bốn thẻ chức năng | Đúng bốn đích chức năng, lưới hai cột | Icon trong vòng tròn xanh nhạt, tiêu đề đậm, mô tả xám, mũi tên phải, tăng khoảng thoáng |
| Điều hướng đáy | Đủ năm mục, icon dạng ký tự/emoji, mục chọn có nền nhạt | Nền xanh đậm, mục hiện tại vàng kèm vạch nhấn; thống nhất bộ icon |
| Nền trang | Xám xanh nhạt | Chuyển sang xanh bạc hà, giảm viền và dùng bóng nhẹ cho thẻ |

### Chi tiết cần quyết định trong thiết kế

- Tên đơn vị và slogan phải là văn bản thật để rõ nét và hỗ trợ phóng chữ. Logo và ảnh khuôn viên là tài nguyên riêng. Dải trang trí dựng bằng CSS hoặc SVG nhẹ, không cần ảnh nền toàn màn hình.
- Dùng icon vector đóng gói cục bộ để hình thức ổn định giữa thiết bị; emoji có thể khác hình dạng so với ảnh mẫu.
- Đồng hồ, ngày tháng, phần trăm âm lượng và lịch phát phải lấy dữ liệu thực. Không đóng cứng giờ 10:35:24, ngày 19/10/2026 hoặc mức 80% từ ảnh.
- Thanh trạng thái và ba nút điều hướng Android trong ảnh thuộc hệ điều hành. Chỉ phối màu và xử lý vùng an toàn, không vẽ các biểu tượng pin/sóng/nút hệ thống giả trong trang.
- Thanh âm lượng hiện gắn với mức âm lượng của ứng dụng/AudioEngine. Giao diện mới giữ đúng ý nghĩa này; không quảng bá là điều chỉnh âm lượng hệ thống nếu chưa bổ sung và kiểm chứng tích hợp native.
- Dòng “Phát tùy chương trình” trong ảnh là nội dung trình bày. Trang Nhạc tùy chọn hiện nhận đường dẫn âm thanh/YouTube; không tự mở rộng thành chức năng tạo chương trình phát trong đợt sửa giao diện.
- Trạng thái trống trong mẫu chỉ là một trạng thái. Phải thiết kế cả lúc có lịch, tắt tự động phát, đang phát, lỗi đồng bộ và chưa đủ quyền báo thức. Có lịch kế tiếp không đồng nghĩa báo thức nền đã sẵn sàng.

## 4. Quy tắc responsive đề xuất

Các mốc dưới đây là điểm bắt đầu thiết kế, điều chỉnh theo kết quả render thực tế.

| Chiều rộng CSS | Bố cục đề xuất |
|---|---|
| 320–359px | Banner gọn, chữ được xuống dòng; đồng hồ/âm lượng có thể tách hai hàng; thẻ chức năng chuyển một cột nếu phóng chữ gây chật |
| 360–599px | Gần ảnh mẫu nhất: banner hai vùng, khung giờ/âm lượng, thẻ lịch toàn hàng, bốn thẻ thành lưới 2 × 2, điều hướng năm mục |
| 600–839px | Tăng khoảng cách, giới hạn độ rộng chữ; bố trí khối lịch và nhóm thẻ theo không gian thực, không phụ thuộc riêng breakpoint cũ |
| Từ 840px | Nội dung căn giữa, giới hạn bề rộng khoảng 1040–1200px; có thể đặt lịch bên trái và nhóm thẻ bên phải; giữ cùng thứ tự và đích điều hướng |
| Màn hình ngang thấp | Giảm chiều cao banner trang trí, ưu tiên vùng thao tác; nội dung cuộn được, không ép mọi khối vừa một màn hình |

Thông số khởi điểm: lề phone 12–16px, khoảng cách 10–16px, bo góc thẻ 16–20px, chữ nội dung khoảng 14–16px. Vùng chạm tối thiểu 48 × 48 CSS px; font và kích thước phải được kiểm chứng ở mức phóng chữ lớn.

Dùng safe-area và chiều cao khả dụng để xử lý camera khoét, điều hướng cử chỉ, bàn phím. Thanh phát đang có `bottom` cố định, nội dung đang dùng nhiều `padding-bottom` khác nhau: nên quy về biến dùng chung cho chiều cao điều hướng/thanh phát, bổ sung đo chiều cao khi cần để không che nút cuối trang.

Không đặt mục tiêu “mọi điện thoại đều hiển thị trọn Trang chủ không cuộn”. Tiêu chí đúng là dễ đọc, đúng thứ tự và mọi chức năng đều tiếp cận được.

## 5. Phương án sửa mã

Ưu tiên một lớp giao diện Android có phạm vi rõ ràng; không viết lại engine hoặc chuyển framework trong đợt này.

| Tệp / nhóm | Công việc dự kiến |
|---|---|
| `mobile/www/mobile-ui.js` | Điều chỉnh markup banner, tiêu đề và thẻ lịch; giữ ID dữ liệu và API điều hướng; giữ xử lý đồng bộ native |
| `mobile/www/mobile-library.js` | Cập nhật markup/icon/mũi tên của bốn thẻ; giữ `data-destination` và ý nghĩa từng đích |
| `mobile/www/mobile-ui.css` | Rà soát cascade cũ, gom quy tắc trùng cho các khối sửa; thêm biến màu/khoảng cách, responsive, trạng thái điều hướng và bố cục thanh phát |
| `assets/banner.css` | Chỉ sửa selector mobile nếu cần; tách override Android nếu có nguy cơ ảnh hưởng Windows |
| `assets/` và `mobile/build-web.js` | Bổ sung icon/trang trí cục bộ và danh sách copy tài nguyên tương ứng; bảo đảm build lại không mất thay đổi |
| `mobile/android/.../MainActivity.java`, cấu hình SystemBars | Chỉ chỉnh nếu kiểm thử thực cho thấy cần xử lý màu/vùng system bars; tránh thay đổi native không cần thiết |
| `mobile/tests/` | Bổ sung kiểm tra hành vi và bố cục cần thiết; tái dùng test nghiệp vụ đang có |
| `mobile/build-android.ps1`, cấu hình Gradle | Xác định đúng SDK/JDK/build staging, tăng phiên bản phù hợp, kiểm tra chữ ký và quy trình nâng cấp |

Lưu ý nguồn xây dựng: `mobile/www/index.html` là đầu ra của `build-web.js`, không sửa tay làm nguồn chính. Các tệp `mobile-ui.css/js`, `mobile-library.js` hiện nằm trong `mobile/www` nhưng đang là đầu vào được duy trì; không xóa cả thư mục theo giả định mọi thứ đều được sinh lại. `mobile/android/app/src/main/assets/public/` là bản sao để đóng gói, không phải nơi sửa chính.

## 6. Trình tự triển khai và sản phẩm từng bước

### Bước 1 — Chốt baseline và thiết kế (0,5–1 ngày công)

- Ghi nhận SHA-256 bộ cài gốc, sao lưu trạng thái nguồn và dữ liệu thử nghiệm; xác lập phạm vi tệp giữa các thay đổi sẵn có.
- Chụp hiện trạng từ đúng APK 1.4.6 trên phone và tablet, gồm lúc rỗng và đang phát.
- Dựng bản xem trước phone 390px và tablet 820px, có biến thể màn hình nhỏ/ngang; chọn logo, ảnh, icon và màu gần mẫu.
- Đầu ra: ảnh trước/sau và thông số giao diện để đối chiếu. Duyệt bản xem trước trước khi đóng gói bản bàn giao.

### Bước 2 — Cập nhật Trang chủ và khung ứng dụng (1–1,5 ngày công)

- Hoàn thiện banner, khung giờ/âm lượng, tiêu đề, lịch kế tiếp, bốn thẻ và điều hướng.
- Gắn lại dữ liệu thực, giữ hành vi chuyển trang và khả năng truy cập bằng trợ năng.
- Chuẩn hóa token CSS, safe-area và không gian cho thanh phát.
- Đầu ra: bản web mobile hoạt động có dữ liệu thử nghiệm, bộ ảnh so sánh trên các viewport chính.

### Bước 3 — Đồng bộ các màn hình còn lại (0,5–1 ngày công)

- Áp dụng cùng màu, chữ, góc bo, khoảng cách cho Hiệu lệnh, Nhạc, Lịch phát, Tiện ích, Nhạc tùy chọn và Phòng thu.
- Kiểm tra modal, form lịch, danh mục nhạc, thanh phát, quyền hệ thống và giao diện đăng nhập; không làm mất nội dung hoặc quyền thao tác.
- Đầu ra: luồng điều hướng thống nhất trên phone và tablet.

### Bước 4 — Kiểm thử và sửa lỗi (1–1,5 ngày công)

- Chạy kiểm tra web có account server/DB tạm, sau đó native Android bằng emulator và thiết bị thật nếu có.
- Kiểm tra nâng cấp từ APK gốc, giữ dữ liệu, và hồi quy tính năng phát âm thanh/báo thức.
- Đầu ra: báo cáo pass/fail, ảnh thực tế, các giới hạn còn lại được ghi rõ.

### Bước 5 — Đóng gói và bàn giao (0,5 ngày công)

- Sau khi duyệt kết quả, tạo APK mới, checksum, ghi chú thay đổi và hướng dẫn cập nhật/khôi phục.
- Đề xuất phiên bản Android 1.4.7 với versionCode lớn hơn 13, chốt lại theo lịch phát hành thực tế.
- Lưu ở thư mục phát hành mới; giữ bộ cài `15102026_1` làm baseline.

**Tổng sơ bộ: 4–6 ngày công cho Android phone/tablet**, với một lập trình viên có thời gian kiểm thử, tài nguyên hình ảnh sẵn có và một vòng duyệt thiết kế. Chưa bao gồm phát triển iPadOS, tính năng nghiệp vụ mới hoặc nhiều vòng thay đổi ảnh mẫu. Đây là ước lượng để lập kế hoạch, chưa phải cam kết ngày phát hành.

## 7. Ma trận kiểm thử và tiêu chí nghiệm thu

### Giao diện

- Phone: 320 × 568, 360 × 640, 390 × 844, 412 × 915 CSS px; thử xoay ngang.
- Tablet: 600 × 960, 820 × 1180, 1024 × 1366; thử xoay ngang và cửa sổ chia màn hình nếu thiết bị hỗ trợ.
- Kiểm tra ranh giới breakpoint, phóng chữ 130% và 150%, lịch/tên bài dài, bàn phím đang mở, điều hướng ba nút và cử chỉ.
- Không tràn ngang, cắt tên đơn vị, chồng chữ, che điều khiển hoặc xuất hiện khoảng trắng thừa do thanh phát.
- Thẻ lịch, nội dung và thanh điều hướng giữ thứ tự/thứ bậc theo mẫu. Sai khác do system bars được tách khỏi đánh giá vùng nội dung.
- Có trạng thái chọn rõ ràng, tương phản đủ đọc, nhãn trợ năng; không dựa riêng vào màu sắc để báo trạng thái.

### Hành vi và dữ liệu

- Cả năm mục điều hướng và bốn thẻ mở đúng trang; Back Android đóng modal hoặc quay về đúng luồng.
- Đồng hồ cập nhật đúng khi quay lại app; ngày dùng ngôn ngữ Việt và múi giờ thiết bị theo hành vi hiện có.
- Âm lượng đổi khi kéo, hiển thị đúng phần trăm, được lưu và áp dụng cho các luồng âm thanh liên quan.
- Lịch kế tiếp đúng khi không có lịch, có nhiều lịch, lịch tắt, đổi thứ/ngày, qua ngày mới và tắt tự động phát.
- Phát/dừng/tạm dừng nhạc, hiệu lệnh, giọng đọc, thu âm, ghép âm và mở video hoạt động; Dừng luôn tiếp cận được khi đang phát.
- Lịch native chạy một lần đúng luồng khi mở app, đưa nền và khóa màn hình, theo quyền đã cấp; có phản hồi phù hợp khi thiếu quyền.
- Đăng nhập, đồng bộ và phân quyền không bị bỏ qua bởi giao diện mới.
- Cài đè từ đúng APK 1.4.6 giữ lịch/cài đặt/tệp âm thanh; phiên đăng nhập được xác thực lại theo chính sách hiện có.

### Các bộ kiểm tra có thể tái sử dụng

- `mobile/tests/mobile.test.js`: navigation, viewport, thư viện, studio, lịch và tài khoản.
- Các bài `startup`, `build-tooling`, `android-runtime-policy`, `android-library`, `android-alarm-settings`, `android-performance`: chọn theo phạm vi thay đổi và rà lại giả định.
- Một số script native cũ còn tham chiếu APK 1.2.1 và đường dẫn toolchain cũ; phải cập nhật fixture/đích thử nghiệm trước khi chạy, không chạy mù rồi xem là kiểm thử bản mới.
- Trình duyệt chỉ chứng minh phần web. Báo thức nền, system bars và cài nâng cấp phải có bằng chứng trên Android.

## 8. Rủi ro và điều kiện phát hành

| Vấn đề thực tế | Cách xử lý trong đợt cập nhật |
|---|---|
| Nhiều override CSS và `!important`, breakpoint banner 600px khác breakpoint nội dung 768px | Rà cascade trước khi thêm style, kiểm tra các điểm chuyển bố cục, giới hạn selector mobile |
| Markup Trang chủ bị tạo rồi thay tiếp trong `mobile-library.js` | Chọn một nơi chịu trách nhiệm cho thẻ cuối cùng, giữ hook và thứ tự khởi tạo |
| Mã mobile dùng engine và một số asset chung với Windows | Chỉ đổi adapter hoặc selector mobile; render kiểm tra Windows nếu sửa tài nguyên chung |
| Thanh phát nổi và điều hướng cùng cố định ở đáy | Dùng kích thước dùng chung/đo thực tế, kiểm thử tên bài dài và phóng chữ |
| APK gốc khoảng 861 MB do tài nguyên đóng gói | Giữ phạm vi UI; kiểm tra dung lượng và thời gian cài. Tối ưu thư viện là hạng mục riêng nếu cần |
| `build-android.ps1` đang dùng đường dẫn `D:\GDQPAN\android-build-tools` và versionCode cố định 13, gọi `assembleDebug` | Xác nhận toolchain thực, chỉnh tham số phiên bản; kiểm tra chứng thư APK gốc và cấu hình ký trước khi cam kết cài đè |
| Tệp nguồn đang có nhiều thay đổi chưa commit | Ghi baseline và danh sách tệp, không reset hoặc gom thay đổi ngoài phạm vi vào đợt UI |

Điều kiện bàn giao: thiết kế được duyệt, chức năng chính và nâng cấp đạt kiểm thử, APK có phiên bản/chữ ký phù hợp và checksum. Khôi phục khi lỗi cần có sao lưu dữ liệu và quy trình thử trên thiết bị QA; không mặc định có thể cài APK versionCode thấp đè lên bản mới.

## 9. Sản phẩm dự kiến của đợt thực hiện

1. Mã giao diện Android cập nhật và danh sách thay đổi rõ ràng.
2. Bộ ảnh so sánh với mẫu trên phone/tablet, gồm các trạng thái chính.
3. Báo cáo kiểm thử web, native và cài nâng cấp, nêu rõ thiết bị thực tế đã thử.
4. APK phát hành mới, SHA-256, hướng dẫn cài cập nhật và phương án khôi phục.

Lượt làm việc ngày 19/10/2026 mới hoàn thành thẩm định và tài liệu kế hoạch này; chưa chạy test ứng dụng, sửa giao diện hay tạo bộ cài mới.
