"use client";
import { GradingNotesModal } from "@/components/common/GradingNotesModal";
import { queryKeys } from "@/lib/react-query";
import { GradeItem, gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { WarningOutlined } from "@ant-design/icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Alert, Button, Collapse, Descriptions, Modal, Space, Spin, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useMemo, useState } from "react";
dayjs.extend(utc);
dayjs.extend(timezone);
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};
const { Title, Text } = Typography;
interface GradingHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  submissionId: number | null;
}
export function GradingHistoryModal({ visible, onClose, submissionId }: GradingHistoryModalProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [gradingNotesModalOpen, setGradingNotesModalOpen] = useState(false);
  const [selectedGradingLogs, setSelectedGradingLogs] = useState<any[]>([]);
  const { data: gradingSessionsData, isLoading: loadingGradingHistory } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 1000 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!submissionId && visible,
  });
  const gradingHistory = useMemo(() => {
    if (!gradingSessionsData?.items) return [];
    return [...gradingSessionsData.items].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [gradingSessionsData]);
  const allSessionIds = gradingHistory.map(session => session.id);
  const gradeItemsQueries = useQueries({
    queries: allSessionIds.map((sessionId) => ({
      queryKey: ['gradeItems', 'byGradingSessionId', sessionId],
      queryFn: () => gradeItemService.getGradeItems({
        gradingSessionId: sessionId,
        pageNumber: 1,
        pageSize: 1000,
      }),
      enabled: visible && allSessionIds.length > 0,
    })),
  });
  const sessionGradeItems = useMemo(() => {
    const map: { [sessionId: number]: GradeItem[] } = {};
    allSessionIds.forEach((sessionId, index) => {
      if (gradeItemsQueries[index]?.data?.items) {
        map[sessionId] = gradeItemsQueries[index].data!.items;
      }
    });
    return map;
  }, [allSessionIds, gradeItemsQueries]);
  const getGradingTypeLabel = (type: number) => {
    switch (type) {
      case 0: return "AI";
      case 1: return "LECTURER";
      case 2: return "BOTH";
      default: return "UNKNOWN";
    }
  };
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return <Tag color="processing">PROCESSING</Tag>;
      case 1: return <Tag color="success">COMPLETED</Tag>;
      case 2: return <Tag color="error">FAILED</Tag>;
      default: return <Tag>UNKNOWN</Tag>;
    }
  };
  const handleExpandSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    const isCurrentlyExpanded = newExpanded.has(sessionId);
    if (isCurrentlyExpanded) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };
  return (
    <Modal
      title="Grading History"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={1000}
    >
      <Spin spinning={loadingGradingHistory}>
        {gradingHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No grading history available</Text>
          </div>
        ) : (
          <Collapse
            items={gradingHistory.map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              const gradeItems = sessionGradeItems[session.id] || [];
              const totalScore = gradeItems.length > 0
                ? gradeItems.reduce((sum, item) => sum + item.score, 0)
                : (session.grade || 0);
              const maxScore = gradeItems.length > 0
                ? gradeItems.reduce((sum, item) => sum + (item.rubricItemMaxScore || 0), 0)
                : 0;
              const gradeDisplay = gradeItems.length > 0 && maxScore > 0
                ? `${totalScore.toFixed(2)}/${maxScore.toFixed(2)}`
                : totalScore.toFixed(2);
              return {
                key: session.id.toString(),
                label: (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <Text strong>Session #{session.id}</Text>
                      <Space style={{ marginLeft: 16 }}>
                        {getStatusLabel(session.status)}
                        <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                        <Tag color="blue">Grade: {gradeDisplay}</Tag>
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {toVietnamTime(session.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  </div>
                ),
                children: (
                  <div>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Grading Session ID">{session.id}</Descriptions.Item>
                      <Descriptions.Item label="Status">{getStatusLabel(session.status)}</Descriptions.Item>
                      <Descriptions.Item label="Grading Type">
                        <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Grade">{gradeDisplay}</Descriptions.Item>
                      <Descriptions.Item label="Grade Item Count">{session.gradeItemCount}</Descriptions.Item>
                      <Descriptions.Item label="Created At">
                        {toVietnamTime(session.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated At">
                        {toVietnamTime(session.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                    </Descriptions>
                    { }
                    {session.gradingLogs && session.gradingLogs.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5} style={{ marginBottom: 8 }}>
                          Grading Logs ({session.gradingLogs.length})
                        </Title>
                        <Alert
                          message="Grading Notes"
                          description={
                            <Button
                              type="link"
                              icon={<WarningOutlined />}
                              onClick={() => {
                                setSelectedGradingLogs(session.gradingLogs);
                                setGradingNotesModalOpen(true);
                              }}
                              style={{ padding: 0, height: "auto" }}
                            >
                              View warning ({session.gradingLogs.length})
                            </Button>
                          }
                          type="warning"
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                      </div>
                    )}
                    {!isExpanded ? (
                      <Button
                        type="link"
                        onClick={() => handleExpandSession(session.id)}
                        style={{ padding: 0 }}
                      >
                        View grade items details
                      </Button>
                    ) : (
                      <div>
                        <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                          Grade Items ({gradeItems.length})
                        </Title>
                        {gradeItems.length === 0 ? (
                          <Text type="secondary">No grade items</Text>
                        ) : (
                          <Table
                            columns={[
                              { title: "ID", dataIndex: "id", key: "id" },
                              { title: "Rubric Item ID", dataIndex: "rubricItemId", key: "rubricItemId" },
                              { title: "Score", dataIndex: "score", key: "score" },
                              { title: "Comments", dataIndex: "comments", key: "comments", ellipsis: true },
                            ]}
                            dataSource={gradeItems}
                            rowKey="id"
                            pagination={false}
                            size="small"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        )}
      </Spin>
      <GradingNotesModal
        open={gradingNotesModalOpen}
        onClose={() => {
          setGradingNotesModalOpen(false);
          setSelectedGradingLogs([]);
        }}
        gradingLogs={selectedGradingLogs}
      />
    </Modal>
  );
}