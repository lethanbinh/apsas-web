"use client";

import PaperAssignmentModal from "@/components/features/PaperAssignmentModal";
import { Submission } from "@/services/submissionService";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  HistoryOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Alert, Button as AntButton, App, List, Modal, Space, Tag, Typography, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useState } from "react";
import { Button } from "../ui/Button";
import { useAssignmentData } from "./AssignmentItem/hooks/useAssignmentData";
import { useSubmissionHandlers } from "./AssignmentItem/hooks/useSubmissionHandlers";
import { toVietnamTime } from "./AssignmentItem/utils";
import styles from "./AssignmentList.module.css";
import { AssignmentData } from "./data";
import { DeadlineDisplay } from "./DeadlineDisplay";
import { RequirementModal } from "./RequirementModal";
import { ScoreFeedbackModal } from "./ScoreFeedbackModal";

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

interface AssignmentItemProps {
  data: AssignmentData;
  isExam?: boolean;
  isLab?: boolean;
  isPracticalExam?: boolean;
}

export function AssignmentItem({ data, isExam = false, isLab = false, isPracticalExam = false }: AssignmentItemProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isRequirementModalVisible, setIsRequirementModalVisible] = useState(false);
  const [isScoreModalVisible, setIsScoreModalVisible] = useState(false);
  const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const { message } = App.useApp();

  const {
    lastSubmission,
    submissionCount,
    labSubmissionHistory,
    labSubmissionScores,
  } = useAssignmentData(data, isLab);

  const {
    handleSubmit: handleSubmitFile,
    canSubmit,
    hasDeadline,
    hasStartDate,
    isDeadlinePassed,
    isBeforeStartDate,
    isSubmitting,
  } = useSubmissionHandlers(data, isLab, lastSubmission, submissionCount);

  const handleSubmit = async () => {
    if (fileList.length === 0) {
      message.warning("Please select a file to submit");
      return;
    }

    const file = fileList[0].originFileObj as File;
    if (!file) {
      message.warning("Please select a valid file");
      return;
    }

    await handleSubmitFile(file);
    setFileList([]);
    setIsSubmitModalVisible(false);
  };

  const uploadProps = {
    fileList,
    onRemove: (file: UploadFile) => {
      setFileList((prevList) => prevList.filter((f) => f.uid !== file.uid));
    },
    beforeUpload: (file: File) => {
      const isZip = file.type === "application/zip" ||
        file.type === "application/x-zip-compressed" ||
        file.name.toLowerCase().endsWith(".zip");
      if (!isZip) {
        message.error("Chỉ chấp nhận file ZIP. Vui lòng chọn file ZIP để nộp.");
        return false;
      }

      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file as any,
      };
      setFileList([uploadFile]);
      return false;
    },
  };

  return (
    <div className={styles.itemContent}>
      {(!isExam || isPracticalExam) && (
        <>
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

          <div className={styles.contentSection} style={{ marginTop: "24px" }}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              {data.startAt ? "Submission Period" : "Deadline"}
            </Title>
            <DeadlineDisplay date={data.date} startDate={data.startAt} />
          </div>

          {isLab && labSubmissionHistory.length > 0 && (
            <div className={styles.contentSection} style={{ marginTop: "24px" }}>
              <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
                <HistoryOutlined style={{ marginRight: 8 }} />
                Submission History
              </Title>
              <List
                size="small"
                dataSource={labSubmissionHistory}
                renderItem={(submission: Submission, index: number) => (
                  <List.Item
                    style={{
                      padding: "8px 12px",
                      backgroundColor: index === 0 ? "#f0f9ff" : "#fafafa",
                      border: index === 0 ? "1px solid #1890ff" : "1px solid #e8e8e8",
                      borderRadius: "4px",
                      marginBottom: "8px",
                    }}
                    actions={
                      submission.submissionFile?.submissionUrl
                        ? [
                          <AntButton
                            key="download"
                            type="link"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = submission.submissionFile!.submissionUrl;
                              link.download = submission.submissionFile!.name || "submission.zip";
                              link.target = "_blank";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            Download
                          </AntButton>,
                        ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong style={{ fontSize: "13px" }}>
                            {toVietnamTime(submission.updatedAt || submission.submittedAt).format("DD/MM/YYYY HH:mm")}
                          </Text>
                          {index === 0 && <Tag color="blue">Latest</Tag>}
                          {labSubmissionScores[submission.id] !== undefined && (
                            <Tag color="green">
                              Score: {labSubmissionScores[submission.id].max > 0
                                ? `${Number(labSubmissionScores[submission.id].total).toFixed(2)}/${Number(labSubmissionScores[submission.id].max).toFixed(2)}`
                                : Number(labSubmissionScores[submission.id].total).toFixed(2)}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        submission.submissionFile ? (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            <FileTextOutlined style={{ marginRight: 4 }} />
                            {submission.submissionFile.name}
                          </Text>
                        ) : (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            No file
                          </Text>
                        )
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}

          {!isLab && (
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
                        Submitted on: {toVietnamTime(lastSubmission.updatedAt || lastSubmission.submittedAt).format("DD MMM YYYY, HH:mm")}
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
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => setIsSubmitModalVisible(true)}
                  disabled={!canSubmit()}
                  className={styles.submitButton}
                  icon={<UploadOutlined />}
                >
                  {lastSubmission ? "Resubmit Assignment" : "Submit Assignment"}
                </Button>
              )}
            </div>
          )}

          {isLab && (
            <div style={{ marginTop: "16px" }}>
              <Button
                variant="primary"
                size="large"
                onClick={() => setIsSubmitModalVisible(true)}
                disabled={!canSubmit() || submissionCount >= 3}
                className={styles.submitButton}
                icon={<UploadOutlined />}
              >
                {submissionCount >= 3
                  ? "Maximum Submissions Reached"
                  : lastSubmission
                    ? `Resubmit Lab (${submissionCount}/3)`
                    : `Submit Lab (${submissionCount}/3)`}
              </Button>
            </div>
          )}
        </>
      )}

      {isExam && !isPracticalExam && (
        <>
          <div className={styles.contentSection} style={{ marginTop: "24px" }}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              {data.startAt ? "Submission Period" : "Deadline"}
            </Title>
            <DeadlineDisplay date={data.date} startDate={data.startAt} />
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

      <Modal
        title={isLab
          ? (lastSubmission ? `Resubmit Lab (${submissionCount}/3)` : `Submit Lab (${submissionCount}/3)`)
          : (lastSubmission ? "Resubmit Assignment" : "Submit Assignment")
        }
        open={isSubmitModalVisible}
        onCancel={() => {
          setIsSubmitModalVisible(false);
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            {isLab && (
              <div style={{ marginBottom: 8 }}>
                Submission attempts: {submissionCount}/3
                {submissionCount >= 3 && (
                  <span style={{ color: "#ff4d4f", marginLeft: "8px" }}>
                    (Maximum limit reached)
                  </span>
                )}
              </div>
            )}
            {!isLab && lastSubmission && (
              <div style={{ marginBottom: 8 }}>
                You can submit multiple times. The latest submission will be used.
              </div>
            )}
          </Text>
        </div>
        <Dragger {...uploadProps} accept=".zip" disabled={!canSubmit() || (isLab && submissionCount >= 3)}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">
            Drag & drop your ZIP file here, or click to browse
          </p>
          <p className="ant-upload-hint" style={{ color: "#999", fontSize: "12px" }}>
            Chỉ chấp nhận file ZIP
          </p>
        </Dragger>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button
            onClick={() => {
              setIsSubmitModalVisible(false);
              setFileList([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={fileList.length === 0 || !canSubmit() || (isLab && submissionCount >= 3)}
          >
            Submit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
