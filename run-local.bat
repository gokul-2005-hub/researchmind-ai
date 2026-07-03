@echo off
echo ======================================================================
echo           ResearchMind AI - Local Host Development Starter
echo ======================================================================
echo.

:: Navigate to project root
cd %~dp0

:: Check backend virtual env
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo [INFO] Creating local backend env file from template...
        copy "backend\.env.example" "backend\.env"
        echo [WARN] Please edit backend\.env to supply your OPENAI_API_KEY!
    )
)

:: Start Backend service in a new CMD terminal
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000...
start "ResearchMind Backend Server" cmd /k "cd backend && .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Start Frontend service in a new CMD terminal
echo [2/2] Launching Vite React Client on http://localhost:5173...
start "ResearchMind Frontend Client" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================================
echo Local stack servers initiated.
echo.
echo - Web Dashboard: http://localhost:5173
echo - Swagger API docs: http://127.0.0.1:8000/docs
echo - Backend Healthcheck: http://127.0.0.1:8000/health
echo ======================================================================
echo.
pause
