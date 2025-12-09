import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '../.env' });

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // 测试端口

