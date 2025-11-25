"use client";

import React, { useState } from "react";
import { Modal, Steps, Typography, Space, Spin, Alert } from "antd";
import { Button } from "../ui/Button";
import { PreviewTable } from "./PreviewTable";
import styles from "./PreviewPlanModal.module.css";

const { Title, Text } = Typography;
const { Step } = Steps;

interface CourseElementData {
  key: string;
  CourseCode: string;
  SemesterCode: string;
  AcademicYear: string;
  StartDate: string;
  EndDate: string;
  SemesterNote: string;
  CourseName: string;
  CourseDescription: string;
  CourseElementName: string;
  CourseElementDescription: string;
  CourseElementWeight: string;
  LecturerAccountCode: string;
}
interface ClassStudentData {
  key: string;
  ClassCode: string;
  ClassDescription: string;
  SemesterCourseId: string;
  LecturerAccountCode: string;
  StudentAccountCode: string;
  EnrollmentDescription: string;
}

export interface PreviewData {
  semesterPlan: CourseElementData[];
  classRoster: ClassStudentData[];
}

const emptyPreviewData: PreviewData = {
  semesterPlan: [],
  classRoster: [],
};

export interface PreviewPlanModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  previewData: PreviewData | null;
  isLoading: boolean;
  error?: string | null;
}
const semesterPlanColumns = [
  { title: "SemesterCode", dataIndex: "SemesterCode", key: "SemesterCode" },
  { title: "AcademicYear", dataIndex: "AcademicYear", key: "AcademicYear" },
  { title: "SemesterNote", dataIndex: "SemesterNote", key: "SemesterNote" },
  { title: "StartDate", dataIndex: "StartDate", key: "StartDate" },
  { title: "EndDate", dataIndex: "EndDate", key: "EndDate" },
  { title: "CourseCode", dataIndex: "CourseCode", key: "CourseCode" },
  { title: "CourseName", dataIndex: "CourseName", key: "CourseName" },
  {
    title: "CourseElementName",
    dataIndex: "CourseElementName",
    key: "CourseElementName",
  },
  {
    title: "CourseElementDescription",
    dataIndex: "CourseElementDescription",
    key: "CourseElementDescription",
  },
  {
    title: "CourseElementWeight",
    dataIndex: "CourseElementWeight",
    key: "CourseElementWeight",
  },
  {
    title: "LecturerAccountCode",
    dataIndex: "LecturerAccountCode",
    key: "LecturerAccountCode",
  },
];

const classRosterColumns = [
  { title: "ClassCode", dataIndex: "ClassCode", key: "ClassCode" },
  {
    title: "ClassDescription",
    dataIndex: "ClassDescription",
    key: "ClassDescription",
  },
  {
    title: "SemesterCourseId",
    dataIndex: "SemesterCourseId",
    key: "SemesterCourseId",
  },
  {
    title: "LecturerAccountCode",
    dataIndex: "LecturerAccountCode",
    key: "LecturerAccountCode",
  },
  {
    title: "StudentAccountCode",
    dataIndex: "StudentAccountCode",
    key: "StudentAccountCode",
  },
  {
    title: "EnrollmentDescription",
    dataIndex: "EnrollmentDescription",
    key: "EnrollmentDescription",
  },
];

export const PreviewPlanModal: React.FC<PreviewPlanModalProps> = ({
  open,
  onCancel,
  onConfirm,
  previewData,
  isLoading,
  error,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const finalPreviewData = previewData || emptyPreviewData;

  const {
    semesterPlan: semesterPlanDataSource,
    classRoster: classRosterDataSource,
  } = finalPreviewData;

  const steps = [
    {
      title: `1. Semester Plan Data (${
        isLoading ? "..." : semesterPlanDataSource.length
      } items)`,
      content: (
        <Space direction="vertical" style={{ width: "100%", gap: "15px" }}>
          <Title level={4}>Semester Plan Details</Title>
          {semesterPlanDataSource.length === 0 && previewData !== null ? (
            <Text type="warning">
              No semester plan data found in the uploaded file.
            </Text>
          ) : (
            <PreviewTable
              columns={semesterPlanColumns}
              dataSource={semesterPlanDataSource}
            />
          )}
        </Space>
      ),
    },
    {
      title: `2. Class List Data (${
        isLoading ? "..." : classRosterDataSource.length
      } items)`,
      content: (
        <Space direction="vertical" style={{ width: "100%", gap: "15px" }}>
          <Title level={4}>Class List Details</Title>
          {classRosterDataSource.length === 0 && previewData !== null ? (
            <Text type="warning">
              No class List data found in the uploaded file.
            </Text>
          ) : (
            <PreviewTable
              columns={classRosterColumns}
              dataSource={classRosterDataSource}
            />
          )}
        </Space>
      ),
    },
  ];
  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    onCancel();
    setTimeout(() => {
      setCurrentStep(0);
    }, 300);
  };

  const renderFooter = () => {
    if (currentStep < steps.length - 1) {
      return (
        <Space>
          {currentStep > 0 && <Button onClick={handleBack}>Back</Button>}
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleNext} disabled={isLoading}>
            Continue
          </Button>
        </Space>
      );
    }
    return (
      <Space>
        <Button onClick={handleBack} disabled={isLoading}>
          Back
        </Button>
        <Button variant="primary" onClick={onConfirm} loading={isLoading}>
          Close
        </Button>
      </Space>
    );
  };

  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0, textAlign: "center" }}>
          Preview semester plan
        </Title>
      }
      open={open}
      onCancel={handleClose}
      footer={renderFooter()}
      width={1000}
    >
      {error && !isLoading && (
        <Alert
          message="Preview Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: "20px" }}
        />
      )}

      <Steps current={currentStep} className={styles.steps}>
        {steps.map((item) => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>
      {isLoading ? (
        <div style={{ padding: "50px", textAlign: "center" }}>
          <Spin />
          <Text style={{ marginTop: 10, display: "block" }}>
            Reading Excel file...
          </Text>
        </div>
      ) : (
        <div className={styles.stepContent}>{steps[currentStep].content}</div>
      )}
    </Modal>
  );
};