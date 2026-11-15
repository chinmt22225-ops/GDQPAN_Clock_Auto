@echo off
title MAY CHU TAI KHOAN GDQPAN (PORT 4180)
echo ========================================================
echo    TRUNG TAM GIAO DUC QUOC PHONG VA AN NINH - DHQG-HCM
echo    KHOI DONG MAY CHU TAI KHOAN GDQPAN (PORT 4180)
echo ========================================================
echo.
echo Dang khoi dong may chu tai khoan tai http://127.0.0.1:4180 ...
cd /d "%~dp0server"
node --env-file-if-exists=.env src/server.js
pause
