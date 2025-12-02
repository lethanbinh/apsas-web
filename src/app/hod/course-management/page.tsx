"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Spin, Alert, App, Button, Space, Typography, Select, Input, Modal, Tooltip } from "antd";
import type { TableProps } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { courseService, Course } from "@/services/courseManagementService";
import { CourseOnlyCrudModal } from "@/components/modals/CourseOnlyCrudModal";
import { semesterService, Semester } from "@/services/semesterService";

const { Title } = Typography;

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

const CourseManagementPageContent = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [selectedSemesterCourses, setSelectedSemesterCourses] = useState<Course[]>([]);
  // Lưu mapping courseId -> semesterIds để biết course thuộc semester nào
  const [courseSemesterMap, setCourseSemesterMap] = useState<Map<number, number[]>>(new Map());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; record: Course | null; confirmValue: string }>({
    open: false,
    record: null,
    confirmValue: "",
  });
  const { modal, notification } = App.useApp();

  const fetchSemesters = useCallback(async () => {
    try {
      const data = await semesterService.getSemesters({
        pageNumber: 1,
        pageSize: 1000,
      });
      setSemesters(data);
    } catch (err: any) {
      console.error("Failed to fetch semesters:", err);
    }
  }, []);

  // Fetch tất cả semester courses để build courseSemesterMap
  const fetchAllCourseSemesterMapping = useCallback(async (semestersList: Semester[]) => {
    try {
      const newMap = new Map<number, number[]>();
      
      // Fetch tất cả semester details để biết course thuộc semester nào
      for (const semester of semestersList) {
        try {
          const semesterDetail = await semesterService.getSemesterPlanDetail(semester.semesterCode);
          semesterDetail.semesterCourses.forEach(sc => {
            const existingSemesters = newMap.get(sc.course.id) || [];
            if (!existingSemesters.includes(semester.id)) {
              newMap.set(sc.course.id, [...existingSemesters, semester.id]);
            }
          });
        } catch (err) {
          console.error(`Failed to fetch semester detail for ${semester.semesterCode}:`, err);
        }
      }
      
      setCourseSemesterMap(newMap);
    } catch (err) {
      console.error("Failed to fetch course-semester mapping:", err);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await courseService.getCourseList({
        pageNumber: 1,
        pageSize: 1000,
      });
      setAllCourses(data);
      setCourses(data);
    } catch (err: any) {
      console.error("Failed to fetch courses:", err);
      setError(err.message || "Failed to load data.");
      notification.error({
        message: "Failed to load courses",
        description: err.message || "An unknown error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }, [notification]);

  const fetchSemesterCourses = useCallback(async (semesterId: number) => {
    try {
      setLoading(true);
      const semester = semesters.find(s => s.id === semesterId);
      if (!semester) {
        setLoading(false);
        return;
      }
      
      const semesterDetail = await semesterService.getSemesterPlanDetail(semester.semesterCode);
      const semesterCourses: Course[] = semesterDetail.semesterCourses.map(sc => ({
        ...sc.course,
        createdAt: sc.createdAt || new Date().toISOString(),
        updatedAt: sc.updatedAt || new Date().toISOString(),
      }));
      setSelectedSemesterCourses(semesterCourses);
      setCourses(semesterCourses);
      
      // Cập nhật mapping course -> semester sử dụng functional update để tránh dependency
      setCourseSemesterMap(prevMap => {
        const newMap = new Map(prevMap);
        semesterCourses.forEach(course => {
          const existingSemesters = newMap.get(course.id) || [];
          if (!existingSemesters.includes(semesterId)) {
            newMap.set(course.id, [...existingSemesters, semesterId]);
          }
        });
        return newMap;
      });
    } catch (err: any) {
      console.error("Failed to fetch semester courses:", err);
      notification.error({
        message: "Failed to load semester courses",
        description: err.message || "An unknown error occurred.",
      });
      setCourses([]);
      setSelectedSemesterCourses([]);
    } finally {
      setLoading(false);
    }
  }, [semesters, notification]);

  useEffect(() => {
    fetchSemesters();
    fetchCourses();
  }, [fetchSemesters, fetchCourses]);

  // Fetch course-semester mapping khi semesters đã load (chỉ chạy một lần)
  useEffect(() => {
    if (semesters.length > 0) {
      fetchAllCourseSemesterMapping(semesters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.length]); // Chỉ phụ thuộc vào length để tránh loop

  useEffect(() => {
    if (selectedSemesterId && semesters.length > 0) {
      fetchSemesterCourses(selectedSemesterId);
    } else if (!selectedSemesterId) {
      setCourses(allCourses);
      setSelectedSemesterCourses([]);
    }
  }, [selectedSemesterId, fetchSemesterCourses, allCourses, semesters.length]);

  const handleSemesterChange = (value: number | null) => {
    setSelectedSemesterId(value);
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: Course) => {
    // Kiểm tra xem course có thể edit được không
    if (!canEditCourse(record)) {
      notification.warning({
        message: "Cannot edit course",
        description: "You cannot edit a course that belongs to a semester that has already started.",
      });
      return;
    }
    setEditingCourse(record);
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  const handleModalOk = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    fetchCourses();
  };

  // Kiểm tra xem course có thể xóa được không
  const canDeleteCourse = useCallback((course: Course): boolean => {
    // Nếu đang filter theo semester, kiểm tra semester đó đã bắt đầu chưa
    if (selectedSemesterId) {
      const semester = semesters.find(s => s.id === selectedSemesterId);
      if (semester && isSemesterStarted(semester.startDate)) {
        return false;
      }
      return true;
    }
    
    // Nếu không filter, kiểm tra xem course có thuộc semester nào đã bắt đầu không
    const courseSemesterIds = courseSemesterMap.get(course.id) || [];
    if (courseSemesterIds.length === 0) {
      // Nếu course chưa thuộc semester nào, có thể xóa
      return true;
    }
    
    // Kiểm tra xem course có thuộc semester nào đã bắt đầu không
    const startedSemesterIds = semesters
      .filter(s => isSemesterStarted(s.startDate))
      .map(s => s.id);
    
    // Nếu course thuộc bất kỳ semester nào đã bắt đầu thì không cho xóa
    const hasStartedSemester = courseSemesterIds.some(semesterId => 
      startedSemesterIds.includes(semesterId)
    );
    
    return !hasStartedSemester;
  }, [selectedSemesterId, semesters, courseSemesterMap]);

  // Kiểm tra xem course có thể edit được không (tương tự canDeleteCourse)
  const canEditCourse = useCallback((course: Course): boolean => {
    // Nếu đang filter theo semester, kiểm tra semester đó đã bắt đầu chưa
    if (selectedSemesterId) {
      const semester = semesters.find(s => s.id === selectedSemesterId);
      if (semester && isSemesterStarted(semester.startDate)) {
        return false;
      }
      return true;
    }
    
    // Nếu không filter, kiểm tra xem course có thuộc semester nào đã bắt đầu không
    const courseSemesterIds = courseSemesterMap.get(course.id) || [];
    if (courseSemesterIds.length === 0) {
      // Nếu course chưa thuộc semester nào, có thể edit
      return true;
    }
    
    // Kiểm tra xem course có thuộc semester nào đã bắt đầu không
    const startedSemesterIds = semesters
      .filter(s => isSemesterStarted(s.startDate))
      .map(s => s.id);
    
    // Nếu course thuộc bất kỳ semester nào đã bắt đầu thì không cho edit
    const hasStartedSemester = courseSemesterIds.some(semesterId => 
      startedSemesterIds.includes(semesterId)
    );
    
    return !hasStartedSemester;
  }, [selectedSemesterId, semesters, courseSemesterMap]);

  const handleDelete = (record: Course) => {
    // Kiểm tra xem course có thể xóa được không
    if (!canDeleteCourse(record)) {
      notification.warning({
        message: "Cannot delete course",
        description: "You cannot delete a course that belongs to a semester that has already started.",
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
    
    if (deleteConfirm.confirmValue !== deleteConfirm.record.name) {
      notification.error({
        message: "Confirmation failed",
        description: "The entered name does not match the course name.",
      });
      return;
    }

    try {
      await courseService.deleteCourse(deleteConfirm.record.id);
      notification.success({ message: "Course deleted successfully!" });
      fetchCourses();
      setDeleteConfirm({
        open: false,
        record: null,
        confirmValue: "",
      });
    } catch (err: any) {
      console.error("Failed to delete course:", err);
      notification.error({
        message: "Failed to delete course",
        description: err.message || "An unknown error occurred.",
      });
    }
  };

  const columns: TableProps<Course>["columns"] = [
    {
      title: "Course Code",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Course Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const canDelete = canDeleteCourse(record);
        const canEdit = canEditCourse(record);
        return (
          <Space size="middle">
            {canEdit ? (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(record)}
              >
                Edit
              </Button>
            ) : (
              <Tooltip title="Cannot edit a course that belongs to a semester that has already started">
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  disabled
                >
                  Edit
                </Button>
              </Tooltip>
            )}
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
              <Tooltip title="Cannot delete a course that belongs to a semester that has already started">
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
    <div
      style={{
        background: "#f0f7ff",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <Space
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D",
          }}
        >
          Course Management
        </Title>
        <Space>
          <Select
            placeholder="Filter by Semester"
            style={{ width: 200 }}
            allowClear
            value={selectedSemesterId}
            onChange={handleSemesterChange}
            options={[
              { label: "All Semesters", value: null },
              ...semesters.map((s) => ({
                label: s.semesterCode,
                value: s.id,
              })),
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Create Course
          </Button>
        </Space>
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
          dataSource={courses}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      )}

      <CourseOnlyCrudModal
        open={isModalOpen}
        initialData={editingCourse}
        selectedSemesterId={selectedSemesterId}
        existingSemesterCourses={selectedSemesterCourses}
        allCourses={allCourses}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
      />

      <Modal
        title="Are you sure you want to delete this course?"
        open={deleteConfirm.open}
        onOk={handleDeleteConfirmOk}
        onCancel={handleDeleteConfirmCancel}
        okText="Yes, Delete"
        okType="danger"
        cancelText="No"
        okButtonProps={{
          disabled: deleteConfirm.confirmValue !== deleteConfirm.record?.name,
        }}
      >
        <div>
          <p style={{ marginBottom: 8 }}>
            This action cannot be undone. Please type <strong>{deleteConfirm.record?.name}</strong> to confirm.
          </p>
          <Input
            placeholder={`Type "${deleteConfirm.record?.name}" to confirm`}
            value={deleteConfirm.confirmValue}
            onChange={(e) => {
              setDeleteConfirm(prev => ({
                ...prev,
                confirmValue: e.target.value,
              }));
            }}
            onPressEnter={() => {
              if (deleteConfirm.confirmValue === deleteConfirm.record?.name) {
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

export default function CourseManagementPage() {
  return (
    <App>
      <CourseManagementPageContent />
    </App>
  );
}
