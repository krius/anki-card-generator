# 📡 Anki卡片生成器 API 文档

## 🌐 基本信息

- **基础URL**: `http://localhost:3001/api`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

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

## 📋 API端点列表

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
  "deckName": "技术卡片",                      // 可选
  "llmProvider": "openai"                     // 可选: openai, claude
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
    "cardType": "basic",
    "qualityCheck": {
      "passed": true,
      "score": 85,
      "issues": [],
      "suggestions": ["可以添加更多例子"]
    }
  }
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
  "cardType": "basic",
  "tags": ["前端框架"],
  "deckName": "前端技术"
}
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "card_def456",
      "front": "什么是React？",
      "back": "React是用于构建用户界面的JavaScript库...",
      "tags": ["前端框架"],
      "qualityCheck": { "passed": true, "score": 88 }
    },
    {
      "id": "card_ghi789",
      "front": "什么是Vue？",
      "back": "Vue是渐进式JavaScript框架...",
      "tags": ["前端框架"],
      "qualityCheck": { "passed": true, "score": 85 }
    }
  ]
}
```

### 2. 文件处理

#### 2.1 上传图片
```http
POST /api/cards/upload
Content-Type: multipart/form-data
```

**请求体**:
```
image: [图片文件]
```

**响应**:
```json
{
  "success": true,
  "data": {
    "filename": "upload_abc123.jpg",
    "originalName": "machine-learning.jpg",
    "size": 1024576,
    "mimetype": "image/jpeg",
    "url": "/uploads/upload_abc123.jpg"
  }
}
```

#### 2.2 导出Anki文件
```http
POST /api/cards/export
```

**请求体**:
```json
{
  "cards": [
    {
      "id": "card_abc123",
      "front": "什么是机器学习？",
      "back": "机器学习是一种人工智能的分支...",
      "tags": ["AI", "基础概念"]
    }
  ],
  "deckName": "技术卡片集"
}
```

**响应**: 返回 `.apkg` 文件二进制数据

### 3. 质量控制

#### 3.1 质量检查
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
      "缺少具体例子",
      "格式不够规范"
    ],
    "suggestions": [
      "详细解释机器学习的定义",
      "添加实际应用案例",
      "使用更规范的学术表达"
    ],
    "enhancedCard": {
      "front": "什么是机器学习？",
      "back": "机器学习是人工智能的一个重要分支..."
    }
  }
}
```

#### 3.2 改进卡片
```http
POST /api/cards/improve
```

**请求体**:
```json
{
  "card": {
    "id": "card_abc123",
    "front": "什么是机器学习？",
    "back": "机器学习。"
  },
  "issues": [
    "回答内容过于简短",
    "缺少具体例子"
  ],
  "suggestions": [
    "详细解释机器学习的定义",
    "添加实际应用案例"
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "card_abc123",
    "front": "什么是机器学习？",
    "back": "机器学习是人工智能的一个重要分支，它使计算机能够从数据中学习并改进性能...",
    "improvementSummary": "根据质量检查结果，详细解释了概念并添加了实际应用案例。"
  }
}
```

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
    "timestamp": "2025-12-09T09:30:00.000Z",
    "uptime": "2h 15m",
    "version": "1.1.0",
    "services": {
      "database": "connected",
      "llm": "available",
      "fileStorage": "accessible"
    }
  }
}
```

## ⚠️ 错误码说明

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 200 | 请求成功 | 生成卡片成功 |
| 400 | 请求参数错误 | 缺少必需的question字段 |
| 401 | 未授权 | API密钥无效 |
| 404 | 资源不存在 | 请求的端点不存在 |
| 429 | 请求过于频繁 | 超过速率限制 |
| 500 | 服务器内部错误 | AI服务调用失败 |
| 503 | 服务不可用 | 系统维护中 |

## 🔒 限流规则

- **单张卡片生成**: 每分钟最多 10 次
- **批量生成**: 每分钟最多 5 次
- **文件上传**: 每分钟最多 20 次
- **文件大小限制**: 最大 10MB

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

**上传图片**:
```bash
curl -X POST http://localhost:3001/api/cards/upload \
  -F "image=@/path/to/your/image.jpg"
```

### JavaScript 示例

```javascript
// 生成卡片
const generateCard = async (question) => {
  const response = await fetch('http://localhost:3001/api/cards/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      cardType: 'basic',
      tags: ['学习笔记']
    })
  });

  const result = await response.json();
  return result;
};
```

## 🛠️ 开发环境设置

### 环境变量
```env
PORT=3001
NODE_ENV=development
DASHSCOPE_API_KEY=your_api_key_here
DASHSCOPE_MODEL=qwen-plus
MAX_FILE_SIZE=10485760
```

### 本地测试
1. 启动后端服务: `npm run dev:backend`
2. 使用Postman或curl测试API
3. 查看控制台日志确认请求处理

---

**文档版本**: 1.0.0
**最后更新**: 2025-12-09
**维护者**: Anki Card Generator Team