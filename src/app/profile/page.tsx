'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Avatar, 
  Descriptions, 
  Tag, 
  Spin,
  Empty,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  HomeOutlined,
  CalendarOutlined,
  IdcardOutlined,
  EditOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { Layout } from '@/components/layout/Layout';
import styles from './Profile.module.css';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import type { User } from '@/types';

const { Option } = Select;

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Get user ID from localStorage
        const userId = localStorage.getItem('user_id');
        
        if (!userId) {
          console.error('No user ID found');
          setError('User ID not found. Please login again.');
          setLoading(false);
          return;
        }

        console.log('Fetching profile for user ID:', userId);
        
        // Fetch user profile from API
        const userProfile = await authService.getProfile();
        console.log('Profile fetched:', userProfile);
        
        setProfile(userProfile);
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const getRoleInfo = (role: number) => {
    const roles = [
      { name: 'Admin', color: 'volcano' },
      { name: 'Lecturer', color: 'cyan' },
      { name: 'Student', color: 'green' },
      { name: 'HOD', color: 'blue' }
    ];
    return roles[role] || { name: 'Unknown', color: 'default' };
  };

  const getGenderText = (gender: number) => {
    return gender === 1 ? 'Female' : gender === 0 ? 'Male' : 'Other';
  };

  const handleEdit = () => {
    if (profile) {
      form.setFieldsValue({
        phoneNumber: profile.phoneNumber,
        fullName: profile.fullName,
        avatar: profile.avatar,
        address: profile.address,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth ? moment(profile.dateOfBirth) : null,
      });
      setIsEditModalVisible(true);
    }
  };

  const handleEditOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (!profile?.id) {
        message.error('Profile ID not found');
        return;
      }

      setUpdating(true);
      
      const updateData = {
        phoneNumber: values.phoneNumber,
        fullName: values.fullName,
        avatar: values.avatar || '',
        address: values.address,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : profile.dateOfBirth,
      };

      const updatedProfile = await authService.updateProfile(profile.id, updateData);
      
      setProfile(updatedProfile);
      setIsEditModalVisible(false);
      message.success('Profile updated successfully');
      
      // Refresh profile data
      const userId = localStorage.getItem('user_id');
      if (userId) {
        const freshProfile = await authService.getProfile();
        setProfile(freshProfile);
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      message.error(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    form.resetFields();
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p>Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className={styles.errorContainer}>
          <Empty description={error || 'Profile not found'} />
        </div>
      </Layout>
    );
  }

  const roleInfo = getRoleInfo(profile.role);

  return (
    <Layout>
      <div className={styles.profileContainer}>
        <Row gutter={[24, 24]}>
          {/* Profile Card */}
          <Col xs={24} md={8}>
            <Card className={styles.profileCard}>
              <div className={styles.avatarSection}>
                <Avatar 
                  size={120} 
                  src={profile.avatar} 
                  icon={<UserOutlined />}
                  className={styles.avatar}
                />
                <h1 className={styles.userName}>{profile.fullName}</h1>
                <Tag color={roleInfo.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                  {roleInfo.name}
                </Tag>
              </div>
              <div className={styles.profileActions}>
                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  Edit Profile
                </Button>
              </div>
            </Card>

            {/* Quick Info Card */}
            <Card className={styles.quickInfoCard}>
              <h3 className={styles.sectionTitle}>Quick Info</h3>
              <div className={styles.quickInfoItem}>
                <IdcardOutlined className={styles.quickInfoIcon} />
                <span className={styles.quickInfoLabel}>Account Code:</span>
                <span className={styles.quickInfoValue}>{profile.accountCode}</span>
              </div>
              <div className={styles.quickInfoItem}>
                <IdcardOutlined className={styles.quickInfoIcon} />
                <span className={styles.quickInfoLabel}>Username:</span>
                <span className={styles.quickInfoValue}>{profile.username}</span>
              </div>
            </Card>
          </Col>

          {/* Main Info Card */}
          <Col xs={24} md={16}>
            <Card className={styles.mainCard}>
              <h2 className={styles.sectionTitle}>Personal Information</h2>
              <Descriptions column={1} bordered className={styles.descriptions}>
                <Descriptions.Item label={
                  <span className={styles.descLabel}>
                    <MailOutlined /> Email
                  </span>
                }>
                  {profile.email}
                </Descriptions.Item>
                <Descriptions.Item label={
                  <span className={styles.descLabel}>
                    <PhoneOutlined /> Phone Number
                  </span>
                }>
                  {profile.phoneNumber}
                </Descriptions.Item>
                <Descriptions.Item label={
                  <span className={styles.descLabel}>
                    <CalendarOutlined /> Date of Birth
                  </span>
                }>
                  {new Date(profile.dateOfBirth).toLocaleDateString('vi-VN')}
                </Descriptions.Item>
                <Descriptions.Item label={
                  <span className={styles.descLabel}>
                    Gender
                  </span>
                }>
                  {getGenderText(profile.gender)}
                </Descriptions.Item>
                <Descriptions.Item label={
                  <span className={styles.descLabel}>
                    <HomeOutlined /> Address
                  </span>
                }>
                  {profile.address}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Account Details Card */}
            <Card className={styles.accountCard}>
              <h3 className={styles.sectionTitle}>Account Details</h3>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>ID</span>
                    <span className={styles.detailValue}>{profile.id}</span>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Role</span>
                    <Tag color={roleInfo.color}>{roleInfo.name}</Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Edit Profile Modal */}
        <Modal
          title="Edit Profile"
          open={isEditModalVisible}
          onOk={handleEditOk}
          onCancel={handleEditCancel}
          confirmLoading={updating}
          width={600}
          okText="Update"
          cancelText="Cancel"
        >
          <Form
            form={form}
            layout="vertical"
            name="edit_profile_form"
          >
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Please input your full name!' }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[{ required: true, message: 'Please input your phone number!' }]}
            >
              <Input placeholder="Enter phone number" />
            </Form.Item>

            <Form.Item
              name="avatar"
              label="Avatar URL"
            >
              <Input placeholder="Enter avatar URL (optional)" />
            </Form.Item>

            <Form.Item
              name="address"
              label="Address"
              rules={[{ required: true, message: 'Please input your address!' }]}
            >
              <Input.TextArea rows={3} placeholder="Enter address" />
            </Form.Item>

            <Form.Item
              name="gender"
              label="Gender"
              rules={[{ required: true, message: 'Please select gender!' }]}
            >
              <Select placeholder="Select gender">
                <Option value={0}>Male</Option>
                <Option value={1}>Female</Option>
                <Option value={2}>Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="dateOfBirth"
              label="Date of Birth"
              rules={[{ required: true, message: 'Please select date of birth!' }]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="Select date of birth" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
};

export default ProfilePage;
