"use client";

import { Card, Form, Input, Button, Avatar, Typography, Space, Row, Col } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';

export default function ProfileForm() {
  const handleSubmit = (values: any) => {
    console.log('Profile update:', values);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>Hồ sơ cá nhân</Typography.Title>
        <Typography.Text type="secondary">
          Quản lý thông tin cá nhân của bạn
        </Typography.Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card>
            <div className="profile-avatar">
              <Avatar size={120} icon={<UserOutlined />} />
              <Button 
                type="link" 
                icon={<EditOutlined />}
                style={{ marginTop: 16 }}
              >
                Thay đổi ảnh đại diện
              </Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={16}>
          <Card title="Thông tin cá nhân">
            <Form
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                firstName: 'Nguyễn',
                lastName: 'Văn A',
                email: 'user@example.com',
                username: 'user123',
                phone: '0123456789',
              }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="firstName"
                    label="Họ"
                    rules={[{ required: true, message: 'Vui lòng nhập họ' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="lastName"
                    label="Tên"
                    rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="username"
                label="Tên đăng nhập"
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' }
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Số điện thoại"
              >
                <Input />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Cập nhật thông tin
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}


