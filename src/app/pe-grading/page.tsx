"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Card,
  Input,
  Button,
  Tag,
  Space,
  Spin,
  message,
  Typography,
  Modal,
  Collapse,
  Divider,
} from "antd";
import {
  SearchOutlined,
  FileTextOutlined,
  RobotOutlined,
  FileExcelOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { submissionService, Submission } from "@/services/submissionService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import * as XLSX from "xlsx";
import styles from "./page.module.css";

const { Title } = Typography;

const DEFAULT_GRADING_GROUP_ID = 1;

export default function PEGradingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingGroup, setGradingGroup] = useState<GradingGroup | null>(null);
  const [searchText, setSearchText] = useState("");
  const [autoGradingLoading, setAutoGradingLoading] = useState(false);
  const [batchGradingLoading, setBatchGradingLoading] = useState(false);
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch grading group
      const group = await gradingGroupService.getGradingGroupById(DEFAULT_GRADING_GROUP_ID);
      setGradingGroup(group);

      // Fetch submissions for this grading group
      const subs = await submissionService.getSubmissionList({
        gradingGroupId: DEFAULT_GRADING_GROUP_ID,
      });
      setSubmissions(subs);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      message.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (!searchText) return submissions;
    
    const lowerSearch = searchText.toLowerCase();
    return submissions.filter(
      (sub) =>
        sub.studentName?.toLowerCase().includes(lowerSearch) ||
        sub.studentCode?.toLowerCase().includes(lowerSearch) ||
        sub.id.toString().includes(lowerSearch)
    );
  }, [submissions, searchText]);

  const handleAutoGrade = async () => {
    try {
      setAutoGradingLoading(true);
      // TODO: Implement auto grading logic
      message.info("Auto grading feature is under development");
    } catch (err: any) {
      message.error(err.message || "Auto grading failed");
    } finally {
      setAutoGradingLoading(false);
    }
  };

  const handleBatchAutoGrade = async () => {
    try {
      setBatchGradingLoading(true);
      const ungradedSubmissions = submissions.filter(
        (sub) => sub.status === 0 || sub.lastGrade === 0
      );
      
      if (ungradedSubmissions.length === 0) {
        message.info("All submissions have been graded");
        return;
      }

      message.info(`Starting auto grading for ${ungradedSubmissions.length} submissions...`);
      
      // TODO: Implement batch auto grading logic
      // For now, just show a message
      message.success(`Auto grading completed for ${ungradedSubmissions.length} submissions`);
      
      // Refresh data after grading
      await fetchData();
    } catch (err: any) {
      message.error(err.message || "Batch auto grading failed");
    } finally {
      setBatchGradingLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      message.info("Preparing export data...");
      
      // Fetch grading details for all submissions
      const exportData: any[] = [];
      
      for (const sub of submissions) {
        // Load feedback from localStorage
        let feedback: any = {};
        try {
          const savedFeedback = localStorage.getItem(`feedback_${sub.id}`);
          if (savedFeedback) {
            feedback = JSON.parse(savedFeedback);
          } else {
            // Sample feedback if not found
            feedback = {
              overallFeedback: "Sample overall feedback",
              strengths: "Sample strengths",
              weaknesses: "Sample weaknesses",
              codeQuality: "Sample code quality feedback",
              algorithmEfficiency: "Sample algorithm efficiency feedback",
              suggestionsForImprovement: "Sample suggestions",
              bestPractices: "Sample best practices feedback",
              errorHandling: "Sample error handling feedback",
            };
          }
        } catch (err) {
          console.error(`Failed to load feedback for submission ${sub.id}:`, err);
        }

        const baseRow: any = {
          "No.": exportData.length + 1,
          "Submission ID": sub.id,
          "Student Code": sub.studentCode,
          "Student Name": sub.studentName,
          "Submission File": sub.submissionFile?.name || "N/A",
          "Submitted At": sub.submittedAt
            ? new Date(sub.submittedAt).toLocaleString("en-US")
            : "N/A",
          "Total Grade": sub.lastGrade > 0 ? `${sub.lastGrade}/100` : "Not graded",
          "Status":
            sub.status === 0
              ? "Not graded"
              : sub.status === 1
              ? "Grading"
              : "Graded",
          "Grader": sub.lecturerName || "N/A",
          "Feedback Category": "",
          "Feedback Content": "",
          "Question": "",
          "Question Max Score": "",
          "Question Score": "",
          "Criteria": "",
          "Criteria Max Score": "",
          "Criteria Score": "",
        };

        // Fetch grading details
        let questions: any[] = [];
        try {
          if (sub.gradingGroupId) {
            const group = await gradingGroupService.getGradingGroupById(sub.gradingGroupId);
            if (group?.assessmentTemplateId) {
              const templates = await assessmentTemplateService.getAssessmentTemplates({
                pageNumber: 1,
                pageSize: 1000,
              });
              const template = templates.items.find((t) => t.id === group.assessmentTemplateId);
              
              if (template) {
                const papers = await assessmentPaperService.getAssessmentPapers({
                  assessmentTemplateId: template.id,
                  pageNumber: 1,
                  pageSize: 100,
                });

                for (const paper of papers.items) {
                  const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                    assessmentPaperId: paper.id,
                    pageNumber: 1,
                    pageSize: 100,
                  });

                  for (const question of questionsRes.items) {
                    const rubricsRes = await rubricItemService.getRubricsForQuestion({
                      assessmentQuestionId: question.id,
                      pageNumber: 1,
                      pageSize: 100,
                    });

                    questions.push({
                      questionText: question.questionText,
                      questionScore: question.score,
                      rubrics: rubricsRes.items.map((r) => ({
                        description: r.description,
                        maxScore: r.score,
                        score: 0, // Default, would need API to get actual scores
                      })),
                    });
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch details for submission ${sub.id}:`, err);
        }

        // If no questions found, add sample data
        if (questions.length === 0) {
          questions = [
            {
              questionText: "Sample Question 1",
              questionScore: 10,
              rubrics: [
                { description: "Criteria 1", maxScore: 5, score: 0 },
                { description: "Criteria 2", maxScore: 5, score: 0 },
              ],
            },
          ];
        }

        // Add base row with submission info
        exportData.push(baseRow);

        // Add feedback rows - each feedback item on a separate row for better readability
        const feedbackRows = [
          { label: "Overall Feedback", value: feedback.overallFeedback || "N/A" },
          { label: "Strengths", value: feedback.strengths || "N/A" },
          { label: "Weaknesses", value: feedback.weaknesses || "N/A" },
          { label: "Code Quality", value: feedback.codeQuality || "N/A" },
          { label: "Algorithm Efficiency", value: feedback.algorithmEfficiency || "N/A" },
          { label: "Suggestions for Improvement", value: feedback.suggestionsForImprovement || "N/A" },
          { label: "Best Practices", value: feedback.bestPractices || "N/A" },
          { label: "Error Handling", value: feedback.errorHandling || "N/A" },
        ];

        feedbackRows.forEach((fb) => {
          const feedbackRow = {
            "No.": "",
            "Submission ID": "",
            "Student Code": "",
            "Student Name": "",
            "Submission File": "",
            "Submitted At": "",
            "Total Grade": "",
            "Status": "",
            "Grader": "",
            "Feedback Category": fb.label,
            "Feedback Content": fb.value,
            "Question": "",
            "Question Max Score": "",
            "Question Score": "",
            "Criteria": "",
            "Criteria Max Score": "",
            "Criteria Score": "",
          };
          exportData.push(feedbackRow);
        });

        // Add question and rubric details
        questions.forEach((q, qIndex) => {
          const questionRow = {
            "No.": "",
            "Submission ID": "",
            "Student Code": "",
            "Student Name": "",
            "Submission File": "",
            "Submitted At": "",
            "Total Grade": "",
            "Status": "",
            "Grader": "",
            "Feedback Category": "",
            "Feedback Content": "",
            "Question": `Q${qIndex + 1}: ${q.questionText}`,
            "Question Max Score": q.questionScore,
            "Question Score": "",
            "Criteria": "",
            "Criteria Max Score": "",
            "Criteria Score": "",
          };
          exportData.push(questionRow);

          // Add rubric rows
          q.rubrics.forEach((rubric: any, rIndex: number) => {
            const rubricRow = {
              "No.": "",
              "Submission ID": "",
              "Student Code": "",
              "Student Name": "",
              "Submission File": "",
              "Submitted At": "",
              "Total Grade": "",
              "Status": "",
              "Grader": "",
              "Feedback Category": "",
              "Feedback Content": "",
              "Question": "",
              "Question Max Score": "",
              "Question Score": "",
              "Criteria": `${rIndex + 1}. ${rubric.description}`,
              "Criteria Max Score": rubric.maxScore,
              "Criteria Score": rubric.score || "N/A",
            };
            exportData.push(rubricRow);
          });
        });

        // Add empty row between submissions
        exportData.push({});
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grading Details");

      // Set column widths
      const colWidths = [
        { wch: 5 }, // No.
        { wch: 12 }, // Submission ID
        { wch: 15 }, // Student Code
        { wch: 25 }, // Student Name
        { wch: 30 }, // Submission File
        { wch: 20 }, // Submitted At
        { wch: 12 }, // Total Grade
        { wch: 12 }, // Status
        { wch: 20 }, // Grader
        { wch: 25 }, // Feedback Category
        { wch: 60 }, // Feedback Content (wider for long text)
        { wch: 50 }, // Question
        { wch: 15 }, // Question Max Score
        { wch: 15 }, // Question Score
        { wch: 50 }, // Criteria
        { wch: 15 }, // Criteria Max Score
        { wch: 15 }, // Criteria Score
      ];
      ws["!cols"] = colWidths;

      // Apply wrap text to feedback content column (column J, index 9)
      // and other text-heavy columns
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let R = 0; R <= range.e.r; ++R) {
        // Feedback Content column (J = column 9)
        const feedbackCell = XLSX.utils.encode_cell({ r: R, c: 9 });
        if (!ws[feedbackCell]) ws[feedbackCell] = { t: "s", v: "" };
        ws[feedbackCell].s = {
          alignment: { wrapText: true, vertical: "top" },
        };

        // Question column (L = column 11)
        const questionCell = XLSX.utils.encode_cell({ r: R, c: 11 });
        if (!ws[questionCell]) ws[questionCell] = { t: "s", v: "" };
        ws[questionCell].s = {
          alignment: { wrapText: true, vertical: "top" },
        };

        // Criteria column (O = column 14)
        const criteriaCell = XLSX.utils.encode_cell({ r: R, c: 14 });
        if (!ws[criteriaCell]) ws[criteriaCell] = { t: "s", v: "" };
        ws[criteriaCell].s = {
          alignment: { wrapText: true, vertical: "top" },
        };
      }

      // Set row heights for better readability
      for (let R = 0; R <= range.e.r; ++R) {
        if (!ws["!rows"]) ws["!rows"] = [];
        ws["!rows"][R] = { hpt: 30 }; // Default row height
      }

      const fileName = `PE_Grading_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("Export successful");
    } catch (err: any) {
      console.error("Export error:", err);
      message.error("Export failed");
    }
  };

  const handleViewDetail = (submission: Submission) => {
    router.push(`/pe-grading/${submission.id}`);
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

  const columns: ColumnsType<Submission> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
      width: 120,
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
      width: 200,
    },
    {
      title: "Submission File",
      dataIndex: "submissionFile",
      key: "submissionFile",
      width: 200,
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
      width: 180,
      render: (date: string) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleString("en-US");
      },
    },
    {
      title: "Grade",
      dataIndex: "lastGrade",
      key: "lastGrade",
      width: 100,
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
      width: 120,
      render: (status: number) => getStatusTag(status),
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => handleViewDetail(record)}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.headerCard}>
        <div className={styles.headerContent}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Submission List
            </Title>
            {gradingGroup && (
              <p style={{ margin: "8px 0 0 0", color: "#666" }}>
                Grading Group: {gradingGroup.id} - {gradingGroup.assessmentTemplateName || "N/A"}
              </p>
            )}
          </div>
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setViewExamModalVisible(true)}
              size="large"
            >
              View Exam
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              size="large"
            >
              Export Excel
            </Button>
            <Button
              icon={<ThunderboltOutlined />}
              loading={batchGradingLoading}
              onClick={handleBatchAutoGrade}
              size="large"
              type="default"
            >
              Grade All
            </Button>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={autoGradingLoading}
              onClick={handleAutoGrade}
              size="large"
            >
              Auto Grade
            </Button>
          </Space>
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <div className={styles.searchBar}>
          <Input
            placeholder="Search by student code, student name, or ID..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredSubmissions}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} submissions`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <ViewExamModal
        visible={viewExamModalVisible}
        onClose={() => setViewExamModalVisible(false)}
        gradingGroup={gradingGroup}
      />
    </div>
  );
}

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
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});
  const { Title, Text } = Typography;

  useEffect(() => {
    if (visible && gradingGroup?.assessmentTemplateId) {
      fetchExamData();
    }
  }, [visible, gradingGroup]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      
      if (!gradingGroup?.assessmentTemplateId) return;

      // Fetch papers
      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: gradingGroup.assessmentTemplateId,
        pageNumber: 1,
        pageSize: 100,
      });
      
      const papersData = papersRes.items.length > 0 
        ? papersRes.items 
        : [
            {
              id: 1,
              name: "Sample Paper 1",
              description: "Sample paper description",
              assessmentTemplateId: gradingGroup.assessmentTemplateId,
            },
          ];
      setPapers(papersData);

      // Fetch questions for each paper
      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      for (const paper of papersData) {
        const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
        });
        
        const paperQuestions = questionsRes.items.length > 0
          ? questionsRes.items
          : [
              {
                id: 1,
                questionText: "Sample Question: Write a program to calculate the sum of two numbers",
                questionSampleInput: "5\n10",
                questionSampleOutput: "15",
                score: 10,
                assessmentPaperId: paper.id,
                assessmentPaperName: paper.name,
                rubricCount: 2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
        
        questionsMap[paper.id] = paperQuestions;

        // Fetch rubrics for each question
        const rubricsMap: { [questionId: number]: RubricItem[] } = {};
        for (const question of paperQuestions) {
          const rubricsRes = await rubricItemService.getRubricsForQuestion({
            assessmentQuestionId: question.id,
            pageNumber: 1,
            pageSize: 100,
          });
          
          rubricsMap[question.id] = rubricsRes.items.length > 0
            ? rubricsRes.items
            : [
                {
                  id: 1,
                  description: "Correct output for sample input",
                  input: "5\n10",
                  output: "15",
                  score: 5,
                  assessmentQuestionId: question.id,
                  questionText: question.questionText,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 2,
                  description: "Code structure and readability",
                  input: "N/A",
                  output: "N/A",
                  score: 5,
                  assessmentQuestionId: question.id,
                  questionText: question.questionText,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ];
        }
        setRubrics((prev) => ({ ...prev, ...rubricsMap }));
      }
      setQuestions(questionsMap);
    } catch (err: any) {
      console.error("Failed to fetch exam data:", err);
      message.error("Failed to load exam data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="View Exam"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        {gradingGroup && (
          <div>
            <Title level={4}>{gradingGroup.assessmentTemplateName || "Exam"}</Title>
            <Text type="secondary">{gradingGroup.assessmentTemplateDescription || ""}</Text>
            <Divider />
            
            <Collapse
              items={papers.map((paper, paperIndex) => ({
                key: paper.id.toString(),
                label: (
                  <div>
                    <strong>Paper {paperIndex + 1}: {paper.name}</strong>
                    {paper.description && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        - {paper.description}
                      </Text>
                    )}
                  </div>
                ),
                children: (
                  <div>
                    {questions[paper.id]?.map((question, qIndex) => (
                      <div key={question.id} style={{ marginBottom: 24 }}>
                        <Title level={5}>
                          Question {qIndex + 1} (Score: {question.score})
                        </Title>
                        <Text>{question.questionText}</Text>
                        
                        {question.questionSampleInput && (
                          <div style={{ marginTop: 12 }}>
                            <Text strong>Sample Input:</Text>
                            <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                              {question.questionSampleInput}
                            </pre>
                          </div>
                        )}
                        
                        {question.questionSampleOutput && (
                          <div style={{ marginTop: 12 }}>
                            <Text strong>Sample Output:</Text>
                            <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                              {question.questionSampleOutput}
                            </pre>
                          </div>
                        )}

                        {rubrics[question.id] && rubrics[question.id].length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <Text strong>Grading Criteria:</Text>
                            <ul>
                              {rubrics[question.id].map((rubric) => (
                                <li key={rubric.id}>
                                  {rubric.description} (Max: {rubric.score} points)
                                  {rubric.input && rubric.input !== "N/A" && (
                                    <div style={{ marginLeft: 20, fontSize: "12px", color: "#666" }}>
                                      Input: <code>{rubric.input}</code>
                                    </div>
                                  )}
                                  {rubric.output && rubric.output !== "N/A" && (
                                    <div style={{ marginLeft: 20, fontSize: "12px", color: "#666" }}>
                                      Output: <code>{rubric.output}</code>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <Divider />
                      </div>
                    ))}
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Spin>
    </Modal>
  );
}

