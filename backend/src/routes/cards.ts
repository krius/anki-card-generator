import { Router } from 'express';
import { CardController } from '../controllers/cardController';
import { uploadMiddleware } from '../middleware/upload';
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

// 文件上传限流（更严格）
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 最多20个上传请求
  message: {
    success: false,
    error: 'Too many upload requests from this IP, please try again later'
  }
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
router.post('/generate/batch', uploadLimiter, cardController.generateCards);

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
 * @route POST /api/cards/upload
 * @desc 上传图片文件用于OCR
 * @access Public
 */
router.post('/upload', uploadLimiter, uploadMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      },
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

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