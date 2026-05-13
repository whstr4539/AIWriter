# AI Writer

AI Writer 是一款基于 Electron 的 AI 辅助小说创作桌面应用，专为网络小说作者和创意写作者设计。通过集成多种主流 AI 服务，帮助作者提高创作效率，激发创作灵感。

## 功能特性

### 核心功能
- **AI 智能续写** - 根据上下文自动生成后续内容
- **章节管理** - 直观的小说和章节组织结构，支持拖拽排序
- **富文本编辑器** - 基于 TipTap 的专业写作编辑器
- **多 AI 服务支持** - 支持 OpenAI、Anthropic、Google、百度、阿里、字节跳动、智谱等多种 AI 服务
- **自定义 AI 配置** - 支持 OpenAI 兼容格式的自定义 API 端点

### 编辑器功能
- 富文本格式化（粗体、斜体、下划线、高亮等）
- 大纲视图（总纲 / 卷纲 / 章纲）
- 打字机模式
- 专注模式
- 自动保存

### AI 功能
- 智能续写 / 改写 / 扩写 / 润色
- AI 生成大纲（总纲 / 卷纲 / 章纲）
- AI 生成章节
- 上下文感知对话
- 流式输出，支持中途停止

## 环境要求

- Node.js 18+
- npm 9+
- Windows 10+ / macOS 10.15+ / Linux

## 快速开始

```bash
# 克隆仓库
git clone <repo-url>
cd AIWriter

# 安装依赖
npm install

# 启动开发模式（编译 Electron 主进程 + 启动 Vite dev server + 启动 Electron）
npm run dev
```

开发模式下：
- Vite dev server 运行在 `http://localhost:5173`
- Electron 窗口自动打开并加载 dev server
- 支持热更新（渲染进程）

## 使用说明

### 配置 AI 服务
1. 打开设置（点击侧边栏底部齿轮图标）
2. 选择"AI 设置"标签
3. 选择要使用的 AI 服务提供商
4. 输入 API Key
5. 点击"测试连接"确认配置正确
6. 点击保存

### 支持的 AI 服务
- **OpenAI** - GPT-4o, GPT-4o-mini, GPT-4-turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus
- **Google** - Gemini 2.0 Flash, Gemini 1.5 Pro
- **阿里云** - 通义千问（qwen-max / plus / turbo）
- **百度** - 文心一言（ERNIE 4.0 / 3.5）
- **字节跳动** - 豆包（doubao-pro / lite）
- **智谱AI** - GLM-4 Plus / Flash
- **自定义** - 任意 OpenAI 兼容 API

### 基本操作

#### 创建小说
1. 点击首页的"新建小说"按钮
2. 输入小说标题和简介
3. 点击创建

#### 管理章节
- 左侧边栏查看章节列表
- 拖拽调整章节顺序
- 右键章节进行重命名、删除等操作
- 点击章节进入编辑

#### 使用 AI 功能
- **编辑器内 AI 写作**：选中文本后，点击浮动工具栏的 AI 选项（续写 / 改写 / 扩写 / 润色）
- **AI 生成大纲**：在编辑器大纲视图或作品设置页，点击"AI 生成"按钮
- **AI 生成章节**：通过右键菜单或工具栏触发

## 构建

```bash
npm run build            # TypeScript 编译 + Vite 打包
npm run pack:win         # 打包 Windows（不压缩）
npm run dist:win         # 构建 Windows 安装包
npm run dist:win:portable # 构建 Windows 便携版
npm run icons            # 生成各平台图标
```

## 技术栈

- **桌面框架**: Electron 28
- **前端**: React 18 + TypeScript 5 + Vite 5
- **UI 组件**: Ant Design 6
- **编辑器**: TipTap 3 + lowlight
- **状态管理**: Zustand 5
- **路由**: React Router v7

## 数据存储

- 小说数据以 JSON 文件存储在 userData 目录下
- API Key 本地加密存储
- 支持导出为 JSON / Markdown / TXT / DOCX 格式
- 不包含任何遥测或数据收集功能

## 开源协议

本项目采用 MIT 协议开源 - 详见 [LICENSE.txt](LICENSE.txt)
