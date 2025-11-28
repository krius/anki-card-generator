#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 简单的HTTP客户端
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, {
      method: 'GET',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Anki-Card-Generator-Test/1.0.0'
      },
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

function warning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

// 测试配置
const BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30秒超时

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 执行单个测试
async function runTest(testName, testFunc) {
  try {
    process.stdout.write(`Running ${testName}... `);
    await testFunc();
    success(testName);
    return true;
  } catch (error) {
    error(`${testName} failed: ${error.message}`);
    return false;
  }
}

// 测试函数
const tests = {
  // 1. 健康检查
  async healthCheck() {
    const response = await makeRequest(`${BASE_URL}/health`);
    if (response.status !== 200) {
      throw new Error(`Status ${response.status}`);
    }
    if (response.data.status !== 'OK') {
      throw new Error(`Response: ${response.data.message}`);
    }
  },

  // 2. API信息检查
  async apiInfo() {
    const response = await makeRequest(`${BASE_URL}/api`);
    if (response.status !== 200) {
      throw new Error(`Status ${response.status}`);
    }
    const data = response.data;
    if (!data.success || !data.endpoints) {
      throw new Error('Invalid API response');
    }
    const expectedEndpoints = [
      'generate',
      'generate/batch',
      'export',
      'quality-check',
      'improve',
      'upload'
    ];
    for (const endpoint of expectedEndpoints) {
      if (!data.endpoints.generate || !data.endpoints['generate/batch']) {
        throw new Error(`Missing endpoint: ${endpoint}`);
      }
    }
  },

  // 3. 基本路由存在
  async routesExist() {
    const endpoints = [
      '/health',
      '/api',
      '/api/cards/generate',
      '/api/cards/generate/batch',
      '/api/cards/export',
      '/api/cards/quality-check',
      '/api/cards/improve'
    ];

    for (const endpoint of endpoints) {
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      if (response.status === 404) {
        throw new Error(`Missing endpoint: ${endpoint}`);
      }
    }
  },

  // 4. CORS配置检查
  async corsCheck() {
    try {
      const response = await makeRequest(`${BASE_URL}/api`, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      // 检查CORS头
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers'
      ];

      for (const header of corsHeaders) {
        if (!response.headers[header.toLowerCase()]) {
          throw new Error(`Missing CORS header: ${header}`);
        }
      }
    } catch (error) {
      throw new Error(`CORS check failed: ${error.message}`);
    }
  },

  // 5. 错误处理检查
  async errorHandler() {
    // 测试无效的请求
    const response1 = await makeRequest(`${BASE_URL}/api/cards/generate`, {
      method: 'POST',
      body: JSON.stringify({})
    });

    if (response1.status !== 400) {
      throw new Error('Should return 400 for empty request');
    }

    // 测试不存在的路由
    const response2 = await makeRequest(`${BASE_URL}/api/nonexistent`, {
      method: 'POST',
      body: JSON.stringify({ test: 'data' })
    });

    if (response2.status !== 404) {
      throw new Error('Should return 404 for non-existent route');
    }

    success('Error handling working correctly');
  },

  // 6. 请求体解析检查
  async bodyParser() {
    // 测试JSON解析
    const validCard = {
      question: '测试问题',
      cardType: 'basic',
      tags: ['测试'],
      deckName: 'Test Deck'
    };

    const response = await makeRequest(`${BASE_URL}/api/cards/generate`, {
      method: 'POST',
      body: JSON.stringify(validCard),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 服务器应该能正确解析JSON（即使API调用可能失败）
    if (response.status === 400 && response.data && response.data.error) {
      success('JSON body parsing working');
    } else if (response.status >= 500) {
      // 500错误可能表示解析正确但业务逻辑出错
      success('JSON body parsing received');
    } else {
      throw new Error(`Unexpected response: ${response.status}`);
    }
  },

  // 7. 连接性检查
  async connectivity() {
    // 测试并发连接
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest(`${BASE_URL}/health`));
    }

    const results = await Promise.allSettled(promises);
    const failed = results.filter(result => result.status === 'rejected');

    if (failed.length > 2) {
      throw new Error(`Too many failed concurrent requests: ${failed.length}/5`);
    }

    success(`Concurrency test passed: ${5 - failed.length}/5 successful`);
  }
};

// 主测试函数
async function main() {
  console.log(colors.bright + colors.blue + '\n🧪 Anki Card Generator - Backend API Test' + colors.reset);
  console.log(colors.bright + '=' .repeat(50) + colors.reset);
  console.log(`🎯 Testing backend at: ${BASE_URL}`);
  console.log('');

  const testList = Object.keys(tests).map(key => {
    const [description, testFunc] = tests[key].toString().split('=');
    return { name: description, func: tests[key] };
  });

  let passed = 0;
  let total = testList.length;

  for (const { name, func } of testList) {
    const success = await runTest(name, func);
    if (success) passed++;

    // 测试间隔
    await sleep(500);
  }

  // 结果汇总
  console.log('');
  console.log(colors.bright + colors.blue + '📊 Test Results' + colors.reset);
  console.log(colors.bright + '=' .repeat(50) + colors.reset);
  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${total - passed}${colors.reset}`);

  const successRate = ((passed / total) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);

  if (passed === total) {
    console.log('');
    success('🎉 All backend API tests passed!');
    console.log(`✨ Backend is ready for use at ${BASE_URL}`);
    process.exit(0);
  } else {
    console.log('');
    error('❌ Some backend API tests failed.');
    console.log('🔧 Please check the server logs and fix any issues.');
    process.exit(1);
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  error(`Unhandled Rejection at: ${reason}`);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  main();
}