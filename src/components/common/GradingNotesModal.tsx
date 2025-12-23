"use client";
import { Modal, Timeline, Tag, Typography, Space, Divider } from "antd";
import { WarningOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
const { Title, Text } = Typography;
interface GradingLog {
  id: number;
  action: string;
  timestamp: string;
  details: string;
}
interface GradingNotesModalProps {
  open: boolean;
  onClose: () => void;
  gradingLogs: GradingLog[];
}
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};
export function GradingNotesModal({
  open,
  onClose,
  gradingLogs,
}: GradingNotesModalProps) {
  if (!gradingLogs || gradingLogs.length === 0) {
    return null;
  }
  const getActionColor = (action: string): string => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("error") || actionLower.includes("fail")) {
      return "red";
    }
    if (actionLower.includes("warning") || actionLower.includes("warn")) {
      return "orange";
    }
    if (actionLower.includes("info") || actionLower.includes("note")) {
      return "blue";
    }
    if (actionLower.includes("success") || actionLower.includes("complete")) {
      return "green";
    }
    return "blue";
  };
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      closeIcon={<CloseOutlined />}
      zIndex={2000}
      getContainer={() => document.body}
      title={
        <Space>
          <WarningOutlined style={{ color: "#faad14", fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>
            Grading Notes ({gradingLogs.length})
          </Title>
        </Space>
      }
      styles={{
        body: {
          padding: "24px",
          maxHeight: "70vh",
          overflowY: "auto",
        },
      }}
      maskStyle={{
        zIndex: 1999,
      }}
    >
      <div style={{ marginTop: 8 }}>
        <Timeline
          items={gradingLogs.map((log, index) => ({
            key: log.id,
            color: getActionColor(log.action),
            children: (
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: index % 2 === 0 ? "#fafafa" : "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #f0f0f0",
                  marginBottom: index < gradingLogs.length - 1 ? 16 : 0,
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <Tag
                    color={getActionColor(log.action)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "4px 12px",
                      borderRadius: "4px",
                    }}
                  >
                    {log.action}
                  </Tag>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  >
                    {toVietnamTime(log.timestamp).format("DD/MM/YYYY HH:mm:ss")}
                  </Text>
                </div>
                <Divider style={{ margin: "8px 0" }} />
                <Text
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#262626",
                  }}
                >
                  {log.details}
                </Text>
              </div>
            ),
          }))}
        />
      </div>
    </Modal>
  );
}