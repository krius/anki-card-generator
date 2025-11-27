@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Anki卡片生成器 - Windows一键启动脚本
:: Version: 1.0.0

title Anki卡片生成器

echo.
echo ===================================
echo   Anki卡片生成器
echo   智能学习卡片生成工具
echo ===================================
echo.

:: 检查Node.js
echo [STEP] 检查系统环境...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ 错误: 请先安装Node.js (版本 >= 16.0.0)
    echo     下载地址: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1-3 delims=." %%a in ('node -v') do set NODE_VERSION=%%a.%%b.%%c
echo ✅ Node.js版本: %NODE_VERSION%

:: 检查npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ 错误: 请先安装npm
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('npm -v') do set NPM_VERSION=%%a
echo ✅ npm版本: %NPM_VERSION%

:: 检查项目结构
if not exist "backend" (
    echo ❌ 错误: 后端目录 'backend' 不存在
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ 错误: 前端目录 'frontend' 不存在
    pause
    exit /b 1
)

echo ✅ 项目结构检查通过
echo.

:: 配置环境变量
echo [STEP] 配置环境变量...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo ⚠️ 警告: 未找到.env文件，正在从.env.example创建...
        copy "backend\.env.example" "backend\.env" >nul
        echo ⚙️ 必需设置: OPENAI_API_KEY
        echo ⚙️ 可选设置: ANTHROPIC_API_KEY
        echo.
        echo 请编辑 backend\.env 文件并设置您的API密钥
        echo.
        echo 按任意键继续，或按Ctrl+C退出配置...
        pause >nul
    ) else (
        echo ❌ 错误: 未找到.env.example文件
        pause
        exit /b 1
    )
) else (
    echo ✅ 环境配置文件已存在

    :: 检查API密钥是否还是默认值
    findstr /C:"OPENAI_API_KEY=your_openai_api_key_here" "backend\.env" >nul
    if !ERRORLEVEL! equ 0 (
        echo ⚠️ 警告: 请设置您的OPENAI_API_KEY
        echo 编辑文件: backend\.env
    ) else (
        echo ✅ OpenAI API密钥已配置
    )

    findstr /C:"ANTHROPIC_API_KEY=your_anthropic_api_key_here" "backend\.env" >nul
    if not ERRORLEVEL equ 0 (
        echo ⚠️ 警告: ANTHROPIC_API_KEY仍为默认值
    ) else (
        findstr /C:"#ANTHROPIC_API_KEY" "backend\.env" >nul
        if ERRORLEVEL equ 0 (
            echo ✅ Claude API密钥已配置
        )
    )
)

echo.
echo 📦 安装项目依赖...

:: 安装根目录依赖
echo 📦 安装根目录依赖...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ 根目录依赖安装失败
    pause
    exit /b 1
)
echo ✅ 根目录依赖安装完成

:: 安装后端依赖
echo 📦 安装后端依赖...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    cd ..
    echo ❌ 后端依赖安装失败
    pause
    exit /b 1
)
cd ..
echo ✅ 后端依赖安装完成

:: 安装前端依赖
echo 📦 安装前端依赖...
cd frontend
call npm install
if %ERRORLEVEL% neq 0 (
    cd ..
    echo ❌ 前端依赖安装失败
    pause
    exit /b 1
)
cd ..
echo ✅ 前端依赖安装完成

:: 验证API配置
echo [STEP] 验证API配置...
if not exist "backend\.env" (
    echo ❌ 错误: .env文件不存在
    pause
    exit /b 1
)

:: 简单检查是否设置了API密钥（不是空值或默认值）
findstr /C:"OPENAI_API_KEY=your_openai_api_key_here" "backend\.env" >nul
if !ERRORLEVEL! equ 0 (
    echo ⚠️ 警告: 请设置您的OPENAI_API_KEY
    echo 编辑文件: backend\.env
    echo.
    echo 按任意键继续，或按Ctrl+C退出配置...
    pause >nul
    goto :start_services
)

echo ✅ API配置验证通过
echo.

:: 检查端口占用
echo [STEP] 检查端口占用...

:: 检查3001端口（后端）
netstat -an | findstr :3001 >nul
if !ERRORLEVEL! equ 0 (
    echo ⚠️ 警告: 端口3001已被占用，正在尝试清理...
    taskkill /f /im "node.exe" /fi "PID eq 3001" 2>nul
    timeout /t 2 /nobreak >nul
)

:: 检查3000端口（前端）
netstat -an | findstr :3000 >nul
if !ERRORLEVEL! equ 0 (
    echo ⚠️ 警告: 端口3000已被占用，正在尝试清理...
    taskkill /f /im "node.exe" /fi "PID eq 3000" 2>nul
    timeout /t 2 /nobreak >nul
)

:choose_mode
echo.
echo 🧠 启动模式选择:
echo 1) 开发模式 (推荐) - 同时启动前后端
echo 2) 仅启动后端
echo 3) 仅启动前端
echo 4) 生产模式
echo.

:menu
set /p choice="请选择启动模式 [1-4]: "

if "%choice%"=="1" goto :dev_mode
if "%choice%"=="2" goto :backend_only
if "%choice%"=="3" goto :frontend_only
if "%choice%"=="4" goto :production_mode

echo 无效选择，请输入1-4
goto :menu

:dev_mode
echo 🚀 启动开发模式 (前后端同时)...
call npm run dev
goto :end

:backend_only
echo ⚙️ 启动后端服务...
cd backend
start "Anki后端" cmd /k "npm run dev"
cd ..
goto :show_info

:frontend_only
echo ⚙️ 启动前端服务...
cd frontend
start "Anki前端" cmd /k "npm start"
cd ..
goto :show_info

:production_mode
echo ⚙️ 启动生产模式...
echo 📦 构建前端...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    cd ..
    echo ❌ 前端构建失败
    pause
    exit /b 1
)
cd ..
echo ✅ 前端构建完成

:: 启动生产服务器
cd backend
set NODE_ENV=production
start "Anki生产服务器" cmd /k "npm start"
cd ..
goto :show_info

:show_info
echo.
echo ===================================
echo ✅ 服务启动完成！
echo ===================================
echo.
echo ✨ 访问地址:
echo   前端应用: http://localhost:3000
echo   后端API:  http://localhost:3001
echo   API文档:   http://localhost:3001/api
echo   健康检查: http://localhost:3001/health
echo.
echo ⚙️ 开发者工具:
echo   查看日志: 检查终端输出
echo   停止服务: Ctrl+C
echo.
echo ⚠️ 提示:
echo   - 首次使用请确保已配置API密钥
echo   - 如遇问题请查看: USAGE.md
echo.
pause
goto :end

:end
echo 应用已启动
exit /b 0