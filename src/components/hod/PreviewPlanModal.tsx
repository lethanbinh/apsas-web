// Tên file: components/hod/PreviewPlanModal.tsx
"use client";

import React, { useState } from "react";
import { Modal, Steps, Typography, Space } from "antd";
import { Button } from "../ui/Button";
import { PreviewTable } from "./PreviewTable";
import styles from "./PreviewPlanModal.module.css";

const { Title, Text } = Typography;
const { Step } = Steps;

// --- Dữ liệu Mock Structure (Tái cấu trúc để khớp với File Excel) ---
// Dựa trên file Semester Course Data (image_acbcdd.png)
interface CourseElementData {
    key: string;
    CourseCode: string;
    SemesterCode: string; // Thêm cột này để dễ nhận biết
    AcademicYear: string;
    StartEndDates: string;
    CourseName: string;
    CourseDescription: string;
    CourseElementName: string;
    CourseElementDescription: string;
    CourseElementWeight: string;
    LecturerAccountCode: string;
}

// Dựa trên file Class Student Data (image_acbcf9.png & image_ad3ca4.png)
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
  // Gộp thông tin Khóa học và các phần tử của nó
  semesterPlan: CourseElementData[];
  // Gộp thông tin Lớp và Sinh viên
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
}

// --- MOCK DATA THỰC TẾ DỰA TRÊN CẤU TRÚC EXCEL ---
const mockSemesterPlanData: CourseElementData[] = [
    { key: "1", SemesterCode: "FALL2025", AcademicYear: "2025/Fall", StartEndDates: "1202-09-01 | 12-31", CourseCode: "CS101", CourseName: "Intro to Programming", CourseDescription: "Basic programming concepts", CourseElementName: "Assignment 1", CourseElementDescription: "First programming assignment", CourseElementWeight: "0.3", LecturerAccountCode: "LECT001" },
    { key: "2", SemesterCode: "FALL2025", AcademicYear: "2025/Fall", StartEndDates: "1202-09-01 | 12-31", CourseCode: "CS101", CourseName: "Intro to Programming", CourseDescription: "Basic programming concepts", CourseElementName: "Midterm Exam", CourseElementDescription: "Midterm examination", CourseElementWeight: "0.4", LecturerAccountCode: "LECT001" },
    { key: "3", SemesterCode: "FALL2025", AcademicYear: "2025/Fall", StartEndDates: "1202-09-01 | 12-31", CourseCode: "CS102", CourseName: "Data Structures", CourseDescription: "Advanced programming concepts", CourseElementName: "Project 1", CourseElementDescription: "Binary tree implementation", CourseElementWeight: "0.4", LecturerAccountCode: "LECT002" },
];

const mockClassRosterData: ClassStudentData[] = [
    { key: "1", ClassCode: "CS103-01", ClassDescription: "Introduction to Programming - Section 01", SemesterCourseId: "1", LecturerAccountCode: "LEC00003", StudentAccountCode: "STU00001", EnrollmentDescription: "Regular enrollment" },
    { key: "2", ClassCode: "CS103-01", ClassDescription: "Introduction to Programming - Section 01", SemesterCourseId: "1", LecturerAccountCode: "LEC00003", StudentAccountCode: "STU00002", EnrollmentDescription: "Regular enrollment" },
    { key: "3", ClassCode: "CS103-01", ClassDescription: "Introduction to Programming - Section 01", SemesterCourseId: "1", LecturerAccountCode: "LEC00003", StudentAccountCode: "STU00003", EnrollmentDescription: "Late enrollment" },
    { key: "4", ClassCode: "CS104-01", ClassDescription: "Data Structures - Section 01", SemesterCourseId: "2", LecturerAccountCode: "LEC00004", StudentAccountCode: "STU00004", EnrollmentDescription: "Regular enrollment" },
];
// --- HẾT MOCK DATA ---


// --- Định nghĩa Columns KHỚP VỚI EXCEL ---

