"use client";

import { Button, Collapse, Descriptions, Modal, Space, Spin, Table, Tag, Typography, Alert, Divider } from "antd";
import { HistoryOutlined } from "@ant-design/icons";
import { useQuery, useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { gradingService } from "@/services/gradingService";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import { useState, useMemo } from "react";
import { App } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { GradeItemHistoryModal } from "./GradeItemHistoryModal";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

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

interface GradingHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  submissionId: number;
}

export function GradingHistoryModal({
  visible,
  onClose,
  submissionId,
}: GradingHistoryModalProps) {
  const { message } = App.useApp();
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [gradeItemHistoryModalVisible, setGradeItemHistoryModalVisible] = useState(false);
  const [selectedGradeItem, setSelectedGradeItem] = useState<GradeItem | null>(null);

  // Fetch grading history using TanStack Query
  const { data: gradingHistoryData, isLoading: loadingGradingHistory } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId, pageNumber: 1, pageSize: 1000 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: visible && !!submissionId,
  });

  const gradingHistory = useMemo(() => {
    if (!gradingHistoryData?.items) return [];
    return [...gradingHistoryData.items].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order
    });
  }, [gradingHistoryData]);

  // Fetch grade items for ALL sessions (not just expanded ones) to calculate scores correctly
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
        map[sessionId] = gradeItemsQueries[index].data.items;
      }
    });
    return map;
  }, [allSessionIds, gradeItemsQueries]);

  const handleExpandSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const handleOpenGradeItemHistory = (gradeItem: GradeItem) => {
    setSelectedGradeItem(gradeItem);
    setGradeItemHistoryModalVisible(true);
  };

  const columns = [
    {
      title: "Rubric Item",
      dataIndex: "rubricItemDescription",
      key: "rubricItemDescription",
      width: "25%",
    },
    {
      title: "Question",
      dataIndex: "questionText",
      key: "questionText",
      width: "15%",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Max Score",
      dataIndex: "rubricItemMaxScore",
      key: "rubricItemMaxScore",
      width: "12%",
      align: "center" as const,
      render: (score: number) => <Tag color="blue">{score.toFixed(2)}</Tag>,
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      width: "12%",
      align: "center" as const,
      render: (score: number) => <Tag color={score > 0 ? "green" : "default"}>{score.toFixed(2)}</Tag>,
    },
    {
      title: "Comments",
      dataIndex: "comments",
      key: "comments",
      width: "20%",
      render: (text: string) => (
        <Text
          style={{
            fontSize: "12px",
            whiteSpace: "normal",
            wordWrap: "break-word",
            wordBreak: "break-word"
          }}
        >
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: "16%",
      align: "center" as const,
      render: (_: any, record: GradeItem) => (
        <Button
          type="link"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => handleOpenGradeItemHistory(record)}
        >
          Edit History
        </Button>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="Grading History"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ]}
        width={1200}
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

                // Calculate scores from gradeItems if available, otherwise use session.grade
                const totalScore = gradeItems.length > 0 
                  ? gradeItems.reduce((sum, item) => sum + item.score, 0)
                  : (session.grade || 0);
                const maxScore = gradeItems.length > 0
                  ? gradeItems.reduce((sum, item) => sum + (item.rubricItemMaxScore || 0), 0)
                  : 0;
                
                // Grade display: use totalScore from gradeItems if available, otherwise session.grade
                // Only show maxScore if we have gradeItems
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

                      {/* Grading Logs Section */}
                      {session.gradingLogs && session.gradingLogs.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <Title level={5} style={{ marginBottom: 8 }}>
                            Grading Logs ({session.gradingLogs.length})
                          </Title>
                          <Alert
                            message="Grading Notes"
                            description={
                              <div>
                                {session.gradingLogs.map((log, index) => (
                                  <div key={log.id} style={{ marginBottom: index < session.gradingLogs.length - 1 ? 12 : 0 }}>
                                    <div style={{ marginBottom: 4 }}>
                                      <Tag color="blue">{log.action}</Tag>
                                      <Text type="secondary" style={{ fontSize: "12px", marginLeft: 8 }}>
                                        {toVietnamTime(log.timestamp).format("DD/MM/YYYY HH:mm:ss")}
                                      </Text>
                                    </div>
                                    <Text style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>
                                      {log.details}
                                    </Text>
                                    {index < session.gradingLogs.length - 1 && <Divider style={{ margin: "8px 0" }} />}
                                  </div>
                                ))}
                              </div>
                            }
                            type="info"
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
                              columns={columns}
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
      </Modal>

      <GradeItemHistoryModal
        visible={gradeItemHistoryModalVisible}
        onClose={() => {
          setGradeItemHistoryModalVisible(false);
          setSelectedGradeItem(null);
        }}
        selectedGradeItem={selectedGradeItem}
      />
    </>
  );
}

