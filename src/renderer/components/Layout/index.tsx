import React, { useState, useEffect } from 'react';
import { Layout, Menu, Drawer } from 'antd';
import {
  HomeOutlined,
  BookOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useTheme } from '../../hooks';
import TitleBar from '../TitleBar';
import './styles.css';

const { Sider, Content } = Layout;

const LayoutComponent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed } = useAppStore();
  const { isDark } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/novels', icon: <BookOutlined />, label: '我的作品' },
    { key: '/prompts', icon: <ThunderboltOutlined />, label: '提示词管理' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

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
    <div className="app-frame">
      <TitleBar
        isMobile={isMobile}
        onMobileMenuToggle={() => setMobileMenuOpen(true)}
      />
      <Layout className="app-layout">
        {!isMobile && (
          <Sider
            trigger={null}
            collapsible
            collapsed={sidebarCollapsed}
            className="app-sider"
            width={240}
            collapsedWidth={80}
          >
            {renderMenu()}
          </Sider>
        )}

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
            <div
              className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            />
          </>
        )}

        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </div>
  );
};

export default LayoutComponent;
