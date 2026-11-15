# Thẩm định bản mobile GDQPAN và prompt cho agent sửa lỗi

Ngày 09/10/2026 · Đối tượng: GDQPAN.apk (release mobile-latest), mobile-prototype.html, đối chiếu với bản desktop HE\_THONG\_THONG\_BAO\_TU\_DONG\_DESKTOP.html

## Phần A. Kết quả thẩm định

### Cách kiểm tra

- Tải và giải nén APK (119 MB): đọc AndroidManifest, capacitor.config.json, native-bridge.js và index.html thật nằm trong assets/public.
- index.html trong APK chính là mobile-prototype.html cộng thêm khối NativeBridge (khác nhau khoảng 160 dòng). Hai bản có cùng lỗi gốc.
- Chạy cả hai bằng Chromium headless giả lập điện thoại (360×640, 412×915, 820×1180, có cảm ứng): bắt lỗi console, kiểm tra từng nút có bị che không, chạm thật vào thanh điều hướng, thẻ chức năng, time picker, nút thêm lịch.
- Đã thử vá riêng lỗi gốc trên bản sao để lộ ra các lỗi bị che phía sau.
- Giới hạn: chưa chạy trên thiết bị Android hay emulator. Phần plugin native (thông báo, TTS, giữ màn hình) mới kết luận qua đọc mã và cấu hình, cần xác nhận lại trên máy thật.

### Nhóm P0: nguyên nhân khiến bấm không được và không có dữ liệu

**1. Script bị sập ngay lúc khởi động.** Hai dòng `setInterval(updateClock, 1000); updateClock();` (mục 3 của script) gọi `updateAlarmCountdown`, hàm này đọc `userSchedules` được khai báo bằng `let` ở mục 4, phía dưới. Kết quả là `ReferenceError: Cannot access 'userSchedules' before initialization` và toàn bộ phần script còn lại không chạy. Đo được trên cả prototype lẫn APK:

- Tab Sinh hoạt: 0 nút (màn hình trống, đã chụp ảnh xác nhận).
- Lịch hôm nay: 0 dòng. Danh sách lịch phát: 0 dòng. Nhật ký: 0 dòng.
- Time picker: 0 mục giờ và 0 mục phút nên không chọn được giờ để thêm lịch.
- Widget Lịch phát tiếp theo kẹt ở "Đang tải...". Thanh âm lượng không có listener, cấu hình đã lưu không được khôi phục.
- NativeBridge.init() nằm cuối script nên không bao giờ chạy: không xin quyền thông báo, không đồng bộ báo thức, không dùng TTS native, không giữ màn hình sáng.

**2. Nút có phản hồi nhưng không phát gì.** `handleFuncCard` và `handleEmergency` gọi `addLogItem` trước khi phát âm thanh. `addLogItem` đọc `historyData` (cũng bị TDZ) nên ném lỗi và không có tiếng. Người dùng chỉ thấy toast "Đang phát: Chào cờ". Xác nhận bằng chạm thật: toast hiện, không có âm, lịch sử không tăng. `switchTab` cũng ném lỗi ở dòng `currentTab = tabId` (tab vẫn đổi được vì lớp CSS đã được bật trước đó nhưng console đầy lỗi).

**Xác nhận cách sửa:** chuyển hai dòng đồng hồ xuống cuối script thì 0 lỗi, grid Sinh hoạt có 9 nút, timeline 5 dòng, danh sách lịch 9 dòng, picker 24 và 60 mục. Chạm thật vào thanh điều hướng, vuốt picker, thêm lịch đều chạy. Không có nút nào bị phần tử khác che trên cả ba kích thước màn hình.

**3. Không có bộ máy phát lịch.** Không có đoạn mã nào so sánh giờ hiện tại với `userSchedules` để phát. Chỉ có hiển thị đếm ngược. Công tắc "Tự động phát lịch" chỉ lưu giá trị, không nơi nào đọc. Bản desktop có `checkSchedule` (tick mỗi giây, khử trùng lặp theo phút, lọc theo `on` và `days`, khóa chống phát chồng). Bản mobile thiếu hoàn toàn nên dù có nạp được lịch thì app cũng không tự phát.

