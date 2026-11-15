# PROMPT CHO AGENT: HẸN GIỜ TỰ TẮT & LỊCH TỰ PHÁT/TỰ TẮT "THÔNG TIN THỜI SỰ"

> Dán toàn bộ nội dung dưới dòng kẻ này vào agent (Claude Code / Cursor / ...). Đặt agent làm việc trong thư mục gốc của repo `GDQPAN_Clock_Auto`.
> Các mục đánh dấu **[CẦN HỎI]** là chỗ khách hàng chưa quyết: agent phải **hỏi người dùng** trước khi code, **không tự chọn**.

---

## 1. VAI TRÒ & BỐI CẢNH

Bạn là kỹ sư phần mềm full-stack giàu kinh nghiệm (Electron, HTML/CSS/JS, Node.js). Bạn đang cập nhật **Hệ Thống Thông Báo Tự Động** của Trung tâm Giáo dục Quốc phòng và An ninh ĐHQG-HCM (repo `chinmt22225-ops/GDQPAN_Clock_Auto`).

Thông tin nền (lấy từ README và các lần cập nhật trước; **hãy tự đọc code để xác minh, không tin tuyệt đối vào mô tả này**):
- Ứng dụng chạy dưới dạng **Electron desktop** (đóng gói `GDQPAN.exe`) và có bản web/PWA. Màn hình chính là desktop/laptop Windows. Người dùng cuối là **thầy cô trực ban, không rành kỹ thuật**.
- Các file chính theo README: `HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html` (giao diện điều khiển), `HE_THONG_THONG_BAO_TU_DONG_MOBILE.html`, `vtv_player.html` (trình phát luồng), `main.js` (tiến trình chính Electron), `preload.js` (cầu nối IPC), `tts_server.js`, `config/`, `Sound/`, `repository/` (bản web đóng gói độc lập).
- Đã có sẵn: tính năng **"Lập lịch Hẹn giờ Tự động"** (theo giờ và ngày trong tuần), Screen WakeLock, phát nhạc, TTS, báo giờ nề nếp.
- Đã có sẵn chế độ **"Thông tin thời sự"** trong panel **"Phát nhạc"**: nút bật/tắt chế độ nằm ngay trong khung điều khiển phát; khi vào chế độ này sẽ **tự mở cửa sổ popup riêng** (kéo thả/đổi kích thước được) hiển thị video và **tự đóng khi dừng/thoát**; ngoài ra có nút bật/tắt popup riêng. Nguồn phát được thiết lập qua ô **dán link trong màn hình Cài đặt** (nhận link bất kỳ: YouTube dùng iframe, trang khác dùng công cụ trích luồng như yt-dlp, có thông báo lỗi thân thiện khi không phát được).
- Phong cách giao diện: nghiêm túc, quân đội (xanh đậm, đỏ, vàng), tinh gọn. **Header giữ nguyên.** Đã làm: thanh tua nhạc, nút pause/stop dạng icon, giao diện co giãn cho nhiều cỡ màn hình.

## 2. NGUYÊN TẮC LÀM VIỆC (BẮT BUỘC)

1. **Đọc code trước.** Đọc các file liên quan (đặc biệt phần: chế độ thời sự, popup, Cài đặt, lập lịch, IPC giữa `main.js` ↔ `preload.js` ↔ renderer). Tóm tắt ngắn cho người dùng cách chúng đang hoạt động trước khi sửa.
2. **Hỏi, không tự quyết.** Với mọi mục **[CẦN HỎI]** ở mục 6 và bất kỳ điểm mơ hồ nào bạn gặp, hãy hỏi người dùng (gom thành một danh sách câu hỏi ngắn kèm các phương án). Chỉ code sau khi có câu trả lời. Không "chọn mặc định hợp lý" thay họ.
3. **Phạm vi nghiêm ngặt.** Chỉ làm đúng mục 3 và 4. **KHÔNG** sửa "gán nhạc / hiển thị dòng chữ khi bấm nút" (xem mục 5). Không refactor lan man, không đổi header, không đổi bảng màu, không đổi chức năng đang chạy tốt.
4. **Không làm hỏng cái đang chạy.** Phát nhạc, TTS, lịch hẹn giờ hiện có, báo giờ nề nếp, popup thời sự, ô dán link phải hoạt động y như trước.
5. **Dành cho người không rành kỹ thuật:** nhãn tiếng Việt đơn giản, nút lớn, ít bước, có thông báo rõ ràng. Không bắt người dùng sửa file cấu hình hay JSON.
6. **Giữ tính nhất quán** với kiến trúc hiện tại (cách lưu cấu hình, cách gọi IPC, cách đặt tên). Làm theo mẫu đã có, không dựng cơ chế song song nếu không cần.
7. **Kiểm thử và báo cáo** theo mục 7, 8.

