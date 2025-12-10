from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, Any

from .states import CardGenerationState, BatchGenerationState
from .nodes import CardGenerationNodes, BatchGenerationNodes


class CardGenerationWorkflow:
    """卡片生成工作流"""

    def __init__(self):
        self.nodes = CardGenerationNodes()
        self.workflow = self._create_workflow()
        self.memory = MemorySaver()

    def _create_workflow(self) -> StateGraph:
        """创建工作流图"""
        workflow = StateGraph(CardGenerationState)

        # 添加节点
        workflow.add_node("generate_answer", self.nodes.generate_answer)
        workflow.add_node("create_card", self.nodes.create_card)
        workflow.add_node("check_quality", self.nodes.check_quality)
        workflow.add_node("improve", self.nodes.improve_card)
        workflow.add_node("create_final", self.nodes.create_final)

        # 添加边
        workflow.add_edge(START, "generate_answer")
        workflow.add_edge("generate_answer", "create_card")
        workflow.add_edge("create_card", "check_quality")

        # 添加条件边
        workflow.add_conditional_edges(
            "check_quality",
            self.nodes.should_improve,
            {
                "improve": "improve",
                "create_final": "create_final"
            }
        )

        workflow.add_edge("improve", "check_quality")  # 改进后重新检查质量
        workflow.add_edge("create_final", END)

        return workflow

    def compile(self, use_memory: bool = False):
        """编译工作流"""
        if use_memory:
            return self.workflow.compile(checkpointer=self.memory)
        return self.workflow.compile()

    async def run(self, initial_state: CardGenerationState, use_memory: bool = False):
        """运行工作流"""
        app = self.compile(use_memory=use_memory)
        if use_memory:
            from langgraph.types import RunnableConfig
            config = RunnableConfig(configurable={"thread_id": "card-generation"})
            result = await app.ainvoke(initial_state, config=config)
        else:
            result = await app.ainvoke(initial_state)
        return result


class BatchGenerationWorkflow:
    """批量生成工作流"""

    def __init__(self):
        self.nodes = BatchGenerationNodes()
        self.workflow = self._create_workflow()

    def _create_workflow(self) -> StateGraph:
        """创建批量生成工作流"""
        workflow = StateGraph(BatchGenerationState)

        # 添加节点
        workflow.add_node("process_batch", self.nodes.process_batch)

        # 添加边
        workflow.add_edge(START, "process_batch")
        workflow.add_edge("process_batch", END)

        return workflow

    def compile(self):
        """编译工作流"""
        return self.workflow.compile()

    async def run(self, initial_state: BatchGenerationState):
        """运行批量生成工作流"""
        app = self.compile()
        result = await app.ainvoke(initial_state)
        return result


class QualityCheckWorkflow:
    """独立的质量检查工作流"""

    def __init__(self):
        self.nodes = CardGenerationNodes()

    async def run_quality_check(self, card):
        """运行质量检查"""
        state = CardGenerationState(
            card=card,
            tokens_used=0,
            messages=[],
            question="",
            tags=[],
            deck_name="",
            card_type="",
            answer=None,
            quality_check=None,
            improvement_count=0,
            max_improvements=0,
            final_card=None,
            final_quality_check=None,
            model_name=""
        )
        result = await self.nodes.check_quality(state)
        return result["quality_check"]


class ImprovementWorkflow:
    """独立的卡片改进工作流"""

    def __init__(self):
        self.nodes = CardGenerationNodes()
        self.workflow = self._create_improvement_workflow()

    def _create_improvement_workflow(self) -> StateGraph:
        """创建改进工作流"""
        workflow = StateGraph(CardGenerationState)

        # 添加节点
        workflow.add_node("improve", self.nodes.improve_card)
        workflow.add_node("recheck_quality", self.nodes.check_quality)

        # 添加边
        workflow.add_edge(START, "improve")
        workflow.add_edge("improve", "recheck_quality")
        workflow.add_edge("recheck_quality", END)

        return workflow

    def compile(self):
        """编译工作流"""
        return self.workflow.compile()

    async def run_improvement(self, card, issues: list, suggestions: list):
        """运行改进工作流"""
        from ..schemas.card import QualityCheckResult

        # 创建临时质量检查结果
        temp_quality = QualityCheckResult(
            passed=False,
            score=0,
            issues=issues,
            suggestions=suggestions
        )

        initial_state = {
            "card": card,
            "quality_check": temp_quality,
            "improvement_count": 0,
            "max_improvements": 1,
            "tokens_used": 0
        }

        app = self.compile()
        result = await app.ainvoke(initial_state)

        return {
            "improved_card": result.get("card"),
            "quality_check": result.get("quality_check"),
            "tokens_used": result.get("tokens_used", 0)
        }