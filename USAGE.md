# Anki卡片生成器 - 使用指南

## 项目概述

这是一个基于Web的Anki卡片生成工具，支持：
- 📝 文本问题输入，LLM自动生成回答
- 🖼️ 图片上传和多模态LLM理解
- ✅ AI质量检查和卡片改进
- 📦 直接导出为Anki .apkg格式
- 🌐 跨平台Web应用

## 技术栈

**后端**：Node.js + Express + TypeScript + OpenAI/Claude API
**前端**：React + TypeScript + Tailwind CSS
**数据库**：SQLite（临时存储）

## 快速开始

### 1. 环境要求

- Node.js 16+
- npm 或 yarn
- OpenAI API Key 或 Claude API Key

### 2. 后端设置

```bash
# 进入后端目录
cd backend

# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
# 至少需要设置 OPENAI_API_KEY
nano .env
```

**必需的环境变量：**
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**可选的环境变量：**
```env
ANTHROPIC_API_KEY=your_claude_api_key_here
OPENAI_MODEL=gpt-4
MAX_FILE_SIZE=10485760
```

### 3. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 4. 启动应用

**方法1：同时启动前后端（推荐）**
```bash
# 在项目根目录
npm run dev
```

**方法2：分别启动**
```bash
# 启动后端
cd backend && npm run dev

# 新终端启动前端
cd frontend && npm start
```

### 5. 访问应用

- 前端：http://localhost:3000
- 后端API：http://localhost:3001
- API文档：http://localhost:3001/api
- 健康检查：http://localhost:3001/health

## 使用流程

### 1. 生成单个卡片
1. 在"问题"文本框输入学习问题
2. （可选）上传相关图片
3. 选择AI模型（OpenAI或Claude）
4. 设置卡片类型、牌组名称、标签
5. 点击"生成卡片"

### 2. 质量检查
- AI自动检查生成的卡片质量
- 质量分数：0-100分
- 绿色（通过）：质量良好
- 黄色（需改进）：建议改进
- 红色（差）：需要重新生成

### 3. 卡片改进
- 点击质量差的卡片上的"改进"按钮
- AI自动优化内容
- 支持手动编辑

### 4. 导出卡片
1. 选择要导出的卡片
2. 点击"导出选中"或"导出全部"
3. 下载.apkg文件
4. 在Anki中导入：文件 → 导入

## API端点

### 卡片生成
- `POST /api/cards/generate` - 生成单个卡片
- `POST /api/cards/generate/batch` - 批量生成卡片

### 质量检查
- `POST /api/cards/quality-check` - 检查卡片质量
- `POST /api/cards/improve` - 改进卡片

### 文件操作
- `POST /api/cards/upload` - 上传图片
- `POST /api/cards/export` - 导出Anki包

### 系统信息
- `GET /health` - 健康检查
- `GET /api` - API信息

## 项目结构

```
anki-card-generator/
├── backend/                 # Node.js后端
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── middleware/      # 中间件
│   │   ├── routes/          # 路由
│   │   └── types/          # 类型定义
│   ├── package.json
│   └── .env.example
├── frontend/               # React前端
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── services/       # API服务
│   │   └── types/         # 类型定义
│   └── package.json
├── README.md
└── USAGE.md
```

## 常见问题

### Q: 生成的卡片质量如何？
A: 系统使用专门的质检Agent评估每张卡片，提供0-100的质量分数和改进建议。

### Q: 支持哪些图片格式？
A: 支持JPEG、PNG、GIF、WebP、BMP格式，最大10MB。

### Q: 如何批量生成卡片？
A: 可以准备问题列表，系统会并发处理，提高效率。

### Q: 导出的.apkg文件如何使用？
A: 在Anki中选择"文件"→"导入"，选择.apkg文件即可。

### Q: API调用失败怎么办？
A: 1) 检查API密钥是否正确
2) 确认网络连接
3) 查看后端日志

## 开发指南

### 添加新功能
1. 后端：在`backend/src/services/`添加业务逻辑
2. 前端：在`frontend/src/components/`添加UI组件
3. API：在`backend/src/routes/`添加路由

### 自定义质量检查
编辑`backend/src/services/llmService.ts`中的`buildQualityCheckPrompt`方法。

### 扩展卡片类型
在`backend/src/types/index.ts`中添加新的`cardType`选项。

## 部署

### Docker部署
```bash
# 构建镜像
docker build -t anki-generator .

# 运行容器
docker run -p 3001:3001 -p 3000:3000 anki-generator
```

### 环境变量
生产环境需要设置：
- `NODE_ENV=production`
- `OPENAI_API_KEY`
- `FRONTEND_URL`（部署域名）

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License