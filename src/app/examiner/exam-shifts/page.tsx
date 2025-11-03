"use client";
import { ExamShiftModal } from "@/components/examiner/ExamShiftModal";
import {
  ExamShift,
  mockCourses,
  mockExamShifts,
  mockSemesters,
} from "@/components/examiner/mockData";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Button,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import styles from "./ExamShifts.module.css";

const { Title } = Typography;
const { Option } = Select;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

const ExamShiftPageContent = () => {
  const [shifts, setShifts] = useState<ExamShift[]>(mockExamShifts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ExamShift | null>(null);

  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");

  const { modal } = App.useApp();

  const handleOpenCreate = () => {
    setEditingShift(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: ExamShift) => {
    setEditingShift(record);
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingShift(null);
  };

  const handleModalOk = (values: ExamShift) => {
    setLoading(true);
    if (editingShift) {
      setShifts(
        shifts.map((s) => (s.id === values.id ? { ...s, ...values } : s))
      );
    } else {
      const newShift = {
        ...values,
        id: Math.max(...shifts.map((s) => s.id)) + 1,
      };
      setShifts([newShift, ...shifts]);
    }
    setLoading(false);
    setIsModalOpen(false);
    setEditingShift(null);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Are you sure you want to delete this exam shift?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        setLoading(true);
        setShifts(shifts.filter((s) => s.id !== id));
        setLoading(false);
      },
    });
  };

  const filteredData = useMemo(() => {
    return shifts.filter((shift) => {
      const semesterMatch =
        filterSemester === "all" || shift.semester === filterSemester;
      const courseMatch =
        filterCourse === "all" || shift.course === filterCourse;
      return semesterMatch && courseMatch;
    });
  }, [shifts, filterSemester, filterCourse]);

  const columns: TableProps<ExamShift>["columns"] = [
    {
      title: "No",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Paper",
      dataIndex: "paper",
      key: "paper",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Start date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
      sorter: (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    },
    {
      title: "End date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Course",
      dataIndex: "course",
      key: "course",
    },
    {
      title: "Semester",
      dataIndex: "semester",
      key: "semester",
    },
    {
      title: "Lecturer",
      dataIndex: "lecturer",
      key: "lecturer",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title level={2} style={{ margin: 0 }}>
          Exam shifts
        </Title>
        <Space>
          <Select
            value={filterSemester}
            onChange={setFilterSemester}
            style={{ width: 200 }}
          >
            <Option value="all">All Semesters</Option>
            {mockSemesters.map((sem) => (
              <Option key={sem.id} value={sem.name}>
                {sem.name}
              </Option>
            ))}
          </Select>
          <Select
            value={filterCourse}
            onChange={setFilterCourse}
            style={{ width: 240 }}
          >
            <Option value="all">All Courses</Option>
            {mockCourses.map((course) => (
              <Option key={course.id} value={course.name}>
                {course.name} ({course.code})
              </Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Add
          </Button>
        </Space>
      </div>

      {loading && (
        <div className={styles.spinner}>
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
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className={styles.table}
        />
      )}

      <ExamShiftModal
        open={isModalOpen}
        initialData={editingShift}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
      />
    </div>
  );
};

export default function ExamShiftsPage() {
  return (
    <App>
      <ExamShiftPageContent />
    </App>
  );
}
