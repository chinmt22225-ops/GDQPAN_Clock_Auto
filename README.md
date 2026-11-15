# HỆ THỐNG THÔNG BÁO & PHÁT THANH TỰ ĐỘNG - GDQPAN ĐHQG-HCM

> **Đơn vị chủ quản:** Trung tâm Giáo dục Quốc phòng và An ninh - Đại học Quốc gia Thành phố Hồ Chí Minh  
> **Khẩu hiệu:** *"Đoàn kết - Kỷ cương - Chất lượng - Tiên phong"*  
> **Bản chính thức đã đóng gói:** Windows 1.4.3 · Android 1.4.4
> **Demo 15/10/2026:** Windows 1.4.4 trong `version_windows/demo-1.4.4`, APK `mobile/GDQPAN-1.4.5-demo.apk`. API/trang quản trị riêng: https://hethongtruyenthongso-demo.onrender.com. Chưa bật email nên đăng ký thật chưa dùng được; Render Free không giữ dữ liệu lâu dài. [Báo cáo demo](BAO_CAO_DUYET_TAI_KHOAN_2026-10-15.md).
> Gói Windows trong `version_windows/dist-1.4.3`, APK trong `mobile`. Giao diện tài khoản nằm trong Cài đặt. Báo cáo mới: [BAO_CAO_UI_TAI_KHOAN_2026-10-14.md](BAO_CAO_UI_TAI_KHOAN_2026-10-14.md). Các bản sửa backend cần cập nhật máy chủ riêng; đóng gói ứng dụng không tự triển khai máy chủ.
>
> Thư viện nhạc mới gồm 93 bài đóng gói sẵn từ sáu thư mục, giữ nhạc cũ; chỉ Phòng thu được thêm âm thanh. Xem [NHAT_KY_CAP_NHAT.md](NHAT_KY_CAP_NHAT.md) để biết các bài lỗi đã bỏ qua, kết quả kiểm thử và gói bàn giao.

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
   - 93 bài mới được đóng gói sẵn theo sáu danh mục; thư viện chỉ xem và phát, không tải thêm bài. Chỉ Phòng thu được nhập thêm âm thanh.

5. **Phát Thông báo bằng Giọng nói Thông minh (TTS 3 Miền):**
   - Soạn thảo nội dung văn bản tùy chỉnh.
   - Giọng phát thanh viên 3 miền (Bắc - Trung - Nam, Nam/Nữ).
   - Tự động đổ chuông báo trước khi phát thanh.

6. **Tiếp sóng Thời sự Trực tuyến (VTV1 HD, QPVN, VNews, YouTube):**
   - Tích hợp cửa sổ phát luồng truyền hình trực tuyến VTV1 Thời sự & Tin tức mượt mà, hỗ trợ HLS stream.
   - **Hẹn giờ tự tắt thời sự:** Cài đặt tắt theo thời lượng (15, 30, 45, 60 phút hoặc tùy chỉnh) hoặc theo giờ kết thúc cụ thể; đếm ngược thời gian thực từng giây; tự động đóng pop-up khi hết giờ; duy trì hiệu lực bền vững sau khi tắt/mở lại app.
   - **Lịch tự động phát và tắt thời sự (Khu riêng biệt):** Quản lý các khung giờ phát tin hàng ngày độc lập với lịch nề nếp; tích hợp nút "Chạy thử"; **đảm bảo nguyên tắc ưu tiên tuyệt đối cho báo thức nề nếp** (thời sự tự động tạm dừng hoặc hoãn phát để nhường loa cho chuông báo thức).

7. **Lập lịch Hẹn giờ Tự động:**
   - Hẹn giờ theo thời gian và ngày trong tuần.
   - Tích hợp Screen WakeLock chống tắt màn hình khi vận hành tự động.

8. **Ghép Âm thanh nền trong lúc Nói & Thu âm chuyên nghiệp (3 Tab):**
   - Hỗ trợ trộn âm số (Digital Audio Mixing) đồng thời cho cả 3 chế độ: Đọc văn bản AI, Tự thu âm qua Micro và Ghép chuỗi âm thanh.
   - **Hệ thống 2 thanh trượt âm lượng độc lập:** Thang 0% - 100% (Mặc định Giọng đọc / Mic / Nội dung chính: 100%, Nhạc nền: 25%), điều chỉnh mượt mà theo thời gian thực và tự động lưu cấu hình bền vững vào bộ nhớ (`localStorage`).
   - **Hỗ trợ đa dạng nguồn âm thanh nền:** Nhạc truyền thống có sẵn trong thư mục `Sound/`, Tệp âm thanh từ máy tính (.mp3, .wav, .m4a), và Đường link trực tuyến (YouTube, Podcast, MP3 online).
   - **Cơ chế ngắt kết nối an toàn khi mất mạng:** Tự động phát hiện khi mất kết nối Internet, ngắt luồng phát trực tuyến và hiển thị cảnh báo hướng dẫn chuyển sang tệp âm thanh có sẵn trên máy tính hoặc thư mục `Sound/`.
   - **Khử vang tự động & Cảnh báo đeo tai nghe:** Tự động kích hoạt khử vang và lọc nhiễu môi trường (`echoCancellation`, `noiseSuppression`, `autoGainControl`) kèm khuyến nghị đeo tai nghe để bản thu không bị dội âm từ loa ngoài.
   - **Kiểm soát tính tương thích khi lập lịch:** Tự động phát hiện và cảnh báo khi người dùng gán giọng Web Speech API kèm nhạc nền vào lịch phát tự động, hướng dẫn chuyển sang giọng Online AI.

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

---

## 🛡️ Đơn Vị Quản Lý & Vận Hành Phần Mềm
 
- **Đơn vị quản lý:** Trung tâm Giáo dục Quốc phòng và An ninh — Đại học Quốc gia Thành phố Hồ Chí Minh
- **Mục đích sử dụng:** Phục vụ công tác quản lý, điều hành nề nếp sinh hoạt và phát thanh quân sự nội bộ.

