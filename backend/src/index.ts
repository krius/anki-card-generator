import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// 导入路由
import cardsRouter from './routes/cards';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 解析JSON和URL编码的数据
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/exports', express.static(path.join(process.cwd(), 'exports')));

// 日志中间件
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Anki Card Generator Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/cards', cardsRouter);

// API文档路由
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Anki Card Generator API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      generateCard: 'POST /api/cards/generate',
      generateBatch: 'POST /api/cards/generate/batch',
      exportAnki: 'POST /api/cards/export',
      qualityCheck: 'POST /api/cards/quality-check',
      improveCard: 'POST /api/cards/improve',
      uploadImage: 'POST /api/cards/upload'
    },
    documentation: 'https://github.com/your-repo/anki-card-generator'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'POST /api/cards/generate',
      'POST /api/cards/generate/batch',
      'POST /api/cards/export',
      'POST /api/cards/quality-check',
      'POST /api/cards/improve',
      'POST /api/cards/upload'
    ]
  });
});

// 全局错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Multer错误处理
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large',
      message: `Maximum file size is ${process.env.MAX_FILE_SIZE || '10MB'}`
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Too many files',
      message: 'Only one file is allowed per upload'
    });
  }

  // 通用错误响应
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: {
        url: req.url,
        method: req.method,
        ip: req.ip
      }
    })
  });
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 Anki Card Generator Backend is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// 优雅关闭服务器
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;