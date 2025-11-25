"use client";

import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { ROLES } from "@/lib/constants";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import {
  Semester,
  SemesterPlanDetail,
  semesterService
} from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  EyeOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Collapse,
  Divider,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./MySubmissions.module.css";

const { Title, Text } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

const getStatusTag = (status: number) => {
  switch (status) {
    case 0:
      return <Tag color="default">Not graded</Tag>;
    case 1:
      return <Tag color="processing">Grading</Tag>;
    case 2:
      return <Tag color="success">Graded</Tag>;
    default:
      return <Tag>Unknown</Tag>;
  }
};

interface EnrichedSubmission extends Submission {
  courseName?: string;
  semesterCode?: string;
  semesterEndDate?: string;
  gradingGroup?: GradingGroup;
}

const MySubmissionsPageContent = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingGroups, setGradingGroups] = useState<GradingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [selectedGradingGroup, setSelectedGradingGroup] = useState<GradingGroup | null>(null);
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  const { user, isLoading: authLoading } = useAuth();
  const { studentId, isLoading: studentLoading } = useStudent();

  const [semesters, setSemesters] = useState<SemesterPlanDetail[]>([]);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [classAssessments, setClassAssessments] = useState<Map<number, ClassAssessment>>(new Map());
  const [classes, setClasses] = useState<Map<number, ClassInfo>>(new Map());
  const [gradingGroupToSemesterMap, setGradingGroupToSemesterMap] = useState<Map<number, string>>(new Map());

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(
    undefined
  );
  const [selectedGradingGroupId, setSelectedGradingGroupId] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (authLoading || studentLoading) return;
    if (!user || user.role !== ROLES.STUDENT) {
      setError("Bạn không có quyền truy cập trang này.");
      setLoading(false);
      return;
    }
    if (!studentId) {
      setError("Không tìm thấy thông tin sinh viên cho tài khoản này.");
      setLoading(false);
      return;
    }
  }, [user, authLoading, studentId, studentLoading]);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch all submissions for this student
        const allSubmissions = await submissionService.getSubmissionList({});
        const studentSubmissions = allSubmissions.filter(
          (sub) => sub.studentId === studentId
        );
        setSubmissions(studentSubmissions);

        // Get unique gradingGroupIds from student submissions
        const gradingGroupIds = Array.from(
          new Set(
            studentSubmissions
              .filter((s) => s.gradingGroupId !== undefined)
              .map((s) => Number(s.gradingGroupId))
          )
        );

        // Fetch grading groups
        const groups: GradingGroup[] = [];
        for (const groupId of gradingGroupIds) {
          try {
            const group = await gradingGroupService.getGradingGroupById(groupId);
            if (group) {
              groups.push(group);
            }
          } catch (err) {
            console.warn(`Failed to fetch grading group ${groupId}:`, err);
          }
        }
        setGradingGroups(groups);

        // Get unique assessmentTemplateIds from grading groups
        const assessmentTemplateIds = Array.from(
          new Set(
            groups
              .filter((g) => g.assessmentTemplateId !== null && g.assessmentTemplateId !== undefined)
              .map((g) => Number(g.assessmentTemplateId))
          )
        );

        // Fetch assessment templates
        const assessmentTemplateMap = new Map<number, AssessmentTemplate>();
        if (assessmentTemplateIds.length > 0) {
          const allAssessmentTemplatesRes = await assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => ({ items: [] }));

          allAssessmentTemplatesRes.items.forEach((template) => {
            if (assessmentTemplateIds.includes(template.id)) {
              assessmentTemplateMap.set(template.id, template);
            }
          });
        }

        // Get unique courseElementIds from assessment templates
        const courseElementIds = Array.from(
          new Set(Array.from(assessmentTemplateMap.values()).map((t) => t.courseElementId))
        );

        // Fetch course elements
        const courseElementMap = new Map<number, CourseElement>();
        if (courseElementIds.length > 0) {
          const allCourseElementsRes = await courseElementService.getCourseElements({
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => []);

          allCourseElementsRes.forEach((element) => {
            if (courseElementIds.includes(element.id)) {
              courseElementMap.set(element.id, element);
            }
          });
        }

        // Map grading groups to semester codes using assessmentTemplateId
        const groupToSemesterMap = new Map<number, string>();
        groups.forEach((group) => {
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

        // Fetch class assessments for submissions
        const classAssessmentIds = Array.from(
          new Set(studentSubmissions.filter((s) => s.classAssessmentId).map((s) => s.classAssessmentId!))
        );
        
        const classAssessmentMap = new Map<number, ClassAssessment>();
        if (classAssessmentIds.length > 0) {
          const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => ({ items: [] }));
          
          allClassAssessmentsRes.items.forEach((ca) => {
            if (classAssessmentIds.includes(ca.id)) {
              classAssessmentMap.set(ca.id, ca);
            }
          });
        }
        setClassAssessments(classAssessmentMap);

        // Get unique classIds from class assessments
        const classIds = Array.from(new Set(Array.from(classAssessmentMap.values()).map((ca) => ca.classId)));
        
        // Fetch classes
        const classMap = new Map<number, ClassInfo>();
        if (classIds.length > 0) {
          const classPromises = classIds.map((classId) =>
            classService.getClassById(classId.toString()).catch(() => null)
          );
          const classResults = await Promise.all(classPromises);
          classResults.forEach((cls) => {
            if (cls) {
              classMap.set(cls.id, cls);
            }
          });
        }
        setClasses(classMap);

        // Fetch semesters
        const semesterList = await semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 });
        setAllSemesters(semesterList);

        const semesterDetails = await Promise.all(
          semesterList.map((sem) =>
            semesterService.getSemesterPlanDetail(sem.semesterCode)
          )
        );
        setSemesters(semesterDetails);
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [studentId]);

  // Filter grading groups: in the same semester, same assessment template, same lecturer, keep only the latest one
  const filteredGradingGroups = useMemo(() => {
    const groupedMap = new Map<string, GradingGroup>();
    
    gradingGroups.forEach((group) => {
      const semesterCode = gradingGroupToSemesterMap.get(group.id);
      const assessmentTemplateId = group.assessmentTemplateId;
      const lecturerId = group.lecturerId;
      
      // Skip if missing required data
      if (!semesterCode || assessmentTemplateId === null || assessmentTemplateId === undefined) {
        return;
      }
      
      const key = `${semesterCode}_${assessmentTemplateId}_${lecturerId}`;
      const existing = groupedMap.get(key);
      
      if (!existing) {
        groupedMap.set(key, group);
      } else {
        // Compare createdAt - keep the one with the latest date
        const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const currentDate = group.createdAt ? new Date(group.createdAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          groupedMap.set(key, group);
        }
      }
    });
    
    return Array.from(groupedMap.values());
  }, [gradingGroups, gradingGroupToSemesterMap]);

  // Get set of filtered grading group IDs for quick lookup
  const filteredGradingGroupIds = useMemo(() => {
    return new Set(filteredGradingGroups.map(g => g.id));
  }, [filteredGradingGroups]);

  const enrichedSubmissions: EnrichedSubmission[] = useMemo(() => {
    return submissions
      .filter((sub) => {
        // Only include submissions from filtered grading groups
        return sub.gradingGroupId !== undefined && filteredGradingGroupIds.has(sub.gradingGroupId);
      })
      .map((sub) => {
        // Get semester code from grading group
        const semesterCode = sub.gradingGroupId !== undefined 
          ? gradingGroupToSemesterMap.get(sub.gradingGroupId) 
          : undefined;
        
        // Find semester from SemesterPlanDetail to get end date
        const semesterDetail = semesterCode ? semesters.find((s) => s.semesterCode === semesterCode) : undefined;
        const semesterEndDate = semesterDetail?.endDate;
        
        // Get class assessment for this submission
        const classAssessment = sub.classAssessmentId ? classAssessments.get(sub.classAssessmentId) : undefined;
        
        // Find grading group for this submission
        const gradingGroup = sub.gradingGroupId !== undefined 
          ? filteredGradingGroups.find((g) => g.id === sub.gradingGroupId)
          : undefined;

        return {
          ...sub,
          courseName: classAssessment?.courseName || "N/A",
          semesterCode: semesterCode || undefined,
          semesterEndDate,
          gradingGroup,
        };
      });
  }, [submissions, classAssessments, semesters, filteredGradingGroups, filteredGradingGroupIds, gradingGroupToSemesterMap]);

  const filteredData = useMemo(() => {
    // First, filter by semester, grading group, and search text
    let filtered = enrichedSubmissions.filter((sub) => {
      // Filter by semester - compare semesterCode from grading group
      let semesterMatch = true;
      if (selectedSemester !== undefined) {
        const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
        const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
        semesterMatch = selectedSemesterCode !== undefined && 
                       sub.semesterCode !== undefined && 
                       sub.semesterCode === selectedSemesterCode;
      }

      // Filter by grading group
      let gradingGroupMatch = true;
      if (selectedGradingGroupId !== undefined) {
        gradingGroupMatch = sub.gradingGroupId !== undefined && 
                           sub.gradingGroupId === selectedGradingGroupId;
      }

      // Filter by search text
      const searchMatch =
        sub.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.studentCode.toLowerCase().includes(searchText.toLowerCase()) ||
        (sub.submissionFile?.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());

      return semesterMatch && gradingGroupMatch && searchMatch;
    });

    // Group by (semesterCode, studentId, gradingGroupId) and keep only the latest submission in each group
    const groupedMap = new Map<string, EnrichedSubmission>();
    
    filtered.forEach((sub) => {
      const key = `${sub.semesterCode || 'unknown'}_${sub.studentId}_${sub.gradingGroupId || 'unknown'}`;
      const existing = groupedMap.get(key);
      
      if (!existing) {
        groupedMap.set(key, sub);
      } else {
        // Compare submittedAt - keep the one with the latest date
        const existingDate = existing.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
        const currentDate = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          groupedMap.set(key, sub);
        }
      }
    });

    // Convert map back to array and sort by submittedAt (newest first)
    const result = Array.from(groupedMap.values());
    result.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

    return result;
  }, [
    enrichedSubmissions,
    searchText,
    selectedSemester,
    selectedGradingGroupId,
    semesters,
  ]);

  const handleViewDetail = (submission: EnrichedSubmission) => {
    localStorage.setItem("selectedSubmissionId", submission.id.toString());
    router.push(`/student/assignment-grading`);
  };

  const handleViewExam = (gradingGroup: GradingGroup) => {
    setSelectedGradingGroup(gradingGroup);
    setViewExamModalVisible(true);
  };

  const columns: ColumnsType<EnrichedSubmission> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => a.id - b.id,
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Submission File",
      dataIndex: "submissionFile",
      key: "fileSubmit",
      render: (file: Submission["submissionFile"]) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          <span>{file?.name || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    },
    {
      title: "Grade",
      dataIndex: "lastGrade",
      key: "lastGrade",
      render: (grade: number) => (
        <span style={{ fontWeight: 600, color: grade > 0 ? "#52c41a" : "#999" }}>
          {grade > 0 ? `${grade}/100` : "Not graded"}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => getStatusTag(status),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: EnrichedSubmission) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{ margin: 0, fontWeight: 700, color: "rgb(47, 50, 125)" }}
        >
          PE - Practical Exams
        </Title>
        <Space>
          {filteredGradingGroups.length > 0 && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleViewExam(filteredGradingGroups[0])}
              size="large"
            >
              View Exam
            </Button>
          )}
        </Space>
      </div>
      <div style={{ marginBottom: 16, marginTop: 16 }}>
        <Space>
          <Select
            allowClear
            value={selectedSemester}
            onChange={(value) => {
              setSelectedSemester(value);
            }}
            style={{ width: 200 }}
            placeholder="Filter by Semester"
            options={semesters.map((s) => ({
              label: s.semesterCode,
              value: Number(s.id),
            }))}
          />
          <Select
            allowClear
            value={selectedGradingGroupId}
            onChange={(value) => {
              setSelectedGradingGroupId(value);
            }}
            style={{ width: 250 }}
            placeholder="Filter by Assessment Template"
            options={filteredGradingGroups.map((g) => ({
              label: g.assessmentTemplateName || `Grading Group ${g.id}`,
              value: g.id,
            }))}
          />
          <Input
            placeholder="Search student or file..."
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Space>
      </div>

      {loading ? (
        <div className={styles.spinner}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className={styles.table}
        />
      )}

      <ViewExamModal
        visible={viewExamModalVisible}
        onClose={() => {
          setViewExamModalVisible(false);
          setSelectedGradingGroup(null);
        }}
        gradingGroup={selectedGradingGroup}
      />
    </div>
  );
};

