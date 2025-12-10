#!/usr/bin/env python3
"""测试数据库连接功能"""

import pytest
import asyncio
from app.core.database import init_db, get_db


@pytest.mark.asyncio
async def test_database_init():
    """测试数据库初始化"""
    # 初始化数据库应该不抛出异常
    await init_db()

    # 尝试获取一个会话
    async for db in get_db():
        assert db is not None
        assert hasattr(db, 'commit')
        assert hasattr(db, 'rollback')
        break  # 只需要一个会话进行测试


@pytest.mark.asyncio
async def test_multiple_sessions():
    """测试创建多个数据库会话"""
    sessions = []
    # 创建3个独立的会话
    for i in range(3):
        async for db in get_db():
            assert db is not None
            sessions.append(db)
            break

    assert len(sessions) == 3
    # 验证它们是不同的会话实例
    assert sessions[0] != sessions[1]
    assert sessions[1] != sessions[2]