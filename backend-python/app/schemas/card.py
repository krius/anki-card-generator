from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Union, Dict, Any
from uuid import UUID
from datetime import datetime


class AnkiCardBase(BaseModel):
    """Anki卡片基础模型"""
    front: str
    back: str
    tags: Optional[List[str]] = []
    deck_name: Optional[str] = "Default"
    card_type: Optional[Literal['basic', 'cloze', 'basic-reversed', 'input']] = 'basic'


class AnkiCard(AnkiCardBase):
    """Anki卡片完整模型"""
    id: Optional[Union[UUID, str]] = None  # 允许字符串类型的ID用于测试
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            UUID: lambda v: str(v) if v else None
        }


class BatchSettings(BaseModel):
    """批量生成设置"""
    llm_provider: Optional[str] = "zhipu"
    deck_name: Optional[str] = "Default"
    tags: Optional[List[str]] = []
    card_type: Optional[str] = "basic"


class CardGenerationRequest(BaseModel):
    """卡片生成请求"""
    question: str
    card_type: Optional[Literal['basic', 'cloze', 'basic-reversed', 'input']] = 'basic'
    tags: Optional[List[str]] = []
    deck_name: Optional[str] = "Default"
    llm_provider: Optional[Literal['openai', 'claude', 'zhipu']] = 'zhipu'


class QualityCheckResult(BaseModel):
    """质量检查结果"""
    passed: bool
    score: int
    issues: List[str]
    suggestions: List[str]
    enhanced_card: Optional[AnkiCard] = None


class LLMResponse(BaseModel):
    """LLM响应"""
    success: bool
    answer: Optional[str] = None
    error: Optional[str] = None
    tokens_used: Optional[int] = None
    model: Optional[str] = None


class ApiResponse(BaseModel):
    """API响应包装器"""
    success: bool
    data: Optional[Union[AnkiCard, List[AnkiCard], QualityCheckResult, dict]] = None
    error: Optional[str] = None
    message: Optional[str] = None


class BatchGenerationRequest(BaseModel):
    """批量生成请求"""
    questions: List[str]
    settings: Optional[BatchSettings] = None


class ExportRequest(BaseModel):
    """导出请求"""
    cards: List[AnkiCard]
    deck_name: str
    include_media: Optional[bool] = False


class ImproveCardRequest(BaseModel):
    """改进卡片请求"""
    card: AnkiCard
    issues: List[str]
    suggestions: List[str]