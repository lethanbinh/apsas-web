"use client";
import { ImportClassStudentModal } from "@/components/hod/ImportClassStudentModal";
import { AssignRequestCrudModal } from "@/components/modals/AssignRequestCrudModal";
import { ClassCrudModal } from "@/components/modals/ClassCrudModal";
import { CourseCrudModal } from "@/components/modals/CourseCrudModal";
import { CourseElementCrudModal } from "@/components/modals/CourseElementCrudModal";
import { StudentGroupCrudModal } from "@/components/modals/StudentGroupCrudModal";
import { ViewStudentsModal } from "@/components/modals/ViewStudentsModal";
import { queryKeys } from "@/lib/react-query";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { classManagementService } from "@/services/classManagementService";
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
  ArrowLeftOutlined,
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  PaperClipOutlined,
  PlusOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Tooltip,
  Typography,
} from "antd";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

// Helper function to check if semester has ended
const isSemesterEnded = (endDate: string): boolean => {
  if (!endDate) return false;
  const now = new Date();
  const semesterEnd = new Date(endDate.endsWith("Z") ? endDate : endDate + "Z");
  return now > semesterEnd;
};


interface ClassesTableProps {
  classes: Class[];
  onEdit: (cls: Class) => void;
  onDelete: (classId: number) => void;
  onAddStudent: (classId: number) => void;
  onViewStudents: (classId: number, classCode: string) => void;
  onDeleteStudent: (studentGroupId: number) => void;
  refreshTrigger?: number;
  isSemesterEnded?: boolean;
}