**4. Lịch native chỉ là thông báo, không phát tiếng.**

- `LocalNotifications.schedule` đặt `at` một lần, không lặp: mỗi lịch chỉ kêu một lần cho tới khi mở lại app.
- id thông báo là `index + 101`, đổi khi thêm hoặc xóa lịch nên có thể trùng hoặc lệch.
- Listener `localNotificationReceived` chỉ chạy khi app đang mở và chỉ hiện toast, không phát giọng đọc hay nhạc.
- Không thấy file `alarm.wav` trong res/raw của APK nên `sound: 'alarm.wav'` không có tác dụng.
- Manifest khai báo FOREGROUND\_SERVICE\_MEDIA\_PLAYBACK nhưng không có service nào. Không có luồng xin quyền báo thức chính xác (Android 12 trở lên) và miễn tối ưu pin.

**5. Nhiều khả năng plugin native không được gọi (cần xác nhận trên máy).** native-bridge.js không tạo proxy plugin (không có registerPlugin hay PluginHeaders), và index.html là HTML thuần không đóng gói @capacitor/core. Vì vậy `Capacitor.Plugins.LocalNotifications`, `TextToSpeech`, `KeepAwake` rất có thể là undefined. Toàn bộ code gọi chúng đều bọc `if (plugin)` nên thất bại trong im lặng.

**6. Dữ liệu của bản desktop không có mặt ở mobile.**

- Mô hình dữ liệu khác nhau: mobile dùng khóa `gdqpan_schedules_v1`, trường `enabled`, không có `days`; desktop dùng `gdqpan_schedules_v3`, trường `on` và `days`. Không thể nhập chéo.
- APK đóng gói thư mục Sound 113,8 MB (138 file giọng AI theo vùng miền và giới tính, quốc ca, báo động, nhạc, preset\_sounds\_data.js 4 MB) nhưng index.html không tham chiếu file nào (không có thẻ audio hay new Audio).
- Chọn giọng Bắc/Trung/Nam và Nam/Nữ chỉ lưu giá trị, hàm đọc không dùng chúng.
- Dữ liệu giả cứng trong mã: `timelineData` không đổi khi thêm hoặc xóa lịch (đã xác nhận), `shData` có giờ cố định khác với lịch, `defaultHistory` là 4 bản ghi "Phát tự động thành công" không có thật.
- Chưa có: phát nhạc, Thời sự VTV, tự thu âm, ghép âm thanh, gán nhạc cho lịch, hành động tùy chỉnh, lịch theo ngày trong tuần.

### Nhóm P1: giao diện và cảm ứng

7. Widget "Lịch phát tiếp theo" bị ép còn 28 px (nội dung cần 87 px), chỉ còn thấy nhãn, mất giờ và đếm ngược. Header cũng bị ép (97 đến 108 px so với 140 px cần). Lỗi vẫn còn sau khi vá lỗi gốc. Nguyên nhân: `.tab-content` là flex cột có cuộn, các con có `overflow:hidden` co lại do flex-shrink mặc định. Các danh sách (lịch, nhật ký, sinh hoạt) không bị.
8. Báo động và Phát khẩn cấp hú còi ngay sau một lần chạm, không xác nhận. Dễ bấm nhầm trên cảm ứng.
9. Không có nút Dừng toàn cục hoặc thanh đang phát. Thẻ chức năng nhanh bắt đầu phát nhưng chỉ nút Sinh hoạt mới dừng được. Phát thông báo văn bản không có nút dừng.
10. Vùng chạm nhỏ hơn 44 px: công tắc 44×26, nút xóa 36×36, nút vùng miền cao 38, nút giới tính cao 36, ô chọn hành động cao 40, thanh âm lượng rộng 28. Xóa lịch không hỏi lại, không hoàn tác.
11. Ghi chú kỹ thuật cho lập trình viên hiện ra cho người dùng cuối: khung "Lưu ý kỹ thuật ... Capacitor" ở tab Lịch phát, "Phiên bản 1.0.0 (Capacitor Ready)" và "1.0.0-PRO".
12. Mỗi tab chừa thêm 76 px padding đáy trong khi thanh điều hướng đã nằm trong luồng bố cục, gây khoảng trống thừa. Khối đồng hồ cộng âm lượng cao khoảng 190 px, chiếm hơn một phần ba màn hình 640 px.
13. Thẻ "Thông báo" ở Trang chủ đưa sang tab Cài đặt (nơi có ô nhập văn bản), sai ngữ cảnh.
14. Rủi ro cần kiểm tra trên máy thật: targetSdk 36 bắt buộc edge-to-edge (nội dung có thể đè thanh trạng thái); html và body dùng `position: fixed` có thể làm bàn phím che ô nhập; chưa xử lý nút Back của Android (thiếu @capacitor/app); viewport chặn zoom (`user-scalable=no`).

