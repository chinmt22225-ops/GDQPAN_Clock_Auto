# HỆ THỐNG THÔNG BÁO & PHÁT THANH TỰ ĐỘNG - GDQPAN ĐHQG-HCM

> **Đơn vị chủ quản:** Trung tâm Giáo dục Quốc phòng và An ninh - Đại học Quốc gia Thành phố Hồ Chí Minh  
> **Khẩu hiệu:** *"Đoàn kết - Kỷ cương - Chất lượng - Tiên phong"*  
> **Phiên bản:** 1.0.0 (Desktop Electron App & Web/PWA Dual-Engine)

---

## 📌 Giới Thiệu Dự Án
Hệ thống Phát thanh & Báo thức Tự động GDQPAN là giải pháp công nghệ số hóa và tự động hóa 100% công tác điều hành nề nếp, kỷ luật quân sự, phát thanh hiệu lệnh và tin tức thời sự tại Trung tâm GDQPAN ĐHQG-HCM.

Ứng dụng hỗ trợ hai phương thức hoạt động:
1. **Ứng dụng Desktop (Electron):** Cài đặt hoặc chạy trực tiếp trên Windows (Trực ban Chỉ huy), tích hợp phát sóng trực tiếp VTV1 / Tiếp sóng thời sự, dịch vụ đọc văn bản TTS cục bộ / ngoại tuyến qua Edge TTS, tự động báo giờ chuẩn xác.
2. **Web / PWA (Mobile-First):** Giao diện chạy mượt mà trên trình duyệt điện thoại và máy tính, tối ưu cho cán bộ kiểm tra ngoài thao trường, giảng đường.

---

## 🌟 Các Tính Năng Nổi Bật

1. **Nghi lễ Chào cờ & Duyệt đội ngũ:**
   - Quốc ca không lời (Hòa tấu quân nhạc trang nghiêm).
   - Quốc ca có lời (Tiến quân ca).
   - Nhạc Duyệt đội ngũ quân đội hào hùng.

2. **Hiệu lệnh Báo động & Tập hợp:**
   - Còi báo động phòng không / tác chiến dồn dập (Web Audio API Synthesizer).
   - Còi hiệu chỉ huy tập hợp quân số nhanh.
   - Báo động tập hợp khẩn cấp.

3. **Chế độ Sinh hoạt Nề nếp Quân đội trong ngày:**
   - 05:30 Báo thức
   - 05:45 Thể dục sáng
   - 07:00 Chuẩn bị học tập / Làm việc
   - 07:15 Bắt đầu học tập
   - 09:00 Nghỉ giải lao & Hết giờ giải lao
   - 11:15 Hết giờ học tập & Giờ ăn cơm
   - 11:45 Giờ nghỉ trưa
   - 21:00 Điểm danh quân số
   - 21:30 Tắt đèn đi ngủ
   *(Tự động phát chuông hiệu dẫn nhập kết hợp phát giọng đọc thông báo).*

4. **Phát thanh Âm nhạc & Truyền thống:**
   - Nhạc truyền thống Trung tâm GDQPAN, nhạc hành khúc cách mạng.
   - Tải thêm các bài hát định dạng MP3/WAV/M4A lưu trữ trực tiếp.

5. **Phát Thông báo bằng Giọng nói Thông minh (TTS 3 Miền):**
   - Soạn thảo nội dung văn bản tùy chỉnh.
   - Giọng phát thanh viên 3 miền (Bắc - Trung - Nam, Nam/Nữ).
   - Tự động đổ chuông báo trước khi phát thanh.

6. **Tiếp sóng Thời sự Trực tuyến (VTV1 HD / YouTube):**
   - Tích hợp cửa sổ phát luồng truyền hình trực tuyến VTV1 Thời sự & Tin tức mượt mà, hỗ trợ HLS stream.

7. **Lập lịch Hẹn giờ Tự động:**
   - Hẹn giờ theo thời gian và ngày trong tuần.
   - Tích hợp Screen WakeLock chống tắt màn hình khi vận hành tự động.

---

## 📂 Cấu Trúc Mã Nguồn

```
Web Báo thức/
├── HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html # Giao diện trung tâm điều khiển Desktop
├── HE_THONG_THONG_BAO_TU_DONG_MOBILE.html  # Giao diện đóng gói dành cho Mobile
├── vtv_player.html                         # Trình phát luồng trực tuyến VTV1
├── main.js                                 # Tiến trình chính Electron
├── preload.js                              # Cầu nối IPC an toàn Electron
├── tts_server.js                           # Máy chủ Node.js Edge-TTS
├── tts_service.py                          # Dịch vụ Python Edge-TTS
├── chay_dich_vu_giong_doc.bat              # Script khởi động dịch vụ TTS
├── chay_phan_mem_GDQPAN.bat                # Script khởi động nhanh phần mềm
├── package.json                            # Cấu hình dự án & electron-builder
├── assets/                                 # Hình ảnh, biểu tượng, logo GDQPAN
├── config/                                 # Cấu hình kênh thời sự & tham số
├── Sound/                                  # Tệp âm thanh hiệu lệnh, nhạc lễ & giọng mẫu
└── repository/                             # Phiên bản Web đóng gói độc lập
```

---

## 🛠 Hướng Dẫn Cài Đặt & Phát Triển

### Yêu cầu hệ thống:
- Node.js (khuyến nghị phiên bản 18 trở lên)
- Python 3.8+ (nếu sử dụng dịch vụ TTS Python)

### Cài đặt thư viện:
```bash
npm install
```

### Chạy ứng dụng chế độ phát triển:
```bash
npm start
```

### Đóng gói ứng dụng Desktop (Windows):
```bash
# Đóng gói bản Portable
npm run build:portable

# Đóng gói bộ cài đặt Setup NSIS
npm run build:setup
```
