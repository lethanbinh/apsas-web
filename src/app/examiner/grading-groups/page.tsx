"use client";

import { AssignSubmissionsModal } from "@/components/examiner/AssignSubmissionsModal";
import { CreateGradingGroupModal } from "@/components/examiner/CreateGradingGroupModal";
import {
  GradingGroup,
  gradingGroupService,
} from "@/services/gradingGroupService";
import { Lecturer, lecturerService } from "@/services/lecturerService";
import { submissionService, Submission } from "@/services/submissionService";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";
import { classService, ClassInfo } from "@/services/classService";
import { assessmentTemplateService, AssessmentTemplate } from "@/services/assessmentTemplateService";
import { courseElementService, CourseElement } from "@/services/courseElementService";
import { semesterService, Semester } from "@/services/semesterService";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  UserAddOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Empty,
  Statistic,
  Select,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./GradingGroups.module.css";

const { Title, Text } = Typography;

const GradingGroupsPageContent = () => {
  const [allGroups, setAllGroups] = useState<GradingGroup[]>([]);
  const [allLecturers, setAllLecturers] = useState<Lecturer[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [allClassAssessments, setAllClassAssessments] = useState<Map<number, ClassAssessment>>(new Map());
  const [allClasses, setAllClasses] = useState<Map<number, ClassInfo>>(new Map());
  const [allAssessmentTemplates, setAllAssessmentTemplates] = useState<Map<number, AssessmentTemplate>>(new Map());
  const [allCourseElements, setAllCourseElements] = useState<Map<number, CourseElement>>(new Map());
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [gradingGroupToSemesterMap, setGradingGroupToSemesterMap] = useState<Map<number, string>>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GradingGroup | null>(null);

  const { message } = App.useApp();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupRes, lecturerRes, semesterList] = await Promise.all([
        gradingGroupService.getGradingGroups({}),
        lecturerService.getLecturerList(),
        semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }).catch(() => []),
      ]);
      
      setAllSemesters(semesterList);

      setAllGroups(groupRes);
      setAllLecturers(lecturerRes);

      // Fetch all submissions for all grading groups
      const allSubmissionPromises = groupRes.map(group =>
        submissionService.getSubmissionList({ gradingGroupId: group.id }).catch(() => [])
      );
      const allSubmissionResults = await Promise.all(allSubmissionPromises);
      const submissions = allSubmissionResults.flat();
      setAllSubmissions(submissions);

      // Get unique classAssessmentIds from submissions
      const classAssessmentIds = Array.from(
        new Set(submissions.filter(s => s.classAssessmentId).map(s => s.classAssessmentId!))
      );

      // Fetch all class assessments (we'll filter by IDs we need)
      const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
        pageNumber: 1,
        pageSize: 1000,
      }).catch(() => ({ items: [] }));
      
      const classAssessmentMap = new Map<number, ClassAssessment>();
      allClassAssessmentsRes.items.forEach(ca => {
        if (classAssessmentIds.includes(ca.id)) {
          classAssessmentMap.set(ca.id, ca);
        }
      });
      setAllClassAssessments(classAssessmentMap);

      // Get unique assessmentTemplateIds from class assessments AND grading groups
      const assessmentTemplateIdsFromClassAssessments = Array.from(
        new Set(Array.from(classAssessmentMap.values()).map(ca => ca.assessmentTemplateId))
      );
      const assessmentTemplateIdsFromGroups = Array.from(
        new Set(groupRes.filter(g => g.assessmentTemplateId !== null).map(g => g.assessmentTemplateId!))
      );
      const allAssessmentTemplateIds = Array.from(
        new Set([...assessmentTemplateIdsFromClassAssessments, ...assessmentTemplateIdsFromGroups])
      );

      // Fetch all assessment templates
      const allAssessmentTemplatesRes = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      }).catch(() => ({ items: [] }));

      const assessmentTemplateMap = new Map<number, AssessmentTemplate>();
      allAssessmentTemplatesRes.items.forEach(template => {
        if (allAssessmentTemplateIds.includes(template.id)) {
          assessmentTemplateMap.set(template.id, template);
        }
      });
      setAllAssessmentTemplates(assessmentTemplateMap);

      // Get unique courseElementIds from all assessment templates (not just filtered ones)
      const courseElementIds = Array.from(
        new Set(Array.from(assessmentTemplateMap.values()).map(t => t.courseElementId))
      );

      // Fetch all course elements
      const allCourseElementsRes = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      }).catch(() => []);

      const courseElementMap = new Map<number, CourseElement>();
      allCourseElementsRes.forEach(element => {
        if (courseElementIds.includes(element.id)) {
          courseElementMap.set(element.id, element);
        }
      });
      setAllCourseElements(courseElementMap);

      // Map grading groups to semester codes using assessmentTemplateId
      const groupToSemesterMap = new Map<number, string>();
      groupRes.forEach(group => {
        if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
          const assessmentTemplate = assessmentTemplateMap.get(Number(group.assessmentTemplateId));
          if (assessmentTemplate) {
            const courseElement = courseElementMap.get(Number(assessmentTemplate.courseElementId));
            if (courseElement && courseElement.semesterCourse && courseElement.semesterCourse.semester) {
              const semesterCode = courseElement.semesterCourse.semester.semesterCode;
              groupToSemesterMap.set(Number(group.id), semesterCode);
            }
          }
        }
      });
      setGradingGroupToSemesterMap(groupToSemesterMap);

      // Get unique classIds from class assessments
      const classIds = Array.from(new Set(Array.from(classAssessmentMap.values()).map(ca => ca.classId)));

      // Fetch classes
      const classPromises = classIds.map(classId =>
        classService.getClassById(classId).catch(() => null)
      );
      const classResults = await Promise.all(classPromises);
      const classMap = new Map<number, ClassInfo>();
      classResults.forEach(cls => {
        if (cls) classMap.set(cls.id, cls);
      });
      setAllClasses(classMap);
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
      message.error(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map submission to enriched data with submission URL
  const enrichedSubmissionsMap = useMemo(() => {
    const map = new Map<number, Submission & { submissionUrl?: string; fileName?: string }>();
    
    allSubmissions.forEach(sub => {
      map.set(sub.id, {
        ...sub,
        submissionUrl: sub.submissionFile?.submissionUrl,
        fileName: sub.submissionFile?.name,
      });
    });

    return map;
  }, [allSubmissions]);

  // Get available semesters from semesterService
  const availableSemesters = useMemo(() => {
    return allSemesters.map(sem => sem.semesterCode).sort();
  }, [allSemesters]);

  const assignedGroups = useMemo(() => {
    const groupsMap = new Map<number, GradingGroup & { subs: any[] }>();

    allLecturers.forEach((lecturer) => {
      const group = allGroups.find(
        (g) => g.lecturerId === Number(lecturer.lecturerId)
      );
      if (group) {
        // Get enriched submissions for this group
        const groupSubmissions = allSubmissions.filter(s => s.gradingGroupId === group.id);
        
        // Convert to enriched format
        const subs = groupSubmissions.map((sub) => {
          const enriched = enrichedSubmissionsMap.get(sub.id);
          return {
            id: sub.id,
            studentId: sub.studentId,
            studentName: sub.studentName,
            studentCode: sub.studentCode,
            gradingGroupId: group.id,
            lecturerName: group.lecturerName || undefined,
            submittedAt: sub.submittedAt || "",
            status: sub.status,
            lastGrade: sub.lastGrade,
            submissionFile: {
              ...sub.submissionFile,
              submissionUrl: enriched?.submissionUrl || sub.submissionFile?.submissionUrl,
              name: enriched?.fileName || sub.submissionFile?.name,
            },
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
          };
        });

        // Filter by selected semester - check if group's semester matches
        const groupSemester = gradingGroupToSemesterMap.get(Number(group.id));
        if (selectedSemester !== "all") {
          if (!groupSemester || groupSemester !== selectedSemester) {
            // Skip this group if semester doesn't match
            return;
          }
        }

        groupsMap.set(group.id, { ...group, subs });
      }
    });

    return Array.from(groupsMap.values());
  }, [allGroups, allLecturers, allSubmissions, enrichedSubmissionsMap, selectedSemester, gradingGroupToSemesterMap]);

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

  const submissionColumns: TableProps<any>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Student",
      dataIndex: "studentName",
      key: "student",
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentCode}
          </Text>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date) => date ? new Date(date).toLocaleString() : "N/A",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
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
    {
      title: "Score",
      dataIndex: "lastGrade",
      key: "score",
      width: 100,
      render: (grade) => <Text>{grade !== null && grade !== undefined ? `${grade}/100` : "N/A"}</Text>,
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (_, record) => {
        const handleDownload = () => {
          if (record.submissionFile?.submissionUrl) {
            const link = document.createElement("a");
            link.href = record.submissionFile.submissionUrl;
            link.download = record.submissionFile.name || "submission.zip";
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        };

        return (
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!record.submissionFile?.submissionUrl}
            size="small"
          />
        );
      },
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
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <Title
            level={2}
            style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}
          >
            Teacher Assignment
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Assign submissions to teachers for grading
          </Text>
        </div>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="Filter by Semester"
            value={selectedSemester}
            onChange={setSelectedSemester}
            options={[
              { label: "All Semesters", value: "all" },
              ...availableSemesters.map(sem => ({ label: sem, value: sem }))
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
            size="large"
          >
            Assign Teacher
          </Button>
        </Space>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="Total Teachers"
              value={assignedGroups.length}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="Total Submissions"
              value={assignedGroups.reduce((sum, group) => sum + group.subs.length, 0)}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row>
        <Col span={24}>
          <Card
            title={
              <Space>
                <Text strong>Assigned Teachers</Text>
                <Tag color="green">{assignedGroups.length}</Tag>
              </Space>
            }
            className={styles.card}
          >
            {assignedGroups.length === 0 ? (
              <Empty
                description="No assigned teachers"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <div className={styles.groupsList}>
                {assignedGroups.map((group) => (
                  <Card
                    key={group.id}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={
                      <Space>
                        <Text strong>{group.lecturerName}</Text>
                        <Tag>{group.subs.length} submissions</Tag>
                      </Space>
                    }
                    extra={
                      <Button
                        type="link"
                        icon={<UserAddOutlined />}
                        onClick={() => handleOpenAssign(group)}
                        size="small"
                      >
                        Manage
                      </Button>
                    }
                  >
                    <Table
                      dataSource={group.subs}
                      columns={submissionColumns}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      scroll={{ y: 200 }}
                    />
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {isCreateModalOpen && (
        <CreateGradingGroupModal
          open={isCreateModalOpen}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
          allLecturers={allLecturers}
        />
      )}

      {isAssignModalOpen && selectedGroup && (
        <AssignSubmissionsModal
          open={isAssignModalOpen}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
          group={selectedGroup}
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
