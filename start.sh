#!/bin/bash

# Anki卡片生成器 - 一键启动脚本
# Version: 1.0.0

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji
ROCKET="🚀"
CHECK="✅"
WARNING="⚠️"
ERROR="❌"
GEAR="⚙️"
PACKAGE="📦"
BRAIN="🧠"
DOWNLOAD="📥"
SPARKLE="✨"

# 项目信息
PROJECT_NAME="Anki卡片生成器"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
REQUIRED_NODE_VERSION="16.0.0"

print_header() {
    echo -e "${CYAN}===================================${NC}"
    echo -e "${CYAN}  ${PROJECT_NAME}${NC}"
    echo -e "${CYAN}  智能学习卡片生成工具${NC}"
    echo -e "${CYAN}===================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP] $1${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

print_info() {
    echo -e "${PURPLE}${GEAR} $1${NC}"
}

# 检查系统要求
check_system() {
    print_step "检查系统环境..."

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "请先安装Node.js (版本 >= $REQUIRED_NODE_VERSION)"
        echo "下载地址: https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2)
    print_success "Node.js版本: $NODE_VERSION"

    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "请先安装npm"
        exit 1
    fi

    NPM_VERSION=$(npm -v)
    print_success "npm版本: $NPM_VERSION"

    # 检查项目结构
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "后端目录 '$BACKEND_DIR' 不存在"
        exit 1
    fi

    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "前端目录 '$FRONTEND_DIR' 不存在"
        exit 1
    fi

    print_success "项目结构检查通过"
}

# 设置环境变量
setup_environment() {
    print_step "配置环境变量..."

    # 检查后端.env文件
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        if [ -f "$BACKEND_DIR/.env.example" ]; then
            print_warning "未找到.env文件，正在从.env.example创建..."
            cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
            print_warning "请编辑 $BACKEND_DIR/.env 文件并设置您的API密钥"
            echo -e "${PURPLE}必需设置: OPENAI_API_KEY${NC}"
            echo -e "${PURPLE}可选设置: ANTHROPIC_API_KEY${NC}"
            echo ""
            read -p "按Enter键继续，或按Ctrl+C退出配置..." -r
        else
            print_error "未找到.env.example文件"
            exit 1
        fi
    else
        print_success "环境配置文件已存在"
    fi
}

# 安装依赖
install_dependencies() {
    print_step "安装项目依赖..."

    # 安装根目录依赖
    echo -e "${PACKAGE} 安装根目录依赖..."
    npm install
    print_success "根目录依赖安装完成"

    # 安装后端依赖
    echo -e "${PACKAGE} 安装后端依赖..."
    cd "$BACKEND_DIR"
    npm install
    cd ..
    print_success "后端依赖安装完成"

    # 安装前端依赖
    echo -e "${PACKAGE} 安装前端依赖..."
    cd "$FRONTEND_DIR"
    npm install
    cd ..
    print_success "前端依赖安装完成"
}

# 验证API密钥
validate_api_keys() {
    print_step "验证API配置..."

    # 检查.env文件中的API密钥
    if [ -f "$BACKEND_DIR/.env" ]; then
        # 简单检查是否设置了API密钥（不是空值或默认值）
        if grep -q "OPENAI_API_KEY=your_openai_api_key_here" "$BACKEND_DIR/.env"; then
            print_warning "请设置您的OPENAI_API_KEY"
            echo "编辑文件: $BACKEND_DIR/.env"
            return 1
        else
            print_success "OpenAI API密钥已配置"
        fi

        if grep -q "ANTHROPIC_API_KEY=your_anthropic_api_key_here" "$BACKEND_DIR/.env" && grep -v "#ANTHROPIC_API_KEY" "$BACKEND_DIR/.env" | grep -q "ANTHROPIC_API_KEY="; then
            print_warning "ANTHROPIC_API_KEY仍为默认值"
        else
            if grep -v "#ANTHROPIC_API_KEY" "$BACKEND_DIR/.env" | grep -q "ANTHROPIC_API_KEY="; then
                print_success "Claude API密钥已配置"
            fi
        fi

        return 0
    fi

    return 1
}

# 启动服务
start_services() {
    print_step "启动应用服务..."

    # 检查端口是否被占用
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null; then
        print_warning "端口3001已被占用，正在尝试清理..."
        pkill -f "node.*3001" || true
        sleep 2
    fi

    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
        print_warning "端口3000已被占用，正在尝试清理..."
        pkill -f "node.*3000" || true
        sleep 2
    fi

    echo -e "${BRAIN} 启动模式选择:"
    echo "1) 开发模式 (推荐) - 同时启动前后端"
    echo "2) 仅启动后端"
    echo "3) 仅启动前端"
    echo "4) 生产模式"
    echo ""

    while true; do
        read -p "请选择启动模式 [1-4]: " -n 1 -r
        case $REPLY in
            1)
                echo -e "${ROCKET} 启动开发模式 (前后端同时)..."
                npm run dev
                break
                ;;
            2)
                echo -e "${GEAR} 仅启动后端服务..."
                cd "$BACKEND_DIR"
                npm run dev
                break
                ;;
            3)
                echo -e "${GEAR} 仅启动前端服务..."
                cd "$FRONTEND_DIR"
                npm start
                break
                ;;
            4)
                echo -e "${GEAR} 启动生产模式..."
                # 构建前端
                echo -e "${PACKAGE} 构建前端..."
                cd "$FRONTEND_DIR"
                npm run build
                cd ..
                print_success "前端构建完成"

                # 启动生产服务器
                cd "$BACKEND_DIR"
                NODE_ENV=production npm start
                break
                ;;
            *)
                echo "无效选择，请输入1-4"
                ;;
        esac
    done
}

