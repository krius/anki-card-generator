from typing import Dict, Any, Optional
import re
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.constants import START, END

from ..core.config import settings
from ..schemas.card import AnkiCard, QualityCheckResult, LLMResponse
from .states import CardGenerationState, BatchGenerationState


class CardGenerationNodes:
    """卡片生成工作流节点"""

    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.zhipu_model,
            openai_api_key=settings.zhipu_api_key,
            openai_api_base=settings.zhipu_base_url,
            temperature=0.7,
            max_tokens=800,
        )

    async def generate_answer(self, state: CardGenerationState) -> Dict[str, Any]:
        """生成答案节点"""
        try:
            system_prompt = "你是一个专业的学习卡片设计师，擅长创建高质量、易记的Anki卡片。"
            user_prompt = f"""
请基于以下问题生成一个高质量的Anki学习卡片回答：

问题：{state['question']}

要求：
1. 回答要准确、简洁明了
2. 适合记忆和理解
3. 重点突出关键概念
4. 可以适当举例说明
5. 长度控制在100-300字之间

请直接给出回答内容，不要包含其他格式说明。
"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            response = await self.llm.ainvoke(messages)

            return {
                "answer": response.content,
                "messages": [AIMessage(content=response.content)],
                "tokens_used": state.get("tokens_used", 0) + 100  # 估算
            }

        except Exception as error:
            raise Exception(f"生成答案失败: {str(error)}")

    async def create_card(self, state: CardGenerationState) -> Dict[str, Any]:
        """创建卡片节点"""
        try:
            card = AnkiCard(
                id=None,  # 将在API层设置
                front=state['question'],
                back=state['answer'],
                tags=state.get('tags', []),
                deck_name=state.get('deck_name', 'Default'),
                card_type=state.get('card_type', 'basic')
            )

            return {"card": card}

        except Exception as error:
            raise Exception(f"创建卡片失败: {str(error)}")

    async def check_quality(self, state: CardGenerationState) -> Dict[str, Any]:
        """质量检查节点"""
        try:
            card = state['card']
            system_prompt = "你是一个专业的Anki卡片质量评估师，擅长评估学习卡片的质量。"
            user_prompt = f"""
请对这个Anki学习卡片进行质量评估：

卡片内容：
正面：{card.front}
背面：{card.back}

请从以下维度评估（0-100分）：
1. **准确性** (30分)：内容是否准确无误
2. **清晰度** (25分)：表达是否清楚易懂
3. **简洁性** (20分)：内容是否简洁不冗余
4. **学习价值** (15分)：是否有助于学习和记忆
5. **完整性** (10分)：信息是否相对完整

请按以下格式回复：
总分：XX分
是否通过：是/否（总分≥70分通过）

存在的问题：
1. 问题描述
2. 问题描述

改进建议：
1. 建议内容
2. 建议内容
"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            # 降低温度以获得更稳定的评估
            self.llm.temperature = 0.3
            response = await self.llm.ainvoke(messages)
            self.llm.temperature = 0.7

            quality_result = self._parse_quality_response(response.content)

            return {
                "quality_check": quality_result,
                "tokens_used": state.get("tokens_used", 0) + 150  # 估算
            }

        except Exception as error:
            raise Exception(f"质量检查失败: {str(error)}")

    async def should_improve(self, state: CardGenerationState) -> str:
        """判断是否需要改进的条件节点"""
        quality_check = state.get('quality_check')
        if not quality_check:
            return "create_final"

        # 如果质量分数低于70分且改进次数未达到上限，则改进
        if (quality_check.score < 70 and
            state.get('improvement_count', 0) < state.get('max_improvements', 2)):
            return "improve"

        # 否则创建最终结果
        return "create_final"

    async def improve_card(self, state: CardGenerationState) -> Dict[str, Any]:
        """改进卡片节点"""
        try:
            card = state['card']
            quality_check = state['quality_check']
            improvement_count = state.get('improvement_count', 0) + 1

            system_prompt = "你是一个专业的Anki卡片设计师，擅长根据反馈改进学习卡片。"
            user_prompt = f"""
请根据以下反馈改进这个Anki学习卡片（第{improvement_count}次改进）：

原始卡片：
正面：{card.front}
背面：{card.back}

存在的问题：
{chr(10).join([f"{i+1}. {issue}" for i, issue in enumerate(quality_check.issues)])}

改进建议：
{chr(10).join([f"{i+1}. {suggestion}" for i, suggestion in enumerate(quality_check.suggestions)])}

请提供一个改进后的卡片版本，要求：
1. 保持准确性
2. 提高清晰度
3. 确保适合学习记忆
4. 长度适中

请按以下格式回复：
改进的正面：[内容]
改进的背面：[内容]
改进说明：[简要说明改进点]
"""

            # 使用较低的温度值以获得更稳定的改进结果
            self.llm.temperature = 0.3

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            response = await self.llm.ainvoke(messages)

            # 恢复温度值
            self.llm.temperature = 0.7

            # 解析改进结果
            improved_front, improved_back = self._parse_improvement_response(response.content, card)

            # 创建改进后的卡片
            improved_card = AnkiCard(
                id=card.id,
                front=improved_front,
                back=improved_back,
                tags=card.tags,
                deck_name=card.deck_name,
                card_type=card.card_type
            )

            return {
                "card": improved_card,
                "improvement_count": improvement_count,
                "messages": [AIMessage(content=f"卡片改进 (第{improvement_count}次): {response.content}")],
                "tokens_used": state.get("tokens_used", 0) + 200  # 估算
            }

        except Exception as error:
            raise Exception(f"改进卡片失败: {str(error)}")

    async def create_final(self, state: CardGenerationState) -> Dict[str, Any]:
        """创建最终结果节点"""
        return {
            "final_card": state.get('card'),
            "final_quality_check": state.get('quality_check')
        }

    def _parse_quality_response(self, response: str) -> QualityCheckResult:
        """解析质量检查回复"""
        try:
            lines = response.split('\n')
            score = 70  # 默认分数
            passed = True
            issues = []
            suggestions = []
            current_section = None

            for line in lines:
                line = line.strip()

                # 解析分数
                if '总分：' in line:
                    match = re.search(r'(\d+)', line)
                    if match:
                        score = int(match.group(1))

                # 解析是否通过
                elif '是否通过：' in line:
                    passed = '是' in line

                # 解析问题和建议
                elif '存在的问题：' in line:
                    current_section = 'issues'
                elif '改进建议：' in line:
                    current_section = 'suggestions'
                elif re.match(r'^\d+\.', line) or re.match(r'^[-*]\s', line):
                    if current_section == 'issues':
                        issues.append(re.sub(r'^\d+\.\s*|^[-*]\s*', '', line))
                    elif current_section == 'suggestions':
                        suggestions.append(re.sub(r'^\d+\.\s*|^[-*]\s*', '', line))

            return QualityCheckResult(
                passed=passed and score >= 70,
                score=score,
                issues=issues if issues else (['内容需要改进'] if not passed else []),
                suggestions=suggestions if suggestions else (['建议添加更多细节'] if not passed else [])
            )

        except Exception as error:
            print(f"Error parsing quality check response: {error}")
            return QualityCheckResult(
                passed=False,
                score=0,
                issues=['解析质量检查结果失败'],
                suggestions=[]
            )

    def _parse_improvement_response(self, response: str, original_card: AnkiCard) -> tuple[str, str]:
        """解析改进卡片响应"""
        try:
            lines = response.split('\n')
            improved_front = original_card.front
            improved_back = original_card.back

            for line in lines:
                line = line.strip()

                if '改进的正面：' in line or 'Improved Front:' in line:
                    improved_front = line.split('：', 1)[-1].split(':', 1)[-1].strip()
                elif '改进的背面：' in line or 'Improved Back:' in line:
                    improved_back = line.split('：', 1)[-1].split(':', 1)[-1].strip()

            return improved_front, improved_back

        except Exception as error:
            print(f"Error parsing improved card response: {error}")
            return original_card.front, original_card.back


