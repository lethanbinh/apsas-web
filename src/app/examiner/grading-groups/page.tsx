"use client";

import { AssignSubmissionsModal } from "@/components/examiner/AssignSubmissionsModal";
import { CreateGradingGroupModal } from "@/components/examiner/CreateGradingGroupModal";
import { ClassInfo, classService } from "@/services/classService";
import { Course, courseService } from "@/services/courseManagementService";
import { ExamSession, examSessionService } from "@/services/examSessionService";
import {
    GradingGroup,
    gradingGroupService,
} from "@/services/gradingGroupService";
import { Lecturer, lecturerService } from "@/services/lecturerService";
import { Semester, semesterService } from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    UserAddOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import {
    Alert,
    App,
    Button,
    Collapse,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./GradingGroups.module.css";

const { Title } = Typography;

type EnrichedSubmission = Omit<Submission, "gradingGroupId" | "lecturerName"> & {
  courseName: string;
  semesterName: string;
  lecturerName?: string;
  gradingGroupId?: number;
};

const GradingGroupsPageContent = () => {
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [allGroups, setAllGroups] = useState<GradingGroup[]>([]);
  const [allSessions, setAllSessions] = useState<Map<number, ExamSession>>(
    new Map()
  );
  const [allClasses, setAllClasses] = useState<Map<number, ClassInfo>>(
    new Map()
  );
  const [allLecturers, setAllLecturers] = useState<Lecturer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterSemester, setFilterSemester] = useState<string | undefined>(
    undefined
  );
  const [filterCourse, setFilterCourse] = useState<number | undefined>(
    undefined
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GradingGroup | null>(null);

  const { modal, notification } = App.useApp();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        submissionRes,
        groupRes,
        sessionRes,
        classRes,
        lecturerRes,
        courseRes,
        semesterRes,
      ] = await Promise.all([
        submissionService.getSubmissionList({}),
        gradingGroupService.getGradingGroups({}),
        examSessionService.getExamSessions({ pageNumber: 1, pageSize: 1000 }),
        classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        lecturerService.getLecturerList(),
        courseService.getCourseList({ pageNumber: 1, pageSize: 1000 }),
        semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
      ]);

      setAllSubmissions(submissionRes);
      setAllGroups(groupRes);
      setAllLecturers(lecturerRes);
      setCourses(courseRes);
      setSemesters(semesterRes);

      setAllSessions(new Map(sessionRes.items.map((s) => [s.id, s])));
      setAllClasses(new Map(classRes.classes.map((c) => [Number(c.id), c])));
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submissionToGroupMap = useMemo(() => {
    const map = new Map<number, GradingGroup>();
    allGroups.forEach((group) => {
      group.submissions.forEach((sub) => {
        map.set(sub.id, group);
      });
    });
    return map;
  }, [allGroups]);

  const enrichedSubmissions: EnrichedSubmission[] = useMemo(() => {
    return allSubmissions.map((sub) => {
      const session = sub.examSessionId ? allSessions.get(sub.examSessionId) : undefined;
      const cls = session ? allClasses.get(session.classId) : undefined;
      const group = submissionToGroupMap.get(sub.id);

      return {
        ...sub,
        courseName: session?.courseName || "N/A",
        semesterName: cls ? cls.semesterName.split(" - ")[0] : "N/A",
        lecturerName: group?.lecturerName || undefined,
        gradingGroupId: group?.id || undefined,
      };
    });
  }, [allSubmissions, allSessions, allClasses, submissionToGroupMap]);

  const filteredSubmissions = useMemo(() => {
    const courseName = courses.find((c) => c.id === filterCourse)?.name;
    return enrichedSubmissions.filter((sub) => {
      const semesterMatch =
        !filterSemester || sub.semesterName === filterSemester;
      const courseMatch = !filterCourse || sub.courseName === courseName;
      return semesterMatch && courseMatch;
    });
  }, [enrichedSubmissions, filterSemester, filterCourse, courses]);

  const unassignedSubmissions = useMemo(() => {
    return filteredSubmissions.filter((sub) => !sub.gradingGroupId);
  }, [filteredSubmissions]);

  const assignedGroups = useMemo(() => {
    const groupsMap = new Map<number, GradingGroup & { subs: EnrichedSubmission[] }>();

    allLecturers.forEach((lecturer) => {
      const group = allGroups.find(
        (g) => g.lecturerId === Number(lecturer.lecturerId)
      );
      if (group) {
        groupsMap.set(group.id, { ...group, subs: [] });
      }
    });

    filteredSubmissions.forEach((sub) => {
      if (sub.gradingGroupId && groupsMap.has(sub.gradingGroupId)) {
        groupsMap.get(sub.gradingGroupId)!.subs.push(sub);
      }
    });

    return Array.from(groupsMap.values());
  }, [filteredSubmissions, allGroups, allLecturers]);

  // Map submissionId -> class lecturerId to validate cross-grading
  const submissionLecturerIdMap = useMemo(() => {
    const map = new Map<number, number>();
    allSubmissions.forEach((sub) => {
      if (!sub.examSessionId) return;
      const session = allSessions.get(sub.examSessionId);
      if (!session) return;
      const cls = allClasses.get(session.classId);
      if (!cls) return;
      const lecturerId = Number(cls.lecturerId);
      if (!Number.isNaN(lecturerId)) {
        map.set(sub.id, lecturerId);
      }
    });
    return map;
  }, [allSubmissions, allSessions, allClasses]);

  const handleOpenAssign = (group: GradingGroup) => {
    setSelectedGroup(group);
    setIsAssignModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsCreateModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedGroup(null);
  };

  const handleModalOk = () => {
    setIsCreateModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedGroup(null);
    fetchData();
  };

  const submissionColumns: TableProps<EnrichedSubmission>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Student",
      dataIndex: "studentName",
      key: "student",
      render: (name, record) => `${name} (${record.studentCode})`,
    },
    {
      title: "File",
      dataIndex: "submissionFile",
      key: "file",
      render: (file) => file?.name || "N/A",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) =>
        status === 0 ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            On Time
          </Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="error">
            Late
          </Tag>
        ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.spinner}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}
        >
          Grading Groups
        </Title>
        <Space>
          <Select
            allowClear
            value={filterSemester}
            onChange={setFilterSemester}
            style={{ width: 240 }}
            placeholder="Filter by Semester"
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
            options={courses.map((t) => ({
              label: `${t.name} (${t.code})`,
              value: t.id,
            }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Group
          </Button>
        </Space>
      </div>

      <div className={styles.kanban}>
        {/* Column 1: Unassigned */}
        <div className={styles.column}>
          <Title level={4} className={styles.columnTitle}>
            Unassigned ({unassignedSubmissions.length})
          </Title>
          <div className={styles.columnContent}>
            <Table<EnrichedSubmission>
              dataSource={unassignedSubmissions}
              columns={submissionColumns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </div>
        </div>

        {/* Column 2: Assigned Groups (stacked panels) */}
        <div className={styles.column}>
          <Title level={4} className={styles.columnTitle}>
            Assigned Groups ({assignedGroups.length})
          </Title>
          <div className={styles.columnContent}>
            <Collapse accordion>
              {assignedGroups.map((group) => (
                <Collapse.Panel
                  header={`${group.lecturerName} (${group.subs.length})`}
                  key={group.id}
                >
                  <Table<EnrichedSubmission>
                    dataSource={group.subs}
                    columns={submissionColumns}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    size="small"
                  />
                  <Button
                    icon={<UserAddOutlined />}
                    style={{ marginTop: 12, width: "100%" }}
                    onClick={() => handleOpenAssign(group)}
                  >
                    Assign/Remove
                  </Button>
                </Collapse.Panel>
              ))}
            </Collapse>
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateGradingGroupModal
          open={isCreateModalOpen}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
          allLecturers={allLecturers}
          unassignedSubmissions={unassignedSubmissions}
          submissionLecturerIdMap={Object.fromEntries(submissionLecturerIdMap)}
        />
      )}

      {isAssignModalOpen && selectedGroup && (
        <AssignSubmissionsModal
          open={isAssignModalOpen}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
          group={selectedGroup}
          unassignedSubmissions={unassignedSubmissions}
          submissionLecturerIdMap={Object.fromEntries(submissionLecturerIdMap)}
          allGroups={allGroups}
        />
      )}
    </div>
  );
};

export default function GradingGroupsPage() {
  return (
    <App>
      <GradingGroupsPageContent />
    </App>
  );
}
