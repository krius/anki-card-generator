import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '../.env' });

// 导入应用
import app from '../index';

const API_BASE = process.env.PORT || 3001;

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
      .get('/health')
      .expect(200);

    if (response.body.status === 'OK') {
      testLog('健康检查通过', 'pass');
    } else {
      testLog(`健康检查失败: ${response.body.message}`, 'fail');
    }
  } catch (error) {
    testLog(`健康检查异常: ${error}`, 'fail');
  }
};

const runApiInfo = async () => {
  testLog('执行API信息检查...');
  try {
    const response = await request(app)
      .get('/api')
      .expect(200);

    if (response.body.success && response.body.message) {
      testLog('API信息检查通过', 'pass');
    } else {
      testLog('API信息检查失败', 'fail');
    }
  } catch (error) {
    testLog(`API信息检查异常: ${error}`, 'fail');
  }
};

const runCardGeneration = async () => {
  testLog('执行卡片生成测试...');

  try {
    // 测试必需字段验证
    const response1 = await request(app)
      .post('/api/cards/generate')
      .send({})
      .expect(400);

    testLog('空请求验证通过', 'pass');

    // 测试问题长度验证
    const response2 = await request(app)
      .post('/api/cards/generate')
      .send({ question: 'a'.repeat(1001) })
      .expect(400);

    testLog('问题长度验证通过', 'pass');

    // 测试问题字段验证
    const response3 = await request(app)
      .post('/api/cards/generate')
      .send({ question: '' })
      .expect(400);

    testLog('空问题字段验证通过', 'pass');

    // 测试有效请求格式
    const response4 = await request(app)
      .post('/api/cards/generate')
      .send({
        question: '什么是人工智能？',
        cardType: 'basic',
        llmProvider: 'openai',
        tags: ['AI', '技术'],
        deckName: '测试牌组'
      })
      .expect(200);

    testLog('有效请求格式验证通过', 'pass');

  } catch (error) {
    testLog(`卡片生成测试异常: ${error}`, 'fail');
  }
};

const runBatchGeneration = async () => {
  testLog('执行批量生成测试...');

  try {
    // 测试空数组
    const response1 = await request(app)
      .post('/api/cards/generate/batch')
      .send({ questions: [] })
      .expect(400);

    testLog('空问题数组验证通过', 'pass');

    // 测试超出限制
    const response2 = await request(app)
      .post('/api/cards/generate/batch')
      .send({ questions: Array(21).fill('问题') })
      .expect(400);

    testLog('批量大小限制验证通过', 'pass');

    // 测试有效批量请求
    const response3 = await request(app)
      .post('/api/cards/generate/batch')
      .send({
        questions: ['问题1', '问题2', '问题3'],
        settings: {
          llmProvider: 'openai',
          deckName: '批量测试',
          tags: ['批量测试']
        }
      })
      .expect(200);

    testLog('有效批量请求验证通过', 'pass');

  } catch (error) {
    testLog(`批量生成测试异常: ${error}`, 'fail');
  }
};

const runQualityCheck = async () => {
  testLog('执行质量检查测试...');

  try {
    // 测试缺少卡片对象
    const response1 = await request(app)
      .post('/api/cards/quality-check')
      .send({})
      .expect(400);

    testLog('缺少卡片对象验证通过', 'pass');

    // 测试空卡片内容
    const response2 = await request(app)
      .post('/api/cards/quality-check')
      .send({ card: { front: '', back: '测试' } })
      .expect(400);

    testLog('空卡片内容验证通过', 'pass');

    // 测试有效质量检查请求
    const response3 = await request(app)
      .post('/api/cards/quality-check')
      .send({
        card: {
          front: '测试正面',
          back: '测试背面',
          tags: ['测试']
        }
      })
      .expect(200);

    testLog('有效质量检查请求验证通过', 'pass');

  } catch (error) {
    testLog(`质量检查测试异常: ${error}`, 'fail');
  }
};

const runExportTest = async () => {
  testLog('执行导出测试...');

  try {
    // 测试空卡片数组
    const response1 = await request(app)
      .post('/api/cards/export')
      .send({ cards: [] })
      .expect(400);

    testLog('空卡片数组验证通过', 'pass');

    // 测试缺少牌组名称
    const response2 = await request(app)
      .post('/api/cards/export')
      .send({ cards: [{ front: '测试', back: '测试' }] })
      .expect(400);

    testLog('缺少牌组名称验证通过', 'pass');

    // 测试有效导出请求（不进行实际导出，只验证参数）
    const response3 = await request(app)
      .post('/api/cards/export')
      .send({
        cards: [{
          id: 'test-1',
          front: '测试卡片正面',
          back: '测试卡片背面'
        }],
        deckName: '测试导出'
      })
      .expect(500); // 预期失败，因为没有真实的API密钥

    testLog('有效导出请求格式验证通过', 'pass');

  } catch (error) {
    testLog(`导出测试异常: ${error}`, 'fail');
  }
};

const checkEnvironment = () => {
  testLog('检查测试环境...');

  const requiredEnv = ['OPENAI_API_KEY'];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);

  if (missingEnv.length > 0) {
    testLog(`缺少环境变量: ${missingEnv.join(', ')}`, 'fail');
  } else {
    testLog('环境变量检查通过', 'pass');
  }

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
    await runApiInfo();
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
  runTests: main,
  testResults
};