class BatchGenerationNodes:
    """批量生成节点"""

    def __init__(self):
        self.card_nodes = CardGenerationNodes()

    async def process_batch(self, state: BatchGenerationState) -> Dict[str, Any]:
        """处理批量生成"""
        from langgraph.graph import StateGraph

        questions = state['questions']
        settings = state.get('settings') or {}
        cards = []
        errors = []
        total_tokens = 0

        # 处理settings对象
        if hasattr(settings, 'tags'):
            tags = settings.tags or []
            deck_name = settings.deck_name or "Default"
            card_type = settings.card_type or "basic"
        else:
            tags = settings.get("tags", [])
            deck_name = settings.get("deck_name", "Default")
            card_type = settings.get("card_type", "basic")

        # 创建子图来处理单个卡片
        card_graph = self._create_card_graph()

        for i, question in enumerate(questions):
            try:
                # 初始化状态
                from .states import CardGenerationState
                initial_state = CardGenerationState(
                    question=question,
                    tags=tags,
                    deck_name=deck_name,
                    card_type=card_type,
                    improvement_count=0,
                    max_improvements=2,
                    tokens_used=0,
                    model_name="gpt-3.5-turbo",
                    messages=[],
                    answer=None,
                    card=None,
                    quality_check=None,
                    final_card=None,
                    final_quality_check=None
                )

                # 运行卡片生成工作流
                result = await card_graph.ainvoke(initial_state)

                if result.get('final_card') and result.get('final_quality_check'):
                    cards.append({
                        "card": result['final_card'].dict(),
                        "quality_check": result['final_quality_check'].dict()
                    })
                    total_tokens += result.get('tokens_used', 0)

            except Exception as error:
                errors.append({
                    "index": i,
                    "question": question,
                    "error": str(error)
                })

        return {
            "cards": cards,
            "errors": errors,
            "tokens_used": total_tokens
        }

    def _create_card_graph(self):
        """创建单个卡片生成的子图"""
        from langgraph.graph import StateGraph

        workflow = StateGraph(CardGenerationState)

        # 添加节点
        workflow.add_node("generate_answer", self.card_nodes.generate_answer)
        workflow.add_node("create_card", self.card_nodes.create_card)
        workflow.add_node("check_quality", self.card_nodes.check_quality)
        workflow.add_node("improve", self.card_nodes.improve_card)
        workflow.add_node("create_final", self.card_nodes.create_final)

        # 添加边
        workflow.add_edge(START, "generate_answer")
        workflow.add_edge("generate_answer", "create_card")
        workflow.add_edge("create_card", "check_quality")

        # 添加条件边
        workflow.add_conditional_edges(
            "check_quality",
            self.card_nodes.should_improve,
            {
                "improve": "improve",
                "create_final": "create_final"
            }
        )

        workflow.add_edge("improve", "check_quality")  # 改进后重新检查质量
        workflow.add_edge("create_final", END)

        return workflow.compile()