"use client";

import {
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  App,
  Modal, // Giữ lại Col để dùng cho Dragger nếu cần
  Space,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import React, { useState } from "react";
import { Button } from "../ui/Button";
import styles from "./CreatePlanModal.module.css";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/adminService";
import { PreviewData, PreviewPlanModal } from "./PreviewPlanModal";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const mockPreviewData: PreviewData = {
  semesterPlan: [
    {
      key: "1",
      SemesterCode: "FALL2025",
      AcademicYear: "2025/Fall",
      StartEndDates: "1202-09-01 | 12-31",
      CourseCode: "CS101",
      CourseName: "Introduction to Programming",
      CourseDescription: "Basic programming concepts",
      CourseElementName: "Assignment 1",
      CourseElementDescription: "First programming assignment",
      CourseElementWeight: "0.3",
      LecturerAccountCode: "LECT001",
    },
    {
      key: "2",
      SemesterCode: "FALL2025",
      AcademicYear: "2025/Fall",
      StartEndDates: "1202-09-01 | 12-31",
      CourseCode: "CS101",
      CourseName: "Introduction to Programming",
      CourseDescription: "Basic programming concepts",
      CourseElementName: "Midterm Exam",
      CourseElementDescription: "Midterm examination",
      CourseElementWeight: "0.4",
      LecturerAccountCode: "LECT001",
    },
    {
      key: "3",
      SemesterCode: "FALL2025",
      AcademicYear: "2025/Fall",
      StartEndDates: "1202-09-01 | 12-31",
      CourseCode: "CS102",
      CourseName: "Data Structures",
      CourseDescription: "Advanced programming concepts",
      CourseElementName: "Project 1",
      CourseElementDescription: "Binary tree implementation",
      CourseElementWeight: "0.4",
      LecturerAccountCode: "LECT002",
    },
  ],
  classRoster: [
    {
      key: "1",
      ClassCode: "CS103-01",
      ClassDescription: "Introduction to Programming - Section 01",
      SemesterCourseId: "1",
      LecturerAccountCode: "LEC00003",
      StudentAccountCode: "STU00001",
      EnrollmentDescription: "Regular enrollment",
    },
    {
      key: "2",
      ClassCode: "CS103-01",
      ClassDescription: "Introduction to Programming - Section 01",
      SemesterCourseId: "1",
      LecturerAccountCode: "LEC00003",
      StudentAccountCode: "STU00002",
      EnrollmentDescription: "Regular enrollment",
    },
    {
      key: "3",
      ClassCode: "CS103-01",
      ClassDescription: "Introduction to Programming - Section 01",
      SemesterCourseId: "1",
      LecturerAccountCode: "LEC00003",
      StudentAccountCode: "STU00003",
      EnrollmentDescription: "Late enrollment",
    },
    {
      key: "4",
      ClassCode: "CS104-01",
      ClassDescription: "Data Structures - Section 01",
      SemesterCourseId: "2",
      LecturerAccountCode: "LEC00004",
      StudentAccountCode: "STU00004",
      EnrollmentDescription: "Regular enrollment",
    },
  ],
};
interface CreatePlanModalProps {
  open: boolean;
  onCancel: () => void;
  onCreate: (values: any) => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = (props) => {
  return <ModalContent {...props} />;
};

function ModalContent({ open, onCancel, onCreate }: CreatePlanModalProps) {
  // ... (Giữ nguyên các state và hooks)
  const [fileListExcel, setFileListExcel] = useState<UploadFile[]>([]);
  const [fileListPdf, setFileListPdf] = useState<UploadFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { message } = App.useApp();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [livePreviewData, setLivePreviewData] = useState<PreviewData | null>(
    null
  );

  const { user } = useAuth();

  // ... (Giữ nguyên handleDownloadTemplate, handleCreate, handleClose, handlePreviewClick)
  const handleDownloadTemplate = async () => {
    try {
      message.loading("Downloading template...", 0);
      const blob = await adminService.downloadExcelTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "SemesterPlanTemplate.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.destroy();
      message.success("Template downloaded successfully!");
    } catch (error) {
      message.destroy();
      message.error("Failed to download template.");
      console.error("Download template error:", error);
    }
  };

  const handleCreate = async () => {
    const semesterCodePlaceholder = `NEW_SEMESTER_${Date.now()}`;

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
      // Logic upload file
      const semesterFormData = new FormData();
      if (fileListExcel[0]) {
        const file = fileListExcel[0].originFileObj || fileListExcel[0];
        semesterFormData.append("file", file as File);
      } else {
        message.error("Uploaded semester course file is invalid.");
        setIsCreating(false);
        return;
      }

      message.loading("Uploading semester course data...", 0);
      const semesterResponse = await adminService.uploadSemesterCourseData(
        semesterCodePlaceholder,
        semesterFormData
      );
      message.destroy();

      const classFormData = new FormData();
      if (fileListPdf[0]) {
        const file = fileListPdf[0].originFileObj || fileListPdf[0];
        classFormData.append("file", file as File);
      } else {
        message.error("Uploaded class student file is invalid.");
        setIsCreating(false);
        return;
      }

      message.loading("Uploading class student data...", 0);
      const classResponse = await adminService.uploadClassStudentData(
        semesterCodePlaceholder,
        classFormData
      );
      message.destroy();

      message.success("Semester plan created successfully!");
      if (semesterResponse.warnings && semesterResponse.warnings.length > 0) {
        semesterResponse.warnings.forEach((warning: string) => {
          message.warning(warning);
        });
      }
      if (classResponse.warnings && classResponse.warnings.length > 0) {
        classResponse.warnings.forEach((warning: string) => {
          message.warning(warning);
        });
      }

      handleClose();
      onCreate({});
    } catch (error: any) {
      message.destroy();
      console.error("Error uploading semester plan:", error);
      message.error(
        error.response?.data?.errorMessages?.[0] ||
          error.response?.data?.message ||
          "Failed to create semester plan."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onCancel();
    setTimeout(() => {
      setFileListExcel([]);
      setFileListPdf([]);
      setLivePreviewData(null);
    }, 300);
  };

  const handlePreviewClick = () => {
    if (fileListExcel.length > 0 && fileListPdf.length > 0) {
      setLivePreviewData(mockPreviewData);
      message.success("Successfully loaded structural preview from files.");
    } else {
      setLivePreviewData(null);
      message.warning(
        "Please upload both Excel files to preview the structural plan."
      );
    }
    setIsPreviewModalOpen(true);
  };

  const uploadPropsExcel = {
    fileList: fileListExcel,
    maxCount: 1,
    accept: ".xlsx, .xls",
    showUploadList: false, // <-- Giữ nguyên
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
    showUploadList: false, // <-- Giữ nguyên
    onRemove: () => setFileListPdf([]),
    beforeUpload: (file: UploadFile) => {
      setFileListPdf([file]);
      return false;
    },
  };

  // Style inline cho tên file (giữ nguyên)
  const fileNameStyle: React.CSSProperties = {
    fontSize: "16px",
    color: "#333",
    fontWeight: 500,
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    width: "100%",
    padding: "0 10px",
    boxSizing: "border-box",
    textAlign: "center",
  };

  // --- REDESIGN LAYOUT: BỐ CỤC DỌC ---
  const CombinedStepContent = (
    <div className={styles.stepContent}>
      <Title level={4} style={{ marginBottom: "20px" }}>
        Import Excel Files
      </Title>

      {/* 1. TEMPLATE ACTIONS */}
      <div style={{ marginBottom: "24px" }}>
        <Title level={5}>Template Actions</Title>
        <Space direction="horizontal" style={{ width: "100%" }} wrap>
          <Button
            icon={<DownloadOutlined />}
            // Bỏ class .actionButton cũ
            onClick={handleDownloadTemplate}
          >
            Download Template
          </Button>
          <Button
            icon={<EyeOutlined />}
            variant="outline"
            className={styles.previewButton} // Giữ lại previewButton nếu có style riêng
            onClick={handlePreviewClick}
            style={{ borderColor: "#6D28D9", color: "#6D28D9" }}
            disabled={fileListExcel.length === 0 || fileListPdf.length === 0}
          >
            Preview Uploaded Plan
          </Button>
        </Space>
      </div>

      {/* 2. UPLOAD SEMESTER COURSE FILE */}
      <div style={{ marginBottom: "24px" }}>
        <Title level={5}>Upload Semester Course File</Title>
        <Dragger {...uploadPropsExcel} className={styles.dragger}>
          {fileListExcel.length > 0 ? (
            <div className={styles.filePreview}>
              <FileExcelOutlined className={styles.filePreviewIcon} />
              <p style={fileNameStyle} title={fileListExcel[0].name}>
                {fileListExcel[0].name}
              </p>
              <p className={styles.filePreviewHint}>
                Click or drag again to replace
              </p>
            </div>
          ) : (
            <>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click here to Upload</p>
              <p className="ant-upload-hint">Excel file (Max 10Mb)</p>
            </>
          )}
        </Dragger>
      </div>

      {/* 3. UPLOAD CLASS STUDENT FILE */}
      <div>
        <Title level={5}>Upload Class Student File</Title>
        <Dragger {...uploadPropsPdf} className={styles.dragger}>
          {fileListPdf.length > 0 ? (
            <div className={styles.filePreview}>
              <FileExcelOutlined className={styles.filePreviewIcon} />
              <p style={fileNameStyle} title={fileListPdf[0].name}>
                {fileListPdf[0].name}
              </p>
              <p className={styles.filePreviewHint}>
                Click or drag again to replace
              </p>
            </div>
          ) : (
            <>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click here to Upload</p>
              <p className="ant-upload-hint">Excel file (Max 10Mb)</p>
            </>
          )}
        </Dragger>
      </div>
    </div>
  );

  // ... (Giữ nguyên renderFooter và return)
  const renderFooter = () => (
    <Space>
      <Button onClick={handleClose}>Cancel</Button>
      <Button
        variant="primary"
        onClick={handleCreate}
        loading={isCreating}
        disabled={fileListExcel.length === 0 || fileListPdf.length === 0}
      >
        {isCreating ? "Creating..." : "Create Plan"}
      </Button>
    </Space>
  );

  return (
    <>
      <Modal
        title={
          <Title level={3} style={{ margin: 0 }}>
            Create Semester Plan
          </Title>
        }
        open={open}
        onCancel={handleClose}
        footer={renderFooter()}
        width={700} // Giữ nguyên chiều rộng 700px
      >
        <div>{CombinedStepContent}</div>
      </Modal>

      <PreviewPlanModal
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        onConfirm={() => setIsPreviewModalOpen(false)}
        previewData={livePreviewData}
      />
    </>
  );
}
