import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent))

from app.services.ai_service import AIService
from app.schemas.card import AnkiCard
from uuid import uuid4


async def test_ai_service():
    """测试AI服务功能"""
    print("开始测试AI服务...")

    # 创建AI服务实例
    ai_service = AIService()

    # 测试1: 生成回答
    print("\n=== 测试1: 生成回答 ===")
    question = "什么是Python？"
    print(f"问题: {question}")

    response = await ai_service.generate_answer(question)

    if response.success:
        print(f"回答: {response.answer}")
        print(f"使用Token数: {response.tokens_used}")
        print(f"模型: {response.model}")
    else:
        print(f"生成失败: {response.error}")
        return

    # 测试2: 质量检查
    print("\n=== 测试2: 质量检查 ===")
    card = AnkiCard(
        id=uuid4(),
        front=question,
        back=response.answer or "默认回答",
        tags=["编程", "Python"],
        deck_name="测试牌组"
    )

    quality_check = await ai_service.quality_check(card)
    print(f"质量分数: {quality_check.score}")
    print(f"是否通过: {quality_check.passed}")
    print(f"存在的问题: {quality_check.issues}")
    print(f"改进建议: {quality_check.suggestions}")

    # 测试3: 改进卡片（如果质量检查未通过）
    if not quality_check.passed:
        print("\n=== 测试3: 改进卡片 ===")
        improved_front, improved_back, improvement_summary = await ai_service.improve_card(
            card,
            quality_check.issues,
            quality_check.suggestions
        )

        print(f"改进前正面: {card.front}")
        print(f"改进后正面: {improved_front}")
        print(f"\n改进前背面: {card.back}")
        print(f"改进后背面: {improved_back}")
        print(f"\n改进说明: {improvement_summary}")

        # 再次质量检查
        improved_card = AnkiCard(
            id=uuid4(),
            front=improved_front,
            back=improved_back,
            tags=card.tags,
            deck_name=card.deck_name
        )

        new_quality_check = await ai_service.quality_check(improved_card)
        print(f"\n改进后质量分数: {new_quality_check.score}")
        print(f"改进后是否通过: {new_quality_check.passed}")

    print("\n测试完成！")


if __name__ == "__main__":
    # 检查环境变量
    import os
    from dotenv import load_dotenv

    # 加载.env文件
    load_dotenv()

    if not os.getenv("ZHIPU_API_KEY"):
        print("错误: 请在.env文件中设置ZHIPU_API_KEY")
        sys.exit(1)

    # 运行测试
    asyncio.run(test_ai_service())