### Nhóm P2: build và phát hành

15. APK đang ký debug, `android:debuggable="true"`, `allowBackup="true"`.
16. APK 119 MB. Trong Sound: Duyệt đội ngũ.mp3 54 MB, NHẠC TRUYỀN THỐNG 30 MB, hai file demo .wav khoảng 9 MB mỗi file, preset\_sounds\_data.js 4 MB base64 (chỉ desktop dùng), cộng thêm icon.ico và giao\_dien\_desktop.png của desktop. Tên file có dấu tiếng Việt và khoảng trắng, dễ lỗi URL.
17. Không có kiểm thử tự động chặn lỗi khởi động trước khi build APK, nên lỗi số 1 lọt ra bản phát hành.

---

## Phần B. Prompt giao cho agent

Sao chép từ đây đến hết tài liệu.

### Vai trò và bối cảnh

Bạn là lập trình viên mobile full-stack (Capacitor, Android, JavaScript thuần). Dự án: ứng dụng Android "Hệ Thống Thông Báo Tự Động" của Trung tâm GDQP-AN, ĐHQG-HCM, repo GDQPAN\_Clock\_Auto, appId vn.gdqpan.app. Giao diện là một file index.html (assets/public) đóng gói bằng Capacitor, tải về từ release mobile-latest. Bản desktop (Electron) là nguồn chuẩn về chức năng và mô hình dữ liệu: HE\_THONG\_THONG\_BAO\_TU\_DONG\_DESKTOP.html.

Bản mobile hiện tại có lỗi nghiêm trọng: người dùng chạm vào chức năng không chạy và dữ liệu không được nạp. Báo cáo thẩm định (Phần A) đã xác định nguyên nhân. Nhiệm vụ của bạn là sửa theo thứ tự dưới đây, chứng minh bằng kiểm thử, và không phá bản sắc giao diện hiện có (màu xanh đậm, đỏ, vàng, phong cách nghiêm túc kiểu quân đội; giữ nguyên phần header).

### Quy tắc làm việc

1. Đọc kỹ index.html mobile, native-bridge.js, capacitor.config.json, AndroidManifest.xml và các phần StorageManager, checkSchedule, AudioEngine của file desktop trước khi sửa.
2. Mỗi giai đoạn kết thúc bằng một commit riêng và báo cáo ngắn: đã sửa gì, kiểm thử nào chứng minh.
3. Không đoán về Android: những gì chưa chạy được trên máy thật phải ghi rõ "chưa xác nhận trên thiết bị" cùng cách kiểm tra.
4. Gặp điểm cần quyết định của chủ dự án (mục "Câu hỏi phải hỏi") thì dừng và hỏi, không tự quyết.

### Giai đoạn 0. Dựng khung kiểm thử trước

