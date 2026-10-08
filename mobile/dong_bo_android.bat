@echo off
chcp 65001 >nul
echo ========================================================
echo   ĐỒNG BỘ DỮ LIỆU WEB SANG DỰ ÁN NATIVE ANDROID
echo   Trung tâm GDQPAN - ĐHQG-HCM
echo ========================================================
cd /d "%~dp0"
call npx cap sync android
echo.
echo [OK] Đã đồng bộ hoàn tất vào thư mục android/!
pause
