/**
 * 全局类型定义
 */

// 用户类型
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

// 应用状态类型
export interface AppState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  language: string;
}

// 路由配置类型
export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  title?: string;
  icon?: string;
  children?: RouteConfig[];
}

// API响应类型
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
  success: boolean;
}

// 分页类型
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 从共享类型中重新导出小说相关类型
export * from '../../types/novel';
