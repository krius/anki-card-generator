#!/usr/bin/env python3
"""测试 prompt_loader 模块"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.prompt_loader import prompt_loader
from app.core.prompts import Prompts


def test_prompt_loading():
    """测试 prompt 加载功能"""

    print("=== 测试 Prompt Loader ===\n")

    # 测试1: 加载系统 prompt（无变量）
    print("1. 测试加载系统 prompt（无变量）:")
    system_prompt = prompt_loader.get_prompt(Prompts.CARD_GENERATION, Prompts.SYSTEM)
    print(f"   系统prompt: {system_prompt}\n")

    # 测试2: 加载生成答案 prompt（带变量）
    print("2. 测试加载生成答案 prompt（带变量）:")
    question = "什么是人工智能？"
    user_prompt = prompt_loader.get_prompt(
        Prompts.CARD_GENERATION,
        Prompts.GENERATE_ANSWER,
        question=question
    )
    print(f"   输入问题: {question}")
    print(f"   生成的prompt:\n{user_prompt}\n")

    # 测试3: 加载质量检查 prompt
    print("3. 测试加载质量检查 prompt:")
    front = "什么是机器学习？"
    back = "机器学习是AI的一个分支..."
    quality_prompt = prompt_loader.get_prompt(
        Prompts.QUALITY_CHECK,
        Prompts.CHECK_QUALITY,
        front=front,
        back=back
    )
    print(f"   卡片正面: {front}")
    print(f"   卡片背面: {back}")
    print(f"   质量检查prompt:\n{quality_prompt}\n")

    # 测试4: 加载改进 prompt
    print("4. 测试加载改进 prompt:")
    improvement_count = 1
    issues_text = "1. 回答不够简洁\n2. 缺少例子"
    suggestions_text = "1. 精简内容\n2. 添加实例"
    improve_prompt = prompt_loader.get_prompt(
        Prompts.IMPROVEMENT,
        Prompts.IMPROVE_CARD,
        improvement_count=improvement_count,
        front=front,
        back=back,
        issues=issues_text,
        suggestions=suggestions_text
    )
    print(f"   改进次数: {improvement_count}")
    print(f"   改进prompt:\n{improve_prompt}\n")

    # 测试5: 列出所有可用的 prompts
    print("5. 列出所有可用的 prompts:")
    all_prompts = prompt_loader.list_prompts()
    for category, prompts in all_prompts.items():
        print(f"   {category}:")
        for name, path in prompts.items():
            print(f"     - {name}: {path}")

    # 测试6: 错误处理测试
    print("\n6. 测试错误处理:")

    # 测试文件不存在
    try:
        prompt_loader.get_prompt("nonexistent", "prompt")
    except FileNotFoundError as e:
        print(f"   ✓ 文件不存在错误: {e}")

    # 测试缺少必需参数
    try:
        # generate_answer 需要 question 参数，但不提供
        prompt_loader.get_prompt(Prompts.CARD_GENERATION, Prompts.GENERATE_ANSWER)
    except ValueError as e:
        print(f"   ✓ 参数缺失错误: {e}")

    # 测试参数不匹配
    try:
        # 提供错误的参数名
        prompt_loader.get_prompt(Prompts.CARD_GENERATION, Prompts.GENERATE_ANSWER, wrong_param="test")
    except ValueError as e:
        print(f"   ✓ 参数不匹配错误: {e}")

    # 测试正常渲染
    try:
        result = prompt_loader.get_prompt(Prompts.CARD_GENERATION, Prompts.GENERATE_ANSWER, question="测试问题")
        print(f"   ✓ 正常渲染成功，长度: {len(result)} 字符")
    except Exception as e:
        print(f"   ✗ 意外错误: {e}")

    print("\n=== 测试完成 ===")


if __name__ == "__main__":
    test_prompt_loading()