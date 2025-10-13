/**
 * Dashboard home page
 */

import { Metadata } from 'next';
import { Card, Row, Col, Statistic, Typography, Space } from 'antd';
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  EyeOutlined 
} from '@ant-design/icons';

export const metadata: Metadata = {
  title: 'Dashboard - APSAS Web',
  description: 'Bảng điều khiển chính',
};

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2}>Dashboard</Typography.Title>
          <Typography.Text type="secondary">
            Chào mừng bạn đến với APSAS Web
          </Typography.Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng người dùng"
                value={1128}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Đơn hàng"
                value={93}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Doanh thu"
                value={112893}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Lượt xem"
                value={1128}
                prefix={<EyeOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Hoạt động gần đây">
              <div className="activity-list">
                <div className="activity-item">
                  <Typography.Text>Người dùng mới đăng ký</Typography.Text>
                  <Typography.Text type="secondary">2 phút trước</Typography.Text>
                </div>
                <div className="activity-item">
                  <Typography.Text>Đơn hàng mới được tạo</Typography.Text>
                  <Typography.Text type="secondary">5 phút trước</Typography.Text>
                </div>
                <div className="activity-item">
                  <Typography.Text>Thanh toán thành công</Typography.Text>
                  <Typography.Text type="secondary">10 phút trước</Typography.Text>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Thống kê nhanh">
              <div className="quick-stats">
                <div className="stat-item">
                  <Typography.Text strong>Đơn hàng hôm nay:</Typography.Text>
                  <Typography.Text>15</Typography.Text>
                </div>
                <div className="stat-item">
                  <Typography.Text strong>Doanh thu hôm nay:</Typography.Text>
                  <Typography.Text>2,500,000 VND</Typography.Text>
                </div>
                <div className="stat-item">
                  <Typography.Text strong>Người dùng online:</Typography.Text>
                  <Typography.Text>23</Typography.Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
