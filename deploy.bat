@echo off
cd /d C:\Users\Andrei\webos-tvheadend

echo.
echo [1/4] Compilare...
set NODE_OPTIONS=
call npm run build
if errorlevel 1 (
    echo EROARE la compilare!
    pause
    exit /b 1
)

echo.
echo [2/4] Packaging...
call ares-package build service
if errorlevel 1 (
    echo EROARE la packaging!
    pause
    exit /b 1
)

echo.
echo [3/4] Upload pe TV...
scp com.willinux.tvh.app_0.8.4_all.ipk root@192.168.69.222:/tmp/
if errorlevel 1 (
    echo EROARE la upload!
    pause
    exit /b 1
)

echo.
echo [4/4] Instalare pe TV...
ssh root@192.168.69.222 "luna-send -n 1 luna://com.webos.appInstallService/dev/install '{\"id\":\"com.willinux.tvh.app\",\"ipkUrl\":\"/tmp/com.willinux.tvh.app_0.8.4_all.ipk\",\"subscribe\":true}'"

echo.
echo Astept instalarea...
timeout /t 5 /nobreak >nul

echo.
echo Lansare aplicatie...
call ares-launch com.willinux.tvh.app -d LG

echo.
echo GATA!
pause