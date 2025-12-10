from typing import Dict, Any, List, Optional
from uuid import uuid4

from ..schemas.card import (
    AnkiCard,
    CardGenerationRequest,
    BatchGenerationRequest,
    QualityCheckResult,
    LLMResponse,
    ImproveCardRequest,
    BatchSettings
)
from ..graph.workflows import (
    CardGenerationWorkflow,
    BatchGenerationWorkflow,
    QualityCheckWorkflow,
    ImprovementWorkflow
)


class LangGraphService:
    """基于LangGraph的AI服务"""

    def __init__(self):
        self.card_workflow = CardGenerationWorkflow()
        self.batch_workflow = BatchGenerationWorkflow()
        self.quality_workflow = QualityCheckWorkflow()
        self.improvement_workflow = ImprovementWorkflow()

    async def generate_card(self, request: CardGenerationRequest) -> Dict[str, Any]:
        """生成单个卡片"""
        try:
            # 验证问题不为空
            if not request.question or request.question.strip() == "":
                return {
                    "success": False,
                    "error": "问题不能为空"
                }

            # 初始化状态
            initial_state = {
                "question": request.question,
                "tags": request.tags or [],
                "deck_name": request.deck_name or "Default",
                "card_type": request.card_type or "basic",
                "improvement_count": 0,
                "max_improvements": 2,  # 最多改进2次
                "tokens_used": 0,
                "model_name": "gpt-3.5-turbo",
                "messages": []
            }

            # 运行工作流
            result = await self.card_workflow.run(initial_state)

            # 设置卡片ID
            if result.get('final_card'):
                result['final_card'].id = uuid4()

            return {
                "success": True,
                "card": result.get('final_card'),
                "quality_check": result.get('final_quality_check'),
                "tokens_used": result.get('tokens_used', 0)
            }

        except Exception as error:
            return {
                "success": False,
                "error": str(error)
            }

    async def generate_cards_batch(self, request: BatchGenerationRequest) -> Dict[str, Any]:
        """批量生成卡片"""
        try:
            # 验证问题列表不为空
            if not request.questions or len(request.questions) == 0:
                return {
                    "success": False,
                    "error": "问题列表不能为空"
                }

            # 获取设置
            settings = request.settings or BatchSettings()

            # 初始化状态
            initial_state = {
                "questions": request.questions,
                "settings": settings,
                "cards": [],
                "errors": [],
                "current_index": 0,
                "total_count": len(request.questions),
                "tokens_used": 0
            }

            # 运行批量工作流
            result = await self.batch_workflow.run(initial_state)

            # 设置卡片ID
            for card_data in result.get('cards', []):
                if 'card' in card_data:
                    card_data['card']['id'] = str(uuid4())

            return {
                "success": True,
                "cards": result.get('cards', []),
                "errors": result.get('errors', []),
                "tokens_used": result.get('tokens_used', 0)
            }

        except Exception as error:
            return {
                "success": False,
                "error": str(error)
            }

    async def check_card_quality(self, card: AnkiCard) -> QualityCheckResult:
        """检查卡片质量"""
        return await self.quality_workflow.run_quality_check(card)

    async def improve_card(self, request: ImproveCardRequest) -> Dict[str, Any]:
        """改进卡片"""
        try:
            # 运行改进工作流
            result = await self.improvement_workflow.run_improvement(
                request.card,
                request.issues,
                request.suggestions
            )

            # 设置改进后的卡片ID
            if result.get('improved_card'):
                result['improved_card'].id = uuid4()

            return {
                "success": True,
                "improved_card": result.get('improved_card'),
                "quality_check": result.get('quality_check'),
                "tokens_used": result.get('tokens_used', 0)
            }

        except Exception as error:
            return {
                "success": False,
                "error": str(error)
            }