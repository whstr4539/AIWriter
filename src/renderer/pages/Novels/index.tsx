/**
 * 作品列表页面
 * 展示所有作品，支持网格/列表视图、搜索筛选
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Space,
  Empty,
  Tag,
  Tooltip,
  Dropdown,
  Modal,
  message,
  Typography,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ImportOutlined,
  ExportOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNovelStore } from '../../store';
import type { Novel, NovelStatus } from '../../../types/novel';
import { CreateNovelModal } from './components/CreateNovelModal';
import ImportDialog from '../../components/ImportDialog';
import './styles.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 视图类型
type ViewType = 'grid' | 'list';

// 状态标签映射
const statusMap: Record<NovelStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  writing: { text: '连载中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  archived: { text: '已归档', color: 'warning' },
};

const NovelsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    novelList,
    isLoading,
    loadNovelList,
    deleteNovel,
  } = useNovelStore();

  // 本地状态
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<NovelStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [novelToDelete, setNovelToDelete] = useState<Novel | null>(null);

  // 加载作品列表
  useEffect(() => {
    loadNovelList();
  }, [loadNovelList]);

  // 筛选作品
  const filteredNovels = novelList.filter((novel) => {
    const matchKeyword =
      !searchKeyword ||
      novel.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      novel.author.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      novel.tags.some((tag) => tag.toLowerCase().includes(searchKeyword.toLowerCase()));

    const matchStatus = statusFilter === 'all' || novel.status === statusFilter;

    return matchKeyword && matchStatus;
  });

  // 处理删除作品
  const handleDelete = async () => {
    if (!novelToDelete) return;

    const success = await deleteNovel(novelToDelete.id);
    if (success) {
      message.success('作品删除成功');
      setDeleteModalVisible(false);
      setNovelToDelete(null);
    } else {
      message.error('删除作品失败');
    }
  };

  // 处理导入成功
  const handleImportSuccess = () => {
    loadNovelList();
  };

  // 格式化字数
  const formatWordCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toString();
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  // 获取操作菜单
  const getActionMenu = (novel: Novel) => [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '作品设置',
      onClick: () => {
        navigate(`/novels/${novel.id}?settings=true`);
      },
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: '导出作品',
      onClick: () => {
        navigate(`/novels/${novel.id}?export=true`);
      },
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除作品',
      danger: true,
      onClick: () => {
        setNovelToDelete(novel);
        setDeleteModalVisible(true);
      },
    },
  ];

  // 渲染网格视图
  const renderGridView = () => (
    <Row gutter={[16, 16]}>
      {filteredNovels.map((novel) => (
        <Col xs={24} sm={12} md={8} lg={6} key={novel.id}>
          <Card
            hoverable
            className="novel-card"
            cover={
              <div
                className="novel-cover"
                onClick={() => navigate(`/novels/${novel.id}?settings=true`)}
              >
                {novel.cover ? (
                  <img src={novel.cover} alt={novel.title} />
                ) : (
                  <div className="novel-cover-placeholder">
                    <BookOutlined />
                    <span>{novel.title}</span>
                  </div>
                )}
                <div className="novel-cover-overlay">
                  <Button type="primary">查看详情</Button>
                </div>
              </div>
            }
            actions={[
              <Tooltip title="编辑" key="edit">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/novels/${novel.id}`);
                  }}
                >
                  <EditOutlined />
                </span>
              </Tooltip>,
              <Tooltip title="导出" key="export">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/novels/${novel.id}?export=true`);
                  }}
                >
                  <ExportOutlined />
                </span>
              </Tooltip>,
              <Dropdown
                key="more"
                menu={{ items: getActionMenu(novel) }}
                placement="bottomRight"
              >
                <span onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="更多">
                    <MoreOutlined />
                  </Tooltip>
                </span>
              </Dropdown>,
            ]}
          >
            <div onClick={() => navigate(`/novels/${novel.id}`)}>
              <div className="novel-card-header">
                <Title level={5} ellipsis={{ rows: 1 }}>
                  {novel.title}
                </Title>
                <Tag color={statusMap[novel.status].color}>
                  {statusMap[novel.status].text}
                </Tag>
              </div>
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 2 }}
                className="novel-description"
              >
                {novel.description || '暂无简介'}
              </Paragraph>
              <div className="novel-meta">
                <Space size={16}>
                  <span>
                    <Tooltip title="作者">
                      <BookOutlined /> {novel.author || '佚名'}
                    </Tooltip>
                  </span>
                  <span>
                    <Tooltip title="章节数">
                      <FileTextOutlined /> {novel.chapterCount}章
                    </Tooltip>
                  </span>
                </Space>
              </div>
              <div className="novel-footer">
                <Space>
                  <Badge
                    count={`${formatWordCount(novel.wordCount)}字`}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <Text type="secondary" className="update-time">
                    <ClockCircleOutlined /> {formatDate(novel.updatedAt)}
                  </Text>
                </Space>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // 渲染列表视图
  const renderListView = () => (
    <div className="novel-list">
      {filteredNovels.map((novel) => (
        <Card
          key={novel.id}
          className="novel-list-item"
          onClick={() => navigate(`/novels/${novel.id}`)}
        >
          <Row align="middle" gutter={16}>
            <Col xs={4} sm={3} md={2}>
              <div className="novel-list-cover">
                {novel.cover ? (
                  <img src={novel.cover} alt={novel.title} />
                ) : (
                  <div className="novel-list-cover-placeholder">
                    <BookOutlined />
                  </div>
                )}
              </div>
            </Col>
            <Col xs={14} sm={16} md={18}>
              <div className="novel-list-content">
                <div className="novel-list-header">
                  <Title level={5} style={{ margin: 0 }}>
                    {novel.title}
                  </Title>
                  <Tag color={statusMap[novel.status].color}>
                    {statusMap[novel.status].text}
                  </Tag>
                </div>
                <Paragraph
                  type="secondary"
                  ellipsis={{ rows: 1 }}
                  style={{ margin: '8px 0' }}
                >
                  {novel.description || '暂无简介'}
                </Paragraph>
                <Space size={24}>
                  <Text type="secondary">
                    <BookOutlined /> {novel.author || '佚名'}
                  </Text>
                  <Text type="secondary">
                    <FileTextOutlined /> {novel.chapterCount}章
                  </Text>
                  <Text type="secondary">
                    {formatWordCount(novel.wordCount)}字
                  </Text>
                  <Text type="secondary">
                    <ClockCircleOutlined /> {formatDate(novel.updatedAt)}
                  </Text>
                </Space>
              </div>
            </Col>
            <Col xs={6} sm={5} md={4} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/novels/${novel.id}`);
                  }}
                >
                  编辑
                </Button>
                <Dropdown
                  menu={{ items: getActionMenu(novel) }}
                  placement="bottomRight"
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    <Button icon={<MoreOutlined />} />
                  </span>
                </Dropdown>
              </Space>
            </Col>
          </Row>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="novels-page">
      {/* 页面头部 */}
      <div className="page-header">
        <Title level={2}>我的作品</Title>
        <Space>
          <Button
            icon={<ImportOutlined />}
            size="large"
            onClick={() => setIsImportDialogOpen(true)}
          >
            导入作品
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setIsCreateModalOpen(true)}
          >
            新建作品
          </Button>
        </Space>
      </div>

      {/* 筛选栏 */}
      <Card className="filter-bar" size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜索作品名称、作者或标签"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="作品状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部状态</Option>
              <Option value="draft">草稿</Option>
              <Option value="writing">连载中</Option>
              <Option value="completed">已完成</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={12} style={{ textAlign: 'right' }}>
            <Space>
              <Text type="secondary">共 {filteredNovels.length} 部作品</Text>
              <Space.Compact>
                <Button
                  type={viewType === 'grid' ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewType('grid')}
                />
                <Button
                  type={viewType === 'list' ? 'primary' : 'default'}
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewType('list')}
                />
              </Space.Compact>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 作品列表 */}
      <div className="novels-content">
        {isLoading ? (
          <div className="loading-container">
            <Card loading style={{ width: '100%' }} />
            <Card loading style={{ width: '100%' }} />
            <Card loading style={{ width: '100%' }} />
          </div>
        ) : filteredNovels.length === 0 ? (
          <Empty
            description={
              novelList.length === 0
                ? '还没有作品，点击右上角创建新作品'
                : '没有找到符合条件的作品'
            }
            className="empty-container"
          >
            {novelList.length === 0 && (
              <Space orientation="vertical" size="middle">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  创建作品
                </Button>
                <Button
                  icon={<ImportOutlined />}
                  onClick={() => setIsImportDialogOpen(true)}
                >
                  导入作品
                </Button>
              </Space>
            )}
          </Empty>
        ) : viewType === 'grid' ? (
          renderGridView()
        ) : (
          renderListView()
        )}
      </div>

      {/* 创建作品对话框 */}
      <CreateNovelModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* 导入作品对话框 */}
      <ImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setNovelToDelete(null);
        }}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除作品 <strong>{novelToDelete?.title}</strong> 吗？
        </p>
        <p style={{ color: '#ff4d4f' }}>
          此操作不可恢复，作品及其所有章节内容将被永久删除。
        </p>
      </Modal>
    </div>
  );
};

export default NovelsPage;
