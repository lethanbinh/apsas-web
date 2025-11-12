"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  InputNumber,
  Space,
  Spin,
  message,
  Typography,
  Divider,
  Collapse,
  Descriptions,
  Row,
  Col,
  Table,
  Tag,
  Modal,
  Input,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { submissionService, Submission } from "@/services/submissionService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import styles from "./page.module.css";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
}

interface FeedbackData {
  overallFeedback: string;
  strengths: string;
  weaknesses: string;
  codeQuality: string;
  algorithmEfficiency: string;
  suggestionsForImprovement: string;
  bestPractices: string;
  errorHandling: string;
}

export default function PEGradingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = Number(params.submissionId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [gradingGroup, setGradingGroup] = useState<GradingGroup | null>(null);
  const [questions, setQuestions] = useState<QuestionWithRubrics[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({
    overallFeedback: "",
    strengths: "",
    weaknesses: "",
    codeQuality: "",
    algorithmEfficiency: "",
    suggestionsForImprovement: "",
    bestPractices: "",
    errorHandling: "",
  });

  useEffect(() => {
    if (submissionId) {
      fetchData();
    }
  }, [submissionId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all submissions for grading group 1 to find the specific submission
      const submissions = await submissionService.getSubmissionList({
        gradingGroupId: 1,
      });
      const sub = submissions.find((s) => s.id === submissionId);
      if (!sub) {
        message.error("Submission not found");
        router.push("/pe-grading");
        return;
      }
      setSubmission(sub);
      
      // Calculate initial total score (will be recalculated after loading questions)
      setTotalScore(sub.lastGrade || 0);

      // Load feedback from localStorage or create sample feedback
      const savedFeedback = localStorage.getItem(`feedback_${submissionId}`);
      if (savedFeedback) {
        setFeedback(JSON.parse(savedFeedback));
      } else {
        // Create sample feedback
        const sampleFeedback: FeedbackData = {
          overallFeedback: "The submission demonstrates a good understanding of the problem requirements. The code is functional and produces correct outputs for the given test cases. However, there are areas for improvement in code structure and efficiency.",
          strengths: "1. Correct output for all test cases\n2. Code is readable and well-formatted\n3. Basic logic is sound\n4. Variable naming is clear",
          weaknesses: "1. Code could be more modular with better function separation\n2. Some redundant code that could be refactored\n3. Limited error handling\n4. Missing input validation in some areas",
          codeQuality: "The code quality is acceptable but could be improved. The structure is straightforward but lacks modularity. Consider breaking down complex functions into smaller, reusable components. Code formatting is consistent, which is good.",
          algorithmEfficiency: "The algorithm works correctly but may not be optimal for larger inputs. Time complexity could be improved in some sections. Consider using more efficient data structures where applicable.",
          suggestionsForImprovement: "1. Refactor code into smaller, reusable functions\n2. Add input validation and error handling\n3. Optimize algorithms for better time complexity\n4. Add comprehensive code comments\n5. Consider edge cases more thoroughly",
          bestPractices: "Follow coding best practices such as DRY (Don't Repeat Yourself) principle. Use meaningful variable names consistently. Consider using constants for magic numbers. Implement proper error handling mechanisms.",
          errorHandling: "Error handling is minimal. Add try-catch blocks where necessary. Validate user inputs before processing. Provide meaningful error messages to help with debugging.",
        };
        setFeedback(sampleFeedback);
      }

      // Fetch grading group
      if (sub.gradingGroupId) {
        const group = await gradingGroupService.getGradingGroupById(
          sub.gradingGroupId
        );
        setGradingGroup(group);

        // Fetch assessment template
        let template = null;
        if (group.assessmentTemplateId) {
          try {
            const templates = await assessmentTemplateService.getAssessmentTemplates({
              pageNumber: 1,
              pageSize: 1000,
            });
            template = templates.items.find(
              (t) => t.id === group.assessmentTemplateId
            );
          } catch (err) {
            console.error("Failed to fetch template:", err);
          }
        }

        // Always create sample data if no template or no questions
        if (template) {
            // Fetch papers
            const papers = await assessmentPaperService.getAssessmentPapers({
              assessmentTemplateId: template.id,
              pageNumber: 1,
              pageSize: 100,
            });

            // Fetch questions and rubrics for each paper
            const allQuestions: QuestionWithRubrics[] = [];
            
            // Use sample data if no papers
            const papersData = papers.items.length > 0 
              ? papers.items 
              : [
                  {
                    id: 1,
                    name: "Sample Paper 1",
                    description: "Sample paper description",
                    assessmentTemplateId: template.id,
                  },
                ];

            for (const paper of papersData) {
              const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                assessmentPaperId: paper.id,
                pageNumber: 1,
                pageSize: 100,
              });

              // Use sample data if no questions
              const paperQuestions = questionsRes.items.length > 0
                ? [...questionsRes.items].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
                : [
                    {
                      id: 1,
                      questionText: "Sample Question: Write a program to calculate the sum of two numbers",
                      questionSampleInput: "5\n10",
                      questionSampleOutput: "15",
                      score: 10,
                      questionNumber: 1,
                      assessmentPaperId: paper.id,
                      assessmentPaperName: paper.name,
                      rubricCount: 2,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ];

              for (const question of paperQuestions) {
                const rubricsRes = await rubricItemService.getRubricsForQuestion({
                  assessmentQuestionId: question.id,
                  pageNumber: 1,
                  pageSize: 100,
                });

                // Use sample data if no rubrics
                const questionRubrics = rubricsRes.items.length > 0
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

                // Generate sample scores if submission has no grade yet
                const hasGrade = sub.lastGrade > 0;
                const rubricScores: { [rubricId: number]: number } = {};
                questionRubrics.forEach((rubric) => {
                  if (hasGrade) {
                    // If already graded, start with 0
                    rubricScores[rubric.id] = 0;
                  } else {
                    // Generate sample score (random between 60-100% of max score)
                    const minScore = Math.floor(rubric.score * 0.6);
                    const maxScore = rubric.score;
                    const sampleScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
                    rubricScores[rubric.id] = sampleScore;
                  }
                });

                allQuestions.push({
                  ...question,
                  rubrics: questionRubrics,
                  rubricScores,
                });
              }
            }

            // If no questions found, create sample data
            if (allQuestions.length === 0) {
              const sampleQuestions: QuestionWithRubrics[] = [
                {
                  id: 1,
                  questionText: "Sample Question 1: Write a program to calculate the sum of two numbers",
                  questionSampleInput: "5\n10",
                  questionSampleOutput: "15",
                  score: 10,
                  questionNumber: 1,
                  assessmentPaperId: 1,
                  assessmentPaperName: "Sample Paper 1",
                  rubricCount: 2,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  rubrics: [
                    {
                      id: 1,
                      description: "Correct output for sample input",
                      input: "5\n10",
                      output: "15",
                      score: 5,
                      assessmentQuestionId: 1,
                      questionText: "Sample Question 1",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    {
                      id: 2,
                      description: "Code structure and readability",
                      input: "N/A",
                      output: "N/A",
                      score: 5,
                      assessmentQuestionId: 1,
                      questionText: "Sample Question 1",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                  rubricScores: {},
                },
                {
                  id: 2,
                  questionText: "Sample Question 2: Write a program to find the maximum of three numbers",
                  questionSampleInput: "3\n7\n2",
                  questionSampleOutput: "7",
                  score: 10,
                  questionNumber: 2,
                  assessmentPaperId: 1,
                  assessmentPaperName: "Sample Paper 1",
                  rubricCount: 2,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  rubrics: [
                    {
                      id: 3,
                      description: "Correct output for sample input",
                      input: "3\n7\n2",
                      output: "7",
                      score: 6,
                      assessmentQuestionId: 2,
                      questionText: "Sample Question 2",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    {
                      id: 4,
                      description: "Code structure and readability",
                      input: "N/A",
                      output: "N/A",
                      score: 4,
                      assessmentQuestionId: 2,
                      questionText: "Sample Question 2",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                  rubricScores: {},
                },
              ];

              const hasGrade = sub.lastGrade > 0;
              sampleQuestions.forEach((q) => {
                q.rubrics.forEach((rubric) => {
                  if (hasGrade) {
                    q.rubricScores[rubric.id] = 0;
                  } else {
                    const minScore = Math.floor(rubric.score * 0.6);
                    const maxScore = rubric.score;
                    const sampleScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
                    q.rubricScores[rubric.id] = sampleScore;
                  }
                });
              });

              allQuestions.push(...sampleQuestions);
            }

            setQuestions(allQuestions);
            
            // Calculate total score from rubric scores if no grade exists
            if (!sub.lastGrade || sub.lastGrade === 0) {
              let calculatedTotal = 0;
              allQuestions.forEach((q) => {
                const questionTotal = Object.values(q.rubricScores).reduce(
                  (sum, score) => sum + (score || 0),
                  0
                );
                calculatedTotal += questionTotal;
              });
              setTotalScore(calculatedTotal);
            }
          } else {
            // If no template, create sample data
            const sampleQuestions: QuestionWithRubrics[] = [
              {
                id: 1,
                questionText: "Sample Question 1: Write a program to calculate the sum of two numbers",
                questionSampleInput: "5\n10",
                questionSampleOutput: "15",
                score: 10,
                assessmentPaperId: 1,
                assessmentPaperName: "Sample Paper 1",
                rubricCount: 2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                rubrics: [
                  {
                    id: 1,
                    description: "Correct output for sample input",
                    input: "5\n10",
                    output: "15",
                    score: 5,
                    assessmentQuestionId: 1,
                    questionText: "Sample Question 1",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  {
                    id: 2,
                    description: "Code structure and readability",
                    input: "N/A",
                    output: "N/A",
                    score: 5,
                    assessmentQuestionId: 1,
                    questionText: "Sample Question 1",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
                rubricScores: {},
              },
              {
                id: 2,
                questionText: "Sample Question 2: Write a program to find the maximum of three numbers",
                questionSampleInput: "3\n7\n2",
                questionSampleOutput: "7",
                score: 10,
                assessmentPaperId: 1,
                assessmentPaperName: "Sample Paper 1",
                rubricCount: 2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                rubrics: [
                  {
                    id: 3,
                    description: "Correct output for sample input",
                    input: "3\n7\n2",
                    output: "7",
                    score: 6,
                    assessmentQuestionId: 2,
                    questionText: "Sample Question 2",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  {
                    id: 4,
                    description: "Code structure and readability",
                    input: "N/A",
                    output: "N/A",
                    score: 4,
                    assessmentQuestionId: 2,
                    questionText: "Sample Question 2",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
                rubricScores: {},
              },
            ];

            // Generate sample scores
            const hasGrade = sub.lastGrade > 0;
            sampleQuestions.forEach((q) => {
              q.rubrics.forEach((rubric) => {
                if (hasGrade) {
                  q.rubricScores[rubric.id] = 0;
                } else {
                  const minScore = Math.floor(rubric.score * 0.6);
                  const maxScore = rubric.score;
                  const sampleScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
                  q.rubricScores[rubric.id] = sampleScore;
                }
              });
            });

            setQuestions(sampleQuestions);

            // Calculate total score
            if (!sub.lastGrade || sub.lastGrade === 0) {
              let calculatedTotal = 0;
              sampleQuestions.forEach((q) => {
                const questionTotal = Object.values(q.rubricScores).reduce(
                  (sum, score) => sum + (score || 0),
                  0
                );
                calculatedTotal += questionTotal;
              });
              setTotalScore(calculatedTotal);
            }
          }
        } else {
          // If no grading group, create sample data
          const sampleQuestions: QuestionWithRubrics[] = [
            {
              id: 1,
              questionText: "Sample Question 1: Write a program to calculate the sum of two numbers",
              questionSampleInput: "5\n10",
              questionSampleOutput: "15",
              score: 10,
              assessmentPaperId: 1,
              assessmentPaperName: "Sample Paper 1",
              rubricCount: 2,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              rubrics: [
                {
                  id: 1,
                  description: "Correct output for sample input",
                  input: "5\n10",
                  output: "15",
                  score: 5,
                  assessmentQuestionId: 1,
                  questionText: "Sample Question 1",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 2,
                  description: "Code structure and readability",
                  input: "N/A",
                  output: "N/A",
                  score: 5,
                  assessmentQuestionId: 1,
                  questionText: "Sample Question 1",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              rubricScores: {},
            },
          ];

          const hasGrade = sub.lastGrade > 0;
          sampleQuestions.forEach((q) => {
            q.rubrics.forEach((rubric) => {
              if (hasGrade) {
                q.rubricScores[rubric.id] = 0;
              } else {
                const minScore = Math.floor(rubric.score * 0.6);
                const maxScore = rubric.score;
                const sampleScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
                q.rubricScores[rubric.id] = sampleScore;
              }
            });
          });

          setQuestions(sampleQuestions);

          if (!sub.lastGrade || sub.lastGrade === 0) {
            let calculatedTotal = 0;
            sampleQuestions.forEach((q) => {
              const questionTotal = Object.values(q.rubricScores).reduce(
                (sum, score) => sum + (score || 0),
                0
              );
              calculatedTotal += questionTotal;
            });
            setTotalScore(calculatedTotal);
          }
        }
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      message.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleRubricScoreChange = (
    questionId: number,
    rubricId: number,
    score: number | null
  ) => {
    setQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.id === questionId) {
          const newRubricScores = { ...q.rubricScores };
          newRubricScores[rubricId] = score || 0;
          return { ...q, rubricScores: newRubricScores };
        }
        return q;
      });
      
      // Calculate total score after update
      let total = 0;
      updated.forEach((q) => {
        const questionTotal = Object.values(q.rubricScores).reduce(
          (sum, score) => sum + (score || 0),
          0
        );
        total += questionTotal;
      });
      setTotalScore(total);
      
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save feedback to localStorage
      localStorage.setItem(`feedback_${submissionId}`, JSON.stringify(feedback));
      
      // TODO: Save individual rubric scores if API supports it
      // For now, save total score
      if (submission) {
        await submissionService.updateSubmissionGrade(submission.id, totalScore);
        message.success("Grade and feedback saved successfully");
        router.push("/pe-grading");
      }
    } catch (err: any) {
      console.error("Failed to save:", err);
      message.error(err.message || "Failed to save grade");
    } finally {
      setSaving(false);
    }
  };

  const handleFeedbackChange = (field: keyof FeedbackData, value: string) => {
    setFeedback((prev) => ({
      ...prev,
      [field]: value,
    }));
  };


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!submission) {
    return null;
  }

  const getQuestionColumns = (question: QuestionWithRubrics) => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: "40%",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: "25%",
      render: (text: string) => (
        <Text code style={{ fontSize: "12px" }}>
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      width: "25%",
      render: (text: string) => (
        <Text code style={{ fontSize: "12px" }}>
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Max Score",
      dataIndex: "score",
      key: "maxScore",
      width: "10%",
      align: "center" as const,
      render: (score: number) => <Tag color="blue">{score}</Tag>,
    },
    {
      title: "Score",
      key: "rubricScore",
      width: "15%",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        return (
          <InputNumber
            min={0}
            max={record.score}
            value={currentScore}
            onChange={(value) =>
              handleRubricScoreChange(question.id, record.id, value)
            }
            style={{ width: "100%" }}
          />
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <Card className={styles.headerCard}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <div className={styles.headerActions}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/pe-grading")}
            >
              Back
            </Button>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setViewExamModalVisible(true)}
              >
                View Exam
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
                size="large"
              >
                Save Grade
              </Button>
            </Space>
          </div>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="Submission ID">{submission.id}</Descriptions.Item>
            <Descriptions.Item label="Student Code">
              {submission.studentCode}
            </Descriptions.Item>
            <Descriptions.Item label="Student Name">
              {submission.studentName}
            </Descriptions.Item>
            <Descriptions.Item label="Submitted At">
              {submission.submittedAt
                ? new Date(submission.submittedAt).toLocaleString("en-US")
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Submission File">
              {submission.submissionFile?.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Total Score">
              <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                {totalScore}/100
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Card className={styles.questionsCard}>
        <Title level={3}>Grading Details</Title>
        <Text type="secondary">
          Total Questions: {questions.length} | Total Max Score:{" "}
          {questions.reduce((sum, q) => sum + q.score, 0)}
        </Text>

        <Divider />

        <Collapse 
          defaultActiveKey={questions.map((_, i) => i.toString())}
          items={[...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((question, index) => {
            const questionTotalScore = Object.values(question.rubricScores).reduce(
              (sum, score) => sum + (score || 0),
              0
            );
            const questionMaxScore = question.rubrics.reduce(
              (sum, r) => sum + r.score,
              0
            );

            return {
              key: index.toString(),
              label: (
                <div className={styles.questionHeader}>
                  <span>
                    <strong>Question {index + 1}:</strong> {question.questionText}
                  </span>
                  <Space>
                    <Tag color="blue">
                      Score: {questionTotalScore}/{questionMaxScore}
                    </Tag>
                    <Tag color="green">Max: {question.score}</Tag>
                  </Space>
                </div>
              ),
              children: (
                <div className={styles.questionContent}>
                  {question.questionSampleInput && (
                    <div className={styles.sampleSection}>
                      <Text strong>Sample Input:</Text>
                      <pre className={styles.codeBlock}>
                        {question.questionSampleInput}
                      </pre>
                    </div>
                  )}
                  {question.questionSampleOutput && (
                    <div className={styles.sampleSection}>
                      <Text strong>Sample Output:</Text>
                      <pre className={styles.codeBlock}>
                        {question.questionSampleOutput}
                      </pre>
                    </div>
                  )}

                  <Divider />

                  <Title level={5}>Grading Criteria ({question.rubrics.length})</Title>
                  <Table
                    columns={getQuestionColumns(question)}
                    dataSource={question.rubrics}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </div>
              ),
            };
          })}
        />
      </Card>

      <Card className={styles.feedbackCard} style={{ marginTop: 24 }}>
        <Title level={3}>Detailed Feedback</Title>
        <Text type="secondary">
          Provide comprehensive feedback for the student's submission
        </Text>
        <Divider />

        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Title level={5}>Overall Feedback</Title>
            <TextArea
              rows={4}
              value={feedback.overallFeedback}
              onChange={(e) => handleFeedbackChange("overallFeedback", e.target.value)}
              placeholder="Provide overall feedback on the submission..."
            />
          </div>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Strengths</Title>
                <TextArea
                  rows={5}
                  value={feedback.strengths}
                  onChange={(e) => handleFeedbackChange("strengths", e.target.value)}
                  placeholder="List the strengths of the submission..."
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Weaknesses</Title>
                <TextArea
                  rows={5}
                  value={feedback.weaknesses}
                  onChange={(e) => handleFeedbackChange("weaknesses", e.target.value)}
                  placeholder="List areas that need improvement..."
                />
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Code Quality</Title>
                <TextArea
                  rows={4}
                  value={feedback.codeQuality}
                  onChange={(e) => handleFeedbackChange("codeQuality", e.target.value)}
                  placeholder="Evaluate code structure, readability, and maintainability..."
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Algorithm Efficiency</Title>
                <TextArea
                  rows={4}
                  value={feedback.algorithmEfficiency}
                  onChange={(e) => handleFeedbackChange("algorithmEfficiency", e.target.value)}
                  placeholder="Comment on time/space complexity and optimization..."
                />
              </div>
            </Col>
          </Row>

          <div>
            <Title level={5}>Suggestions for Improvement</Title>
            <TextArea
              rows={4}
              value={feedback.suggestionsForImprovement}
              onChange={(e) => handleFeedbackChange("suggestionsForImprovement", e.target.value)}
              placeholder="Provide specific suggestions for improvement..."
            />
          </div>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Best Practices</Title>
                <TextArea
                  rows={3}
                  value={feedback.bestPractices}
                  onChange={(e) => handleFeedbackChange("bestPractices", e.target.value)}
                  placeholder="Comment on adherence to coding best practices..."
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Error Handling</Title>
                <TextArea
                  rows={3}
                  value={feedback.errorHandling}
                  onChange={(e) => handleFeedbackChange("errorHandling", e.target.value)}
                  placeholder="Evaluate error handling and input validation..."
                />
              </div>
            </Col>
          </Row>
        </Space>
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
          ? [...questionsRes.items].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
          : [
              {
                id: 1,
                questionText: "Sample Question: Write a program to calculate the sum of two numbers",
                questionSampleInput: "5\n10",
                questionSampleOutput: "15",
                score: 10,
                questionNumber: 1,
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
                    {questions[paper.id]?.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((question, qIndex) => (
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

