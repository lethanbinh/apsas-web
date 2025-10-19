// Tên file: components/SemesterPlans/PreviewPlanModal.tsx
"use client";

import React, { useState } from "react";
import { Modal, Steps, Typography, Space } from "antd";
import { Button } from "../ui/Button";
import { PreviewTable } from "./PreviewTable";
import styles from "./PreviewPlanModal.module.css";

const { Title, Text } = Typography;
const { Step } = Steps;

// --- DỮ LIỆU MẪU (Tôi đã tạo 4 bộ dữ liệu khác nhau) ---

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
const coursesData = [
  {
    key: "1",
    code: "PRJ301",
    name: "Java Web Application",
    credits: 3,
    labs: 5,
    assigns: 2,
    pe: 1,
    notes: "For SE students",
  },
  {
    key: "2",
    code: "DBI202",
    name: "Database Systems",
    credits: 3,
    labs: 4,
    assigns: 2,
    pe: 1,
    notes: null,
  },
  {
    key: "3",
    code: "SWP391",
    name: "Software Project",
    credits: 3,
    labs: 3,
    assigns: 3,
    pe: 0,
    notes: "Capstone project",
  },
];

// Step 2: Classes
const classesColumns = [
  { title: "Class Code", dataIndex: "classCode", key: "classCode" },
  { title: "Course Code", dataIndex: "courseCode", key: "courseCode" },
  { title: "Campus", dataIndex: "campus", key: "campus" },
];
const classesData = [
  { key: "1", classCode: "SE1720", courseCode: "PRJ301", campus: "HCM" },
  { key: "2", classCode: "SE1721", courseCode: "DBI202", campus: "HCM" },
];

// Step 3: Students
const studentsColumns = [
  { title: "Student ID", dataIndex: "id", key: "id" },
  { title: "Student Name", dataIndex: "name", key: "name" },
  { title: "Email", dataIndex: "email", key: "email" },
  { title: "Class Code", dataIndex: "classCode", key: "classCode" },
];
const studentsData = [
  {
    key: "1",
    id: "SE172257",
    name: "Le Thu An",
    email: "anlt@fpt.edu.vn",
    classCode: "SE1720",
  },
];

// Step 4: Teacher Assignments
const teacherAssignmentsColumns = [
  { title: "Teacher Email", dataIndex: "email", key: "email" },
  { title: "Class Code", dataIndex: "classCode", key: "classCode" },
  { title: "Course Code", dataIndex: "courseCode", key: "courseCode" },
];
const teacherAssignmentsData = [
  {
    key: "1",
    email: "SangNM@fpt.edu.vn",
    classCode: "SE1720",
    courseCode: "PRJ301",
  },
];

// --- HẾT DỮ LIỆU MẪU ---

const steps = [
  {
    title: "Courses",
    content: <PreviewTable columns={coursesColumns} dataSource={coursesData} />,
  },
  {
    title: "Classes",
    content: <PreviewTable columns={classesColumns} dataSource={classesData} />,
  },
  {
    title: "Students",
    content: (
      <PreviewTable columns={studentsColumns} dataSource={studentsData} />
    ),
  },
  {
    title: "Teacher assignments",
    content: (
      <PreviewTable
        columns={teacherAssignmentsColumns}
        dataSource={teacherAssignmentsData}
      />
    ),
  },
];

interface PreviewPlanModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void; // Nút cuối cùng (Close)
}

export const PreviewPlanModal: React.FC<PreviewPlanModalProps> = ({
  open,
  onCancel,
  onConfirm,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

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
