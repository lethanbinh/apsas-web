"use client";

import React, { useState, useEffect } from "react";
import { Modal, Space, Typography, Upload, App, Spin, Alert, Select } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./CreatePlanModal.module.css";
import { adminService } from "@/services/adminService";
import { PreviewData, PreviewPlanModal } from "./PreviewPlanModal";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface SemesterCourse {
  id: number;
  semesterId: number;
  courseId: number;
  course: {
    id: number;
    name: string;
    code: string;
    description: string;
  };
}

interface ImportClassStudentModalProps {
  open: boolean;
  onCancel: () => void;
  onImport: () => void;
  semesterCode: string;
  semesterCourses: SemesterCourse[];
}

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

export const ImportClassStudentModal: React.FC<ImportClassStudentModalProps> = ({
  open,
  onCancel,
  onImport,
  semesterCode,
  semesterCourses,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [livePreviewData, setLivePreviewData] = useState<PreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { notification } = App.useApp();

  const handleDownloadTemplate = async () => {
    try {
      const blob = await adminService.downloadClassStudentTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "ClassStudentTemplate.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download class student template error:", error);
      notification.error({
        message: "Download Failed",
        description: "Failed to download template file.",
        placement: "topRight",
      });
    }
  };

  const handleImport = async () => {
    if (fileList.length === 0) {
      notification.warning({
        message: "No File Selected",
        description: "Please select a file to import.",
        placement: "topRight",
      });
      return;
    }

    setIsImporting(true);
    try {
      const classFormData = new FormData();
      if (fileList[0]) {
        const file = fileList[0].originFileObj || fileList[0];
        classFormData.append("file", file as File);
      } else {
        setIsImporting(false);
        return;
      }

      const classResponse = await adminService.uploadClassStudentData(
        semesterCode,
        classFormData
      );

      if (classResponse.warnings && classResponse.warnings.length > 0) {
        classResponse.warnings.forEach((warning: string) => {
          console.warn(warning);
        });
      }

      notification.success({
        message: "Import Successful",
        description: "Class student data has been imported successfully.",
        placement: "topRight",
      });

      handleClose();
      onImport();
    } catch (error: any) {
      console.error("Error importing class student data:", error);
      notification.error({
        message: "Import Failed",
        description: error.message || "Failed to import class student data.",
        placement: "topRight",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    onCancel();
    setTimeout(() => {
      setFileList([]);
      setLivePreviewData(null);
      setPreviewError(null);
    }, 300);
  };

  const handlePreview = async () => {
    if (fileList.length === 0) {
      return;
    }

    setIsPreviewLoading(true);
    setIsPreviewModalOpen(true);
    setPreviewError(null);

    try {
      const fileRoster = getNativeFile(fileList[0]);
      const rosterBuffer = await readFileAsArrayBuffer(fileRoster);
      const rosterWb = XLSX.read(rosterBuffer);
      const rosterSheet = rosterWb.Sheets[rosterWb.SheetNames[0]];

      if (!rosterSheet) {
        throw new Error("The Excel file is empty or invalid.");
      }

      const rosterJson = parseExcelSheet(rosterSheet);

      if (!rosterJson || rosterJson.length === 0) {
        throw new Error("The Excel file is empty or has no data.");
      }

      const classRosterKeys = [
        "ClassCode",
        "ClassDescription",
        "SemesterCourseId",
        "LecturerAccountCode",
        "StudentAccountCode",
        "EnrollmentDescription",
      ];

      const classRosterData = mapToKeys(rosterJson, classRosterKeys);

      setLivePreviewData({
        semesterPlan: [],
        classRoster: classRosterData as any,
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

  const uploadProps = {
    fileList: fileList,
    maxCount: 1,
    accept: ".xlsx, .xls",
    showUploadList: false,
    onRemove: () => setFileList([]),
    beforeUpload: (file: UploadFile) => {
      setFileList([file]);
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

  return (
    <>
      <Modal
        title={
          <Title level={3} style={{ margin: 0 }}>
            Import Class Student Data
          </Title>
        }
        open={open}
        onCancel={handleClose}
        footer={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleImport}
              loading={isImporting}
              disabled={fileList.length === 0}
            >
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </Space>
        }
        width={700}
      >
        <div style={{ marginBottom: "24px" }}>
          <Text type="secondary">
            Import class student data for semester: <strong>{semesterCode}</strong>
          </Text>
          <div style={{ marginTop: "12px" }}>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              Available Semester Courses: {semesterCourses.length}
            </Text>
            {semesterCourses.length > 0 && (
              <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                {semesterCourses.map((sc) => (
                  <div key={sc.id} style={{ fontSize: "12px", marginBottom: "4px" }}>
                    • {sc.course.code} - {sc.course.name} (ID: {sc.id})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
              onClick={handlePreview}
              style={{ borderColor: "#6D28D9", color: "#6D28D9" }}
              disabled={fileList.length === 0}
            >
              Preview Class Student Data
            </Button>
          </Space>
        </div>

        <div>
          <Title level={5}>Upload Class Student File</Title>
          <Dragger {...uploadProps} className={styles.dragger}>
            {fileList.length > 0 ? (
              <div className={styles.filePreview}>
                <FileExcelOutlined className={styles.filePreviewIcon} />
                <p style={fileNameStyle} title={fileList[0].name}>
                  {fileList[0].name}
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
};

