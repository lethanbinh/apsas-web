/**
 * Products listing page
 */

import { Metadata } from 'next';
import { Card, Row, Col, Typography, Button, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sản phẩm - APSAS Web',
  description: 'Danh sách sản phẩm',
};

// Mock data
const products = [
  {
    id: 1,
    name: 'Laptop Dell XPS 13',
    price: 25000000,
    category: 'Laptop',
    status: 'active',
    stock: 15,
  },
  {
    id: 2,
    name: 'iPhone 15 Pro',
    price: 30000000,
    category: 'Điện thoại',
    status: 'active',
    stock: 8,
  },
  {
    id: 3,
    name: 'Samsung Galaxy S24',
    price: 22000000,
    category: 'Điện thoại',
    status: 'inactive',
    stock: 0,
  },
];

export default function ProductsPage() {
  return (
    <div className="products-page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Title level={2}>Sản phẩm</Typography.Title>
            <Typography.Text type="secondary">
              Quản lý danh sách sản phẩm
            </Typography.Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            Thêm sản phẩm
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          {products.map((product) => (
            <Col xs={24} sm={12} lg={8} key={product.id}>
              <Card
                hoverable
                actions={[
                  <EditOutlined key="edit" />,
                  <DeleteOutlined key="delete" />,
                ]}
              >
                <Card.Meta
                  title={
                    <Link href={`/products/${product.id}`}>
                      {product.name}
                    </Link>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Typography.Text strong>
                        {product.price.toLocaleString('vi-VN')} VND
                      </Typography.Text>
                      <div>
                        <Tag color="blue">{product.category}</Tag>
                        <Tag color={product.status === 'active' ? 'green' : 'red'}>
                          {product.status === 'active' ? 'Hoạt động' : 'Ngừng bán'}
                        </Tag>
                      </div>
                      <Typography.Text type="secondary">
                        Tồn kho: {product.stock} sản phẩm
                      </Typography.Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    </div>
  );
}
