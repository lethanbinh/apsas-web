// Tên file: components/AssignmentList/AssignmentItem.tsx
"use client";

import React, { useState } from "react";
import { App, Typography, Alert, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  UploadOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./AssignmentList.module.css";
import { AssignmentData } from "./data";
import { RequirementModal } from "./RequirementModal";
import { ScoreFeedbackModal } from "./ScoreFeedbackModal";

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

interface AssignmentItemProps {
  data: AssignmentData;
}

export function AssignmentItem({ data }: AssignmentItemProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isRequirementModalVisible, setIsRequirementModalVisible] =
    useState(false);
  const [isScoreModalVisible, setIsScoreModalVisible] = useState(false);
  const { message } = App.useApp();

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      message.success("Your assignment has been submitted successfully!");
    }, 1500);
  };

  const uploadProps = {
    fileList,
    onRemove: (file: UploadFile) => {
      setFileList((prevList) => prevList.filter((f) => f.uid !== file.uid));
    },
    beforeUpload: (file: UploadFile) => {
      setFileList([file]);
      return false;
    },
  };

  return (
    <div className={styles.itemContent}>
      <div className={styles.contentSection}>
        <Title level={5} style={{ fontWeight: 600 }}>
          Description
        </Title>
        <Paragraph style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
          {data.description}
        </Paragraph>
      </div>

      <div className={styles.contentSection}>
        <Title level={5} style={{ fontWeight: 600 }}>
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
          <Alert
            message={
              <a href="#" download>
                {data.requirementFile}
              </a>
            }
            type="info"
            showIcon
            icon={<FilePdfOutlined />}
            className={styles.requirementAlert}
          />
          {data.databaseFile && (
            <Alert
              message={
                <a href="#" download>
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
        <Title level={5} style={{ fontWeight: 600 }}>
          Your Submission
        </Title>
        {isSubmitted ? (
          <Alert
            message="Submitted Successfully"
            description="You have submitted this assignment."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        ) : (
          <>
            <Dragger {...uploadProps} className={styles.uploadDragger}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">
                Drag & drop your file here, or click to browse
              </p>
            </Dragger>
            <Button
              variant="primary"
              size="large"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={fileList.length === 0}
              className={styles.submitButton}
            >
              Submit Assignment
            </Button>
          </>
        )}
      </div>

      <RequirementModal
        open={isRequirementModalVisible}
        onCancel={() => setIsRequirementModalVisible(false)}
        title={data.title}
        content={data.requirementContent}
      />

      <ScoreFeedbackModal
        open={isScoreModalVisible}
        onCancel={() => setIsScoreModalVisible(false)}
        data={data}
      />
    </div>
  );
}
