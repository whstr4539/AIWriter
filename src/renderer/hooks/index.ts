/**
 * 自定义 Hooks 统一导出
 */

export { useAutoSave } from './useAutoSave';
export { useTheme, ThemeProvider } from './useTheme';
export { useOnboarding } from './useOnboarding';
export { useVirtualList } from './useVirtualList';
export { useWritingStats } from './useWritingStats';
export { useAIWrite } from './useAIWrite';

// 重新导出以便兼容旧代码
export { default as useAutoSaveDefault } from './useAutoSave';
export { default as useThemeDefault } from './useTheme.tsx';
export { default as useOnboardingDefault } from './useOnboarding';
export { default as useVirtualListDefault } from './useVirtualList';
export { default as useWritingStatsDefault } from './useWritingStats';
export { default as useAIWriteDefault } from './useAIWrite';
