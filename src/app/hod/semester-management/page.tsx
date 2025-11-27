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
  Input,
  Modal,
  Tooltip,
} from "antd";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title } = Typography;

// Hàm sắp xếp semester theo thứ tự Spring, Summer, Fall trong từng năm
const sortSemesters = (semesters: Semester[]): Semester[] => {
  const seasonOrder: { [key: string]: number } = {
    spring: 1,
    summer: 2,
    fall: 3,
  };

  return [...semesters].sort((a, b) => {
    // Sắp xếp theo academicYear (từ mới đến cũ)
    if (b.academicYear !== a.academicYear) {
      return b.academicYear - a.academicYear;
    }

    // Nếu cùng năm, sắp xếp theo season: Spring -> Summer -> Fall
    const aSeason = a.semesterCode
      .replace(a.academicYear.toString(), "")
      .toLowerCase();
    const bSeason = b.semesterCode
      .replace(b.academicYear.toString(), "")
      .toLowerCase();

    const aOrder = seasonOrder[aSeason] || 999;
    const bOrder = seasonOrder[bSeason] || 999;

    return aOrder - bOrder;
  });
};

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

// Kiểm tra xem semester đã bắt đầu chưa
const isSemesterStarted = (startDate: string): boolean => {
  if (!startDate) return false;
  const semesterStartDate = new Date(
    startDate.endsWith("Z") ? startDate : startDate + "Z"
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  semesterStartDate.setHours(0, 0, 0, 0);
  return semesterStartDate <= today;
};

const SemesterManagementPageContent = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; record: Semester | null; confirmValue: string }>({
    open: false,
    record: null,
    confirmValue: "",
  });
  const { modal, notification } = App.useApp();

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

  const handleDelete = (record: Semester) => {
    // Kiểm tra xem semester đã bắt đầu chưa
    if (isSemesterStarted(record.startDate)) {
      notification.warning({
        message: "Cannot delete semester",
        description: "You cannot delete a semester that has already started.",
      });
      return;
    }

    setDeleteConfirm({
      open: true,
      record,
      confirmValue: "",
    });
  };

  const handleDeleteConfirmCancel = () => {
    setDeleteConfirm({
      open: false,
      record: null,
      confirmValue: "",
    });
  };

  const handleDeleteConfirmOk = async () => {
    if (!deleteConfirm.record) return;
    
    if (deleteConfirm.confirmValue !== deleteConfirm.record.semesterCode) {
      notification.error({
        message: "Confirmation failed",
        description: "The entered semester code does not match.",
      });
      return;
    }

    try {
      await semesterService.deleteSemester(deleteConfirm.record.id);
      notification.success({ message: "Semester deleted successfully!" });
      fetchSemesters();
      setDeleteConfirm({
        open: false,
        record: null,
        confirmValue: "",
      });
    } catch (err: any) {
      console.error("Failed to delete semester:", err);
      notification.error({
        message: "Failed to delete semester",
        description: err.message || "An unknown error occurred.",
      });
    }
  };

  // Sắp xếp semesters trước khi hiển thị
  const sortedSemesters = useMemo(() => {
    return sortSemesters(semesters);
  }, [semesters]);

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
      render: (_, record) => {
        const canDelete = !isSemesterStarted(record.startDate);
        return (
          <Space size="middle">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            >
              Edit
            </Button>
            {canDelete ? (
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              >
                Delete
              </Button>
            ) : (
              <Tooltip title="Cannot delete a semester that has already started">
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  disabled
                >
                  Delete
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
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
          dataSource={sortedSemesters}
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

      <Modal
        title="Are you sure you want to delete this semester?"
        open={deleteConfirm.open}
        onOk={handleDeleteConfirmOk}
        onCancel={handleDeleteConfirmCancel}
        okText="Yes, Delete"
        okType="danger"
        cancelText="No"
        okButtonProps={{
          disabled: deleteConfirm.confirmValue !== deleteConfirm.record?.semesterCode,
        }}
      >
        <div>
          <p style={{ marginBottom: 8 }}>
            This action cannot be undone. Please type <strong>{deleteConfirm.record?.semesterCode}</strong> to confirm.
          </p>
          <Input
            placeholder={`Type "${deleteConfirm.record?.semesterCode}" to confirm`}
            value={deleteConfirm.confirmValue}
            onChange={(e) => {
              setDeleteConfirm(prev => ({
                ...prev,
                confirmValue: e.target.value,
              }));
            }}
            onPressEnter={() => {
              if (deleteConfirm.confirmValue === deleteConfirm.record?.semesterCode) {
                handleDeleteConfirmOk();
              }
            }}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default function SemesterManagementPage() {
  return <SemesterManagementPageContent />;
}
