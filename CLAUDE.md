# 🤖 CLAUDE.md - Anki卡片生成器开发指南

## 📋 项目概述

**Anki卡片生成器** - 基于AI的智能卡片制作工具，帮助用户快速创建和导出Anki学习卡片。

### 技术栈
- **前端**: React 19 + TypeScript + Tailwind CSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite
- **AI服务**: 智谱AI GLM-4

### 项目目标
专注于个人使用场景，保持简单高效，避免过度设计。

## 🚨 快速问题解决

### 常见错误速查

**TypeScript编译错误**
```typescript
// 隐式any类型 - 明确指定类型
const batches: CardType[][] = [];

// 可能未定义 - 先缓存再使用
const quality = card.qualityCheck;
if (!quality) throw new Error('No quality check');

// null检查 - React状态需要显式检查
if (editingCard && !editingCard.tags.includes(tag)) {
```

**包管理问题**
```bash
# Tailwind版本兼容性
npm install tailwindcss@3.4.0 @tailwindcss/forms@0.5.7

# 缓存问题
rm -rf node_modules/.cache && npm start
```

**目录路径**
- 前端命令: `cd frontend && npm start`
- 后端命令: `cd backend && npm run dev`
- 根目录: `npm run dev` (并行启动)

## 🎯 核心开发规则

### TypeScript规范
```typescript
// ✅ 使用接口定义数据结构
interface Card {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

// ✅ 明确类型，避免any
const cards: Card[] = await response.json();

// ✅ 联合类型替代枚举
type Status = 'pending' | 'approved' | 'rejected';
```

### 组件结构
```typescript
const Component: React.FC<Props> = ({ prop }) => {
  const [state, setState] = useState<Type>();

  const handleClick = useCallback(() => {
    // 处理逻辑
  }, []);

  return <div className="p-4">{/* JSX */}</div>;
};
```

### API设计
```typescript
// 统一响应格式
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// RESTful端点
GET    /api/cards
POST   /api/cards
PUT    /api/cards/:id
DELETE /api/cards/:id
```

## 🚀 开发流程

### Git工作流
```bash
# 提交类型
feat: 新功能
fix: 修复bug
refactor: 重构
docs: 文档更新

# 流程
git add .
git commit -m "feat: add card export"
git push
```

### 项目结构
```
frontend/src/
├── components/    # React组件
├── services/      # API调用
├── types/        # 类型定义
└── utils/        # 工具函数

backend/src/
├── controllers/  # 业务逻辑
├── services/     # 核心服务
├── routes/       # 路由定义
└── types/        # 类型定义
```

---

**最后更新**: 2025-12-09
**原则**: 简单够用，快速迭代
**详细规划**: 查看 [TODO.md](./TODO.md)