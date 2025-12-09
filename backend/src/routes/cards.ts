import { Router } from 'express';
import { CardController } from '../controllers/cardController';
import { validateCardRequest } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();
const cardController = new CardController();

// 通用限流
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100个请求
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});


// 应用限流
router.use(generalLimiter);

/**
 * @route POST /api/cards/generate
 * @desc 生成单个Anki卡片
 * @access Public
 */
router.post('/generate', validateCardRequest, cardController.generateCard);

/**
 * @route POST /api/cards/generate/batch
 * @desc 批量生成Anki卡片
 * @access Public
 */
router.post('/generate/batch', cardController.generateCards);

/**
 * @route POST /api/cards/export
 * @desc 导出Anki包文件
 * @access Public
 */
router.post('/export', cardController.exportAnkiPackage);

/**
 * @route POST /api/cards/quality-check
 * @desc 对卡片进行质量检查
 * @access Public
 */
router.post('/quality-check', cardController.checkQuality);

/**
 * @route POST /api/cards/improve
 * @desc 改进卡片质量
 * @access Public
 */
router.post('/improve', cardController.improveCard);


/**
 * @route GET /api/cards/health
 * @desc 健康检查端点
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Card generation service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;