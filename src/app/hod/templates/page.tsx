"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { AssessmentFile, assessmentFileService } from "@/services/assessmentFileService";
import { AssessmentPaper, assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Semester, SemesterCourse, SemesterPlanDetail, semesterService } from "@/services/semesterService";
import { CloseOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Empty,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import styles from "./Templates.module.css";

const { Title, Text } = Typography;

// Helper function to check if an assessment template is a PE (Practical Exam)
function isPracticalExamTemplate(template: AssessmentTemplate): boolean {
  const name = (template.courseElementName || "").toLowerCase();
  const keywords = [
    "exam",
    "pe",
    "practical exam",
    "practical",
    "test",
    "kiểm tra thực hành",
    "thi thực hành",
    "bài thi",
    "bài kiểm tra",
    "thực hành",
  ];
  return keywords.some((keyword) => name.includes(keyword));
}

const TemplatesPageContent = () => {
  const [allTemplates, setAllTemplates] = useState<AssessmentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<AssessmentTemplate[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<SemesterCourse[]>([]);
  const [courseElements, setCourseElements] = useState<CourseElement[]>([]);
  const [allCourseElementsMap, setAllCourseElementsMap] = useState<Map<number, CourseElement>>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSemesterCode, setSelectedSemesterCode] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedCourseElementId, setSelectedCourseElementId] = useState<number | null>(null);

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingCourseElements, setLoadingCourseElements] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const { message } = App.useApp();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch semesters
      const semesterList = await semesterService.getSemesters({
        pageNumber: 1,
        pageSize: 1000,
      });
      setSemesters(semesterList);

      // Fetch all assessment templates
      const response = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      
      // Filter only PE (Practical Exam) templates
      const peTemplates = response.items.filter(isPracticalExamTemplate);
      setAllTemplates(peTemplates);
      setFilteredTemplates(peTemplates);

      // Fetch all course elements for filtering and create a map
      const allCourseElementsRes = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      });
      const courseElementMap = new Map<number, CourseElement>();
      allCourseElementsRes.forEach(ce => {
        courseElementMap.set(ce.id, ce);
      });
      setAllCourseElementsMap(courseElementMap);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "Failed to load data.");
      message.error(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchCourses = useCallback(async (semesterCode: string) => {
    setLoadingCourses(true);
    try {
      const semesterDetail: SemesterPlanDetail = await semesterService.getSemesterPlanDetail(semesterCode);
      setCourses(semesterDetail.semesterCourses || []);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const fetchCourseElements = useCallback(async (semesterCode: string, courseId?: number) => {
    setLoadingCourseElements(true);
    try {
      const courseElementsRes = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
        semesterCode: semesterCode,
      });
      
      let filtered = courseElementsRes;
      if (courseId) {
        filtered = courseElementsRes.filter(ce => ce.semesterCourse?.courseId === courseId);
      }
      
      setCourseElements(filtered);
    } catch (err) {
      console.error("Failed to fetch course elements:", err);
      setCourseElements([]);
    } finally {
      setLoadingCourseElements(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSemesterCode) {
      fetchCourses(selectedSemesterCode);
      fetchCourseElements(selectedSemesterCode, selectedCourseId || undefined);
    } else {
      setCourses([]);
      setCourseElements([]);
      setSelectedCourseId(null);
      setSelectedCourseElementId(null);
    }
  }, [selectedSemesterCode, fetchCourses, fetchCourseElements]);

  useEffect(() => {
    if (selectedSemesterCode) {
      fetchCourseElements(selectedSemesterCode, selectedCourseId || undefined);
    }
    setSelectedCourseElementId(null);
  }, [selectedCourseId, selectedSemesterCode, fetchCourseElements]);

  // Filter templates based on selected filters
  useEffect(() => {
    let filtered = [...allTemplates];

    if (selectedSemesterCode) {
      // Filter by semester through courseElement
      // Get course elements from the selected semester's courses
      const semesterCourseElementIds = Array.from(allCourseElementsMap.values())
        .filter(ce => {
          const semesterCode = ce.semesterCourse?.semester?.semesterCode;
          return semesterCode === selectedSemesterCode;
        })
        .map(ce => ce.id);
      
      filtered = filtered.filter(template => 
        semesterCourseElementIds.includes(template.courseElementId)
      );
    }

    if (selectedCourseId) {
      // Filter by course through courseElement
      const courseElementIds = Array.from(allCourseElementsMap.values())
        .filter(ce => ce.semesterCourse?.courseId === selectedCourseId)
        .map(ce => ce.id);
      
      filtered = filtered.filter(template => 
        courseElementIds.includes(template.courseElementId)
      );
    }

    if (selectedCourseElementId) {
      // Filter by course element
      filtered = filtered.filter(template => 
        template.courseElementId === selectedCourseElementId
      );
    }

    setFilteredTemplates(filtered);
  }, [allTemplates, selectedSemesterCode, selectedCourseId, selectedCourseElementId, allCourseElementsMap]);

  const handleSemesterChange = (value: string | null) => {
    setSelectedSemesterCode(value);
    setSelectedCourseId(null);
    setSelectedCourseElementId(null);
  };

  const handleCourseChange = (value: number | null) => {
    setSelectedCourseId(value);
    setSelectedCourseElementId(null);
  };

  const handleCourseElementChange = (value: number | null) => {
    setSelectedCourseElementId(value);
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
      title: "Description",
      dataIndex: "description",
      key: "description",
      width: 250,
      ellipsis: true,
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
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => {
        const d = new Date(date);
        return d.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
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
              onClick={fetchData}
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
              onClose={() => setError(null)}
            />
          )}

          <Card title="Filters" size="small">
            <Row gutter={16}>
              <Col xs={24} sm={8} md={8}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>Semester</Text>
                  <Select
                    style={{ width: "100%" }}
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
              </Col>
              <Col xs={24} sm={8} md={8}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>Course</Text>
                  <Select
                    style={{ width: "100%" }}
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
              </Col>
              <Col xs={24} sm={8} md={8}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>Course Element</Text>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select course element"
                    allowClear
                    showSearch
                    loading={loadingCourseElements}
                    disabled={!selectedSemesterCode}
                    value={selectedCourseElementId}
                    onChange={handleCourseElementChange}
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={courseElements.map((ce) => ({
                      label: ce.name,
                      value: ce.id,
                    }))}
                  />
                </Space>
              </Col>
            </Row>
          </Card>

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

// Template Detail Modal Component
function TemplateDetailModal({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: AssessmentTemplate;
}) {
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<AssessmentPaper[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});
  const [files, setFiles] = useState<AssessmentFile[]>([]);
  const { message } = App.useApp();

  useEffect(() => {
    if (open && template) {
      fetchTemplateData();
    }
  }, [open, template]);

  const fetchTemplateData = async () => {
    try {
      setLoading(true);

      // Fetch files
      try {
        const filesRes = await assessmentFileService.getFilesForTemplate({
          assessmentTemplateId: template.id,
          pageNumber: 1,
          pageSize: 100,
        });
        setFiles(filesRes.items);
      } catch (err) {
        console.error("Failed to fetch files:", err);
        setFiles([]);
      }

      // Fetch papers
      let papersData: AssessmentPaper[] = [];
      try {
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: template.id,
          pageNumber: 1,
          pageSize: 100,
        });
        papersData = papersRes.items || [];
      } catch (err) {
        console.error("Failed to fetch papers:", err);
        papersData = [];
      }
      setPapers(papersData);

      // Fetch questions for each paper
      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      const rubricsMap: { [questionId: number]: RubricItem[] } = {};

      for (const paper of papersData) {
        try {
          const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
            assessmentPaperId: paper.id,
            pageNumber: 1,
            pageSize: 100,
          });
          const sortedQuestions = [...questionsRes.items].sort(
            (a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)
          );
          questionsMap[paper.id] = sortedQuestions;

          // Fetch rubrics for each question
          for (const question of sortedQuestions) {
            try {
              const rubricsRes = await rubricItemService.getRubricsForQuestion({
                assessmentQuestionId: question.id,
                pageNumber: 1,
                pageSize: 100,
              });
              rubricsMap[question.id] = rubricsRes.items || [];
            } catch (err) {
              console.error(`Failed to fetch rubrics for question ${question.id}:`, err);
              rubricsMap[question.id] = [];
            }
          }
        } catch (err) {
          console.error(`Failed to fetch questions for paper ${paper.id}:`, err);
          questionsMap[paper.id] = [];
        }
      }

      setQuestions(questionsMap);
      setRubrics(rubricsMap);
    } catch (err: any) {
      console.error("Failed to fetch template data:", err);
      message.error("Failed to load template details");
    } finally {
      setLoading(false);
    }
  };

  const getTypeText = (type: number) => {
    const typeMap: Record<number, string> = {
      0: "Assignment",
      1: "API",
      2: "Code",
    };
    return typeMap[type] || "Unknown";
  };

  const getStatusText = (status: number | undefined) => {
    if (status === undefined) return "N/A";
    const statusMap: Record<number, string> = {
      1: "PENDING",
      2: "ACCEPTED",
      3: "REJECTED",
      4: "IN_PROGRESS",
      5: "COMPLETED",
    };
    return statusMap[status] || "UNKNOWN";
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
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Template Name">
              <Text strong>{template.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Course Element">
              {template.courseElementName}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {template.description || "No description"}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">{getTypeText(template.templateType)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color="green">{getStatusText(template.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Lecturer">
              {template.lecturerName} ({template.lecturerCode})
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

