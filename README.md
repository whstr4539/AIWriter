# AI Writer

AI Writer 是一款功能强大的 AI 辅助小说创作工具，专为网络小说作者和创意写作者设计。通过集成多种主流 AI 服务，帮助作者提高创作效率，激发创作灵感。

![AI Writer Logo](build/icon.png)

## 功能特性

### 核心功能
- **AI 智能续写** - 根据上下文自动生成后续内容
- **章节管理** - 直观的小说和章节组织结构
- **富文本编辑器** - 基于 TipTap 的专业写作编辑器
- **多 AI 服务支持** - 支持 OpenAI、Anthropic、百度、阿里、字节跳动、智谱等多种 AI 服务
- **自定义 AI 配置** - 支持自定义 API 端点和参数

### 编辑器功能
- 富文本格式化（粗体、斜体、下划线、高亮等）
- 文本对齐和缩进
- 代码块和引用
- 打字机模式
- 专注模式
- 自动保存

### AI 功能
- 智能续写
- 内容润色
- 情节建议
- 角色生成
- 批量生成章节
- 上下文感知对话

## 系统要求

### Windows
- Windows 10 或更高版本
- 64位处理器
- 4GB RAM（推荐 8GB）
- 500MB 可用磁盘空间

### macOS
- macOS 10.15 (Catalina) 或更高版本
- Intel 或 Apple Silicon 处理器
- 4GB RAM（推荐 8GB）
- 500MB 可用磁盘空间

### Linux
- Ubuntu 18.04+ / Debian 10+ / Fedora 30+ / CentOS 8+
- 64位处理器
- 4GB RAM（推荐 8GB）
- 500MB 可用磁盘空间

## 安装说明

### Windows

#### 安装版 (推荐)
1. 下载 `AI-Writer-Setup-1.0.0.exe`
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 安装完成后，从开始菜单或桌面快捷方式启动

#### 便携版
1. 下载 `AI-Writer-Portable-1.0.0.exe`
2. 将文件复制到任意位置
3. 双击运行即可使用

### macOS
1. 下载 `AI-Writer-1.0.0.dmg`
2. 打开 DMG 文件
3. 将 AI Writer 拖入 Applications 文件夹
4. 从启动台或 Applications 文件夹启动

### Linux

#### AppImage (推荐)
1. 下载 `AI-Writer-1.0.0.AppImage`
2. 赋予执行权限：`chmod +x AI-Writer-1.0.0.AppImage`
3. 双击运行或在终端执行：`./AI-Writer-1.0.0.AppImage`

#### Debian/Ubuntu
1. 下载 `AI-Writer-1.0.0.deb`
2. 安装：`sudo dpkg -i AI-Writer-1.0.0.deb`
3. 或使用软件中心安装

#### Fedora/RHEL
1. 下载 `AI-Writer-1.0.0.rpm`
2. 安装：`sudo rpm -i AI-Writer-1.0.0.rpm`

## 使用说明

### 首次启动
1. 启动应用后，创建新小说或导入现有项目
2. 在设置中配置您的 AI 服务 API 密钥
3. 开始创作！

### 基本操作

#### 创建小说
1. 点击首页的"新建小说"按钮
2. 输入小说标题和简介
3. 设置保存位置
4. 点击创建

#### 管理章节
- 在左侧边栏查看章节列表
- 拖拽调整章节顺序
- 右键章节进行重命名、删除等操作
- 点击章节标题开始编辑

#### 使用 AI 功能
1. 在编辑器中选中需要处理的文本
2. 点击浮动工具栏或右键菜单中的 AI 选项
3. 选择所需的功能（续写、润色、建议等）
4. 查看 AI 生成的内容并选择接受或拒绝

### AI 服务配置

#### 支持的 AI 服务
- **OpenAI** - GPT-4, GPT-3.5-turbo
- **Anthropic** - Claude 系列
- **百度** - 文心一言
- **阿里** - 通义千问
- **字节跳动** - 豆包
- **智谱** - ChatGLM
- **Google** - Gemini
- **自定义** - 支持 OpenAI 兼容格式的 API

#### 配置步骤
1. 打开设置（Ctrl+, 或 Cmd+,）
2. 选择"AI 设置"标签
3. 选择要使用的 AI 服务
4. 输入 API 密钥
5. 调整参数（温度、最大令牌数等）
6. 点击保存

