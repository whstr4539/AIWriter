import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Space, Typography } from 'antd';
import {
  ClockCircleOutlined,
  EditOutlined,
  PlusOutlined,
  BookOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNovelStore } from '../../store';
import { useWritingStats } from '../../hooks';
import './styles.css';

const { Text } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { novelList, loadNovels } = useNovelStore();
  const { stats } = useWritingStats();

  // 加载数据
  useEffect(() => {
    loadNovels();
  }, [loadNovels]);

  // 计算总字数
  const totalWordCount = novelList.reduce((sum, novel) => sum + (novel.wordCount || 0), 0);

  // 格式化时间
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  // 格式化字数
  const formatWordCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toString();
  };

  return (
    <div className="home-page">
      {/* 欢迎区域 */}
      <div className="welcome-section">
        <h1>欢迎回来！</h1>
        <p>开始您的创作之旅，让灵感自由流淌。</p>
      </div>

      {/* 今日创作统计 - 大卡片 */}
      <Row gutter={[24, 24]} className="today-stats-row">
        <Col xs={24} lg={12}>
          <Card className="today-stat-card writing-time-card">
            <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <ClockCircleOutlined />
            </div>
            <div className="stat-content">
              <Text type="secondary" className="stat-label">今日创作时长</Text>
              <div className="stat-value-wrapper">
                <span className="stat-value">{formatTime(stats.writingTime)}</span>
              </div>
              <Text type="secondary" className="stat-hint">保持专注，持续创作</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="today-stat-card word-count-card">
            <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <EditOutlined />
            </div>
            <div className="stat-content">
              <Text type="secondary" className="stat-label">今日创作字数</Text>
              <div className="stat-value-wrapper">
                <span className="stat-value">{formatWordCount(stats.wordCount)}</span>
                <span className="stat-unit">字</span>
              </div>
              <Text type="secondary" className="stat-hint">每一字都是进步的见证</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 快捷操作和作品列表 */}
      <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
        {/* 快捷操作 */}
        <Col xs={24} lg={8}>
          <Card title="快捷操作" className="action-card">
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                block
                onClick={() => navigate('/novels')}
              >
                新建作品
              </Button>
              <Button
                icon={<BookOutlined />}
                size="large"
                block
                onClick={() => navigate('/novels')}
              >
                查看全部作品
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 作品统计 */}
        <Col xs={24} lg={16}>
          <Card
            title="作品概况"
            extra={
              <Button
                type="link"
                onClick={() => navigate('/novels')}
              >
                查看全部 <ArrowRightOutlined />
              </Button>
            }
            className="novels-overview-card"
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="作品总数"
                  value={novelList.length}
                  prefix={<BookOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="累计字数"
                  value={formatWordCount(totalWordCount)}
                  prefix={<EditOutlined />}
                />
              </Col>
            </Row>
            
            {novelList.length > 0 && (
              <div className="recent-novels" style={{ marginTop: 24 }}>
                <Text type="secondary">最近更新</Text>
                <div className="novel-list" style={{ marginTop: 12 }}>
                  {novelList.slice(0, 3).map((novel) => (
                    <div
                      key={novel.id}
                      className="novel-item"
                      onClick={() => navigate(`/novels/${novel.id}`)}
                      style={{
                        padding: '12px 16px',
                        background: '#f5f5f5',
                        borderRadius: 8,
                        marginBottom: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{novel.title}</span>
                      <Text type="secondary">{formatWordCount(novel.wordCount || 0)}字</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
