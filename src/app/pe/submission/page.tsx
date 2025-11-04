"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Typography,
  Button,
  Upload,
  Checkbox,
  Space,
  Modal,
  App,
  Collapse,
} from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import styles from "./PESubmission.module.css";

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface ExamInfo {
  semester: string;
  courseName: string;
  duration: string;
  courseCode: string;
  examDate: string;
  totalPoints: string;
}

interface StudentInfo {
  fullName: string;
  examCode: string;
  studentId: string;
  roomAndSeat: string;
}

const mockExamInfo: ExamInfo = {
  semester: "FALL2025",
  courseName: "Introduction to Computer Science",
  duration: "120 minutes",
  courseCode: "CSI101",
  examDate: "November 15, 2025",
  totalPoints: "100",
};

const mockStudentInfo: StudentInfo = {
  fullName: "Nguyễn Văn A",
  examCode: "A1B2C3D4",
  studentId: "anltse172257",
  roomAndSeat: "301 - 15",
};

// Get student info from localStorage or use mock data
const getStudentInfo = (): StudentInfo => {
  if (typeof window !== "undefined") {
    const storedUserName = localStorage.getItem("pea_user_name");
    if (storedUserName) {
      return {
        ...mockStudentInfo,
        fullName: storedUserName,
      };
    }
  }
  return mockStudentInfo;
};

interface Question {
  id: string;
  title: string;
  description: string;
  code?: string;
}

const mockQuestions: Question[] = [
  {
    id: "1",
    title: "Question 01: Create a program",
    description:
      "TOTC is a platform that allows educators to create online classes whereby they can store the course materials online; manage assignments, quizzes and exams; monitor due dates; grade results and provide students with feedback all in one place.",
    code: `self.fingerprints.update(
@classmethod
def from_settings(cls, settings):
    debug = settings.getbool('SUPERUSER_MODE')
    return cls(job_dir(settings), debug)
def request_seen(self, request):
    fp = self.request_fingerprint(request)
    if fp in self.fingerprints:`,
  },
  {
    id: "2",
    title: "Question 02: Create a program",
    description: "Write a program to implement a binary search tree.",
  },
  {
    id: "3",
    title: "Question 03: Create a program",
    description: "Implement a sorting algorithm of your choice.",
  },
  {
    id: "4",
    title: "Question 04: Create a program",
    description: "Create a function to reverse a linked list.",
  },
];

