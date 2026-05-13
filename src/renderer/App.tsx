import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme, ThemeProvider } from './hooks';
import { Onboarding } from './components/Onboarding';
import router from './router';
import './App.css';

const AppInner: React.FC = () => {
  const { isDark, effectiveTheme } = useTheme();

  useEffect(() => {
    document.body.className = `${effectiveTheme}-theme`;
  }, [effectiveTheme]);

  const antdThemeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1890ff',
      borderRadius: 8,
      wireframe: false,
    },
    components: {
      Button: { borderRadius: 6, controlHeight: 36 },
      Card: { borderRadius: 12 },
      Modal: { borderRadius: 12 },
      Input: { borderRadius: 6 },
      Select: { borderRadius: 6 },
    },
  };

  return (
    <ConfigProvider locale={zhCN} theme={antdThemeConfig}>
      <AntdApp>
        <Onboarding>
          <RouterProvider router={router} />
        </Onboarding>
      </AntdApp>
    </ConfigProvider>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppInner />
  </ThemeProvider>
);

export default App;
