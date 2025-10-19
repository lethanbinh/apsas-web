"use client";

import React, { useState } from "react";
import {
  Modal,
  Steps,
  Select,
  Typography,
  Upload,
  Row,
  Col,
  Space,
  App,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./CreatePlanModal.module.css";
import { PreviewPlanModal } from "./PreviewPlanModal"; // Import Modal Preview

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Step } = Steps;

const semesterOptions = [
  { value: "Fall2025", label: "Fall2025" },
  { value: "Summer2025", label: "Summer2025" },
  { value: "Spring2025", label: "Spring2025" },
];

interface CreatePlanModalProps {
  open: boolean;
  onCancel: () => void;
  onCreate: (values: { semester: string; file: UploadFile }) => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = (props) => {
  return (
    <App>
      <ModalContent {...props} />
    </App>
  );
};

function ModalContent({ open, onCancel, onCreate }: CreatePlanModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(
    undefined
  );
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { message } = App.useApp();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false); // State cho Modal Preview

  const handleContinue = () => {
    setCurrentStep(1);
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const handleCreate = () => {
    if (fileList.length === 0) {
      message.error("Please upload an Excel file.");
      return;
    }
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      message.success("Semester plan created successfully!");
      if (selectedSemester && fileList[0]) {
        onCreate({
          semester: selectedSemester,
          file: fileList[0],
        });
      }
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    onCancel();
    setTimeout(() => {
      setCurrentStep(0);
      setSelectedSemester(undefined);
      setFileList([]);
    }, 300);
  };

  const uploadProps = {
    fileList,
    maxCount: 1,
    accept: ".xlsx, .xls",
    showUploadList: false,
    onRemove: () => setFileList([]),
    beforeUpload: (file: UploadFile) => {
      setFileList([file]);
      return false;
    },
  };

  const steps = [
    {
      title: "Choose semester",
      content: (
        <div className={styles.stepContent}>
          <Title level={4}>Select a semester</Title>
          <Select
            placeholder="Select semester..."
            options={semesterOptions}
            value={selectedSemester}
            onChange={setSelectedSemester}
            style={{ width: "100%" }}
          />
        </div>
      ),
    },
    {
      title: "Import Excel",
      content: (
        <div className={styles.stepContent}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Title level={5}>Semester plan</Title>
              <Button
                icon={<DownloadOutlined />}
                className={styles.actionButton}
              >
                Download Template
              </Button>
              <Button
                icon={<EyeOutlined />}
                variant="outline"
                className={`${styles.actionButton} ${styles.previewButton}`}
                onClick={() => setIsPreviewModalOpen(true)} // Mở Modal Preview
              >
                Preview
              </Button>
            </Col>
            <Col xs={24} md={12}>
              <Title level={5}>Add Excel file</Title>
              <Dragger {...uploadProps} className={styles.dragger}>
                {fileList.length > 0 ? (
                  <>
                    <p className="ant-upload-drag-icon">
                      <FileExcelOutlined style={{ color: "#00A86B" }} />
                    </p>
                    <p className="ant-upload-text">{fileList[0].name}</p>
                    <p className="ant-upload-hint">
                      Click or drag again to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">Click here to Upload</p>
                    <p className="ant-upload-hint">
                      Excel file must be less than 10Mb
                    </p>
                  </>
                )}
              </Dragger>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  const renderFooter = () => {
    if (currentStep === 0) {
      return (
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleContinue}
            disabled={!selectedSemester}
          >
            Continue
          </Button>
        </Space>
      );
    }
    if (currentStep === 1) {
      return (
        <Space>
          <Button onClick={handleBack}>Back</Button>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={isCreating}
            disabled={fileList.length === 0}
          >
            Create plan
          </Button>
        </Space>
      );
    }
  };

  return (
    <>
      <Modal
        title={
          <Title level={3} style={{ margin: 0 }}>
            Create semester plan
          </Title>
        }
        open={open}
        onCancel={handleClose}
        footer={renderFooter()}
        width={700}
      >
        <Steps current={currentStep} className={styles.steps}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>
        <div>{steps[currentStep].content}</div>
      </Modal>

      <PreviewPlanModal
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        onConfirm={() => setIsPreviewModalOpen(false)} // Có thể thêm logic khác ở đây nếu cần
      />
    </>
  );
}
