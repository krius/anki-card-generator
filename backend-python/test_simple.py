#!/usr/bin/env python3
"""简单的测试脚本，验证LangGraph实现"""

import asyncio
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 设置环境变量
os.environ.setdefault("PYTHONPATH", os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.langgraph_service import LangGraphService
from app.schemas.card import CardGenerationRequest, AnkiCard


async def test_config():
    """测试配置"""
    print("=== 测试配置 ===")
    print(f"Zhipu Model: {settings.zhipu_model}")
    print(f"Zhipu Base URL: {settings.zhipu_base_url}")
    print(f"API Key存在: {'是' if settings.zhipu_api_key else '否'}")
    print()


async def test_single_generation():
    """测试单个卡片生成"""
    print("=== 测试单个卡片生成 ===")

    service = LangGraphService()

    request = CardGenerationRequest(
        question="什么是Python装饰器？请简单解释。",
        tags=["Python", "编程"],
        deck_name="编程基础",
        card_type="basic"
    )

    try:
        result = await service.generate_card(request)

        if result["success"]:
            print(f"✓ 生成成功")
            print(f"  Token使用: {result.get('tokens_used', 0)}")
            print(f"  问题: {request.question}")
            if result.get('card'):
                print(f"  答案: {result['card'].back[:100]}...")
            if result.get('quality_check'):
                print(f"  质量分数: {result['quality_check'].score}/100")
        else:
            print(f"✗ 生成失败: {result.get('error')}")
    except Exception as e:
        print(f"✗ 异常: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

    print()


async def test_quality_check():
    """测试质量检查"""
    print("=== 测试质量检查 ===")

    service = LangGraphService()

    # 创建测试卡片
    test_card = AnkiCard(
        front="人工智能",
        back="AI",
        tags=["技术"],
        deck_name="测试",
        card_type="basic"
    )

    try:
        quality = await service.check_card_quality(test_card)
        print(f"✓ 质量检查完成")
        print(f"  分数: {quality.score}/100")
        print(f"  是否通过: {quality.passed}")
        print(f"  问题数: {len(quality.issues)}")
        if quality.issues:
            print(f"  首个问题: {quality.issues[0]}")
    except Exception as e:
        print(f"✗ 异常: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

    print()


async def main():
    """主测试函数"""
    print("开始测试 LangGraph 后端实现...\n")

    # 测试配置
    await test_config()

    # 检查API密钥
    if not settings.zhipu_api_key:
        print("⚠️  警告: 未设置 ZHIPU_API_KEY")
        print("  请确保在 .env 文件中配置了正确的API密钥")
        print("  测试将跳过需要API调用的部分\n")
        return

    # 测试功能
    await test_single_generation()
    await test_quality_check()

    print("测试完成!")


if __name__ == "__main__":
    # 运行测试
    asyncio.run(main())