/**
 * 设置页面
 * 包含 AI 设置、通用设置、编辑器设置三个标签页
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  message,
  Spin,
  Typography,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  RobotOutlined,
  SettingOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { AISettings, AppSettings, EditorSettings, AITestResult } from '../../../types/novel';
import { settingsApi } from '../../api/ipc';
import { useAppStore } from '../../store';
import AISettingsTab from './components/AISettingsTab';
import GeneralSettingsTab from './components/GeneralSettingsTab';
import EditorSettingsTab from './components/EditorSettingsTab';
import { DEFAULT_AI_SETTINGS, DEFAULT_EDITOR_SETTINGS } from './constants';
import './styles.css';

const { Title } = Typography;
const { TabPane } = Tabs;

// 默认应用设置
const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'zh-CN',
  theme: 'system',
  sidebarCollapsed: false,
  recentNovels: [],
  maxRecentNovels: 10,
  backupEnabled: true,
  backupInterval: 24,
  backupCount: 5,
};

const Settings: React.FC = () => {
  const { setTheme, setLanguage } = useAppStore();

  // 加载状态
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');

  // 设置状态
  const [aiSettings, setAISettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);

  // 标记是否有未保存的更改
  const [hasChanges, setHasChanges] = useState(false);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);

        // 并行加载 AI 设置和应用设置
        const [aiResult, appResult] = await Promise.all([
          settingsApi.getAI(),
          settingsApi.getApp(),
        ]);

        if (aiResult.success && aiResult.data) {
          setAISettings({ ...DEFAULT_AI_SETTINGS, ...aiResult.data });
        }

        if (appResult.success && appResult.data) {
          setAppSettings({ ...DEFAULT_APP_SETTINGS, ...appResult.data });
          // 应用主题和语言设置
          if (appResult.data.theme && appResult.data.theme !== 'system') {
            setTheme(appResult.data.theme);
          }
          if (appResult.data.language) {
            setLanguage(appResult.data.language);
          }
        }

        // 编辑器设置从本地存储加载（或使用默认值）
        const savedEditorSettings = localStorage.getItem('editor-settings');
        if (savedEditorSettings) {
          try {
            const parsed = JSON.parse(savedEditorSettings);
            setEditorSettings({ ...DEFAULT_EDITOR_SETTINGS, ...parsed });
          } catch {
            setEditorSettings(DEFAULT_EDITOR_SETTINGS);
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error);
        message.error('加载设置失败');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [setTheme, setLanguage]);

  // 处理 AI 设置变化
  const handleAISettingsChange = useCallback((newSettings: AISettings) => {
    setAISettings(newSettings);
    setHasChanges(true);
  }, []);

  // 处理应用设置变化
  const handleAppSettingsChange = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings);
    setHasChanges(true);

    // 实时应用某些设置
    if (newSettings.theme !== 'system') {
      setTheme(newSettings.theme);
    }
    setLanguage(newSettings.language);
  }, [setTheme, setLanguage]);

  // 处理编辑器设置变化
  const handleEditorSettingsChange = useCallback((newSettings: EditorSettings) => {
    setEditorSettings(newSettings);
    setHasChanges(true);
  }, []);

  // 保存所有设置
  const handleSave = async () => {
    try {
      setSaving(true);

      // 并行保存 AI 设置和应用设置
      const [aiResult, appResult] = await Promise.all([
        settingsApi.saveAI(aiSettings),
        settingsApi.saveApp(appSettings),
      ]);

      // 保存编辑器设置到本地存储
      localStorage.setItem('editor-settings', JSON.stringify(editorSettings));

      if (aiResult.success && appResult.success) {
        message.success('设置已保存');
        setHasChanges(false);
      } else {
        const errors = [
          !aiResult.success && `AI 设置: ${aiResult.error}`,
          !appResult.success && `应用设置: ${appResult.error}`,
        ].filter(Boolean);
        message.error(`保存失败: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置设置
  const handleReset = async () => {
    try {
      setLoading(true);

      // 重新加载设置
      const [aiResult, appResult] = await Promise.all([
        settingsApi.getAI(),
        settingsApi.getApp(),
      ]);

      if (aiResult.success && aiResult.data) {
        setAISettings(aiResult.data);
      } else {
        setAISettings(DEFAULT_AI_SETTINGS);
      }

      if (appResult.success && appResult.data) {
        setAppSettings(appResult.data);
      } else {
        setAppSettings(DEFAULT_APP_SETTINGS);
      }

      const savedEditorSettings = localStorage.getItem('editor-settings');
      if (savedEditorSettings) {
        try {
          const parsed = JSON.parse(savedEditorSettings);
          setEditorSettings({ ...DEFAULT_EDITOR_SETTINGS, ...parsed });
        } catch {
          setEditorSettings(DEFAULT_EDITOR_SETTINGS);
        }
      } else {
        setEditorSettings(DEFAULT_EDITOR_SETTINGS);
      }

      setHasChanges(false);
      message.info('设置已重置');
    } catch (error) {
      console.error('重置设置失败:', error);
      message.error('重置设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试 AI 连接
  const handleTestAIConnection = async (settings: AISettings): Promise<AITestResult> => {
    // 这里实现实际的连接测试逻辑
    // 暂时返回模拟结果
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟测试逻辑
        if (!settings.apiKey || settings.apiKey.length < 10) {
          resolve({
            success: false,
            message: 'API Key 格式不正确',
          });
          return;
        }

        // 模拟成功
        resolve({
          success: true,
          message: `成功连接到 ${settings.provider} API`,
          latency: Math.floor(Math.random() * 500) + 100,
          modelAvailable: true,
        });
      }, 1000);
    });
  };

  if (loading) {
    return (
      <div className="settings-page loading">
        <Spin size="large" tip="加载设置中..." />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <Card
        title={
          <div className="settings-header">
            <Title level={4} style={{ margin: 0 }}>系统设置</Title>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges}
              >
                保存设置
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={saving}
              >
                重置
              </Button>
            </Space>
          </div>
        }
        className="settings-card"
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          className="settings-tabs"
        >
          <TabPane
            tab={
              <span>
                <RobotOutlined />
                AI 设置
              </span>
            }
            key="ai"
          >
            <AISettingsTab
              settings={aiSettings}
              onChange={handleAISettingsChange}
              onTestConnection={handleTestAIConnection}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SettingOutlined />
                通用设置
              </span>
            }
            key="general"
          >
            <GeneralSettingsTab
              settings={appSettings}
              onChange={handleAppSettingsChange}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <EditOutlined />
                编辑器设置
              </span>
            }
            key="editor"
          >
            <EditorSettingsTab
              settings={editorSettings}
              onChange={handleEditorSettingsChange}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;
