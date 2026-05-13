# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI Writer 是一个基于 Electron 的 AI 辅助小说创作桌面应用。前端使用 React 18 + TypeScript + Vite + Ant Design 6，编辑器使用 TipTap，状态管理使用 Zustand，路由使用 React Router v7。

## 开发命令

```bash
npm install              # 安装依赖
npm run dev              # 开发模式（编译 Electron 主进程 + 启动 Vite dev server + 启动 Electron）
npm run build            # 完整构建（TypeScript 编译 + Vite 打包）
npm run icons            # 用 build/icon.png 生成各平台图标
npm run pack:win         # 打包 Windows（不压缩安装包）
npm run dist:win         # 构建并打 Windows 安装包
npm run dist:win:portable # 构建 Windows 便携版
```

## 技术栈

- **桌面框架**: Electron 28（contextIsolation: true，nodeIntegration: false）
- **前端**: React 18 + TypeScript 5 + Vite 5
- **UI 库**: Ant Design 6 + @ant-design/icons
- **编辑器**: TipTap 3 + lowlight（代码高亮）
- **状态管理**: Zustand 5（persist + devtools middleware）
- **路由**: React Router v7
- **拖拽**: @dnd-kit（章节排序）
- **构建**: electron-builder（NSIS/DMG/AppImage）

## 架构

### 双进程 Electron 架构

```
src/
├── main/           # Electron 主进程（CommonJS，编译到 dist/main/）
│   ├── main.ts         # 入口：创建 BrowserWindow，注册 IPC handlers
│   ├── preload.ts      # 通过 contextBridge 暴露 window.electron（invoke/on/removeListener/once）
│   ├── ipc/handlers.ts # 所有 IPC 通道定义与处理（novel/chapter/settings/export/ai/dialog/storage）
│   ├── ai/             # AI 服务层
│   │   ├── aiService.ts    # 统一入口：适配器工厂、initialize/generate/streamGenerate/testConnection
│   │   ├── baseAdapter.ts  # 抽象基类：HTTP/HTTPS 请求、流式/非流式、错误解析
│   │   ├── types.ts        # AI 相关类型（AdapterConfig, StreamCallbacks, IAIAdapter 等）
│   │   └── adapters/       # 8 个适配器：openai/anthropic/google/aliyun/baidu/bytedance/zhipu/custom
│   ├── storage/fileManager.ts  # 文件系统 CRUD：novels 以 JSON 文件存储在 userData 目录
│   └── utils/crypto.ts         # API Key 加密存储
├── renderer/       # 渲染进程（ESM，Vite 打包到 dist/renderer/）
│   ├── index.tsx       # React 入口
│   ├── App.tsx         # Ant Design ConfigProvider + RouterProvider + Onboarding
│   ├── router/         # React Router 配置：
│   │                   #   / → Home, /novels → 作品列表, /novels/:id → 作品编辑,
│   │                   #   /novels/:novelId/chapters/:chapterId → 章节编辑, /settings → 设置
│   ├── store/          # Zustand stores
│   │   ├── index.ts       # useAppStore（theme/sidebar/language，persist 到 localStorage）
│   │   └── novelStore.ts  # useNovelStore（novel/chapter CRUD + 自动保存，persist currentNovel）
│   ├── api/ipc.ts      # 渲染进程 API 层：封装 window.electron.invoke()
│   ├── hooks/          # 自定义 hooks：useAutoSave, useTheme, useTypewriterMode, useWritingStats, useVirtualList, useOnboarding
│   ├── components/     # 通用组件
│   │   ├── Layout/         # 应用布局（侧边栏 + 内容区）
│   │   ├── Editor/         # TipTap 编辑器 + Toolbar
│   │   ├── ChapterSidebar/ # 章节列表（拖拽排序）
│   │   ├── AIContextMenu/  # AI 右键菜单
│   │   ├── AIDialog/       # AI 对话弹窗
│   │   ├── AIFloatingToolbar/ # AI 浮动工具栏
│   │   ├── AIGenerateChapterDialog/ # 批量生成章节
│   │   ├── ExportDialog/   # 导出（JSON/Markdown/TXT/DOCX）
│   │   ├── ImportDialog/   # 导入
│   │   ├── Onboarding/     # 首次使用引导
│   │   └── Skeleton/       # 骨架屏
│   └── pages/          # 页面组件
│       ├── Home/           # 首页仪表盘
│       ├── Novels/         # 作品列表 + CreateNovelModal
│       ├── NovelEdit/      # 作品详情/设置
│       ├── ChapterEdit/    # 章节编辑器 + CreateChapterModal
│       ├── Settings/       # 设置页（GeneralSettings / EditorSettings / AISettings 三个 Tab）
│       └── Documents/      # 文档/帮助页
├── types/          # 共享类型定义（主进程和渲染进程共用）
│   ├── index.ts        # AppState
│   └── novel.ts        # Novel, Chapter, AISettings, ExportOptions 等数据模型
└── 静态资源
    ├── index.html      # 渲染进程 HTML 入口
    ├── build/          # 构建资源（图标、安装脚本）
    └── resources/      # 额外资源（打包时复制到应用目录）
```

### 数据流

1. **渲染进程 → 主进程**: 通过 `window.electron.invoke(channel, ...args)` 发送 IPC 请求
2. **主进程 → 渲染进程**: AI 流式响应通过 `event.sender.send('ai:streamChunk', chunk)` 推送事件
3. **Channel 命名**: `domain:action` 格式，如 `novel:create`, `ai:streamGenerate`
4. **API 封装**: 渲染进程 `api/*` 对象封装所有 IPC 调用

### AI 适配器模式

- 所有适配器继承 `BaseAdapter`（`src/main/ai/baseAdapter.ts`），使用 Node.js 原生 `http`/`https` 模块发送请求
- `BaseAdapter` 提供：非流式请求 `makeRequest()`、流式请求 `makeStreamRequest()`（SSE 解析）、错误分类
- 每个适配器实现：`generate()`, `streamGenerate()`, `testConnection()`, `getAvailableModels()`, `buildRequestBody()`, `parseResponse()`, `parseStreamLine()`, `getHeaders()`, `getEndpoint()`
- `AIService` 作为工厂根据 `AIProvider` 选择对应适配器；提供静态方法获取 provider 列表/默认 baseUrl/默认 model
- `custom` 适配器支持 OpenAI 兼容 API

### 关键依赖

- `@/` 别名指向 `src/renderer/`
- 主进程为 CommonJS 模块系统（`tsconfig.electron.json`），渲染进程为 ESM（Vite）
- Vite dev server 端口固定 5173，主进程开发模式连接 `http://localhost:5174`（实际上 main.ts 是 5174，vite.config 是 5173，存在端口不一致的风险）
- API Key 通过 `crypto.ts` 中的 `secureStoreApiKey`/`secureRetrieveApiKey` 加密存储在本地文件
- 小说数据以 JSON 文件组织存储在 `userData/novels/<novel-id>/` 目录下，设置存储在 `userData/settings.json` 和 `ai-settings.json`
