"use client";
import React, { useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, Row, Col } from "antd";
import { User } from "@/types";
import { Role, ROLES } from "@/lib/constants";
import dayjs from "dayjs";
interface CreateUserFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any, role: Role) => void;
  editingUser: User | null;
  confirmLoading: boolean;
}
const { Option } = Select;
export const CreateUserFormModal: React.FC<CreateUserFormModalProps> = ({
  visible,
  onCancel,
  onOk,
  editingUser,
  confirmLoading,
}) => {
  const [form] = Form.useForm();
  const selectedRole = Form.useWatch("role", form);
  const isEditMode = !!editingUser;
  useEffect(() => {
    if (!isEditMode && selectedRole !== undefined && selectedRole !== null) {
      const currentValues = form.getFieldsValue();
      const fieldsToReset = ['username', 'password', 'email', 'phoneNumber', 'fullName', 'gender', 'dateOfBirth', 'avatar', 'address', 'department', 'specialization'];
      fieldsToReset.forEach(field => {
        if (form.getFieldValue(field) !== undefined) {
          form.setFieldValue(field, undefined);
        }
      });
    }
  }, [selectedRole, isEditMode, form]);
  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue({
        ...editingUser,
        dateOfBirth: editingUser.dateOfBirth
          ? dayjs(editingUser.dateOfBirth)
          : null,
        role: editingUser.role,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ role: undefined });
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
          avatar: isEditMode ? (values.avatar || "") : "",
        };
        onOk(formattedValues, values.role);
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };
  const renderFormFields = () => {
    const commonFields = (
      <>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: "Please input the username!" },
                {
                  min: 3,
                  message: "Username must be at least 3 characters!",
                },
                {
                  max: 50,
                  message: "Username must not exceed 50 characters!",
                },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: "Username can only contain letters, numbers, and underscores!",
                },
              ]}
            >
              <Input disabled={isEditMode} placeholder="Enter username" />
            </Form.Item>
          </Col>
          {!isEditMode && (
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please input the password!" },
                  {
                    min: 6,
                    message: "Password must be at least 6 characters!",
                  },
                  {
                    max: 100,
                    message: "Password must not exceed 100 characters!",
                  },
                ]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>
            </Col>
          )}
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
                  max: 100,
                  message: "Email must not exceed 100 characters!",
                },
              ]}
            >
              <Input disabled={isEditMode} placeholder="Enter email address" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: "Please input the phone number!" },
                {
                  pattern: /^[0-9]{10,11}$/,
                  message: "Phone number must be 10-11 digits!",
                  transform: (value: string) => value?.replace(/[\s\-\(\)]/g, ''),
                },
              ]}
            >
              <Input placeholder="Enter phone number" />
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
                  min: 2,
                  message: "Full name must be at least 2 characters!",
                },
                {
                  max: 100,
                  message: "Full name must not exceed 100 characters!",
                },
                {
                  pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                  message: "Full name can only contain letters and spaces!",
                },
              ]}
            >
              <Input placeholder="Enter full name" />
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
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="dateOfBirth"
              label="Date of Birth"
              rules={[
                { required: true, message: "Please select the date of birth!" },
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.resolve();
                    }
                    const selectedDate = dayjs(value);
                    const today = dayjs();
                    if (selectedDate.isAfter(today)) {
                      return Promise.reject(new Error("Date of birth cannot be in the future!"));
                    }
                    const minAge = dayjs().subtract(100, 'year');
                    if (selectedDate.isBefore(minAge)) {
                      return Promise.reject(new Error("Date of birth is too far in the past!"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <DatePicker
                style={{ width: "100%" }}
                disabled={isEditMode}
                format="DD/MM/YYYY"
                placeholder="Select date of birth"
              />
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
                  min: 5,
                  message: "Address must be at least 5 characters!",
                },
                {
                  max: 200,
                  message: "Address must not exceed 200 characters!",
                },
              ]}
            >
              <Input.TextArea rows={3} placeholder="Enter address" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
    if (isEditMode) {
      return commonFields;
    }
    if (selectedRole === undefined || selectedRole === null) {
      return (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Please select the role!" }]}
            >
              <Select placeholder="Select role">
                <Option value={ROLES.ADMIN}>Admin</Option>
                <Option value={ROLES.LECTURER}>Lecturer</Option>
                <Option value={ROLES.STUDENT}>Student</Option>
                <Option value={ROLES.HOD}>HOD</Option>
                <Option value={ROLES.EXAMINER}>Examiner</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      );
    }
    return (
      <>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Please select the role!" }]}
            >
              <Select placeholder="Select role">
                <Option value={ROLES.ADMIN}>Admin</Option>
                <Option value={ROLES.LECTURER}>Lecturer</Option>
                <Option value={ROLES.STUDENT}>Student</Option>
                <Option value={ROLES.HOD}>HOD</Option>
                <Option value={ROLES.EXAMINER}>Examiner</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        {commonFields}
        {selectedRole === ROLES.LECTURER && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="department"
                  label="Department"
                  rules={[
                    { required: true, message: "Please input the department!" },
                    {
                      min: 1,
                      message: "Department cannot be empty!",
                    },
                    {
                      max: 100,
                      message: "Department must not exceed 100 characters!",
                    },
                  ]}
                >
                  <Input placeholder="Enter department" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="specialization"
                  label="Specialization"
                  rules={[
                    { required: true, message: "Please input the specialization!" },
                    {
                      min: 1,
                      message: "Specialization cannot be empty!",
                    },
                    {
                      max: 100,
                      message: "Specialization must not exceed 100 characters!",
                    },
                  ]}
                >
                  <Input placeholder="Enter specialization" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </>
    );
  };
  return (
    <Modal
      title={
        editingUser ? `Edit User: ${editingUser.fullName}` : "Create New User"
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText={editingUser ? "Update" : "Create"}
      confirmLoading={confirmLoading}
      centered
      width={900}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        name="create_user_form"
        initialValues={{ remember: true }}
      >
        {renderFormFields()}
      </Form>
    </Modal>
  );
};