## 快捷键列表

### 通用快捷键

| 快捷键 | Windows/Linux | macOS | 功能 |
|--------|---------------|-------|------|
| 新建小说 | Ctrl+N | Cmd+N | 创建新小说 |
| 打开小说 | Ctrl+O | Cmd+O | 打开现有小说 |
| 保存 | Ctrl+S | Cmd+S | 保存当前内容 |
| 设置 | Ctrl+, | Cmd+, | 打开设置 |
| 全屏 | F11 | Cmd+Ctrl+F | 切换全屏模式 |

### 编辑器快捷键

| 快捷键 | Windows/Linux | macOS | 功能 |
|--------|---------------|-------|------|
| 粗体 | Ctrl+B | Cmd+B | 切换粗体 |
| 斜体 | Ctrl+I | Cmd+I | 切换斜体 |
| 下划线 | Ctrl+U | Cmd+U | 切换下划线 |
| 撤销 | Ctrl+Z | Cmd+Z | 撤销操作 |
| 重做 | Ctrl+Y / Ctrl+Shift+Z | Cmd+Shift+Z | 重做操作 |
| 查找 | Ctrl+F | Cmd+F | 查找文本 |
| 专注模式 | Ctrl+Shift+F | Cmd+Shift+F | 切换专注模式 |
| 打字机模式 | Ctrl+Shift+T | Cmd+Shift+T | 切换打字机模式 |

### AI 功能快捷键

| 快捷键 | Windows/Linux | macOS | 功能 |
|--------|---------------|-------|------|
| AI 续写 | Ctrl+Enter | Cmd+Enter | 触发 AI 续写 |
| AI 润色 | Ctrl+Shift+P | Cmd+Shift+P | 润色选中文本 |
| 显示 AI 面板 | Ctrl+Shift+A | Cmd+Shift+A | 显示/隐藏 AI 面板 |

## 数据存储

### 本地存储
- 小说数据默认存储在用户文档目录下的 `AI Writer` 文件夹
- 配置文件存储在应用数据目录
- 支持自定义存储位置

### 数据备份
- 支持导出小说为 JSON 格式
- 支持导入 JSON 格式的小说数据
- 建议定期备份重要作品

## 开发构建

### 环境要求
- Node.js 18+
- npm 9+ 或 yarn 1.22+

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
# 构建所有平台
npm run dist:all

# 仅构建 Windows
npm run dist:win

# 仅构建 macOS
npm run dist:mac

# 仅构建 Linux
npm run dist:linux

# 构建便携版
npm run dist:win:portable
```

### 生成图标
```bash
npm run icons
```

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **桌面框架**: Electron
- **UI 组件**: Ant Design
- **编辑器**: TipTap / ProseMirror
- **状态管理**: Zustand
- **路由**: React Router

## 常见问题

### Q: 如何获取 AI 服务的 API 密钥？
A: 访问相应 AI 服务的官方网站注册账号并创建 API 密钥。具体步骤请参考各服务商的文档。

### Q: 应用无法启动怎么办？
A: 
1. 检查系统是否满足最低要求
2. 尝试以管理员身份运行
3. 检查是否有杀毒软件阻止
4. 查看日志文件获取详细错误信息

### Q: 如何迁移数据到新电脑？
A: 导出小说数据为 JSON 文件，在新电脑上导入即可。配置文件位于用户数据目录。

### Q: 支持离线使用吗？
A: 编辑器功能完全支持离线使用，但 AI 功能需要网络连接。

## 隐私说明

- 所有小说数据本地存储，不会上传到云端
- AI 服务调用仅发送必要的文本内容
- API 密钥本地加密存储
- 不包含任何遥测或数据收集功能

## 开源协议

本项目采用 MIT 协议开源 - 详见 [LICENSE.txt](LICENSE.txt)

## 支持与反馈

- **GitHub Issues**: [https://github.com/aiwriter/ai-writer-app/issues](https://github.com/aiwriter/ai-writer-app/issues)
- **邮箱**: contact@aiwriter.com

## 更新日志

### v1.0.0 (2024-03-25)
- 初始版本发布
- 支持多种 AI 服务
- 完整的章节管理功能
- 富文本编辑器
- Windows/macOS/Linux 全平台支持

---

**AI Writer** - 让创作更智能，让写作更高效
