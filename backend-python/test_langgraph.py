import asyncio
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

from app.services.langgraph_service import LangGraphService
from app.schemas.card import CardGenerationRequest, AnkiCard


async def test_single_card_generation():
    """测试单个卡片生成"""
    print("\n=== 测试单个卡片生成 ===")

    service = LangGraphService()

    request = CardGenerationRequest(
        question="什么是Python的装饰器？",
        tags=["Python", "编程概念"],
        deck_name="编程基础",
        card_type="basic"
    )

    result = await service.generate_card(request)

    if result["success"]:
        print(f"✓ 卡片生成成功")
        print(f"  问题: {result['card'].front}")
        print(f"  答案: {result['card'].back[:100]}...")
        print(f"  质量分数: {result['quality_check'].score}/100")
        print(f"  是否通过: {result['quality_check'].passed}")
        print(f"  Token使用: {result['tokens_used']}")
    else:
        print(f"✗ 卡片生成失败: {result['error']}")


async def test_batch_generation():
    """测试批量生成"""
    print("\n=== 测试批量卡片生成 ===")

    service = LangGraphService()

    from app.schemas.card import BatchGenerationRequest, BatchSettings

    request = BatchGenerationRequest(
        questions=[
            "什么是机器学习？",
            "React Hooks的作用是什么？",
            "解释一下RESTful API"
        ],
        settings=BatchSettings(
            tags=["技术概念"],
            deck_name="技术面试",
            card_type="basic"
        )
    )

    result = await service.generate_cards_batch(request)

    if result["success"]:
        print(f"✓ 批量生成成功")
        print(f"  生成卡片数: {len(result['cards'])}")
        print(f"  错误数: {len(result['errors'])}")
        print(f"  总Token使用: {result['tokens_used']}")

        for i, card_data in enumerate(result['cards'][:2]):  # 只显示前两个
            print(f"\n  卡片 {i+1}:")
            print(f"    质量分数: {card_data['quality_check']['score']}/100")
    else:
        print(f"✗ 批量生成失败: {result['error']}")


async def test_quality_check():
    """测试质量检查"""
    print("\n=== 测试质量检查 ===")

    service = LangGraphService()

    # 创建一个测试卡片（故意做得不好）
    test_card = AnkiCard(
        id="test-1",
        front="Python",
        back="它是一种编程语言",
        tags=[],
        deck_name="Test",
        card_type="basic"
    )

    quality_result = await service.check_card_quality(test_card)

    print(f"✓ 质量检查完成")
    print(f"  分数: {quality_result.score}/100")
    print(f"  是否通过: {quality_result.passed}")
    print(f"  问题数: {len(quality_result.issues)}")
    print(f"  建议数: {len(quality_result.suggestions)}")

    if quality_result.issues:
        print("  发现的问题:")
        for issue in quality_result.issues[:2]:
            print(f"    - {issue}")


async def test_card_improvement():
    """测试卡片改进"""
    print("\n=== 测试卡片改进 ===")

    service = LangGraphService()

    from app.schemas.card import ImproveCardRequest, QualityCheckResult

    # 创建一个需要改进的卡片
    original_card = AnkiCard(
        id="improve-1",
        front="什么是AI？",
        back="人工智能",
        tags=["技术"],
        deck_name="Test",
        card_type="basic"
    )

    request = ImproveCardRequest(
        card=original_card,
        issues=["回答过于简短", "缺乏具体例子"],
        suggestions=["添加AI的定义和应用领域", "提供具体例子说明"]
    )

    result = await service.improve_card(request)

    if result["success"]:
        print(f"✓ 卡片改进成功")
        print(f"  原答案: {original_card.back}")
        print(f"  改进后: {result['improved_card'].back[:200]}...")
        print(f"  新质量分数: {result['quality_check'].score}/100")
        print(f"  Token使用: {result['tokens_used']}")
    else:
        print(f"✗ 卡片改进失败: {result['error']}")


async def main():
    """运行所有测试"""
    print("开始测试 LangGraph 实现...")

    # 检查环境变量
    if not os.getenv("ZHIPU_API_KEY"):
        print("⚠️  警告: 未找到 ZHIPU_API_KEY 环境变量")
        print("  请确保已正确配置 API 密钥")
        return

    try:
        await test_single_card_generation()
        await test_batch_generation()
        await test_quality_check()
        await test_card_improvement()

        print("\n✅ 所有测试完成!")

    except Exception as e:
        print(f"\n❌ 测试过程中出错: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())