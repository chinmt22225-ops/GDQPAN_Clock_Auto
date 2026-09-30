# HỆ THỐNG THÔNG BÁO TỰ ĐỘNG - GDQPAN ĐHQG-HCM
### Trạm Phát Thanh Điều Khiển Tự Động Kết Hợp Âm Hiệu, Văn Bản & Giọng Nói Thông Minh (Mobile & Desktop)

> **Đơn vị chủ quản:** Trung tâm Giáo dục Quốc phòng và An ninh - Đại học Quốc gia Thành phố Hồ Chí Minh  
> **Khẩu hiệu:** *"Đoàn kết - Kỷ cương - Chất lượng - Tiên phong"*  
> **Phiên bản:** 2.0 (Mobile-First & Desktop Dual-Engine)

---

## 📌 Giới Thiệu Dự Án
Hệ thống Phát thanh - Thông báo Tự động GDQPAN là giải pháp công nghệ hiện đại giúp số hóa và tự động hóa 100% công tác điều hành nề nếp, kỷ luật quân sự tại Trung tâm GDQPAN ĐHQG-HCM.

Ứng dụng hoạt động với cơ chế **Tương thích kép 2 trong 1**:
- **Trên Máy tính để bàn (Desktop Dashboard):** Hiển thị bảng điều khiển toàn cảnh tại Phòng Trực ban Chỉ huy, bao quát 7 phân khu chức năng rộng rãi.
- **Trên Điện thoại Di động (Mobile App UI):** Tự động chuyển thành giao diện ứng dụng di động theo chuẩn thiết kế `giao_dien_mobile.jpg`, tối ưu thao tác chạm một tay cho cán bộ khi đi kiểm tra ngoài thao trường, giảng đường, ký túc xá.

---

## 🌟 Các Tính Năng Cốt Lõi

1. **Nghi lễ Chào cờ & Duyệt đội ngũ:**
   - Quốc ca không lời (hòa tấu quân đội trang nghiêm).
   - Quốc ca có lời (Tiến quân ca).
   - Nhạc Duyệt đội ngũ (hành khúc duyệt binh hào hùng).

2. **Hiệu lệnh Báo động & Tập hợp:**
   - Còi báo động phòng không / tác chiến dồn dập (tổng hợp trực tiếp bằng Web Audio API).
   - Còi hiệu chỉ huy tập hợp quân số nhanh.
   - Báo động tập hợp khẩn cấp.

3. **9 Chế độ Sinh hoạt Nề nếp Quân đội trong ngày:**
   - 05:30 Báo thức
   - 05:45 Thể dục sáng
   - 07:00 Chuẩn bị học tập / Làm việc
   - 07:15 Bắt đầu học tập
   - 09:00 Nghỉ giải lao & Hết giờ giải lao
   - 11:15 Hết giờ học tập & Giờ ăn cơm
   - 11:45 Giờ nghỉ trưa
   - 21:00 Điểm danh quân số
   - 21:30 Tắt đèn đi ngủ
   *(Tự động phát chuông hiệu dẫn nhập ➔ phát giọng đọc thông báo).*

4. **Phát thanh Âm nhạc:**
   - Nhạc truyền thống Trung tâm GDQPAN, Nhạc cách mạng, Nhạc trẻ, Bolero, Trữ tình.
   - Cho phép tải thêm bài hát MP3/WAV từ máy và lưu vĩnh viễn trong IndexedDB.

5. **Phát Thông báo bằng Giọng nói Thông minh (TTS 3 Miền):**
   - Soạn thảo nội dung văn bản bất kỳ.
   - Lựa chọn giọng phát thanh viên 3 miền (Bắc - Trung - Nam, Nam/Nữ).
   - Tự động đổ chuông hiệu "Tùng tùng tùng" trước khi đọc.
   - Hỗ trợ kết nối Online AI TTS (FPT.AI / Zalo AI) khi có API Key.

6. **Lập lịch Hẹn giờ Tự động:**
   - Hẹn giờ theo từng phút và theo Thứ trong tuần (T2 - CN).
   - Công tắc bật/tắt từng lịch hẹn.
   - Tích hợp Screen WakeLock API giúp giữ màn hình điện thoại luôn sáng, không bị trễ lịch khi chạy tự động.

7. **Tùy biến Âm thanh Hiệu lệnh:**
   - Cho phép đơn vị thay đổi tệp âm thanh riêng cho bất kỳ nút hiệu lệnh nào và lưu bền vững vào IndexedDB.
   - Nút khôi phục âm thanh gốc an toàn bất cứ lúc nào.

---

## 📂 Cấu Trúc Mã Nguồn

```
web_QPAN/
├── index.html                                        # Giao diện chính đa nền tảng (Modular)
├── HE_THONG_THONG_BAO_TU_DONG_MOBILE.html            # Bản đóng gói độc lập 1 file duy nhất
├── css/
│   └── style.css                                     # Master CSS (Desktop & Mobile Pixel-Perfect)
├── js/
│   ├── storage.js                                    # Quản lý IndexedDB & LocalStorage
│   ├── audio-engine.js                               # Bộ tổng hợp âm thanh Web Audio Synthesizer
│   ├── tts-engine.js                                 # Xử lý giọng đọc 3 miền & Chime sequence
│   ├── scheduler.js                                  # Lập lịch tự động & Screen WakeLock
│   └── app.js                                        # Controller điều phối giao diện
├── assets/
│   ├── logo_gdqpan.png                               # Logo chuẩn Trung tâm GDQPAN
│   ├── banner_campus.jpg                             # Cảnh quan hồ nước khuôn viên GDQPAN
│   ├── giao_dien_desktop.png                         # Ảnh chụp giao diện Desktop thực tế
│   └── giao_dien_mobile.jpg                          # Ảnh thiết kế chuẩn Mobile
├── KE_HOACH_TRIEN_KHAI_HE_THONG_THONG_BAO_TU_DONG_v2.docx # Tài liệu trình Lãnh đạo phê duyệt
└── README.md                                         # Hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Sử Dụng & Triển Khai

### 1. Sử dụng Nhanh (Gói 1)
- Nhấp đúp chuột vào tệp `HE_THONG_THONG_BAO_TU_DONG_MOBILE.html` trên bất kỳ máy tính hoặc điện thoại nào.
- Ứng dụng chạy ngay lập tức, đầy đủ âm thanh và giọng đọc mà không cần kết nối mạng hay cài đặt web server.

### 2. Triển khai Web Server / GitHub Pages (Gói 2)
1. Đẩy toàn bộ thư mục lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Khoi tao He thong Thong bao Tu dong GDQPAN v2.0"
   git branch -M main
   git remote add origin <URL_REPOSITORY_CUA_BAN>
   git push -u origin main
   ```
2. Kích hoạt GitHub Pages trong mục `Settings > Pages` để đưa trang web lên Internet miễn phí.
