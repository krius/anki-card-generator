import request from 'supertest';
import express from 'express';
import { CardController } from '../controllers/cardController';
import { LLMService } from '../services/llmService';
import { AnkiService } from '../services/ankiService';

// Mock implementations for testing
jest.mock('../services/llmService');
jest.mock('../services/ankiService');

const mockLLMService = LLMService as jest.MockedClass<typeof LLMService>;
const mockAnkiService = AnkiService as jest.MockedClass<typeof AnkiService>;

describe('CardController', () => {
  let app: express.Application;
  let cardController: CardController;

  beforeEach(() => {
    app = express();
    cardController = new CardController();

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock returns
    mockLLMService.prototype.generateAnswerWithImage = jest.fn().mockResolvedValue({
      success: true,
      answer: '这是一个测试回答',
      tokensUsed: 150,
      model: 'gpt-4'
    });

    mockLLMService.prototype.qualityCheck = jest.fn().mockResolvedValue({
      passed: true,
      score: 85,
      issues: [],
      suggestions: []
    });

    mockAnkiService.prototype.exportAnkiPackage = jest.fn().mockResolvedValue(
      Buffer.from('mock apkg content')
    );
  });

  describe('POST /api/cards/generate', () => {
    const validRequest = {
      question: '什么是人工智能？',
      cardType: 'basic',
      tags: ['AI', '技术'],
      deckName: '测试牌组',
      llmProvider: 'openai'
    };

    it('应该成功生成单张卡片', async () => {
      app.post('/api/cards/generate', cardController.generateCard);

      const response = await request(app)
        .post('/api/cards/generate')
        .send(validRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('front', validRequest.question);
      expect(response.body.data).toHaveProperty('back');
      expect(response.body.data).toHaveProperty('qualityCheck');
      expect(mockLLMService.prototype.generateAnswerWithImage).toHaveBeenCalledWith(
        validRequest.question,
        undefined,
        'openai'
      );
      expect(mockLLMService.prototype.qualityCheck).toHaveBeenCalled();
    });

    it('应该验证必需字段', async () => {
      app.post('/api/cards/generate', cardController.generateCard);

      // 缺少问题字段
      const response = await request(app)
        .post('/api/cards/generate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Question is required');
    });

    it('应该验证问题长度', async () => {
      app.post('/api/cards/generate', cardController.generateCard);

      const longQuestion = 'a'.repeat(1001);
      const response = await request(app)
        .post('/api/cards/generate')
        .send({ ...validRequest, question: longQuestion })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('less than 1000 characters');
    });
  });

  describe('POST /api/cards/generate/batch', () => {
    const validBatchRequest = {
      questions: [
        { question: '问题1', imageUrl: 'image1.jpg' },
        { question: '问题2' },
        '问题3',
        '问题4'
      ],
      settings: {
        llmProvider: 'openai',
        deckName: '批量测试牌组',
        tags: ['批量', '测试']
      }
    };

    it('应该成功批量生成卡片', async () => {
      app.post('/api/cards/generate/batch', cardController.generateCards);

      const response = await request(app)
        .post('/api/cards/generate/batch')
        .send(validBatchRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cards');
      expect(response.body.data).toHaveProperty('errors');
      expect(Array.isArray(response.body.data.cards)).toBe(true);
    });

    it('应该验证批量大小限制', async () => {
      app.post('/api/cards/generate/batch', cardController.generateCards);

      const tooManyQuestions = Array(21).fill('问题');
      const response = await request(app)
        .post('/api/cards/generate/batch')
        .send({ questions: tooManyQuestions })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Maximum 20 questions');
    });
  });

  describe('POST /api/cards/quality-check', () => {
    const validQualityRequest = {
      card: {
        id: 'test-card-id',
        front: '这是测试正面',
        back: '这是测试背面',
        tags: ['测试']
      }
    };

    it('应该执行质量检查', async () => {
      app.post('/api/cards/quality-check', cardController.checkQuality);

      const response = await request(app)
        .post('/api/cards/quality-check')
        .send(validQualityRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('passed');
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('issues');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(mockLLMService.prototype.qualityCheck).toHaveBeenCalledWith(validQualityRequest.card);
    });

    it('应该验证卡片内容', async () => {
      app.post('/api/cards/quality-check', cardController.checkQuality);

      const response = await request(app)
        .post('/api/cards/quality-check')
        .send({ card: { front: '', back: '' } })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('non-empty front content');
    });
  });

  describe('POST /api/cards/improve', () => {
    const validImproveRequest = {
      card: {
        id: 'improve-card-id',
        front: '原始正面内容',
        back: '原始背面内容',
        tags: ['改进']
      },
      issues: ['内容不够详细', '需要更多例子'],
      suggestions: ['增加具体案例', '补充更多细节']
    };

    it('应该改进卡片质量', async () => {
      app.post('/api/cards/improve', cardController.improveCard);

      // Mock improvement response
      mockLLMService.prototype['callOpenAI'] = jest.fn().mockResolvedValue({
        choices: [{
          message: { content: '改进的正面：详细内容\n改进的背面：丰富内容\n改进说明：已优化' }
        }]
      });

      // Mock updated quality check
      mockLLMService.prototype.qualityCheck = jest.fn().mockResolvedValue({
        passed: true,
        score: 95,
        issues: [],
        suggestions: []
      });

      const response = await request(app)
        .post('/api/cards/improve')
        .send(validImproveRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('front');
      expect(response.body.data).toHaveProperty('back');
      expect(response.body.data).toHaveProperty('improvementSummary');
    });
  });

  describe('POST /api/cards/export', () => {
    const validExportRequest = {
      cards: [
        {
          id: 'export-card-1',
          front: '导出测试卡片1',
          back: '导出测试答案1',
          tags: ['导出', '测试']
        },
        {
          id: 'export-card-2',
          front: '导出测试卡片2',
          back: '导出测试答案2',
          tags: ['导出', '测试']
        }
      ],
      deckName: '测试导出牌组',
      includeMedia: false
    };

    it('应该成功导出Anki包', async () => {
      app.post('/api/cards/export', cardController.exportAnkiPackage);

      const response = await request(app)
        .post('/api/cards/export')
        .send(validExportRequest)
        .expect(200);

      // Should receive a buffer (binary data)
      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(mockAnkiService.prototype.exportAnkiPackage).toHaveBeenCalledWith(
        validExportRequest.cards,
        validExportRequest.deckName
      );
    });

    it('应该验证导出数据', async () => {
      app.post('/api/cards/export', cardController.exportAnkiPackage);

      // 空的卡片数组
      const response = await request(app)
        .post('/api/cards/export')
        .send({ cards: [], deckName: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cards array is required');
    });

    it('应该验证牌组名称', async () => {
      app.post('/api/cards/export', cardController.exportAnkiPackage);

      const response = await request(app)
        .post('/api/cards/export')
        .send({ ...validExportRequest, deckName: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Deck name is required');
    });
  });

  describe('错误处理', () => {
    it('应该处理LLM服务错误', async () => {
      app.post('/api/cards/generate', cardController.generateCard);

      // Mock LLM error
      mockLLMService.prototype.generateAnswerWithImage = jest.fn().mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded'
      });

      const response = await request(app)
        .post('/api/cards/generate')
        .send({
          question: '测试问题',
          llmProvider: 'openai'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to generate answer');
    });

    it('应该处理Anki服务错误', async () => {
      app.post('/api/cards/export', cardController.exportAnkiPackage);

      // Mock Anki service error
      mockAnkiService.prototype.exportAnkiPackage = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/cards/export')
        .send({
          cards: [{ id: 'test', front: 'test', back: 'test' }],
          deckName: 'test'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to export Anki package');
    });
  });

  describe('健康检查', () => {
    it('GET /health 应该返回服务状态', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.message).toContain('running');
    });

    it('GET /api 应该返回API信息', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Anki Card Generator API');
      expect(response.body.endpoints).toHaveProperty('generate');
      expect(response.body.endpoints).toHaveProperty('export');
    });
  });
});

// 集成测试
describe('CardController Integration', () => {
  it('应该处理完整的卡片生成流程', async () => {
    const app = express();
    const cardController = new CardController();
    app.post('/api/cards/generate', cardController.generateCard);

    const testRequest = {
      question: '什么是机器学习？',
      imageUrl: 'data:image/png;base64,testimage',
      cardType: 'basic',
      llmProvider: 'openai'
    };

    // Mock successful generation
    mockLLMService.prototype.generateAnswerWithImage = jest.fn().mockResolvedValue({
      success: true,
      answer: '机器学习是人工智能的一个分支，它使计算机能够在没有明确编程的情况下学习和改进。',
      tokensUsed: 200,
      model: 'gpt-4'
    });

    mockLLMService.prototype.qualityCheck = jest.fn().mockResolvedValue({
      passed: true,
      score: 88,
      issues: [],
      suggestions: ['可以考虑添加具体例子']
    });

    const response = await request(app)
      .post('/api/cards/generate')
      .send(testRequest)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.front).toBe(testRequest.question);
    expect(response.body.data.back).toContain('机器学习');
    expect(response.body.data.qualityCheck.passed).toBe(true);
    expect(response.body.data.qualityCheck.score).toBe(88);
  });
});