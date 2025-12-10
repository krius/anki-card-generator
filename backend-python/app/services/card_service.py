"""
卡片CRUD服务
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from ..models.card import Card, GenerationHistory
from ..schemas.card import CardCreate, CardUpdate


class CardService:
    """卡片CRUD服务"""

    @staticmethod
    async def create_card(db: AsyncSession, card_data: CardCreate) -> Card:
        """创建单个卡片"""
        # Card模型的tags property会自动处理JSON转换
        db_card = Card(**card_data.model_dump())
        db.add(db_card)
        await db.commit()
        await db.refresh(db_card)

        return db_card

    @staticmethod
    async def create_cards_batch(db: AsyncSession, cards_data: List[CardCreate]) -> List[Card]:
        """批量创建卡片"""
        db_cards = []
        for card_data in cards_data:
            # Card模型的tags property会自动处理JSON转换
            db_card = Card(**card_data.model_dump())
            db_cards.append(db_card)

        db.add_all(db_cards)
        await db.commit()

        # 刷新所有卡片
        for db_card in db_cards:
            await db.refresh(db_card)

        return db_cards

    @staticmethod
    async def get_all_cards(db: AsyncSession, skip: int = 0, limit: int = 100,
                          search: Optional[str] = None) -> List[Card]:
        """获取所有卡片（支持搜索和分页）"""
        query = select(Card)

        # 添加搜索条件
        if search:
            query = query.where(
                Card.question.contains(search) | Card.answer.contains(search)
            )

        # 添加分页
        query = query.offset(skip).limit(limit).order_by(Card.created_at.desc())

        result = await db.execute(query)
        cards = result.scalars().all()

        # Card模型的tags property会自动处理转换
        return cards

    @staticmethod
    async def get_card_by_id(db: AsyncSession, card_id: int) -> Optional[Card]:
        """根据ID获取卡片"""
        query = select(Card).where(Card.id == card_id)
        result = await db.execute(query)
        card = result.scalar_one_or_none()

        # Card模型的tags property会自动处理转换
        return card

    @staticmethod
    async def update_card(db: AsyncSession, card_id: int, card_data: CardUpdate) -> Optional[Card]:
        """更新卡片"""
        # 获取现有卡片
        card = await CardService.get_card_by_id(db, card_id)
        if not card:
            return None

        # 更新字段
        update_data = card_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(card, field, value)

        await db.commit()
        await db.refresh(card)

        return card

    @staticmethod
    async def delete_card(db: AsyncSession, card_id: int) -> bool:
        """删除卡片"""
        query = delete(Card).where(Card.id == card_id)
        result = await db.execute(query)
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def count_cards(db: AsyncSession, search: Optional[str] = None) -> int:
        """统计卡片总数"""
        from sqlalchemy import func

        query = select(func.count(Card.id))

        if search:
            query = query.where(
                Card.question.contains(search) | Card.answer.contains(search)
            )

        result = await db.execute(query)
        return result.scalar()

    @staticmethod
    async def create_generation_history(db: AsyncSession, input_text: str) -> GenerationHistory:
        """创建生成历史记录"""
        history = GenerationHistory(input_text=input_text)
        db.add(history)
        await db.commit()
        await db.refresh(history)
        return history