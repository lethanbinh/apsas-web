"use client";

import { Button, Modal, Spin, Table, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toVietnamTime } from "../utils/dateUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Text } = Typography;

interface GradeItemHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  selectedGradeItem: GradeItem | null;
}

export function GradeItemHistoryModal({
  visible,
  onClose,
  selectedGradeItem,
}: GradeItemHistoryModalProps) {

  const { data: gradeItemHistoryData, isLoading: loadingGradeItemHistory } = useQuery({
    queryKey: ['gradeItemHistory', selectedGradeItem?.gradingSessionId, selectedGradeItem?.rubricItemDescription],
    queryFn: async () => {
      if (!selectedGradeItem) return { items: [] };
      const result = await gradeItemService.getGradeItems({
        gradingSessionId: selectedGradeItem.gradingSessionId,
        pageNumber: 1,
        pageSize: 1000,
      });
      const filteredItems = result.items.filter(
        (item) => item.rubricItemDescription === selectedGradeItem.rubricItemDescription
      );
      return {
        items: [...filteredItems].sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          const createdA = new Date(a.createdAt).getTime();
          const createdB = new Date(b.createdAt).getTime();
          return createdB - createdA;
        }),
      };
    },
    enabled: visible && !!selectedGradeItem,
  });

  const gradeItemHistory = gradeItemHistoryData?.items || [];

  return (
    <Modal
      title={
        <div>
          <Text strong>Grade Item Edit History</Text>
          {selectedGradeItem && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Rubric: {selectedGradeItem.rubricItemDescription} |
                Total edits: {gradeItemHistory.length}
              </Text>
            </div>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={900}
    >
      <Spin spinning={loadingGradeItemHistory}>
        {gradeItemHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No edit history available</Text>
          </div>
        ) : (
          <Table
            columns={[
              {
                title: "Edit #",
                key: "index",
                width: "8%",
                align: "center" as const,
                render: (_: any, __: any, index: number) => (
                  <Tag color={index === 0 ? "green" : "default"}>
                    {index + 1}
                  </Tag>
                ),
              },
              {
                title: "Score",
                dataIndex: "score",
                key: "score",
                width: "15%",
                align: "center" as const,
                render: (score: number) => (
                  <Tag color={score > 0 ? "green" : "default"}>
                    {score.toFixed(2)}
                  </Tag>
                ),
              },
              {
                title: "Comments",
                dataIndex: "comments",
                key: "comments",
                width: "35%",
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
                title: "Updated At",
                dataIndex: "updatedAt",
                key: "updatedAt",
                width: "21%",
                render: (date: string) => (
                  <Text style={{ fontSize: "12px" }}>
                    {toVietnamTime(date).format("DD/MM/YYYY HH:mm:ss")}
                  </Text>
                ),
              },
              {
                title: "Created At",
                dataIndex: "createdAt",
                key: "createdAt",
                width: "21%",
                render: (date: string) => (
                  <Text style={{ fontSize: "12px" }}>
                    {toVietnamTime(date).format("DD/MM/YYYY HH:mm:ss")}
                  </Text>
                ),
              },
            ]}
            dataSource={gradeItemHistory}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Spin>
    </Modal>
  );
}

