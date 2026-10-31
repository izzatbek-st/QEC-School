@echo off
setlocal
set "ROOT=%~dp0"

echo ===================================================
echo EduMaster dasturini ishga tushirish
echo ===================================================

if not exist "%ROOT%backend\venv\Scripts\python.exe" (
    py -3 -m venv "%ROOT%backend\venv"
    if errorlevel 1 goto :error
)

"%ROOT%backend\venv\Scripts\python.exe" -m pip install -r "%ROOT%backend\requirements.txt"
if errorlevel 1 goto :error

if not exist "%ROOT%teacher\node_modules\vite\bin\vite.js" (
    pushd "%ROOT%teacher"
    call npm ci
    if errorlevel 1 goto :error
    popd
)

if not exist "%ROOT%student\node_modules\vite\bin\vite.js" (
    pushd "%ROOT%student"
    call npm ci
    if errorlevel 1 goto :error
    popd
)

start "Backend Server" cmd /k "cd /d ""%ROOT%backend"" && ""%ROOT%backend\venv\Scripts\python.exe"" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
start "Teacher Panel" cmd /k "cd /d ""%ROOT%teacher"" && npm run dev"
start "Student Panel" cmd /k "cd /d ""%ROOT%student"" && npm run dev"

echo.
echo O'qituvchi: http://localhost:5174/teacher/
echo O'quvchi:   http://localhost:5173/student/
echo Server oynalarini yopmang.
exit /b 0

:error
echo Ishga tushirishda xatolik yuz berdi. Python va Node.js o'rnatilganini tekshiring.
pause
exit /b 1
