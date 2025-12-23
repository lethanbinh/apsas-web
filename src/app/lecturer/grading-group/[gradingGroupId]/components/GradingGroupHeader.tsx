import { Button, Space } from "antd";
import { ArrowLeftOutlined, FileExcelOutlined, RobotOutlined, UploadOutlined, EyeOutlined } from "@ant-design/icons";
interface GradingGroupHeaderProps {
  title: string;
  onBack: () => void;
  onExportGradeReport: () => void;
  onUploadGradeSheet: () => void;
  onBatchGrading: () => void;
  onViewExam: () => void;
  batchGradingLoading: boolean;
  submissionsCount: number;
  semesterEnded: boolean;
  isGradeSheetSubmitted: boolean;
  selectedCount?: number;
}
export function GradingGroupHeader({
  title,
  onBack,
  onExportGradeReport,
  onUploadGradeSheet,
  onBatchGrading,
  onViewExam,
  batchGradingLoading,
  submissionsCount,
  semesterEnded,
  isGradeSheetSubmitted,
  selectedCount = 0,
}: GradingGroupHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          Back
        </Button>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, lineHeight: '32px' }}>
          {title}
        </h3>
      </Space>
      <Space>
        <Button
          icon={<EyeOutlined />}
          onClick={onViewExam}
          size="large"
        >
          View Exam
        </Button>
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
          disabled={semesterEnded || isGradeSheetSubmitted}
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
            disabled={semesterEnded || isGradeSheetSubmitted || selectedCount === 0}
          >
            Grade Selected {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        )}
      </Space>
    </div>
  );
}