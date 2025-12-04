import { Button, Space, Typography } from "antd";
import { ArrowLeftOutlined, FileExcelOutlined, RobotOutlined, UploadOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface GradingGroupHeaderProps {
  title: string;
  onBack: () => void;
  onExportGradeReport: () => void;
  onUploadGradeSheet: () => void;
  onBatchGrading: () => void;
  batchGradingLoading: boolean;
  submissionsCount: number;
  semesterEnded: boolean;
}

export function GradingGroupHeader({
  title,
  onBack,
  onExportGradeReport,
  onUploadGradeSheet,
  onBatchGrading,
  batchGradingLoading,
  submissionsCount,
  semesterEnded,
}: GradingGroupHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          Back
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {title}
        </Title>
      </Space>
      <Space>
        <Button
          icon={<FileExcelOutlined />}
          onClick={onExportGradeReport}
          disabled={semesterEnded || submissionsCount === 0}
          size="large"
        >
          Export Grade Report
        </Button>
        <Button
          icon={<UploadOutlined />}
          onClick={onUploadGradeSheet}
          disabled={semesterEnded}
          size="large"
        >
          Submit Grade Sheet
        </Button>
        {submissionsCount > 0 && (
          <Button
            icon={<RobotOutlined />}
            onClick={onBatchGrading}
            loading={batchGradingLoading}
            type="primary"
            size="large"
            disabled={semesterEnded}
          >
            Batch Grade
          </Button>
        )}
      </Space>
    </div>
  );
}

