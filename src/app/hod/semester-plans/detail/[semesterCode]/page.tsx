"use client";
import { AssignRequestCrudModal } from "@/components/modals/AssignRequestCrudModal";
import { ClassCrudModal } from "@/components/modals/ClassCrudModal";
import { CourseCrudModal } from "@/components/modals/CourseCrudModal";
import { CourseElementCrudModal } from "@/components/modals/CourseElementCrudModal";
import { StudentGroupCrudModal } from "@/components/modals/StudentGroupCrudModal";
import { assignRequestService } from "@/services/assignRequestService";
import { classManagementService } from "@/services/classManagementService";
import { StudentInClass } from "@/services/classService";
import { courseElementManagementService } from "@/services/courseElementManagementService";
import { Course } from "@/services/courseElementService";
import { semesterCourseService } from "@/services/courseManagementService";
import { Lecturer, lecturerService } from "@/services/lecturerService";
import {
  AssignRequest,
  Class,
  CourseElement,
  SemesterCourse,
  SemesterPlanDetail,
  semesterService,
} from "@/services/semesterService";
import { studentManagementService } from "@/services/studentManagementService";
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  PaperClipOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { TableProps, TabsProps } from "antd";
import {
  App,
  Avatar,
  Button,
  Descriptions,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

interface StudentTableProps {
  classId: number;
  onDelete: (studentGroupId: number) => void;
}

const StudentTable = ({ classId, onDelete }: StudentTableProps) => {
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const data = await studentManagementService.getStudentsInClass(classId);
        setStudents(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchStudents();
  }, [classId]);

  const columns: TableProps<StudentInClass>["columns"] = [
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "code",
    },
    {
      title: "Full Name",
      dataIndex: "studentName",
      key: "name",
      render: (name: string) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: "Enrolled",
      dataIndex: "enrollmentDate",
      key: "enrolled",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy"),
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
        <Button type="link" danger onClick={() => onDelete(record.id)}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <Table
      loading={loading}
      columns={columns}
      dataSource={students}
      rowKey="id"
      pagination={false}
      size="small"
    />
  );
};

interface ClassesTableProps {
  classes: Class[];
  onEdit: (cls: Class) => void;
  onDelete: (classId: number) => void;
  onAddStudent: (classId: number) => void;
  onDeleteStudent: (studentGroupId: number) => void;
}

