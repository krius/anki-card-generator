from pydantic import BaseModel, Field, ConfigDict, field_serializer
from typing import List, Optional, Literal, Union, Dict, Any, Generic, TypeVar
from uuid import UUID
from datetime import datetime

T = TypeVar('T')


class AnkiCardBase(BaseModel):
    """Anki卡片基础模型"""
    front: str
    back: str
    tags: Optional[List[str]] = []
    deck_name: Optional[str] = "Default"
    card_type: Optional[Literal['basic', 'cloze', 'basic-reversed', 'input']] = 'basic'


class AnkiCard(AnkiCardBase):
    """Anki卡片完整模型"""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[Union[UUID, str]] = None  # 允许字符串类型的ID用于测试
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer('id')
    def serialize_id(self, value: Optional[Union[UUID, str]]) -> Optional[str]:
        """序列化UUID为字符串"""
        return str(value) if isinstance(value, UUID) else value


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


class ApiResponse(BaseModel, Generic[T]):
    """API响应包装器"""
    success: bool
    data: Optional[T] = None
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


# ===== 数据库CRUD相关的Schema =====

class CardBase(BaseModel):
    """卡片基础模型"""
    question: str = Field(..., description="问题")
    answer: str = Field(..., description="答案")
    deck_name: str = Field(default="Default", description="牌组名")
    tags: List[str] = Field(default=[], description="标签列表")
    quality_score: Optional[float] = Field(None, description="质量分数")


class CardCreate(CardBase):
    """创建卡片的模型"""
    pass


class CardUpdate(BaseModel):
    """更新卡片的模型"""
    question: Optional[str] = None
    answer: Optional[str] = None
    deck_name: Optional[str] = None
    tags: Optional[List[str]] = None
    quality_score: Optional[float] = None


class CardInDB(CardBase):
    """数据库中的卡片模型"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class Card(CardInDB):
    """响应的卡片模型"""
    pass


class BatchCardSave(BaseModel):
    """批量保存卡片请求"""
    cards: List[CardCreate] = Field(..., description="卡片列表")


class CardList(BaseModel):
    """卡片列表响应"""
    cards: List[Card]
    total: int


class CardDelete(BaseModel):
    """删除卡片响应"""
    success: bool
    message: str