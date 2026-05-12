import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc/handlers';

// 保持对window对象的全局引用，如果不这么做的话，当JavaScript对象被
// 垃圾回收的时候，window窗口将会自动关闭
let mainWindow: BrowserWindow | null = null;

const isDev = process.argv.includes('--dev');

function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // 开发时允许跨域
    },
    show: false, // 先不显示，等加载完成后再显示
    autoHideMenuBar: true, // 隐藏菜单栏，但保留快捷键（按 Alt 键显示）
  });

  // 加载应用
  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 当 window 被关闭，这个事件会被触发
  mainWindow.on('closed', () => {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素
    mainWindow = null;
  });
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(async () => {
  // 注册 IPC 处理器
  await registerIpcHandlers();
  createWindow();
});

// 当所有窗口都被关闭后退出
app.on('window-all-closed', () => {
  // 注销 IPC 处理器
  unregisterIpcHandlers();
  
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且该应用没有打开的窗口时，
  // 通常在应用程序中重新创建一个窗口
  if (mainWindow === null) {
    createWindow();
  }
});

// 在应用退出前清理
app.on('before-quit', () => {
  unregisterIpcHandlers();
});

// 在这个文件中，你可以续写应用剩下主进程代码。
// 也可以拆分成几个文件，然后用 require 导入。