const ClassesTable = ({
  classes,
  onEdit,
  onDelete,
  onAddStudent,
  onDeleteStudent,
}: ClassesTableProps) => {
  const columns: TableProps<Class>["columns"] = [
    {
      title: "Class Code",
      dataIndex: "classCode",
      key: "classCode",
    },
    {
      title: "Lecturer",
      dataIndex: ["lecturer", "account", "fullName"],
      key: "lecturer",
      render: (name: string, record: Class) => (
        <Space>
          <Avatar
            src={record.lecturer.account.avatar}
            icon={<UserOutlined />}
          />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: "Students",
      dataIndex: "totalStudent",
      key: "totalStudent",
      render: (total: number) => <Tag color="blue">{total} Students</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => onEdit(record)}>
            Edit
          </Button>
          <Button type="link" danger onClick={() => onDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={classes}
      rowKey="id"
      pagination={{ pageSize: 5, hideOnSinglePage: true }}
      expandable={{
        expandedRowRender: (record) => (
          <>
            <Button
              icon={<PlusOutlined />}
              onClick={() => onAddStudent(record.id)}
              style={{ marginBottom: 16, marginTop: 8 }}
            >
              Add Student
            </Button>
            <StudentTable classId={record.id} onDelete={onDeleteStudent} />
          </>
        ),
        rowExpandable: (record) => true,
      }}
    />
  );
};

interface CourseElementsTableProps {
  elements: CourseElement[];
  onEdit: (element: CourseElement) => void;
  onDelete: (elementId: number) => void;
}

const CourseElementsTable = ({
  elements,
  onEdit,
  onDelete,
}: CourseElementsTableProps) => {
  const columns: TableProps<CourseElement>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Weight",
      dataIndex: "weight",
      key: "weight",
      render: (weight: number) => `${weight}%`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => onEdit(record)}>
            Edit
          </Button>
          <Button type="link" danger onClick={() => onDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={elements}
      rowKey="id"
      pagination={false}
    />
  );
};

interface AssignRequestsTableProps {
  requests: AssignRequest[];
  onEdit: (request: AssignRequest) => void;
  onDelete: (requestId: number) => void;
}

const AssignRequestsTable = ({
  requests,
  onEdit,
  onDelete,
}: AssignRequestsTableProps) => {
  const columns: TableProps<AssignRequest>["columns"] = [
    {
      title: "Course Element",
      dataIndex: ["courseElement", "name"],
      key: "element",
    },
    {
      title: "Assigned Lecturer",
      dataIndex: ["lecturer", "account", "fullName"],
      key: "lecturer",
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "created",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => onEdit(record)}>
            Edit
          </Button>
          <Button type="link" danger onClick={() => onDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={requests}
      rowKey="id"
      pagination={{ pageSize: 5, hideOnSinglePage: true }}
    />
  );
};

interface SemesterCoursesTableProps {
  courses: SemesterCourse[];
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (semesterCourseId: number) => void;
  onAddClass: (semesterCourseId: number) => void;
  onEditClass: (cls: Class) => void;
  onDeleteClass: (classId: number) => void;
  onAddStudent: (classId: number) => void;
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
}

const SemesterCoursesTable = ({
  courses,
  onEditCourse,
  onDeleteCourse,
  onAddClass,
  onEditClass,
  onDeleteClass,
  onAddStudent,
  onDeleteStudent,
  onAddElement,
  onEditElement,
  onDeleteElement,
  onAddAssignRequest,
  onEditAssignRequest,
  onDeleteAssignRequest,
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
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEditCourse(record.course)}
          >
            Edit Course
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteCourse(record.id)}
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
            <Button
              icon={<PlusOutlined />}
              onClick={() => onAddClass(record.id)}
              style={{ marginBottom: 16 }}
            >
              Add Class
            </Button>
            <ClassesTable
              classes={record.classes}
              onEdit={onEditClass}
              onDelete={onDeleteClass}
              onAddStudent={onAddStudent}
              onDeleteStudent={onDeleteStudent}
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
            >
              Add Element
            </Button>
            <CourseElementsTable
              elements={record.courseElements}
              onEdit={onEditElement}
              onDelete={onDeleteElement}
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
            >
              Add Assign Request
            </Button>
            <AssignRequestsTable
              requests={record.assignRequests}
              onEdit={(request) => onEditAssignRequest(request, record)}
              onDelete={onDeleteAssignRequest}
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
    />
  );
};

