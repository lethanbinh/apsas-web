"use client";

import { AssessmentPaper } from "@/services/assessmentPaperService";
import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Typography } from "antd";
import { useState } from "react";
import { PaperFormModal } from "./PaperFormModal";

const { Title } = Typography;

interface PaperDetailViewProps {
  paper: AssessmentPaper;
  isEditable: boolean;
  onPaperChange: () => void;
  onResetStatus?: () => Promise<void>;
}

export const PaperDetailView = ({
  paper,
  isEditable,
  onPaperChange,
  onResetStatus,
}: PaperDetailViewProps) => {
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);

  return (
    <Card
      title={<Title level={4}>Paper Details</Title>}
      extra={
        isEditable && (
          <Button
            icon={<EditOutlined />}
            onClick={() => setIsPaperModalOpen(true)}
          >
            Edit Paper
          </Button>
        )
      }
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Paper Name">{paper.name}</Descriptions.Item>
        <Descriptions.Item label="Description">
          {paper.description || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Language">
          {paper.language === 0 ? "CSharp" : paper.language === 1 ? "C" : paper.language === 2 ? "Java" : "N/A"}
        </Descriptions.Item>
      </Descriptions>

      <PaperFormModal
        open={isPaperModalOpen}
        onCancel={() => setIsPaperModalOpen(false)}
        onFinish={() => {
          setIsPaperModalOpen(false);
          onPaperChange();
          // Note: Edit paper does NOT resolve question comments, so we don't reset status here
        }}
        isEditable={isEditable}
        initialData={paper}
      />
    </Card>
  );
};

