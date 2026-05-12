/**
 * 作品详情/编辑页面
 * 展示作品信息，编辑作品元数据，设置封面，删除作品
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Upload,
  message,
  Row,
  Col,
  Space,
  Tag,
  Statistic,
  Divider,
  Popconfirm,
  Typography,
  Spin,
  Empty,
  Collapse,
  Dropdown,
} from 'antd';
import {
  SaveOutlined,
  UploadOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  FileTextOutlined,
  EditOutlined,
  PlusOutlined,
  ExportOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import { useNovelStore } from '../../store';
import type { Novel, NovelStatus } from '../../../types/novel';
import ExportDialog from '../../components/ExportDialog';
import AIOutlineGenerateDialog from '../../components/AIOutlineGenerateDialog';
import './styles.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const NovelEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  const {
    currentNovel,
    chapterList,
    volumeList,
    isLoading,
    loadNovel,
    updateNovel,
    deleteNovel,
    updateVolume,
    updateChapter,
    ensureFirstChapter,
  } = useNovelStore();

  // 本地状态
  const [saving, setSaving] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [outlineDialogType, setOutlineDialogType] = useState<'novel' | 'volume' | 'chapter'>('novel');

  // 加载作品数据
  useEffect(() => {
    if (id) {
      loadNovel(id);
    }
  }, [id, loadNovel]);

  // 设置表单值
  useEffect(() => {
    if (currentNovel) {
      form.setFieldsValue({
        title: currentNovel.title,
        author: currentNovel.author,
        description: currentNovel.description,
        status: currentNovel.status,
        genre: currentNovel.genre,
        tags: currentNovel.tags,
      });
      setCoverUrl(currentNovel.cover || '');
      if (currentNovel.cover) {
        setFileList([
          {
            uid: '-1',
            name: 'cover.png',
            status: 'done',
            url: currentNovel.cover,
          },
        ]);
      }
    }
  }, [currentNovel, form]);

  // 自动跳转：章节编辑器 / 自动创建第一章
  const shouldRedirect = !isLoading && currentNovel && id && searchParams.get('settings') !== 'true';

  useEffect(() => {
    if (!shouldRedirect) return;

    (async () => {
      const targetId = currentNovel.lastChapterId || chapterList[0]?.id || await ensureFirstChapter();
      if (targetId) {
        navigate(`/novels/${id}/chapters/${targetId}`, { replace: true });
      }
    })();
  }, [shouldRedirect]); // eslint-disable-line react-hooks/exhaustive-deps

  // 检查是否需要自动打开导出对话框
  useEffect(() => {
    if (searchParams.get('export') === 'true' && currentNovel) {
      setIsExportDialogOpen(true);
    }
  }, [searchParams, currentNovel]);

  // 监听表单变化
  const handleValuesChange = () => {
    setHasChanges(true);
  };

  // 保存作品信息
  const handleSave = async () => {
    if (!id || !currentNovel) return;

    try {
      const values = await form.validateFields();
      setSaving(true);

      const updates: Partial<Novel> = {
        ...values,
        cover: coverUrl,
      };

      const result = await updateNovel(id, updates);
      if (result) {
        message.success('作品信息保存成功');
        setHasChanges(false);
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 处理封面上传
  const handleCoverChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList.slice(-1)); // 只保留最后一个文件

    if (info.file.status === 'done') {
      // 实际项目中这里应该上传文件到服务器并获取URL
      // 这里模拟使用本地URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setCoverUrl(url);
        setHasChanges(true);
        message.success('封面上传成功');
      };
      if (info.file.originFileObj) {
        reader.readAsDataURL(info.file.originFileObj);
      }
    } else if (info.file.status === 'removed') {
      setCoverUrl('');
      setHasChanges(true);
    }
  };

  // 删除封面
  const handleRemoveCover = () => {
    setCoverUrl('');
    setFileList([]);
    setHasChanges(true);
  };

  // 删除作品
  const handleDelete = async () => {
    if (!id) return;

    const success = await deleteNovel(id);
    if (success) {
      message.success('作品删除成功');
      navigate('/novels');
    } else {
      message.error('删除作品失败');
    }
  };

  // 格式化字数
  const formatWordCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toString();
  };

  // AI 大纲生成保存回调
  const handleOutlineSave = async (outline: string, type: 'novel' | 'volume' | 'chapter', targetId?: string) => {
    if (!id) return;
    if (type === 'novel') {
      await updateNovel(id, { outline });
    } else if (type === 'volume' && targetId) {
      await updateVolume(targetId, { outline });
    } else if (type === 'chapter' && targetId) {
      await updateChapter(targetId, { outline });
    }
    // Refresh data to update UI
    await loadNovel(id);
    message.success(`${type === 'novel' ? '总纲' : type === 'volume' ? '卷纲' : '章纲'}已保存`);
  };

  // 获取上级大纲参考信息
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

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  };

  // 状态标签映射
  const statusMap: Record<NovelStatus, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    writing: { text: '连载中', color: 'processing' },
    completed: { text: '已完成', color: 'success' },
    archived: { text: '已归档', color: 'warning' },
  };

  // 如果正在加载 或 即将跳转到章节编辑器
  if ((isLoading && !currentNovel) || shouldRedirect) {
    return (
      <div className="novel-edit-page loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 如果作品不存在
  if (!currentNovel && !isLoading) {
    return (
      <div className="novel-edit-page">
        <Empty
          description="作品不存在或已被删除"
          className="empty-container"
        >
          <Button type="primary" onClick={() => navigate('/novels')}>
            返回作品列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="novel-edit-page">
      {/* 页面头部 */}
      <div className="page-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/novels')}
          >
            返回
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            编辑作品
          </Title>
        </Space>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={() => setIsExportDialogOpen(true)}
          >
            导出
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={!hasChanges}
            onClick={handleSave}
          >
            保存修改
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个作品吗？此操作不可恢复。"
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除作品
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：作品信息表单 */}
        <Col xs={24} lg={16}>
          <Card title="基本信息" className="info-card">
            <Form
              form={form}
              layout="vertical"
              autoComplete="off"
              onValuesChange={handleValuesChange}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="title"
                    label="作品名称"
                    rules={[
                      { required: true, message: '请输入作品名称' },
                      { max: 100, message: '作品名称不能超过100个字符' },
                    ]}
                  >
                    <Input
                      prefix={<BookOutlined />}
                      placeholder="请输入作品名称"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="author"
                    label="作者"
                    rules={[{ max: 50, message: '作者名称不能超过50个字符' }]}
                  >
                    <Input
                      prefix={<EditOutlined />}
                      placeholder="请输入作者名称"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="作品状态"
                    rules={[{ required: true, message: '请选择作品状态' }]}
                  >
                    <Select placeholder="选择作品状态">
                      <Option value="draft">草稿</Option>
                      <Option value="writing">连载中</Option>
                      <Option value="completed">已完成</Option>
                      <Option value="archived">已归档</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="genre"
                    label="作品分类"
                  >
                    <Select
                      placeholder="选择作品分类"
                      allowClear
                    >
                      <Option value="fantasy">玄幻奇幻</Option>
                      <Option value="wuxia">武侠仙侠</Option>
                      <Option value="urban">都市言情</Option>
                      <Option value="scifi">科幻未来</Option>
                      <Option value="history">历史军事</Option>
                      <Option value="suspense">悬疑推理</Option>
                      <Option value="game">游戏竞技</Option>
                      <Option value="other">其他</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="tags"
                    label="标签"
                    tooltip="输入标签后按回车添加"
                  >
                    <Select
                      mode="tags"
                      placeholder="添加标签"
                      allowClear
                      tokenSeparators={[',', '，']}
                    >
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="description"
                    label="作品简介"
                    rules={[{ max: 2000, message: '简介不能超过2000个字符' }]}
                  >
                    <TextArea
                      placeholder="请输入作品简介"
                      rows={6}
                      showCount
                      maxLength={2000}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* 大纲管理 */}
          <Card
            title="大纲管理"
            className="outline-card"
            extra={
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'novel',
                      icon: <RobotOutlined />,
                      label: '生成总纲',
                      onClick: () => {
                        setOutlineDialogType('novel');
                        setOutlineDialogOpen(true);
                      },
                    },
                    {
                      key: 'volume',
                      icon: <RobotOutlined />,
                      label: '生成卷纲',
                      onClick: () => {
                        setOutlineDialogType('volume');
                        setOutlineDialogOpen(true);
                      },
                    },
                    {
                      key: 'chapter',
                      icon: <RobotOutlined />,
                      label: '生成章纲',
                      onClick: () => {
                        setOutlineDialogType('chapter');
                        setOutlineDialogOpen(true);
                      },
                    },
                  ],
                }}
              >
                <Button icon={<RobotOutlined />}>AI 生成大纲</Button>
              </Dropdown>
            }
          >
            <Collapse
              items={[
                {
                  key: 'novel',
                  label: '总纲',
                  children: (
                    <TextArea
                      placeholder="输入作品总纲..."
                      defaultValue={currentNovel?.outline || ''}
                      rows={5}
                      onBlur={(e) => {
                        if (id && currentNovel && e.target.value !== currentNovel.outline) {
                          updateNovel(id, { outline: e.target.value });
                        }
                      }}
                    />
                  ),
                },
                ...(volumeList.length > 0 ? [{
                  key: 'volumes',
                  label: `卷纲（${volumeList.length} 卷）`,
                  children: (
                    <Collapse
                      size="small"
                      items={volumeList.map((vol) => ({
                        key: vol.id,
                        label: vol.title,
                        children: (
                          <TextArea
                            placeholder={`输入${vol.title}大纲...`}
                            defaultValue={vol.outline || ''}
                            rows={3}
                            onBlur={(e) => {
                              if (e.target.value !== vol.outline) {
                                updateVolume(vol.id, { outline: e.target.value });
                              }
                            }}
                          />
                        ),
                      }))}
                    />
                  ),
                }] : []),
                ...(chapterList.length > 0 ? [{
                  key: 'chapters',
                  label: `章纲（${chapterList.length} 章）`,
                  children: (
                    <Collapse
                      size="small"
                      items={chapterList.map((ch) => ({
                        key: ch.id,
                        label: ch.title,
                        children: (
                          <TextArea
                            placeholder={`输入${ch.title}大纲...`}
                            defaultValue={ch.outline || ''}
                            rows={3}
                            onBlur={(e) => {
                              if (e.target.value !== ch.outline) {
                                updateChapter(ch.id, { outline: e.target.value });
                              }
                            }}
                          />
                        ),
                      }))}
                    />
                  ),
                }] : []),
              ]}
            />
          </Card>

          {/* 章节管理 */}
          <Card
            title="章节管理"
            className="chapters-card"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/novels/${id}/chapters/new`)}
              >
                新建章节
              </Button>
            }
          >
            {chapterList.length === 0 ? (
              <Empty description="还没有章节" className="chapters-empty">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`/novels/${id}/chapters/new`)}
                >
                  创建第一章
                </Button>
              </Empty>
            ) : (
              <div className="chapter-list">
                {chapterList.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="chapter-item"
                    onClick={() => navigate(`/novels/${id}/chapters/${chapter.id}`)}
                  >
                    <div className="chapter-info">
                      <span className="chapter-order">第{index + 1}章</span>
                      <span className="chapter-title">{chapter.title}</span>
                      <Tag color={chapter.status === 'completed' ? 'success' : 'processing'}>
                        {chapter.status === 'completed' ? '已完成' : '编辑中'}
                      </Tag>
                    </div>
                    <div className="chapter-meta">
                      <Text type="secondary">{formatWordCount(chapter.wordCount)}字</Text>
                      <Text type="secondary">{formatDate(chapter.updatedAt)}</Text>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：封面和统计 */}
        <Col xs={24} lg={8}>
          {/* 封面设置 */}
          <Card title="作品封面" className="cover-card">
            <div className="cover-upload-container">
              {coverUrl ? (
                <div className="cover-preview">
                  <img src={coverUrl} alt="作品封面" />
                  <div className="cover-actions">
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      fileList={fileList}
                      onChange={handleCoverChange}
                      customRequest={({ onSuccess }) => {
                        setTimeout(() => {
                          onSuccess?.('ok');
                        }, 0);
                      }}
                    >
                      <Button icon={<UploadOutlined />}>更换封面</Button>
                    </Upload>
                    <Button danger onClick={handleRemoveCover}>
                      删除封面
                    </Button>
                  </div>
                </div>
              ) : (
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleCoverChange}
                  customRequest={({ onSuccess }) => {
                    setTimeout(() => {
                      onSuccess?.('ok');
                    }, 0);
                  }}
                  className="cover-uploader"
                >
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>上传封面</div>
                  </div>
                </Upload>
              )}
            </div>
            <Text type="secondary" className="cover-hint">
              建议尺寸：600x800 像素，支持 JPG、PNG 格式
            </Text>
          </Card>

          {/* 作品统计 */}
          <Card title="作品统计" className="stats-card">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="总字数"
                  value={formatWordCount(currentNovel?.wordCount || 0)}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="章节数"
                  value={currentNovel?.chapterCount || 0}
                  prefix={<BookOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="创建时间"
                  value={formatDate(currentNovel?.createdAt || '')}
                  styles={{ content: { fontSize: 14 } }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最后更新"
                  value={formatDate(currentNovel?.updatedAt || '')}
                  styles={{ content: { fontSize: 14 } }}
                />
              </Col>
            </Row>
          </Card>

          {/* 作品状态卡片 */}
          <Card className="status-card">
            <div className="status-display">
              <Text type="secondary">当前状态</Text>
              <Tag
                color={statusMap[currentNovel?.status || 'draft'].color}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {statusMap[currentNovel?.status || 'draft'].text}
              </Tag>
            </div>
            <Divider style={{ margin: '16px 0' }} />
            <div className="novel-id">
              <Text type="secondary">作品ID: {currentNovel?.id}</Text>
            </div>
          </Card>

          {/* 快捷操作 */}
          <Card title="快捷操作" className="actions-card">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                block
                onClick={() => setIsExportDialogOpen(true)}
              >
                导出作品
              </Button>
              <Button
                icon={<PlusOutlined />}
                block
                onClick={() => navigate(`/novels/${id}/chapters/new`)}
              >
                新建章节
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 导出对话框 */}
      <ExportDialog
        open={isExportDialogOpen}
        novel={currentNovel}
        chapters={chapterList}
        onClose={() => setIsExportDialogOpen(false)}
      />

      {/* AI 大纲生成对话框 */}
      <AIOutlineGenerateDialog
        open={outlineDialogOpen}
        outlineType={outlineDialogType}
        novelTitle={currentNovel?.title}
        novelId={id || ''}
        volumeList={volumeList}
        chapterList={chapterList}
        referenceInfo={getOutlineReferenceInfo()}
        onClose={() => setOutlineDialogOpen(false)}
        onSave={handleOutlineSave}
      />
    </div>
  );
};

export default NovelEditPage;