- Viết một bài kiểm thử khởi động bằng Playwright hoặc Puppeteer, chạy file index.html với viewport 360×640 và 412×915 có cảm ứng, kiểm tra: không có lỗi pageerror hay console.error; grid Sinh hoạt đủ số nút; Lịch hôm nay có dòng; picker có 24 mục giờ và 60 mục phút; danh sách lịch khớp dữ liệu; widget lịch tiếp theo có giờ thật chứ không phải "Đang tải...".
- Thêm bước này vào GitHub Actions chạy trước khi build APK. Nếu thất bại thì không phát hành.
- Bài kiểm thử phải đỏ trên bản hiện tại (chứng minh bắt được lỗi) rồi mới sửa.

### Giai đoạn 1. Sửa lỗi sập và bố cục (P0 và P1)

1. Lỗi khởi động: `setInterval(updateClock, 1000); updateClock();` chạy trước khi `let userSchedules`, `currentTab`, `historyData` được khai báo. Sửa tận gốc bằng cách gom mọi trạng thái (`let`, `const`) lên đầu, rồi gọi một hàm `boot()` duy nhất sau khi DOM sẵn sàng. Trong `boot()`, bọc từng bước khởi tạo (đồng hồ, picker, danh sách lịch, nhật ký, âm lượng, cấu hình, NativeBridge) bằng try/catch riêng và ghi log, để một bước hỏng không làm các bước khác chết.
2. Trong `handleFuncCard`, `handleEmergency`, `playNotify`: ghi nhật ký phải nằm sau hoặc tách khỏi việc phát, và không được làm gián đoạn việc phát nếu ghi nhật ký lỗi.
3. Bố cục: ngăn các con trực tiếp của `.tab-content` co lại (flex-shrink: 0 cho các khối như `.home-header`, `.next-alarm-widget`, hoặc đổi tab sang block). Xác nhận widget lịch tiếp theo hiện đủ giờ, tên và đếm ngược ở 360×640.
4. Bỏ padding đáy thừa của `.tab-content` (thanh điều hướng đã nằm trong luồng). Thu gọn khối đồng hồ và âm lượng để màn 360×640 thấy được ít nhất hai hàng thẻ chức năng.
5. Ẩn mọi ghi chú dành cho lập trình viên khỏi giao diện người dùng cuối (khung "Lưu ý kỹ thuật", chuỗi "Capacitor Ready", "1.0.0-PRO"). Nếu cần cảnh báo thật (chưa cấp quyền thông báo, chưa cấp báo thức chính xác) thì hiện trong Cài đặt dưới dạng trạng thái rõ ràng.

### Giai đoạn 2. Bộ máy phát lịch (P0)

1. Port logic `checkSchedule` của desktop sang mobile: tick mỗi giây, chỉ kích hoạt một lần mỗi phút (`lastTriggeredMinute`), lọc theo `on` và `days` (0 là Chủ nhật), khóa `isExecutingSchedule` để không phát chồng, và hàng đợi khi có nhiều lịch cùng phút.
2. Công tắc "Tự động phát lịch" phải thực sự bật hoặc tắt bộ máy này.
3. Khi app trở lại foreground (visibilitychange, pageshow), xử lý lịch vừa bị lỡ trong một cửa sổ ngắn (ví dụ 2 phút, cấu hình được) và ghi nhật ký "phát muộn".
4. Hành vi khi màn hình khóa hoặc app ở nền phụ thuộc quyết định kiến trúc ở mục "Câu hỏi phải hỏi" số 1. Chưa làm phần nền trước khi có câu trả lời.

### Giai đoạn 3. Dữ liệu và âm thanh thật (P0)

