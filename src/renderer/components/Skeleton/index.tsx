/**
 * 骨架屏组件
 * 用于加载状态的占位显示
 */

import React from 'react';
import './styles.css';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return <div className={`skeleton ${className}`} style={style} />;
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`skeleton-text-container ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton skeleton-text"
          style={{ width: index === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
};

interface SkeletonTitleProps {
  className?: string;
}

export const SkeletonTitle: React.FC<SkeletonTitleProps> = ({ className = '' }) => {
  return <div className={`skeleton skeleton-title ${className}`} />;
};

interface SkeletonAvatarProps {
  size?: number;
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({ size = 40, className = '' }) => {
  return (
    <div
      className={`skeleton skeleton-avatar ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

interface SkeletonCardProps {
  className?: string;
  height?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '', height = 120 }) => {
  return (
    <div
      className={`skeleton skeleton-card ${className}`}
      style={{ height }}
    />
  );
};

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ count = 5, className = '' }) => {
  return (
    <div className={`skeleton-list ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-list-item">
          <SkeletonAvatar size={40} />
          <div className="skeleton-list-content">
            <SkeletonTitle />
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
};

interface SkeletonEditorProps {
  className?: string;
}

export const SkeletonEditor: React.FC<SkeletonEditorProps> = ({ className = '' }) => {
  return (
    <div className={`skeleton-editor ${className}`}>
      <div className="skeleton-editor-toolbar">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="skeleton-toolbar-btn" />
        ))}
      </div>
      <div className="skeleton-editor-content">
        <SkeletonTitle />
        <SkeletonText lines={10} />
      </div>
    </div>
  );
};

interface SkeletonSidebarProps {
  className?: string;
}

export const SkeletonSidebar: React.FC<SkeletonSidebarProps> = ({ className = '' }) => {
  return (
    <div className={`skeleton-sidebar ${className}`}>
      <div className="skeleton-sidebar-header">
        <SkeletonTitle />
      </div>
      <div className="skeleton-sidebar-content">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton-sidebar-item">
            <Skeleton className="skeleton-sidebar-icon" />
            <SkeletonText lines={1} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default {
  Skeleton,
  SkeletonText,
  SkeletonTitle,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonList,
  SkeletonEditor,
  SkeletonSidebar,
};