const SemesterDetailPageContent = ({
  params,
}: {
  params: { semesterCode: string };
}) => {
  const [semesterData, setSemesterData] = useState<SemesterPlanDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { modal } = App.useApp();

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [currentSemesterCourseId, setCurrentSemesterCourseId] = useState<
    number | null
  >(null);

  const [isElementModalOpen, setIsElementModalOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<CourseElement | null>(
    null
  );
  const [
    currentSemesterCourseIdForElement,
    setCurrentSemesterCourseIdForElement,
  ] = useState<number | null>(null);

  const [isAssignRequestModalOpen, setIsAssignRequestModalOpen] =
    useState(false);
  const [editingAssignRequest, setEditingAssignRequest] =
    useState<AssignRequest | null>(null);
  const [currentCourseElements, setCurrentCourseElements] = useState<
    CourseElement[]
  >([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  const [isStudentGroupModalOpen, setIsStudentGroupModalOpen] = useState(false);
  const [currentClassId, setCurrentClassId] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!params.semesterCode) {
      setError("No semester code provided.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await semesterService.getSemesterPlanDetail(
        params.semesterCode
      );
      setSemesterData(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch semester detail:", err);
      setError(err.message || "Failed to load data.");
      setSemesterData(null);
    } finally {
      setLoading(false);
    }
  }, [params.semesterCode]);

  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        const data = await lecturerService.getLecturerList();
        setLecturers(data);
      } catch (err) {
        console.error("Failed to fetch lecturers:", err);
      }
    };
    fetchDetail();
    fetchLecturers();
  }, [fetchDetail]);

  const handleOpenCreateCourseModal = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourseModal = (course: Course) => {
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleCourseModalCancel = () => {
    setIsCourseModalOpen(false);
    setEditingCourse(null);
  };

  const handleCourseModalOk = () => {
    setIsCourseModalOpen(false);
    setEditingCourse(null);
    fetchDetail();
  };

  const handleDeleteSemesterCourse = (semesterCourseId: number) => {
    modal.confirm({
      title: "Are you sure you want to unlink this course?",
      content:
        "This will only remove the course from this semester. The course itself will not be deleted.",
      okText: "Yes, Unlink",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await semesterCourseService.deleteSemesterCourse(semesterCourseId);
          fetchDetail();
        } catch (err) {
          console.error("Failed to delete semester course:", err);
        }
      },
    });
  };

  const handleOpenCreateClassModal = (semesterCourseId: number) => {
    setCurrentSemesterCourseId(semesterCourseId);
    setEditingClass(null);
    setIsClassModalOpen(true);
  };

  const handleOpenEditClassModal = (cls: Class) => {
    const semesterCourse = semesterData?.semesterCourses.find((sc) =>
      sc.classes.some((c) => c.id === cls.id)
    );
    if (semesterCourse) {
      setCurrentSemesterCourseId(semesterCourse.id);
      setEditingClass(cls);
      setIsClassModalOpen(true);
    }
  };

  const handleClassModalCancel = () => {
    setIsClassModalOpen(false);
    setEditingClass(null);
    setCurrentSemesterCourseId(null);
  };

  const handleClassModalOk = () => {
    setIsClassModalOpen(false);
    setEditingClass(null);
    setCurrentSemesterCourseId(null);
    fetchDetail();
  };

  const handleDeleteClass = (classId: number) => {
    modal.confirm({
      title: "Are you sure you want to delete this class?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await classManagementService.deleteClass(classId);
          fetchDetail();
        } catch (err) {
          console.error("Failed to delete class:", err);
        }
      },
    });
  };

  const handleOpenCreateElementModal = (semesterCourseId: number) => {
    setCurrentSemesterCourseIdForElement(semesterCourseId);
    setEditingElement(null);
    setIsElementModalOpen(true);
  };

  const handleOpenEditElementModal = (element: CourseElement) => {
    const semesterCourse = semesterData?.semesterCourses.find((sc) =>
      sc.courseElements.some((el) => el.id === element.id)
    );
    if (semesterCourse) {
      setCurrentSemesterCourseIdForElement(semesterCourse.id);
      setEditingElement(element);
      setIsElementModalOpen(true);
    }
  };

  const handleElementModalCancel = () => {
    setIsElementModalOpen(false);
    setEditingElement(null);
    setCurrentSemesterCourseIdForElement(null);
  };

  const handleElementModalOk = () => {
    setIsElementModalOpen(false);
    setEditingElement(null);
    setCurrentSemesterCourseIdForElement(null);
    fetchDetail();
  };

  const handleDeleteElement = (elementId: number) => {
    modal.confirm({
      title: "Are you sure you want to delete this course element?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await courseElementManagementService.deleteCourseElement(elementId);
          fetchDetail();
        } catch (err) {
          console.error("Failed to delete course element:", err);
        }
      },
    });
  };

  const handleOpenCreateAssignRequestModal = (
    semesterCourse: SemesterCourse
  ) => {
    setCurrentCourseElements(semesterCourse.courseElements);
    setEditingAssignRequest(null);
    setIsAssignRequestModalOpen(true);
  };

  const handleOpenEditAssignRequestModal = (
    request: AssignRequest,
    semesterCourse: SemesterCourse
  ) => {
    setCurrentCourseElements(semesterCourse.courseElements);
    setEditingAssignRequest(request);
    setIsAssignRequestModalOpen(true);
  };

  const handleAssignRequestModalCancel = () => {
    setIsAssignRequestModalOpen(false);
    setEditingAssignRequest(null);
    setCurrentCourseElements([]);
  };

  const handleAssignRequestModalOk = () => {
    setIsAssignRequestModalOpen(false);
    setEditingAssignRequest(null);
    setCurrentCourseElements([]);
    fetchDetail();
  };

  const handleDeleteAssignRequest = (requestId: number) => {
    modal.confirm({
      title: "Are you sure you want to delete this assign request?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await assignRequestService.deleteAssignRequest(requestId);
          fetchDetail();
        } catch (err) {
          console.error("Failed to delete assign request:", err);
        }
      },
    });
  };

  const handleOpenAddStudentModal = (classId: number) => {
    setCurrentClassId(classId);
    setIsStudentGroupModalOpen(true);
  };

  const handleStudentGroupModalCancel = () => {
    setIsStudentGroupModalOpen(false);
    setCurrentClassId(null);
  };

  const handleStudentGroupModalOk = () => {
    setIsStudentGroupModalOpen(false);
    setCurrentClassId(null);
    fetchDetail();
  };

  const handleDeleteStudentGroup = (studentGroupId: number) => {
    modal.confirm({
      title: "Are you sure you want to remove this student?",
      content: "This action will remove the student from this class.",
      okText: "Yes, Remove",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await studentManagementService.deleteStudentGroup(studentGroupId);
          fetchDetail();
        } catch (err) {
          console.error("Failed to remove student:", err);
        }
      },
    });
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "50px" }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Text type="danger" style={{ padding: "24px" }}>
        {error}
      </Text>
    );
  }

  if (!semesterData) {
    return <Text type="danger">No semester data found.</Text>;
  }

  return (
    <div style={{ padding: "24px", background: "#fff", minHeight: "100%" }}>
      <Title level={2}>Semester Plan: {semesterData.semesterCode}</Title>

      <Descriptions bordered style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Academic Year">
          {semesterData.academicYear}
        </Descriptions.Item>
        <Descriptions.Item label="Dates" span={2}>
          {formatUtcDate(semesterData.startDate, "dd/MM/yyyy")} -{" "}
          {formatUtcDate(semesterData.endDate, "dd/MM/yyyy")}
        </Descriptions.Item>
        <Descriptions.Item label="Note">{semesterData.note}</Descriptions.Item>
      </Descriptions>

      <Space
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 40,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Courses
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateCourseModal}
        >
          Add New Course
        </Button>
      </Space>
      <SemesterCoursesTable
        courses={semesterData.semesterCourses}
        onEditCourse={handleOpenEditCourseModal}
        onDeleteCourse={handleDeleteSemesterCourse}
        onAddClass={handleOpenCreateClassModal}
        onEditClass={handleOpenEditClassModal}
        onDeleteClass={handleDeleteClass}
        onAddStudent={handleOpenAddStudentModal}
        onDeleteStudent={handleDeleteStudentGroup}
        onAddElement={handleOpenCreateElementModal}
        onEditElement={handleOpenEditElementModal}
        onDeleteElement={handleDeleteElement}
        onAddAssignRequest={handleOpenCreateAssignRequestModal}
        onEditAssignRequest={handleOpenEditAssignRequestModal}
        onDeleteAssignRequest={handleDeleteAssignRequest}
      />

      <CourseCrudModal
        open={isCourseModalOpen}
        semesterId={semesterData.id}
        initialData={editingCourse}
        onCancel={handleCourseModalCancel}
        onOk={handleCourseModalOk}
      />

      {currentSemesterCourseId && (
        <ClassCrudModal
          open={isClassModalOpen}
          semesterCourseId={currentSemesterCourseId}
          initialData={editingClass}
          onCancel={handleClassModalCancel}
          onOk={handleClassModalOk}
        />
      )}

      {currentSemesterCourseIdForElement && (
        <CourseElementCrudModal
          open={isElementModalOpen}
          semesterCourseId={currentSemesterCourseIdForElement}
          initialData={editingElement}
          onCancel={handleElementModalCancel}
          onOk={handleElementModalOk}
        />
      )}

      <AssignRequestCrudModal
        open={isAssignRequestModalOpen}
        initialData={editingAssignRequest}
        lecturers={lecturers}
        courseElements={currentCourseElements}
        onCancel={handleAssignRequestModalCancel}
        onOk={handleAssignRequestModalOk}
      />

      {currentClassId && (
        <StudentGroupCrudModal
          open={isStudentGroupModalOpen}
          classId={currentClassId}
          onCancel={handleStudentGroupModalCancel}
          onOk={handleStudentGroupModalOk}
        />
      )}
    </div>
  );
};

export default function SemesterDetailPage({
  params,
}: {
  params: Promise<{ semesterCode: string }>;
}) {
  const resolvedParams = params as unknown as { semesterCode: string };
  return (
    <App>
      <SemesterDetailPageContent params={resolvedParams} />
    </App>
  );
}