## 3. YÊU CẦU 1: HẸN GIỜ TỰ TẮT KHI ĐANG PHÁT THỜI SỰ

**Mục đích:** phòng khi thầy cô trực bận việc, quên tắt, luồng thời sự tự tắt theo thời gian đã chọn.

**Đã chốt:**
- Thầy cô có thể chọn thời điểm tắt theo **cả hai cách**: (a) **thời lượng** (phát trong bao lâu rồi tắt), và (b) **giờ kết thúc cụ thể** (ví dụ 08:30).
- Đặt trong khu vực điều khiển của chế độ **Thông tin thời sự** (cùng panel "Phát nhạc"), không tạo menu cấp cao nhất mới.
- "Tự tắt" nghĩa là thực hiện **đúng như khi thầy cô bấm Dừng thời sự**: dừng luồng, và theo hành vi đã có thì **popup tự đóng**.

**Mô tả chức năng mong muốn:**
- Một nhóm điều khiển "Tự tắt" gọn gàng: công tắc bật/tắt; chọn kiểu "Theo thời lượng" hoặc "Đến giờ"; với thời lượng có lựa chọn nhanh và/hoặc nhập số phút; với giờ kết thúc có ô chọn giờ:phút.
- Hiển thị rõ ràng khi đang bật: ví dụ "Sẽ tự tắt lúc 08:30 (còn 24 phút)" với **đếm ngược cập nhật mỗi giây/phút**.
- Cho phép **thay đổi hoặc hủy** hẹn giờ khi đang phát.
- Khi hết giờ: dừng thời sự như trên, hiển thị **thông báo dễ thấy** trong ứng dụng (ví dụ "Thông tin thời sự đã tự tắt lúc 08:30").
- Nếu thầy cô tự bấm Dừng trước giờ thì hẹn giờ tự hủy sạch, không để timer "mồ côi" chạy ngầm.
- Hẹn giờ phải chính xác, **không trôi** khi máy sleep/đổi giờ hệ thống (so sánh với đồng hồ thời gian thực, không chỉ đếm bằng `setInterval` cộng dồn). Nên đặt logic hẹn giờ ở nơi bền vững (xem [CẦN HỎI] A1).

## 4. YÊU CẦU 2: LỊCH TỰ ĐỘNG PHÁT & TỰ ĐỘNG TẮT "THÔNG TIN THỜI SỰ"

**Mục đích:** Thầy hỏi có thể cài lịch để thời sự **tự phát và tự tắt** không (ví dụ mỗi sáng 06:00-06:30 phát bản tin).

**Đã chốt:** Làm lịch tự phát + tự tắt (ngoài hẹn giờ tự tắt ở mục 3).

**Mô tả chức năng mong muốn:**
- Mỗi mục lịch gồm tối thiểu: **giờ bắt đầu, giờ kết thúc** (hoặc thời lượng, xem [CẦN HỎI] B2), **các ngày trong tuần áp dụng**, và công tắc bật/tắt từng mục.
- Đến giờ bắt đầu: tự vào chế độ **Thông tin thời sự**, phát luồng theo link đang cài, **tự mở popup** như hành vi hiện tại. Đến giờ kết thúc: tự dừng, popup tự đóng, có thông báo.
- Giao diện quản lý lịch **đơn giản cho người không rành kỹ thuật**: xem danh sách, thêm, sửa, bật/tắt, xóa. Hiển thị "lần chạy tiếp theo".
- **Tái sử dụng tối đa** cơ chế/giao diện "Lập lịch Hẹn giờ Tự động" đang có nếu phù hợp (xem [CẦN HỎI] B1). Đọc code để đề xuất phương án và xin xác nhận.
- Có nút **"Chạy thử"** để thầy cô kiểm tra nhanh mà không phải chờ đến giờ.
- Phải hoạt động đúng khi **ứng dụng chạy nền/cửa sổ thu nhỏ**; kiểm tra tương tác với Screen WakeLock hiện có.

## 5. NGOÀI PHẠM VI (KHÔNG LÀM TRONG ĐỢT NÀY)

- **Lỗi "gán nhạc, khi bấm nút không thấy dòng chữ nào hiện lên":** khách hàng **chưa cung cấp thông tin cụ thể** (chưa rõ chỗ nào, nút nào, cần hiện chữ gì), nên **hoãn sang đợt sau**. **Không sửa, không đoán.** Nếu bạn tình cờ thấy chỗ nghi vấn khi đọc code, chỉ **ghi chú ngắn** vào báo cáo cuối để làm tham khảo.
- Không thay đổi nguồn phát VTV/cơ chế dán link, không đổi cách trích luồng.

