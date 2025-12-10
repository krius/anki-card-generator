# Anki AI 卡片生成器

基于AI的个人学习卡片制作工具，支持智能生成、质量检查和批量处理。

## 🚀 快速开始

### 前置要求
- Node.js 18+
- Python 3.11+
- 智谱AI API Key

### 安装与运行
```bash
# 1. 安装前端依赖
cd frontend
npm install

# 2. 设置后端环境
cd ../backend-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. 配置环境变量（见 .env.example）

# 4. 并行启动服务
# 终端1 - 启动前端 (http://localhost:3000)
npm run dev

# 终端2 - 启动后端 (http://localhost:8000)
cd backend-python
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 5. 访问应用
# API文档: http://localhost:8000/docs
# Web界面: http://localhost:3000
```

## 📁 项目结构
```
Anki/
├── frontend/           # React 19 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
├── backend-python/     # FastAPI + LangGraph
│   ├── app/
│   │   ├── api/v1/
│   │   ├── graph/
│   │   ├── schemas/
│   │   └── services/
└── .docs/             # 内部文档
```

## 🛠 技术栈
- **前端**: React 19, TypeScript, Tailwind CSS, Axios
- **后端**: Python 3.11+, FastAPI, LangGraph 1.0.4, Pydantic
- **AI服务**: 智谱AI GLM-4 (OpenAI兼容API)
- **开发工具**: Vite, ESLint, Prettier, Uvicorn

## ⚡ 核心功能
- ✅ AI智能生成Anki卡片
- ✅ 卡片质量检查与优化
- ✅ 批量处理支持
- ✅ 实时生成进度追踪
- ✅ 卡片导出功能

## 📄 许可证
MIT License