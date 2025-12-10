from typing import Dict, Any, Optional
import json
import re
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from langchain.callbacks.base import BaseCallbackHandler

from ..core.config import settings
from ..schemas.card import AnkiCard, QualityCheckResult, LLMResponse


class TokenUsageHandler(BaseCallbackHandler):
    """Token使用量跟踪器"""
    def __init__(self):
        self.tokens_used = 0
        self.model_name = None

    def on_llm_end(self, response: Any, **kwargs: Any) -> Any:
        """LLM结束时调用"""
        if hasattr(response, 'llm_output') and response.llm_output:
            usage = response.llm_output.get('token_usage', {})
            self.tokens_used = usage.get('total_tokens', 0)

        if hasattr(response, 'generations') and response.generations:
            gen = response.generations[0][0] if response.generations[0] else None
            if gen and hasattr(gen, 'generation_info'):
                self.model_name = gen.generation_info.get('model_name')


class AIService:
    """AI服务类，封装智谱AI的LangChain接口"""

    def __init__(self):
        """初始化AI服务"""
        self.llm = ChatOpenAI(
            model=settings.zhipu_model,
            openai_api_key=settings.zhipu_api_key,
            openai_api_base=settings.zhipu_base_url,
            temperature=0.7,
            max_tokens=800,
            callbacks=[TokenUsageHandler()]
        )

    async def generate_answer(self, question: str) -> LLMResponse:
        """
        基于问题生成回答

        Args:
            question: 问题文本

        Returns:
            LLMResponse: 生成的回答
        """
        try:
            system_prompt = "你是一个专业的学习卡片设计师，擅长创建高质量、易记的Anki卡片。"
            user_prompt = f"""
请基于以下问题生成一个高质量的Anki学习卡片回答：

问题：{question}

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

            # 获取token使用量
            tokens_used = 0
            model = settings.zhipu_model

            if hasattr(self.llm, 'callbacks') and self.llm.callbacks:
                for callback in self.llm.callbacks:
                    if isinstance(callback, TokenUsageHandler):
                        tokens_used = callback.tokens_used
                        if callback.model_name:
                            model = callback.model_name
                        break

            return LLMResponse(
                success=True,
                answer=response.content,
                tokens_used=tokens_used,
                model=model
            )

        except Exception as error:
            print(f"Error generating answer: {error}")
            return LLMResponse(
                success=False,
                error=str(error)
            )

    async def quality_check(self, card: AnkiCard) -> QualityCheckResult:
        """
        质检Agent：检查生成的卡片质量

        Args:
            card: 待检查的卡片

        Returns:
            QualityCheckResult: 质量检查结果
        """
        try:
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

            response = await self.llm.ainvoke(messages)

            if not response.content:
                return QualityCheckResult(
                    passed=False,
                    score=0,
                    issues=['质量检查失败'],
                    suggestions=[]
                )

            return self._parse_quality_check_response(response.content)

        except Exception as error:
            print(f"Error in quality check: {error}")
            return QualityCheckResult(
                passed=False,
                score=0,
                issues=['质量检查出错'],
                suggestions=[]
            )

    async def improve_card(self, card: AnkiCard, issues: list[str], suggestions: list[str]) -> tuple[str, str, str]:
        """
        根据反馈改进卡片

        Args:
            card: 原始卡片
            issues: 存在的问题
            suggestions: 改进建议

        Returns:
            tuple: (改进的正面, 改进的背面, 改进说明)
        """
        try:
            system_prompt = "你是一个专业的Anki卡片设计师，擅长根据反馈改进学习卡片。"
            user_prompt = f"""
请根据以下反馈改进这个Anki学习卡片：

原始卡片：
正面：{card.front}
背面：{card.back}

存在的问题：
{chr(10).join([f"{i+1}. {issue}" for i, issue in enumerate(issues)])}

改进建议：
{chr(10).join([f"{i+1}. {suggestion}" for i, suggestion in enumerate(suggestions)])}

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

            if not response.content:
                return card.front, card.back, "改进失败"

            return self._parse_improved_card_response(response.content, card)

        except Exception as error:
            print(f"Error improving card: {error}")
            return card.front, card.back, f"改进失败: {str(error)}"

    def _parse_quality_check_response(self, response: str) -> QualityCheckResult:
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

    def _parse_improved_card_response(self, response: str, original_card: AnkiCard) -> tuple[str, str, str]:
        """解析改进卡片响应"""
        try:
            lines = response.split('\n')
            improved_front = original_card.front
            improved_back = original_card.back
            improvement_summary = ""

            for line in lines:
                line = line.strip()

                if '改进的正面：' in line or 'Improved Front:' in line:
                    improved_front = line.split('：', 1)[-1].split(':', 1)[-1].strip()
                elif '改进的背面：' in line or 'Improved Back:' in line:
                    improved_back = line.split('：', 1)[-1].split(':', 1)[-1].strip()
                elif '改进说明：' in line or 'Improvement Summary:' in line:
                    improvement_summary = line.split('：', 1)[-1].split(':', 1)[-1].strip()

            # 如果没有找到改进说明，使用原始响应
            if not improvement_summary:
                improvement_summary = response

            return improved_front, improved_back, improvement_summary

        except Exception as error:
            print(f"Error parsing improved card response: {error}")
            return original_card.front, original_card.back, "解析改进结果失败"