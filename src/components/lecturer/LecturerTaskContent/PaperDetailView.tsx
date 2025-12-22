"use client";

import { AssessmentPaper } from "@/services/assessmentPaperService";
import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Typography } from "antd";
import { useState } from "react";
import { PaperFormModal } from "./PaperFormModal";
import styles from "./TaskContent.module.css";

const { Title } = Typography;

interface PaperDetailViewProps {
  paper: AssessmentPaper;
  isEditable: boolean;
  onPaperChange: () => void;
  onResetStatus?: () => Promise<void>;
  updateStatusToInProgress?: () => Promise<void>;
}

export const PaperDetailView = ({
  paper,
  isEditable,
  onPaperChange,
  onResetStatus,
  updateStatusToInProgress,
}: PaperDetailViewProps) => {
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Title level={4} className={styles.cardTitle} style={{ margin: 0 }}>Paper Details</Title>
        {isEditable && (
          <Button
            icon={<EditOutlined />}
            onClick={() => setIsPaperModalOpen(true)}
            className={styles.button}
          >
            Edit Paper
          </Button>
        )}
      </div>
      <div className={styles.cardBody}>
        <Descriptions bordered column={1} className={styles.descriptions}>
        <Descriptions.Item label="Paper Name">{paper.name}</Descriptions.Item>
        <Descriptions.Item label="Description">
          {paper.description || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Language">
          {paper.language === 0 ? "CSharp" : paper.language === 1 ? "C" : paper.language === 2 ? "Java" : "N/A"}
        </Descriptions.Item>
      </Descriptions>
      </div>

      <PaperFormModal
        open={isPaperModalOpen}
        onCancel={() => setIsPaperModalOpen(false)}
        onFinish={async () => {
          setIsPaperModalOpen(false);
          onPaperChange();
          if (updateStatusToInProgress) {
            await updateStatusToInProgress();
          }
        }}
        isEditable={isEditable}
        initialData={paper}
      />
    </div>
  );
};

