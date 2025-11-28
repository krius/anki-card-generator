import { LLMResponse, AnkiCard, QualityCheckResult } from '../types';
import axios from 'axios';

export class LLMService {
  private openaiApiKey: string;
  private claudeApiKey?: string;
  private imageApiKey?: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY || undefined;
    this.imageApiKey = process.env.ZAI_API_KEY || '';
  }

  /**
   * 基于问题生成回答
   */
  async generateAnswer(question: string, provider: 'openai' | 'claude' = 'openai'): Promise<LLMResponse> {
    try {
      const prompt = this.buildQuestionPrompt(question);

      if (provider === 'openai') {
        return await this.callOpenAI(prompt);
      } else {
        return await this.callClaude(prompt);
      }
    } catch (error) {
      console.error('Error generating answer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 基于图片和问题生成回答
   */
  async generateAnswerWithImage(question: string, imageUrl: string, provider: 'openai' | 'claude' = 'openai'): Promise<LLMResponse> {
    try {
      if (provider === 'openai') {
        return await this.callOpenAIWithImage(question, imageUrl);
      } else {
        return await this.callClaudeWithImage(question, imageUrl);
      }
    } catch (error) {
      console.error('Error generating answer with image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 质检Agent：检查生成的卡片质量
   */
  async qualityCheck(card: AnkiCard): Promise<QualityCheckResult> {
    try {
      const prompt = this.buildQualityCheckPrompt(card);
      const response = await this.callOpenAI(prompt);

      if (!response.success || !response.answer) {
        return {
          passed: false,
          score: 0,
          issues: ['Failed to perform quality check'],
          suggestions: ['Please try again or manually review the card']
        };
      }

      // 解析质检结果
      const result = this.parseQualityCheckResponse(response.answer);
      return result;
    } catch (error) {
      console.error('Error in quality check:', error);
      return {
        passed: false,
        score: 0,
        issues: ['Quality check service unavailable'],
        suggestions: ['Please manually review the card before exporting']
      };
    }
  }

  /**
   * 调用OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的知识导师，擅长为学习者生成清晰、准确、有用的回答。请确保你的回答准确、完整且易于理解。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const answer = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      return {
        success: true,
        answer: answer.trim(),
        tokensUsed,
        model: response.data.model
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * 调用OpenAI API with image
   */
  private async callOpenAIWithImage(question: string, imageUrl: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的知识导师，能够分析图片并回答相关问题。请仔细观察图片，并根据用户的问题提供准确、详细的回答。'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `请根据这张图片回答以下问题：${question}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const answer = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      return {
        success: true,
        answer: answer.trim(),
        tokensUsed,
        model: response.data.model
      };
    } catch (error: any) {
      console.error('OpenAI Vision API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * 调用Claude API
   */
  private async callClaude(prompt: string): Promise<LLMResponse> {
    if (!this.claudeApiKey) {
      return {
        success: false,
        error: 'Claude API key not configured'
      };
    }

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `你是一个专业的知识导师，擅长为学习者生成清晰、准确、有用的回答。请确保你的回答准确、完整且易于理解。\n\n${prompt}`
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.claudeApiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      const answer = response.data.content[0]?.text || '';
      const tokensUsed = response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0;

      return {
        success: true,
        answer: answer.trim(),
        tokensUsed,
        model: response.data.model
      };
    } catch (error: any) {
      console.error('Claude API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * 调用Claude API with image
   */
  private async callClaudeWithImage(question: string, imageUrl: string): Promise<LLMResponse> {
    if (!this.claudeApiKey) {
      return {
        success: false,
        error: 'Claude API key not configured'
      };
    }

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '你是一个专业的知识导师，能够分析图片并回答相关问题。请仔细观察图片，并根据用户的问题提供准确、详细的回答。'
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageUrl // 这里需要base64编码的图片数据
                  }
                },
                {
                  type: 'text',
                  text: `请根据这张图片回答以下问题：${question}`
                }
              ]
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.claudeApiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      const answer = response.data.content[0]?.text || '';
      const tokensUsed = response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0;

      return {
        success: true,
        answer: answer.trim(),
        tokensUsed,
        model: response.data.model
      };
    } catch (error: any) {
      console.error('Claude Vision API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * 构建问题提示词
   */
  private buildQuestionPrompt(question: string): string {
    return `
请为以下问题提供一个清晰、准确、完整的回答：

问题：${question}

要求：
1. 回答要准确、客观
2. 语言要简洁明了，易于理解
3. 如果是复杂概念，请提供简单的例子
4. 回答长度适中，适合制作成学习卡片
5. 避免过于冗长的解释，保持重点突出

请直接回答问题，不需要额外的格式化。
`;
  }

  /**
   * 构建质检提示词
   */
  private buildQualityCheckPrompt(card: AnkiCard): string {
    return `
请对以下Anki学习卡片进行质量评估，并给出具体的改进建议：

卡片正面（问题）：${card.front}
卡片背面（回答）：${card.back}

请从以下几个方面评估：
1. 准确性：内容是否准确无误
2. 清晰度：表述是否清晰易懂
3. 完整性：回答是否完整
4. 适合性：是否适合制作成学习卡片
5. 格式：是否有格式问题

请按以下格式回复：
分数：[0-100分]
是否通过：[是/否]
问题：[具体问题列表]
建议：[改进建议列表]
`;
  }

  /**
   * 解析质检结果
   */
  private parseQualityCheckResponse(response: string): QualityCheckResult {
    try {
      // 简单的解析逻辑，实际使用中可能需要更复杂的解析
      const lines = response.split('\n');
      let score = 50; // 默认分数
      let passed = false;
      const issues: string[] = [];
      const suggestions: string[] = [];

      lines.forEach(line => {
        if (line.includes('分数：')) {
          const match = line.match(/(\d+)/);
          if (match) score = parseInt(match[1]);
        }
        if (line.includes('是否通过：')) {
          passed = line.includes('是');
        }
        if (line.includes('问题：') || line.includes('Issues：')) {
          // 提取问题部分
          const problemText = line.replace(/^(问题：|Issues：)/, '').trim();
          if (problemText) issues.push(problemText);
        }
        if (line.includes('建议：') || line.includes('Suggestions：')) {
          // 提取建议部分
          const suggestionText = line.replace(/^(建议：|Suggestions：)/, '').trim();
          if (suggestionText) suggestions.push(suggestionText);
        }
      });

      return {
        passed,
        score,
        issues,
        suggestions
      };
    } catch (error) {
      console.error('Error parsing quality check response:', error);
      return {
        passed: false,
        score: 0,
        issues: ['Failed to parse quality check result'],
        suggestions: ['Please manually review the card']
      };
    }
  }
}