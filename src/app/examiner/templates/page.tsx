"use client";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { queryKeys } from "@/lib/react-query";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Semester, semesterService } from "@/services/semesterService";
import { CloseOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Descriptions,
  Divider,
  Empty,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography
} from "antd";
import { useEffect, useMemo, useState } from "react";
import styles from "./Templates.module.css";
const { Title, Text } = Typography;
const TemplatesPageContent = () => {
  const queryClient = useQueryClient();
  const [selectedSemesterCode, setSelectedSemesterCode] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { message } = App.useApp();
  const { data: allSemesters = [] } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const { data: assignRequestResponse } = useQuery({
    queryKey: queryKeys.assignRequests.lists(),
    queryFn: () => assignRequestService.getAssignRequests({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const approvedAssignRequestIds = useMemo(() => {
    const ids = new Set<number>();
    if (assignRequestResponse?.items) {
      const approvedAssignRequests = assignRequestResponse.items.filter(ar => ar.status === 5);
      approvedAssignRequests.forEach(ar => {
        if (ar.id) {
          ids.add(ar.id);
        }
      });
    }
    return ids;
  }, [assignRequestResponse]);
  const { data: templatesResponse, isLoading: loadingTemplates, error: templatesError } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const { data: allCourseElementsRes = [] } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const allCourseElementsMap = useMemo(() => {
    const map = new Map<number, CourseElement>();
    allCourseElementsRes.forEach(ce => {
      map.set(ce.id, ce);
    });
    return map;
  }, [allCourseElementsRes]);
  const allTemplates = useMemo(() => {
    if (!templatesResponse?.items) return [];
    const peTemplates = templatesResponse.items.filter(template => {
      const courseElement = allCourseElementsMap.get(template.courseElementId);
      if (courseElement?.elementType !== 2) return false;
      if (!template.assignRequestId || !approvedAssignRequestIds.has(template.assignRequestId)) {
        return false;
      }
      return true;
    });
    return peTemplates;
  }, [templatesResponse, allCourseElementsMap, approvedAssignRequestIds]);
  const semesters = useMemo(() => {
    const now = new Date();
    const semesterCodesWithTemplates = new Set<string>();
    allTemplates.forEach(template => {
      const courseElement = allCourseElementsMap.get(template.courseElementId);
      if (courseElement?.semesterCourse?.semester?.semesterCode) {
        semesterCodesWithTemplates.add(courseElement.semesterCourse.semester.semesterCode);
      }
    });
    const filtered = allSemesters.filter((s: Semester) => {
      if (!semesterCodesWithTemplates.has(s.semesterCode)) {
        return false;
      }
      const startDate = new Date(s.startDate.endsWith("Z") ? s.startDate : s.startDate + "Z");
      return startDate <= now;
    });
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startDate.endsWith("Z") ? a.startDate : a.startDate + "Z").getTime();
      const dateB = new Date(b.startDate.endsWith("Z") ? b.startDate : b.startDate + "Z").getTime();
      return dateB - dateA;
    });
  }, [allSemesters, allTemplates, allCourseElementsMap]);
  const { data: semesterDetail, isLoading: loadingCourses } = useQuery({
    queryKey: ['semesterPlanDetail', selectedSemesterCode],
    queryFn: () => semesterService.getSemesterPlanDetail(selectedSemesterCode!),
    enabled: !!selectedSemesterCode,
  });
  const courses = useMemo(() => {
    if (!semesterDetail?.semesterCourses) return [];
    const courseIdsWithTemplates = new Set<number>();
    allTemplates.forEach(template => {
      const courseElement = allCourseElementsMap.get(template.courseElementId);
      if (courseElement?.semesterCourse?.courseId) {
        courseIdsWithTemplates.add(courseElement.semesterCourse.courseId);
      }
    });
    return semesterDetail.semesterCourses.filter(sc =>
      courseIdsWithTemplates.has(sc.course.id)
    );
  }, [semesterDetail, allTemplates, allCourseElementsMap]);
  const courseMap = useMemo(() => {
    const map = new Map<number, { id: number; code: string; name: string }>();
    if (semesterDetail?.semesterCourses) {
      semesterDetail.semesterCourses.forEach(sc => {
        map.set(sc.course.id, sc.course);
      });
    }
    return map;
  }, [semesterDetail]);
  const { data: courseElementsRes = [], isLoading: loadingCourseElements } = useQuery({
    queryKey: ['courseElements', 'bySemester', selectedSemesterCode],
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
      semesterCode: selectedSemesterCode!,
    }),
    enabled: !!selectedSemesterCode,
  });
  const courseElements = useMemo(() => {
    const courseElementIdsWithTemplates = new Set(
      allTemplates.map(t => t.courseElementId)
    );
    let filtered = courseElementsRes.filter(ce =>
      courseElementIdsWithTemplates.has(ce.id)
    );
    if (selectedCourseId) {
      filtered = filtered.filter(ce => ce.semesterCourse?.courseId === selectedCourseId);
    }
    const uniqueElements = new Map<string, CourseElement>();
    filtered.forEach(ce => {
      const name = ce.name || '';
      if (!uniqueElements.has(name)) {
        uniqueElements.set(name, ce);
      }
    });
    return Array.from(uniqueElements.values());
  }, [courseElementsRes, selectedCourseId, allTemplates]);
  const filteredTemplates = useMemo(() => {
    let filtered = [...allTemplates];
    if (selectedSemesterCode) {
      filtered = filtered.filter(template => {
        const courseElement = allCourseElementsMap.get(template.courseElementId);
        return courseElement?.semesterCourse?.semester?.semesterCode === selectedSemesterCode;
      });
    }
    if (selectedCourseId) {
      filtered = filtered.filter(template => {
        const courseElement = allCourseElementsMap.get(template.courseElementId);
        return courseElement?.semesterCourse?.courseId === selectedCourseId;
      });
    }
    return filtered;
  }, [allTemplates, selectedSemesterCode, selectedCourseId, allCourseElementsMap]);
  useEffect(() => {
    if (allSemesters.length > 0 && semesters.length > 0 && selectedSemesterCode === null) {
      const now = new Date();
      const currentSemester = allSemesters.find((sem: Semester) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
        return now >= startDate && now <= endDate;
      });
      if (currentSemester && semesters.some((s: Semester) => s.semesterCode === currentSemester.semesterCode)) {
        setSelectedSemesterCode(currentSemester.semesterCode);
      } else {
        const latestSemester = [...semesters].sort((a: Semester, b: Semester) => {
          const dateA = new Date(a.startDate.endsWith("Z") ? a.startDate : a.startDate + "Z").getTime();
          const dateB = new Date(b.startDate.endsWith("Z") ? b.startDate : b.startDate + "Z").getTime();
          return dateB - dateA;
        })[0];
        if (latestSemester) {
          setSelectedSemesterCode(latestSemester.semesterCode);
        }
      }
    }
  }, [allSemesters, semesters, selectedSemesterCode]);
  useEffect(() => {
    if (!selectedSemesterCode) {
      setSelectedCourseId(null);
    }
  }, [selectedSemesterCode]);
  const loading = loadingTemplates && !templatesResponse;
  const error = templatesError ? (templatesError as any).message || "Failed to load data." : null;
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }
  const handleSemesterChange = (value: string | null) => {
    setSelectedSemesterCode(value);
    setSelectedCourseId(null);
  };
  const handleCourseChange = (value: number | null) => {
    setSelectedCourseId(value);
  };
  const handleViewTemplate = (template: AssessmentTemplate) => {
    setSelectedTemplate(template);
    setIsViewModalOpen(true);
  };
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedTemplate(null);
  };
  const columns: TableProps<AssessmentTemplate>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Template Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Course",
      key: "course",
      width: 300,
      render: (_, record) => {
        const courseElement = allCourseElementsMap.get(record.courseElementId);
        const courseId = courseElement?.semesterCourse?.courseId;
        if (courseId) {
          const course = courseMap.get(courseId);
          if (course) {
            return <Text>{course.code} - {course.name}</Text>;
          }
        }
        const course = (courseElement?.semesterCourse as any)?.course;
        if (course) {
          return <Text>{course.code} - {course.name}</Text>;
        }
        return <Text type="secondary">N/A</Text>;
      },
    },
    {
      title: "Course Element",
      dataIndex: "courseElementName",
      key: "courseElementName",
      width: 200,
    },
    {
      title: "Lecturer",
      key: "lecturer",
      width: 200,
      render: (_, record) => (
        <Text>{record.lecturerName} ({record.lecturerCode})</Text>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      fixed: "right" as const,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewTemplate(record)}
        >
          View
        </Button>
      ),
    },
  ];
  return (
    <>
      <QueryParamsHandler />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <Title
              level={2}
              style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}
            >
              Practical Exam Templates
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              View and filter all practical exam assessment templates
            </Text>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }) });
              }}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
              />
            )}
            <Space size="middle">
              <Space direction="vertical" size="small">
                <Text strong>Semester</Text>
                <Select
                  style={{ width: 300 }}
                  placeholder="Select semester"
                  allowClear
                  showSearch
                  value={selectedSemesterCode}
                  onChange={handleSemesterChange}
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={semesters.map((s) => ({
                    label: `${s.semesterCode} (${s.academicYear})`,
                    value: s.semesterCode,
                  }))}
                />
              </Space>
              <Space direction="vertical" size="small">
                <Text strong>Course</Text>
                <Select
                  style={{ width: 300 }}
                  placeholder="Select course"
                  allowClear
                  showSearch
                  loading={loadingCourses}
                  disabled={!selectedSemesterCode}
                  value={selectedCourseId}
                  onChange={handleCourseChange}
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={courses.map((sc) => ({
                    label: `${sc.course.code} - ${sc.course.name}`,
                    value: sc.course.id,
                  }))}
                />
              </Space>
            </Space>
            <Card>
              <Spin spinning={loading}>
                {filteredTemplates.length === 0 ? (
                  <Empty
                    description="No templates found"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <Table
                    columns={columns}
                    dataSource={filteredTemplates}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `Total ${total} templates`,
                    }}
                    scroll={{ x: 1200 }}
                  />
                )}
              </Spin>
            </Card>
          </Space>
        </Card>
        {selectedTemplate && (
          <TemplateDetailModal
            open={isViewModalOpen}
            onClose={handleCloseViewModal}
            template={selectedTemplate}
          />
        )}
      </div>
    </>
  );
};
function TemplateDetailModal({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: AssessmentTemplate;
}) {
  const { message } = App.useApp();
  const { data: filesData, isLoading: loadingFiles } = useQuery({
    queryKey: queryKeys.assessmentFiles.byTemplateId(template.id),
    queryFn: () => assessmentFileService.getFilesForTemplate({
      assessmentTemplateId: template.id,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: open && !!template.id,
  });
  const files = filesData?.items || [];
  const { data: papersData, isLoading: loadingPapers } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(template.id),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: template.id,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: open && !!template.id,
  });
  const papers = papersData?.items || [];
  const questionsQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: open && !!template.id && papers.length > 0,
    })),
  });
  const questions = useMemo(() => {
    const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
    papers.forEach((paper, index) => {
      if (questionsQueries[index]?.data?.items) {
        const sortedQuestions = [...questionsQueries[index].data.items].sort(
          (a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        questionsMap[paper.id] = sortedQuestions;
      }
    });
    return questionsMap;
  }, [papers, questionsQueries]);
  const allQuestionIds = useMemo(() => {
    const ids: number[] = [];
    Object.values(questions).forEach((paperQuestions) => {
      paperQuestions.forEach((q) => ids.push(q.id));
    });
    return ids;
  }, [questions]);
  const rubricsQueries = useQueries({
    queries: allQuestionIds.map((questionId) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(questionId),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: questionId,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: open && !!template.id && allQuestionIds.length > 0,
    })),
  });
  const rubrics = useMemo(() => {
    const rubricsMap: { [questionId: number]: RubricItem[] } = {};
    allQuestionIds.forEach((questionId, index) => {
      if (rubricsQueries[index]?.data?.items) {
        rubricsMap[questionId] = rubricsQueries[index].data.items;
      }
    });
    return rubricsMap;
  }, [allQuestionIds, rubricsQueries]);
  const loading = loadingFiles || loadingPapers ||
    questionsQueries.some(q => q.isLoading) ||
    rubricsQueries.some(q => q.isLoading);
  const getTypeText = (type: number) => {
    const typeMap: Record<number, string> = {
      0: "Assignment",
      1: "API",
      2: "Code",
    };
    return typeMap[type] || "Unknown";
  };
  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0 }}>
          Template Details
        </Title>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={1000}
      closeIcon={<CloseOutlined />}
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Template Name">
              <Text strong style={{ fontSize: "16px" }}>{template.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Course Element">
              {template.courseElementName}
            </Descriptions.Item>
            <Descriptions.Item label="Lecturer">
              {template.lecturerName} ({template.lecturerCode})
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {template.description || "No description"}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(template.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Descriptions.Item>
          </Descriptions>
          {files.length > 0 && (
            <Card title="Files" size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                {files.map((file) => (
                  <div key={file.id}>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {file.name}
                    </a>
                  </div>
                ))}
              </Space>
            </Card>
          )}
          {papers.length > 0 ? (
            <Card title="Papers & Questions" size="small">
              <Collapse>
                {papers.map((paper) => (
                  <Collapse.Panel
                    key={paper.id}
                    header={
                      <Text strong>
                        {paper.name || `Paper ${paper.id}`}
                        {paper.description && (
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            - {paper.description}
                          </Text>
                        )}
                      </Text>
                    }
                  >
                    {questions[paper.id] && questions[paper.id].length > 0 ? (
                      <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        {questions[paper.id].map((question) => (
                          <Card
                            key={question.id}
                            size="small"
                            title={
                              <Text strong>
                                Question {question.questionNumber || question.id}
                                {question.score && (
                                  <Text type="secondary" style={{ marginLeft: 8 }}>
                                    ({question.score} points)
                                  </Text>
                                )}
                              </Text>
                            }
                          >
                            <Text>{question.questionText}</Text>
                            {question.questionSampleInput && (
                              <div style={{ marginTop: 8 }}>
                                <Text strong>Sample Input:</Text>
                                <pre style={{ marginTop: 4, padding: 8, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
                                  {question.questionSampleInput}
                                </pre>
                              </div>
                            )}
                            {question.questionSampleOutput && (
                              <div style={{ marginTop: 8 }}>
                                <Text strong>Sample Output:</Text>
                                <pre style={{ marginTop: 4, padding: 8, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
                                  {question.questionSampleOutput}
                                </pre>
                              </div>
                            )}
                            {rubrics[question.id] && rubrics[question.id].length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <Divider />
                                <Text strong>Rubrics:</Text>
                                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                                  {rubrics[question.id].map((rubric) => (
                                    <li key={rubric.id}>
                                      <Text>
                                        {rubric.description} ({rubric.score} points)
                                      </Text>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Card>
                        ))}
                      </Space>
                    ) : (
                      <Text type="secondary">No questions found for this paper.</Text>
                    )}
                  </Collapse.Panel>
                ))}
              </Collapse>
            </Card>
          ) : (
            <Card title="Papers & Questions" size="small">
              <Text type="secondary">No papers found for this template.</Text>
            </Card>
          )}
        </Space>
      </Spin>
    </Modal>
  );
}
export default function TemplatesPage() {
  return <TemplatesPageContent />;
}