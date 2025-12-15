"use client";

import { UploadOutlined } from "@ant-design/icons";
import type { UploadChangeParam, UploadFile } from "antd/es/upload/interface";
import { App, Button, Form, Input, Modal, Space, Upload } from "antd";
import { useEffect } from "react";

interface UploadFileModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: (values: { name: string; databaseName?: string; file: File }) => void;
  fileType: 0 | 1 | 2;
  templateType: number;
  fileList: UploadFile[];
  onFileListChange: (fileList: UploadFile[]) => void;
}

export const UploadFileModal = ({
  open,
  onCancel,
  onFinish,
  fileType,
  templateType,
  fileList,
  onFileListChange,
}: UploadFileModalProps) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();

  useEffect(() => {
    if (open) {
      form.resetFields();
      onFileListChange([]);
    }
  }, [open, form, onFileListChange]);

  const handleFileChange = (info: UploadChangeParam) => {
    onFileListChange(info.fileList);

    if (info.fileList.length > 0 && info.fileList[0].originFileObj) {
      const fileName = info.fileList[0].name;
      form.setFieldsValue({ name: fileName });
    } else {
      form.setFieldsValue({ name: "" });
    }
  };

  const handleSubmit = (values: { name: string; databaseName?: string }) => {
    if (fileList.length === 0) {
      notification.warning({ message: "Please select a file" });
      return;
    }
    const file = fileList[0].originFileObj as File;
    onFinish({
      name: values.name,
      databaseName: values.databaseName,
      file: file,
    });
  };

  const title =
    fileType === 0
      ? "Upload Database File"
      : fileType === 1
      ? "Upload Postman File"
      : "Upload Custom File";

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="File"
          required
          rules={[{ required: true, message: "Please select a file" }]}
        >
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={() => false}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          label="Name"
          name="name"
          required
          rules={[{ required: true, message: "Please enter file name" }]}
        >
          <Input placeholder="Enter file name" />
        </Form.Item>

        {fileType === 0 && templateType === 1 && (
          <Form.Item
            label="Database Name"
            name="databaseName"
            required
            rules={[{ required: true, message: "Please enter database name" }]}
          >
            <Input placeholder="Enter database name" />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" disabled={fileList.length === 0}>
              Upload
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

