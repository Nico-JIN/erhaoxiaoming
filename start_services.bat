@echo off
:: 设置控制台编码为 UTF-8，防止中文乱码
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ===================================================
echo      启动二哈小明 (Erhaoxiaoming) 服务
echo ===================================================

echo [1/3] 正在检查数据库和 MinIO 服务...
cd backend
docker-compose up -d
cd ..

echo [2/3] 正在启动后端服务...
start "Erhaoxiaoming Backend" cmd /k "cd backend && venv\Scripts\activate && python run.py"

echo [3/3] 正在启动前端服务...
start "Erhaoxiaoming Frontend" cmd /k "npm run preview"

echo ===================================================
echo      服务已启动！
echo ===================================================
echo 后端 API 文档: http://localhost:8000/docs
echo 前端访问地址: http://localhost:4173
echo.
pause
