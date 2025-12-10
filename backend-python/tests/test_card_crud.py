#!/usr/bin/env python3
"""测试卡片CRUD功能"""

import pytest
from app.core.database import init_db, get_db
from app.services.card_service import CardService
from app.schemas.card import CardCreate, CardUpdate


@pytest.mark.asyncio
async def test_create_single_card():
    """测试创建单个卡片"""
    await init_db()
    async for db in get_db():
        # 创建测试数据
        card_data = CardCreate(
            question="测试问题：什么是AI？",
            answer="测试答案：人工智能是模拟人类智能的技术",
            deck_name="测试牌组",
            tags=["AI", "测试"],
            quality_score=88.5
        )

        # 执行创建
        card = await CardService.create_card(db, card_data)

        # 验证结果
        assert card is not None
        assert card.id is not None
        assert card.question == card_data.question
        assert card.answer == card_data.answer
        assert card.deck_name == card_data.deck_name
        assert card.tags == card_data.tags
        assert card.quality_score == card_data.quality_score
        assert card.created_at is not None

        # 返回创建的卡片供后续测试使用
        return card


@pytest.mark.asyncio
async def test_create_batch_cards():
    """测试批量创建卡片"""
    async for db in get_db():
        # 创建测试数据
        cards_data = [
            CardCreate(
                question=f"批量问题{i+1}",
                answer=f"批量答案{i+1}",
                deck_name="批量测试",
                tags=[f"标签{i+1}"]
            )
            for i in range(3)
        ]

        # 执行批量创建
        cards = await CardService.create_cards_batch(db, cards_data)

        # 验证结果
        assert len(cards) == 3
        for i, card in enumerate(cards):
            assert card.id is not None
            assert card.question == f"批量问题{i+1}"
            assert card.answer == f"批量答案{i+1}"


@pytest.mark.asyncio
async def test_get_card_by_id():
    """测试根据ID获取卡片"""
    # 先创建一张卡片
    created_card = await test_create_single_card()

    async for db in get_db():
        # 根据ID获取
        card = await CardService.get_card_by_id(db, created_card.id)

        # 验证结果
        assert card is not None
        assert card.id == created_card.id
        assert card.question == created_card.question


@pytest.mark.asyncio
async def test_get_nonexistent_card():
    """测试获取不存在的卡片"""
    async for db in get_db():
        # 使用一个不存在的ID
        card = await CardService.get_card_by_id(db, 99999)

        # 验证结果
        assert card is None


@pytest.mark.asyncio
async def test_update_card():
    """测试更新卡片"""
    # 先创建一张卡片
    created_card = await test_create_single_card()

    async for db in get_db():
        # 准备更新数据
        update_data = CardUpdate(
            question="更新后的问题",
            deck_name="更新后的牌组",
            quality_score=95.0
        )

        # 执行更新
        updated_card = await CardService.update_card(db, created_card.id, update_data)

        # 验证结果
        assert updated_card is not None
        assert updated_card.id == created_card.id
        assert updated_card.question == "更新后的问题"
        assert updated_card.answer == created_card.answer  # 未更新的字段保持原值
        assert updated_card.deck_name == "更新后的牌组"
        assert updated_card.quality_score == 95.0


@pytest.mark.asyncio
async def test_delete_card():
    """测试删除卡片"""
    # 先创建一张卡片
    created_card = await test_create_single_card()

    async for db in get_db():
        # 执行删除
        success = await CardService.delete_card(db, created_card.id)

        # 验证结果
        assert success is True

        # 验证卡片已被删除
        deleted_card = await CardService.get_card_by_id(db, created_card.id)
        assert deleted_card is None


@pytest.mark.asyncio
async def test_count_cards():
    """测试统计卡片数量"""
    async for db in get_db():
        # 获取总数
        count = await CardService.count_cards(db)

        # 验证结果
        assert isinstance(count, int)
        assert count >= 0


@pytest.mark.asyncio
async def test_search_cards():
    """测试搜索卡片"""
    async for db in get_db():
        # 搜索包含"测试"的卡片
        cards = await CardService.get_all_cards(db, search="测试")

        # 验证结果
        assert isinstance(cards, list)

        # 验证搜索结果都包含关键词
        for card in cards:
            assert "测试" in card.question or "测试" in card.answer


@pytest.mark.asyncio
async def test_get_all_cards_with_pagination():
    """测试分页获取所有卡片"""
    async for db in get_db():
        # 测试分页
        cards = await CardService.get_all_cards(db, skip=0, limit=5)

        # 验证结果
        assert isinstance(cards, list)
        assert len(cards) <= 5  # 限制数量