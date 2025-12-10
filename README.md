# Anki AI 卡片生成器 🎴

> 基于 AI 的智能学习卡片生成工具，让知识整理更高效

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-yellow.svg)

## ✨ 特性

- 🤖 **AI 智能生成** - 输入问题，AI 自动生成高质量学习卡片
- 📊 **质量检测** - 自动评估卡片质量，确保学习效果
- 🚀 **批量处理** - 一次生成多张卡片，提升效率
- 💾 **本地存储** - 所有数据本地保存，隐私安全
- 📤 **Anki 兼容** - 导出标准 Anki 格式，无缝导入
- 🎨 **简洁界面** - 专注学习，去除冗余功能

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.11+
- 智谱 AI API Key

### 一键启动（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/krius/anki-card-generator.git
cd anki-card-generator

# 2. 配置环境变量
cp backend-python/.env.example backend-python/.env
# 编辑 backend-python/.env 文件，填入你的 ZHIPU_API_KEY

# 3. 一键启动
# Linux/macOS
./start.sh

# Windows
start.bat

# 4. 停止服务
# Linux/macOS
./stop.sh

# Windows - 直接关闭命令行窗口
```

### 手动启动

如果你想手动控制服务：

1. **配置后端**
```bash
cd backend-python
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. **安装前端**
```bash
cd ../frontend
npm install
```

3. **启动服务**
```bash
# 终端 1 - 启动后端
cd backend-python
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 终端 2 - 启动前端
cd frontend
npm run dev
```

5. **访问应用**
- 前端界面：http://localhost:3000
- API 文档：http://localhost:8000/docs

## 🎯 使用方法

### 生成单张卡片
1. 在输入框中输入问题或知识点
2. 选择标签和牌组
3. 点击"生成卡片"
4. 预览并确认结果
5. 保存到本地

### 批量生成
1. 点击"批量生成"
2. 输入多个问题（每行一个）
3. 设置统一的标签和牌组
4. 等待 AI 完成生成
5. 选择需要的卡片保存

### 导出到 Anki
1. 在"我的卡片"页面选择要导出的卡片
2. 点击"导出 Anki 格式"
3. 下载 .apkg 文件
4. 在 Anki 中选择"导入文件"

## 📁 项目结构

```
Anki/
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/    # 组件目录
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API 服务
│   │   └── types/        # TypeScript 类型定义
├── backend-python/        # Python 后端 API
│   ├── app/
│   │   ├── api/         # API 路由
│   │   ├── graph/       # AI 工作流
│   │   ├── models/      # 数据模型
│   │   └── services/    # 业务逻辑
│   ├── tests/           # 测试文件
│   └── prompts/         # 提示词模板
└── .docs/              # 内部开发文档
```

## 🛠 技术栈

- **前端**
  - React 19 - 最新的 React 框架
  - TypeScript - 类型安全的 JavaScript
  - Tailwind CSS - 实用优先的 CSS 框架
  - Vite - 极速的前端构建工具

- **后端**
  - FastAPI - 高性能异步 Web 框架
  - LangGraph - AI 工作流管理
  - SQLAlchemy - 数据库 ORM
  - Pydantic - 数据验证和序列化
  - SQLite - 轻量级数据库

- **AI 服务**
  - 智谱 AI GLM-4 - 强大的中文语言模型
  - 自定义工作流 - 优化卡片生成质量

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 代码需通过 lint 检查
- 新功能需要添加测试
- 遵循现有的代码风格

## 📝 更新日志

### v1.0.0 (2024-12)
- ✨ 初始版本发布
- 🎴 单张/批量卡片生成
- 📊 AI 质量检测系统
- 💾 本地数据存储
- 📤 Anki 格式导出
- 🧪 完整的测试覆盖

## ❓ 常见问题

**Q: 需要联网使用吗？**
A: 是的，需要调用智谱 AI 的 API，但所有生成的卡片都存储在本地。

**Q: 可以使用其他 AI 模型吗？**
A: 目前支持智谱 AI，计划支持更多模型。

**Q: 数据安全吗？**
A: 所有生成的卡片和您的输入都保存在本地 SQLite 数据库中。

**Q: 可以自定义卡片模板吗？**
A: 目前支持基础、反向和填空三种类型，后续会开放自定义模板。

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

- [Anki](https://apps.ankiweb.net/) - 强大的记忆卡片软件
- [LangGraph](https://python.langchain.com/docs/langgraph/) - AI 工作流框架
- [智谱 AI](https://zhipuai.cn/) - 提供 AI 能力支持

---

如果这个项目对您有帮助，请给个 ⭐️ 支持一下！