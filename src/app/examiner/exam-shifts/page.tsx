"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Table,
  Spin,
  Alert,
  App,
  Button,
  Space,
  Typography,
  Select,
  Tag,
} from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { format } from "date-fns";
import { AddExamShiftModal } from "@/components/examiner/AddExamShiftModal";
import { EditExamShiftModal } from "@/components/examiner/EditExamShiftModal";
import { ViewStudentsModal } from "@/components/examiner/ViewStudentsModal";
import { ExamSession, examSessionService } from "@/services/examSessionService";
import { Course, courseService } from "@/services/courseManagementService";
import { Semester, semesterService } from "@/services/semesterService";
import { classService, ClassInfo } from "@/services/classService";
import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import { useRouter } from "next/navigation";
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

const getStatusTag = (status: string) => {
  if (status === "ENDED") {
    return <Tag color="green">Finished</Tag>;
  }
  if (status === "ACTIVE") {
    return <Tag color="processing">In Progress</Tag>;
  }
  return <Tag color="blue">{status}</Tag>;
};

const ExamShiftPageContent = () => {
  const [shifts, setShifts] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);

  const [editingShift, setEditingShift] = useState<ExamSession | null>(null);
  const [viewingShift, setViewingShift] = useState<ExamSession | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const [filterSemester, setFilterSemester] = useState<string | undefined>(
    undefined
  );
  const [filterCourse, setFilterCourse] = useState<number | undefined>(
    undefined
  );

  const { modal } = App.useApp();
  const router = useRouter();

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await examSessionService.getExamSessions({
        pageNumber: 1,
        pageSize: 1000,
      });
      setShifts(response.items);
    } catch (err: any) {
      setError(err.message || "Failed to load exam shifts.");
    } finally {
      setLoading(false);
    }
  }, []);

  const classIdToSemesterNameMap = useMemo(() => {
    return new Map(classes.map((cls) => [Number(cls.id), cls.semesterName]));
  }, [classes]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [courseResponse, semesterResponse, classResponse] =
          await Promise.all([
            courseService.getCourseList({ pageNumber: 1, pageSize: 1000 }),
            semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
            classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
          ]);
        setCourses(courseResponse);
        setSemesters(semesterResponse);
        setClasses(classResponse.classes);
      } catch (err) {
        console.error("Failed to fetch filters:", err);
      }
    };
    fetchFilters();
    fetchShifts();
  }, [fetchShifts]);

  const handleOpenCreate = () => {
    setEditingShift(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (record: ExamSession) => {
    setEditingShift(record);
    setIsEditModalOpen(true);
  };

  const handleOpenViewStudents = (record: ExamSession) => {
    setViewingShift(record);
    setIsViewStudentsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewStudentsModalOpen(false);
    setEditingShift(null);
    setViewingShift(null);
  };

  const handleModalOk = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingShift(null);
    fetchShifts();
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
        try {
          await examSessionService.deleteExamSession(id);
          fetchShifts();
        } catch (err: any) {
          setError(err.message || "Failed to delete shift.");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const filteredData = useMemo(() => {
    const courseName = courses.find((c) => c.id === filterCourse)?.name;

    return shifts.filter((shift) => {
      const semesterName = classIdToSemesterNameMap.get(shift.classId);

      console.log(semesterName, filterSemester);
      const semesterMatch =
        !filterSemester || semesterName?.includes(filterSemester || "");
      const courseMatch = !filterCourse || shift.courseName === courseName;
      return semesterMatch && courseMatch;
    });
  }, [shifts, filterSemester, filterCourse, classIdToSemesterNameMap, courses]);

  const columns: TableProps<ExamSession>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Paper",
      dataIndex: "assessmentTemplateName",
      key: "paper",
    },
    {
      title: "Start date",
      dataIndex: "startAt",
      key: "startAt",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
      sorter: (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    },
    {
      title: "End date",
      dataIndex: "endAt",
      key: "endDate",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Course",
      dataIndex: "courseName",
      key: "course",
    },
    {
      title: "Semester",
      key: "semester",
      render: (_, record) =>
        classIdToSemesterNameMap.get(record.classId) || "N/A",
    },
    {
      title: "Examiner",
      dataIndex: "lecturerName",
      key: "examiner",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const isEditable = record.status !== "ENDED";
        return (
          <Space size="middle">
            <Button
              type="text"
              icon={<TeamOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenViewStudents(record);
              }}
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              disabled={!isEditable}
              onClick={(e) => {
                e.stopPropagation();
                if (isEditable) handleOpenEdit(record);
              }}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(record.id);
              }}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}
        >
          Exam shifts
        </Title>
        <Space>
          <Select
            allowClear
            value={filterSemester}
            onChange={setFilterSemester}
            style={{ width: 240 }}
            placeholder="Filter by Semester"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={semesters.map((sem) => ({
              label: `${sem.semesterCode} (${sem.academicYear})`,
              value: sem.semesterCode,
            }))}
          />
          <Select
            allowClear
            value={filterCourse}
            onChange={setFilterCourse}
            style={{ width: 240 }}
            placeholder="Filter by Course"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={courses.map((t) => ({
              label: `${t.name} (${t.code})`,
              value: t.id,
            }))}
          />
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
          onRow={(record) => {
            return {
              onClick: () => {
                router.push(`/examiner/submissions/${record.id}`);
              },
              className: styles.clickableRow,
            };
          }}
        />
      )}

      {isAddModalOpen && (
        <AddExamShiftModal
          open={isAddModalOpen}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
        />
      )}

      {isEditModalOpen && editingShift && (
        <EditExamShiftModal
          open={isEditModalOpen}
          initialData={editingShift}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
        />
      )}

      {isViewStudentsModalOpen && viewingShift && (
        <ViewStudentsModal
          open={isViewStudentsModalOpen}
          session={viewingShift}
          onCancel={handleModalCancel}
        />
      )}
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
