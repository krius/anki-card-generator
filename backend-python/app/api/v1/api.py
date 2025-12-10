from fastapi import APIRouter

from .endpoints import cards
from .endpoints import cards_langgraph

api_router = APIRouter()

# 保留原有的API端点
api_router.include_router(cards.router, prefix="/cards", tags=["cards"])

# 添加新的LangGraph端点
api_router.include_router(cards_langgraph.router, prefix="/cards-langgraph", tags=["cards-langgraph"])