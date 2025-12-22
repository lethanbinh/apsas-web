"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { isLabTemplate, isPracticalExamTemplate } from "@/services/adminDashboard/utils";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { submissionService } from "@/services/submissionService";
import { ArrowLeftOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import styles from "../dashboard/DashboardAdmin.module.css";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
  blue: "#2563EB",
  green: "#10B981",
  purple: "#6D28D9",
  orange: "#F59E0B",
  red: "#EF4444",
};

const SubmissionsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(undefined);
  const [selectedClass, setSelectedClass] = useState<number | undefined>(undefined);
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data: submissionsRes, isLoading: submissionsLoading } = useQuery({
    queryKey: ['adminSubmissions'],
    queryFn: () => submissionService.getSubmissionList({}),
  });

  const submissions = submissionsRes || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminSubmissions'] });
    queryClient.invalidateQueries({ queryKey: ['adminClassAssessments'] });
    queryClient.invalidateQueries({ queryKey: ['adminTemplates'] });
    queryClient.invalidateQueries({ queryKey: ['adminClasses'] });
    queryClient.invalidateQueries({ queryKey: ['adminSemesters'] });
  };

  // Fetch classes and semesters for filters
  const { data: classesRes } = useQuery({
    queryKey: ['adminClasses'],
    queryFn: async () => {
      const { classService } = await import("@/services/classService");
      return classService.getClassList({ pageNumber: 1, pageSize: 1000 });
    },
  });

  const { data: semestersRes } = useQuery({
    queryKey: ['adminSemesters'],
    queryFn: async () => {
      const { adminService } = await import("@/services/adminService");
      return adminService.getPaginatedSemesters(1, 100);
    },
  });

  const classes = classesRes?.classes || [];
  const semesters = semestersRes || [];

  // Fetch class assessments and templates to determine submission types
  const { data: classAssessmentsRes } = useQuery({
    queryKey: ['adminClassAssessments'],
    queryFn: async () => {
      const { classAssessmentService } = await import("@/services/classAssessmentService");
      return classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 });
    },
  });

  const { data: templatesRes } = useQuery({
    queryKey: ['adminTemplates'],
    queryFn: async () => {
      const { adminService } = await import("@/services/adminService");
      return adminService.getAssessmentTemplateList(1, 1000);
    },
  });

  // Get unique courses from class assessments
  const uniqueCourses = useMemo(() => {
    if (!classAssessmentsRes?.items) return [];
    const courses = new Set<string>();
    classAssessmentsRes.items.forEach((ca) => {
      if (ca.courseName) courses.add(ca.courseName);
    });
    return Array.from(courses).sort();
  }, [classAssessmentsRes]);

  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];

    if (!classAssessmentsRes?.items) return filtered;

    // Create assessment map for quick lookup
    const assessmentMap = new Map(classAssessmentsRes.items.map(a => [a.id, a]));

    filtered = filtered.filter((sub) => {
      if (!sub.classAssessmentId) return false;
      
      const assessment = assessmentMap.get(sub.classAssessmentId);
      if (!assessment) return false;

      // Filter by course
      if (selectedCourse && assessment.courseName !== selectedCourse) {
        return false;
      }

      // Filter by class
      if (selectedClass && assessment.classId !== selectedClass) {
        return false;
      }

      // Filter by semester
      if (selectedSemester) {
        // Check if class has matching semester
        const classData = classes.find(c => c.id === assessment.classId);
        if (classData) {
          // Check if semesterName matches or contains selectedSemester
          if (classData.semesterName !== selectedSemester && 
              !classData.semesterName?.includes(selectedSemester) &&
              !selectedSemester.includes(classData.semesterName || '')) {
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    });

    // Filter by date range
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((sub) => {
        if (!sub.submittedAt) return false;
        const submittedDate = dayjs(sub.submittedAt);
        const startDate = dateRange[0]!.startOf("day");
        const endDate = dateRange[1]!.endOf("day");
        return (
          (submittedDate.isAfter(startDate) || submittedDate.isSame(startDate)) &&
          (submittedDate.isBefore(endDate) || submittedDate.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [submissions, selectedCourse, selectedClass, selectedSemester, dateRange?.[0]?.valueOf(), dateRange?.[1]?.valueOf(), classAssessmentsRes, classes]);

  // Fetch grading sessions for filtered submissions
  const gradingSessionsQueries = useQueries({
    queries: filteredSubmissions.map((sub) => ({
      queryKey: ['gradingSessions', 'bySubmissionId', sub.id],
      queryFn: () => gradingService.getGradingSessions({
        submissionId: sub.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: filteredSubmissions.length > 0 && !!sub.id,
    })),
  });

  // Get all unique session IDs that we need to fetch grade items for
  const sessionIdsForGradeItems = useMemo(() => {
    const sessionIds: number[] = [];
    if (!classAssessmentsRes?.items || !templatesRes?.items) return sessionIds;

    const assessmentMap = new Map(classAssessmentsRes.items.map(a => [a.id, a]));
    const templateMap = new Map(templatesRes.items.map(t => [t.id, t]));

    filteredSubmissions.forEach((sub, index) => {
      if (!sub.classAssessmentId || !sub.id) return;

      const assessment = assessmentMap.get(sub.classAssessmentId);
      if (!assessment) return;

      // Determine assessment type
      let assessmentType: 'assignment' | 'lab' | 'practicalExam' = 'assignment';
      if (assessment?.assessmentTemplateId) {
        const template = templateMap.get(assessment.assessmentTemplateId);
        if (template) {
          if (isPracticalExamTemplate(template)) {
            assessmentType = 'practicalExam';
          } else if (isLabTemplate(template)) {
            assessmentType = 'lab';
          }
        }
      }

      // For lab: always calculate (auto-graded available after submission)
      // For assignment/practical exam: only calculate if published
      if (assessmentType !== 'lab' && !assessment.isPublished) {
        return;
      }

      const sessionsQuery = gradingSessionsQueries[index];
      if (!sessionsQuery?.data?.items || sessionsQuery.data.items.length === 0) {
        return;
      }

      const completedSessions = sessionsQuery.data.items.filter((s: any) => s.status === 1);
      if (completedSessions.length === 0) {
        return;
      }

      // Select the appropriate session
      let selectedSession = null;
      
      if (assessmentType === 'lab' && assessment.isPublished) {
        const teacherSession = completedSessions.find(
          (s: any) => s.gradingType === 1 || s.gradingType === 2
        );
        if (teacherSession) {
          selectedSession = teacherSession;
        } else {
          const autoSession = completedSessions.find((s: any) => s.gradingType === 0);
          selectedSession = autoSession || completedSessions.sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
        }
      } else if (assessmentType === 'lab') {
        const autoSession = completedSessions.find((s: any) => s.gradingType === 0);
        selectedSession = autoSession || completedSessions.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      } else {
        const teacherSession = completedSessions.find(
          (s: any) => s.gradingType === 1 || s.gradingType === 2
        );
        selectedSession = teacherSession || completedSessions.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      }

      if (selectedSession?.id) {
        sessionIds.push(selectedSession.id);
      }
    });

    return sessionIds;
  }, [filteredSubmissions, classAssessmentsRes, templatesRes, gradingSessionsQueries]);

  // Fetch grade items for selected sessions
  const gradeItemsQueries = useQueries({
    queries: sessionIdsForGradeItems.map((sessionId) => ({
      queryKey: ['gradeItems', 'byGradingSessionId', sessionId],
      queryFn: () => gradeItemService.getGradeItems({
        gradingSessionId: sessionId,
        pageNumber: 1,
        pageSize: 1000,
      }),
      enabled: sessionIdsForGradeItems.length > 0 && !!sessionId,
      staleTime: 30000, // Cache for 30 seconds
    })),
  });

  // Create a map from sessionId to grade items
  const gradeItemsBySessionId = useMemo(() => {
    const map = new Map<number, any[]>();
    sessionIdsForGradeItems.forEach((sessionId, index) => {
      const query = gradeItemsQueries[index];
      if (query?.data?.items) {
        map.set(sessionId, query.data.items);
      }
    });
    return map;
  }, [sessionIdsForGradeItems, gradeItemsQueries]);

  // Group submissions by student and assessment to get latest submission for each student (like overview)
  const latestSubmissionsMap = useMemo(() => {
    const map = new Map<string, typeof filteredSubmissions[0]>();
    
    filteredSubmissions.forEach((sub) => {
      if (!sub.classAssessmentId || !sub.studentId) return;
      const key = `${sub.studentId}_${sub.classAssessmentId}`;
      const existing = map.get(key);
      
      if (!existing) {
        map.set(key, sub);
      } else {
        // Keep the latest submission
        const existingDate = existing.submittedAt || existing.createdAt;
        const currentDate = sub.submittedAt || sub.createdAt;
        if (currentDate && existingDate && new Date(currentDate) > new Date(existingDate)) {
          map.set(key, sub);
        } else if (currentDate && !existingDate) {
          map.set(key, sub);
        } else if (!currentDate && existingDate) {
          // Keep existing
        } else if (sub.id && existing.id && sub.id > existing.id) {
          map.set(key, sub);
        }
      }
    });
    
    return map;
  }, [filteredSubmissions]);

  // Create a map from submission ID to index in filteredSubmissions for query lookup
  const submissionIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    filteredSubmissions.forEach((sub, index) => {
      if (sub.id) {
        map.set(sub.id, index);
      }
    });
    return map;
  }, [filteredSubmissions]);

  // Calculate grades for each submission (only latest for each student-assessment pair)
  const submissionGrades = useMemo(() => {
    const gradeMap = new Map<number, number>();

    if (!classAssessmentsRes?.items || !templatesRes?.items) {
      return gradeMap;
    }

    const assessmentMap = new Map(classAssessmentsRes.items.map(a => [a.id, a]));
    const templateMap = new Map(templatesRes.items.map(t => [t.id, t]));

    // Process all filtered submissions (for display), but only calculate grade for latest ones
    filteredSubmissions.forEach((sub) => {
      if (!sub.classAssessmentId || !sub.id || !sub.studentId) return;

      const assessment = assessmentMap.get(sub.classAssessmentId);
      if (!assessment) return;

      // Determine assessment type
      let assessmentType: 'assignment' | 'lab' | 'practicalExam' = 'assignment';
      if (assessment?.assessmentTemplateId) {
        const template = templateMap.get(assessment.assessmentTemplateId);
        if (template) {
          if (isPracticalExamTemplate(template)) {
            assessmentType = 'practicalExam';
          } else if (isLabTemplate(template)) {
            assessmentType = 'lab';
          }
        }
      }

      // For lab: always calculate (auto-graded available after submission)
      // For assignment/practical exam: only calculate if published
      if (assessmentType !== 'lab' && !assessment.isPublished) {
        return;
      }

      // Only calculate grade for latest submissions (like overview)
      // Check if this is the latest submission for this student-assessment pair
      const key = `${sub.studentId}_${sub.classAssessmentId}`;
      const latestSub = latestSubmissionsMap.get(key);
      if (!latestSub || latestSub.id !== sub.id) {
        // Not the latest submission, skip grade calculation
        return;
      }

      const subIndex = submissionIndexMap.get(sub.id);
      if (subIndex === undefined) return;

      const sessionsQuery = gradingSessionsQueries[subIndex];
      if (!sessionsQuery?.data?.items || sessionsQuery.data.items.length === 0) {
        return;
      }

      const completedSessions = sessionsQuery.data.items.filter((s: any) => s.status === 1);
      if (completedSessions.length === 0) {
        return;
      }

      // Select the appropriate session
      let selectedSession = null;
      
      if (assessmentType === 'lab' && assessment.isPublished) {
        const teacherSession = completedSessions.find(
          (s: any) => s.gradingType === 1 || s.gradingType === 2
        );
        if (teacherSession) {
          selectedSession = teacherSession;
        } else {
          const autoSession = completedSessions.find((s: any) => s.gradingType === 0);
          selectedSession = autoSession || completedSessions.sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
        }
      } else if (assessmentType === 'lab') {
        const autoSession = completedSessions.find((s: any) => s.gradingType === 0);
        selectedSession = autoSession || completedSessions.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      } else {
        const teacherSession = completedSessions.find(
          (s: any) => s.gradingType === 1 || s.gradingType === 2
        );
        selectedSession = teacherSession || completedSessions.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      }

      if (!selectedSession?.id) return;

      // Calculate grade from grade items
      const gradeItems = gradeItemsBySessionId.get(selectedSession.id);
      let calculatedGrade = 0;

      if (gradeItems && gradeItems.length > 0) {
        // Calculate grade from grade items (totalScore / maxScore * 10)
        const totalScore = gradeItems.reduce((sum: number, item: any) => sum + (item.score || 0), 0);
        const maxScore = gradeItems.reduce(
          (sum: number, item: any) => sum + (item.rubricItemMaxScore || 0),
          0
        );
        if (maxScore > 0) {
          calculatedGrade = (totalScore / maxScore) * 10;
          calculatedGrade = Math.round(calculatedGrade * 100) / 100;
        } else if (totalScore > 0) {
          calculatedGrade = totalScore / 10;
        }
      } else if (selectedSession.grade !== undefined && selectedSession.grade !== null) {
        // Fallback to session grade if no grade items
        calculatedGrade = selectedSession.grade;
      }

      if (calculatedGrade > 0) {
        gradeMap.set(sub.id, calculatedGrade);
      }
    });

    return gradeMap;
  }, [filteredSubmissions, classAssessmentsRes, templatesRes, gradingSessionsQueries, gradeItemsBySessionId, latestSubmissionsMap, submissionIndexMap]);

  // Calculate statistics for submissions (only count latest submissions with grade > 0, like overview)
  const submissionStats = useMemo(() => {
    // Only count latest submissions that have been graded (grade > 0)
    const gradedLatestSubmissions = Array.from(latestSubmissionsMap.values()).filter((sub) => {
      const grade = submissionGrades.get(sub.id);
      return grade !== undefined && grade !== null && grade > 0;
    });

    const gradedCount = gradedLatestSubmissions.length;

    return {
      total: gradedCount,
      graded: gradedCount,
      notGraded: 0,
    };
  }, [latestSubmissionsMap, submissionGrades]);

  const submissionsByTypeData = useMemo(() => {
    const data: Record<string, number> = {
      "Assignment": 0,
      "Lab": 0,
      "Practical Exam": 0,
    };

    if (!classAssessmentsRes?.items || !templatesRes?.items) {
      return Object.entries(data).map(([name, value]) => ({ name, value }));
    }

    // Create maps for quick lookup
    const assessmentMap = new Map(classAssessmentsRes.items.map(a => [a.id, a]));
    const templateMap = new Map(templatesRes.items.map(t => [t.id, t]));

    filteredSubmissions.forEach((sub) => {
      if (!sub.classAssessmentId) return;
      
      const assessment = assessmentMap.get(sub.classAssessmentId);
      if (!assessment?.assessmentTemplateId) return;

      const template = templateMap.get(assessment.assessmentTemplateId);
      if (!template) return;

      // Determine type based on template using utility functions
      if (isPracticalExamTemplate(template)) {
        data["Practical Exam"]++;
      } else if (isLabTemplate(template)) {
        data["Lab"]++;
      } else {
        // Assignment (default)
        data["Assignment"]++;
      }
    });

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filteredSubmissions, classAssessmentsRes, templatesRes]);

  const columns = useMemo(() => {
    if (!classAssessmentsRes?.items) return [];

    const assessmentMap = new Map(classAssessmentsRes.items.map(a => [a.id, a]));

    return [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        width: 80,
      },
      {
        title: "Student",
        key: "student",
        render: (_: any, record: any) => (
          <Space>
            <span>{record.studentName} ({record.studentCode})</span>
          </Space>
        ),
      },
      {
        title: "Course",
        key: "course",
        render: (_: any, record: any) => {
          const assessment = assessmentMap.get(record.classAssessmentId);
          return assessment?.courseName || "N/A";
        },
      },
      {
        title: "Class",
        key: "class",
        render: (_: any, record: any) => {
          const assessment = assessmentMap.get(record.classAssessmentId);
          return assessment?.classCode || "N/A";
        },
      },
      {
        title: "Semester",
        key: "semester",
        render: (_: any, record: any) => {
          const assessment = assessmentMap.get(record.classAssessmentId);
          if (!assessment) return "N/A";
          const classData = classes.find(c => c.id === assessment.classId);
          return classData?.semesterName || "N/A";
        },
      },
      {
        title: "Type",
        key: "type",
        render: (_: any, record: any) => {
          const assessment = assessmentMap.get(record.classAssessmentId);
          if (!assessment?.assessmentTemplateId || !templatesRes?.items) return "N/A";
          
          const template = templatesRes.items.find(t => t.id === assessment.assessmentTemplateId);
          if (!template) return "N/A";

          if (isPracticalExamTemplate(template)) {
            return <Tag color="purple">Practical Exam</Tag>;
          } else if (isLabTemplate(template)) {
            return <Tag color="green">Lab</Tag>;
          } else {
            return <Tag color="blue">Assignment</Tag>;
          }
        },
      },
      {
        title: "Submitted At",
        dataIndex: "submittedAt",
        key: "submittedAt",
        render: (date: string) => date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "Not submitted",
      },
      {
        title: "Grade",
        key: "grade",
        render: (_: any, record: any) => {
          // First try to get calculated grade from submissionGrades
          const calculatedGrade = submissionGrades.get(record.id);
          if (calculatedGrade !== undefined && calculatedGrade !== null) {
            if (calculatedGrade > 0) {
              return (
                <Tag color="green">
                  {calculatedGrade.toFixed(2)}
                </Tag>
              );
            }
            // If calculatedGrade is 0, still show "Not graded"
          }
          
          // Fallback: try to get from lastGrade if available (for submissions that haven't been calculated yet)
          if (record.lastGrade !== undefined && record.lastGrade !== null && record.lastGrade > 0) {
            return (
              <Tag color="green">
                {record.lastGrade.toFixed(2)}
              </Tag>
            );
          }
          
          return <Tag color="default">Not graded</Tag>;
        },
      },
      {
        title: "Has File",
        dataIndex: "submissionFile",
        key: "submissionFile",
        render: (file: any) => (
          file ? (
            <Tag color="blue">Yes</Tag>
          ) : (
            <Tag>No</Tag>
          )
        ),
      },
    ];
  }, [classAssessmentsRes, classes, templatesRes]);

  return (
    <>
      <QueryParamsHandler />
      <div className={styles.container}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/admin/dashboard')}
            >
              Back
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              <UploadOutlined /> Submissions Management
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={submissionsLoading}
          >
            Refresh
          </Button>
        </div>

        <Card>
          <Title level={5} style={{ marginBottom: 16 }}>Filters</Title>
          <Space size="large" wrap>
            <Space>
              <span style={{ fontWeight: 500 }}>Course:</span>
              <Select
                placeholder="All Courses"
                allowClear
                style={{ width: 200 }}
                value={selectedCourse}
                onChange={setSelectedCourse}
              >
                {uniqueCourses.map((course) => (
                  <Select.Option key={course} value={course}>
                    {course}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Class:</span>
              <Select
                placeholder="All Classes"
                allowClear
                style={{ width: 200 }}
                value={selectedClass}
                onChange={setSelectedClass}
              >
                {classes.map((cls) => (
                  <Select.Option key={cls.id} value={cls.id}>
                    {cls.classCode} - {cls.courseName}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Semester:</span>
              <Select
                placeholder="All Semesters"
                allowClear
                style={{ width: 200 }}
                value={selectedSemester}
                onChange={setSelectedSemester}
              >
                {semesters.map((sem) => (
                  <Select.Option key={sem.id} value={sem.semesterCode}>
                    {sem.semesterCode}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Submission Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Space>
        </Card>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Total Submissions"
                value={submissionStats.total}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Graded"
                value={submissionStats.graded}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Not Graded"
                value={submissionStats.notGraded}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Submissions by Type" loading={submissionsLoading} style={{ marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={submissionsByTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const { name, percent } = props;
                  return `${name}: ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {submissionsByTypeData.map((entry, index) => {
                  const colors = [COLORS.blue, COLORS.green, COLORS.orange];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title={`All Submissions (${filteredSubmissions.length} of ${submissions.length})`}
          loading={submissionsLoading}
        >
          <Table
            columns={columns}
            dataSource={filteredSubmissions}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} submissions` }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </>
  );
};

export default SubmissionsPage;

