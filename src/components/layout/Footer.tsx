/**
 * Footer component
 */

import React from 'react';
import { Layout, Row, Col, Typography, Space } from 'antd';
import { GithubOutlined, TwitterOutlined, LinkedinOutlined } from '@ant-design/icons';

const { Footer: AntFooter } = Layout;
const { Text, Link } = Typography;

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <AntFooter className="app-footer">
      <div className="footer-content">
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} md={8}>
            <div className="footer-section">
              <h4>APSAS Web</h4>
              <Text type="secondary">
                Ứng dụng web hiện đại được xây dựng với Next.js và TypeScript.
              </Text>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <div className="footer-section">
              <h4>Liên kết</h4>
              <Space direction="vertical" size="small">
                <Link href="/about">Về chúng tôi</Link>
                <Link href="/contact">Liên hệ</Link>
                <Link href="/privacy">Chính sách bảo mật</Link>
                <Link href="/terms">Điều khoản sử dụng</Link>
              </Space>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <div className="footer-section">
              <h4>Theo dõi chúng tôi</h4>
              <Space size="middle">
                <GithubOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
                <TwitterOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
                <LinkedinOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
              </Space>
            </div>
          </Col>
        </Row>
        
        <div className="footer-bottom">
          <Text type="secondary">
            © {currentYear} APSAS Web. Tất cả quyền được bảo lưu.
          </Text>
        </div>
      </div>
    </AntFooter>
  );
};
