"use client";

import {
  CheckCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  App,
  Button,
  Card,
  Checkbox,
  Collapse,
  Modal,
  Typography,
  Upload,
  Spin,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { examSessionService, ExamSession } from "@/services/examSessionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { submissionService } from "@/services/submissionService";
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

interface Question {
  id: string;
  title: string;
  description: string;
  code?: string;
  paperId: number;
  paperName: string;
}

export default function PESubmissionPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isExamPaperModalOpen, setIsExamPaperModalOpen] = useState(false);
  const [examSessionId, setExamSessionId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    const loadExamData = async () => {
      try {
        setLoading(true);

        // Check if user is logged in
        if (typeof window === "undefined") return;

        const storedExamSessionId = localStorage.getItem("pea_exam_session_id");
        const storedStudentId = localStorage.getItem("pea_student_id");
        const storedExamSession = localStorage.getItem("pea_exam_session");
        const storedUserName = localStorage.getItem("pea_user_name");

        if (!storedExamSessionId || !storedStudentId || !storedExamSession) {
          message.warning("Please login first");
          router.push("/pe");
          return;
        }

        const sessionId = parseInt(storedExamSessionId);
        const sid = parseInt(storedStudentId);
        setExamSessionId(sessionId);
        setStudentId(sid);

        // Parse exam session from localStorage
        let examSessionData: ExamSession;
        try {
          examSessionData = JSON.parse(storedExamSession);
          setExamSession(examSessionData);
        } catch (e) {
          // If parsing fails, fetch from API
          const examSessionsResponse = await examSessionService.getExamSessions({
            studentId: sid,
            pageNumber: 1,
            pageSize: 100,
          });
          examSessionData = examSessionsResponse.items.find(
            (s) => s.id === sessionId
          )!;
          if (!examSessionData) {
            throw new Error("Exam session not found");
          }
          setExamSession(examSessionData);
        }

        // Set exam info
        const startDate = new Date(examSessionData.startAt);
        const endDate = new Date(examSessionData.endAt);
        const durationMs = endDate.getTime() - startDate.getTime();
        const durationMinutes = Math.floor(durationMs / 60000);

        setExamInfo({
          semester: examSessionData.courseName.split(" - ")[0] || "N/A",
          courseName: examSessionData.courseName,
          duration: `${durationMinutes} minutes`,
          courseCode: examSessionData.courseElementName,
          examDate: startDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          totalPoints: "100", // Default or from template
        });

        // Get student info from exam session students list
        const studentInSession = examSessionData.students.find(
          (s) => s.studentId === sid
        );
        setStudentInfo({
          fullName: studentInSession?.studentName || storedUserName || "N/A",
          examCode: examSessionData.enrollmentCode,
          studentId: studentInSession?.studentCode || "N/A",
          roomAndSeat: "N/A", // Not available in current API
        });

        // Load assessment template and questions
        const templateResponse = await assessmentTemplateService.getAssessmentTemplates({
          pageNumber: 1,
          pageSize: 100,
        });
        const template = templateResponse.items.find(
          (t) => t.id === examSessionData.assessmentTemplateId
        );

        if (template) {
          // Get papers for this template
          const papersResponse = await assessmentPaperService.getAssessmentPapers({
            assessmentTemplateId: template.id,
            pageNumber: 1,
            pageSize: 100,
          });

          // Get questions for each paper
          const allQuestions: Question[] = [];
          let globalQuestionIndex = 1;
          
          for (const paper of papersResponse.items) {
            const questionsResponse =
              await assessmentQuestionService.getAssessmentQuestions({
                assessmentPaperId: paper.id,
                pageNumber: 1,
                pageSize: 100,
              });

            questionsResponse.items.forEach((q) => {
              allQuestions.push({
                id: q.id.toString(),
                title: `Question ${String(globalQuestionIndex).padStart(2, "0")}: ${paper.name}`,
                description: q.questionText,
                code: q.questionSampleInput
                  ? `Input:\n${q.questionSampleInput}\n\nOutput:\n${q.questionSampleOutput}`
                  : undefined,
                paperId: paper.id,
                paperName: paper.name,
              });
              globalQuestionIndex++;
            });
          }

          setQuestions(allQuestions);
        }
      } catch (error: any) {
        console.error("Error loading exam data:", error);
        message.error(
          error.message || "Failed to load exam data. Please try again."
        );
        router.push("/pe");
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [router, message]);

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

      // Validate file type - must be zip
      const isZip = file.type === "application/zip" || 
                    file.type === "application/x-zip-compressed" ||
                    file.name.toLowerCase().endsWith(".zip");
      if (!isZip) {
        message.error("Chỉ chấp nhận file ZIP. Vui lòng chọn file ZIP để nộp.");
        return false;
      }

      setFileList([...fileList, file]);
      return false; // Prevent auto upload
    },
    fileList,
    accept: ".zip",
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

    if (!examSessionId || !studentId) {
      message.error("Missing exam session or student information");
      return;
    }

    setSubmitting(true);
    try {
      // Submit the first file (or handle multiple files if needed)
      let fileToSubmit = fileList[0];
      
      // Validate file type - must be zip
      const isZip = fileToSubmit.type === "application/zip" || 
                    fileToSubmit.type === "application/x-zip-compressed" ||
                    fileToSubmit.name.toLowerCase().endsWith(".zip");
      if (!isZip) {
        message.error("Chỉ chấp nhận file ZIP. Vui lòng chọn file ZIP để nộp.");
        setSubmitting(false);
        return;
      }

      // Rename file to studentCode.zip
      if (studentInfo?.studentId && studentInfo.studentId !== "N/A") {
        const newFileName = `${studentInfo.studentId}.zip`;
        fileToSubmit = new File([fileToSubmit], newFileName, { type: fileToSubmit.type });
      }
      
      await submissionService.createSubmission({
        ExamSessionId: examSessionId,
        StudentId: studentId,
        file: fileToSubmit,
      });

      message.success("Exam submitted successfully!");
      
      // Clear submission data
      if (typeof window !== "undefined") {
        localStorage.removeItem("pea_exam_session_id");
        localStorage.removeItem("pea_exam_session");
        localStorage.removeItem("pea_student_id");
        localStorage.removeItem("pea_test_name");
        localStorage.removeItem("pea_user_name");
      }
      
      router.push("/");
    } catch (error: any) {
      console.error("Submission error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit exam. Please try again.";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <App>
        <div className={styles.wrapper}>
          <Spin size="large" style={{ display: "block", margin: "50px auto" }} />
        </div>
      </App>
    );
  }

  if (!examInfo || !studentInfo || !examSession) {
    return (
      <App>
        <div className={styles.wrapper}>
          <Card>
            <Text>No exam session found. Please login again.</Text>
          </Card>
        </div>
      </App>
    );
  }

  return (
    <App>
      <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <Title level={1} className={styles.title}>
          Exam Submission
        </Title>
        <Text className={styles.subtitle}>
          Submit your exam paper for {examInfo.semester}
        </Text>
      </div>

      {/* Exam Information */}
      <Card className={styles.infoCard}>
        <Text className={styles.cardTitle}>Exam Information</Text>
        <div className={styles.infoGrid}>
          <div className={styles.infoColumn}>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Semester:</Text>
              <Text className={styles.infoValue}>{examInfo.semester}</Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Course Name:</Text>
              <Text className={styles.infoValue}>
                {examInfo.courseName}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Duration:</Text>
              <Text className={styles.infoValue}>{examInfo.duration}</Text>
            </div>
          </div>
          <div className={styles.infoColumn}>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Course Code:</Text>
              <Text className={styles.infoValue}>
                {examInfo.courseCode}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Exam Date:</Text>
              <Text className={styles.infoValue}>
                {examInfo.examDate}
              </Text>
            </div>
            <div className={styles.infoItem}>
              <Text className={styles.infoLabel}>Total Points:</Text>
              <Text className={styles.infoValue}>
                {examInfo.totalPoints}
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
          Upload your completed exam as a ZIP file
        </Text>
        <div className={styles.uploadWrapper}>
          <Upload.Dragger {...uploadProps} className={styles.uploadArea}>
            <p className={styles.uploadIcon}>
              <UploadOutlined style={{ fontSize: 48, color: "#999" }} />
            </p>
            <p className={styles.uploadText}>Click to upload or drag and drop</p>
            <p className={styles.uploadHint}>
              Chỉ chấp nhận file ZIP (max 20MB)
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
            {examSession?.assessmentTemplateName || "Exam Paper"}
          </Title>
          {examSession?.assessmentTemplateDescription && (
            <Text style={{ display: "block", marginBottom: "16px" }}>
              {examSession.assessmentTemplateDescription}
            </Text>
          )}

          {questions.length > 0 ? (
            <Collapse
              className={styles.questionsCollapse}
              accordion
              defaultActiveKey={[questions[0]?.id]}
            >
              {questions.map((question) => (
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
          ) : (
            <Text>No questions available for this exam.</Text>
          )}
        </div>
      </Modal>
      </div>
    </App>
  );
}

