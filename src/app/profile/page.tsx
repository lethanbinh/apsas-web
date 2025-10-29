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
  Button
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  HomeOutlined,
  CalendarOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { Layout } from '@/components/layout/Layout';
import styles from './Profile.module.css';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import type { User } from '@/types';

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <Card className={styles.profileCard} bordered={false}>
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
                <Button type="primary" size="large" block icon={<UserOutlined />}>
                  Edit Profile
                </Button>
              </div>
            </Card>

            {/* Quick Info Card */}
            <Card className={styles.quickInfoCard} bordered={false}>
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
            <Card className={styles.mainCard} bordered={false}>
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
            <Card className={styles.accountCard} bordered={false}>
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
      </div>
    </Layout>
  );
};

export default ProfilePage;
