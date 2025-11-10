// Tên file: components/AssignmentList/AssignmentItem.tsx
"use client";

import React, { useState, useEffect } from "react";
import { App, Typography, Alert, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  UploadOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./AssignmentList.module.css";
import { AssignmentData } from "./data";
import { RequirementModal } from "./RequirementModal";
import { ScoreFeedbackModal } from "./ScoreFeedbackModal";
import { DeadlineDisplay } from "./DeadlineDisplay";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useStudent } from "@/hooks/useStudent";
import { useAuth } from "@/hooks/useAuth";
import { studentManagementService } from "@/services/studentManagementService";
import { submissionService, Submission } from "@/services/submissionService";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

// Helper function to get current Vietnam time
const getCurrentVietnamTime = () => {
  return dayjs().tz("Asia/Ho_Chi_Minh");
};

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

interface AssignmentItemProps {
  data: AssignmentData;
  isExam?: boolean; // If true, hide requirement details, files, and submission
}

export function AssignmentItem({ data, isExam = false }: AssignmentItemProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
  const [isRequirementModalVisible, setIsRequirementModalVisible] =
    useState(false);
  const [isScoreModalVisible, setIsScoreModalVisible] = useState(false);
  const { message } = App.useApp();
  const { studentId } = useStudent();
  const { user } = useAuth();

  // Fetch last submission
  useEffect(() => {
    const fetchLastSubmission = async () => {
      if (!studentId) return;

      try {
        setIsLoadingSubmission(true);
        
        // Fetch submissions by classAssessmentId or examSessionId
        let submissions: Submission[] = [];
        if (data.classAssessmentId) {
          // For assignments, fetch via classAssessmentId
          submissions = await submissionService.getSubmissionList({
            studentId: studentId,
            classAssessmentId: data.classAssessmentId,
          });
        } else if (data.examSessionId) {
          // For exams, fetch via examSessionId
          submissions = await submissionService.getSubmissionList({
            studentId: studentId,
            examSessionId: data.examSessionId,
          });
        }

        // Get the most recent submission
        if (submissions.length > 0) {
          const sorted = submissions.sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() -
              new Date(a.submittedAt).getTime()
          );
          setLastSubmission(sorted[0]);
        } else {
          setLastSubmission(null);
        }
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
        setLastSubmission(null);
      } finally {
        setIsLoadingSubmission(false);
      }
    };

    fetchLastSubmission();
  }, [studentId, data.classAssessmentId, data.examSessionId]);

  // Check if deadline exists
  const hasDeadline = () => {
    return !!data.date;
  };

  // Check if deadline has passed (using Vietnam time)
  const isDeadlinePassed = () => {
    if (!data.date) return false;
    const currentTime = getCurrentVietnamTime();
    const deadlineTime = toVietnamTime(data.date);
    return currentTime.isAfter(deadlineTime);
  };

  const canSubmit = () => {
    return hasDeadline() && !isDeadlinePassed();
  };

  const handleSubmit = async () => {
    if (fileList.length === 0 || !studentId) {
      message.warning("Please select a file to submit");
      return;
    }

    const file = fileList[0].originFileObj as File;
    if (!file) {
      message.warning("Please select a valid file");
      return;
    }

    // Validate file type - must be zip
    const isZip = file.type === "application/zip" || 
                  file.type === "application/x-zip-compressed" ||
                  file.name.toLowerCase().endsWith(".zip");
    if (!isZip) {
      message.error("Chỉ chấp nhận file ZIP. Vui lòng chọn file ZIP để nộp.");
      return;
    }

    // Check deadline
    if (!hasDeadline()) {
      message.error("This assignment does not have a deadline yet. Please wait for the lecturer to set the deadline before submitting.");
      return;
    }
    if (!canSubmit()) {
      message.error("The deadline has passed. You can no longer submit.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get studentCode
      let studentCode = user?.accountCode || "";
      if (!studentCode) {
        try {
          const students = await studentManagementService.getStudentList();
          const currentUserAccountId = String(user?.id);
          const matchingStudent = students.find(
            (stu) => stu.accountId === currentUserAccountId
          );
          if (matchingStudent) {
            studentCode = matchingStudent.accountCode;
          }
        } catch (err) {
          console.error("Failed to fetch student code:", err);
        }
      }

      // Rename file to studentCode.zip
      const newFileName = studentCode ? `${studentCode}.zip` : file.name;
      const renamedFile = new File([file], newFileName, { type: file.type });

      const newSubmission = await submissionService.createSubmission({
        StudentId: studentId,
        ClassAssessmentId: data.classAssessmentId,
        ExamSessionId: data.examSessionId,
        file: renamedFile,
      });

      setFileList([]);
      message.success("Your assignment has been submitted successfully!");
      
      // Refresh submissions list to ensure we have the latest
      let submissions: Submission[] = [];
      if (data.classAssessmentId) {
        submissions = await submissionService.getSubmissionList({
          studentId: studentId,
          classAssessmentId: data.classAssessmentId,
        });
      } else if (data.examSessionId || newSubmission.examSessionId) {
        const sessionId = newSubmission.examSessionId || data.examSessionId;
        submissions = await submissionService.getSubmissionList({
          studentId: studentId,
          examSessionId: sessionId,
        });
      }
      
      // Get the most recent submission
      if (submissions.length > 0) {
        const sorted = submissions.sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );
        setLastSubmission(sorted[0]);
      } else {
        setLastSubmission(newSubmission);
      }
    } catch (err: any) {
      console.error("Failed to submit assignment:", err);
      message.error(err.message || "Failed to submit assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadProps = {
    fileList,
    onRemove: (file: UploadFile) => {
      setFileList((prevList) => prevList.filter((f) => f.uid !== file.uid));
    },
    beforeUpload: (file: File) => {
      // Validate file type - must be zip
      const isZip = file.type === "application/zip" || 
                    file.type === "application/x-zip-compressed" ||
                    file.name.toLowerCase().endsWith(".zip");
      if (!isZip) {
        message.error("Chỉ chấp nhận file ZIP. Vui lòng chọn file ZIP để nộp.");
        return false;
      }

      // Create UploadFile object with originFileObj
      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file as any, // Cast to any to satisfy RcFile type
      };
      setFileList([uploadFile]);
      return false; // Prevent auto upload
    },
  };

  return (
    <div className={styles.itemContent}>
      <div className={styles.contentSection}>
        <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
          Description
        </Title>
        <Paragraph style={{ fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 0 }}>
          {data.description}
        </Paragraph>
      </div>

      {!isExam && (
        <>
          <div className={styles.contentSection}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              Requirements
            </Title>
            <div className={styles.requirementButtons}>
              <Button
                variant="outline"
                onClick={() => setIsRequirementModalVisible(true)}
                className={styles.viewRequirementButton}
                icon={<EyeOutlined />}
              >
                View Requirement Details
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsScoreModalVisible(true)}
                className={styles.viewScoreButton}
                icon={<EyeOutlined />}
              >
                View Score & Feedback
              </Button>
            </div>

            <div className={styles.downloadSection}>
              {data.requirementFile && (
                <Alert
                  message={
                    <a 
                      href={data.requirementFileUrl || "#"} 
                      download={data.requirementFile}
                      target={data.requirementFileUrl ? "_blank" : undefined}
                      rel={data.requirementFileUrl ? "noopener noreferrer" : undefined}
                    >
                      {data.requirementFile}
                    </a>
                  }
                  type="info"
                  showIcon
                  icon={<FilePdfOutlined />}
                  className={styles.requirementAlert}
                />
              )}
              {data.databaseFile && (
                <Alert
                  message={
                    <a 
                      href={data.databaseFileUrl || "#"} 
                      download={data.databaseFile}
                      target={data.databaseFileUrl ? "_blank" : undefined}
                      rel={data.databaseFileUrl ? "noopener noreferrer" : undefined}
                    >
                      {data.databaseFile}
                    </a>
                  }
                  type="info"
                  showIcon
                  icon={<DatabaseOutlined />}
                  className={styles.requirementAlert}
                />
              )}
            </div>
          </div>

          <div className={styles.submissionSection}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              Your Submission
            </Title>
            
            {lastSubmission && (
              <Alert
                message="Last Submission"
                description={
                  <div>
                    <Text>
                      Submitted on: {toVietnamTime(lastSubmission.submittedAt).format("DD MMM YYYY, HH:mm")}
                    </Text>
                    {lastSubmission.submissionFile && (
                      <div style={{ marginTop: "8px" }}>
                        <Text strong>File: </Text>
                        <a
                          href={lastSubmission.submissionFile.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {lastSubmission.submissionFile.name}
                        </a>
                      </div>
                    )}
                  </div>
                }
                type="info"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginBottom: "16px" }}
              />
            )}

            {!hasDeadline() ? (
              <Alert
                message="No Deadline Set"
                description="This assignment does not have a deadline yet. Please wait for the lecturer to set the deadline before submitting."
                type="info"
                showIcon
                icon={<ClockCircleOutlined />}
              />
            ) : isDeadlinePassed() ? (
              <Alert
                message="Deadline Passed"
                description="The submission deadline has passed. You can no longer submit."
                type="warning"
                showIcon
                icon={<ClockCircleOutlined />}
              />
            ) : (
              <>
                <Dragger {...uploadProps} className={styles.uploadDragger} accept=".zip" disabled={!canSubmit()}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Drag & drop your ZIP file here, or click to browse
                  </p>
                  <p className="ant-upload-hint" style={{ color: "#999", fontSize: "12px" }}>
                    Chỉ chấp nhận file ZIP
                  </p>
                  {lastSubmission && (
                    <p className="ant-upload-hint" style={{ color: "#999", fontSize: "12px" }}>
                      You can submit multiple times. The latest submission will be used.
                    </p>
                  )}
                </Dragger>
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={fileList.length === 0 || !canSubmit()}
                  className={styles.submitButton}
                >
                  {lastSubmission ? "Resubmit Assignment" : "Submit Assignment"}
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {isExam && (
        <>
          <div className={styles.contentSection} style={{ marginTop: "24px" }}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              Deadline
            </Title>
            <DeadlineDisplay date={data.date} />
          </div>

          <div className={styles.contentSection} style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e6f7ff" }}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              Results
            </Title>
            <Button
              variant="outline"
              onClick={() => setIsScoreModalVisible(true)}
              className={styles.viewScoreButtonExam}
              icon={<EyeOutlined />}
            >
              View Score & Feedback
            </Button>
          </div>
        </>
      )}

      {!isExam && (
        <div className={styles.contentSection} style={{ marginTop: "24px" }}>
          <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
            Deadline
          </Title>
          <DeadlineDisplay date={data.date} />
        </div>
      )}

      {!isExam && (
        <RequirementModal
          open={isRequirementModalVisible}
          onCancel={() => setIsRequirementModalVisible(false)}
          title={data.title}
          content={data.requirementContent}
        />
      )}

      <ScoreFeedbackModal
        open={isScoreModalVisible}
        onCancel={() => setIsScoreModalVisible(false)}
        data={data}
      />
    </div>
  );
}
