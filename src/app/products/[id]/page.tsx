/**
 * Product detail page (Dynamic route)
 */

import { Metadata } from 'next';
import { Card, Row, Col, Typography, Button, Space, Tag, Image, Divider } from 'antd';
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface ProductPageProps {
  params: {
    id: string;
  };
}

// Mock data
const getProduct = (id: string) => {
  const products = [
    {
      id: 1,
      name: 'Laptop Dell XPS 13',
      price: 25000000,
      category: 'Laptop',
      status: 'active',
      stock: 15,
      description: 'Laptop cao cấp với hiệu năng mạnh mẽ, thiết kế sang trọng',
      image: '/api/placeholder/400/300',
      specifications: {
        processor: 'Intel Core i7-1165G7',
        memory: '16GB RAM',
        storage: '512GB SSD',
        display: '13.4 inch 4K',
        graphics: 'Intel Iris Xe',
      },
    },
    {
      id: 2,
      name: 'iPhone 15 Pro',
      price: 30000000,
      category: 'Điện thoại',
      status: 'active',
      stock: 8,
      description: 'iPhone mới nhất với camera chuyên nghiệp',
      image: '/api/placeholder/400/300',
      specifications: {
        processor: 'A17 Pro',
        memory: '8GB RAM',
        storage: '256GB',
        display: '6.1 inch Super Retina XDR',
        camera: '48MP Main Camera',
      },
    },
  ];
  
  return products.find(p => p.id.toString() === id);
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = getProduct(params.id);
  
  return {
    title: product ? `${product.name} - APSAS Web` : 'Sản phẩm không tồn tại',
    description: product?.description || 'Sản phẩm không tồn tại',
  };
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const product = getProduct(params.id);

  if (!product) {
    return (
      <div className="product-not-found">
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Typography.Title level={2}>Sản phẩm không tồn tại</Typography.Title>
            <Typography.Text type="secondary">
              Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
            </Typography.Text>
            <br />
            <Link href="/products">
              <Button type="primary" style={{ marginTop: 16 }}>
                Quay lại danh sách
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Link href="/products">
            <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
              Quay lại danh sách
            </Button>
          </Link>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card>
              <Image
                src={product.image}
                alt={product.name}
                style={{ width: '100%', height: 'auto' }}
                placeholder
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Typography.Title level={2}>{product.name}</Typography.Title>
                <Typography.Title level={3} type="success">
                  {product.price.toLocaleString('vi-VN')} VND
                </Typography.Title>
                <Space>
                  <Tag color="blue">{product.category}</Tag>
                  <Tag color={product.status === 'active' ? 'green' : 'red'}>
                    {product.status === 'active' ? 'Hoạt động' : 'Ngừng bán'}
                  </Tag>
                </Space>
              </div>

              <div>
                <Typography.Title level={4}>Mô tả sản phẩm</Typography.Title>
                <Typography.Text>{product.description}</Typography.Text>
              </div>

              <div>
                <Typography.Title level={4}>Thông số kỹ thuật</Typography.Title>
                <Row gutter={[16, 8]}>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <Col span={12} key={key}>
                      <Typography.Text strong>{key}:</Typography.Text>
                      <br />
                      <Typography.Text>{value}</Typography.Text>
                    </Col>
                  ))}
                </Row>
              </div>

              <Divider />

              <div>
                <Typography.Text strong>Tồn kho: </Typography.Text>
                <Typography.Text>{product.stock} sản phẩm</Typography.Text>
              </div>

              <Space>
                <Button type="primary" size="large">
                  Thêm vào giỏ hàng
                </Button>
                <Button icon={<EditOutlined />}>
                  Chỉnh sửa
                </Button>
                <Button danger icon={<DeleteOutlined />}>
                  Xóa
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
