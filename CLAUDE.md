# 🤖 CLAUDE.md - Anki卡片生成器开发指南

## 📋 项目概述

本文档为Anki卡片生成器项目的开发指南，包含常见问题解决方案、开发规则和最佳实践。

## 📚 项目文档索引

- **[CLAUDE.md](./CLAUDE.md)** (当前文件) - 开发规范和最佳实践
- **[API.md](./API.md)** - 专业API接口文档 (开发者使用)
- **[FRONTEND_BACKEND_GUIDE.md](./FRONTEND_BACKEND_GUIDE.md)** - 前后端沟通指南 (初学者友好)
- **[EXECUTION_PLAN.md](./EXECUTION_PLAN.md)** - 项目重构执行计划

## 🚨 常见问题与解决方案

### 1. 依赖和包管理问题

#### 问题1: package.json循环依赖
**现象**: `npm install` 时出现无限循环
**原因**: package.json中存在循环引用，如 `"install": "npm run install:all"`
**解决**:
```json
// ❌ 错误配置
"scripts": {
  "install": "npm run install:all",
  "install:all": "npm install && ..."
}

// ✅ 正确配置
"scripts": {
  "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"
}
```

#### 问题2: Tailwind CSS版本兼容性
**现象**: PostCSS插件错误，编译失败
**原因**: Tailwind CSS v4与PostCSS配置不兼容
**解决**:
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},  // 而不是 '@tailwindcss/postcss'
    autoprefixer: {},
  },
}
```
同时降级到稳定版本:
```bash
npm install tailwindcss@3.4.0 @tailwindcss/forms@0.5.7
```

#### 问题3: 缺失依赖包
**现象**: 编译时提示缺少模块
**解决**: 及时安装缺失的依赖，特别是`@tailwindcss/forms`等Tailwind相关包

### 2. 目录和路径问题

#### 问题: 从错误目录执行命令
**现象**: 命令执行失败，提示文件不存在
**解决**:
```bash
# 确认当前目录
pwd

# 前端相关命令在frontend目录执行
cd frontend && npm start

# 后端相关命令在backend目录执行
cd backend && npm run dev

# 根目录脚本使用相对路径
npm run dev:frontend  # 会自动cd到frontend
```

### 3. TypeScript编译错误处理 (实战经验)

#### 问题1: 隐式any[]类型错误
**现象**: `Variable 'batches' implicitly has type 'any[]'`
**原因**: TypeScript无法推断数组元素类型
**解决**:
```typescript
// ❌ 错误写法
const batches = [];
for (let i = 0; i < cards.length; i += batchSize) {
  batches.push(cards.slice(i, i + batchSize));
}

// ✅ 正确写法 - 添加明确类型注解
const batches: AnkiCard[][] = [];
for (let i = 0; i < cards.length; i += batchSize) {
  batches.push(cards.slice(i, i + batchSize));
}
```

#### 问题2: 可能未定义的属性访问
**现象**: `'card.qualityCheck' is possibly 'undefined'`
**原因**: 异步操作期间状态可能改变，TypeScript无法保证属性存在
**解决**:
```typescript
// ❌ 危险写法
const response = await withRetry(() =>
  apiService.improveCard(card, card.qualityCheck.issues, card.qualityCheck.suggestions)
);

// ✅ 安全写法 - 使用局部变量缓存
const qualityCheck = card.qualityCheck;
if (!qualityCheck) {
  throw new Error('质量检查结果不可用');
}

