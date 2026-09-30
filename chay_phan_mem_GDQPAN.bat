@echo off
title KHOI DONG PHAN MEM GDQPAN
echo ========================================================
echo    TRUNG TAM GIAO DUC QUOC PHONG VA AN NINH - DHQG-HCM
echo    KHOI DONG PHAN MEM CHINH THUC: GDQPAN
echo ========================================================
echo.
echo Dang khoi dong phan mem va dich vu am thanh AI tu dong...
taskkill /F /IM GDQPAN.exe >nul 2>&1
if exist "%~dp0dist\win-unpacked\GDQPAN.exe" (
    cd /d "%~dp0dist\win-unpacked"
    start "" "GDQPAN.exe"
) else (
    cd /d "%~dp0"
    start "" npx.cmd electron .
)
