"use client";

import React from "react";
import { Modal, Typography, Space, Spin, Alert } from "antd";
import { Button } from "../ui/Button";
import { PreviewTable } from "./PreviewTable";

const { Title, Text } = Typography;

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
  ElementType: string;
  CourseElementWeight: string;
  AssignedLecturerAccountCode: string;
}
interface ClassStudentData {
  key: string;
  ClassCode: string;
  ClassDescription: string;
  AssignedLecturerAccountCode: string;
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
  { title: "CourseDescription", dataIndex: "CourseDescription", key: "CourseDescription" },
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
    title: "ElementType",
    dataIndex: "ElementType",
    key: "ElementType",
  },
  {
    title: "CourseElementWeight",
    dataIndex: "CourseElementWeight",
    key: "CourseElementWeight",
  },
  {
    title: "AssignedLecturerAccountCode",
    dataIndex: "AssignedLecturerAccountCode",
    key: "AssignedLecturerAccountCode",
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
    title: "AssignedLecturerAccountCode",
    dataIndex: "AssignedLecturerAccountCode",
    key: "AssignedLecturerAccountCode",
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
  const finalPreviewData = previewData || emptyPreviewData;

  const {
    semesterPlan: semesterPlanDataSource,
    classRoster: classRosterDataSource,
  } = finalPreviewData;


  const hasSemesterPlan = semesterPlanDataSource.length > 0;
  const hasClassRoster = classRosterDataSource.length > 0;

  const handleClose = () => {
    onCancel();
  };

  const renderContent = () => {
    if (hasSemesterPlan) {
      return (
        <Space direction="vertical" style={{ width: "100%", gap: "15px" }}>
          <Title level={4}>
            Semester Plan Data ({semesterPlanDataSource.length} items)
          </Title>
          <PreviewTable
            columns={semesterPlanColumns}
            dataSource={semesterPlanDataSource}
          />
        </Space>
      );
    }

    if (hasClassRoster) {
      return (
        <Space direction="vertical" style={{ width: "100%", gap: "15px" }}>
          <Title level={4}>
            Class Student Data ({classRosterDataSource.length} items)
          </Title>
          <PreviewTable
            columns={classRosterColumns}
            dataSource={classRosterDataSource}
          />
        </Space>
      );
    }

    return (
      <Text type="warning">
        No data found in the uploaded file.
      </Text>
    );
  };

  const getModalTitle = () => {
    if (hasSemesterPlan) {
      return "Preview Semester Plan";
    }
    if (hasClassRoster) {
      return "Preview Class Student Data";
    }
    return "Preview Data";
  };

  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0, textAlign: "center" }}>
          {getModalTitle()}
        </Title>
      }
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>Close</Button>
        </Space>
      }
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

      {isLoading ? (
        <div style={{ padding: "50px", textAlign: "center" }}>
          <Spin />
          <Text style={{ marginTop: 10, display: "block" }}>
            Reading Excel file...
          </Text>
        </div>
      ) : (
        <div style={{ marginTop: "20px" }}>{renderContent()}</div>
      )}
    </Modal>
  );
};