# 显示访问信息
show_access_info() {
    echo ""
    echo -e "${CYAN}===================================${NC}"
    echo -e "${GREEN}${CHECK} 服务启动完成！${NC}"
    echo -e "${CYAN}===================================${NC}"
    echo ""
    echo -e "${SPARKLE}访问地址:${NC}"
    echo -e "  前端应用: ${BLUE}http://localhost:3000${NC}"
    echo -e "  后端API:  ${BLUE}http://localhost:3001${NC}"
    echo -e "  API文档:   ${BLUE}http://localhost:3001/api${NC}"
    echo -e "  健康检查: ${BLUE}http://localhost:3001/health${NC}"
    echo ""
    echo -e "${PURPLE}${GEAR} 开发者工具:${NC}"
    echo -e "  查看日志: ${BLUE}检查终端输出${NC}"
    echo -e "  停止服务: ${BLUE}Ctrl+C${NC}"
    echo ""
    echo -e "${YELLOW}${WARNING} 提示:${NC}"
    echo "  - 首次使用请确保已配置API密钥"
    echo "  - 如遇问题请查看: USAGE.md"
    echo ""
}

# 错误处理函数
cleanup_on_exit() {
    echo ""
    echo -e "${WARNING}正在停止服务...${NC}"

    # 清理可能的进程
    pkill -f "node.*3000" || true
    pkill -f "node.*3001" || true

    print_success "服务已停止"
    exit 0
}

# 主函数
main() {
    # 设置错误处理
    trap cleanup_on_exit SIGINT SIGTERM

    print_header

    # 系统检查
    check_system

    # 环境配置
    setup_environment

    # 依赖安装
    if [ "$1" != "--skip-install" ]; then
        install_dependencies
    fi

    # API密钥验证
    if ! validate_api_keys; then
        echo ""
        print_error "请先配置API密钥后再启动应用"
        echo "编辑文件: $BACKEND_DIR/.env"
        echo "至少需要设置: OPENAI_API_KEY"
        echo ""
        exit 1
    fi

    # 启动服务
    start_services

    # 显示访问信息
    show_access_info
}

# 脚本选项
case "$1" in
    --help|-h)
        echo "Anki卡片生成器 - 一键启动脚本"
        echo ""
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --help, -h              显示此帮助信息"
        echo "  --skip-install         跳过依赖安装"
        echo "  --dev                 直接启动开发模式"
        echo ""
        echo "示例:"
        echo "  $0                    # 完整安装和启动"
        echo "  $0 --skip-install      # 跳过安装直接启动"
        echo "  $0 --dev              # 直接启动开发模式"
        exit 0
        ;;
    --dev)
        print_header
        check_system
        if ! validate_api_keys; then
            print_error "请先配置API密钥"
            exit 1
        fi
        start_services
        show_access_info
        ;;
    *)
        main "$@"
        ;;
esac