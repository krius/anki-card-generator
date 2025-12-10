from typing import List
from uuid import uuid4
from fastapi import APIRouter, HTTPException, BackgroundTasks
import asyncio

from ....schemas.card import (
    AnkiCard,
    CardGenerationRequest,
    BatchGenerationRequest,
    QualityCheckResult,
    ApiResponse,
    LLMResponse,
    ImproveCardRequest
)
from ....services.ai_service import AIService


router = APIRouter()
ai_service = AIService()


@router.post("/generate", response_model=ApiResponse[dict])
async def generate_card(request: CardGenerationRequest):
    """
    生成单个卡片
    """
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(
                status_code=400,
                detail="Question is required"
            )

        # 生成回答
        llm_response = await ai_service.generate_answer(request.question)

        if not llm_response.success or not llm_response.answer:
            raise HTTPException(
                status_code=500,
                detail=llm_response.error or "Failed to generate answer"
            )

        # 创建卡片
        card = AnkiCard(
            id=uuid4(),
            front=request.question,
            back=llm_response.answer,
            tags=request.tags or [],
            deck_name=request.deck_name or "Default",
            card_type=request.card_type or "basic"
        )

        # 质量检查
        quality_check = await ai_service.quality_check(card)

        return ApiResponse(
            success=True,
            data={
                "card": card.dict(),
                "quality_check": quality_check.dict()
            },
            message=f"Card generated successfully. Quality score: {quality_check.score}/100"
        )

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating card: {str(error)}"
        )


@router.post("/generate-batch", response_model=ApiResponse[dict])
async def generate_cards(request: BatchGenerationRequest, background_tasks: BackgroundTasks):
    """
    批量生成卡片
    """
    try:
        if not request.questions or not isinstance(request.questions, list):
            raise HTTPException(
                status_code=400,
                detail="Questions array is required"
            )

        if len(request.questions) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one question is required"
            )

        if len(request.questions) > 20:
            raise HTTPException(
                status_code=400,
                detail="Maximum 20 questions allowed per batch"
            )

        # 设置
        settings = request.settings or {}

        # 并发处理，限制并发数
        concurrency_limit = 5
        cards = []
        errors = []

        for i in range(0, len(request.questions), concurrency_limit):
            batch = request.questions[i:i + concurrency_limit]
            batch_tasks = []

            for j, question in enumerate(batch):
                index = i + j
                task = process_single_card(
                    question,
                    settings,
                    index
                )
                batch_tasks.append(task)

            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)

            for result in batch_results:
                if isinstance(result, Exception):
                    errors.append({
                        "index": len(cards) + len(errors),
                        "error": str(result)
                    })
                elif result["success"]:
                    cards.append(result["data"])
                else:
                    errors.append(result["error"])

        return ApiResponse(
            success=True,
            data={
                "cards": [card["card"] for card in cards],
                "quality_checks": [card["quality_check"] for card in cards],
                "errors": errors
            },
            message=f"Generated {len(cards)} cards successfully{len(errors) > 0 and f' with {len(errors)} errors' or ''}"
        )

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating cards: {str(error)}"
        )


async def process_single_card(question: str, settings: dict, index: int) -> dict:
    """处理单个卡片生成"""
    try:
        # 生成回答
        llm_response = await ai_service.generate_answer(question)

        if not llm_response.success or not llm_response.answer:
            return {
                "success": False,
                "error": {
                    "index": index,
                    "error": llm_response.error or "Failed to generate answer"
                }
            }

        # 创建卡片
        card = AnkiCard(
            id=uuid4(),
            front=question,
            back=llm_response.answer,
            tags=settings.get("tags", []),
            deck_name=settings.get("deck_name", "Default"),
            card_type=settings.get("card_type", "basic")
        )

        # 质量检查
        quality_check = await ai_service.quality_check(card)

        return {
            "success": True,
            "data": {
                "card": card.dict(),
                "quality_check": quality_check.dict()
            }
        }

    except Exception as error:
        return {
            "success": False,
            "error": {
                "index": index,
                "error": str(error)
            }
        }


@router.post("/quality-check", response_model=ApiResponse[QualityCheckResult])
async def check_quality(card: AnkiCard):
    """
    质量检查
    """
    try:
        if not card.front or not card.front.strip() or not card.back or not card.back.strip():
            raise HTTPException(
                status_code=400,
                detail="Card with front and back content is required"
            )

        quality_check = await ai_service.quality_check(card)

        return ApiResponse(
            success=True,
            data=quality_check,
            message=f"Quality check completed. Score: {quality_check.score}/100"
        )

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error checking quality: {str(error)}"
        )


@router.post("/improve", response_model=ApiResponse[dict])
async def improve_card(request: ImproveCardRequest):
    """
    改进卡片
    """
    try:
        if not request.card.front or not request.card.front.strip() or not request.card.back or not request.card.back.strip():
            raise HTTPException(
                status_code=400,
                detail="Card with front and back content is required"
            )

        # 改进卡片
        improved_front, improved_back, improvement_summary = await ai_service.improve_card(
            request.card,
            request.issues,
            request.suggestions
        )

        # 创建改进后的卡片
        improved_card = AnkiCard(
            id=uuid4(),
            front=improved_front,
            back=improved_back,
            tags=request.card.tags,
            deck_name=request.card.deck_name,
            card_type=request.card.card_type
        )

        # 再次进行质量检查
        quality_check = await ai_service.quality_check(improved_card)

        return ApiResponse(
            success=True,
            data={
                "card": improved_card.dict(),
                "quality_check": quality_check.dict(),
                "improvement_summary": improvement_summary
            },
            message=f"Card improved successfully. New quality score: {quality_check.score}/100"
        )

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error improving card: {str(error)}"
        )