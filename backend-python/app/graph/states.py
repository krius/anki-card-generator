from typing import TypedDict, List, Optional, Annotated
from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from ..schemas.card import AnkiCard, QualityCheckResult


class CardGenerationState(TypedDict):
    """卡片生成工作流状态"""
    messages: Annotated[List[BaseMessage], add_messages]

    # 输入
    question: str
    tags: List[str]
    deck_name: str
    card_type: str

    # 中间结果
    answer: Optional[str]
    card: Optional[AnkiCard]
    quality_check: Optional[QualityCheckResult]

    # 改进相关
    improvement_count: int
    max_improvements: int

    # 最终结果
    final_card: Optional[AnkiCard]
    final_quality_check: Optional[QualityCheckResult]

    # 元数据
    tokens_used: int
    model_name: str


class BatchGenerationState(TypedDict):
    """批量生成状态"""
    questions: List[str]
    settings: dict

    # 结果
    cards: List[dict]
    errors: List[dict]

    # 进度
    current_index: int
    total_count: int

    # 元数据
    tokens_used: int