1. Thống nhất mô hình dữ liệu với desktop: đọc StorageManager của desktop để lấy đầy đủ trường của lịch (khóa `gdqpan_schedules_v3`, trường `time`, `on`, `days`, hành động, âm thanh gán kèm), hành động tùy chỉnh (`gdqpan_custom_actions_v2`), cài đặt (`gdqpan_settings_v2`), nhật ký. Mobile dùng cùng cấu trúc, kèm hàm migrate từ khóa `gdqpan_schedules_v1` cũ (`enabled` đổi thành `on`).
2. Thêm Nhập và Xuất dữ liệu bằng file JSON (Capacitor Filesystem và Share) để chuyển lịch giữa desktop và mobile. Cách đồng bộ tự động chỉ làm sau khi chủ dự án chọn (câu hỏi số 3).
3. Xóa dữ liệu giả: `defaultHistory` (nhật ký bắt đầu rỗng), `timelineData` cứng (Lịch hôm nay phải suy ra từ lịch thật của hôm nay theo `on` và `days`, cập nhật khi thêm, sửa, xóa lịch), giờ cố định trong `shData` (lấy từ lịch hoặc bỏ).
4. Dùng file âm thanh đã đóng gói thay vì chỉ TTS: giọng AI theo mẫu `Sound/ai_voices/{hanh_dong}_{bac|trung|nam}_{nam|nu}.mp3` (có thêm các file `tmpl_*`, hãy đối chiếu với desktop để hiểu mục đích), quốc ca cho Chào cờ, tiếng còi từ `báo động.mp3`. Lập bảng ánh xạ hành động sang file. Khi người dùng chọn vùng miền và giới tính, đầu ra phải đổi theo. Chỉ dùng TTS (native hoặc FPT như desktop) cho văn bản tự nhập hoặc khi thiếu file.
5. Mã hóa URL đúng cho tên file có dấu và khoảng trắng (hoặc đổi tên file thành ASCII và cập nhật ánh xạ), kiểm thử phát được trên Android.
6. Chức năng bản desktop chưa có ở mobile (phát nhạc, Thời sự VTV, thu âm, ghép âm thanh, gán nhạc, hành động tùy chỉnh): chỉ làm phần thuộc phạm vi v1 mà chủ dự án chọn (câu hỏi số 2). Phần còn lại ghi vào danh sách việc tiếp theo, không giả lập bằng dữ liệu cứng.

### Giai đoạn 4. Native Android (P0 và P1)

1. Đảm bảo plugin gọi được: đóng gói @capacitor/core bằng bundler (Vite hoặc tương đương) và import các plugin, hoặc dùng `Capacitor.registerPlugin` đúng cách. Lúc khởi động in ra `Capacitor.isPluginAvailable` cho KeepAwake, TextToSpeech, LocalNotifications, Filesystem và hiển thị trạng thái trong Cài đặt.
2. Thông báo theo lịch: dùng lịch lặp theo tuần (theo `days`, giờ, phút) thay vì một lần; id ổn định gắn với id của lịch (không dùng chỉ số mảng); hủy và lập lại đúng khi sửa, xóa, đổi công tắc. Thêm đúng file âm thanh vào res/raw, tạo notification channel có âm thanh và độ ưu tiên cao, kiểm thử trên Android 8 trở lên.
3. Quyền: POST\_NOTIFICATIONS (Android 13 trở lên), báo thức chính xác (kiểm tra và chuyển người dùng tới màn hình cài đặt khi chưa cấp), hướng dẫn miễn tối ưu pin. Mọi bước phải có thông báo tiếng Việt dễ hiểu cho người không rành kỹ thuật.
4. TTS native: kiểm tra có giọng vi-VN, nếu thiếu thì hướng dẫn cài giọng tiếng Việt và dùng file giọng AI đóng gói để dự phòng.
5. Xử lý nút Back của Android (thêm @capacitor/app): quay về tab trước hoặc tab Trang chủ, không thoát đột ngột khi đang phát.
6. Kiểm tra edge-to-edge của targetSdk 36 (thanh trạng thái, thanh điều hướng hệ thống, bàn phím che ô nhập) trên ít nhất Android 13, 14, 15.

### Giai đoạn 5. Cảm ứng và UX (P1)

