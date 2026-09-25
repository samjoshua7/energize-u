@echo off
title Energize U — Launch All Services
color 0A

echo ========================================================
echo         Energize U - Full Stack Launch System
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check if express dependency is installed
if not exist "node_modules\express\" (
    echo [INFO] Installing required backend & frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b %errorlevel%
    )
    echo [OK] Dependencies installed successfully.
    echo.
)

:: 2. Check for .env.local
if not exist ".env.local" (
    echo [WARNING] .env.local not found! Creating from .env.example...
    copy .env.example .env.local
)

:: 3. Start Node.js Backend API Server (Port 5000)
echo [INFO] Starting Node.js Backend API Server on http://localhost:5000 ...
start "Energize U — Node Backend (Port 5000)" cmd /k "title Energize U - Node Backend && npm run server"

:: 4. Start Vite Frontend Dev Server (Port 3000)
echo [INFO] Starting Vite Frontend Dev Server on http://localhost:3000 ...
start "Energize U — Vite Frontend (Port 3000)" cmd /k "title Energize U - Vite Frontend && npm run dev"

:: 5. Wait a moment and launch the browser
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================================
echo   [SUCCESS] Both Servers Successfully Launched!
echo   Frontend (Vite UI): http://localhost:3000
echo   Backend (Node API): http://localhost:5000
echo ========================================================
echo.
echo You can keep this window open or close it. Both services
echo are running in their dedicated terminal windows.
echo.
pause
