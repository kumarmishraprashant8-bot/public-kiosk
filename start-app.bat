@echo off
echo Starting CivicPulse...

REM Start Backend
start "CivicPulse Backend" cmd /k "cd backend && py -3.11 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Start Kiosk (Includes Admin Dashboard & AR)
start "CivicPulse Kiosk" cmd /k "cd frontend-kiosk && npm run dev"

echo All services started!
echo - Backend API: http://localhost:8000/docs
echo - Main App: http://localhost:3000
echo - Admin Command Center: http://localhost:3000/admin
echo - AR Field Tool: http://localhost:3000/ar
pause