1. Mọi vùng chạm tối thiểu 48 dp (có thể mở rộng vùng chạm mà không đổi hình): công tắc, nút xóa, nút vùng miền, giới tính, ô chọn hành động, thanh âm lượng (rộng hơn hoặc chuyển ngang).
2. Báo động và Phát khẩn cấp: cần xác nhận trước khi hú còi (chạm giữ khoảng 1 giây hoặc hộp thoại hai bước), có nút hủy.
3. Thanh "Đang phát" cố định phía dưới (dưới thanh điều hướng hoặc ngay trên nó) với tên nội dung và nút Dừng, hiện cho mọi nguồn phát (thẻ nhanh, sinh hoạt, thông báo văn bản, lịch tự động).
4. Xóa lịch: hỏi lại hoặc cho phép hoàn tác trong vài giây.
5. Thẻ Thông báo ở Trang chủ mở đúng khu vực nhập văn bản (tách ra khỏi Cài đặt hoặc cuộn tới đúng mục).
6. Cho phép phóng to chữ hệ thống: bỏ chặn zoom trong viewport, kiểm tra bố cục với cỡ chữ lớn.

### Giai đoạn 6. Build và phát hành (P2)

1. Ký bằng release keystore, `debuggable=false`, đặt `allowBackup=false` nếu nhật ký và lịch không nên bị sao lưu lên đám mây (xác nhận với chủ dự án), tăng versionCode, versionName.
2. Giảm dung lượng: bỏ hai file demo .wav và preset\_sounds\_data.js, bỏ file chỉ dành cho desktop (icon.ico, giao\_dien\_desktop.png), nén các file nhạc dài (ví dụ mp3 128 kbps) hoặc cho tải theo nhu cầu. Báo cáo dung lượng trước và sau.
3. Giữ kiểm thử khởi động của Giai đoạn 0 như một cổng bắt buộc trong CI.

### Tiêu chí nghiệm thu

- Mở app trên Android thật: không có lỗi console, mọi tab có dữ liệu thật, chạm vào bất kỳ nút nào cũng có hành động hoặc phản hồi đúng.
- Thêm một lịch sau 2 phút (có giờ và ngày hợp lệ): đến giờ app phát đúng nội dung (đúng giọng vùng miền và giới tính đã chọn) khi đang mở; hành vi khi khóa màn hình đúng theo quyết định ở câu hỏi số 1.
- Thêm, sửa, xóa lịch thì Lịch hôm nay, widget lịch tiếp theo và thông báo native cập nhật theo.
- Xuất lịch từ desktop và nhập vào mobile (và ngược lại) không mất trường nào.
- Widget lịch tiếp theo hiện đủ ở 360×640. Mọi vùng chạm đạt 48 dp. Báo động có bước xác nhận. Có nút Dừng toàn cục.
- CI chạy kiểm thử khởi động và chặn build khi lỗi.

### Câu hỏi phải hỏi chủ dự án trước khi làm các phần liên quan

1. Cách dùng thực tế: máy Android cố định, cắm sạc, để app mở suốt (chế độ trực), hay điện thoại cá nhân để app chạy nền và khóa màn hình? Câu trả lời quyết định có cần foreground service và AlarmManager native phát âm thanh khi app đóng hay không (Giai đoạn 2 mục 4 và Giai đoạn 4).
2. Phạm vi v1 của mobile: chỉ lịch, sinh hoạt, thông báo và báo động, hay cần thêm phát nhạc, Thời sự VTV, thu âm, ghép âm thanh?
3. Đồng bộ dữ liệu giữa desktop và mobile: chỉ nhập, xuất file JSON, hay cần đồng bộ tự động (đám mây, mạng LAN, Google Sheets)?
4. Cách xác nhận cho Báo động và Phát khẩn cấp: chạm giữ hay hộp thoại hai bước?

### Báo cáo cuối

Nêu danh sách commit, kết quả kiểm thử từng giai đoạn, những gì đã xác nhận trên thiết bị thật và những gì chưa, dung lượng APK trước và sau, và các việc còn lại.