// View Exam Modal Component
function ViewExamModal({
  visible,
  onClose,
  gradingGroup,
}: {
  visible: boolean;
  onClose: () => void;
  gradingGroup: GradingGroup | null;
}) {
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: any[] }>({});

  useEffect(() => {
    if (visible && gradingGroup?.assessmentTemplateId) {
      fetchExamData();
    }
  }, [visible, gradingGroup]);

  const fetchExamData = async () => {
    if (!gradingGroup?.assessmentTemplateId) return;
    
    setLoading(true);
    try {
      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: gradingGroup.assessmentTemplateId,
        pageNumber: 1,
        pageSize: 100,
      });
      const papersData = papersRes.items;
      setPapers(papersData);

      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      const rubricsMap: { [questionId: number]: any[] } = {};

      for (const paper of papersData) {
        const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
        });
        const questionsData = [...questionsRes.items].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        questionsMap[paper.id] = questionsData;

        for (const question of questionsData) {
          const rubricsRes = await assessmentQuestionService.getAssessmentQuestions({
            assessmentPaperId: paper.id,
            pageNumber: 1,
            pageSize: 100,
          });
          const rubricsData = rubricsRes.items;
          rubricsMap[question.id] = rubricsData;
        }
      }

      setQuestions(questionsMap);
      setRubrics(rubricsMap);
    } catch (err) {
      console.error("Failed to fetch exam data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="View Exam"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
    >
      <Spin spinning={loading}>
        {gradingGroup && (
          <div>
            <Title level={4}>{gradingGroup.assessmentTemplateName || "Exam"}</Title>
            <Text>{gradingGroup.assessmentTemplateDescription || "No description"}</Text>
            <Divider />
            
            {papers.length === 0 ? (
              <Text type="secondary">No papers found.</Text>
            ) : (
              <Collapse>
                {papers.map((paper) => (
                  <Collapse.Panel key={paper.id} header={paper.name || `Paper ${paper.id}`}>
                    <Text>{paper.description || "No description"}</Text>
                    {questions[paper.id] && questions[paper.id].length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        {questions[paper.id].map((question) => (
                          <div key={question.id} style={{ marginBottom: 24 }}>
                            <Title level={5}>Question {question.id}</Title>
                            <Text>{question.questionText}</Text>
                            <Divider />
                          </div>
                        ))}
                      </div>
                    )}
                  </Collapse.Panel>
                ))}
              </Collapse>
            )}
          </div>
        )}
      </Spin>
    </Modal>
  );
}

export default function MySubmissionsPage() {
  return (
    <App>
      <MySubmissionsPageContent />
    </App>
  );
}

