"use client";

import {
  ExamSession,
  ExamSessionStudent,
  examSessionService,
} from "@/services/examSessionService";
import type { TableProps } from "antd";
import { Button, Modal, Spin, Table } from "antd";
import { useEffect, useState } from "react";

interface ViewStudentsModalProps {
  open: boolean;
  session: ExamSession;
  onCancel: () => void;
}

export const ViewStudentsModal: React.FC<ViewStudentsModalProps> = ({
  open,
  session,
  onCancel,
}) => {
  const [students, setStudents] = useState<ExamSessionStudent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchStudents = async () => {
        setLoading(true);
        try {
          const response =
            await examSessionService.getExamSessionStudents(session.id);
          setStudents(response.students || []);
        } catch (err) {
          console.error("Failed to fetch exam session students:", err);
          setStudents([]);
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [open, session.id]);

  const columns: TableProps<ExamSessionStudent>["columns"] = [
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
    },
  ];

  return (
    <Modal
      title={`Students in ${session.classCode}`}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Close
        </Button>,
      ]}
      width={800}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "30px" }}>
          <Spin />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={students}
          rowKey="studentId"
          pagination={false}
          size="small"
        />
      )}
    </Modal>
  );
};
