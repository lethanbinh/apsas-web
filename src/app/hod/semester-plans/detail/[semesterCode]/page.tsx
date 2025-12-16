"use client";
import { ImportClassStudentModal } from "@/components/hod/ImportClassStudentModal";
import { AssignRequestCrudModal } from "@/components/modals/AssignRequestCrudModal";
import { ClassCrudModal } from "@/components/modals/ClassCrudModal";
import { CourseCrudModal } from "@/components/modals/CourseCrudModal";
import { CourseElementCrudModal } from "@/components/modals/CourseElementCrudModal";
import { StudentGroupCrudModal } from "@/components/modals/StudentGroupCrudModal";
import { ViewStudentsModal } from "@/components/modals/ViewStudentsModal";
import { assignRequestService } from "@/services/assignRequestService";
import { classManagementService } from "@/services/classManagementService";
import { courseElementManagementService } from "@/services/courseElementManagementService";
import { Course } from "@/services/courseElementService";
import { semesterCourseService } from "@/services/courseManagementService";
import {
  AssignRequest,
  Class,
  CourseElement,
  SemesterCourse,
} from "@/services/semesterService";
import { studentManagementService } from "@/services/studentManagementService";
import {
  ArrowLeftOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import {
  App,
  Button,
  Descriptions,
  Space,
  Spin,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { SemesterCoursesTable } from "./components/SemesterCoursesTable";
import { useSemesterDetailData } from "./hooks/useSemesterDetailData";
import { formatUtcDate, isSemesterEnded } from "./utils";

const { Title, Text } = Typography;

const SemesterDetailPageContent = ({
  params,
}: {
  params: { semesterCode: string };
}) => {
  const router = useRouter();
  const { modal, notification } = App.useApp();
  const queryClient = useQueryClient();
  const {
    semesterData,
    loading,
    error,
    lecturers,
    elementsWithAssessment,
    elementsWithApprovedRequest,
  } = useSemesterDetailData(params.semesterCode);

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
    queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
          queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
          queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
          queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
    queryClient.invalidateQueries({ queryKey: queryKeys.assignRequests.all });
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
          queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
          queryClient.invalidateQueries({ queryKey: queryKeys.assignRequests.all });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
          queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
        elementsWithApprovedRequest={elementsWithApprovedRequest}
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
          queryClient.invalidateQueries({ queryKey: queryKeys.semesters.detail(params.semesterCode) });
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
