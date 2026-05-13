/**
 * Electron API 类型声明
 */

export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  once: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
