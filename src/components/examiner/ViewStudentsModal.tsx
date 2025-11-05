"use client";

import { StudentInClass } from "@/services/classService";
import { ExamSession } from "@/services/examSessionService";
import {
    studentManagementService,
} from "@/services/studentManagementService";
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
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      const fetchStudents = async () => {
        setLoading(true);
        try {
          const data = await studentManagementService.getStudentsInClass(
            session.classId
          );
          setStudents(data);
        } catch (err) {
          console.error("Failed to fetch students:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [open, session.classId]);

  const columns: TableProps<StudentInClass>["columns"] = [
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
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
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
          rowKey="id"
          pagination={false}
          size="small"
        />
      )}
    </Modal>
  );
};
