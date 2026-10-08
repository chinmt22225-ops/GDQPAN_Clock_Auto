# 📱 GDQPAN MOBILE APP (CAPACITOR NATIVE)
**Hệ thống Thông báo Tự động – Trung tâm Giáo dục Quốc phòng và An ninh (ĐHQG-HCM)**

---

## 📌 Tổng quan dự án

Dự án này là phiên bản ứng dụng di động chính thức của Hệ thống Thông báo Tự động GDQPAN, được đóng gói bằng **Capacitor 8** từ mã nguồn Web đã được tối ưu hóa ở Giai đoạn 1.

* **Tên ứng dụng**: GDQPAN
* **Mã định danh gói (Application ID)**: `vn.gdqpan.app`
* **Nền tảng mục tiêu**: Android (Smartphone & Tablet) & iOS (iPhone & iPad)
* **Thư mục Web runtime**: `www/`
* **Thư mục Android Native**: `android/`

---

## 🛠️ Các Native Plugins đã tích hợp

| Plugin | Mục đích | Cách hoạt động |
|---|---|---|
| `@capacitor/local-notifications` | **Chạy lịch phát khi tắt màn hình** | Đồng bộ toàn bộ lịch phát của người dùng vào hệ thống báo thức cục bộ của Android/iOS để đổ chuông đúng giờ kể cả khi máy đang ngủ/khóa màn hình. |
| `@capacitor-community/text-to-speech` | **Giọng đọc tiếng Việt Native chất lượng cao** | Tận dụng trực tiếp cỗ máy Text-To-Speech của hệ điều hành Android/iOS thay vì phụ thuộc Web Speech API của trình duyệt. |
| `@capacitor-community/keep-awake` | **Giữ sáng màn hình trực ban** | Giữ thiết bị luôn sáng màn hình khi đang trực ban phát thanh. |
| `@capacitor/filesystem` | **Lưu trữ âm thanh nội bộ** | Quản lý tệp âm thanh hiệu lệnh và nhạc truyền thống trên bộ nhớ máy. |

---

## 📁 Cấu trúc thư mục

```
d:\GDQPAN\mobile\
├── android/                    # Dự án Android Studio thuần (Gradle, Java/Kotlin)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml   # Cấu hình quyền chạy nền, WAKE_LOCK, ALARM
│   │   │   ├── assets/public/        # Web assets tự động đồng bộ từ www/
│   │   │   └── res/                  # Biểu tượng launcher và tài nguyên
│   │   └── build.gradle
│   └── gradlew.bat
├── www/                        # Mã nguồn Web chạy trong WebView
│   ├── index.html              # Giao diện chính (kèm NativeBridge)
│   ├── assets/                 # Logo, banner và đồ họa
│   └── Sound/                  # Âm thanh hiệu lệnh
├── capacitor.config.json       # Cấu hình Capacitor
├── package.json                # Dependencies và build scripts
├── dong_bo_android.bat         # Script 1-click đồng bộ web sang Android
├── mo_android_studio.bat       # Script mở nhanh dự án trong Android Studio
└── .github/workflows/          # CI/CD tự động xuất file .APK trên GitHub
```

---

## 🚀 Hướng dẫn phát triển & Build ứng dụng

### 1. Đồng bộ khi sửa đổi giao diện Web
Sau khi chỉnh sửa mã nguồn trong thư mục `www/`, chạy script:
```bash
dong_bo_android.bat
# hoặc lệnh:
npx cap sync android
```

### 2. Mở dự án trong Android Studio & Xuất APK
1. Cài đặt **Android Studio** (nếu chưa có).
2. Nhấn đúp chuột vào `mo_android_studio.bat` hoặc mở thư mục `d:\GDQPAN\mobile\android` trong Android Studio.
3. Trong Android Studio, chọn menu: **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)**.
4. Tệp APK debug sẽ được tạo tại:
   `android/app/build/outputs/apk/debug/app-debug.apk`
5. Chép file APK này vào điện thoại Android để cài đặt trực tiếp.

### 3. Tự động xuất file APK qua GitHub Actions (Không cần cài Android Studio)
Dự án đã có sẵn workflow `.github/workflows/build-android.yml`.
Khi bạn đẩy (push) mã nguồn lên GitHub:
1. GitHub Actions sẽ tự động cài đặt JDK, Node.js và build APK trên máy ảo Ubuntu.
2. Tệp `app-debug.apk` sẽ sẵn sàng tải về trong mục **Actions ➔ Artifacts**.

### 4. Mở rộng sang iOS (iPhone / iPad)
Trên máy tính macOS:
```bash
npm install @capacitor/ios
npx cap add ios
npx cap open ios
```
Dự án sẽ mở trực tiếp trong **Xcode** để biên dịch cho iPhone và iPad.