const semesterPlanColumns = [
    { title: "SemesterCode", dataIndex: "SemesterCode", key: "SemesterCode" },
    { title: "AcademicYear", dataIndex: "AcademicYear", key: "AcademicYear" },
    { title: "StartEndDates", dataIndex: "StartEndDates", key: "StartEndDates" },
    { title: "CourseCode", dataIndex: "CourseCode", key: "CourseCode" },
    { title: "CourseName", dataIndex: "CourseName", key: "CourseName" },
    { title: "CourseElementName", dataIndex: "CourseElementName", key: "CourseElementName" },
    { title: "CourseElementDescription", dataIndex: "CourseElementDescription", key: "CourseElementDescription" },
    { title: "CourseElementWeight", dataIndex: "CourseElementWeight", key: "CourseElementWeight" },
    { title: "LecturerAccountCode", dataIndex: "LecturerAccountCode", key: "LecturerAccountCode" },
];

const classRosterColumns = [
    { title: "ClassCode", dataIndex: "ClassCode", key: "ClassCode" },
    { title: "ClassDescription", dataIndex: "ClassDescription", key: "ClassDescription" },
    { title: "SemesterCourseId", dataIndex: "SemesterCourseId", key: "SemesterCourseId" },
    { title: "LecturerAccountCode", dataIndex: "LecturerAccountCode", key: "LecturerAccountCode" },
    { title: "StudentAccountCode", dataIndex: "StudentAccountCode", key: "StudentAccountCode" },
    { title: "EnrollmentDescription", dataIndex: "EnrollmentDescription", key: "EnrollmentDescription" },
];


// --- Cập nhật Component chính ---
export const PreviewPlanModal: React.FC<PreviewPlanModalProps> = ({
  open,
  onCancel,
  onConfirm,
  previewData,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const finalPreviewData = previewData || emptyPreviewData;

  const { 
      semesterPlan: semesterPlanDataSource, 
      classRoster: classRosterDataSource,
  } = finalPreviewData;

  // --- RÚT GỌN STEPS THÀNH 2 BƯỚC VÀ HIỂN THỊ DỮ LIỆU KHỚP EXCEL ---
  const steps = [
    {
      title: `1. Semester Plan Data (${semesterPlanDataSource.length} items)`,
      content: (
        <Space direction="vertical" style={{ width: '100%', gap: '15px' }}>
            <Title level={4}>Semester Plan Details</Title>
            {semesterPlanDataSource.length === 0 && previewData !== null
                ? <Text type="warning">No semester plan data found in the uploaded file.</Text>
                : <PreviewTable columns={semesterPlanColumns} dataSource={semesterPlanDataSource} />
            }
        </Space>
      ),
    },
    {
      title: `2. Class Roster Data (${classRosterDataSource.length} items)`,
      content: (
        <Space direction="vertical" style={{ width: '100%', gap: '15px' }}>
            <Title level={4}>Class Roster Details</Title>
            {classRosterDataSource.length === 0 && previewData !== null
                ? <Text type="warning">No class roster data found in the uploaded file.</Text>
                : <PreviewTable columns={classRosterColumns} dataSource={classRosterDataSource} />
            }
        </Space>
      ),
    },
  ];
  // --- KẾT THÚC RÚT GỌN STEPS ---

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
    // Logic render footer (giữ nguyên)
    if (currentStep < steps.length - 1) {
      return (
        <Space>
          {currentStep > 0 && <Button onClick={handleBack}>Back</Button>}
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleNext}>
            Continue
          </Button>
        </Space>
      );
    }
    return (
      <Space>
        <Button onClick={handleBack}>Back</Button>
        <Button variant="primary" onClick={onConfirm}>
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
      width={1000} // Tăng chiều rộng để phù hợp với nhiều cột hơn
    >
      {/* Hiển thị cảnh báo chung nếu không có dữ liệu nào được tải */}
      {previewData === null && (
          <Title level={5} style={{ textAlign: 'center', color: '#faad14', marginBottom: '20px' }}>
              Upload both files to see the structural preview.
          </Title>
      )}
      
      <Steps current={currentStep} className={styles.steps}>
        {steps.map((item) => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>
      <div className={styles.stepContent}>{steps[currentStep].content}</div>
    </Modal>
  );
};