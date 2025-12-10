#!/usr/bin/env python3
"""测试生成历史功能"""

import pytest
from app.core.database import init_db, get_db
from app.services.card_service import CardService


@pytest.mark.asyncio
async def test_create_generation_history():
    """测试创建生成历史"""
    await init_db()
    async for db in get_db():
        # 创建历史记录
        input_text = "什么是机器学习？\n什么是深度学习？"
        history = await CardService.create_generation_history(db, input_text)

        # 验证结果
        assert history is not None
        assert history.id is not None
        assert history.input_text == input_text
        assert history.created_at is not None

        return history


@pytest.mark.asyncio
async def test_create_multiple_history():
    """测试创建多条历史记录"""
    async for db in get_db():
        # 创建多条历史
        inputs = [
            "第一个问题",
            "第二个问题",
            "批量问题1\n批量问题2\n批量问题3"
        ]

        histories = []
        for input_text in inputs:
            history = await CardService.create_generation_history(db, input_text)
            histories.append(history)

        # 验证结果
        assert len(histories) == len(inputs)
        for i, history in enumerate(histories):
            assert history.id is not None
            assert history.input_text == inputs[i]


@pytest.mark.asyncio
async def test_history_unique_id():
    """测试历史记录ID唯一性"""
    async for db in get_db():
        # 创建两条记录
        history1 = await CardService.create_generation_history(db, "测试文本1")
        history2 = await CardService.create_generation_history(db, "测试文本2")

        # 验证ID不同
        assert history1.id != history2.id