const ClassesTable = ({
  classes,
  onEdit,
  onDelete,
  onAddStudent,
  onViewStudents,
  onDeleteStudent,
  refreshTrigger,
  isSemesterEnded = false,
}: ClassesTableProps) => {
  const [studentCounts, setStudentCounts] = useState<Map<number, number>>(new Map());
  const [loadingCounts, setLoadingCounts] = useState(false);

  useEffect(() => {
    const fetchStudentCounts = async () => {
      setLoadingCounts(true);
      const counts = new Map<number, number>();
      
      try {
        await Promise.all(
          classes.map(async (cls) => {
            try {
              const students = await studentManagementService.getStudentsInClass(cls.id);
              counts.set(cls.id, students.length);
            } catch (err) {
              console.error(`Failed to fetch students for class ${cls.id}:`, err);
              counts.set(cls.id, 0);
            }
          })
        );
      } catch (err) {
        console.error("Failed to fetch student counts:", err);
      } finally {
        setStudentCounts(counts);
        setLoadingCounts(false);
      }
    };

    if (classes.length > 0) {
      fetchStudentCounts();
    }
  }, [classes, refreshTrigger]);

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
        <Space direction="vertical" size={0}>
          <Space>
            <Avatar
              src={record.lecturer.account.avatar}
              icon={<UserOutlined />}
            />
            <span>{name}</span>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.lecturer.account.accountCode || "N/A"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Lecturer Info",
      key: "lecturerInfo",
      render: (_, record: Class) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>
            <strong>Dept:</strong> {record.lecturer.department || "N/A"}
          </Text>
          <Text style={{ fontSize: 12 }}>
            <strong>Email:</strong> {record.lecturer.account.email || "N/A"}
          </Text>
          {record.lecturer.account.phoneNumber && (
            <Text style={{ fontSize: 12 }}>
              <strong>Phone:</strong> {record.lecturer.account.phoneNumber}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Students",
      key: "totalStudent",
      render: (_: any, record: Class) => {
        const count = studentCounts.get(record.id) ?? 0;
        return <Tag color="blue">{loadingCounts ? "..." : `${count} Students`}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<TeamOutlined />} onClick={() => onViewStudents(record.id, record.classCode)}>
            View Students
          </Button>
          <Button type="link" onClick={() => onEdit(record)} disabled={isSemesterEnded}>
            Edit
          </Button>
          <Button type="link" danger onClick={() => onDelete(record.id)} disabled={isSemesterEnded}>
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
      scroll={{ x: 'max-content' }}
    />
  );
};

interface CourseElementsTableProps {
  elements: CourseElement[];
  onEdit: (element: CourseElement) => void;
  onDelete: (elementId: number) => void;
  isSemesterEnded?: boolean;
  elementsWithAssessment?: Set<number>;
}

const CourseElementsTable = ({
  elements,
  onEdit,
  onDelete,
  isSemesterEnded = false,
  elementsWithAssessment = new Set(),
}: CourseElementsTableProps) => {
  const getElementTypeLabel = (elementType: number) => {
    switch (elementType) {
      case 0:
        return "Assignment";
      case 1:
        return "Lab";
      case 2:
        return "PE";
      default:
        return "Unknown";
    }
  };

  const getElementTypeColor = (elementType: number) => {
    switch (elementType) {
      case 0:
        return "blue";
      case 1:
        return "green";
      case 2:
        return "orange";
      default:
        return "default";
    }
  };

  const columns: TableProps<CourseElement>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Element Type",
      dataIndex: "elementType",
      key: "elementType",
      render: (elementType: number) => (
        <Tag color={getElementTypeColor(elementType)}>
          {getElementTypeLabel(elementType)}
        </Tag>
      ),
    },
    {
      title: "Weight",
      dataIndex: "weight",
      key: "weight",
      render: (weight: number) => `${(weight * 100).toFixed(1)}%`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const hasAssessment = elementsWithAssessment.has(record.id);
        const isEditDisabled = isSemesterEnded || hasAssessment;
        
        let tooltipTitle = "";
        if (isEditDisabled) {
          if (hasAssessment) {
            tooltipTitle = "This course element already has an assessment template. Editing is not allowed.";
          } else if (isSemesterEnded) {
            tooltipTitle = "The semester has ended. Editing is not allowed.";
          }
        }
        
        const editButton = (
          <Button 
            type="link" 
            onClick={() => onEdit(record)} 
            disabled={isEditDisabled}
          >
            Edit
          </Button>
        );
        
        return (
          <Space>
            {isEditDisabled ? (
              <Tooltip title={tooltipTitle}>
                <span>{editButton}</span>
              </Tooltip>
            ) : (
              editButton
            )}
            <Button type="link" danger onClick={() => onDelete(record.id)} disabled={isSemesterEnded}>
              Delete
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={elements}
      rowKey="id"
      pagination={false}
      scroll={{ x: 'max-content' }}
    />
  );
};

interface AssignRequestsTableProps {
  requests: AssignRequest[];
  onEdit: (request: AssignRequest) => void;
  onDelete: (requestId: number) => void;
  isSemesterEnded?: boolean;
}

const AssignRequestsTable = ({
  requests,
  onEdit,
  onDelete,
  isSemesterEnded = false,
}: AssignRequestsTableProps) => {
  // Map status theo ApprovalDetail.tsx:
  // 1=PENDING, 2=ACCEPTED, 3=REJECTED, 4=IN_PROGRESS, 5=COMPLETED (Approved)
  // Hiển thị 3 status: Pending (1,2,4), Approved (5), Rejected (3)
  const getStatusDisplay = (status: number | undefined) => {
    if (status === undefined || status === null) return { text: "Pending", color: "default" };
    
    switch (status) {
      case 1: // PENDING
      case 2: // ACCEPTED -> Pending (theo yêu cầu)
      case 4: // IN_PROGRESS -> Pending (theo yêu cầu)
        return { text: "Pending", color: "default" };
      case 5: // COMPLETED -> Approved (đã duyệt)
        return { text: "Approved", color: "success" };
      case 3: // REJECTED
        return { text: "Rejected", color: "error" };
      default:
        return { text: "Pending", color: "default" };
    }
  };

  // Check if status is approved (status 5 = COMPLETED/Approved)
  const isApproved = (status: number | undefined) => {
    return status === 5; // Status 5 is COMPLETED/Approved
  };

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
      render: (name: string, record: AssignRequest) => (
        <Space direction="vertical" size={0}>
          <span>{name}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.lecturer.account.accountCode || "N/A"} | {record.lecturer.department || "N/A"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: AssignRequest) => {
        const status = (record as any).status as number | undefined;
        const statusDisplay = getStatusDisplay(status);
        return <Tag color={statusDisplay.color}>{statusDisplay.text}</Tag>;
      },
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      render: (message: string) => (
        <div style={{ wordBreak: "break-word", whiteSpace: "normal", maxWidth: 300 }}>
          {message || "N/A"}
        </div>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "created",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updated",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const status = (record as any).status as number | undefined;
        const approved = isApproved(status);
        const isEditDisabled = isSemesterEnded || approved;
        const isDeleteDisabled = isSemesterEnded || approved;
        
        const editTooltipTitle = isEditDisabled
          ? approved
            ? "This assign request has been approved. Editing is not allowed."
            : "The semester has ended. Editing is not allowed."
          : "";
        
        const deleteTooltipTitle = isDeleteDisabled
          ? approved
            ? "This assign request has been approved. Deletion is not allowed."
            : "The semester has ended. Deletion is not allowed."
          : "";
        
        const editButton = (
          <Button 
            type="link" 
            onClick={() => onEdit(record)} 
            disabled={isEditDisabled}
          >
            Edit
          </Button>
        );
        
        const deleteButton = (
          <Button 
            type="link" 
            danger 
            onClick={() => onDelete(record.id)} 
            disabled={isDeleteDisabled}
          >
            Delete
          </Button>
        );
        
        return (
          <Space>
            {isEditDisabled ? (
              <Tooltip title={editTooltipTitle}>
                <span>{editButton}</span>
              </Tooltip>
            ) : (
              editButton
            )}
            {isDeleteDisabled ? (
              <Tooltip title={deleteTooltipTitle}>
                <span>{deleteButton}</span>
              </Tooltip>
            ) : (
              deleteButton
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={requests}
      rowKey="id"
      pagination={{ pageSize: 5, hideOnSinglePage: true }}
      scroll={{ x: 'max-content' }}
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
}

const SemesterCoursesTable = ({
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

const SemesterDetailPageContent = ({
  params,
}: {
  params: { semesterCode: string };
}) => {
  const router = useRouter();
  const [semesterData, setSemesterData] = useState<SemesterPlanDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { modal, notification } = App.useApp();

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
  const [currentAssignRequests, setCurrentAssignRequests] = useState<
    AssignRequest[]
  >([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  const [isStudentGroupModalOpen, setIsStudentGroupModalOpen] = useState(false);
  const [currentClassId, setCurrentClassId] = useState<number | null>(null);

  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
  const [viewingClassId, setViewingClassId] = useState<number | null>(null);
  const [viewingClassCode, setViewingClassCode] = useState<string>("");
  const [studentCountRefreshTrigger, setStudentCountRefreshTrigger] = useState(0);
  const [isImportClassStudentModalOpen, setIsImportClassStudentModalOpen] = useState(false);
  const [importingSemesterCourseId, setImportingSemesterCourseId] = useState<number | null>(null);
  const [importingSemesterCode, setImportingSemesterCode] = useState<string>("");
  const [importingCourseCode, setImportingCourseCode] = useState<string>("");
  const [importingCourseName, setImportingCourseName] = useState<string>("");
  const queryClient = useQueryClient();

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
      
      // Fetch assign requests to get status
      try {
        const assignRequestsResponse = await assignRequestService.getAssignRequests({
          pageNumber: 1,
          pageSize: 1000,
        });
        
        // Create a map of assign request ID to status
        const statusMap = new Map<number, number>();
        assignRequestsResponse.items.forEach(ar => {
          statusMap.set(ar.id, ar.status);
        });
        
        // Enrich assign requests with status
        data.semesterCourses.forEach(semesterCourse => {
          semesterCourse.assignRequests.forEach(ar => {
            const status = statusMap.get(ar.id);
            if (status !== undefined) {
              (ar as any).status = status;
            }
          });
        });
      } catch (err) {
        console.error("Failed to fetch assign requests status:", err);
        // Continue without status if fetch fails
      }
      
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

  // Get all course element IDs from the semester plan
  const allCourseElementIds = useMemo(() => {
    if (!semesterData) return new Set<number>();
    const ids = new Set<number>();
    semesterData.semesterCourses.forEach(semesterCourse => {
      semesterCourse.courseElements.forEach(element => {
        ids.add(element.id);
      });
    });
    return ids;
  }, [semesterData]);

  // Fetch assessment templates to check which course elements have assessments
  // Use refetchInterval to automatically refresh every 3 seconds to catch template deletions
  const { data: templatesResponse, refetch: refetchTemplates } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: allCourseElementIds.size > 0,
    refetchInterval: 3000, // Poll every 3 seconds to catch changes (especially deletions)
    refetchIntervalInBackground: false, // Only poll when tab is active
  });

  // Find course elements that have assessment templates
  const elementsWithAssessment = useMemo(() => {
    if (!templatesResponse?.items || allCourseElementIds.size === 0) {
      return new Set<number>();
    }
    
    const elementsWithAssessmentSet = new Set<number>();
    templatesResponse.items.forEach(template => {
      if (allCourseElementIds.has(template.courseElementId)) {
        elementsWithAssessmentSet.add(template.courseElementId);
      }
    });
    
    return elementsWithAssessmentSet;
  }, [templatesResponse, allCourseElementIds]);

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
    const wasEditing = !!editingCourse;
    setEditingCourse(null);
    notification.success({
      message: wasEditing ? "Course Updated" : "Course Created",
      description: wasEditing
        ? "The course has been successfully updated."
        : "The course has been successfully created.",
      placement: "topRight",
    });
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
          notification.success({
            message: "Course Unlinked",
            description: "The course has been successfully unlinked from this semester.",
            placement: "topRight",
          });
          fetchDetail();
        } catch (err: any) {
          console.error("Failed to delete semester course:", err);
          notification.error({
            message: "Failed to Unlink Course",
            description: err.message || "An error occurred while unlinking the course.",
            placement: "topRight",
          });
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
    const wasEditing = !!editingClass;
    setEditingClass(null);
    setCurrentSemesterCourseId(null);
    notification.success({
      message: wasEditing ? "Class Updated" : "Class Created",
      description: wasEditing
        ? "The class has been successfully updated."
        : "The class has been successfully created.",
      placement: "topRight",
    });
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
          notification.success({
            message: "Class Deleted",
            description: "The class has been successfully deleted.",
            placement: "topRight",
          });
          fetchDetail();
        } catch (err: any) {
          console.error("Failed to delete class:", err);
          notification.error({
            message: "Failed to Delete Class",
            description: err.message || "An error occurred while deleting the class.",
            placement: "topRight",
          });
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
    // Check if the course element has an assessment
    if (elementsWithAssessment.has(element.id)) {
      notification.warning({
        message: "Cannot Edit Course Element",
        description: "This course element already has an assessment template. Editing is not allowed.",
        placement: "topRight",
      });
      return;
    }

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
    const wasEditing = !!editingElement;
    setEditingElement(null);
    setCurrentSemesterCourseIdForElement(null);
    notification.success({
      message: wasEditing ? "Course Element Updated" : "Course Element Created",
      description: wasEditing
        ? "The course element has been successfully updated."
        : "The course element has been successfully created.",
      placement: "topRight",
    });
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
          notification.success({
            message: "Course Element Deleted",
            description: "The course element has been successfully deleted.",
            placement: "topRight",
          });
          fetchDetail();
        } catch (err: any) {
          console.error("Failed to delete course element:", err);
          notification.error({
            message: "Failed to Delete Course Element",
            description: err.message || "An error occurred while deleting the course element.",
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleOpenCreateAssignRequestModal = (
    semesterCourse: SemesterCourse
  ) => {
    setCurrentCourseElements(semesterCourse.courseElements);
    setCurrentAssignRequests(semesterCourse.assignRequests);
    setEditingAssignRequest(null);
    setIsAssignRequestModalOpen(true);
  };

  const handleOpenEditAssignRequestModal = (
    request: AssignRequest,
    semesterCourse: SemesterCourse
  ) => {
    setCurrentCourseElements(semesterCourse.courseElements);
    setCurrentAssignRequests(semesterCourse.assignRequests);
    setEditingAssignRequest(request);
    setIsAssignRequestModalOpen(true);
  };

  const handleAssignRequestModalCancel = () => {
    setIsAssignRequestModalOpen(false);
    setEditingAssignRequest(null);
    setCurrentCourseElements([]);
    setCurrentAssignRequests([]);
  };

  const handleAssignRequestModalOk = () => {
    setIsAssignRequestModalOpen(false);
    const wasEditing = !!editingAssignRequest;
    setEditingAssignRequest(null);
    setCurrentCourseElements([]);
    setCurrentAssignRequests([]);
    notification.success({
      message: wasEditing ? "Assign Request Updated" : "Assign Request Created",
      description: wasEditing
        ? "The assign request has been successfully updated."
        : "The assign request has been successfully created.",
      placement: "topRight",
    });
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
          notification.success({
            message: "Assign Request Deleted",
            description: "The assign request has been successfully deleted.",
            placement: "topRight",
          });
          fetchDetail();
        } catch (err: any) {
          console.error("Failed to delete assign request:", err);
          notification.error({
            message: "Failed to Delete Assign Request",
            description: err.message || "An error occurred while deleting the assign request.",
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleOpenAddStudentModal = (classId: number) => {
    setCurrentClassId(classId);
    setIsStudentGroupModalOpen(true);
  };

  const handleViewStudents = (classId: number, classCode: string) => {
    setViewingClassId(classId);
    setViewingClassCode(classCode);
    setIsViewStudentsModalOpen(true);
  };

  const handleViewStudentsModalCancel = () => {
    setIsViewStudentsModalOpen(false);
    setViewingClassId(null);
    setViewingClassCode("");
  };

  const handleStudentGroupModalCancel = () => {
    setIsStudentGroupModalOpen(false);
    setCurrentClassId(null);
  };

  const handleStudentGroupModalOk = () => {
    setIsStudentGroupModalOpen(false);
    setCurrentClassId(null);
    notification.success({
      message: "Student Added",
      description: "The student has been successfully added to the class.",
      placement: "topRight",
    });
    fetchDetail();
    setStudentCountRefreshTrigger(prev => prev + 1);
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
          notification.success({
            message: "Student Removed",
            description: "The student has been successfully removed from the class.",
            placement: "topRight",
          });
          fetchDetail();
          setStudentCountRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
          console.error("Failed to remove student:", err);
          notification.error({
            message: "Failed to Remove Student",
            description: err.message || "An error occurred while removing the student.",
            placement: "topRight",
          });
        }
      },
    });
  };

  const handleImportClassStudent = (semesterCourse: SemesterCourse) => {
    setImportingSemesterCourseId(semesterCourse.id);
    setImportingSemesterCode(semesterData?.semesterCode || "");
    setImportingCourseCode(semesterCourse.course.code);
    setImportingCourseName(semesterCourse.course.name);
    setIsImportClassStudentModalOpen(true);
  };

  const handleImportClassStudentModalCancel = () => {
    setIsImportClassStudentModalOpen(false);
    setImportingSemesterCourseId(null);
    setImportingSemesterCode("");
    setImportingCourseCode("");
    setImportingCourseName("");
  };

  const handleImportClassStudentModalOk = () => {
    setIsImportClassStudentModalOpen(false);
    fetchDetail();
    notification.success({
      message: "Import Successful",
      description: "Class student data has been imported successfully.",
      placement: "topRight",
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

  // Check if semester has ended
  const semesterEnded = isSemesterEnded(semesterData.endDate);

  return (
    <div style={{ padding: "24px", background: "#fff", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <Title level={2} style={{ margin: 0 }}>Semester Plan: {semesterData.semesterCode}</Title>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      <Descriptions bordered style={{ marginBottom: 24 }} column={2}>
        <Descriptions.Item label="Semester Code">
          {semesterData.semesterCode}
        </Descriptions.Item>
        <Descriptions.Item label="Academic Year">
          {semesterData.academicYear}
        </Descriptions.Item>
        <Descriptions.Item label="Start Date">
          {formatUtcDate(semesterData.startDate, "dd/MM/yyyy")}
        </Descriptions.Item>
        <Descriptions.Item label="End Date">
          {formatUtcDate(semesterData.endDate, "dd/MM/yyyy")}
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          {formatUtcDate(semesterData.createdAt, "dd/MM/yyyy HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label="Updated At">
          {formatUtcDate(semesterData.updatedAt, "dd/MM/yyyy HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label="Note" span={2}>
          {semesterData.note || "N/A"}
        </Descriptions.Item>
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
          disabled={semesterEnded}
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
        onViewStudents={handleViewStudents}
        onDeleteStudent={handleDeleteStudentGroup}
        onAddElement={handleOpenCreateElementModal}
        onEditElement={handleOpenEditElementModal}
        onDeleteElement={handleDeleteElement}
        onAddAssignRequest={handleOpenCreateAssignRequestModal}
        onEditAssignRequest={handleOpenEditAssignRequestModal}
        onDeleteAssignRequest={handleDeleteAssignRequest}
        onImportClassStudent={handleImportClassStudent}
        studentCountRefreshTrigger={studentCountRefreshTrigger}
        isSemesterEnded={semesterEnded}
        elementsWithAssessment={elementsWithAssessment}
      />

      <CourseCrudModal
        open={isCourseModalOpen}
        semesterId={semesterData.id}
        initialData={editingCourse}
        existingSemesterCourses={semesterData?.semesterCourses || []}
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
          existingElements={
            semesterData?.semesterCourses.find(
              (sc) => sc.id === currentSemesterCourseIdForElement
            )?.courseElements || []
          }
          onCancel={handleElementModalCancel}
          onOk={handleElementModalOk}
        />
      )}

      <AssignRequestCrudModal
        open={isAssignRequestModalOpen}
        initialData={editingAssignRequest}
        lecturers={lecturers}
        courseElements={currentCourseElements}
        existingAssignRequests={currentAssignRequests}
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

      <ViewStudentsModal
        open={isViewStudentsModalOpen}
        classId={viewingClassId}
        classCode={viewingClassCode}
        onCancel={handleViewStudentsModalCancel}
        onDeleteStudent={(studentGroupId) => {
          handleDeleteStudentGroup(studentGroupId);
        }}
        onRefresh={() => {
          fetchDetail();
          setStudentCountRefreshTrigger(prev => prev + 1);
        }}
      />

      {importingSemesterCourseId !== null && (
        <ImportClassStudentModal
          open={isImportClassStudentModalOpen}
          onCancel={handleImportClassStudentModalCancel}
          onImport={handleImportClassStudentModalOk}
          semesterCode={importingSemesterCode}
          semesterCourseId={importingSemesterCourseId}
          courseCode={importingCourseCode}
          courseName={importingCourseName}
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
  const resolvedParams = use(params);
  return (
    <App>
      <SemesterDetailPageContent params={resolvedParams} />
    </App>
  );
}
