"use client";

import React, { useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, Row, Col } from "antd";
import moment from "moment";
import { User, UserUpdatePayload } from "@/types";
import { Role } from "@/lib/constants";

interface UserDetailFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: UserUpdatePayload, role: Role) => void;
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
  const role = Form.useWatch("role", form);
  const isEditMode = !!editingUser;

  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue({
        ...editingUser,
        dateOfBirth: editingUser.dateOfBirth
          ? moment(editingUser.dateOfBirth)
          : null,
      });
    } else {
      form.resetFields();
    }
  }, [editingUser, form, visible]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const formattedValues = {
          ...values,
          dateOfBirth: values.dateOfBirth
            ? values.dateOfBirth.toISOString()
            : null,
          gender: Number(values.gender),
        };

        onOk(formattedValues as UserUpdatePayload, values.role);
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  return (
    <Modal
      title={
        editingUser ? `Edit User: ${editingUser.fullName}` : "Add New User"
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText={editingUser ? "Update" : "Add"}
      confirmLoading={confirmLoading}
      centered
      width={900}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        name="user_detail_form"
        initialValues={{ remember: true }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="accountCode"
              label="Account Code"
              rules={[
                {
                  required: !isEditMode,
                  message: "Please input the account code!",
                },
                {
                  validator: (_, value) => {
                    if (!value || value.trim().length === 0) {
                      return Promise.reject(new Error("Account code cannot be empty!"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input disabled={isEditMode} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: "Please input the username!" },
                {
                  validator: (_, value) => {
                    if (!value || value.trim().length === 0) {
                      return Promise.reject(new Error("Username cannot be empty!"));
                    }
                    if (value.trim().length < 3) {
                      return Promise.reject(new Error("Username must be at least 3 characters!"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input disabled={isEditMode} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input the email!" },
                {
                  type: "email",
                  message: "Please enter a valid email address!",
                },
                {
                  validator: (_, value) => {
                    if (!value || value.trim().length === 0) {
                      return Promise.reject(new Error("Email cannot be empty!"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input disabled={isEditMode} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: "Please input the phone number!" },
                {
                  validator: (_, value) => {
                    if (!value || value.trim().length === 0) {
                      return Promise.reject(new Error("Phone number cannot be empty!"));
                    }
                    // Basic phone validation - at least 10 digits
                    const phoneRegex = /^[0-9]{10,}$/;
                    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
                      return Promise.reject(new Error("Please enter a valid phone number (at least 10 digits)!"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[
                { required: true, message: "Please input the full name!" },
                {
                  validator: (_, value) => {
                    if (!value || value.trim().length === 0) {
                      return Promise.reject(new Error("Full name cannot be empty!"));
                    }
                    if (value.trim().length < 2) {
                      return Promise.reject(new Error("Full name must be at least 2 characters!"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="gender"
              label="Gender"
              rules={[{ required: true, message: "Please select the gender!" }]}
            >
              <Select placeholder="Select gender" disabled={isEditMode}>
                <Option value={0}>Male</Option>
                <Option value={1}>Female</Option>
                <Option value={2}>Other</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="dateOfBirth"
              label="Date of Birth"
              rules={[
                { required: true, message: "Please select the date of birth!" },
              ]}
            >
              <DatePicker style={{ width: "100%" }} disabled={isEditMode} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Please select the role!" }]}
            >
              <Select placeholder="Select role" disabled={isEditMode}>
                <Option value={0}>Admin</Option>
                <Option value={1}>Lecturer</Option>
                <Option value={2}>Student</Option>
                <Option value={3}>HOD</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="address"
              label="Address"
              rules={[
                { required: true, message: "Please input the address!" },
                {
                  validator: (_, value) => {
                    if (!value || value.trim().length === 0) {
                      return Promise.reject(new Error("Address cannot be empty!"));
                    }
                    if (value.trim().length < 5) {
                      return Promise.reject(new Error("Address must be at least 5 characters!"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
        {!isEditMode && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please input the password!" },
                  {
                    validator: (_, value) => {
                      if (!value || value.trim().length === 0) {
                        return Promise.reject(new Error("Password cannot be empty!"));
                      }
                      if (value.length < 6) {
                        return Promise.reject(new Error("Password must be at least 6 characters!"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  );
};
