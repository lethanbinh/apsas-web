"use client";

import { SemesterCrudModal } from "@/components/modals/SemesterCrudModal";
import { Semester, semesterService } from "@/services/semesterService";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Space,
  Spin,
  Table,
  TableProps,
  Typography,
} from "antd";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";

const { Title } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

const SemesterManagementPageContent = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const { modal } = App.useApp();

  const fetchSemesters = useCallback(async () => {
    try {
      setLoading(true);
      const data = await semesterService.getSemesters({
        pageNumber: 1,
        pageSize: 1000,
      });
      setSemesters(data);
    } catch (err: any) {
      console.error("Failed to fetch semesters:", err);
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const handleOpenCreate = () => {
    setEditingSemester(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: Semester) => {
    setEditingSemester(record);
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingSemester(null);
  };

  const handleModalOk = () => {
    setIsModalOpen(false);
    setEditingSemester(null);
    fetchSemesters();
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Are you sure you want to delete this semester?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await semesterService.deleteSemester(id);
          fetchSemesters();
        } catch (err) {
          console.error("Failed to delete semester:", err);
        }
      },
    });
  };

  const columns: TableProps<Semester>["columns"] = [
    {
      title: "Semester Code",
      dataIndex: "semesterCode",
      key: "semesterCode",
    },
    {
      title: "Academic Year",
      dataIndex: "academicYear",
      key: "academicYear",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy"),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "2rem", background: "#f0f7ff", minHeight: "100vh" }}>
      <Space
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Title
          style={{ color: "rgb(47, 50, 125)", fontWeight: "bold" }}
          level={2}
        >
          Semester Management
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
        >
          Create Semester
        </Button>
      </Space>

      {loading && (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      )}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {!loading && !error && (
        <Table
          columns={columns}
          dataSource={semesters}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      )}

      <SemesterCrudModal
        open={isModalOpen}
        initialData={editingSemester}
        existingSemesters={semesters}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
      />
    </div>
  );
};

export default function SemesterManagementPage() {
  return <SemesterManagementPageContent />;
}
