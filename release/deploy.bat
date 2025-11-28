@echo off
:: 设置控制台编码为 UTF-8
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ===================================================
echo      二哈小明 (Erhaoxiaoming) 一键部署脚本
echo ===================================================

:: 检查必要工具
where docker >nul 2>nul
if %errorlevel% neq 0 goto ErrorDocker

where python >nul 2>nul
if %errorlevel% neq 0 goto ErrorPython

where npm >nul 2>nul
if %errorlevel% neq 0 goto ErrorNpm

echo [1/4] 正在启动数据库和 MinIO 服务...
cd backend
docker-compose up -d
if %errorlevel% neq 0 goto ErrorDockerCompose
cd ..
echo [成功] 数据库和 MinIO 已启动。

echo [2/4] 正在配置后端环境...
cd backend
if not exist "venv" (
    echo 正在创建 Python 虚拟环境...
    python -m venv venv
)

echo 正在安装后端依赖...
call venv\Scripts\activate
pip install -r requirements.txt
if %errorlevel% neq 0 goto ErrorPip

echo 正在初始化数据库...
python init_db.py
if %errorlevel% neq 0 goto ErrorDbInit
cd ..
echo [成功] 后端环境配置完成。

echo [3/4] 正在配置前端环境...
if not exist "node_modules" (
    echo 正在安装前端依赖...
    call npm install
    if %errorlevel% neq 0 goto ErrorNpmInstall
)

echo 正在构建前端项目...
call npm run build
if %errorlevel% neq 0 goto ErrorNpmBuild
echo [成功] 前端环境配置完成。

echo [4/4] 正在启动服务...

:: 在新窗口启动后端
echo 正在启动后端服务器...
start "Erhaoxiaoming Backend" cmd /k "cd backend && venv\Scripts\activate && python run.py"

:: 在新窗口启动前端
echo 正在启动前端服务器...
echo 正在启动前端 (预览模式)...
start "Erhaoxiaoming Frontend" cmd /k "npm run preview"

echo ===================================================
echo      部署完成！
echo ===================================================
echo 后端 API 文档: http://localhost:8000/docs
echo 前端访问地址: http://localhost:4173 (请以弹出的窗口提示为准)
echo.
pause
exit /b 0

:: 错误处理标签
:ErrorDocker
echo [错误] 未检测到 Docker，请先安装 Docker Desktop 并启动。
pause
exit /b 1

:ErrorPython
echo [错误] 未检测到 Python，请先安装 Python 并添加到环境变量。
pause
exit /b 1

:ErrorNpm
echo [错误] 未检测到 Node.js (npm)，请先安装 Node.js。
pause
exit /b 1

:ErrorDockerCompose
echo [错误] Docker 容器启动失败。
pause
exit /b 1

:ErrorPip
echo [错误] 后端依赖安装失败。
pause
exit /b 1

:ErrorDbInit
echo [错误] 数据库初始化失败。
pause
exit /b 1

:ErrorNpmInstall
echo [错误] 前端依赖安装失败。
pause
exit /b 1

:ErrorNpmBuild
echo [错误] 前端构建失败。
pause
exit /b 1
