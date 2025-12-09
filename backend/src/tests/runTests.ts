import request from 'supertest';
import { app } from '../index';

const API_BASE = '/api/cards';

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [] as string[]
};

const testLog = (message: string, type: 'info' | 'pass' | 'fail' = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);

  testResults.total++;
  if (type === 'pass') testResults.passed++;
  if (type === 'fail') testResults.failed++;
  testResults.details.push(`${prefix} ${message}`);
};

const runHealthCheck = async () => {
  testLog('执行健康检查...');
  try {
    const response = await request(app)
      .get(`${API_BASE}/health`)
      .expect(200);

    if (response.body.success && response.body.message) {
      testLog('健康检查通过', 'pass');
    } else {
      testLog(`健康检查失败: ${JSON.stringify(response.body)}`, 'fail');
    }
  } catch (error) {
    testLog(`健康检查异常: ${error}`, 'fail');
  }
};

const runCardGeneration = async () => {
  testLog('执行卡片生成测试...');

  // 测试必需字段验证
  try {
    const response1 = await request(app)
      .post(`${API_BASE}/generate`)
      .send({})
      .expect(400);

    if (!response1.body.success) {
      testLog('空请求验证通过', 'pass');
    } else {
      testLog('空请求验证失败', 'fail');
    }
  } catch (error) {
    testLog(`空请求验证异常: ${error}`, 'fail');
  }

  // 测试无效卡片类型
  try {
    const response2 = await request(app)
      .post(`${API_BASE}/generate`)
      .send({
        question: '什么是React？',
        cardType: 'invalid-type',
        llmProvider: 'openai'
      })
      .expect(400);

    if (!response2.body.success && response2.body.error?.includes('Invalid card type')) {
      testLog('无效卡片类型验证通过', 'pass');
    } else {
      testLog('无效卡片类型验证失败', 'fail');
    }
  } catch (error) {
    testLog(`无效卡片类型验证异常: ${error}`, 'fail');
  }

  // 测试空问题字段验证
  try {
    const response3 = await request(app)
      .post(`${API_BASE}/generate`)
      .send({
        question: '',
        llmProvider: 'openai'
      })
      .expect(400);

    if (!response3.body.success) {
      testLog('空问题字段验证通过', 'pass');
    } else {
      testLog('空问题字段验证失败', 'fail');
    }
  } catch (error) {
    testLog(`空问题字段验证异常: ${error}`, 'fail');
  }

  // 测试OpenAI提供商无API密钥
  try {
    const response4 = await request(app)
      .post(`${API_BASE}/generate`)
      .send({
        question: '什么是React？',
        cardType: 'basic',
        llmProvider: 'openai'
      })
      .expect(200);

    if (!response4.body.success && response4.body.error?.includes('OpenAI API密钥未配置')) {
      testLog('OpenAI无API密钥验证通过', 'pass');
    } else {
      testLog('OpenAI无API密钥验证失败', 'fail');
    }
  } catch (error) {
    testLog(`OpenAI无API密钥验证异常: ${error}`, 'fail');
  }

  // 测试Claude提供商无API密钥
  try {
    const response5 = await request(app)
      .post(`${API_BASE}/generate`)
      .send({
        question: '什么是React？',
        cardType: 'basic',
        llmProvider: 'claude'
      })
      .expect(200);

    if (!response5.body.success && response5.body.error?.includes('Claude API密钥未配置')) {
      testLog('Claude无API密钥验证通过', 'pass');
    } else {
      testLog('Claude无API密钥验证失败', 'fail');
    }
  } catch (error) {
    testLog(`Claude无API密钥验证异常: ${error}`, 'fail');
  }

  // 测试默认提供商处理
  try {
    const response6 = await request(app)
      .post(`${API_BASE}/generate`)
      .send({
        question: '什么是React？',
        cardType: 'basic'
      })
      .expect(200);

    if (!response6.body.success && response6.body.error?.includes('OpenAI API密钥未配置')) {
      testLog('默认提供商验证通过', 'pass');
    } else {
      testLog('默认提供商验证失败', 'fail');
    }
  } catch (error) {
    testLog(`默认提供商验证异常: ${error}`, 'fail');
  }
};

const runBatchGeneration = async () => {
  testLog('执行批量生成测试...');

  try {
    // 测试空数组
    const response1 = await request(app)
      .post(`${API_BASE}/generate/batch`)
      .send({ questions: [] })
      .expect(400);

    if (!response1.body.success) {
      testLog('空问题数组验证通过', 'pass');
    } else {
      testLog('空问题数组验证失败', 'fail');
    }

    // 测试超出限制
    const response2 = await request(app)
      .post(`${API_BASE}/generate/batch`)
      .send({ questions: Array(25).fill('问题') })
      .expect(400);

    if (!response2.body.success && response2.body.error?.includes('Maximum 20 questions')) {
      testLog('批量大小限制验证通过', 'pass');
    } else {
      testLog('批量大小限制验证失败', 'fail');
    }

    // 测试有效批量请求格式（预期因无API密钥而失败）
    const response3 = await request(app)
      .post(`${API_BASE}/generate/batch`)
      .send({
        questions: ['问题1', '问题2', '问题3'],
        settings: {
          llmProvider: 'openai',
          deckName: '批量测试',
          tags: ['批量测试']
        }
      })
      .expect(200);

    if (!response3.body.success && response3.body.error?.includes('OpenAI API密钥未配置')) {
      testLog('有效批量请求格式验证通过', 'pass');
    } else {
      testLog('有效批量请求格式验证失败', 'fail');
    }

  } catch (error) {
    testLog(`批量生成测试异常: ${error}`, 'fail');
  }
};