const response = await withRetry(() =>
  apiService.improveCard(card, qualityCheck.issues, qualityCheck.suggestions)
);
```

#### 问题3: null检查后的类型推断
**现象**: `'editingCard' is possibly 'null'` 即使之前有检查
**原因**: React状态更新是异步的，需要显式检查
**解决**:
```typescript
// ❌ 不够严格的检查
if (!editingCard.tags.includes(newTag.trim())) {

// ✅ 显式null检查
if (editingCard && !editingCard.tags.includes(newTag.trim())) {
```

#### 问题4: 循环中的闭包问题
**现象**: ESLint警告 `Function declared in a loop contains unsafe references`
**原因**: 循环中异步函数引用了会被修改的变量
**解决**:
```typescript
// ❌ 危险写法
for (let i = 0; i < maxRetries; i++) {
  await new Promise(resolve => setTimeout(resolve, delay));
  delay *= 2; // delay会被修改，可能导致闭包问题
}

// ✅ 安全写法 - 使用局部变量
for (let i = 0; i < maxRetries; i++) {
  const currentDelay = delay; // 缓存当前值
  await new Promise(resolve => setTimeout(resolve, currentDelay));
  delay *= 2;
}
```

#### 问题5: 无障碍访问警告
**现象**: `Redundant alt attribute` 警告
**原因**: 屏幕阅读器已经知道img标签是图片
**解决**:
```typescript
// ❌ 冗余描述
<img src={imagePreview} alt="Uploaded image" />

// ✅ 简洁描述
<img src={imagePreview} alt="Uploaded" />
```

### 4. 开发服务器缓存问题

#### 问题: 修改后TypeScript错误仍然存在
**现象**: 代码修复后，开发服务器仍显示旧错误
**原因**: React开发服务器缓存未清除
**解决**:
```bash
# 重启开发服务器
# 1. 停止当前运行的服务 (Ctrl+C)
# 2. 重新启动
npm start

# 或者完全清除缓存
rm -rf node_modules/.cache
npm start
```

### 5. 项目恢复经验

#### 快速修复流程
1. **检查编译状态**: 确认前端和后端都能正常编译
2. **修复类型错误**: 优先处理TypeScript编译错误
3. **修复ESLint警告**: 提升代码质量和可访问性
4. **验证功能**: 确保修复后应用仍能正常工作
5. **原子性提交**: 按功能分类提交，便于追踪

#### Git提交最佳实践
```bash
# 按功能分别提交
git add frontend/src/App.tsx
git commit -m "fix: resolve App.tsx type error"

git add frontend/src/components/CardList.tsx
git commit -m "fix: resolve CardList.tsx null safety issues"

git add frontend/src/components/CardForm.tsx frontend/src/services/api.ts
git commit -m "fix: resolve ESLint warnings"
```

### 6. TypeScript配置问题

#### 问题: 类型定义缺失
**现象**: 大量TypeScript警告
**解决**:
- 为所有API接口定义类型
- 避免使用`any`类型
- 使用接口定义数据结构

## 🎯 关键开发规则

### 1. TypeScript使用规范

#### 严格类型检查
```typescript
// ❌ 避免使用any
const data: any = await response.json();

// ✅ 使用具体类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const response: ApiResponse<CardData> = await apiResponse.json();
```

#### 类型定义优先级
1. **优先使用接口**: 定义对象结构
```typescript
interface Card {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}
```

2. **联合类型替代枚举**: 提高灵活性
```typescript
type CardStatus = 'pending' | 'approved' | 'rejected';
```

3. **泛型用于复用**: 避免重复代码
```typescript
interface ApiResult<T> {
  data: T;
  success: boolean;
}
```

### 2. 文件组织和命名规范

#### 目录结构
```
src/
├── components/          # React组件
│   ├── ui/             # 基础UI组件
│   ├── forms/          # 表单组件
│   └── layout/         # 布局组件
├── services/           # API服务
├── types/              # TypeScript类型定义
├── hooks/              # 自定义Hooks
├── utils/              # 工具函数
└── constants/          # 常量定义
```

#### 命名规范
- **组件**: PascalCase (例: `CardForm.tsx`)
- **文件**: camelCase (例: `apiService.ts`)
- **常量**: UPPER_SNAKE_CASE (例: `API_BASE_URL`)
- **类型**: PascalCase (例: `CardData`)

### 3. API设计规范

#### 统一响应格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}
```

#### 错误处理
```typescript
// 统一错误处理
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  return {
    success: false,
    message: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

### 4. React组件规范

#### 组件结构
```typescript
interface ComponentProps {
  // 明确定义props类型
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 1. Hooks声明
  const [state, setState] = useState<Type>(initialValue);

  // 2. 副作用
  useEffect(() => {
    // 副作用逻辑
  }, [dependencies]);

  // 3. 事件处理函数
  const handleClick = () => {
    // 处理逻辑
  };

  // 4. 条件渲染
  if (!condition) {
    return <LoadingComponent />;
  }

  // 5. 主要渲染
  return (
    <div className="component-wrapper">
      {/* JSX内容 */}
    </div>
  );
};
```

#### 状态管理原则
- **本地状态优先**: 优先使用`useState`和`useReducer`
- **Context适度使用**: 只在必要时使用Context
- **避免过度抽象**: 不要为了复用而复用

### 5. 样式规范

#### Tailwind CSS使用
```typescript
// ✅ 推荐：使用Tailwind类名
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// ❌ 避免：内联样式
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
```

#### 响应式设计
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 6. 性能优化规范

#### React性能
```typescript
// 使用React.memo避免不必要重渲染
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* 复杂渲染逻辑 */}</div>;
});

// 使用useMemo缓存计算结果
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// 使用useCallback缓存函数
const handleClick = useCallback((id: string) => {
  onItemClick(id);
}, [onItemClick]);
```

#### 代码分割
```typescript
// 路由级别的代码分割
const LazyComponent = React.lazy(() => import('./LazyComponent'));
```

## 🔧 构建和部署规则

### 1. 脚本使用
- **开发环境**: `npm run dev` (并行启动前后端)
- **构建**: `npm run build` (构建前后端)
- **生产**: `npm start` (构建后启动后端)

### 2. 环境变量管理
```typescript
// 统一配置接口
interface Config {
  port: number;
  nodeEnv: string;
  apiUrl: string;
  dashscopeApiKey: string;
}

