/**
 * 新建章节对话框
 * 输入章节标题，选择插入位置（开头、结尾、某章节后）
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Radio,
  Space,
  Typography,
  message,
  Select,
} from 'antd';
import {
  PlusOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  InsertRowBelowOutlined,
} from '@ant-design/icons';
import { useNovelStore } from '../../../store';

const { Text } = Typography;

interface CreateChapterModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (chapterId: string) => void;
}

type InsertPosition = 'start' | 'end' | 'after';

const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const {
    currentNovel,
    chapterList,
    volumeList,
    createChapter,
    loadChapterList,
    loadVolumeList,
  } = useNovelStore();

  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<InsertPosition>('end');
  const [afterChapterId, setAfterChapterId] = useState<string>('');
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | undefined>(undefined);

  // 重置表单
  useEffect(() => {
    if (open) {
      form.resetFields();
      setPosition('end');
      setAfterChapterId('');
      setSelectedVolumeId(undefined);
      // 加载卷列表
      if (currentNovel) {
        loadVolumeList(currentNovel.id);
      }
    }
  }, [open, form, currentNovel, loadVolumeList]);

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      let order: number | undefined;

      // 根据插入位置计算order
      switch (position) {
        case 'start':
          order = 0;
          break;
        case 'end':
          order = undefined; // 使用默认顺序（最后）
          break;
        case 'after':
          if (afterChapterId) {
            const afterChapter = chapterList.find(c => c.id === afterChapterId);
            if (afterChapter) {
              order = afterChapter.order;
            }
          }
          break;
      }

      const result = await createChapter(values.title, order, selectedVolumeId);

      if (result) {
        message.success('章节创建成功');
        // 刷新章节列表
        if (currentNovel) {
          await loadChapterList(currentNovel.id);
        }
        onSuccess(result.id);
      } else {
        message.error('创建章节失败');
      }
    } catch (error) {
      console.error('创建章节失败:', error);
      message.error('创建章节失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // 获取章节选择选项
  const getChapterOptions = () => {
    return chapterList.map((chapter, index) => ({
      label: `第${index + 1}章 - ${chapter.title}`,
      value: chapter.id,
    }));
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          <span>新建章节</span>
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        style={{ marginTop: 16 }}
      >
        {/* 章节标题 */}
        <Form.Item
          name="title"
          label="章节标题"
          rules={[
            { required: true, message: '请输入章节标题' },
            { max: 100, message: '章节标题不能超过100个字符' },
          ]}
        >
          <Input
            placeholder="请输入章节标题，如：第一章 初入江湖"
            size="large"
            autoFocus
          />
        </Form.Item>

        {/* 所属卷 */}
        <Form.Item label="所属卷">
          <Select
            placeholder="选择所属卷（可选）"
            value={selectedVolumeId}
            onChange={setSelectedVolumeId}
            allowClear
            options={volumeList.map((v) => ({
              label: v.title,
              value: v.id,
            }))}
            style={{ width: '100%' }}
          />
        </Form.Item>

        {/* 插入位置 */}
        <Form.Item label="插入位置" required>
          <Radio.Group
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Radio.Button
                value="start"
                style={{ width: '100%', textAlign: 'left' }}
              >
                <Space>
                  <VerticalAlignTopOutlined />
                  <span>插入到开头（作为第一章）</span>
                </Space>
              </Radio.Button>

              <Radio.Button
                value="end"
                style={{ width: '100%', textAlign: 'left' }}
              >
                <Space>
                  <VerticalAlignBottomOutlined />
                  <span>插入到结尾（作为第{chapterList.length + 1}章）</span>
                </Space>
              </Radio.Button>

              <Radio.Button
                value="after"
                style={{ width: '100%', textAlign: 'left' }}
                disabled={chapterList.length === 0}
              >
                <Space align="start">
                  <InsertRowBelowOutlined />
                  <span>插入到指定章节后</span>
                </Space>
              </Radio.Button>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* 选择章节（当选择"插入到指定章节后"时显示） */}
        {position === 'after' && (
          <Form.Item
            label="选择章节"
            required
            style={{ marginLeft: 24 }}
          >
            <Select
              placeholder="请选择要插入在哪个章节之后"
              value={afterChapterId}
              onChange={setAfterChapterId}
              options={getChapterOptions()}
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        {/* 提示信息 */}
        <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：创建章节后，系统将自动调整其他章节的顺序编号。
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateChapterModal;
