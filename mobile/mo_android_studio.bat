@echo off
chcp 65001 >nul
echo ========================================================
echo   MỞ DỰ ÁN MOBILE TRONG ANDROID STUDIO
echo   Trung tâm GDQPAN - ĐHQG-HCM
echo ========================================================
cd /d "%~dp0"
call npx cap open android
pause
