"use client";

import { Modal, Space, Upload, Button, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";
import { GradingGroup } from "@/services/gradingGroupService";

const { Text } = Typography;

interface UploadGradeSheetModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (gradingGroupId: number, file: File) => void;
  gradingGroup: GradingGroup | null;
  loading?: boolean;
}

export const UploadGradeSheetModal = ({
  open,
  onCancel,
  onOk,
  gradingGroup,
  loading = false,
}: UploadGradeSheetModalProps) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);

  const handleOk = () => {
    if (!gradingGroup || !uploadFile) {
      return;
    }
    onOk(gradingGroup.id, uploadFile);

    setUploadFile(null);
    setUploadFileList([]);
  };

  const handleCancel = () => {
    setUploadFile(null);
    setUploadFileList([]);
    onCancel();
  };

  return (
    <Modal
      title="Upload Grade Sheet"
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Upload"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text>Select Excel file to upload:</Text>
        <Upload
          fileList={uploadFileList}
          beforeUpload={(file) => {
            setUploadFile(file);
            setUploadFileList([
              {
                uid: file.name,
                name: file.name,
                status: "done",
              },
            ]);
            return false;
          }}
          accept=".xlsx,.xls"
          maxCount={1}
          onRemove={() => {
            setUploadFile(null);
            setUploadFileList([]);
          }}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
        {uploadFile && <Text type="secondary">Selected: {uploadFile.name}</Text>}
      </Space>
    </Modal>
  );
};

