"use client";

import React, { useState, useEffect } from "react";
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
  FilePdfOutlined,
} from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./CreatePlanModal.module.css";
import { PreviewPlanModal } from "./PreviewPlanModal"; // Import Modal Preview
import { adminService } from '@/services/adminService'; // Import adminService
import { Semester } from '@/types'; // Import Semester type
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Step } = Steps;
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
  const [fileListExcel, setFileListExcel] = useState<UploadFile[]>([]);
  const [fileListPdf, setFileListPdf] = useState<UploadFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { message } = App.useApp();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false); // State cho Modal Preview
  const [semesterOptions, setSemesterOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState<boolean>(true);
  const [semesterError, setSemesterError] = useState<string | null>(null);
  
  // Get current user from auth
  const { user } = useAuth();

  // Log user info when component mounts
  useEffect(() => {
    console.log('👤 Current user in CreatePlanModal:', user);
    console.log('👤 User role:', user?.role);
    console.log('👤 Is authenticated:', user !== null);
    
    if (user) {
      const roleNames = ['Student', 'Lecturer', 'Admin', 'HOD'];
      console.log('👤 User role name:', roleNames[user.role] || 'Unknown');
    }
  }, [user]);

  // Fetch semesters on component mount
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const response = await adminService.getPaginatedSemesters(1, 10); // Fetch first 10 semesters
        const options = response.map(s => ({ value: s.semesterCode, label: s.semesterCode }));
        setSemesterOptions(options);
      } catch (err: any) {
        console.error("Failed to fetch semesters:", err);
        setSemesterError(err.message || 'Failed to load semesters');
      } finally {
        setLoadingSemesters(false);
      }
    };
    fetchSemesters();
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      message.loading('Downloading template...', 0);
      const blob = await adminService.downloadExcelTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'SemesterPlanTemplate.xlsx'); // You can change the filename
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.destroy(); // Hide loading message
      message.success('Template downloaded successfully!');
    } catch (error) {
      message.destroy(); // Hide loading message
      message.error('Failed to download template.');
      console.error('Download template error:', error);
    }
  };

  const handleContinue = () => {
    setCurrentStep(1);
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const handleCreate = async () => {
    if (!selectedSemester) {
      message.error("Please select a semester.");
      return;
    }
    if (fileListExcel.length === 0) {
      message.error("Please upload semester course file.");
      return;
    }
    if (fileListPdf.length === 0) {
      message.error("Please upload class student file.");
      return;
    }

    setIsCreating(true);
    try {
      // Upload semester course data
      console.log('Starting upload semester course data...');
      console.log('fileListExcel:', fileListExcel);
      console.log('fileListExcel[0]:', fileListExcel[0]);
      console.log('fileListExcel[0] type:', typeof fileListExcel[0]);
      
      const semesterFormData = new FormData();
      if (fileListExcel[0]) {
        const file = fileListExcel[0].originFileObj || fileListExcel[0];
        console.log('Actual file object:', file);
        console.log('File is File instance:', file instanceof File);
        
        // Type assertion for FormData.append
        semesterFormData.append('file', file as File);
        console.log('Semester course file added to FormData');
        console.log('FormData entries:');
        for (let pair of semesterFormData.entries()) {
          console.log(pair[0] + ': ' + pair[1]);
        }
      } else {
        message.error("Uploaded semester course file is invalid.");
        setIsCreating(false);
        return;
      }

      message.loading('Uploading semester course data...', 0);
      const semesterResponse = await adminService.uploadSemesterCourseData(selectedSemester as string, semesterFormData);
      message.destroy();
      console.log('Semester course data uploaded successfully!', semesterResponse);

      // Upload class student data
      console.log('Starting upload class student data...');
      console.log('fileListPdf:', fileListPdf);
      console.log('fileListPdf[0]:', fileListPdf[0]);
      
      const classFormData = new FormData();
      if (fileListPdf[0]) {
        const file = fileListPdf[0].originFileObj || fileListPdf[0];
        console.log('Actual file object:', file);
        console.log('File is File instance:', file instanceof File);
        
        // Type assertion for FormData.append
        classFormData.append('file', file as File);
        console.log('Class student file added to FormData');
        console.log('FormData entries:');
        for (let pair of classFormData.entries()) {
          console.log(pair[0] + ': ' + pair[1]);
        }
      } else {
        message.error("Uploaded class student file is invalid.");
        setIsCreating(false);
        return;
      }

      message.loading('Uploading class student data...', 0);
      const classResponse = await adminService.uploadClassStudentData(selectedSemester as string, classFormData);
      message.destroy();
      console.log('Class student data uploaded successfully!', classResponse);

      console.log('All files uploaded successfully!');
      message.success("Semester plan created successfully!");

      // Show warnings if any
      if (semesterResponse.warnings && semesterResponse.warnings.length > 0) {
        console.warn('Semester course data warnings:', semesterResponse.warnings);
        semesterResponse.warnings.forEach((warning: string) => {
          message.warning(warning);
        });
      }
      if (classResponse.warnings && classResponse.warnings.length > 0) {
        console.warn('Class student data warnings:', classResponse.warnings);
        classResponse.warnings.forEach((warning: string) => {
          message.warning(warning);
        });
      }

      handleClose();
    } catch (error: any) {
      message.destroy();
      console.error("Error uploading semester plan:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
      });
      
      // Log full error response
      if (error.response) {
        console.error("Full error response:", error.response);
        console.error("Error response data:", error.response.data);
      }
      
      message.error(error.response?.data?.errorMessages?.[0] || error.response?.data?.message || "Failed to create semester plan.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onCancel();
    setTimeout(() => {
      setCurrentStep(0);
      setSelectedSemester(undefined);
      setFileListExcel([]);
      setFileListPdf([]);
    }, 300);
  };

  const uploadPropsExcel = {
    fileList: fileListExcel,
    maxCount: 1,
    accept: ".xlsx, .xls",
    showUploadList: false,
    onRemove: () => setFileListExcel([]),
    beforeUpload: (file: UploadFile) => {
      setFileListExcel([file]);
      return false;
    },
  };

  const uploadPropsPdf = {
    fileList: fileListPdf,
    maxCount: 1,
    accept: ".xlsx, .xls",
    showUploadList: false,
    onRemove: () => setFileListPdf([]),
    beforeUpload: (file: UploadFile) => {
      setFileListPdf([file]);
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
            placeholder={loadingSemesters ? "Loading semesters..." : "Select semester..."}
            options={semesterOptions}
            value={selectedSemester}
            onChange={setSelectedSemester}
            style={{ width: "100%" }}
            disabled={loadingSemesters || !!semesterError}
          />
          {semesterError && <Text type="danger">Error: {semesterError}</Text>}
        </div>
      ),
    },
    {
      title: "Import Excel",
      content: (
        <div className={styles.stepContent}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Title level={5}>Semester plan</Title>
              <Button
                icon={<DownloadOutlined />}
                className={styles.actionButton}
                onClick={handleDownloadTemplate}
              >
                Download Template
              </Button>
              <Button
                icon={<EyeOutlined />}
                variant="outline"
                className={`${styles.actionButton} ${styles.previewButton}`}
                onClick={() => setIsPreviewModalOpen(true)}
              >
                Preview
              </Button>
            </Col>
            <Col xs={24} md={8}>
              <Title level={5}>Add Semester course file</Title>
              <Dragger {...uploadPropsExcel} className={styles.dragger}>
                {fileListExcel.length > 0 ? (
                  <>
                    <p className="ant-upload-drag-icon">
                      <FileExcelOutlined style={{ color: "#00A86B" }} />
                    </p>
                    <p className="ant-upload-text">{fileListExcel[0].name}</p>
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
            <Col xs={24} md={8}>
              <Title level={5}>Add Class student file</Title>
              <Dragger {...uploadPropsPdf} className={styles.dragger}>
                {fileListPdf.length > 0 ? (
                  <>
                    <p className="ant-upload-drag-icon">
                      <FileExcelOutlined style={{ color: "#00A86B" }} />
                    </p>
                    <p className="ant-upload-text">{fileListPdf[0].name}</p>
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
              disabled={fileListExcel.length === 0 || fileListPdf.length === 0}
            >
              {isCreating ? 'Uploading...' : 'Create plan'}
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
        previewData={null}
      />
    </>
  );
}
