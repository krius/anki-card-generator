import { LLMResponse, AnkiCard, QualityCheckResult } from '../types';
import OpenAI from 'openai';

export class LLMService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.ZHIPU_API_KEY || '';
    const baseURL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';

    // 确保API密钥已加载
    if (!apiKey) {
      console.error('[LLMService] API Key not found in environment variables');
      throw new Error('ZHIPU_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });

    this.model = process.env.ZHIPU_MODEL || 'glm-4';
  }

  /**
   * 基于问题生成回答
   */
  async generateAnswer(question: string): Promise<LLMResponse> {
    try {
      const prompt = this.buildQuestionPrompt(question);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的学习卡片设计师，擅长创建高质量、易记的Anki卡片。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const answer = completion.choices[0]?.message?.content;

      return {
        success: true,
        answer: answer?.trim(),
        tokensUsed: completion.usage?.total_tokens,
        model: completion.model,
      };
    } catch (error) {
      console.error('Error generating answer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API调用失败'
      };
    }
  }

  /**
   * 质检Agent：检查生成的卡片质量
   */
  async qualityCheck(card: AnkiCard): Promise<QualityCheckResult> {
    try {
      const prompt = this.buildQualityCheckPrompt(card);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的Anki卡片质量评估师，擅长评估学习卡片的质量。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const answer = completion.choices[0]?.message?.content;

      if (!answer) {
        return {
          passed: false,
          score: 0,
          issues: ['质量检查失败'],
          suggestions: []
        };
      }

      return this.parseQualityCheckResponse(answer);
    } catch (error) {
      console.error('Error in quality check:', error);
      return {
        passed: false,
        score: 0,
        issues: ['质量检查出错'],
        suggestions: []
      };
    }
  }

  /**
   * 构建问题生成提示词
   */
  private buildQuestionPrompt(question: string): string {
    return `
请基于以下问题生成一个高质量的Anki学习卡片回答：

问题：${question}

要求：
1. 回答要准确、简洁明了
2. 适合记忆和理解
3. 重点突出关键概念
4. 可以适当举例说明
5. 长度控制在100-300字之间

请直接给出回答内容，不要包含其他格式说明。
`;
  }

  /**
   * 构建质量检查提示词
   */
  private buildQualityCheckPrompt(card: AnkiCard): string {
    return `
请对这个Anki学习卡片进行质量评估：

卡片内容：
正面：${card.front}
背面：${card.back}

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
`;
  }

  /**
   * 解析质量检查回复
   */
  private parseQualityCheckResponse(response: string): QualityCheckResult {
    try {
      const lines = response.split('\n');
      let score = 70; // 默认分数
      let passed = true;
      const issues: string[] = [];
      const suggestions: string[] = [];

      lines.forEach(line => {
        const trimmedLine = line.trim();

        if (trimmedLine.includes('总分：')) {
          const match = trimmedLine.match(/(\d+)/);
          if (match) {
            score = parseInt(match[1]);
          }
        }

        if (trimmedLine.includes('是否通过：')) {
          passed = trimmedLine.includes('是');
        }

        if (trimmedLine.match(/^\d+\./) || trimmedLine.match(/^[-*]\s/)) {
          if (trimmedLine.includes('问题') || issues.length > 0) {
            if (suggestions.length === 0) {
              issues.push(trimmedLine.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, ''));
            }
          } else {
            suggestions.push(trimmedLine.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, ''));
          }
        }
      });

      return {
        passed: passed && score >= 70,
        score,
        issues: issues.length > 0 ? issues : passed ? [] : ['内容需要改进'],
        suggestions: suggestions.length > 0 ? suggestions : ['建议添加更多细节']
      };
    } catch (error) {
      console.error('Error parsing quality check response:', error);
      return {
        passed: false,
        score: 0,
        issues: ['解析质量检查结果失败'],
        suggestions: []
      };
    }
  }

  }