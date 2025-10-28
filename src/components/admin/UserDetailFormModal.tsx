import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button } from 'antd';
import moment from 'moment';
import { User, UserUpdatePayload } from '@/types';

interface UserDetailFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: UserUpdatePayload) => void;
  editingUser: User | null;
  confirmLoading: boolean;
}

const { Option } = Select;

export const UserDetailFormModal: React.FC<UserDetailFormModalProps> = ({
  visible,
  onCancel,
  onOk,
  editingUser,
  confirmLoading,
}) => {
  const [form] = Form.useForm();


  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue({
        ...editingUser,
        dateOfBirth: editingUser.dateOfBirth ? moment(editingUser.dateOfBirth) : null,
      });
    } else {
      form.resetFields();
    }
  }, [editingUser, form]);

  const handleOk = () => {
    form.validateFields()
      .then((values) => {
        const formattedValues: UserUpdatePayload = {
          ...values,
          dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : null,
        };
        onOk(formattedValues);
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Modal
      title={editingUser ? `Edit User: ${editingUser.fullName}` : 'Add New User'}
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText={editingUser ? 'Update' : 'Add'}
      confirmLoading={confirmLoading}
      centered
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        name="user_detail_form"
        initialValues={{ remember: true }}
      >
        <Form.Item name="accountCode" label="Account Code" rules={[{ required: true, message: 'Please input the account code!' }]}>
          <Input disabled={!!editingUser} />
        </Form.Item>
        <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Please input the username!' }]}>
          <Input disabled={!!editingUser} />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please input the email!', type: 'email' }]}>
          <Input disabled={!!editingUser} />
        </Form.Item>
        <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true, message: 'Please input the phone number!' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: 'Please input the full name!' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="avatar" label="Avatar URL">
          <Input disabled={!!editingUser} />
        </Form.Item>
        <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Please input the address!' }]}>
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="gender" label="Gender" rules={[{ required: true, message: 'Please select the gender!' }]}>
          <Select disabled={!!editingUser} placeholder="Select gender">
            <Option value={0}>Male</Option>
            <Option value={1}>Female</Option>
            <Option value={2}>Other</Option>
          </Select>
        </Form.Item>
        <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true, message: 'Please select the date of birth!' }]}>
          <DatePicker style={{ width: '100%' }} disabled={!!editingUser} />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Please select the role!' }]}>
          <Select disabled={!!editingUser} placeholder="Select role">
            <Option value={0}>Admin</Option>
            <Option value={1}>Lecturer</Option>
            <Option value={2}>Student</Option>
            <Option value={3}>HOD</Option>
          </Select>
        </Form.Item>
        {/* Password field - only for adding new user or explicit password change */}
        {!editingUser && (
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please input the password!' }]}>
            <Input.Password />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default UserDetailFormModal;
