# 📡 Anki卡片生成器 API 文档

## 🌐 基本信息

- **基础URL**: `http://localhost:3001/api`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **API版本**: v1.0

## 🔐 通用响应格式

所有API端点都返回统一的响应格式：

### 成功响应
```json
{
  "success": true,
  "data": {
    // 具体数据内容
  },
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "message": "详细错误信息"
}
```

## 📋 核心功能API

### 1. 卡片生成

#### 1.1 生成单张卡片
```http
POST /api/cards/generate
```

**请求体**:
```json
{
  "question": "什么是机器学习？",
  "imageUrl": "http://example.com/image.jpg",  // 可选
  "cardType": "basic",                        // 可选: basic, cloze, basic-reversed, input
  "tags": ["AI", "基础概念"],                  // 可选
  "deckName": "技术卡片"                       // 可选
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "card_abc123",
    "front": "什么是机器学习？",
    "back": "机器学习是一种人工智能的分支...",
    "tags": ["AI", "基础概念"],
    "deckName": "技术卡片",
    "cardType": "basic",
    "qualityCheck": {
      "passed": true,
      "score": 85,
      "issues": [],
      "suggestions": ["可以添加更多例子"]
    }
  },
  "message": "Card generated successfully. Quality score: 85/100"
}
```

#### 1.2 批量生成卡片
```http
POST /api/cards/generate/batch
```

**请求体**:
```json
{
  "questions": [
    "什么是React？",
    "什么是Vue？",
    "什么是Angular？"
  ],
  "settings": {
    "cardType": "basic",
    "tags": ["前端框架"],
    "deckName": "前端技术"
  }
}
```

**注意**:
- 最多支持一次生成20张卡片
- 批量生成会并发处理，提高效率

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "index": 0,
        "card": {
          "id": "card_def456",
          "front": "什么是React？",
          "back": "React是用于构建用户界面的JavaScript库...",
          "tags": ["前端框架"],
          "deckName": "前端技术",
          "cardType": "basic"
        },
        "qualityCheck": {
          "passed": true,
          "score": 88
        },
        "error": null
      }
      // ... 更多卡片
    ]
  }
}
```

### 2. 质量控制

#### 2.1 质量检查
```http
POST /api/cards/quality-check
```

**请求体**:
```json
{
  "front": "什么是机器学习？",
  "back": "机器学习。",
  "cardType": "basic"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "passed": false,
    "score": 45,
    "issues": [
      "回答内容过于简短",
      "缺少具体例子"
    ],
    "suggestions": [
      "详细解释机器学习的定义",
      "添加实际应用案例"
    ]
  }
}
```

#### 2.2 改进卡片
```http
POST /api/cards/improve
```

**请求体**:
```json
{
  "card": {
    "id": "card_abc123",
    "front": "什么是机器学习？",
    "back": "机器学习。",
    "qualityCheck": {
      "issues": ["回答内容过于简短", "缺少具体例子"],
      "suggestions": ["详细解释机器学习的定义", "添加实际应用案例"]
    }
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "card_abc123",
    "front": "什么是机器学习？",
    "back": "机器学习是人工智能的一个重要分支，它使计算机能够从数据中学习...",
    "qualityCheck": {
      "passed": true,
      "score": 92
    }
  }
}
```

### 3. 导出功能

#### 3.1 导出Anki文件
```http
POST /api/cards/export
```

**请求体**:
```json
{
  "cards": [
    {
      "front": "什么是机器学习？",
      "back": "机器学习是人工智能的一个重要分支...",
      "tags": ["AI", "基础概念"]
    }
  ],
  "deckName": "技术卡片集"
}
```

**响应**: 返回 `.apkg` 文件二进制数据
- Content-Type: `application/apkg`
- Content-Disposition: `attachment; filename="技术卡片集_2025-12-09.apkg"`

### 4. 系统监控

#### 4.1 健康检查
```http
GET /api/cards/health
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-09T13:54:42.034Z",
    "uptime": "0:25:15",
    "version": "1.0.0"
  }
}
```

#### 4.2 API信息
```http
GET /api
```

**响应**:
```json
{
  "success": true,
  "data": {
    "name": "Anki Card Generator API",
    "version": "1.0.0",
    "description": "智能Anki卡片生成和管理服务",
    "endpoints": {
      "generate": "/api/cards/generate",
      "batchGenerate": "/api/cards/generate/batch",
      "qualityCheck": "/api/cards/quality-check",
      "improve": "/api/cards/improve",
      "export": "/api/cards/export",
      "health": "/api/cards/health"
    },
    "llmProvider": "zhipu",
    "model": "glm-4"
  }
}
```

## ⚠️ 错误码说明

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 200 | 请求成功 | 生成卡片成功 |
| 400 | 请求参数错误 | 缺少必需的question字段 |
| 404 | 资源不存在 | 请求的端点不存在 |
| 429 | 请求过于频繁 | 超过速率限制 |
| 500 | 服务器内部错误 | AI服务调用失败 |
| 503 | 服务不可用 | 系统维护中 |

## 🔒 限流规则

- **单张卡片生成**: 每分钟最多 10 次
- **批量生成**: 每分钟最多 5 次
- **文件大小限制**: 最大 10MB
- **批量生成限制**: 每次最多 20 张卡片

## 🛠️ 技术实现细节

### LLM服务配置
- **提供商**: 智谱AI (zhipu)
- **模型**: GLM-4
- **API格式**: OpenAI兼容格式
- **Base URL**: `https://open.bigmodel.cn/api/paas/v4`

