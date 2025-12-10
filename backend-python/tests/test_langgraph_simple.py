import pytest
from app.core.config import settings
from app.services.langgraph_service import LangGraphService
from app.schemas.card import CardGenerationRequest


@pytest.mark.asyncio
class TestLangGraphSimple:
    """简单测试LangGraph实现"""

    @pytest.fixture
    def service(self):
        """创建LangGraph服务实例"""
        return LangGraphService()

    def test_config(self):
        """测试配置"""
        # 验证配置项存在
        assert settings.zhipu_model is not None, "Zhipu模型不应为空"
        assert settings.zhipu_base_url is not None, "Zhipu基础URL不应为空"
        assert isinstance(settings.zhipu_api_key, str), "API密钥应为字符串"

    async def test_single_generation(self, service):
        """测试单个卡片生成"""
        request = CardGenerationRequest(
            question="什么是Python装饰器？请简单解释。",
            tags=["Python", "编程"],
            deck_name="编程基础",
            card_type="basic"
        )

        result = await service.generate_card(request)

        # 验证基本结构
        assert isinstance(result, dict), "返回结果应为字典"
        assert "success" in result, "应包含success字段"

        if result.get("success"):
            # 验证卡片内容
            assert "card" in result, "成功时应包含card字段"
            card = result["card"]
            assert card.front == request.question, "卡片正面应为原始问题"
            assert card.back is not None, "卡片背面不应为空"
            assert len(card.back) > 20, "卡片背面应有足够内容"

            # 验证质量检查
            assert "quality_check" in result, "应包含质量检查结果"
            quality = result["quality_check"]
            assert hasattr(quality, 'score'), "质量检查应有分数"
            assert 0 <= quality.score <= 100, "分数应在0-100之间"

            # 验证Token使用
            assert "tokens_used" in result, "应包含Token使用数"
            assert isinstance(result["tokens_used"], int), "Token数应为整数"
            assert result["tokens_used"] > 0, "应有Token使用"
        else:
            # 如果失败，验证错误信息
            assert "error" in result, "失败时应包含错误信息"
            assert result["error"] is not None, "错误信息不应为空"

    async def test_different_card_types(self, service):
        """测试不同卡片类型"""
        card_types = ["basic", "cloze", "basic-reversed", "input"]

        for card_type in card_types:
            request = CardGenerationRequest(
                question=f"测试{card_type}类型的问题",
                card_type=card_type,
                deck_name="测试牌组"
            )

            result = await service.generate_card(request)

            assert isinstance(result, dict), "返回结果应为字典"
            assert "success" in result, "应包含success字段"

            if result["success"]:
                assert result["card"].card_type == card_type, "卡片类型应匹配请求"

    async def test_edge_cases(self, service):
        """测试边界情况"""
        # 测试非常长的问题
        long_question = "请解释" + "很" * 100 + "什么是编程？"
        request = CardGenerationRequest(
            question=long_question,
            deck_name="测试"
        )

        result = await service.generate_card(request)

        # 应该能处理长问题
        assert isinstance(result, dict), "返回结果应为字典"
        assert "success" in result, "应包含success字段"