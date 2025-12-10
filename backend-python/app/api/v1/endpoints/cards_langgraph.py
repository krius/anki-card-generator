from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ....schemas.card import (
    AnkiCard,
    CardGenerationRequest,
    BatchGenerationRequest,
    QualityCheckResult,
    ApiResponse,
    LLMResponse,
    ImproveCardRequest,
    BatchSettings
)
from ....services.langgraph_service import LangGraphService


router = APIRouter()
langgraph_service = LangGraphService()


@router.post("/generate", response_model=ApiResponse[dict])
async def generate_card(request: CardGenerationRequest):
    """
    使用LangGraph生成单个卡片
    """
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(
                status_code=400,
                detail="Question is required"
            )

        # 使用LangGraph工作流生成卡片
        result = await langgraph_service.generate_card(request)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to generate card")
            )

        return ApiResponse(
            success=True,
            data={
                "card": result["card"].dict() if result["card"] else None,
                "quality_check": result["quality_check"].dict() if result["quality_check"] else None,
                "tokens_used": result.get("tokens_used", 0)
            },
            message=f"Card generated successfully. Quality score: {result['quality_check'].score}/100"
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
    使用LangGraph批量生成卡片
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

        # 使用LangGraph批量工作流
        result = await langgraph_service.generate_cards_batch(request)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to generate cards")
            )

        # 提取卡片和质量检查
        cards = []
        quality_checks = []
        for card_data in result.get("cards", []):
            if "card" in card_data:
                cards.append(card_data["card"])
                if "quality_check" in card_data:
                    quality_checks.append(card_data["quality_check"])

        return ApiResponse(
            success=True,
            data={
                "cards": cards,
                "quality_checks": quality_checks,
                "errors": result.get("errors", []),
                "tokens_used": result.get("tokens_used", 0)
            },
            message=f"Generated {len(cards)} cards successfully"
        )

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating cards: {str(error)}"
        )


@router.post("/quality-check", response_model=ApiResponse[QualityCheckResult])
async def check_quality(card: AnkiCard):
    """
    使用LangGraph进行质量检查
    """
    try:
        if not card.front or not card.front.strip() or not card.back or not card.back.strip():
            raise HTTPException(
                status_code=400,
                detail="Card with front and back content is required"
            )

        # 使用LangGraph质量检查工作流
        quality_check = await langgraph_service.check_card_quality(card)

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
    使用LangGraph改进卡片
    """
    try:
        if not request.card.front or not request.card.front.strip() or not request.card.back or not request.card.back.strip():
            raise HTTPException(
                status_code=400,
                detail="Card with front and back content is required"
            )

        # 使用LangGraph改进工作流
        result = await langgraph_service.improve_card(request)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to improve card")
            )

        return ApiResponse(
            success=True,
            data={
                "card": result["improved_card"].dict() if result["improved_card"] else None,
                "quality_check": result["quality_check"].dict() if result["quality_check"] else None,
                "improvement_summary": f"Card improved successfully",
                "tokens_used": result.get("tokens_used", 0)
            },
            message=f"Card improved successfully. New quality score: {result['quality_check'].score}/100"
        )

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error improving card: {str(error)}"
        )


@router.get("/workflow/status")
async def get_workflow_status():
    """
    获取工作流状态信息
    """
    return ApiResponse(
        success=True,
        data={
            "workflow_type": "LangGraph",
            "version": "1.0.4",
            "features": [
                "Stateful execution",
                "Conditional routing",
                "Checkpoint support",
                "Parallel processing",
                "Quality-driven improvement loops"
            ]
        },
        message="LangGraph workflow is active"
    )


@router.post("/workflow/stream")
async def stream_workflow(request: CardGenerationRequest):
    """
    流式执行工作流（返回中间步骤）
    """
    try:
        from ..graph.workflows import CardGenerationWorkflow

        workflow = CardGenerationWorkflow()

        # 初始化状态
        initial_state = {
            "question": request.question,
            "tags": request.tags or [],
            "deck_name": request.deck_name or "Default",
            "card_type": request.card_type or "basic",
            "improvement_count": 0,
            "max_improvements": 2,
            "tokens_used": 0,
            "model_name": "gpt-3.5-turbo",
            "messages": []
        }

        # 编译工作流用于流式输出
        app = workflow.compile(use_memory=True)
        config = {"configurable": {"thread_id": f"stream-{request.question[:10]}"}}

        # 收集所有中间步骤
        steps = []
        async for event in app.astream(initial_state, config=config):
            steps.append({
                "step": list(event.keys())[0] if event else "completed",
                "data": event,
                "tokens_used": event.get("tokens_used", 0) if isinstance(event, dict) else 0
            })

        # 获取最终结果
        final_result = await app.ainvoke(initial_state, config=config)

        return ApiResponse(
            success=True,
            data={
                "steps": steps,
                "final_card": final_result.get("final_card").dict() if final_result.get("final_card") else None,
                "final_quality_check": final_result.get("final_quality_check").dict() if final_result.get("final_quality_check") else None,
                "total_tokens_used": final_result.get("tokens_used", 0)
            },
            message=f"Workflow completed with {len(steps)} steps"
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error in streaming workflow: {str(error)}"
        )