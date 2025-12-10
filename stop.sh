#!/bin/bash

# Anki AI 卡片生成器 - 停止服务脚本
# 适用于 macOS/Linux 系统

echo "🛑 停止 Anki AI 卡片生成器服务..."
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 从文件读取PID
stop_services() {
    if [ -f ".backend_pid" ]; then
        BACKEND_PID=$(cat .backend_pid)
        if ps -p $BACKEND_PID > /dev/null; then
            echo -e "${YELLOW}停止后端服务 (PID: $BACKEND_PID)...${NC}"
            kill $BACKEND_PID
            echo -e "${GREEN}✅ 后端服务已停止${NC}"
        else
            echo -e "${YELLOW}后端服务已经停止${NC}"
        fi
        rm -f .backend_pid
    fi

    if [ -f ".frontend_pid" ]; then
        FRONTEND_PID=$(cat .frontend_pid)
        if ps -p $FRONTEND_PID > /dev/null; then
            echo -e "${YELLOW}停止前端服务 (PID: $FRONTEND_PID)...${NC}"
            kill $FRONTEND_PID
            echo -e "${GREEN}✅ 前端服务已停止${NC}"
        else
            echo -e "${YELLOW}前端服务已经停止${NC}"
        fi
        rm -f .frontend_pid
    fi
}

# 查找并停止相关进程（备用方案）
force_stop() {
    echo -e "${YELLOW}查找并停止所有相关进程...${NC}"

    # 停止 uvicorn 进程
    pkill -f "uvicorn app.main:app" 2>/dev/null

    # 停止 npm run dev 进程
    pkill -f "npm run dev" 2>/dev/null

    # 停止可能存在的 node 进程（在项目目录下）
    pkill -f "vite" 2>/dev/null

    echo -e "${GREEN}✅ 已尝试停止所有相关进程${NC}"
}

# 清理日志文件
clean_logs() {
    read -p "是否删除日志文件？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf logs
        echo -e "${GREEN}✅ 日志文件已删除${NC}"
    fi
}

# 主函数
main() {
    stop_services

    # 检查是否还有进程在运行
    sleep 1

    if pgrep -f "uvicorn app.main:app" > /dev/null || pgrep -f "npm run dev" > /dev/null; then
        echo -e "${YELLOW}检测到仍有进程运行，执行强制停止...${NC}"
        force_stop
    fi

    echo ""
    echo -e "${GREEN}🎉 所有服务已停止！${NC}"
    echo "================================"

    clean_logs
}

# 运行主函数
main