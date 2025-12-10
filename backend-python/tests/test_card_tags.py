#!/usr/bin/env python3
"""测试卡片标签功能"""

import pytest
from app.core.database import init_db, get_db
from app.services.card_service import CardService
from app.schemas.card import CardCreate, CardUpdate


@pytest.mark.asyncio
async def test_create_card_with_tags():
    """测试创建带标签的卡片"""
    await init_db()
    async for db in get_db():
        card_data = CardCreate(
            question="测试问题",
            answer="测试答案",
            deck_name="测试牌组",
            tags=["Python", "编程", "学习"]
        )

        card = await CardService.create_card(db, card_data)

        assert card is not None
        assert card.tags == ["Python", "编程", "学习"]
        assert isinstance(card.tags, list)


@pytest.mark.asyncio
async def test_create_batch_cards_with_different_tags():
    """测试批量创建带不同标签的卡片"""
    async for db in get_db():
        cards_data = [
            CardCreate(
                question="问题1",
                answer="答案1",
                deck_name="牌组1",
                tags=["标签1"]
            ),
            CardCreate(
                question="问题2",
                answer="答案2",
                deck_name="牌组2",
                tags=["标签2", "标签3"]
            )
        ]

        cards = await CardService.create_cards_batch(db, cards_data)

        assert len(cards) == 2
        assert cards[0].tags == ["标签1"]
        assert cards[1].tags == ["标签2", "标签3"]


@pytest.mark.asyncio
async def test_update_card_tags():
    """测试更新卡片标签"""
    async for db in get_db():
        # 先创建卡片
        card_data = CardCreate(
            question="原始问题",
            answer="原始答案",
            tags=["原始标签"]
        )
        created_card = await CardService.create_card(db, card_data)

        # 更新标签
        update_data = CardUpdate(
            tags=["新标签1", "新标签2"]
        )
        updated_card = await CardService.update_card(db, created_card.id, update_data)

        assert updated_card is not None
        assert updated_card.tags == ["新标签1", "新标签2"]
        assert updated_card.question == "原始问题"  # 其他字段不变


@pytest.mark.asyncio
async def test_update_card_keep_tags():
    """测试更新卡片时保留标签"""
    async for db in get_db():
        # 先创建卡片
        card_data = CardCreate(
            question="问题",
            answer="答案",
            tags=["标签1", "标签2"]
        )
        created_card = await CardService.create_card(db, card_data)

        # 只更新问题，不更新标签
        update_data = CardUpdate(
            question="新问题"
        )
        updated_card = await CardService.update_card(db, created_card.id, update_data)

        assert updated_card is not None
        assert updated_card.question == "新问题"
        assert updated_card.tags == ["标签1", "标签2"]  # 标签应该保持不变


@pytest.mark.asyncio
async def test_create_card_with_empty_tags():
    """测试创建空标签的卡片"""
    async for db in get_db():
        card_data = CardCreate(
            question="问题",
            answer="答案",
            tags=[]
        )

        card = await CardService.create_card(db, card_data)

        assert card is not None
        assert card.tags == []