### 请求处理流程
1. 接收请求并验证参数
2. 调用LLM生成内容
3. 执行质量检查
4. 返回带质量评分的卡片
5. 支持基于质量反馈的改进

## 🧪 测试示例

### cURL 示例

**生成单张卡片**:
```bash
curl -X POST http://localhost:3001/api/cards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "什么是TypeScript？",
    "cardType": "basic",
    "tags": ["编程语言", "类型系统"]
  }'
```

**批量生成卡片**:
```bash
curl -X POST http://localhost:3001/api/cards/generate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      "什么是React？",
      "什么是Vue？",
      "什么是Angular？"
    ],
    "settings": {
      "tags": ["前端框架"],
      "deckName": "前端技术"
    }
  }'
```

### JavaScript/TypeScript 示例

```typescript
// 生成卡片
interface GenerateCardRequest {
  question: string;
  cardType?: 'basic' | 'cloze' | 'basic-reversed' | 'input';
  tags?: string[];
  deckName?: string;
  imageUrl?: string;
}

interface CardResponse {
  id: string;
  front: string;
  back: string;
  tags: string[];
  deckName: string;
  cardType: string;
  qualityCheck: {
    passed: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

const generateCard = async (request: GenerateCardRequest): Promise<{success: boolean, data: CardResponse}> => {
  const response = await fetch('http://localhost:3001/api/cards/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  return await response.json();
};

// 使用示例
const card = await generateCard({
  question: "什么是机器学习？",
  tags: ["AI", "基础概念"],
  deckName: "技术卡片"
});
```

## 📝 开发环境设置

### 环境变量
```env
# 服务器配置
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:1688

# 智谱AI API配置
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
EXPORTS_DIR=exports
```

### 本地开发
1. 安装依赖: `npm install`
2. 启动开发服务器: `npm run dev`
3. 运行测试: `npm test`
4. 查看API文档: 访问 `http://localhost:3001/api`

## 🚀 部署说明

### 生产环境
1. 设置生产环境变量
2. 构建项目: `npm run build`
3. 启动服务: `npm start`
4. 使用PM2或Docker管理进程

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## 📊 当前状态

### ✅ 已实现功能
- [x] 单张卡片生成
- [x] 批量卡片生成（最多20张）
- [x] 卡片质量检查
- [x] 基于反馈的卡片改进
- [x] Anki格式导出
- [x] 健康检查接口
- [x] 统一错误处理
- [x] 请求限流

### 🔄 待实现功能
- [ ] 用户认证系统
- [ ] 卡片历史记录
- [ ] 卡片分类管理
- [ ] 批量导入功能
- [ ] 图片识别生成卡片

---

**文档版本**: 1.0.0
**最后更新**: 2025-12-09
**维护者**: Anki Card Generator Team