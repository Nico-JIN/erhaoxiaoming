@echo off
:: Batch Script to Restart Backend with New Argon2 Auth System
:: Run this after migrating from bcrypt to Argon2

echo ========================================
echo Backend Restart - Argon2 Migration
echo ========================================
echo.

:: Check argon2-cffi installation
echo [1/3] Checking argon2-cffi installation...
.conda\Scripts\pip.exe show argon2-cffi >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] argon2-cffi is installed
) else (
    echo [WARN] argon2-cffi not found, installing...
    .conda\Scripts\pip.exe install argon2-cffi
    if %errorlevel% equ 0 (
        echo [OK] argon2-cffi installed successfully
    ) else (
        echo [ERROR] Failed to install argon2-cffi
        pause
        exit /b 1
    )
)

echo.

:: Ask about database reinitialization
echo [2/3] Database initialization
echo WARNING: This will DELETE all existing user data!
set /p response="Do you want to reinitialize the database? (y/N): "

if /i "%response%"=="y" (
    echo Reinitializing database...
    python init_db.py
    if %errorlevel% equ 0 (
        echo [OK] Database initialized successfully
        echo Default admin: username=admin, password=admin123
    ) else (
        echo [ERROR] Database initialization failed
        echo Please check the error messages above
        pause
        exit /b 1
    )
) else (
    echo [WARN] Skipping database initialization
    echo Note: Existing passwords won't work with Argon2!
    echo Run 'python fix_passwords.py' to reset passwords
)

echo.

:: Start the server
echo [3/3] Starting backend server...
echo Server will start on http://localhost:8000
echo API docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python run.py
