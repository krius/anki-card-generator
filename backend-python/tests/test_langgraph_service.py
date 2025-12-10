import pytest
from app.services.langgraph_service import LangGraphService
from app.schemas.card import CardGenerationRequest, BatchGenerationRequest, BatchSettings


@pytest.mark.asyncio
class TestLangGraphService:
    """测试LangGraph服务"""

    @pytest.fixture
    def service(self):
        """创建LangGraph服务实例"""
        return LangGraphService()

    @pytest.fixture
    def single_request(self):
        """单个卡片生成请求"""
        return CardGenerationRequest(
            question="什么是Python的装饰器？",
            tags=["Python", "编程概念"],
            deck_name="编程基础",
            card_type="basic"
        )

    @pytest.fixture
    def batch_request(self):
        """批量卡片生成请求"""
        return BatchGenerationRequest(
            questions=[
                "什么是机器学习？",
                "React Hooks的作用是什么？",
                "解释一下RESTful API"
            ],
            settings=BatchSettings(
                deck_name="技术基础",
                tags=["编程", "概念"],
                card_type="basic"
            )
        )

    async def test_single_card_generation(self, service, single_request):
        """测试单个卡片生成"""
        result = await service.generate_card(single_request)

        # 验证返回结构
        assert "success" in result, "返回结果应包含success字段"
        assert "card" in result, "返回结果应包含card字段"
        assert "quality_check" in result, "返回结果应包含quality_check字段"
        assert "tokens_used" in result, "返回结果应包含tokens_used字段"

        if result["success"]:
            assert result["card"] is not None, "成功时卡片不应为空"
            assert result["card"].front is not None, "卡片正面不应为空"
            assert result["card"].back is not None, "卡片背面不应为空"
            assert len(result["card"].back) > 10, "卡片背面长度应大于10个字符"

            # 验证质量检查
            assert result["quality_check"] is not None, "质量检查不应为空"
            assert isinstance(result["quality_check"].score, int), "质量分数应为整数"
            assert 0 <= result["quality_check"].score <= 100, "质量分数应在0-100之间"

            # 验证Token使用
            assert result["tokens_used"] is not None, "Token使用数不应为空"
            assert isinstance(result["tokens_used"], int), "Token使用数应为整数"
            assert result["tokens_used"] >= 0, "Token使用数应大于等于0"
        else:
            assert result["error"] is not None, "失败时错误信息不应为空"

    async def test_batch_generation(self, service, batch_request):
        """测试批量生成"""
        results = await service.generate_cards_batch(batch_request)

        # 验证返回结构
        assert "success" in results, "返回结果应包含success字段"
        assert "cards" in results, "返回结果应包含cards字段"
        assert "tokens_used" in results, "返回结果应包含tokens_used字段"

        if results["success"]:
            assert results["cards"] is not None, "成功时卡片列表不应为空"
            assert len(results["cards"]) > 0, "卡片列表应包含卡片"

            # 验证每个卡片
            for card in results["cards"]:
                assert card.front is not None, "卡片正面不应为空"
                assert card.back is not None, "卡片背面不应为空"
                assert len(card.back) > 10, "卡片背面长度应大于10个字符"

            # 验证总Token数
            assert results["total_tokens"] is not None, "总Token数不应为空"
            assert isinstance(results["total_tokens"], int), "总Token数应为整数"
            assert results["total_tokens"] >= 0, "总Token数应大于等于0"
        else:
            assert results["error"] is not None, "失败时错误信息不应为空"

    async def test_invalid_question(self, service):
        """测试无效问题"""
        invalid_request = CardGenerationRequest(
            question="",  # 空问题
            tags=["测试"],
            deck_name="测试"
        )

        result = await service.generate_card(invalid_request)

        # 应该返回失败
        assert result["success"] is False, "空问题应该返回失败"
        assert result["error"] is not None, "应该返回错误信息"

    async def test_empty_batch_request(self, service):
        """测试空批量请求"""
        empty_batch = BatchGenerationRequest(
            questions=[],  # 空问题列表
            settings=BatchSettings()
        )

        result = await service.generate_cards_batch(empty_batch)

        # 应该返回失败
        assert result["success"] is False, "空问题列表应该返回失败"
        assert result["error"] is not None, "应该返回错误信息"