const runQualityCheck = async () => {
  testLog('执行质量检查测试...');

  try {
    // 测试缺少卡片对象
    const response1 = await request(app)
      .post(`${API_BASE}/quality-check`)
      .send({})
      .expect(400);

    if (!response1.body.success) {
      testLog('缺少卡片对象验证通过', 'pass');
    } else {
      testLog('缺少卡片对象验证失败', 'fail');
    }

    // 测试空卡片内容
    const response2 = await request(app)
      .post(`${API_BASE}/quality-check`)
      .send({ card: { front: '', back: '测试' } })
      .expect(400);

    if (!response2.body.success && response2.body.error?.includes('front content')) {
      testLog('空卡片内容验证通过', 'pass');
    } else {
      testLog('空卡片内容验证失败', 'fail');
    }

    // 测试有效质量检查请求（应返回默认评分）
    const response3 = await request(app)
      .post(`${API_BASE}/quality-check`)
      .send({
        card: {
          front: '什么是React？',
          back: 'React是一个前端框架',
          cardType: 'basic'
        }
      })
      .expect(200);

    if (response3.body.success && response3.body.data?.hasOwnProperty('score')) {
      testLog('有效质量检查请求验证通过', 'pass');
    } else {
      testLog('有效质量检查请求验证失败', 'fail');
    }

  } catch (error) {
    testLog(`质量检查测试异常: ${error}`, 'fail');
  }
};

const runExportTest = async () => {
  testLog('执行导出测试...');

  try {
    // 测试空卡片数组
    const response1 = await request(app)
      .post(`${API_BASE}/export`)
      .send({ cards: [] })
      .expect(400);

    if (!response1.body.success) {
      testLog('空卡片数组验证通过', 'pass');
    } else {
      testLog('空卡片数组验证失败', 'fail');
    }

    // 测试缺少牌组名称
    const response2 = await request(app)
      .post(`${API_BASE}/export`)
      .send({
        cards: [{
          front: '测试',
          back: '测试',
          cardType: 'basic',
          tags: ['前端', 'JavaScript']
        }],
        deckName: ''
      })
      .expect(400);

    if (!response2.body.success && response2.body.error?.includes('Deck name is required')) {
      testLog('缺少牌组名称验证通过', 'pass');
    } else {
      testLog('缺少牌组名称验证失败', 'fail');
    }

    // 测试有效导出请求
    const response3 = await request(app)
      .post(`${API_BASE}/export`)
      .send({
        cards: [{
          front: '什么是React？',
          back: 'React是Facebook开发的用户界面库。',
          cardType: 'basic',
          tags: ['前端', 'JavaScript']
        }],
        deckName: '测试牌组'
      })
      .expect(200);

    if (response3.headers['content-type']?.includes('application/zip')) {
      testLog('有效导出请求验证通过', 'pass');
    } else {
      testLog('有效导出请求验证失败', 'fail');
    }

  } catch (error) {
    testLog(`导出测试异常: ${error}`, 'fail');
  }
};

const checkEnvironment = () => {
  testLog('检查测试环境...');

  // 检查Node.js版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 16) {
    testLog(`Node.js版本过低: ${nodeVersion}，需要 >= 16.0.0`, 'fail');
  } else {
    testLog(`Node.js版本检查通过: ${nodeVersion}`, 'pass');
  }
};

const printTestSummary = () => {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 测试结果汇总');
  console.log('='.repeat(50));
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.details
      .filter(detail => detail.includes('❌'))
      .forEach(detail => console.log(`  ${detail}`));
  }

  console.log('\n' + '='.repeat(50));

  if (testResults.failed === 0) {
    console.log('🎉 所有测试通过！后端API功能正常。');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败，请检查API密钥和服务配置。');
    process.exit(1);
  }
};

const main = async () => {
  console.log('🧪 开始运行后端API测试...\n');

  try {
    await checkEnvironment();
    await runHealthCheck();
    await runCardGeneration();
    await runBatchGeneration();
    await runQualityCheck();
    await runExportTest();

    printTestSummary();
  } catch (error) {
    testLog(`测试运行异常: ${error}`, 'fail');
    printTestSummary();
  }
};

// 如果直接运行此文件，执行测试
if (require.main === module) {
  main();
}

export {
  main,
  testResults
};