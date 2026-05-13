import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Input,
  Button,
  Space,
  Tooltip,
  Badge,
  message,
  Spin,
  Empty,
  Modal,
  Segmented,
  Card,
  Typography,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  MoonOutlined,
  SunOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import ChapterSidebar from '../../components/ChapterSidebar';
import CreateChapterModal from './components/CreateChapterModal';
import RichTextEditor from '../../components/Editor';
import AIOutlineGenerateDialog from '../../components/AIOutlineGenerateDialog';
import { useNovelStore } from '../../store';
import { useTheme, useWritingStats, useAutoSave } from '../../hooks';
import './styles.css';

const { Content, Sider } = Layout;

const ChapterEditPage: React.FC = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();

  const {
    currentNovel,
    currentChapter,
    chapterList,
    volumeList,
    isLoading,
    loadNovel,
    loadChapter,
    updateChapterTitle,
    updateChapter,
    updateNovel,
    updateVolume,
    setCurrentChapter,
  } = useNovelStore();

  const { isDark, toggleTheme } = useTheme();
  const { startTracking, stopTracking, addWordCount } = useWritingStats();

  // Auto-save via hook (replaces inline autoSaveTimerRef)
  const {
    setContent: trackContent,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    saveNow,
  } = useAutoSave({ interval: 30000, enabled: chapterId !== 'new' });

  // Local editor state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<'content' | 'outline'>('content');
  const previousWordCountRef = useRef<number>(0);
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [outlineDialogType, setOutlineDialogType] = useState<'novel' | 'volume' | 'chapter'>('novel');

  // Load novel data
  useEffect(() => {
    if (novelId) {
      loadNovel(novelId);
    }
  }, [novelId, loadNovel]);

  // Load chapter content
  useEffect(() => {
    if (novelId && chapterId && chapterId !== 'new') {
      loadChapter(novelId, chapterId);
    }
  }, [novelId, chapterId, loadChapter]);

  // Track whether chapter data has finished loading
  const chapterLoadedRef = useRef(false);

  // Keep latest callback refs for TipTap (which captures onUpdate once at creation)
  const handleContentChangeRef = useRef<(c: string) => void>(() => {});
  handleContentChangeRef.current = (newContent: string) => {
    setContent(newContent);
    // Don't track as dirty until chapter data is fully loaded
    if (chapterLoadedRef.current && newContent !== baselineContentRef.current) {
      trackContent(newContent);
    }
    if (currentChapter) {
      setCurrentChapter({ ...currentChapter, content: newContent });
    }
  };

  // Track the baseline content to prevent false unsaved on initial load
  const baselineContentRef = useRef('');

  // Sync chapter data to local state on chapter switch
  useEffect(() => {
    if (currentChapter) {
      setTitle(currentChapter.title);
      setContent(currentChapter.content);
      setWordCount(currentChapter.wordCount);
      baselineContentRef.current = currentChapter.content;
      chapterLoadedRef.current = true;
    }
  }, [currentChapter?.id]);

  // Exit focus mode on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Track writing session
  useEffect(() => {
    startTracking();
    return () => { stopTracking(); };
  }, [startTracking, stopTracking]);

  const handleContentChange = (newContent: string) => {
    handleContentChangeRef.current(newContent);
  };

  // Word count change
  const handleWordCountChange = (count: number) => {
    setWordCount(count);
    const delta = count - previousWordCountRef.current;
    if (delta > 0) {
      addWordCount(delta);
    }
    previousWordCountRef.current = count;
  };

  // Title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // AI outline save callback
  const handleOutlineSave = async (outline: string, type: 'novel' | 'volume' | 'chapter', targetId?: string) => {
    if (!novelId) return;
    if (type === 'novel') {
      await updateNovel(novelId, { outline });
    } else if (type === 'volume' && targetId) {
      await updateVolume(targetId, { outline });
    } else if (type === 'chapter' && targetId) {
      await updateChapter(targetId, { outline });
    }
    // Refresh data
    await loadNovel(novelId);
    if (chapterId && chapterId !== 'new') {
      await loadChapter(novelId, chapterId);
    }
    message.success(`${type === 'novel' ? '总纲' : type === 'volume' ? '卷纲' : '章纲'}已保存`);
  };

  // Outline reference info for AI context
  const getOutlineReferenceInfo = () => {
    if (!currentNovel) return '';
    if (outlineDialogType === 'novel') return '';
    let info = `【作品总纲】\n${currentNovel.outline || '暂无'}`;
    if (outlineDialogType === 'volume') return info;
    info += '\n\n';
    volumeList.forEach(v => {
      info += `【${v.title}】\n${v.outline || '暂无'}\n`;
    });
    return info;
  };

  // Context menu for outline cards
  const getOutlineContextMenu = (type: 'novel' | 'volume' | 'chapter'): MenuProps => ({
    items: [
      {
        key: 'ai-outline',
        icon: <RobotOutlined />,
        label: `AI 生成${type === 'novel' ? '总纲' : type === 'volume' ? '卷纲' : '章纲'}`,
        onClick: () => {
          setOutlineDialogType(type);
          setOutlineDialogOpen(true);
        },
      },
    ],
  });

  // Manual save (includes title)
  const handleManualSave = async () => {
    if (!novelId || !chapterId || chapterId === 'new' || isSaving) return;
    try {
      if (title !== currentChapter?.title) {
        await updateChapterTitle(chapterId, title);
      }
      await saveNow();
      message.success('保存成功');
    } catch (error) {
      message.error('保存失败');
      console.error('保存失败:', error);
    }
  };

  // Focus / typewriter toggle
  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
    message.info(isFocusMode ? '已退出专注模式' : '已进入专注模式，按 ESC 退出');
  };

  // Chapter selection with unsaved changes guard
  const handleChapterSelect = (selectedChapterId: string) => {
    // 没有剩余章节时返回作品设置页
    if (!selectedChapterId) {
      navigate(`/novels/${novelId}?settings=true`);
      return;
    }
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: '未保存的更改',
        content: '当前章节有未保存的更改，是否保存？',
        okText: '保存',
        cancelText: '不保存',
        onOk: async () => {
          await handleManualSave();
          navigate(`/novels/${novelId}/chapters/${selectedChapterId}`);
        },
        onCancel: () => {
          navigate(`/novels/${novelId}/chapters/${selectedChapterId}`);
        },
      });
    } else {
      navigate(`/novels/${novelId}/chapters/${selectedChapterId}`);
    }
  };

  const handleBackToNovel = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: '未保存的更改',
        content: '当前章节有未保存的更改，是否保存？',
        okText: '保存',
        cancelText: '不保存',
        onOk: async () => {
          await handleManualSave();
          navigate(`/novels/${novelId}?settings=true`);
        },
        onCancel: () => {
          navigate(`/novels/${novelId}?settings=true`);
        },
      });
    } else {
      navigate(`/novels/${novelId}?settings=true`);
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    return count.toString();
  };

  const formatSaveTime = (dateStr?: string) => {
    if (!dateStr) return '未保存';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // New chapter view
  if (chapterId === 'new') {
    return (
      <div className="chapter-edit-page">
        <CreateChapterModal
          open={true}
          onCancel={() => navigate(`/novels/${novelId}?settings=true`)}
          onSuccess={(newChapterId) => {
            navigate(`/novels/${novelId}/chapters/${newChapterId}`);
          }}
        />
      </div>
    );
  }

  if (isLoading && !currentChapter) {
    return (
      <div className="chapter-edit-page loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!currentChapter && !isLoading) {
    return (
      <div className="chapter-edit-page">
        <Empty description="章节不存在或已被删除" className="empty-container">
          <Button type="primary" onClick={() => navigate(`/novels/${novelId}?settings=true`)}>
            返回作品详情
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <Layout className={`chapter-edit-page ${isFocusMode ? 'focus-mode' : ''}`}>
      {!isFocusMode && (
        <Sider width={280} className="chapter-sider" theme={isDark ? 'dark' : 'light'}>
          <ChapterSidebar
            novelId={novelId!}
            currentChapterId={chapterId}
            onChapterSelect={handleChapterSelect}
            onCreateChapter={() => setIsCreateModalOpen(true)}
          />
        </Sider>
      )}

      <Content className={`chapter-content-area ${isFocusMode ? 'focus-mode' : ''}`}>
        <div className={`editor-header ${isFocusMode ? 'focus-mode' : ''}`}>
          <div className="header-left">
            <Space>
              {!isFocusMode && (
                <Tooltip title="返回作品">
                  <Button icon={<ArrowLeftOutlined />} onClick={handleBackToNovel}>
                    返回
                  </Button>
                </Tooltip>
              )}
              <div className="novel-info">
                <BookOutlined className="novel-icon" />
                <span className="novel-title">{currentNovel?.title}</span>
              </div>
            </Space>
          </div>

          <div className="header-center">
            <Input
              className="chapter-title-input"
              value={title}
              onChange={handleTitleChange}
              placeholder="章节标题"
              variant="borderless"
              size="large"
            />
          </div>

          <div className="header-right">
            <Space>
              <Tooltip title={isFocusMode ? '退出专注模式 (ESC)' : '进入专注模式'}>
                <Button
                  icon={isFocusMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={toggleFocusMode}
                  type={isFocusMode ? 'primary' : 'default'}
                >
                  {isFocusMode ? '退出专注' : '专注模式'}
                </Button>
              </Tooltip>

              {isFocusMode && (
                <Tooltip title={isDark ? '切换浅色主题' : '切换深色主题'}>
                  <Button icon={isDark ? <SunOutlined /> : <MoonOutlined />} onClick={toggleTheme} />
                </Tooltip>
              )}

              <div className="word-count">
                <FileTextOutlined />
                <span>{formatWordCount(wordCount)}字</span>
              </div>

              {!isFocusMode && (
                <Tooltip title={`上次保存: ${formatSaveTime(lastSavedAt)}`}>
                  <Badge dot={hasUnsavedChanges} color={hasUnsavedChanges ? 'red' : 'green'}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={isSaving}
                      onClick={handleManualSave}
                    >
                      保存
                    </Button>
                  </Badge>
                </Tooltip>
              )}

              {isFocusMode && (
                <Tooltip title={`上次保存: ${formatSaveTime(lastSavedAt)}`}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    onClick={handleManualSave}
                  >
                    保存
                  </Button>
                </Tooltip>
              )}
            </Space>
          </div>
        </div>

        {!isFocusMode && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-secondary)' }}>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'content' | 'outline')}
              options={[
                { label: '章节内容', value: 'content' },
                { label: '大纲视图', value: 'outline' },
              ]}
            />
          </div>
        )}

        {viewMode === 'content' ? (
          <div className={`editor-body ${isFocusMode ? 'focus-mode' : ''}`}>
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              onWordCountChange={handleWordCountChange}
              placeholder="开始创作..."
              focusMode={isFocusMode}
              novelTitle={currentNovel?.title}
              chapterTitle={title}
              chapterOutline={currentChapter?.outline}
              showLineHighlight={true}
            />
          </div>
        ) : (
          <div className="editor-body" style={{ overflow: 'auto', padding: 24 }}>
            <Typography.Title level={5}>总纲</Typography.Title>
            <Dropdown menu={getOutlineContextMenu('novel')} trigger={['contextMenu']}>
              <Card size="small" style={{ marginBottom: 16, cursor: 'context-menu' }}>
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {currentNovel?.outline || '暂无总纲'}
                </Typography.Paragraph>
              </Card>
            </Dropdown>

            {(() => {
              const currentVolume = volumeList.find(v => v.id === currentChapter?.volumeId);
              return (
                <>
                  <Typography.Title level={5}>
                    卷纲{currentVolume ? ` — ${currentVolume.title}` : ''}
                  </Typography.Title>
                  <Dropdown menu={getOutlineContextMenu('volume')} trigger={['contextMenu']}>
                    <Card size="small" style={{ marginBottom: 16, cursor: 'context-menu' }}>
                      <Input.TextArea
                        placeholder="输入卷纲..."
                        defaultValue={currentVolume?.outline || ''}
                        rows={3}
                        onBlur={(e) => {
                          if (currentVolume && e.target.value !== currentVolume.outline) {
                            updateVolume(currentVolume.id, { outline: e.target.value });
                          }
                        }}
                      />
                    </Card>
                  </Dropdown>
                </>
              );
            })()}

            <Typography.Title level={5}>章纲</Typography.Title>
            <Dropdown menu={getOutlineContextMenu('chapter')} trigger={['contextMenu']}>
              <Card size="small" style={{ cursor: 'context-menu' }}>
                <Input.TextArea
                  placeholder="输入章纲..."
                  defaultValue={currentChapter?.outline || ''}
                  rows={4}
                  onBlur={(e) => {
                    if (currentChapter && chapterId && e.target.value !== currentChapter.outline) {
                      updateChapter(chapterId, { outline: e.target.value });
                    }
                  }}
                />
              </Card>
            </Dropdown>
          </div>
        )}

        {!isFocusMode && (
          <div className="editor-footer">
            <Space split={<span className="divider">|</span>}>
              <span className="footer-item">
                <ClockCircleOutlined />
                上次保存: {formatSaveTime(lastSavedAt)}
              </span>
              <span className="footer-item">
                第{chapterList.findIndex(c => c.id === chapterId) + 1}章
              </span>
              <span className="footer-item">
                共{formatWordCount(wordCount)}字
              </span>
              {hasUnsavedChanges && (
                <span className="footer-item unsaved">有未保存的更改</span>
              )}
            </Space>
          </div>
        )}

        {isFocusMode && (
          <div className="focus-mode-footer">
            <span className="focus-mode-info">
              {formatWordCount(wordCount)}字 · 按 ESC 退出专注模式
            </span>
          </div>
        )}
      </Content>

      <CreateChapterModal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onSuccess={(newChapterId) => {
          setIsCreateModalOpen(false);
          navigate(`/novels/${novelId}/chapters/${newChapterId}`);
        }}
      />

      <AIOutlineGenerateDialog
        open={outlineDialogOpen}
        outlineType={outlineDialogType}
        novelTitle={currentNovel?.title}
        novelId={novelId || ''}
        volumeList={volumeList}
        chapterList={chapterList}
        referenceInfo={getOutlineReferenceInfo()}
        onClose={() => setOutlineDialogOpen(false)}
        onSave={handleOutlineSave}
      />
    </Layout>
  );
};

export default ChapterEditPage;
