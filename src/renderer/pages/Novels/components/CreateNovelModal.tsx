/**
 * 新建作品对话框组件
 */

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  App,
  Row,
  Col,
} from 'antd';
import { BookOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNovelStore } from '../../../store';

const { TextArea } = Input;
const { Option } = Select;

interface CreateNovelModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateNovelModal: React.FC<CreateNovelModalProps> = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { createNovel } = useNovelStore();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      console.log('正在创建作品:', values);

      const novel = await createNovel(
        values.title,
        values.author,
        values.description
      );

      console.log('创建作品结果:', novel);

      if (novel) {
        message.success('作品创建成功');
        form.resetFields();
        onClose();
        // 跳转到作品编辑页面
        navigate(`/novels/${novel.id}`);
      } else {
        message.error('创建作品失败：store 返回 null');
      }
    } catch (error) {
      console.error('创建作品失败:', error);
      message.error(`创建作品失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="新建作品"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="创建作品"
      cancelText="取消"
      confirmLoading={submitting}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        style={{ marginTop: 16 }}
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
                prefix={<UserOutlined />}
                placeholder="请输入作者名称"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="status"
              label="作品状态"
              initialValue="draft"
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
              name="description"
              label="作品简介"
              rules={[{ max: 500, message: '简介不能超过500个字符' }]}
            >
              <TextArea
                placeholder="请输入作品简介（选填）"
                rows={4}
                showCount
                maxLength={500}
              />
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
                placeholder="选择作品分类（选填）"
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
                placeholder="添加标签（选填）"
                allowClear
                tokenSeparators={[',', '，']}
              >
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateNovelModal;
