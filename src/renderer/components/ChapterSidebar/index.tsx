import React, { useState, useCallback } from 'react';
import {
  Button,
  Input,
  Dropdown,
  Modal,
  message,
  Tooltip,
  Empty,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  FileTextOutlined,
  FolderOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNovelStore } from '../../store';
import type { ChapterInfo } from '../../../types/novel';
import './styles.css';

interface ChapterSidebarProps {
  novelId: string;
  currentChapterId?: string;
  onChapterSelect: (chapterId: string) => void;
  onCreateChapter: () => void;
  className?: string;
}

// Sortable chapter item
interface SortableChapterItemProps {
  chapter: ChapterInfo;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (chapterId: string) => void;
  onEditStart: (chapter: ChapterInfo) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onEditChange: (value: string) => void;
  onDelete: (chapterId: string) => void;
}

const SortableChapterItem: React.FC<SortableChapterItemProps> = ({
  chapter,
  index,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onEditStart,
  onEditConfirm,
  onEditCancel,
  onEditChange,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: (e) => {
        e?.domEvent?.stopPropagation();
        onEditStart(chapter);
      },
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: (e) => {
        e?.domEvent?.stopPropagation();
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除章节"${chapter.title}"吗？此操作不可恢复。`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => onDelete(chapter.id),
        });
      },
    },
  ];

  const handleClick = () => {
    if (!isEditing) onSelect(chapter.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onEditConfirm();
    else if (e.key === 'Escape') onEditCancel();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chapter-sidebar-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
    >
      <div className="chapter-drag-handle" {...attributes} {...listeners}>
        <DragOutlined />
      </div>
      <div className="chapter-content">
        {isEditing ? (
          <Input
            size="small"
            value={editingTitle}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onEditConfirm}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="chapter-title-input"
          />
        ) : (
          <>
            <div className="chapter-title-row">
              <span className="chapter-order">第{index + 1}章</span>
              <Tooltip title={chapter.title} placement="topLeft">
                <span className="chapter-title">{chapter.title}</span>
              </Tooltip>
            </div>
            <div className="chapter-meta">
              <FileTextOutlined />
              <span>{chapter.wordCount}字</span>
            </div>
          </>
        )}
      </div>
      {!isEditing && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            className="chapter-actions-btn"
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      )}
    </div>
  );
};

const ChapterSidebar: React.FC<ChapterSidebarProps> = ({
  novelId,
  currentChapterId,
  onChapterSelect,
  onCreateChapter,
  className = '',
}) => {
  const {
    chapterList,
    volumeList,
    updateChapterTitle,
    deleteChapter,
    updateChapter,
    loadChapterList,
    createVolume,
    deleteVolume,
  } = useNovelStore();

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isAddingVolume, setIsAddingVolume] = useState(false);
  const [newVolumeTitle, setNewVolumeTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleEditStart = useCallback((chapter: ChapterInfo) => {
    setEditingChapterId(chapter.id);
    setEditingTitle(chapter.title);
  }, []);

  const handleEditConfirm = useCallback(async () => {
    if (!editingChapterId || !editingTitle.trim()) {
      setEditingChapterId(null);
      return;
    }
    const success = await updateChapterTitle(editingChapterId, editingTitle.trim());
    if (success) message.success('章节重命名成功');
    else message.error('重命名失败');
    setEditingChapterId(null);
  }, [editingChapterId, editingTitle, updateChapterTitle]);

  const handleEditCancel = useCallback(() => {
    setEditingChapterId(null);
    setEditingTitle('');
  }, []);

  const handleDelete = useCallback(async (chapterId: string) => {
    // 找到被删章节的索引
    const deletedIndex = chapterList.findIndex(c => c.id === chapterId);
    const success = await deleteChapter(chapterId);
    if (success) {
      message.success('章节删除成功');
      // 如果删除的是当前章节，跳转到相邻章节
      if (chapterId === currentChapterId) {
        const remaining = chapterList.filter(c => c.id !== chapterId);
        if (remaining.length > 0) {
          // 优先跳转到下一个章节，否则上一个
          const nextChapter = remaining[Math.min(deletedIndex, remaining.length - 1)];
          onChapterSelect(nextChapter.id);
        } else {
          // 没有剩余章节了，停留在作品详情页
          onChapterSelect('');
        }
      }
    } else {
      message.error('删除失败');
    }
  }, [deleteChapter, chapterList, currentChapterId, onChapterSelect]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapterList.findIndex((c) => c.id === active.id);
    const newIndex = chapterList.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(chapterList, oldIndex, newIndex);
    for (let i = 0; i < newOrder.length; i++) {
      const chapter = newOrder[i];
      if (chapter.order !== i + 1) {
        await updateChapter(chapter.id, { order: i + 1 });
      }
    }
    await loadChapterList(novelId);
    message.success('章节顺序已更新');
  }, [chapterList, novelId, updateChapter, loadChapterList]);

  const handleCreateVolume = useCallback(async () => {
    if (!newVolumeTitle.trim()) {
      setIsAddingVolume(false);
      return;
    }
    const result = await createVolume(newVolumeTitle.trim());
    if (result) message.success('创建卷成功');
    else message.error('创建卷失败');
    setNewVolumeTitle('');
    setIsAddingVolume(false);
  }, [newVolumeTitle, createVolume]);

  const handleDeleteVolume = useCallback(async (volumeId: string, volumeTitle: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除卷"${volumeTitle}"吗？卷内的章节不会被删除。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const success = await deleteVolume(volumeId);
        if (success) message.success('卷删除成功');
        else message.error('删除失败');
      },
    });
  }, [deleteVolume]);

  const formatWordCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    return count.toString();
  };

  // Group chapters by volumeId (unassigned chapters go to null)
  const groupedChapters = React.useMemo(() => {
    const map = new Map<string | null, ChapterInfo[]>();
    // Initialize with volume groups
    for (const vol of volumeList) {
      map.set(vol.id, []);
    }
    map.set(null, []);

    for (const ch of chapterList) {
      const key = ch.volumeId && map.has(ch.volumeId) ? ch.volumeId : null;
      map.get(key)!.push(ch);
    }
    return map;
  }, [chapterList, volumeList]);

  const allChapterIds = chapterList.map(c => c.id);

  return (
    <div className={`chapter-sidebar ${className}`}>
      <div className="chapter-sidebar-header">
        <h3 className="chapter-sidebar-title">目录</h3>
        <span className="chapter-count">{volumeList.length > 0 ? `${volumeList.length}卷 · ` : ''}共{chapterList.length}章</span>
      </div>

      <div className="chapter-sidebar-actions">
        <Button type="primary" icon={<PlusOutlined />} block onClick={onCreateChapter}>
          新建章节
        </Button>
        <Button
          icon={<FolderOutlined />}
          block
          onClick={() => setIsAddingVolume(true)}
          style={{ marginTop: 4 }}
        >
          新建卷
        </Button>
      </div>

      {isAddingVolume && (
        <div className="volume-add-input" style={{ padding: '8px 12px' }}>
          <Input
            size="small"
            placeholder="输入卷名，回车确认"
            value={newVolumeTitle}
            onChange={(e) => setNewVolumeTitle(e.target.value)}
            onPressEnter={handleCreateVolume}
            onBlur={handleCreateVolume}
            autoFocus
          />
        </div>
      )}

      <div className="chapter-sidebar-content">
        {chapterList.length === 0 ? (
          <Empty
            description="还没有章节"
            className="chapter-empty"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={onCreateChapter}>创建第一章</Button>
          </Empty>
        ) : volumeList.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={allChapterIds} strategy={verticalListSortingStrategy}>
              <Collapse
                ghost
                expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                defaultActiveKey={volumeList.map(v => v.id)}
                className="volume-collapse"
              >
                {volumeList.map((volume) => {
                  const chapters = groupedChapters.get(volume.id) || [];
                  return (
                    <Collapse.Panel
                      key={volume.id}
                      header={
                        <div className="volume-header">
                          <FolderOutlined className="volume-icon" />
                          <span className="volume-title">{volume.title}</span>
                          <span className="volume-chapter-count">{chapters.length}章</span>
                        </div>
                      }
                      extra={
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'delete',
                                icon: <DeleteOutlined />,
                                label: '删除卷',
                                danger: true,
                                onClick: (e) => {
                                  e?.domEvent?.stopPropagation();
                                  handleDeleteVolume(volume.id, volume.title);
                                },
                              },
                            ],
                          }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      }
                    >
                      {chapters.length === 0 ? (
                        <div className="volume-empty">暂无章节</div>
                      ) : (
                        <div className="chapter-list">
                          {chapters.map((chapter) => (
                            <SortableChapterItem
                              key={chapter.id}
                              chapter={chapter}
                              index={chapter.order}
                              isSelected={chapter.id === currentChapterId}
                              isEditing={editingChapterId === chapter.id}
                              editingTitle={editingTitle}
                              onSelect={onChapterSelect}
                              onEditStart={handleEditStart}
                              onEditConfirm={handleEditConfirm}
                              onEditCancel={handleEditCancel}
                              onEditChange={setEditingTitle}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}
                    </Collapse.Panel>
                  );
                })}

                {/* Unassigned chapters */}
                {(groupedChapters.get(null)?.length || 0) > 0 && (
                  <Collapse.Panel
                    key="unassigned"
                    header={
                      <div className="volume-header">
                        <FolderOutlined className="volume-icon" />
                        <span className="volume-title">未分类</span>
                        <span className="volume-chapter-count">{groupedChapters.get(null)!.length}章</span>
                      </div>
                    }
                  >
                    <div className="chapter-list">
                      {groupedChapters.get(null)!.map((chapter) => (
                        <SortableChapterItem
                          key={chapter.id}
                          chapter={chapter}
                          index={chapter.order}
                          isSelected={chapter.id === currentChapterId}
                          isEditing={editingChapterId === chapter.id}
                          editingTitle={editingTitle}
                          onSelect={onChapterSelect}
                          onEditStart={handleEditStart}
                          onEditConfirm={handleEditConfirm}
                          onEditCancel={handleEditCancel}
                          onEditChange={setEditingTitle}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </Collapse.Panel>
                )}
              </Collapse>
            </SortableContext>
          </DndContext>
        ) : (
          // No volumes: flat chapter list
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={allChapterIds} strategy={verticalListSortingStrategy}>
              <div className="chapter-list">
                {chapterList.map((chapter, index) => (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    index={index}
                    isSelected={chapter.id === currentChapterId}
                    isEditing={editingChapterId === chapter.id}
                    editingTitle={editingTitle}
                    onSelect={onChapterSelect}
                    onEditStart={handleEditStart}
                    onEditConfirm={handleEditConfirm}
                    onEditCancel={handleEditCancel}
                    onEditChange={setEditingTitle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="chapter-sidebar-footer">
        <div className="total-stats">
          <span>总字数: {formatWordCount(chapterList.reduce((sum, c) => sum + c.wordCount, 0))}</span>
        </div>
      </div>
    </div>
  );
};

export default ChapterSidebar;
