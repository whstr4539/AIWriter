/**
 * 布局组件
 * 包含响应式侧边栏、主题切换、移动端适配等
 */

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  BookOutlined,
  SettingOutlined,
  BulbOutlined,
  MoonOutlined,
  ThunderboltOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useTheme } from '../../hooks';
import './styles.css';

const { Header, Sider, Content } = Layout;

const LayoutComponent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { isDark, toggleTheme } = useTheme();

  // 移动端菜单状态
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 菜单项配置
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/novels',
      icon: <BookOutlined />,
      label: '我的作品',
    },
    {
      key: '/prompts',
      icon: <ThunderboltOutlined />,
      label: '提示词管理',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // 渲染侧边栏菜单
  const renderMenu = () => (
    <Menu
      theme={isDark ? 'dark' : 'light'}
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 'none' }}
    />
  );

  return (
    <Layout className="app-layout">
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={sidebarCollapsed}
          className="app-sider"
          width={240}
          collapsedWidth={80}
        >
          <div className="logo">{sidebarCollapsed ? 'AI' : 'AI Writer'}</div>
          {renderMenu()}
        </Sider>
      )}

      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <>
          <Drawer
            placement="left"
            closable={false}
            onClose={() => setMobileMenuOpen(false)}
            open={mobileMenuOpen}
            width={240}
            bodyStyle={{ padding: 0, background: 'var(--sidebar-bg)' }}
            headerStyle={{ display: 'none' }}
          >
            <div className="logo">AI Writer</div>
            {renderMenu()}
          </Drawer>
          {/* 遮罩层 */}
          <div
            className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          />
        </>
      )}

      <Layout>
        {/* 顶部导航栏 */}
        <Header className="app-header">
          <div className="header-left">
            {/* 移动端菜单按钮 */}
            {isMobile && (
              <div
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(true)}
              >
                <MenuOutlined />
              </div>
            )}

            {/* 桌面端折叠按钮 */}
            {!isMobile && (
              <Button
                type="text"
                icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggleSidebar}
                style={{ fontSize: '16px', width: 40, height: 40 }}
              />
            )}
          </div>

          <div className="header-right">
            {/* 主题切换 */}
            <div className="theme-toggle-btn" onClick={toggleTheme}>
              {isDark ? <BulbOutlined /> : <MoonOutlined />}
            </div>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default LayoutComponent;