## 6. CÁC ĐIỂM [CẦN HỎI] (HỎI NGƯỜI DÙNG TRƯỚC KHI CODE)

Hãy hỏi người dùng các câu sau, kèm phương án gợi ý (người dùng chọn, **bạn không tự chọn**). Có thể gộp hoặc bỏ câu nếu đọc code thấy đã có quy ước sẵn, nhưng khi bỏ phải nói rõ lý do.

**Nhóm A: Hẹn giờ tự tắt (mục 3)**
- **A1.** Hẹn giờ có cần **còn hiệu lực sau khi đóng và mở lại ứng dụng** (lưu bền) không, hay chỉ trong phiên chạy hiện tại?
- **A2.** Nếu chọn "giờ kết thúc" **đã qua** so với hiện tại (ví dụ giờ 08:30 mà lúc đặt là 09:00): báo lỗi, hay hiểu là **ngày hôm sau**?
- **A3.** Có cần **cảnh báo trước khi tắt** (ví dụ báo "còn 1 phút nữa sẽ tự tắt" kèm nút "Gia hạn") không? Nếu có thì báo trước bao lâu và gia hạn thêm mấy phút?
- **A4.** Giá trị **mặc định** khi vào chế độ thời sự: hẹn giờ tắt mặc định **bật hay tắt**? Nếu bật thì mặc định mấy phút?
- **A5.** Các mức thời lượng chọn nhanh mong muốn (ví dụ 15/30/45/60 phút) và giới hạn nhập tối đa?

**Nhóm B: Lịch tự phát/tự tắt (mục 4)**
- **B1.** Lịch thời sự nên **nằm chung** trong màn hình "Lập lịch Hẹn giờ Tự động" hiện có (thêm một loại mục mới), hay **một khu riêng** trong chế độ Thông tin thời sự?
- **B2.** Mỗi mục lịch định nghĩa kết thúc bằng **giờ kết thúc**, **thời lượng**, hay cho chọn cả hai?
- **B3.** Cho phép **nhiều mục lịch** (ví dụ sáng và chiều) hay chỉ một?
- **B4.** **Xung đột với lịch khác:** nếu đến giờ phát thời sự mà trùng với báo thức/chuông/TTS/nhạc đang hoặc sắp phát thì xử lý thế nào? Phương án gợi ý: (i) thời sự nhường, bỏ qua lần đó; (ii) tạm dừng thời sự, phát xong mục kia rồi tiếp tục; (iii) mục khác ngắt thời sự; (iv) hỏi/ghi chú cho người dùng.
- **B5.** Nếu **đến giờ phát mà ứng dụng chưa mở** hoặc máy đang tắt/sleep, có cần **bù** (chạy muộn nếu còn trong khung giờ) hay bỏ qua?
- **B6.** Nếu **link thời sự không phát được** tại giờ hẹn: chỉ hiện lỗi, hay **thử lại** (mấy lần, cách nhau bao lâu), và có phát tiếng báo/ghi nhật ký không?
- **B7.** Nếu thầy cô **đang tự phát** thời sự lúc lịch tới, hoặc **tự bấm Dừng** giữa khung giờ lịch: lịch có phát lại không, hay tôn trọng quyết định thủ công trong lần đó?
- **B8.** Có cần **ngày áp dụng đặc biệt** (ngày nghỉ lễ, ngày bỏ qua) hay chỉ theo thứ trong tuần?

**Nhóm C: Chung**
- **C1.** Chỉ cập nhật **bản desktop (Electron)**, hay cả **bản mobile/web (PWA)** và thư mục `repository/` (bản web đóng gói độc lập)? Bản mobile hiện có chế độ thời sự không?
- **C2.** Có cần **cập nhật tài liệu hướng dẫn sử dụng** (file `.docx` do `build_huong_dan_su_dung.py` sinh ra) và README cho tính năng mới không?
- **C3.** Có cần **đóng gói lại bản phát hành** (`npm run build:portable` / `build:setup`) sau khi sửa xong, hay chỉ cung cấp mã nguồn?
- **C4.** Văn bản thông báo hiển thị (câu chữ tiếng Việt) bạn đề xuất, người dùng có muốn duyệt trước không?

## 7. TIÊU CHÍ NGHIỆM THU & KỊCH BẢN KIỂM THỬ

