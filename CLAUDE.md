# 🤖 CLAUDE.md - Anki卡片生成器开发指南

## 📋 项目概述

**Anki卡片生成器** - 基于AI的智能卡片制作工具，帮助用户快速创建和导出Anki学习卡片。

### 技术栈
- **前端**: React 19 + TypeScript + Tailwind CSS
- **后端**: Python + FastAPI + LangGraph 1.0.4
- **AI服务**: 智谱AI GLM-4
- **工作流**: LangGraph状态驱动架构

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
- 后端命令: `cd backend-python && ./run_server.sh`
- 根目录: `npm run dev` (并行启动)
- Python环境: `cd backend-python && source .venv/bin/activate`

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

backend-python/
├── app/
│   ├── api/       # API路由
│   │   └── v1/
│   │       └── endpoints/
│   ├── core/      # 核心配置
│   ├── graph/     # LangGraph工作流
│   │   ├── nodes.py
│   │   ├── states.py
│   │   └── workflows.py
│   ├── schemas/   # Pydantic模型
│   ├── services/  # 业务服务
│   └── main.py    # 应用入口
├── .venv/         # Python虚拟环境
├── requirements.txt
└── run_server.sh
```

---

**最后更新**: 2025-12-10
**原则**: 简单够用，快速迭代
**架构升级**: 已迁移至 LangGraph 1.0.4 + FastAPI