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
  const [fileListPdf, setFileListPdf] = useState<UploadFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [livePreviewData, setLivePreviewData] = useState<PreviewData | null>(
    null
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { user } = useAuth();

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
    if (fileListPdf.length === 0) {
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

      const classFormData = new FormData();
      if (fileListPdf[0]) {
        const file = fileListPdf[0].originFileObj || fileListPdf[0];
        classFormData.append("file", file as File);
      } else {
        setIsCreating(false);
        return;
      }

      const classResponse = await adminService.uploadClassStudentData(
        semesterCodePlaceholder,
        classFormData
      );

      if (semesterResponse.warnings && semesterResponse.warnings.length > 0) {
        semesterResponse.warnings.forEach((warning: string) => {
          console.warn(warning);
        });
      }
      if (classResponse.warnings && classResponse.warnings.length > 0) {
        classResponse.warnings.forEach((warning: string) => {
          console.warn(warning);
        });
      }

      handleClose();
      onCreate({});
    } catch (error: any) {
      console.error("Error uploading semester plan:", error);
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
      setCurrentStep(0);
    }, 300);
  };

  const handleContinue = () => {
    if (fileListExcel.length > 0) {
      setCurrentStep(1);
    }
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const handlePreviewClick = async () => {
    if (fileListExcel.length === 0 || fileListPdf.length === 0) {
      console.warn(
        "Please upload both Excel files to preview the structural plan."
      );
      setLivePreviewData(null);
      setIsPreviewModalOpen(true);
      return;
    }

    setIsPreviewLoading(true);
    setIsPreviewModalOpen(true);
    setLivePreviewData(null);

    try {
      const filePlan = getNativeFile(fileListExcel[0]);
      const fileRoster = getNativeFile(fileListPdf[0]);

      const [planBuffer, rosterBuffer] = await Promise.all([
        readFileAsArrayBuffer(filePlan),
        readFileAsArrayBuffer(fileRoster),
      ]);

      const planWb = XLSX.read(planBuffer);
      const rosterWb = XLSX.read(rosterBuffer);

      const planSheet = planWb.Sheets[planWb.SheetNames[0]];
      const rosterSheet = rosterWb.Sheets[rosterWb.SheetNames[0]];

      if (!planSheet || !rosterSheet) {
        throw new Error("One of the Excel files is empty or invalid.");
      }

      const planJson = parseExcelSheet(planSheet);
      const rosterJson = parseExcelSheet(rosterSheet);

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
        "CourseElementWeight",
        "LecturerAccountCode",
      ];

      const classRosterKeys = [
        "ClassCode",
        "ClassDescription",
        "SemesterCourseId",
        "LecturerAccountCode",
        "StudentAccountCode",
        "EnrollmentDescription",
      ];

      const semesterPlanData = mapToKeys(planJson, semesterPlanKeys);
      const classRosterData = mapToKeys(rosterJson, classRosterKeys);

      setLivePreviewData({
        semesterPlan: semesterPlanData as any,
        classRoster: classRosterData as any,
      });
    } catch (err: any) {
      console.error("Error parsing Excel for preview:", err);
      setLivePreviewData(null);
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

  const uploadPropsPdf = {
    fileList: fileListPdf,
    maxCount: 1,
    accept: ".xlsx, .xls",
    showUploadList: false,
    disabled: currentStep < 1,
    onRemove: () => setFileListPdf([]),
    beforeUpload: (file: UploadFile) => {
      if (currentStep >= 1) {
        setFileListPdf([file]);
      }
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

  const steps = [
    {
      title: "Upload Semester Course File",
      content: (
        <div className={styles.stepContent}>
          <div style={{ marginBottom: "24px" }}>
            <Title level={5}>Template Actions</Title>
            <Space direction="horizontal" style={{ width: "100%" }} wrap>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                Download Template
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
      ),
    },
    {
      title: "Upload Class Student File",
      content: (
        <div className={styles.stepContent}>
          <div style={{ marginBottom: "24px" }}>
            <Title level={5}>Template Actions</Title>
            <Space direction="horizontal" style={{ width: "100%" }} wrap>
              <Button
                icon={<EyeOutlined />}
                variant="outline"
                className={styles.previewButton}
                onClick={handlePreviewClick}
                style={{ borderColor: "#6D28D9", color: "#6D28D9" }}
                disabled={fileListExcel.length === 0 || fileListPdf.length === 0}
              >
                Preview Uploaded Plan
              </Button>
            </Space>
          </div>

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
      ),
    },
  ];

  const renderFooter = () => (
    <Space>
      <Button onClick={handleClose}>Cancel</Button>
      {currentStep === 0 ? (
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={fileListExcel.length === 0}
        >
          Continue
        </Button>
      ) : (
        <>
          <Button onClick={handleBack}>Back</Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={isCreating}
            disabled={fileListExcel.length === 0 || fileListPdf.length === 0}
          >
            {isCreating ? "Creating..." : "Create Plan"}
          </Button>
        </>
      )}
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
        <Steps
          current={currentStep}
          items={steps.map((step) => ({ title: step.title }))}
          className={styles.steps}
        />
        <div>{steps[currentStep].content}</div>
      </Modal>

      <PreviewPlanModal
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        onConfirm={() => setIsPreviewModalOpen(false)}
        previewData={livePreviewData}
        isLoading={isPreviewLoading}
      />
    </>
  );
}
