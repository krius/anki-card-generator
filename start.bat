@echo off
REM Anki AI 卡片生成器 - 一键启动脚本
REM 适用于 Windows 系统

echo 🎴 Anki AI 卡片生成器启动中...
echo ================================

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装！请先安装 Node.js 18+
    pause
    exit /b 1
)

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 未安装！请先安装 Python 3.11+
    pause
    exit /b 1
)

REM 检查环境变量文件
if not exist "backend-python\.env" (
    echo ⚠️  未找到 .env 文件
    echo 请确保已配置 backend-python\.env 文件，包含 ZHIPU_API_KEY
    echo 可以从 backend-python\.env.example 复制模板
    set /p continue=是否继续？(y/n):
    if /i not "%continue%"=="y" exit /b 1
)

REM 启动后端
echo 🚀 启动后端服务...
cd backend-python

REM 检查虚拟环境
if not exist ".venv" (
    echo 创建虚拟环境...
    python -m venv .venv
)

REM 激活虚拟环境
call .venv\Scripts\activate.bat

REM 检查依赖
if not exist ".venv\Lib\site-packages\fastapi" (
    echo 安装后端依赖...
    pip install -r requirements.txt
)

REM 启动后端（新窗口）
start "Anki Backend" cmd /k "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

cd ..

REM 等待后端启动
echo 等待后端服务启动...
timeout /t 5 /nobreak >nul

REM 启动前端
echo 🚀 启动前端服务...
cd frontend

REM 检查依赖
if not exist "node_modules" (
    echo 安装前端依赖...
    npm install
)

REM 启动前端（新窗口）
start "Anki Frontend" cmd /k "npm start"

cd ..

echo.
echo 🎉 服务启动成功！
echo ================================
echo 前端地址: http://localhost:3000
echo API文档: http://localhost:8000/docs
echo.
echo 关闭窗口即可停止对应服务
echo.

pause