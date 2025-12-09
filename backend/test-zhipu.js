// 测试zhipu API配置的脚本
require('dotenv').config();

const axios = require('axios');

const zhipuApiKey = process.env.ZHIPU_API_KEY;

if (!zhipuApiKey || zhipuApiKey === 'your_zhipu_api_key_here') {
  console.log('❌ 智谱AI API key未配置');
  console.log('请在backend/.env文件中设置ZHIPU_API_KEY');
  process.exit(1);
}

console.log('✅ 智谱AI API key已配置');
console.log('开始测试API连接...');

async function testZhipuAPI() {
  try {
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4',
        messages: [
          {
            role: 'user',
            content: '请简单介绍一下你自己'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${zhipuApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      const answer = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage?.total_tokens || 0;

      console.log('✅ 智谱AI API连接测试成功!');
      console.log(`模型: ${response.data.model}`);
      console.log(`使用tokens: ${tokensUsed}`);
      console.log(`回复: ${answer.substring(0, 100)}...`);

      return true;
    } else {
      console.log('❌ API响应格式异常');
      console.log(JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ 智谱AI API连接测试失败');
    if (error.response) {
      console.log(`状态码: ${error.response.status}`);
      console.log(`错误信息: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`错误: ${error.message}`);
    }
    return false;
  }
}

// 运行测试
testZhipuAPI().then(success => {
  process.exit(success ? 0 : 1);
});