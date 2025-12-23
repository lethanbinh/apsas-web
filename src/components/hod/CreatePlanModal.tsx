"use client";
import React, { useState } from "react";
import { Modal, Space, Typography, Upload, App, Spin, Alert, Steps } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./CreatePlanModal.module.css";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/adminService";
import { PreviewData, PreviewPlanModal } from "./PreviewPlanModal";
import * as XLSX from "xlsx";
const { Title, Text } = Typography;
const { Dragger } = Upload;
interface CreatePlanModalProps {
  open: boolean;
  onCancel: () => void;
  onCreate: (values: any) => void;
}
export const CreatePlanModal: React.FC<CreatePlanModalProps> = (props) => {
  return <ModalContent {...props} />;
};
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
const getNativeFile = (fileLike: any): File => {
  return fileLike && fileLike.originFileObj
    ? (fileLike.originFileObj as File)
    : (fileLike as File);
};
const parseExcelSheet = (sheet: XLSX.WorkSheet): any[] => {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });
};
function ModalContent({ open, onCancel, onCreate }: CreatePlanModalProps) {
  const [fileListExcel, setFileListExcel] = useState<UploadFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [livePreviewData, setLivePreviewData] = useState<PreviewData | null>(
    null
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const { user } = useAuth();
  const { notification } = App.useApp();
  const handleDownloadTemplate = async () => {
    try {
      const blob = await adminService.downloadExcelTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "SemesterPlanTemplate.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download template error:", error);
    }
  };
  const handleCreate = async () => {
    const semesterCodePlaceholder = `NEW_SEMESTER_${Date.now()}`;
    if (fileListExcel.length === 0) {
      return;
    }
    setIsCreating(true);
    try {
      const semesterFormData = new FormData();
      if (fileListExcel[0]) {
        const file = fileListExcel[0].originFileObj || fileListExcel[0];
        semesterFormData.append("file", file as File);
      } else {
        setIsCreating(false);
        return;
      }
      const semesterResponse = await adminService.uploadSemesterCourseData(
        semesterCodePlaceholder,
        semesterFormData
      );
      if (semesterResponse.warnings && semesterResponse.warnings.length > 0) {
        semesterResponse.warnings.forEach((warning: string) => {
          console.warn(warning);
        });
      }
      notification.success({
        message: "Semester Plan Created",
        description: "Semester course data has been imported successfully. You can now import class student data from the detail page.",
        placement: "topRight",
      });
      handleClose();
      onCreate({});
    } catch (error: any) {
      console.error("Error uploading semester plan:", error);
      notification.error({
        message: "Import Failed",
        description: error.message || "Failed to import semester course data.",
        placement: "topRight",
      });
    } finally {
      setIsCreating(false);
    }
  };
  const handleClose = () => {
    onCancel();
    setTimeout(() => {
      setFileListExcel([]);
      setLivePreviewData(null);
    }, 300);
  };
  const mapToKeys = (
    data: any[],
    keys: string[]
  ): { [key: string]: any }[] => {
    const headers = (data[0] || []).map((h: string) =>
      (h || "").toString().trim()
    );
    const normalize = (s: string) =>
      (s || "")
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[_-]/g, "");
    const normalizedHeaderToIndex: Record<string, number> = {};
    headers.forEach((h: string, idx: number) => {
      const n = normalize(h);
      if (!(n in normalizedHeaderToIndex)) {
        normalizedHeaderToIndex[n] = idx;
      }
    });
    const missing: string[] = [];
    const keyToIndex: Record<string, number> = {};
    keys.forEach((k) => {
      const n = normalize(k);
      const idx = normalizedHeaderToIndex[n];
      if (idx === undefined) {
        missing.push(k);
      } else {
        keyToIndex[k] = idx;
      }
    });
    if (missing.length > 0) {
      throw new Error(
        `File headers do not match template. Missing: ${missing.join(
          ", "
        )}. Found: ${headers.join(", ")}`
      );
    }
    return data.slice(1).map((row, rowIndex) => {
      const rowObject: { [key: string]: any } = {
        key: rowIndex.toString(),
      };
      keys.forEach((k) => {
        const idx = keyToIndex[k];
        rowObject[k] = row ? row[idx] : undefined;
      });
      return rowObject;
    });
  };
  const handlePreviewSemesterCourse = async () => {
    if (fileListExcel.length === 0) {
      return;
    }
    setIsPreviewLoading(true);
    setIsPreviewModalOpen(true);
    setLivePreviewData(null);
    setPreviewError(null);
    try {
      const filePlan = getNativeFile(fileListExcel[0]);
      const planBuffer = await readFileAsArrayBuffer(filePlan);
      const planWb = XLSX.read(planBuffer);
      const planSheet = planWb.Sheets[planWb.SheetNames[0]];
      if (!planSheet) {
        throw new Error("The Excel file is empty or invalid.");
      }
      const planJson = parseExcelSheet(planSheet);
      if (!planJson || planJson.length === 0) {
        throw new Error("The Excel file is empty or has no data.");
      }
      const semesterPlanKeys = [
        "SemesterCode",
        "AcademicYear",
        "SemesterNote",
        "StartDate",
        "EndDate",
        "CourseCode",
        "CourseName",
        "CourseDescription",
        "CourseElementName",
        "CourseElementDescription",
        "ElementType",
        "CourseElementWeight",
        "AssignedLecturerAccountCode",
      ];
      const semesterPlanData = mapToKeys(planJson, semesterPlanKeys);
      setLivePreviewData({
        semesterPlan: semesterPlanData as any,
        classRoster: [],
      });
      setPreviewError(null);
    } catch (err: any) {
      console.error("Error parsing Excel for preview:", err);
      const errorMessage = err.message || "Failed to parse Excel file. Please check the file format.";
      setPreviewError(errorMessage);
      setLivePreviewData({
        semesterPlan: [],
        classRoster: [],
      });
      notification.error({
        message: "Preview Error",
        description: errorMessage,
      });
    } finally {
      setIsPreviewLoading(false);
    }
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
  const stepContent = (
    <div className={styles.stepContent}>
      <div style={{ marginBottom: "24px" }}>
        <Title level={5}>Template Actions</Title>
        <Space direction="horizontal" style={{ width: "100%" }} wrap>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            Download Template
          </Button>
          <Button
            icon={<EyeOutlined />}
            variant="outline"
            className={styles.previewButton}
            onClick={handlePreviewSemesterCourse}
            style={{ borderColor: "#6D28D9", color: "#6D28D9" }}
            disabled={fileListExcel.length === 0}
          >
            Preview Semester Course Data
          </Button>
        </Space>
      </div>
      <div>
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
    </div>
  );
  const renderFooter = () => (
    <Space>
      <Button onClick={handleClose}>Cancel</Button>
      <Button
        variant="primary"
        onClick={handleCreate}
        loading={isCreating}
        disabled={fileListExcel.length === 0}
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
        width={700}
      >
        <div>{stepContent}</div>
      </Modal>
      <PreviewPlanModal
        open={isPreviewModalOpen}
        onCancel={() => {
          setIsPreviewModalOpen(false);
          setPreviewError(null);
        }}
        onConfirm={() => {
          setIsPreviewModalOpen(false);
          setPreviewError(null);
        }}
        previewData={livePreviewData}
        isLoading={isPreviewLoading}
        error={previewError}
      />
    </>
  );
}