// 配置验证
const validateConfig = (config: Partial<Config>): config is Config => {
  return !!(config.port && config.nodeEnv && config.apiUrl);
};
```

### 3. 错误监控
```typescript
// 全局错误边界
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
    // 发送错误报告
  }
}
```

## 📝 代码质量标准

### 1. 测试要求
- **单元测试覆盖率**: > 80%
- **集成测试**: 覆盖主要业务流程
- **类型检查**: 无TypeScript错误

### 2. 代码审查要点
- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 性能优化适当
- [ ] 代码风格一致
- [ ] 注释清晰必要

### 3. 安全要求
- [ ] 输入验证
- [ ] XSS防护
- [ ] 文件上传安全
- [ ] API限流

## 🚀 开发工作流

### 1. Git工作流规范 (简化版)

#### 提交原则
- **及时提交**: 每完成一个功能点或修复就要提交
- **测试验证**: 提交前必须测试确认功能正常
- **用户确认**: 重要功能修改需要用户确认符合预期
- **原子提交**: 一个提交只做一件事，便于追踪和回滚

#### 提交信息规范
```bash
# 功能添加
feat: add new feature description

# 问题修复
fix: resolve specific issue description

# 重构优化
refactor: optimize code structure

# 配置更新
config: update dependencies or configuration

# 文档更新
docs: update documentation
```

#### 提交流程
1. **功能测试**: 确认新功能或修复正常工作
2. **用户验证**: 重要功能请用户确认效果
3. **代码检查**: 快速检查没有明显问题
4. **Git提交**: 使用规范的提交信息
5. **推送更新**: 及时推送到远程仓库

#### 实用Git命令
```bash
# 查看当前状态
git status

# 查看修改内容
git diff

# 添加所有修改
git add .

# 提交修改
git commit -m "feat: add new feature"

# 推送到远程
git push

# 查看提交历史
git log --oneline -10
```

### 2. 功能开发流程
1. **需求分析**: 明确功能需求和技术方案
2. **类型设计**: 先设计TypeScript类型
3. **组件开发**: 从UI组件到业务逻辑
4. **测试验证**: 编写并运行测试
5. **代码审查**: 自我审查和优化

### 2. 调试技巧
```typescript
// 使用类型断言进行调试
const result = apiResponse as ApiResponse<CardData>;

// 条件性console.log
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}
```

### 3. 性能监控
- 监控API响应时间
- 关注组件渲染性能
- 定期检查bundle大小

## 📚 重要提醒

1. **避免技术债**: 每次提交都保持代码质量
2. **渐进式开发**: 小步快跑，频繁测试
3. **文档同步**: 代码变更时同步更新文档
4. **用户优先**: 始终考虑用户体验
5. **性能第一**: 在功能实现基础上优化性能

## 💡 核心经验教训

### 1. TypeScript错误修复优先级
**P0级**: 编译错误必须立即修复
- 隐式any类型阻止编译
- null/undefined访问导致运行时错误
- 类型不匹配影响功能完整性

**P1级**: ESLint警告应该及时修复
- 无障碍访问影响用户体验
- 代码质量影响维护性
- 潜在的安全隐患

### 2. 错误处理思维模式
```typescript
// 总是假设状态可能改变
const safeAccess = (obj: any, path: string) => {
  const value = obj?.[path];
  if (!value) {
    throw new Error(`${path} is not available`);
  }
  return value;
};
```

### 3. 类型安全原则
- **明确优于隐式**: 总是提供明确的类型注解
- **防御性编程**: 假设外部数据可能为null/undefined
- **局部变量缓存**: 在异步操作中缓存状态快照
- **早期错误检测**: 在编译阶段发现问题而非运行时

### 4. Git工作流哲学
- **原子性提交**: 一个提交只解决一个问题
- **描述性提交信息**: 清楚说明问题和解决方案
- **及时提交**: 完成一个功能点就立即提交
- **功能验证**: 提交前确保代码可以正常运行

### 5. 项目恢复SOP (标准操作流程)
1. **状态评估**: 确认当前错误类型和影响范围
2. **优先级排序**: P0 > P1 > P2
3. **逐个修复**: 避免同时修改多个问题
4. **验证测试**: 每个修复都要验证有效性
5. **文档更新**: 将新问题和解决方案记录到文档

---

**最后更新**: 2025-12-09
**维护者**: Claude Development Team
**版本**: 1.1.0 (新增TypeScript错误处理实战经验)