"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Spin, Alert, App, Button, Space, Typography } from "antd";
import type { TableProps } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { courseService, Course } from "@/services/courseManagementService";
import { CourseOnlyCrudModal } from "@/components/modals/CourseOnlyCrudModal";

const { Title } = Typography;

const CourseManagementPageContent = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const { modal, notification } = App.useApp();

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await courseService.getCourseList({
        pageNumber: 1,
        pageSize: 1000,
      });
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

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const existingCodes = useMemo(
    () => courses.map((c) => c.code.toLowerCase()),
    [courses]
  );

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: Course) => {
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

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Are you sure you want to delete this course?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await courseService.deleteCourse(id);
          notification.success({ message: "Course deleted successfully!" });
          fetchCourses();
        } catch (err: any) {
          console.error("Failed to delete course:", err);
          notification.error({
            message: "Failed to delete course",
            description: err.message || "An unknown error occurred.",
          });
        }
      },
    });
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
        >
          Create Course
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
          dataSource={courses}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      )}

      <CourseOnlyCrudModal
        open={isModalOpen}
        initialData={editingCourse}
        existingCodes={existingCodes}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
      />
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
