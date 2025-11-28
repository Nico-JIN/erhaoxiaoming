@echo off
:: 设置控制台编码为 UTF-8
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d %~dp0
set "PROJECT_DIR=%~dp0"

echo ===================================================
echo      二哈小明 (Erhaoxiaoming) 一键部署脚本
echo ===================================================

:: 检查必要工具
where docker >nul 2>nul
if %errorlevel% neq 0 goto ErrorDocker

where python >nul 2>nul
if %errorlevel% neq 0 goto ErrorPython

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
echo 正在升级 pip...
python -m pip install --upgrade pip
echo 正在使用清华源安装依赖...
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
if %errorlevel% neq 0 goto ErrorPip

echo 正在初始化数据库...
set PYTHONPATH=%CD%\..
python init_db.py
if %errorlevel% neq 0 goto ErrorDbInit
cd ..
echo [成功] 后端环境配置完成。

echo [3/4] 正在检查前端构建产物...
if not exist "dist" (
    echo [错误] 前端构建目录 dist 不存在！
    echo 请先运行 npm run build 构建前端。
    pause
    exit /b 1
)
echo [成功] 前端构建产物检查完成。

echo [4/4] 正在启动服务...

:: 在新窗口启动后端
echo 正在启动后端服务器...
start "Erhaoxiaoming Backend" cmd /k "cd /d "%PROJECT_DIR%backend" && venv\Scripts\activate && python run.py"

:: 在新窗口启动前端（使用 Python SPA 服务器）
echo 正在启动前端服务器...
start "Erhaoxiaoming Frontend" cmd /k "cd /d "%PROJECT_DIR%dist" && python "%PROJECT_DIR%spa_server.py""

echo ===================================================
echo      部署完成！
echo ===================================================
echo 后端 API 文档: http://localhost:8000/docs
echo 前端访问地址: http://localhost:5005
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

:ErrorDockerCompose
echo [错误] Docker 容器启动失败。
pause
exit /b 1

:ErrorPip
echo [错误] 后端依赖安装失败。
echo 请检查网络连接，或尝试手动运行: pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
pause
exit /b 1

:ErrorDbInit
echo [错误] 数据库初始化失败。
pause
exit /b 1
