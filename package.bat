@echo off
:: 设置控制台编码为 UTF-8
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d %~dp0

echo ===================================================
echo      二哈小明 (Erhaoxiaoming) 打包脚本
echo ===================================================

set "RELEASE_DIR=release"

:: 1. 清理旧的发布目录
if exist "%RELEASE_DIR%" (
    echo [清理] 正在删除旧的发布目录...
    rd /s /q "%RELEASE_DIR%"
)
mkdir "%RELEASE_DIR%"

:: 2. 构建前端
echo [前端] 正在安装依赖并构建...
call npm install
if %errorlevel% neq 0 goto ErrorNpmInstall

call npm run build
if %errorlevel% neq 0 goto ErrorNpmBuild

echo [前端] 正在复制构建产物...
mkdir "%RELEASE_DIR%\frontend_dist"
xcopy /s /e /y "dist\*.*" "%RELEASE_DIR%\frontend_dist\" >nul

:: 3. 复制后端代码
echo [后端] 正在复制后端代码...
mkdir "%RELEASE_DIR%\backend"
:: 排除 venv, __pycache__, .git 等不需要的文件夹
xcopy /s /e /y "backend\*.*" "%RELEASE_DIR%\backend\" >nul
:: 清理后端目录中的垃圾文件 (如果 xcopy 复制了它们)
if exist "%RELEASE_DIR%\backend\venv" rd /s /q "%RELEASE_DIR%\backend\venv"
if exist "%RELEASE_DIR%\backend\__pycache__" rd /s /q "%RELEASE_DIR%\backend\__pycache__"
if exist "%RELEASE_DIR%\backend\.pytest_cache" rd /s /q "%RELEASE_DIR%\backend\.pytest_cache"

:: 4. 复制 Docker 配置
echo [配置] 正在复制 Docker 配置文件...
copy /y "backend\docker-compose.yml" "%RELEASE_DIR%\docker-compose.yml" >nul

:: 5. 生成启动脚本 (startup.bat)
echo [脚本] 正在生成启动脚本...
(
echo @echo off
echo :: 设置控制台编码为 UTF-8
echo chcp 65001 ^>nul
echo setlocal enabledelayedexpansion
echo.
echo echo ===================================================
echo echo      二哈小明 (Erhaoxiaoming) 启动脚本
echo echo ===================================================
echo.
echo :: 检查必要工具
echo where docker ^>nul 2^>nul
echo if %%errorlevel%% neq 0 goto ErrorDocker
echo.
echo where python ^>nul 2^>nul
echo if %%errorlevel%% neq 0 goto ErrorPython
echo.
echo echo [1/4] 正在启动数据库和 MinIO 服务...
echo docker-compose up -d
echo if %%errorlevel%% neq 0 goto ErrorDockerCompose
echo echo [成功] 数据库和 MinIO 已启动。
echo.
echo echo [2/4] 正在配置后端环境...
echo cd backend
echo if not exist "venv" ^(
echo     echo 正在创建 Python 虚拟环境...
echo     python -m venv venv
echo ^)
echo.
echo echo 正在安装后端依赖...
echo call venv\Scripts\activate
echo echo 正在升级 pip...
echo python -m pip install --upgrade pip
echo echo 正在使用清华源安装依赖...
echo pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
echo if %%errorlevel%% neq 0 goto ErrorPip
echo.
echo echo 正在初始化数据库...
echo set PYTHONPATH=%%CD%%\..
echo python init_db.py
echo if %%errorlevel%% neq 0 goto ErrorDbInit
echo cd ..
echo echo [成功] 后端环境配置完成。
echo.
echo echo [3/4] 正在准备前端服务...
echo :: 创建一个简单的 Python 脚本来作为静态文件服务器
echo echo import http.server > serve_frontend.py
echo echo import socketserver >> serve_frontend.py
echo echo import os >> serve_frontend.py
echo echo PORT = 4173 >> serve_frontend.py
echo echo web_dir = os.path.join(os.path.dirname(__file__), 'frontend_dist') >> serve_frontend.py
echo echo os.chdir(web_dir) >> serve_frontend.py
echo echo Handler = http.server.SimpleHTTPRequestHandler >> serve_frontend.py
echo echo with socketserver.TCPServer(("", PORT), Handler) as httpd: >> serve_frontend.py
echo echo     print(f"Serving at port {PORT}") >> serve_frontend.py
echo echo     httpd.serve_forever() >> serve_frontend.py
echo.
echo echo [4/4] 正在启动服务...
echo.
echo :: 在新窗口启动后端
echo echo 正在启动后端服务器...
echo start "Erhaoxiaoming Backend" cmd /k "cd backend && venv\Scripts\activate && python run.py"
echo.
echo :: 在新窗口启动前端 (使用 Python 静态服务器)
echo echo 正在启动前端服务器...
echo start "Erhaoxiaoming Frontend" cmd /k "python serve_frontend.py"
echo.
echo echo ===================================================
echo echo      服务已启动！
echo echo ===================================================
echo echo 后端 API 文档: http://localhost:8000/docs
echo echo 前端访问地址: http://localhost:4173
echo echo.
echo pause
echo exit /b 0
echo.
echo :ErrorDocker
echo echo [错误] 未检测到 Docker，请先安装 Docker Desktop 并启动。
echo pause
echo exit /b 1
echo.
echo :ErrorPython
echo echo [错误] 未检测到 Python，请先安装 Python 并添加到环境变量。
echo pause
echo exit /b 1
echo.
echo :ErrorDockerCompose
echo echo [错误] Docker 容器启动失败。
echo pause
echo exit /b 1
echo.
echo :ErrorPip
echo echo [错误] 后端依赖安装失败。
echo echo 请检查网络连接，或尝试手动运行: pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
echo pause
echo exit /b 1
echo.
echo :ErrorDbInit
echo echo [错误] 数据库初始化失败。
echo pause
echo exit /b 1
) > "%RELEASE_DIR%\startup.bat"

echo ===================================================
echo      打包完成！
echo ===================================================
echo 发布包位置: %CD%\%RELEASE_DIR%
echo 您可以将 "%RELEASE_DIR%" 文件夹复制到其他机器上运行。
echo.
pause
exit /b 0

:ErrorNpmInstall
echo [错误] 前端依赖安装失败。
pause
exit /b 1

:ErrorNpmBuild
echo [错误] 前端构建失败。
pause
exit /b 1
