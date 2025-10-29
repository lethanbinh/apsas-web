// Tên file: components/SemesterPlans/PreviewPlanModal.tsx
"use client";

import React, { useState } from "react";
import { Modal, Steps, Typography, Space } from "antd";
import { Button } from "../ui/Button";
import { PreviewTable } from "./PreviewTable";
import styles from "./PreviewPlanModal.module.css";

const { Title, Text } = Typography;
const { Step } = Steps;

interface CourseData {
  key: string;
  code: string;
  name: string;
  credits: number;
  labs: number;
  assigns: number;
  pe: number;
  notes: string | null;
}

interface ClassData {
  key: string;
  classCode: string;
  courseCode: string;
  campus: string;
}

interface StudentData {
  key: string;
  id: string;
  name: string;
  email: string;
  classCode: string;
}

interface TeacherAssignmentData {
  key: string;
  email: string;
  classCode: string;
  courseCode: string;
}

export interface PreviewData {
  courses: CourseData[];
  classes: ClassData[];
  students: StudentData[];
  teacherAssignments: TeacherAssignmentData[];
}

export interface PreviewPlanModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void; // Nút cuối cùng (Close)
  previewData: PreviewData | null; // New prop for preview data
}

// Step 1: Courses
const coursesColumns = [
  { title: "Course Code", dataIndex: "code", key: "code" },
  { title: "Course Name", dataIndex: "name", key: "name" },
  { title: "Credits", dataIndex: "credits", key: "credits" },
  { title: "No. of Labs", dataIndex: "labs", key: "labs" },
  { title: "No. of Assignments", dataIndex: "assigns", key: "assigns" },
  { title: "No. of PE", dataIndex: "pe", key: "pe" },
  { title: "Notes", dataIndex: "notes", key: "notes" },
];

// Step 2: Classes
const classesColumns = [
  { title: "Class Code", dataIndex: "classCode", key: "classCode" },
  { title: "Course Code", dataIndex: "courseCode", key: "courseCode" },
  { title: "Campus", dataIndex: "campus", key: "campus" },
];

// Step 3: Students
const studentsColumns = [
  { title: "Student ID", dataIndex: "id", key: "id" },
  { title: "Student Name", dataIndex: "name", key: "name" },
  { title: "Email", dataIndex: "email", key: "email" },
  { title: "Class Code", dataIndex: "classCode", key: "classCode" },
];

// Step 4: Teacher Assignments
const teacherAssignmentsColumns = [
  { title: "Teacher Email", dataIndex: "email", key: "email" },
  { title: "Class Code", dataIndex: "classCode", key: "classCode" },
  { title: "Course Code", dataIndex: "courseCode", key: "courseCode" },
];

export const PreviewPlanModal: React.FC<PreviewPlanModalProps> = ({
  open,
  onCancel,
  onConfirm,
  previewData,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Using optional chaining and nullish coalescing for safe access to previewData
  const coursesDataSource = previewData?.courses || [];
  const classesDataSource = previewData?.classes || [];
  const studentsDataSource = previewData?.students || [];
  const teacherAssignmentsDataSource = previewData?.teacherAssignments || [];

  const steps = [
    {
      title: "Courses",
      content: (
        <PreviewTable columns={coursesColumns} dataSource={coursesDataSource} />
      ),
    },
    {
      title: "Classes",
      content: (
        <PreviewTable columns={classesColumns} dataSource={classesDataSource} />
      ),
    },
    {
      title: "Students",
      content: (
        <PreviewTable
          columns={studentsColumns}
          dataSource={studentsDataSource}
        />
      ),
    },
    {
      title: "Teacher assignments",
      content: (
        <PreviewTable
          columns={teacherAssignmentsColumns}
          dataSource={teacherAssignmentsDataSource}
        />
      ),
    },
  ];

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Đóng modal và reset về bước 0
  const handleClose = () => {
    onCancel();
    setTimeout(() => {
      setCurrentStep(0);
    }, 300);
  };

  // Nút bấm cho Footer
  const renderFooter = () => {
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
    // Bước cuối cùng
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
      width={900} // Cho modal rộng hơn
    >
      <Steps current={currentStep} className={styles.steps}>
        {steps.map((item) => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>
      <div className={styles.stepContent}>{steps[currentStep].content}</div>
    </Modal>
  );
};
