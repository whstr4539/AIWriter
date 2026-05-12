/**
 * 用户引导组件
 * 首次使用引导和功能提示
 */

import React, { useEffect, useState } from 'react';
import { Modal, Button, Tour, TourProps, Tooltip, Badge } from 'antd';
import {
  BookOutlined,
  EditOutlined,
  RobotOutlined,
  FullscreenOutlined,
  ExportOutlined,
  QuestionCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useOnboarding } from '../../hooks';
import './styles.css';

interface OnboardingProps {
  children: React.ReactNode;
}

export const Onboarding: React.FC<OnboardingProps> = ({ children }) => {
  const {
    isFirstTime,
    skipped,
    startOnboarding,
    skipOnboarding,
  } = useOnboarding();

  const [welcomeVisible, setWelcomeVisible] = useState(false);

  // 首次访问显示欢迎弹窗
  useEffect(() => {
    if (isFirstTime && !skipped) {
      setWelcomeVisible(true);
    }
  }, [isFirstTime, skipped]);

  // 开始引导
  const handleStartTour = () => {
    setWelcomeVisible(false);
    startOnboarding();
    // TODO: 实现步骤引导
  };

  // 跳过引导
  const handleSkip = () => {
    setWelcomeVisible(false);
    skipOnboarding();
  };

  // 欢迎弹窗
  const renderWelcomeModal = () => (
    <Modal
      open={welcomeVisible}
      footer={null}
      closable={false}
      centered
      className="onboarding-welcome-modal"
      width={480}
    >
      <div className="onboarding-welcome">
        <div className="welcome-icon">
          <BookOutlined />
        </div>
        <h2 className="welcome-title">欢迎使用 AI Writer</h2>
        <p className="welcome-desc">
          您的智能写作助手。让我们花一分钟时间了解主要功能，帮助您快速上手。
        </p>
        <div className="welcome-features">
          <div className="feature-item">
            <EditOutlined className="feature-icon" />
            <span>富文本编辑器</span>
          </div>
          <div className="feature-item">
            <RobotOutlined className="feature-icon" />
            <span>AI 智能创作</span>
          </div>
          <div className="feature-item">
            <FullscreenOutlined className="feature-icon" />
            <span>专注写作模式</span>
          </div>
          <div className="feature-item">
            <ExportOutlined className="feature-icon" />
            <span>多格式导出</span>
          </div>
        </div>
        <div className="welcome-actions">
          <Button type="primary" size="large" block onClick={handleStartTour}>
            开始引导
          </Button>
          <Button type="link" onClick={handleSkip}>
            跳过，我自己探索
          </Button>
        </div>
      </div>
    </Modal>
  );

  return (
    <>
      {children}
      {renderWelcomeModal()}
    </>
  );
};

// 功能提示气泡组件
interface FeatureTooltipProps {
  feature: string;
  title: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({
  feature,
  title,
  content,
  placement = 'top',
  children,
}) => {
  const { hasSeenFeature, markFeatureSeen } = useOnboarding();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 延迟显示，避免页面加载时立即弹出
    const timer = setTimeout(() => {
      if (!hasSeenFeature(feature)) {
        setVisible(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [feature, hasSeenFeature]);

  const handleClose = () => {
    setVisible(false);
    markFeatureSeen(feature);
  };

  return (
    <Tooltip
      open={visible}
      placement={placement}
      title={
        <div className="feature-tooltip-content">
          <div className="feature-tooltip-header">
            <span className="feature-tooltip-title">{title}</span>
            <CloseOutlined className="feature-tooltip-close" onClick={handleClose} />
          </div>
          <div className="feature-tooltip-body">{content}</div>
          <div className="feature-tooltip-footer">
            <Button type="link" size="small" onClick={handleClose}>
              知道了
            </Button>
          </div>
        </div>
      }
      color="var(--bg-elevated)"
    >
      <Badge dot={visible} offset={[-2, 2]}>
        {children}
      </Badge>
    </Tooltip>
  );
};

// 快捷键提示组件
interface ShortcutHintProps {
  shortcut: string;
  description: string;
  visible?: boolean;
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({
  shortcut,
  description,
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <div className="shortcut-hint">
      <kbd className="shortcut-key">{shortcut}</kbd>
      <span className="shortcut-desc">{description}</span>
    </div>
  );
};

// 空状态引导组件
interface EmptyGuideProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyGuide: React.FC<EmptyGuideProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="empty-guide">
      <div className="empty-guide-icon">{icon || <QuestionCircleOutlined />}</div>
      <h3 className="empty-guide-title">{title}</h3>
      <p className="empty-guide-desc">{description}</p>
      {action && <div className="empty-guide-action">{action}</div>}
    </div>
  );
};

// 步骤引导组件
interface StepGuideProps {
  steps: Array<{
    title: string;
    description: string;
    target: string;
  }>;
  open: boolean;
  onClose: () => void;
}

export const StepGuide: React.FC<StepGuideProps> = ({ steps, open, onClose }) => {
  const [current, setCurrent] = useState(0);

  const tourSteps: TourProps['steps'] = steps.map((step) => ({
    title: step.title,
    description: step.description,
    target: () => document.querySelector(step.target) as HTMLElement,
  }));

  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={tourSteps}
      current={current}
      onChange={setCurrent}
    />
  );
};

export default Onboarding;
