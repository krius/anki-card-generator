"""
数据模型定义
"""
from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.sql import func
from sqlalchemy.ext.hybrid import hybrid_property
from app.core.database import Base


class Card(Base):
    """卡片表"""
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False, comment="问题")
    answer = Column(Text, nullable=False, comment="答案")
    deck_name = Column(String(100), nullable=False, default="Default", comment="牌组名")
    _tags = Column(Text, nullable=False, default="[]", comment="标签JSON数组")
    quality_score = Column(Float, nullable=True, comment="质量分数")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")

    @hybrid_property
    def tags(self):
        """获取标签列表"""
        if isinstance(self._tags, str):
            return json.loads(self._tags)
        return self._tags or []

    @tags.setter
    def tags(self, value):
        """设置标签列表"""
        if isinstance(value, list):
            self._tags = json.dumps(value)
        else:
            self._tags = value

    def __repr__(self):
        return f"<Card(id={self.id}, deck={self.deck_name})>"


class GenerationHistory(Base):
    """生成记录表"""
    __tablename__ = "generation_history"

    id = Column(Integer, primary_key=True, index=True)
    input_text = Column(Text, nullable=False, comment="输入的原始问题/问题列表")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")

    def __repr__(self):
        return f"<GenerationHistory(id={self.id})>"