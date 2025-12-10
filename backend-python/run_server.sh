#!/bin/bash

# 激活虚拟环境
source .venv/bin/activate

# 启动FastAPI服务器
echo "🚀 启动LangGraph Anki Card Generator API..."
echo "📍 服务地址: http://localhost:8000"
echo "📚 API文档: http://localhost:8000/docs"
echo "🔧 LangGraph端点: http://localhost:8000/api/v1/cards-langgraph"
echo ""

# 运行服务器
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload