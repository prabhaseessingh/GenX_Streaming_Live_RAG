@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo [GenX] Checking backend setup...
if not exist "backend\.env" (
  copy /Y "backend\.env.example" "backend\.env" >nul
  echo [GenX] Created backend\.env from backend\.env.example. Add GROQ_API_KEY if needed.
)
if not exist "backend\.venv\Scripts\python.exe" (
  echo [GenX] Creating backend virtual environment...
  py -3 -m venv "backend\.venv"
  if errorlevel 1 (
    echo [GenX] Could not create the Python virtual environment.
    exit /b 1
  )
  "backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
  if errorlevel 1 exit /b 1
) else (
  echo [GenX] Backend virtual environment already exists.
)
if not exist "frontend\node_modules" (
  echo [GenX] Installing frontend packages...
  call npm --prefix "frontend" install
  if errorlevel 1 exit /b 1
) else (
  echo [GenX] Frontend packages already installed.
)

echo [GenX] Starting backend at http://127.0.0.1:8000 ...
start "GenX Backend" cmd /k "cd /d "%ROOT%backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [GenX] Starting frontend at http://127.0.0.1:3000 ...
start "GenX Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo [GenX] Both services are starting.
echo [GenX] Frontend: http://127.0.0.1:3000
echo [GenX] Backend:  http://127.0.0.1:8000/health
endlocal

