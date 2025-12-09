import { Request, Response, NextFunction } from 'express';
import { LLMService } from '../services/llmService';
import { AnkiService } from '../services/ankiService';
import { CardGenerationRequest, ApiResponse, AnkiCard, QualityCheckResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class CardController {
  private llmService: LLMService;
  private ankiService: AnkiService;

  constructor() {
    this.llmService = new LLMService();
    this.ankiService = new AnkiService();
  }

  /**
   * 生成单个卡片
   */
  generateCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request: CardGenerationRequest = req.body;

      if (!request.question?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Question is required'
        } as ApiResponse);
      }

  
      const llmResponse = await this.llmService.generateAnswer(request.question);

      if (!llmResponse.success || !llmResponse.answer) {
        return res.status(500).json({
          success: false,
          error: llmResponse.error || 'Failed to generate answer'
        } as ApiResponse);
      }

      const card: AnkiCard = {
        id: uuidv4(),
        front: request.question,
        back: llmResponse.answer,
        tags: request.tags || [],
        deckName: request.deckName || 'Default',
        cardType: request.cardType || 'basic'
      };

      const qualityCheck: QualityCheckResult = await this.llmService.qualityCheck(card);

      const response: ApiResponse<AnkiCard & { qualityCheck: QualityCheckResult }> = {
        success: true,
        data: {
          ...card,
          qualityCheck
        },
        message: `Card generated successfully. Quality score: ${qualityCheck.score}/100`
      };

        return res.json(response);
    } catch (error) {
      console.error('Error exporting Anki package:', error);
      return next(error);
    }
  };

  /**
   * 批量生成卡片
   */
  generateCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questions, settings }: {
        questions: string[];
        settings?: {
          llmProvider?: 'openai' | 'claude' | 'zhipu';
          deckName?: string;
          tags?: string[];
          cardType?: AnkiCard['cardType'];
        };
      } = req.body;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Questions array is required'
        } as ApiResponse);
      }

      if (questions.length > 20) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 20 questions allowed per batch'
        } as ApiResponse);
      }

  
      const cards: (AnkiCard & { qualityCheck: QualityCheckResult })[] = [];
      const errors: { index: number; error: string }[] = [];

      // 并发处理，但限制并发数
      const concurrencyLimit = 5;
      const results = [];

      for (let i = 0; i < questions.length; i += concurrencyLimit) {
        const batch = questions.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(async (q, batchIndex) => {
          const questionText = q;
          const index = i + batchIndex;

          try {
            const llmResponse = await this.llmService.generateAnswer(questionText);

            if (!llmResponse.success || !llmResponse.answer) {
              throw new Error(llmResponse.error || 'Failed to generate answer');
            }

            const card: AnkiCard = {
              id: uuidv4(),
              front: questionText,
              back: llmResponse.answer,
              tags: settings?.tags || [],
              deckName: settings?.deckName || 'Default',
              cardType: settings?.cardType || 'basic'
            };

            const qualityCheck = await this.llmService.qualityCheck(card);

            return { index, card, qualityCheck, error: null };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
              index,
              card: null,
              qualityCheck: null,
              error: errorMessage
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      // 处理结果
      results.forEach(result => {
        if (result.card && result.qualityCheck) {
          cards.push({
            ...result.card,
            qualityCheck: result.qualityCheck
          });
        } else if (result.error) {
          errors.push({ index: result.index, error: result.error });
        }
      });

    
      const response: ApiResponse<{
        cards: (AnkiCard & { qualityCheck: QualityCheckResult })[];
        errors: { index: number; error: string }[];
      }> = {
        success: true,
        data: { cards, errors },
        message: `Generated ${cards.length} cards successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      };

      return res.json(response);
    } catch (error) {
      console.error('Error generating cards:', error);
      return next(error);
    }
  };

  /**
   * 导出Anki包
   */
  exportAnkiPackage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cards, deckName, includeMedia }: {
        cards: AnkiCard[];
        deckName: string;
        includeMedia?: boolean;
      } = req.body;

      if (!cards || !Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cards array is required'
        } as ApiResponse);
      }

      if (!deckName?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Deck name is required'
        } as ApiResponse);
      }

  
      // 使用AnkiService导出
      const apkgBuffer = await this.ankiService.exportAnkiPackage({
        cards,
        deckName: deckName.trim(),
        includeMedia: includeMedia || false
      });

      // 设置响应头
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${deckName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.apkg`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', apkgBuffer.length);

  
      return res.send(apkgBuffer);
    } catch (error) {
      console.error('Error exporting Anki package:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return res.status(500).json({
        success: false,
        error: `Failed to export Anki package: ${errorMessage}`
      } as ApiResponse);
    }
  };

  /**
   * 质量检查
   */
  checkQuality = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { card }: { card: AnkiCard } = req.body;

      if (!card || !card.front?.trim() || !card.back?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Card with front and back content is required'
        } as ApiResponse);
      }

    
      const qualityCheck = await this.llmService.qualityCheck(card);

      const response: ApiResponse<QualityCheckResult> = {
        success: true,
        data: qualityCheck,
        message: `Quality check completed. Score: ${qualityCheck.score}/100`
      };

      return res.json(response);
    } catch (error) {
      console.error('Error checking quality:', error);
      return next(error);
    }
  };

  /**
   * 改进卡片
   */
  improveCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { card, issues, suggestions }: {
        card: AnkiCard;
        issues: string[];
        suggestions: string[];
      } = req.body;

      if (!card || !card.front?.trim() || !card.back?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Card with front and back content is required'
        } as ApiResponse);
      }

      
      // 构建改进提示词
      const improvementPrompt = `
请根据以下反馈改进这个Anki学习卡片：

原始卡片：
正面：${card.front}
背面：${card.back}

存在的问题：
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

改进建议：
${suggestions.map((suggestion, i) => `${i + 1}. ${suggestion}`).join('\n')}

请提供一个改进后的卡片版本，要求：
1. 保持准确性
2. 提高清晰度
3. 确保适合学习记忆
4. 长度适中

请按以下格式回复：
改进的正面：[内容]
改进的背面：[内容]
改进说明：[简要说明改进点]
`;

      const llmResponse = await this.llmService.generateAnswer(improvementPrompt);

      if (!llmResponse.success || !llmResponse.answer) {
        return res.status(500).json({
          success: false,
          error: 'Failed to improve card'
        } as ApiResponse);
      }

      // 解析改进结果
      const improvedCard = this.parseImprovedCardResponse(llmResponse.answer!, card);

      // 再次进行质量检查
      const qualityCheck = await this.llmService.qualityCheck(improvedCard);

      const response: ApiResponse<AnkiCard & {
        qualityCheck: QualityCheckResult;
        improvementSummary: string;
      }> = {
        success: true,
        data: {
          ...improvedCard,
          qualityCheck,
          improvementSummary: llmResponse.answer!
        },
        message: `Card improved successfully. New quality score: ${qualityCheck.score}/100`
      };

    
      return res.json(response);
    } catch (error) {
      console.error('Error improving card:', error);
      return next(error);
    }
  };

  /**
   * 解析改进卡片响应
   */
  private parseImprovedCardResponse(response: string, originalCard: AnkiCard): AnkiCard {
    try {
      const lines = response.split('\n');
      let improvedFront = originalCard.front;
      let improvedBack = originalCard.back;

      lines.forEach(line => {
        if (line.includes('改进的正面：') || line.includes('Improved Front:')) {
          improvedFront = line.replace(/^(改进的正面：|Improved Front:)/, '').trim();
        }
        if (line.includes('改进的背面：') || line.includes('Improved Back:')) {
          improvedBack = line.replace(/^(改进的背面：|Improved Back:)/, '').trim();
        }
        });

      return {
        ...originalCard,
        id: uuidv4(),
        front: improvedFront,
        back: improvedBack
      };
    } catch (error) {
      console.error('Error parsing improved card response:', error);
      return {
        ...originalCard,
        id: uuidv4()
      };
    }
  }
}