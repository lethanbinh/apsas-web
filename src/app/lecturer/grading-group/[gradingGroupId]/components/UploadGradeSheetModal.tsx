import { Button, Modal, Space, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import type { UploadFile } from "antd/es/upload/interface";

const { Text } = Typography;

interface UploadGradeSheetModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  uploadFile: File | null;
  uploadFileList: UploadFile[];
  onFileChange: (file: File | null, fileList: UploadFile[]) => void;
}

export function UploadGradeSheetModal({
  visible,
  onCancel,
  onOk,
  confirmLoading,
  uploadFile,
  uploadFileList,
  onFileChange,
}: UploadGradeSheetModalProps) {
  return (
    <Modal
      title="Upload Grade Sheet"
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      okText="Upload"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text>Select Excel file to upload:</Text>
        <Upload
          fileList={uploadFileList}
          beforeUpload={(file) => {
            onFileChange(file, [{
              uid: file.name,
              name: file.name,
              status: 'done',
            }]);
            return false; // Prevent auto upload
          }}
          accept=".xlsx,.xls"
          maxCount={1}
          onRemove={() => {
            onFileChange(null, []);
          }}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
        {uploadFile && (
          <Text type="secondary">Selected: {uploadFile.name}</Text>
        )}
      </Space>
    </Modal>
  );
}

