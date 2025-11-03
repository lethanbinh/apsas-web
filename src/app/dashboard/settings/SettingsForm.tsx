"use client";

import { Card, Form, Switch, Select, Button, Typography, Space, Divider } from 'antd';

export default function SettingsForm() {
  const handleSubmit = (values: any) => {
    console.log('Settings update:', values);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>Cài đặt</Typography.Title>
        <Typography.Text type="secondary">
          Tùy chỉnh ứng dụng theo ý muốn của bạn
        </Typography.Text>
      </div>

      <Card title="Cài đặt chung">
        <Form
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            notifications: true,
            darkMode: false,
            language: 'vi',
            timezone: 'Asia/Ho_Chi_Minh',
          }}
        >
          <Form.Item
            name="notifications"
            label="Thông báo"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="darkMode"
            label="Chế độ tối"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="language"
            label="Ngôn ngữ"
          >
            <Select>
              <Select.Option value="vi">Tiếng Việt</Select.Option>
              <Select.Option value="en">English</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="timezone"
            label="Múi giờ"
          >
            <Select>
              <Select.Option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</Select.Option>
              <Select.Option value="UTC">UTC</Select.Option>
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Lưu cài đặt
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Bảo mật">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>Đổi mật khẩu</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              Cập nhật mật khẩu để bảo vệ tài khoản của bạn
            </Typography.Text>
            <br />
            <Button type="link" style={{ padding: 0, marginTop: 8 }}>
              Đổi mật khẩu
            </Button>
          </div>

          <Divider />

          <div>
            <Typography.Text strong>Xác thực hai yếu tố</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              Thêm lớp bảo mật bổ sung cho tài khoản của bạn
            </Typography.Text>
            <br />
            <Button type="link" style={{ padding: 0, marginTop: 8 }}>
              Kích hoạt 2FA
            </Button>
          </div>
        </Space>
      </Card>
    </Space>
  );
}


