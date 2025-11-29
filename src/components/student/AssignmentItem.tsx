// Tên file: components/AssignmentList/AssignmentItem.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/Button";
import styles from "./AssignmentList.module.css";
import { AssignmentData } from "./data";
import { RequirementModal } from "./RequirementModal";
import { ScoreFeedbackModal } from "./ScoreFeedbackModal";
import { DeadlineDisplay } from "./DeadlineDisplay";
import PaperAssignmentModal from "@/components/features/PaperAssignmentModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useStudent } from "@/hooks/useStudent";
import { useAuth } from "@/hooks/useAuth";
import { studentManagementService } from "@/services/studentManagementService";
import { submissionService, Submission } from "@/services/submissionService";
import { gradingService } from "@/services/gradingService";
import { queryKeys } from "@/lib/react-query";

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
  isLab?: boolean; // If true, allow submission with max 3 attempts and auto grading
  isPracticalExam?: boolean; // If true, allow submission but only show requirement when deadline is set
}

export function AssignmentItem({ data, isExam = false, isLab = false, isPracticalExam = false }: AssignmentItemProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isRequirementModalVisible, setIsRequirementModalVisible] =
    useState(false);
  const [isScoreModalVisible, setIsScoreModalVisible] = useState(false);
  const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);
  const { message } = App.useApp();
  const { studentId } = useStudent();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autoGradingPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch last submission using TanStack Query
  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
    queryFn: async () => {
      if (!studentId) return [];
      
      if (data.classAssessmentId) {
        return submissionService.getSubmissionList({
          studentId: studentId,
          classAssessmentId: data.classAssessmentId,
        });
      } else if (data.examSessionId) {
        return submissionService.getSubmissionList({
          studentId: studentId,
          examSessionId: data.examSessionId,
        });
      }
      return [];
    },
    enabled: !!studentId && (!!data.classAssessmentId || !!data.examSessionId),
  });

  const lastSubmission = submissions.length > 0 
    ? submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
    : null;
  const submissionCount = submissions.length;
  const isLoadingSubmission = false; // useQuery handles loading state

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (autoGradingPollIntervalRef.current) {
        clearInterval(autoGradingPollIntervalRef.current);
        autoGradingPollIntervalRef.current = null;
      }
    };
  }, []);

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

  // Mutation for creating submission
  const submitMutation = useMutation({
    mutationFn: async ({ file, studentCode }: { file: File; studentCode: string }) => {
      const newFileName = studentCode ? `${studentCode}.zip` : file.name;
      const renamedFile = new File([file], newFileName, { type: file.type });
      
      return submissionService.createSubmission({
        StudentId: studentId!,
        ClassAssessmentId: data.classAssessmentId,
        ExamSessionId: data.examSessionId,
        file: renamedFile,
      });
    },
    onSuccess: async (newSubmission) => {
      // Invalidate submissions queries
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byStudent', studentId] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byStudentAndClass'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
      
      // For labs, trigger auto grading after submission
      if (isLab && data.assessmentTemplateId) {
        try {
          const gradingSession = await gradingService.autoGrading({
            submissionId: newSubmission.id,
            assessmentTemplateId: data.assessmentTemplateId,
          });

          if (gradingSession.status === 0) {
            message.loading("Auto grading in progress...", 0);
            
            const pollInterval = setInterval(async () => {
              try {
                const sessionsResult = await gradingService.getGradingSessions({
                  submissionId: newSubmission.id,
                  pageNumber: 1,
                  pageSize: 100,
                });

                if (sessionsResult.items.length > 0) {
                  const sortedSessions = [...sessionsResult.items].sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA;
                  });

                  const latestSession = sortedSessions[0];

                  if (latestSession.status !== 0) {
                    if (autoGradingPollIntervalRef.current) {
                      clearInterval(autoGradingPollIntervalRef.current);
                      autoGradingPollIntervalRef.current = null;
                    }
                    message.destroy();
                    
                    // Invalidate grading queries
                    queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
                    
                    if (latestSession.status === 1) {
                      message.success("Auto grading completed successfully");
                    } else if (latestSession.status === 2) {
                      message.error("Auto grading failed");
                    }
                  }
                }
              } catch (err: any) {
                console.error("Failed to poll grading status:", err);
                if (autoGradingPollIntervalRef.current) {
                  clearInterval(autoGradingPollIntervalRef.current);
                  autoGradingPollIntervalRef.current = null;
                }
                message.destroy();
                message.error(err.message || "Failed to check grading status");
              }
            }, 2000);

            autoGradingPollIntervalRef.current = pollInterval;

            setTimeout(() => {
              if (autoGradingPollIntervalRef.current) {
                clearInterval(autoGradingPollIntervalRef.current);
                autoGradingPollIntervalRef.current = null;
              }
              message.destroy();
            }, 300000);
          } else {
            if (gradingSession.status === 1) {
              message.success("Auto grading completed successfully");
            } else if (gradingSession.status === 2) {
              message.error("Auto grading failed");
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
          }
        } catch (gradingErr: any) {
          console.error("Failed to start auto grading:", gradingErr);
          message.destroy();
          message.warning("Submission submitted, but auto grading failed to start. Please contact your lecturer.");
        }
      } else {
        message.success("Your assignment has been submitted successfully!");
      }

      setFileList([]);
    },
    onError: (err: any) => {
      console.error("Failed to submit assignment:", err);
      message.error(err.message || "Failed to submit assignment. Please try again.");
    },
  });

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

    // Check submission limit for labs (max 3 times)
    if (isLab && submissionCount >= 3) {
      message.error("You have reached the maximum submission limit (3 times).");
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

    submitMutation.mutate({ file, studentCode });
  };

  const isSubmitting = submitMutation.isPending;

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

      {(!isExam || isPracticalExam) && (
        <>
          {/* For practical exam, only show requirements when deadline is set */}
          {(!isPracticalExam || hasDeadline()) && (
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
          )}

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
                  {isLab && (
                    <p className="ant-upload-hint" style={{ color: "#999", fontSize: "12px" }}>
                      Submission attempts: {submissionCount}/3
                      {submissionCount >= 3 && (
                        <span style={{ color: "#ff4d4f", marginLeft: "8px" }}>
                          (Maximum limit reached)
                        </span>
                      )}
                    </p>
                  )}
                  {!isLab && lastSubmission && (
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
                  disabled={fileList.length === 0 || !canSubmit() || (isLab && submissionCount >= 3)}
                  className={styles.submitButton}
                >
                  {isLab 
                    ? (submissionCount >= 3 
                        ? "Maximum Submissions Reached" 
                        : lastSubmission 
                          ? `Resubmit Lab (${submissionCount}/3)` 
                          : `Submit Lab (${submissionCount}/3)`)
                    : (lastSubmission ? "Resubmit Assignment" : "Submit Assignment")
                  }
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {isExam && !isPracticalExam && (
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

      {(!isExam || isPracticalExam) && (
        <div className={styles.contentSection} style={{ marginTop: "24px" }}>
          <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
            Deadline
          </Title>
          <DeadlineDisplay date={data.date} />
        </div>
      )}

      {(!isExam || isPracticalExam) && (
        <RequirementModal
          open={isRequirementModalVisible}
          onCancel={() => setIsRequirementModalVisible(false)}
          title={data.title}
          content={data.requirementContent}
          classAssessmentId={data.classAssessmentId}
          classId={data.classId}
          assessmentTemplateId={data.assessmentTemplateId}
          courseElementId={data.courseElementId}
          examSessionId={data.examSessionId}
        />
      )}

      <ScoreFeedbackModal
        open={isScoreModalVisible}
        onCancel={() => setIsScoreModalVisible(false)}
        data={data}
      />

      {isLab && data.assessmentTemplateId && (
        <PaperAssignmentModal
          isOpen={isPaperModalVisible}
          onClose={() => setIsPaperModalVisible(false)}
          classAssessmentId={data.classAssessmentId}
          classId={data.classId}
        />
      )}
    </div>
  );
}
