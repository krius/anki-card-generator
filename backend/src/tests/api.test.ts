import request from 'supertest';
import { app } from '../index';

// 基础API地址
const API_BASE = '/api/cards';

describe('📡 Anki卡片生成器 API 测试', () => {

  describe('🏥 健康检查', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app)
        .get(`${API_BASE}/health`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('🃏 卡片生成 API', () => {
    const validCardRequest = {
      question: '什么是React？',
      cardType: 'basic',
      tags: ['前端框架'],
      deckName: '技术卡片',
      llmProvider: 'openai'
    };

    it('应该拒绝空问题请求', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate`)
        .send({
          question: '',
          llmProvider: 'openai'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('required');
    });

    it('应该拒绝无效的卡片类型', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate`)
        .send({
          question: '什么是React？',
          cardType: 'invalid-type',
          llmProvider: 'openai'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid card type');
    });

    it('应该正确处理有效的请求（无API密钥）', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate`)
        .send(validCardRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('OpenAI API密钥未配置');
    });

    it('应该正确处理智谱AI提供商的请求', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate`)
        .send({
          ...validCardRequest,
          llmProvider: 'zhipu'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('智谱AI API密钥未配置');
    });

    it('应该正确处理Claude提供商的请求', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate`)
        .send({
          ...validCardRequest,
          llmProvider: 'claude'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Claude API密钥未配置');
    });

    it('应该处理默认提供商（openai）', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate`)
        .send({
          question: '什么是React？',
          cardType: 'basic'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('OpenAI API密钥未配置');
    });
  });

  describe('📦 批量生成 API', () => {
    const validBatchRequest = {
      questions: [
        '什么是React？',
        '什么是Vue？',
        '什么是Angular？'
      ],
      settings: {
        cardType: 'basic',
        deckName: '前端框架',
        tags: ['测试'],
        llmProvider: 'openai'
      }
    };

    it('应该拒绝空的questions数组', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate/batch`)
        .send({
          questions: [],
          settings: {}
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('required');
    });

    it('应该拒绝超过20个问题的请求', async () => {
      const manyQuestions = Array(25).fill('Test question?');
      const response = await request(app)
        .post(`${API_BASE}/generate/batch`)
        .send({
          questions: manyQuestions,
          settings: {}
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Maximum 20 questions');
    });

    it('应该正确处理有效的批量请求（无API密钥）', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate/batch`)
        .send(validBatchRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('OpenAI API密钥未配置');
    });
  });

  describe('🔍 质量检查 API', () => {
    const validCard = {
      front: '什么是React？',
      back: 'React是一个前端框架',
      cardType: 'basic'
    };

    it('应该拒绝空的card对象', async () => {
      const response = await request(app)
        .post(`${API_BASE}/quality-check`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('required');
    });

    it('应该拒绝空的front内容', async () => {
      const response = await request(app)
        .post(`${API_BASE}/quality-check`)
        .send({
          card: {
            front: '',
            back: 'React是一个前端框架'
          }
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('front content');
    });

    it('应该正确执行质量检查（有默认评分）', async () => {
      const response = await request(app)
        .post(`${API_BASE}/quality-check`)
        .send({ card: validCard })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('passed');
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('issues');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(typeof response.body.data.score).toBe('number');
    });
  });

  describe('✨ 卡片改进 API', () => {
    const validCard = {
      front: '什么是React？',
      back: 'React.',
      cardType: 'basic'
    };

    const improvementRequest = {
      card: validCard,
      issues: ['回答过于简短'],
      suggestions: ['添加更多细节']
    };

    it('应该拒绝无效的improve请求', async () => {
      const response = await request(app)
        .post(`${API_BASE}/improve`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('required');
    });

    it('应该正确处理改进请求（有默认处理）', async () => {
      const response = await request(app)
        .post(`${API_BASE}/improve`)
        .send(improvementRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('OpenAI API密钥未配置');
    });
  });

  describe('📤 导出API', () => {
    const validCards = [
      {
        front: '什么是React？',
        back: 'React是Facebook开发的用户界面库。',
        cardType: 'basic',
        tags: ['前端', 'JavaScript']
      }
    ];

    const validExportRequest = {
      cards: validCards,
      deckName: '测试牌组'
    };

    it('应该拒绝空的cards数组', async () => {
      const response = await request(app)
        .post(`${API_BASE}/export`)
        .send({
          cards: [],
          deckName: '测试牌组'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('required');
    });

    it('应该拒绝空的deckName', async () => {
      const response = await request(app)
        .post(`${API_BASE}/export`)
        .send({
          cards: validCards,
          deckName: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Deck name is required');
    });

    it('应该正确处理导出请求', async () => {
      const response = await request(app)
        .post(`${API_BASE}/export`)
        .send(validExportRequest)
        .expect(200);

      // 导出应该返回二进制数据
      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('🚫 错误处理', () => {
    it('应该正确处理无效的JSON请求', async () => {
      const response = await request(app)
        .post(`${API_BASE}/generate`)
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('应该正确处理不存在的API端点', async () => {
      const response = await request(app)
        .get(`${API_BASE}/nonexistent`)
        .expect(404);
    });
  });

  describe('📊 限流测试', () => {
    it('应该在合理请求量下正常工作', async () => {
      const response = await request(app)
        .get(`${API_BASE}/health`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});

// 🔧 测试工具函数
export const createTestCardRequest = (overrides: any = {}) => ({
  question: '什么是React？',
  cardType: 'basic' as const,
  tags: ['前端框架'],
  deckName: '技术卡片',
  llmProvider: 'openai' as const,
  ...overrides
});

export const createTestCard = (overrides: any = {}) => ({
  front: '什么是React？',
  back: 'React是Facebook开发的JavaScript用户界面库。',
  cardType: 'basic' as const,
  tags: ['前端', 'JavaScript'],
  ...overrides
});

export const createBatchRequest = (count: number, overrides: any = {}) => ({
  questions: Array(count).fill(undefined).map((_, i) => `测试问题 ${i + 1}`),
  settings: {
    cardType: 'basic',
    deckName: '测试牌组',
    tags: ['测试'],
    llmProvider: 'openai',
    ...overrides
  }
});