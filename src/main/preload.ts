/**
 * Preload 脚本
 * 安全地暴露主进程 API 给渲染进程
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// 暴露给渲染进程的 API
const electronAPI = {
  // IPC 调用
  invoke: (channel: string, ...args: any[]): Promise<any> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // 监听 IPC 事件
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },

  // 移除 IPC 事件监听
  removeListener: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // 一次性监听
  once: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.once(channel, callback);
  },
};

// 使用 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electron', electronAPI);

// 类型声明（供 TypeScript 使用）
declare global {
  interface Window {
    electron: typeof electronAPI;
  }
}
