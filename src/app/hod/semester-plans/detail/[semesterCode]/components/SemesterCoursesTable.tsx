"use client";

import type { TableProps, TabsProps } from "antd";
import { Button, Space, Table, Tag, Tabs } from "antd";
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  PaperClipOutlined,
  PlusOutlined,
  TeamOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Course } from "@/services/courseElementService";
import {
  AssignRequest,
  Class,
  CourseElement,
  SemesterCourse,
} from "@/services/semesterService";
import { ClassesTable } from "./ClassesTable";
import { CourseElementsTable } from "./CourseElementsTable";
import { AssignRequestsTable } from "./AssignRequestsTable";
import { formatUtcDate } from "../utils";

interface SemesterCoursesTableProps {
  courses: SemesterCourse[];
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (semesterCourseId: number) => void;
  onAddClass: (semesterCourseId: number) => void;
  onEditClass: (cls: Class) => void;
  onDeleteClass: (classId: number) => void;
  onAddStudent: (classId: number) => void;
  onViewStudents: (classId: number, classCode: string) => void;
  onDeleteStudent: (studentGroupId: number) => void;
  onAddElement: (semesterCourseId: number) => void;
  onEditElement: (element: CourseElement) => void;
  onDeleteElement: (elementId: number) => void;
  onAddAssignRequest: (semesterCourse: SemesterCourse) => void;
  onEditAssignRequest: (
    request: AssignRequest,
    semesterCourse: SemesterCourse
  ) => void;
  onDeleteAssignRequest: (requestId: number) => void;
  onImportClassStudent: (semesterCourse: SemesterCourse) => void;
  studentCountRefreshTrigger?: number;
  isSemesterEnded?: boolean;
  elementsWithAssessment?: Set<number>;
  elementsWithApprovedRequest?: Set<number>;
}

export const SemesterCoursesTable = ({
  courses,
  onEditCourse,
  onDeleteCourse,
  onAddClass,
  onEditClass,
  onDeleteClass,
  onAddStudent,
  onViewStudents,
  onDeleteStudent,
  onAddElement,
  onEditElement,
  onDeleteElement,
  onAddAssignRequest,
  onEditAssignRequest,
  onDeleteAssignRequest,
  onImportClassStudent,
  studentCountRefreshTrigger,
  isSemesterEnded = false,
  elementsWithAssessment = new Set(),
  elementsWithApprovedRequest = new Set(),
}: SemesterCoursesTableProps) => {
  const columns: TableProps<SemesterCourse>["columns"] = [
    {
      title: "Course Code",
      dataIndex: ["course", "code"],
      key: "code",
    },
    {
      title: "Course Name",
      dataIndex: ["course", "name"],
      key: "name",
    },
    {
      title: "Created By",
      dataIndex: "createdByHODAccountCode",
      key: "createdBy",
      render: (code: string) => code || "N/A",
    },
    {
      title: "Classes",
      dataIndex: "classes",
      key: "classes",
      render: (classes: Class[]) => (
        <Tag icon={<TeamOutlined />} color="blue">
          {classes.length}
        </Tag>
      ),
    },
    {
      title: "Elements",
      dataIndex: "courseElements",
      key: "elements",
      render: (elements: CourseElement[]) => (
        <Tag icon={<BookOutlined />} color="purple">
          {elements.length}
        </Tag>
      ),
    },
    {
      title: "Requests",
      dataIndex: "assignRequests",
      key: "requests",
      render: (requests: AssignRequest[]) => (
        <Tag icon={<PaperClipOutlined />} color="gold">
          {requests.length}
        </Tag>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEditCourse(record.course)}
            disabled={isSemesterEnded}
          >
            Edit Course
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteCourse(record.id)}
            disabled={isSemesterEnded}
          >
            Unlink
          </Button>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: SemesterCourse) => {
    const tabItems: TabsProps["items"] = [
      {
        key: "1",
        label: `Classes (${record.classes.length})`,
        children: (
          <>
            <Space style={{ marginBottom: 16 }} wrap>
              <Button
                icon={<PlusOutlined />}
                onClick={() => onAddClass(record.id)}
                disabled={isSemesterEnded}
              >
                Add Class
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => onImportClassStudent(record)}
                disabled={isSemesterEnded}
              >
                Import Class Student
              </Button>
            </Space>
            <ClassesTable
              classes={record.classes}
              onEdit={onEditClass}
              onDelete={onDeleteClass}
              onAddStudent={onAddStudent}
              onViewStudents={onViewStudents}
              onDeleteStudent={onDeleteStudent}
              refreshTrigger={studentCountRefreshTrigger}
              isSemesterEnded={isSemesterEnded}
            />
          </>
        ),
      },
      {
        key: "2",
        label: `Course Elements (${record.courseElements.length})`,
        children: (
          <>
            <Button
              icon={<PlusOutlined />}
              onClick={() => onAddElement(record.id)}
              style={{ marginBottom: 16 }}
              disabled={isSemesterEnded}
            >
              Add Element
            </Button>
            <CourseElementsTable
              elements={record.courseElements}
              onEdit={onEditElement}
              onDelete={onDeleteElement}
              isSemesterEnded={isSemesterEnded}
              elementsWithAssessment={elementsWithAssessment}
              elementsWithApprovedRequest={elementsWithApprovedRequest}
            />
          </>
        ),
      },
      {
        key: "3",
        label: `Assign Requests (${record.assignRequests.length})`,
        children: (
          <>
            <Button
              icon={<PlusOutlined />}
              onClick={() => onAddAssignRequest(record)}
              style={{ marginBottom: 16 }}
              disabled={isSemesterEnded}
            >
              Add Assign Request
            </Button>
            <AssignRequestsTable
              requests={record.assignRequests}
              onEdit={(request) => onEditAssignRequest(request, record)}
              onDelete={onDeleteAssignRequest}
              isSemesterEnded={isSemesterEnded}
            />
          </>
        ),
      },
    ];
    return <Tabs defaultActiveKey="1" items={tabItems} />;
  };

  return (
    <Table
      columns={columns}
      dataSource={courses}
      rowKey="id"
      expandable={{ expandedRowRender }}
      scroll={{ x: 'max-content' }}
    />
  );
};

