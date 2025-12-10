#!/bin/bash

# Anki AI 卡片生成器 - 一键启动脚本
# 适用于 macOS/Linux 系统

echo "🎴 Anki AI 卡片生成器启动中..."
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否已安装依赖
check_dependencies() {
    echo -e "${YELLOW}检查依赖...${NC}"

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装！请先安装 Node.js 18+${NC}"
        exit 1
    fi

    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 未安装！请先安装 Python 3.11+${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 检查环境变量
check_env() {
    if [ ! -f "backend-python/.env" ]; then
        echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"
        echo "请确保已配置 backend-python/.env 文件，包含 ZHIPU_API_KEY"
        echo "可以从 backend-python/.env.example 复制模板"
        read -p "是否继续？(y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 启动后端
start_backend() {
    echo -e "${YELLOW}启动后端服务...${NC}"
    cd backend-python

    # 检查虚拟环境
    if [ ! -d ".venv" ]; then
        echo -e "${YELLOW}创建虚拟环境...${NC}"
        python3 -m venv .venv
    fi

    # 激活虚拟环境
    source .venv/bin/activate

    # 检查依赖
    if [ ! -f ".venv/pyvenv.cfg" ] || [ ! -f ".venv/lib/python*/site-packages/fastapi" ]; then
        echo -e "${YELLOW}安装后端依赖...${NC}"
        pip install -r requirements.txt
    fi

    # 启动后端（后台运行）
    echo -e "${GREEN}🚀 后端服务启动在 http://localhost:8000${NC}"
    nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "后端进程 PID: $BACKEND_PID"

    cd ..
}

# 启动前端
start_frontend() {
    echo -e "${YELLOW}启动前端服务...${NC}"
    cd frontend

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}安装前端依赖...${NC}"
        npm install
    fi

    # 启动前端（后台运行）
    echo -e "${GREEN}🚀 前端服务启动在 http://localhost:3000${NC}"
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "前端进程 PID: $FRONTEND_PID"

    cd ..
}

# 保存进程ID
save_pids() {
    echo "$BACKEND_PID" > .backend_pid
    echo "$FRONTEND_PID" > .frontend_pid
}

# 主函数
main() {
    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -d "backend-python" ]; then
        echo -e "${RED}❌ 请在项目根目录运行此脚本${NC}"
        exit 1
    fi

    check_dependencies
    check_env

    # 创建日志目录
    mkdir -p logs
    # 清理旧的日志文件
    rm -f logs/backend.log logs/frontend.log

    start_backend
    sleep 3  # 等待后端启动

    start_frontend
    save_pids

    echo ""
    echo -e "${GREEN}🎉 服务启动成功！${NC}"
    echo "================================"
    echo "前端地址: http://localhost:3000"
    echo "API文档: http://localhost:8000/docs"
    echo ""
    echo "日志文件："
    echo "  - 后端日志: logs/backend.log"
    echo "  - 前端日志: logs/frontend.log"
    echo ""
    echo "停止服务请运行: ./stop.sh"
    echo ""
}

# 运行主函数
main