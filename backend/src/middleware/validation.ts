import { Request, Response, NextFunction } from 'express';
import { CardGenerationRequest } from '../types';

/**
 * 验证卡片生成请求数据
 */
export const validateCardRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CardGenerationRequest = req.body;

    // 验证必填字段
    if (!data.question || typeof data.question !== 'string' || data.question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Question is required and must be a non-empty string'
      });
    }

    // 验证问题长度
    if (data.question.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Question must be less than 1000 characters'
      });
    }

    // 验证可选字段
    if (data.imageUrl && typeof data.imageUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Image URL must be a string'
      });
    }

    if (data.cardType && !['basic', 'cloze', 'basic-reversed', 'input'].includes(data.cardType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card type. Must be one of: basic, cloze, basic-reversed, input'
      });
    }

    if (data.tags) {
      if (!Array.isArray(data.tags)) {
        return res.status(400).json({
          success: false,
          error: 'Tags must be an array'
        });
      }

      // 验证标签格式
      for (const tag of data.tags) {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Each tag must be a non-empty string'
          });
        }
        if (tag.length > 50) {
          return res.status(400).json({
            success: false,
            error: 'Each tag must be less than 50 characters'
          });
        }
      }
    }

    if (data.deckName && typeof data.deckName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Deck name must be a string'
      });
    }

    if (data.deckName && data.deckName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Deck name must be less than 100 characters'
      });
    }

    // 清理和标准化数据
    req.body = {
      question: data.question.trim(),
      imageUrl: data.imageUrl?.trim(),
      cardType: data.cardType || 'basic',
      tags: data.tags?.map(tag => tag.trim()).filter(tag => tag.length > 0) || [],
      deckName: data.deckName?.trim() || 'Default'
    };

    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid request format'
    });
  }
};

/**
 * 验证批量生成请求
 */
export const validateBatchRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questions, settings } = req.body;

    // 验证questions数组
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Questions array is required and cannot be empty'
      });
    }

    if (questions.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 questions allowed per batch'
      });
    }

    // 验证每个问题
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];

      if (typeof item === 'string') {
        // 简单字符串问题
        if (!item.trim()) {
          return res.status(400).json({
            success: false,
            error: `Question at index ${i} cannot be empty`
          });
        }
        if (item.length > 1000) {
          return res.status(400).json({
            success: false,
            error: `Question at index ${i} must be less than 1000 characters`
          });
        }
      } else if (typeof item === 'object' && item !== null) {
        // 包含图片的问题对象
        if (!item.question || typeof item.question !== 'string' || !item.question.trim()) {
          return res.status(400).json({
            success: false,
            error: `Question at index ${i} is required`
          });
        }
        if (item.question.length > 1000) {
          return res.status(400).json({
            success: false,
            error: `Question at index ${i} must be less than 1000 characters`
          });
        }
        if (item.imageUrl && typeof item.imageUrl !== 'string') {
          return res.status(400).json({
            success: false,
            error: `Image URL at index ${i} must be a string`
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: `Question at index ${i} must be a string or object`
        });
      }
    }

    // 验证设置
    if (settings) {
      if (typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Settings must be an object'
        });
      }

      if (settings.llmProvider && !['openai', 'claude'].includes(settings.llmProvider)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid LLM provider. Must be "openai" or "claude"'
        });
      }

      if (settings.deckName && typeof settings.deckName !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Deck name in settings must be a string'
        });
      }

      if (settings.tags && !Array.isArray(settings.tags)) {
        return res.status(400).json({
          success: false,
          error: 'Tags in settings must be an array'
        });
      }

      if (settings.cardType && !['basic', 'cloze', 'basic-reversed', 'input'].includes(settings.cardType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid card type. Must be one of: basic, cloze, basic-reversed, input'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Batch validation error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid batch request format'
    });
  }
};

/**
 * 验证导出请求
 */
export const validateExportRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cards, deckName, includeMedia } = req.body;

    // 验证cards数组
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cards array is required and cannot be empty'
      });
    }

    if (cards.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 cards allowed per export'
      });
    }

    // 验证每张卡片
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];

      if (!card.front || typeof card.front !== 'string' || !card.front.trim()) {
        return res.status(400).json({
          success: false,
          error: `Card at index ${i} must have a non-empty front content`
        });
      }

      if (!card.back || typeof card.back !== 'string' || !card.back.trim()) {
        return res.status(400).json({
          success: false,
          error: `Card at index ${i} must have a non-empty back content`
        });
      }

      if (card.front.length > 2000) {
        return res.status(400).json({
          success: false,
          error: `Card front at index ${i} must be less than 2000 characters`
        });
      }

      if (card.back.length > 2000) {
        return res.status(400).json({
          success: false,
          error: `Card back at index ${i} must be less than 2000 characters`
        });
      }
    }

    // 验证deckName
    if (!deckName || typeof deckName !== 'string' || !deckName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Deck name is required and must be a non-empty string'
      });
    }

    if (deckName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Deck name must be less than 100 characters'
      });
    }

    // 验证includeMedia
    if (includeMedia !== undefined && typeof includeMedia !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'includeMedia must be a boolean'
      });
    }

    next();
  } catch (error) {
    console.error('Export validation error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid export request format'
    });
  }
};

/**
 * 验证质检请求
 */
export const validateQualityCheckRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { card } = req.body;

    if (!card || typeof card !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Card object is required'
      });
    }

    if (!card.front || typeof card.front !== 'string' || !card.front.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Card must have a non-empty front content'
      });
    }

    if (!card.back || typeof card.back !== 'string' || !card.back.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Card must have a non-empty back content'
      });
    }

    next();
  } catch (error) {
    console.error('Quality check validation error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid quality check request format'
    });
  }
};