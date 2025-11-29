'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  App,
  Space,
  Typography,
  Divider,
  Alert,
  Spin,
  Modal,
  Table,
  Tag
} from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import {
  SaveOutlined,
  DownloadOutlined,
  QrcodeOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  CheckCircleFilled,
  HistoryOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appDownloadService, AppDownloadLink } from '@/services/appDownloadService';
import { QueryParamsHandler } from '@/components/common/QueryParamsHandler';
import { convertGoogleDriveToDirectDownload } from '@/lib/utils';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const AppDownloadManagementPage = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [driveShareUrl, setDriveShareUrl] = useState<string>('');
  const [convertedUrl, setConvertedUrl] = useState<string>('');
  const [isValidDriveLink, setIsValidDriveLink] = useState<boolean>(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  // Fetch current download link using TanStack Query
  const { data: currentLink, isLoading: fetching } = useQuery({
    queryKey: ['appDownload', 'current'],
    queryFn: () => appDownloadService.getCurrentDownloadLink(),
  });

  // Fetch version history using TanStack Query
  const { data: versionHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['appDownload', 'history'],
    queryFn: () => appDownloadService.getVersionHistory(),
    enabled: historyVisible, // Only fetch when modal is visible
  });

  // Update form when currentLink changes
  useEffect(() => {
    if (currentLink) {
      form.setFieldsValue({
        downloadUrl: currentLink.downloadUrl,
        appName: currentLink.appName,
        version: currentLink.version || '',
        description: currentLink.description || '',
      });
      // Check if it's a Google Drive link
      if (currentLink.downloadUrl?.includes('drive.google.com')) {
        const fileIdMatch = currentLink.downloadUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          const shareUrl = `https://drive.google.com/file/d/${fileId}/view`;
          setDriveShareUrl(shareUrl);
          setConvertedUrl(currentLink.downloadUrl);
          setIsValidDriveLink(true);
          form.setFieldsValue({ driveShareUrl: shareUrl });
        } else {
          setDriveShareUrl(currentLink.downloadUrl);
          setConvertedUrl(currentLink.downloadUrl);
          setIsValidDriveLink(true);
          form.setFieldsValue({ driveShareUrl: currentLink.downloadUrl });
        }
      }
    }
  }, [currentLink, form]);

  // Generate next version (e.g., v1.0.0 -> v1.0.1)
  const generateNextVersion = (currentVersion?: string): string => {
    if (!currentVersion || !currentVersion.startsWith('v')) {
      return 'v1.0.0';
    }
    
    // Extract version numbers (e.g., "v1.0.0" -> [1, 0, 0])
    const versionMatch = currentVersion.match(/^v(\d+)\.(\d+)\.(\d+)$/);
    if (!versionMatch) {
      return 'v1.0.0';
    }
    
    let major = parseInt(versionMatch[1]);
    let minor = parseInt(versionMatch[2]);
    let patch = parseInt(versionMatch[3]);
    
    // Increment patch version
    patch++;
    
    return `v${major}.${minor}.${patch}`;
  };

  const handleDriveLinkChange = (shareUrl: string) => {
    const trimmedUrl = shareUrl?.trim() || '';
    setDriveShareUrl(trimmedUrl);
    
    // Also update form field to pass validation
    form.setFieldsValue({ driveShareUrl: trimmedUrl });
    
    if (!trimmedUrl) {
      setConvertedUrl('');
      setIsValidDriveLink(false);
      form.setFieldsValue({ downloadUrl: undefined });
      return;
    }

    // Convert Google Drive share link to direct download link
    const downloadUrl = convertGoogleDriveToDirectDownload(trimmedUrl);
    
    if (downloadUrl) {
      setConvertedUrl(downloadUrl);
      setIsValidDriveLink(true);
      form.setFieldsValue({ downloadUrl });
      // Show success message when link is converted successfully
      message.success('Google Drive link converted successfully!');
    } else {
      setConvertedUrl('');
      setIsValidDriveLink(false);
      form.setFieldsValue({ downloadUrl: undefined });
      // Only show warning if user actually entered something
      if (trimmedUrl.length > 0) {
        message.warning('Invalid Google Drive link. Please paste a valid Google Drive share link.');
      }
    }
  };

  // Mutation for saving download link
  const saveLinkMutation = useMutation({
    mutationFn: async (linkData: Omit<AppDownloadLink, 'id' | 'createdAt' | 'updatedAt'>) => {
      return appDownloadService.saveDownloadLink(linkData);
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['appDownload'] });
      message.success('Download link configuration saved successfully!');
    },
    onError: (error: any) => {
      console.error('Error saving download link:', error);
      const errorMessage = error.message || 'Failed to save configuration. Please try again.';
      message.error(errorMessage, 5);
    },
  });

  const handleSubmit = async (values: any) => {
    // Check if download URL exists
    if (!values.downloadUrl) {
      message.error('Please enter a Google Drive share link first.');
      return;
    }

    // Auto-generate version if not provided
    const currentVersion = values.version || currentLink?.version || null;
    const nextVersion = generateNextVersion(currentVersion || undefined);

    const linkData: Omit<AppDownloadLink, 'id' | 'createdAt' | 'updatedAt'> = {
      downloadUrl: values.downloadUrl,
      appName: values.appName || 'APSAS App',
      version: nextVersion,
      description: values.description || undefined,
      isActive: true,
    };

    saveLinkMutation.mutate(linkData);
  };

  const loading = saveLinkMutation.isPending;

  const handleTestDownload = () => {
    if (currentLink?.downloadUrl) {
      window.open(currentLink.downloadUrl, '_blank');
    } else {
      message.warning('No download link available. Please save configuration first.');
    }
  };

  const handleViewHistory = () => {
    setHistoryVisible(true);
    // Query will automatically fetch when historyVisible becomes true
  };

  const historyColumns = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (version: string) => <Tag color="blue">{version}</Tag>,
    },
    {
      title: 'App Name',
      dataIndex: 'appName',
      key: 'appName',
    },
    {
      title: 'Uploaded Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => new Date(date).toLocaleString('en-US'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: AppDownloadLink) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={() => window.open(record.downloadUrl, '_blank')}
        >
          Download
        </Button>
      ),
    },
  ];

  return (
    <>
      <QueryParamsHandler />
      <div style={{ padding: '2rem', margin: '0 auto', backgroundColor: '#fff' }}>
        <Title level={2}>
          <Space>
            <DownloadOutlined />
            <span>App Download Link Management</span>
          </Space>
        </Title>

        <Alert
          message="Instructions"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                1. Upload your APK file to Google Drive and share it (make it accessible to anyone with the link)
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                2. Paste the Google Drive share link here. It will be automatically converted to a direct download link.
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                3. Fill in the app information (name and description). Version will be auto-generated.
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                4. This link will be displayed in the download modal in the footer
              </Paragraph>
            </div>
          }
          type="info"
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
          showIcon
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Form Section */}
          <Card
            title={
              <Space>
                <QrcodeOutlined />
                <span>Download Link Configuration</span>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                appName: 'APSAS App',
              }}
            >
              <Form.Item
                label="Google Drive Share Link"
                name="driveShareUrl"
                rules={[
                  { 
                    validator: (_, value) => {
                      if (!value && !form.getFieldValue('downloadUrl')) {
                        return Promise.reject(new Error('Please enter Google Drive share link'));
                      }
                      return Promise.resolve();
                    }
                  },
                ]}
                tooltip="Paste your Google Drive share link here. Example: https://drive.google.com/file/d/FILE_ID/view"
              >
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  size="large"
                  prefix={<LinkOutlined />}
                  value={driveShareUrl}
                  onChange={(e) => handleDriveLinkChange(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    // Set value directly and trigger conversion
                    setDriveShareUrl(pastedText);
                    handleDriveLinkChange(pastedText);
                  }}
                />
                {isValidDriveLink && convertedUrl && (
                  <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                    <Space>
                      <CheckCircleFilled style={{ color: '#52c41a' }} />
                      <Text type="success" style={{ fontSize: '12px' }}>
                        Link converted successfully!
                      </Text>
                    </Space>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Download URL: {convertedUrl.substring(0, 60)}...
                      </Text>
                    </div>
                  </div>
                )}
              </Form.Item>

              <Form.Item
                name="downloadUrl"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="App Name"
                name="appName"
                rules={[{ required: true, message: 'Please enter app name' }]}
              >
                <Input placeholder="APSAS App" size="large" />
              </Form.Item>

              <Form.Item
                label="Version"
                name="version"
                tooltip="Version will be auto-generated (e.g., v1.0.0, v1.0.1)"
              >
                <Input placeholder="v1.0.0" size="large" readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
              </Form.Item>

              <Form.Item
                label="Description"
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder="App description..."
                  showCount
                  maxLength={200}
                />
              </Form.Item>

               <Form.Item>
                 <Space>
                   <Button
                     type="primary"
                     htmlType="submit"
                     icon={<SaveOutlined />}
                     loading={loading}
                     size="large"
                   >
                     Save Configuration
                   </Button>
                   <Button
                     icon={<DownloadOutlined />}
                     onClick={handleTestDownload}
                     disabled={!currentLink}
                   >
                     Test Download
                   </Button>
                   <Button
                     icon={<HistoryOutlined />}
                     onClick={handleViewHistory}
                   >
                     View History
                   </Button>
                 </Space>
               </Form.Item>
            </Form>
          </Card>

          {/* Preview Section */}
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                <span>QR Code Preview</span>
              </Space>
            }
          >
            {currentLink ? (
              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div>
                    <Text strong>{currentLink.appName}</Text>
                    {currentLink.version && (
                      <div>
                        <Text type="secondary">Version: {currentLink.version}</Text>
                      </div>
                    )}
                  </div>

                  <div style={{
                    padding: '20px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    display: 'inline-block'
                  }}>
                    <QRCodeSVG
                      value={currentLink.downloadUrl}
                      size={240}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <Divider />

                  <div style={{ textAlign: 'left' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Direct Download Link:</Text>
                    <Paragraph
                      copyable={{ text: currentLink.downloadUrl }}
                      style={{
                        marginTop: 4,
                        marginBottom: 0,
                        fontSize: '11px',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px'
                      }}
                    >
                      {currentLink.downloadUrl}
                    </Paragraph>
                  </div>


                  {currentLink.updatedAt && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Last updated: {new Date(currentLink.updatedAt).toLocaleString('en-US')}
                    </Text>
                  )}
                </Space>
              </div>
            ) : fetching ? null : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text type="secondary">
                  No configuration found. Please enter information and save.
                </Text>
              </div>
            )}
           </Card>
         </div>
       </div>

       {/* Version History Modal */}
       <Modal
         title={
           <Space>
             <HistoryOutlined />
             <span>Version History</span>
           </Space>
         }
         open={historyVisible}
         onCancel={() => setHistoryVisible(false)}
         footer={[
           <Button key="close" onClick={() => setHistoryVisible(false)}>
             Close
           </Button>
         ]}
         width={800}
       >
         <Spin spinning={loadingHistory}>
          <Table
            columns={historyColumns}
            dataSource={versionHistory}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} versions`,
            }}
          />
        </Spin>
       </Modal>
     </>
   );
 };

 export default AppDownloadManagementPage;

