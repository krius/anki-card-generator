# 🚀 快速开始指南

## 一键启动 (推荐)

### Windows用户
```cmd
start.bat
```

### macOS/Linux用户
```bash
./start.sh
```

### 使用npm命令
```bash
npm run start
```

## 🔧 环境配置

在首次运行时，脚本会自动：
1. ✅ 检查系统环境 (Node.js ≥ 16.0.0)
2. 📦 安装所有依赖包
3. ⚙️ 创建 `.env` 配置文件

**必需配置：**
编辑 `backend/.env` 文件，设置：
```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

## 🌐 访问地址

启动成功后访问：

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:3001
- **API文档**: http://localhost:3001/api
- **健康检查**: http://localhost:3001/health

## 💡 使用流程

1. **输入问题**: 在文本框中输入学习问题
2. **上传图片** (可选): 点击"选择图片"上传相关图片
3. **选择AI模型**: OpenAI GPT-4 或 Claude
4. **生成卡片**: 点击"生成卡片"按钮
5. **质量检查**: AI自动评估卡片质量 (0-100分)
6. **导出Anki**: 选择卡片并点击"导出"
7. **导入Anki**: 在Anki中选择"文件"→"导入".apkg文件

## 🔍 故障排除

### 端口被占用
脚本会自动尝试清理占用端口的进程。如果仍失败：
```bash
# 手动查找并停止进程
lsof -ti:3001  # 查找后端进程
lsof -ti:3000  # 查找前端进程
kill -9 PID     # 停止进程
```

### API密钥问题
1. 确保 `backend/.env` 文件中的API密钥有效
2. 检查网络连接是否正常
3. 查看终端输出的具体错误信息

### 依赖安装失败
```bash
# 清理缓存重新安装
rm -rf node_modules
npm cache clean --force
npm install
```

### macOS权限问题
```bash
# 给脚本添加执行权限
chmod +x start.sh

# 如果仍提示权限问题
sudo chmod +x start.sh
```

## 📂 完整文档

- **详细使用指南**: [USAGE.md](USAGE.md)
- **API文档**: http://localhost:3001/api (后端启动后)
- **项目源码**: 查看各组件源代码了解实现细节

## ⚡ 高级用法

### 仅启动后端
```bash
npm run backend
```

### 仅启动前端
```bash
npm run frontend
```

### 生产模式
```bash
# 构建并运行生产版本
npm run full
```

## 🎯 核心特性

- ✨ **智能生成**: 基于文本或图片，AI自动生成高质量回答
- 🔍 **质量检查**: 内置质检Agent，确保卡片内容准确、完整
- 🛠️ **卡片改进**: AI驱动的智能优化功能
- 📦 **批量处理**: 支持一次性生成多张卡片
- 📥 **一键导出**: 直接导出为Anki兼容的.apkg格式
- 🌐 **跨平台**: Web应用，支持任何现代浏览器
- 📱 **响应式**: 完美适配桌面和移动设备

开始您的智能学习之旅吧！🎓