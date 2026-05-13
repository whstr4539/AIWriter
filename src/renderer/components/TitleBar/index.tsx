import React, { useState, useEffect, useCallback } from 'react';
import {
  MinusOutlined,
  BorderOutlined,
  SwitcherOutlined,
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  BulbOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store';
import { useTheme } from '../../hooks';
import './styles.css';

const api = window.electron;

interface TitleBarProps {
  isMobile: boolean;
  onMobileMenuToggle: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ isMobile, onMobileMenuToggle }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!api) return;

    const handleMaximizeChange = (_event: any, maximized: boolean) => {
      setIsMaximized(maximized);
    };

    api.on('window:maximizeChange', handleMaximizeChange);
    return () => {
      api.removeListener('window:maximizeChange', handleMaximizeChange);
    };
  }, []);

  useEffect(() => {
    api?.isMaximized().then(setIsMaximized);
  }, []);

  const handleMinimize = useCallback(() => api?.minimizeWindow(), []);
  const handleMaximize = useCallback(() => api?.maximizeWindow(), []);
  const handleClose = useCallback(() => api?.closeWindow(), []);

  const menuIcon = isMobile ? (
    <MenuOutlined />
  ) : sidebarCollapsed ? (
    <MenuUnfoldOutlined />
  ) : (
    <MenuFoldOutlined />
  );

  const onMenuClick = isMobile ? onMobileMenuToggle : toggleSidebar;

  const menuTitle = isMobile
    ? '菜单'
    : sidebarCollapsed
      ? '展开侧边栏'
      : '收起侧边栏';

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <button
          className="title-bar-icon-btn"
          onClick={onMenuClick}
          title={menuTitle}
          aria-label={menuTitle}
        >
          {menuIcon}
        </button>
        <span className="title-bar-brand">AI Writer</span>
      </div>

      <div className="title-bar-right">
        <button
          className="title-bar-icon-btn"
          onClick={toggleTheme}
          title={isDark ? '切换日间模式' : '切换夜间模式'}
          aria-label={isDark ? '切换日间模式' : '切换夜间模式'}
        >
          {isDark ? <BulbOutlined /> : <MoonOutlined />}
        </button>

        <div className="title-bar-window-controls">
          <button
            className="title-bar-icon-btn"
            onClick={handleMinimize}
            title="最小化"
            aria-label="最小化"
          >
            <MinusOutlined />
          </button>
          <button
            className="title-bar-icon-btn"
            onClick={handleMaximize}
            title={isMaximized ? '还原' : '最大化'}
            aria-label={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? <SwitcherOutlined /> : <BorderOutlined />}
          </button>
          <button
            className="title-bar-icon-btn close-btn"
            onClick={handleClose}
            title="关闭"
            aria-label="关闭"
          >
            <CloseOutlined />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
