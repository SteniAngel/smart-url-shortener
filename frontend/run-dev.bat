@echo off
REM Run the frontend dev server without relying on PowerShell npm shims
REM Usage: double-click or run from any shell: frontend\run-dev.bat

REM Move to script directory (frontend)
cd /d "%~dp0"

nREM Install dependencies if node_modules is missing
IF NOT EXIST node_modules (
  echo node_modules not found — installing dependencies...
  npm.cmd install
)

necho Starting Vite dev server (node)
node node_modules\vite\bin\vite.js
pause
