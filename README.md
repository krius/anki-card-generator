# Anki卡片生成器

一个基于网页的Anki卡片生成工具，支持通过文本和图片输入，调用LLM自动生成问答卡片。

## 功能特性

- 📝 文本问题输入和LLM回答生成
- 🖼️ 图片上传和OCR识别
- 🤖 多模态LLM集成（支持图片理解）
- ✅ 质检Agent系统确保生成质量
- 📦 直接导出Anki .apkg文件
- 🌐 跨平台网页应用

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite
- **LLM集成**: OpenAI API / Claude API
- **文件处理**: JSZip

## 项目结构

```
anki-card-generator/
├── frontend/          # React前端
├── backend/           # Node.js后端
├── README.md
└── .gitignore
```

## 开发计划

1. [x] 研究Anki文件格式
2. [ ] 创建基础项目结构
3. [ ] 实现前端界面
4. [ ] 集成LLM API
5. [ ] 实现卡片生成逻辑
6. [ ] 添加图片和OCR功能
7. [ ] 实现质检系统
8. [ ] 实现Anki导出功能
9. [ ] 测试和优化

## 使用流程

1. 用户输入问题或上传图片
2. 系统调用LLM生成回答
3. 质检Agent检查生成质量
4. 用户预览和确认卡片
5. 导出为.apkg文件并导入Anki