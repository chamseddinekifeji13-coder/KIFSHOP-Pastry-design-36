@echo off
title KIFSHOP Print Bridge
echo ========================================
echo   KIFSHOP Print Bridge - Demarrage...
echo ========================================

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERREUR: Node.js n'est pas installe !
    echo Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installation des dependances...
    npm install --silent
)

echo Bridge demarre sur http://localhost:7731
echo Laissez cette fenetre ouverte pendant l'utilisation de la caisse.
echo.

node server.js

pause
