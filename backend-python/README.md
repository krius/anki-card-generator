# Anki Card Generator - Python Backend

基于 FastAPI + LangChain + 智谱AI 的 Anki 卡片生成器后端服务。

## 功能特性

- **AI卡片生成**: 使用智谱AI GLM-4模型生成高质量学习卡片
- **质量检查**: 自动评估卡片质量，提供改进建议
- **批量处理**: 支持一次生成多个卡片
- **卡片改进**: 根据质量反馈自动优化卡片内容

## 技术栈

- FastAPI - 高性能异步Web框架
- LangChain - AI应用开发框架
- 智谱AI (GLM-4) - 大语言模型
- Pydantic - 数据验证和序列化
- Uvicorn - ASGI服务器

## 安装配置

### 1. 创建虚拟环境

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 智谱AI配置
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL=glm-4

# 应用配置
APP_NAME=Anki Card Generator API
APP_VERSION=1.0.0
DEBUG=true
HOST=0.0.0.0
PORT=8000

# CORS配置
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 运行服务

### 开发模式

```bash
python -m app.main
```

或使用 uvicorn：

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 生产模式

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API文档

服务启动后，访问以下地址查看API文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API端点

### 1. 生成单个卡片

```http
POST /api/v1/cards/generate
```

请求体：
```json
{
  "question": "什么是Python?",
  "card_type": "basic",
  "tags": ["编程", "Python"],
  "deck_name": "编程基础"
}
```

### 2. 批量生成卡片

```http
POST /api/v1/cards/generate-batch
```

请求体：
```json
{
  "questions": ["问题1", "问题2", "问题3"],
  "settings": {
    "deck_name": "默认牌组",
    "tags": ["标签"],
    "card_type": "basic"
  }
}
```

### 3. 质量检查

```http
POST /api/v1/cards/quality-check
```

请求体：
```json
{
  "front": "卡片正面",
  "back": "卡片背面"
}
```

### 4. 改进卡片

```http
POST /api/v1/cards/improve
```

请求体：
```json
{
  "card": {
    "front": "原始正面",
    "back": "原始背面"
  },
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"]
}
```

## 项目结构

```
backend-python/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   └── cards.py    # 卡片相关端点
│   │       └── api.py          # API路由汇总
│   ├── core/
│   │   └── config.py           # 配置管理
│   ├── schemas/
│   │   └── card.py            # Pydantic模型
│   ├── services/
│   │   └── ai_service.py      # AI服务实现
│   └── main.py                # 应用入口
├── requirements.txt           # 依赖列表
├── .env.example              # 环境变量示例
└── README.md                 # 项目文档
```

## 开发说明

### 异步处理

- 所有AI相关的接口都是异步的，使用 `async/await`
- 批量生成限制并发数为5，避免过载

### 错误处理

- 统一的错误响应格式
- 详细的错误日志记录

### 质量评分标准

- **准确性** (30分): 内容是否准确无误
- **清晰度** (25分): 表达是否清楚易懂
- **简洁性** (20分): 内容是否简洁不冗余
- **学习价值** (15分): 是否有助于学习和记忆
- **完整性** (10分): 信息是否相对完整

总分≥70分视为通过质量检查。