Tự kiểm thử và báo kết quả từng mục (đạt/không đạt/không kiểm được vì sao). Khi cần có thể rút ngắn thời gian bằng chế độ giả lập đồng hồ hoặc đặt thời lượng rất ngắn.

**Hẹn giờ tự tắt**
1. Bật thời sự, đặt tự tắt theo thời lượng 1 phút: sau 1 phút luồng dừng, popup đóng, có thông báo. Đếm ngược hiển thị đúng.
2. Đặt tự tắt theo giờ kết thúc (ví dụ 2 phút sau): tắt đúng giờ.
3. Hủy hẹn giờ giữa chừng: không còn tự tắt. Đổi hẹn giờ giữa chừng: giá trị mới có hiệu lực, giá trị cũ không còn chạy.
4. Tự bấm Dừng trước giờ: không còn timer nào chạy ngầm; bật lại thời sự không bị tắt nhầm bởi hẹn giờ cũ.
5. Máy sleep/thu nhỏ cửa sổ/đổi giờ hệ thống: thời điểm tắt vẫn đúng (không trôi).
6. Giờ kết thúc đã qua, nhập số phút bằng 0/âm/chữ/quá lớn: xử lý đúng theo câu trả lời A2/A5, không lỗi.
7. Đóng/mở lại ứng dụng khi đang có hẹn giờ: hành vi đúng theo câu trả lời A1.

**Lịch tự phát/tự tắt**
8. Tạo mục lịch bắt đầu sau 1-2 phút: đến giờ tự vào chế độ thời sự, tự phát, tự mở popup; đến giờ kết thúc tự dừng, popup đóng.
9. Mục lịch chỉ áp dụng một số thứ trong tuần: ngày không áp dụng thì không chạy.
10. Tắt công tắc mục lịch hoặc xóa mục: không chạy nữa. Sửa mục lịch: áp dụng ngay.
11. Nút "Chạy thử" hoạt động mà không ảnh hưởng lịch thật.
12. Trùng giờ với báo thức/chuông/TTS/nhạc: đúng theo câu trả lời B4, **không** mất báo thức nề nếp.
13. Link thời sự lỗi lúc đến giờ: đúng theo B6, có thông báo thân thiện, không treo ứng dụng.
14. Tự bấm Dừng/Phát trong khung giờ lịch: đúng theo B7.
15. Mở lại ứng dụng sau khi lỡ giờ: đúng theo B5.
16. Lịch tồn tại sau khi khởi động lại ứng dụng (lưu bền), đọc lại đúng.

**Hồi quy (không được hỏng)**
17. Phát nhạc, thanh tua, nút pause/stop icon, TTS, lịch hẹn giờ hiện có, báo giờ nề nếp, chế độ thời sự (popup, nút bật/tắt popup, ô dán link, thông báo lỗi) hoạt động như trước.
18. Giao diện hiển thị đúng ở các kích thước màn hình đã hỗ trợ (không vỡ layout, header không đổi).
19. Không có lỗi trong console/log của renderer và main process; không rò rỉ timer (kiểm tra bật/tắt thời sự nhiều lần).

## 8. CÁCH LÀM VÀ CÁCH BÁO CÁO

1. **Bước 0:** đọc code, tóm tắt cách hoạt động hiện tại (chế độ thời sự, popup, lập lịch, IPC, nơi lưu cấu hình) trong tối đa ~15 dòng.
2. **Bước 1:** gửi **danh sách câu hỏi mục 6** (kèm phương án) và đợi trả lời.
3. **Bước 2:** đề xuất **kế hoạch thực hiện ngắn** (file nào sửa, dữ liệu lưu ở đâu, luồng xử lý, nơi đặt logic hẹn giờ) để người dùng duyệt nếu thay đổi lớn.
4. **Bước 3:** triển khai theo từng phần nhỏ (hẹn giờ tự tắt trước, lịch tự phát/tắt sau), commit rõ ràng, thông điệp commit mô tả đúng nội dung.
5. **Bước 4:** chạy kiểm thử mục 7, sửa lỗi.
6. **Báo cáo cuối** gồm: (a) các file đã sửa/thêm và lý do; (b) quyết định đã áp dụng theo câu trả lời của người dùng; (c) kết quả từng kịch bản kiểm thử; (d) hạn chế còn lại hoặc điều chưa kiểm được; (e) ghi chú về lỗi "gán nhạc" nếu có phát hiện (không sửa); (f) hướng dẫn ngắn cho thầy cô cách dùng tính năng mới bằng tiếng Việt đơn giản.

**Nhắc lại:** không tự quyết điểm [CẦN HỎI], không sửa "gán nhạc", không đổi header và phong cách giao diện, không làm hỏng chức năng đang chạy.
