@echo off
chcp 65001 >nul
title GhostPilot Kurulum
setlocal
set "DIR=%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%DIR%kur.py" %*
  goto end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python "%DIR%kur.py" %*
  goto end
)
echo.
echo [X] Python 3 bulunamadi.
echo     https://www.python.org/downloads/ adresinden kurun.
echo     Kurulumda "Add Python to PATH" kutusunu isaretleyin.
echo.
pause
:end
if "%~1"=="" pause
