import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';

// 确保上传目录存在
const ensureUploadDir = async (dir: string) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// 配置存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    await ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的图片格式
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, GIF, WebP, and BMP files are allowed.`));
  }
};

// 配置multer
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 默认10MB
    files: 1 // 一次只允许一个文件
  }
});

// 清理上传文件的中间件（用于错误处理）
export const cleanupUploadedFile = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function(body) {
    // 如果响应状态码不是2xx，清理上传的文件
    if (req.file && (res.statusCode < 200 || res.statusCode >= 300)) {
      fs.unlink(req.file.path).catch(err => {
        console.error('Error cleaning up uploaded file:', err);
      });
    }

    return originalSend.call(this, body);
  };

  next();
};