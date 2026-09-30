@echo off
chcp 65001 >nul
title DICH VU GIONG DOC AI NEURAL - GDQPAN
echo =========================================================
echo    HỆ THỐNG THÔNG BÁO TỰ ĐỘNG GDQPAN
echo    ĐANG KHỞI ĐỘNG DỊCH VỤ GIỌNG ĐỌC AI NEURAL
echo =========================================================
echo.
echo Cổng kết nối: http://127.0.0.1:5050
echo Giọng Nữ: vi-VN-HoaiMyNeural (Chuẩn phát thanh viên)
echo Giọng Nam: vi-VN-NamMinhNeural (Bù nhịp điệu tự nhiên)
echo.
echo Giữ cửa sổ này mở trong khi mở file HTML trên trình duyệt web.
echo ---------------------------------------------------------

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [GDQPAN] Khoi chay qua Node.js Native: tts_server.js
    node "%~dp0tts_server.js"
    goto :end
)

set "PY_BIN="
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" set "PY_BIN=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
if not defined PY_BIN (
    if exist "%LOCALAPPDATA%\hermes\hermes-agent\venv\Scripts\python.exe" set "PY_BIN=%LOCALAPPDATA%\hermes\hermes-agent\venv\Scripts\python.exe"
)
if not defined PY_BIN set "PY_BIN=python"

"%PY_BIN%" "%~dp0tts_service.py"

:end
pause
