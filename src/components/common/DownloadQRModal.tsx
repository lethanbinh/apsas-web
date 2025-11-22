'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Spin, message, Space, Typography } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { DownloadOutlined, CopyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { appDownloadService, AppDownloadLink } from '@/services/appDownloadService';

const { Text, Paragraph } = Typography;

interface DownloadQRModalProps {
  open: boolean;
  onClose: () => void;
}

export const DownloadQRModal: React.FC<DownloadQRModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [downloadLink, setDownloadLink] = useState<AppDownloadLink | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDownloadLink();
    }
  }, [open]);

  const fetchDownloadLink = async () => {
    try {
      setLoading(true);
      const link = await appDownloadService.getCurrentDownloadLink();
      setDownloadLink(link);
      
      if (!link) {
        message.warning('Download link is not configured. Please contact administrator.');
      }
    } catch (error: any) {
      console.error('Error fetching download link:', error);
      message.error('Failed to load download information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (downloadLink?.downloadUrl) {
      navigator.clipboard.writeText(downloadLink.downloadUrl);
      setCopied(true);
      message.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (downloadLink?.downloadUrl) {
      window.open(downloadLink.downloadUrl, '_blank');
    }
  };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          <span>Download APSAS App</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16, color: '#666' }}>
            Loading information...
          </Paragraph>
        </div>
      ) : !downloadLink ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Paragraph type="secondary">
            Download link is not configured.
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: 8 }}>
            Please contact administrator for assistance.
          </Paragraph>
        </div>
      ) : (
        <div style={{ padding: '20px 0' }}>
          {/* App Info */}
          <div style={{ 
            marginBottom: 24, 
            padding: '16px', 
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #bae6fd'
          }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                <Text strong style={{ fontSize: '16px' }}>{downloadLink.appName}</Text>
              </div>
              {downloadLink.version && (
                <Text type="secondary">Version: {downloadLink.version}</Text>
              )}
              {downloadLink.fileSize && (
                <Text type="secondary">Size: {downloadLink.fileSize}</Text>
              )}
              {downloadLink.description && (
                <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: '13px' }}>
                  {downloadLink.description}
                </Paragraph>
              )}
            </Space>
          </div>

          {/* QR Code */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            marginBottom: 24
          }}>
            <Text strong style={{ marginBottom: 16, fontSize: '14px' }}>
              Scan QR code to download app on mobile
            </Text>
            <div style={{
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '8px',
              display: 'inline-block',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <QRCodeSVG
                value={downloadLink.downloadUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Actions */}
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              block
              size="large"
            >
              Download APK
            </Button>
            <Button
              icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
              onClick={handleCopyLink}
              block
              disabled={copied}
            >
              {copied ? 'Link copied!' : 'Copy download link'}
            </Button>
          </Space>

          {/* Direct Link */}
          <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>Download link:</Text>
            <Paragraph 
              copyable={{ text: downloadLink.downloadUrl }}
              style={{ 
                marginTop: 4, 
                marginBottom: 0,
                fontSize: '11px',
                wordBreak: 'break-all',
                fontFamily: 'monospace'
              }}
            >
              {downloadLink.downloadUrl}
            </Paragraph>
          </div>
        </div>
      )}
    </Modal>
  );
};