export default function PESubmissionPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentInfo] = useState<StudentInfo>(getStudentInfo());
  const [isExamPaperModalOpen, setIsExamPaperModalOpen] = useState(false);

  useEffect(() => {
    // Skip login check for testing - can be enabled later when API is ready
    // if (typeof window !== "undefined") {
    //   const storedTestName = localStorage.getItem("pea_test_name");
    //   const storedUserName = localStorage.getItem("pea_user_name");

    //   if (!storedTestName || !storedUserName) {
    //     message.warning("Please login first");
    //     router.push("/pe");
    //     return;
    //   }
    // }
  }, [router]);

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      // Check file size (max 20MB)
      const isLt20M = file.size / 1024 / 1024 < 20;
      if (!isLt20M) {
        message.error("File must be smaller than 20MB!");
        return false;
      }

      // Check file type
      const isValidType =
        file.type === "application/pdf" ||
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/jpg";
      if (!isValidType) {
        message.error("You can only upload PDF, JPG, or PNG files!");
        return false;
      }

      setFileList([...fileList, file]);
      return false; // Prevent auto upload
    },
    fileList,
    accept: ".pdf,.jpg,.jpeg,.png",
  };

  const handleDownloadDocuments = () => {
    // TODO: Implement download functionality
    message.info("Downloading exam documents...");
  };

  const handleViewExamPaper = () => {
    setIsExamPaperModalOpen(true);
  };

  const handleCloseExamPaper = () => {
    setIsExamPaperModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      message.warning("Please confirm the submission guidelines");
      return;
    }

    if (fileList.length === 0) {
      message.warning("Please upload your answer file");
      return;
    }

    setSubmitting(true);
    try {
      // Simulate submission
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Save submission info
      if (typeof window !== "undefined") {
        localStorage.setItem("pea_submitted", "true");
        localStorage.setItem("pea_submission_file", JSON.stringify(fileList));
      }

      message.success("Exam submitted successfully!");
      // Clear submission data
      if (typeof window !== "undefined") {
        localStorage.removeItem("pea_test_name");
        localStorage.removeItem("pea_user_name");
        localStorage.removeItem("pea_answers");
      }
      router.push("/");
    } catch (error) {
      message.error("Failed to submit exam. Please try again.");
      console.error("Submission error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <App>
      <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <Title level={1} className={styles.title}>
          Exam Submission
        </Title>
        <Text className={styles.subtitle}>
          Submit your exam paper for {mockExamInfo.semester}
        </Text>
      </div>

      {/* Exam Information */}
      <Card className={styles.infoCard}>
        <Text className={styles.cardTitle}>Exam Information</Text>
        <div className={styles.infoGrid}>
          <div className={styles.infoColumn}>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Semester:</Text>
              <Text className={styles.infoValue}>{mockExamInfo.semester}</Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Course Name:</Text>
              <Text className={styles.infoValue}>
                {mockExamInfo.courseName}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Duration:</Text>
              <Text className={styles.infoValue}>{mockExamInfo.duration}</Text>
            </div>
          </div>
          <div className={styles.infoColumn}>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Course Code:</Text>
              <Text className={styles.infoValue}>
                {mockExamInfo.courseCode}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Exam Date:</Text>
              <Text className={styles.infoValue}>
                {mockExamInfo.examDate}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Total Points:</Text>
              <Text className={styles.infoValue}>
                {mockExamInfo.totalPoints}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Student Information */}
      <Card className={styles.infoCard}>
        <Text className={styles.cardTitle}>Student Information</Text>
        <div className={styles.infoGrid}>
          <div className={styles.infoColumn}>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Full Name:</Text>
              <Text className={styles.infoValue}>
                {studentInfo.fullName}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Exam Code:</Text>
              <Text className={styles.infoValue}>
                {studentInfo.examCode}
              </Text>
            </div>
          </div>
          <div className={styles.infoColumn}>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Student ID:</Text>
              <Text className={styles.infoValue}>
                {studentInfo.studentId}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Room & Seat:</Text>
              <Text className={styles.infoValue}>
                {studentInfo.roomAndSeat}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Step 1: Download Documents */}
      <Card className={styles.stepCard}>
        <div className={styles.stepHeader}>
          <DownloadOutlined className={styles.stepIcon} />
          <Title level={4} className={styles.stepTitle}>
            Step 1: Download Documents
          </Title>
        </div>
        <Text className={styles.stepDescription}>
          Download exam documents for this session
        </Text>
        <div className={styles.stepButtons}>
          <Button
            icon={<EyeOutlined />}
            onClick={handleViewExamPaper}
            className={styles.actionButton}
          >
            View Exam Paper
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadDocuments}
            className={styles.actionButton}
          >
            Download Documents
          </Button>
        </div>
      </Card>

      {/* Step 2: Upload Your Answer */}
      <Card className={styles.stepCard}>
        <div className={styles.stepHeader}>
          <UploadOutlined className={styles.stepIcon} />
          <Title level={4} className={styles.stepTitle}>
            Step 2: Upload Your Answer
          </Title>
        </div>
        <Text className={styles.stepDescription}>
          Upload your completed exam as a PDF or image file (JPG, PNG)
        </Text>
        <div className={styles.uploadWrapper}>
          <Upload.Dragger {...uploadProps} className={styles.uploadArea}>
            <p className={styles.uploadIcon}>
              <UploadOutlined style={{ fontSize: 48, color: "#999" }} />
            </p>
            <p className={styles.uploadText}>Click to upload or drag and drop</p>
            <p className={styles.uploadHint}>
              PDF, JPG, or PNG (max 20MB)
            </p>
          </Upload.Dragger>
        </div>
      </Card>

      {/* Step 3: Confirm & Submit */}
      <Card className={styles.stepCard}>
        <Title level={4} className={styles.stepTitle}>
          Step 3: Confirm & Submit
        </Title>
        <div className={styles.confirmSection}>
          <Checkbox
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className={styles.confirmCheckbox}
          >
            <Text className={styles.confirmText}>
              I confirm that I have read and understood the submission
              guidelines
            </Text>
          </Checkbox>
          <Text className={styles.confirmNote}>
            By checking this box, I certify that the exam paper I am submitting
            is my own work and has not been copied or plagiarized from any
            source.
          </Text>
        </div>
        <div className={styles.submitSection}>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleSubmit}
            loading={submitting}
            disabled={!confirmed || fileList.length === 0}
            className={styles.submitButton}
          >
            Submit Exam
          </Button>
          <Text className={styles.submitNote}>
            Once submitted, you will not be able to modify your answer
          </Text>
        </div>
      </Card>

      {/* Exam Paper Modal */}
      <Modal
        open={isExamPaperModalOpen}
        onCancel={handleCloseExamPaper}
        footer={null}
        width={900}
        className={styles.examPaperModal}
      >
        <div className={styles.modalContent}>
          <Title level={2} className={styles.modalTitle}>
            Paper Assignment 01
          </Title>

          <Collapse
            className={styles.questionsCollapse}
            accordion
            defaultActiveKey={["1"]}
          >
            {mockQuestions.map((question) => (
              <Panel
                key={question.id}
                header={
                  <span className={styles.questionHeader}>
                    {question.title}
                  </span>
                }
                className={styles.questionPanel}
              >
                <div className={styles.questionContent}>
                  <Text className={styles.questionDescription}>
                    {question.description}
                  </Text>
                  {question.code && (
                    <div className={styles.codeBlock}>
                      <pre className={styles.codeContent}>
                        <code>{question.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          </Collapse>
        </div>
      </Modal>
      </div>
    </App>
  );
}

