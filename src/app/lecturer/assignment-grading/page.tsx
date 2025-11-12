"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { submissionService, Submission } from "@/services/submissionService";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";
import { classService, ClassInfo } from "@/services/classService";
import { semesterService } from "@/services/semesterService";
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

export default function AssignmentGradingPage() {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<QuestionWithRubrics[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  // Always allow editing - disable semester check
  const [isSemesterPassed, setIsSemesterPassed] = useState(false);
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

  // Initialize with sample feedback data
  const defaultSampleFeedback: FeedbackData = {
    overallFeedback: "The submission demonstrates a good understanding of the problem requirements. The code is functional and produces correct outputs for the given test cases. However, there are areas for improvement in code structure and efficiency.",
    strengths: "1. Correct output for all test cases\n2. Code is readable and well-formatted\n3. Basic logic is sound\n4. Variable naming is clear",
    weaknesses: "1. Code could be more modular with better function separation\n2. Some redundant code that could be refactored\n3. Limited error handling\n4. Missing input validation in some areas",
    codeQuality: "The code quality is acceptable but could be improved. The structure is straightforward but lacks modularity. Consider breaking down complex functions into smaller, reusable components. Code formatting is consistent, which is good.",
    algorithmEfficiency: "The algorithm works correctly but may not be optimal for larger inputs. Time complexity could be improved in some sections. Consider using more efficient data structures where applicable.",
    suggestionsForImprovement: "1. Refactor code into smaller, reusable functions\n2. Add input validation and error handling\n3. Optimize algorithms for better time complexity\n4. Add comprehensive code comments\n5. Consider edge cases more thoroughly",
    bestPractices: "Follow coding best practices such as DRY (Don't Repeat Yourself) principle. Use meaningful variable names consistently. Consider using constants for magic numbers. Implement proper error handling mechanisms.",
    errorHandling: "Error handling is minimal. Add try-catch blocks where necessary. Validate user inputs before processing. Provide meaningful error messages to help with debugging.",
  };

  useEffect(() => {
    // Get submissionId from localStorage
    const savedSubmissionId = localStorage.getItem("selectedSubmissionId");
    if (savedSubmissionId) {
      setSubmissionId(Number(savedSubmissionId));
    } else {
      message.error("No submission selected");
      router.back();
    }
  }, []);

  useEffect(() => {
    if (submissionId) {
      // Reset state to allow editing
      setIsSemesterPassed(false);
      fetchData();
    }
  }, [submissionId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch submission by ID - need to get from classAssessment or examSession
      // For now, try to fetch all submissions and find the one with matching ID
      let sub: Submission | null = null;
      
      // Try to fetch from classAssessment first
      const classId = localStorage.getItem("selectedClassId");
      if (classId) {
        try {
          const classAssessmentsRes = await classAssessmentService.getClassAssessments({
            classId: Number(classId),
            pageNumber: 1,
            pageSize: 1000,
          });

          for (const classAssessment of classAssessmentsRes.items) {
            const submissions = await submissionService.getSubmissionList({
              classAssessmentId: classAssessment.id,
            });
            const found = submissions.find((s) => s.id === submissionId);
            if (found) {
              sub = found;
              break;
            }
          }
        } catch (err) {
          console.error("Failed to fetch from classAssessment:", err);
        }
      }

      // If not found, try examSession
      if (!sub) {
        try {
          const allSubmissions = await submissionService.getSubmissionList({});
          sub = allSubmissions.find((s) => s.id === submissionId) || null;
        } catch (err) {
          console.error("Failed to fetch submission:", err);
        }
      }

      if (!sub) {
        message.error("Submission not found");
        router.back();
        return;
      }

      setSubmission(sub);
      setTotalScore(sub.lastGrade || 0);

      // Check if semester has passed
      await checkSemesterStatus(sub);

      // Load feedback from localStorage or use sample
      const savedFeedback = localStorage.getItem(`feedback_${submissionId}`);
      if (savedFeedback) {
        try {
          setFeedback(JSON.parse(savedFeedback));
        } catch (err) {
          console.error("Failed to parse saved feedback:", err);
          setFeedback(defaultSampleFeedback);
        }
      } else {
        setFeedback(defaultSampleFeedback);
      }

      // Fetch questions and rubrics
      await fetchQuestionsAndRubrics(sub);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      message.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const checkSemesterStatus = async (submission: Submission) => {
    try {
      // Default to allowing editing (isSemesterPassed = false)
      setIsSemesterPassed(false);
      
      if (!submission.classAssessmentId) {
        console.log("No classAssessmentId, allowing editing");
        return;
      }

      // Get class assessment
      const classId = localStorage.getItem("selectedClassId");
      if (!classId) {
        console.log("No classId in localStorage, allowing editing");
        return;
      }

      const classAssessmentsRes = await classAssessmentService.getClassAssessments({
        classId: Number(classId),
        pageNumber: 1,
        pageSize: 1000,
      });

      const classAssessment = classAssessmentsRes.items.find(
        (ca) => ca.id === submission.classAssessmentId
      );

      if (!classAssessment) {
        console.log("ClassAssessment not found, allowing editing");
        return;
      }

      // Get class info to get semester
      const classInfo = await classService.getClassById(classId);
      if (!classInfo) {
        console.log("ClassInfo not found, allowing editing");
        return;
      }

      // Extract semester code from semesterName (format: "SEMESTER_CODE - ...")
      const semesterCode = classInfo.semesterName?.split(" - ")[0];
      if (!semesterCode) {
        console.log("Semester code not found, allowing editing");
        return;
      }

      // Get semester detail to check end date
      const semesterDetail = await semesterService.getSemesterPlanDetail(semesterCode);
      if (!semesterDetail?.endDate) {
        console.log("Semester end date not found, allowing editing");
        return;
      }

      // Check if semester has passed
      const now = new Date();
      const semesterEnd = new Date(semesterDetail.endDate.endsWith("Z") ? semesterDetail.endDate : semesterDetail.endDate + "Z");
      const hasPassed = now > semesterEnd;
      setIsSemesterPassed(hasPassed);
      console.log("Semester status check:", { 
        semesterCode, 
        endDate: semesterDetail.endDate, 
        now: now.toISOString(), 
        semesterEnd: semesterEnd.toISOString(),
        hasPassed 
      });
    } catch (err) {
      console.error("Failed to check semester status:", err);
      // On error, allow editing (default to false)
      setIsSemesterPassed(false);
    }
  };

  const fetchQuestionsAndRubrics = async (submission: Submission) => {
    // Declare allQuestions outside try-catch so it's accessible in catch block
    const allQuestions: QuestionWithRubrics[] = [];
    
    try {
      let assessmentTemplateId: number | null = null;

      // Try to get assessmentTemplateId from gradingGroupId first (most reliable)
      if (submission.gradingGroupId) {
        try {
          const { gradingGroupService } = await import("@/services/gradingGroupService");
          const gradingGroups = await gradingGroupService.getGradingGroups({});
          const gradingGroup = gradingGroups.find((gg) => gg.id === submission.gradingGroupId);
          if (gradingGroup?.assessmentTemplateId) {
            assessmentTemplateId = gradingGroup.assessmentTemplateId;
            console.log("Found assessmentTemplateId from gradingGroup:", assessmentTemplateId);
          }
        } catch (err) {
          console.error("Failed to fetch from gradingGroup:", err);
        }
      }

      // Try to get assessmentTemplateId from classAssessmentId
      if (!assessmentTemplateId && submission.classAssessmentId) {
        try {
          // First try with classId from localStorage
          const classId = localStorage.getItem("selectedClassId");
          if (classId) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(classId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.id === submission.classAssessmentId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
              console.log("Found assessmentTemplateId from classAssessment (localStorage classId):", assessmentTemplateId);
            }
          }

          // If not found, try to fetch classAssessment by ID directly
          // First, try fetching without classId filter (if API supports it)
          if (!assessmentTemplateId) {
            try {
              // Try fetching with just the classAssessmentId (if API supports filtering by ID)
              // Since we don't have a direct getById, try fetching all and filtering
              // But first, let's try to get it from the submission's classAssessmentId
              // by fetching all class assessments without classId filter
              const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
                pageNumber: 1,
                pageSize: 10000, // Large page size to get all
              });
              const classAssessment = allClassAssessmentsRes.items.find(
                (ca) => ca.id === submission.classAssessmentId
              );
              if (classAssessment?.assessmentTemplateId) {
                assessmentTemplateId = classAssessment.assessmentTemplateId;
                console.log("Found assessmentTemplateId from classAssessment (all classes):", assessmentTemplateId);
              }
            } catch (err) {
              // If that fails, try fetching from multiple classes
              console.log("Trying to fetch from multiple classes...");
              const { classService } = await import("@/services/classService");
              try {
                // Try to get all classes first
                const classes = await classService.getClassList({ pageNumber: 1, pageSize: 100 });
                for (const classItem of classes.classes || []) {
                  try {
                    const classAssessmentsRes = await classAssessmentService.getClassAssessments({
                      classId: classItem.id,
                      pageNumber: 1,
                      pageSize: 1000,
                    });
                    const classAssessment = classAssessmentsRes.items.find(
                      (ca) => ca.id === submission.classAssessmentId
                    );
                    if (classAssessment?.assessmentTemplateId) {
                      assessmentTemplateId = classAssessment.assessmentTemplateId;
                      console.log(`Found assessmentTemplateId from classAssessment (classId ${classItem.id}):`, assessmentTemplateId);
                      break;
                    }
                  } catch (err) {
                    // Continue to next class
                  }
                }
              } catch (err) {
                console.error("Failed to fetch from multiple classes:", err);
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch from classAssessment:", err);
        }
      }

      // Try to get assessmentTemplateId from examSessionId
      if (!assessmentTemplateId && submission.examSessionId) {
        try {
          const { examSessionService } = await import("@/services/examSessionService");
          const examSessions = await examSessionService.getExamSessions({
            pageNumber: 1,
            pageSize: 1000,
          });
          const examSession = examSessions.items.find((es) => es.id === submission.examSessionId);
          if (examSession?.assessmentTemplateId) {
            assessmentTemplateId = examSession.assessmentTemplateId;
            console.log("Found assessmentTemplateId from examSession:", assessmentTemplateId);
          }
        } catch (err) {
          console.error("Failed to fetch from examSession:", err);
        }
      }

      if (!assessmentTemplateId) {
        console.warn("Could not find assessmentTemplateId for submission:", submission.id);
        createSampleQuestions(submission);
        return;
      }

      // Fetch template
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const template = templates.items.find((t) => t.id === assessmentTemplateId);

      if (!template) {
        createSampleQuestions(submission);
        return;
      }

      // Fetch questions and rubrics for each paper
      // Fetch papers - try to get all papers first
      let papersData;
      try {
        const papers = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: template.id,
          pageNumber: 1,
          pageSize: 100,
        });
        papersData = papers.items.length > 0 ? papers.items : null;
      } catch (err) {
        console.error("Failed to fetch papers:", err);
        papersData = null;
      }

      // Only use sample paper if no papers found
      if (!papersData || papersData.length === 0) {
        papersData = [
          {
            id: 1,
            name: "Sample Paper 1",
            description: "Sample paper description",
            assessmentTemplateId: template.id,
          },
        ];
      }

      for (const paper of papersData) {
        // Fetch questions for this paper
        let paperQuestions;
        try {
          const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
            assessmentPaperId: paper.id,
            pageNumber: 1,
            pageSize: 100,
          });
          paperQuestions = questionsRes.items.length > 0
            ? [...questionsRes.items].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
            : null;
        } catch (err) {
          console.error(`Failed to fetch questions for paper ${paper.id}:`, err);
          paperQuestions = null;
        }

        // Only use sample question if no questions found
        if (!paperQuestions || paperQuestions.length === 0) {
          paperQuestions = [
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
        }

        for (const question of paperQuestions) {
          // Fetch rubrics for this question
          let questionRubrics;
          try {
            const rubricsRes = await rubricItemService.getRubricsForQuestion({
              assessmentQuestionId: question.id,
              pageNumber: 1,
              pageSize: 100,
            });
            questionRubrics = rubricsRes.items.length > 0 ? rubricsRes.items : null;
          } catch (err) {
            console.error(`Failed to fetch rubrics for question ${question.id}:`, err);
            questionRubrics = null;
          }

          // Only use sample rubrics if no rubrics found
          if (!questionRubrics || questionRubrics.length === 0) {
            questionRubrics = [
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

          // Generate sample scores based on submission grade
          const hasGrade = submission.lastGrade > 0;
          const rubricScores: { [rubricId: number]: number } = {};
          questionRubrics.forEach((rubric) => {
            if (hasGrade) {
              const totalMaxScore = questionRubrics.reduce((sum, r) => sum + r.score, 0);
              const questionScore = (submission.lastGrade / 100) * question.score;
              rubricScores[rubric.id] = Math.round((rubric.score / totalMaxScore) * questionScore);
            } else {
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

      if (allQuestions.length === 0) {
        createSampleQuestions(submission);
      } else {
        // Sort questions by questionNumber
        const sortedQuestions = [...allQuestions].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        setQuestions(sortedQuestions);
        // Recalculate total score
        let calculatedTotal = 0;
        allQuestions.forEach((q) => {
          const questionTotal = Object.values(q.rubricScores).reduce(
            (sum, score) => sum + (score || 0),
            0
          );
          calculatedTotal += questionTotal;
        });
        if (calculatedTotal > 0) {
          setTotalScore(calculatedTotal);
        }
      }
    } catch (err) {
      console.error("Failed to fetch questions and rubrics:", err);
      // Only create sample questions if we haven't fetched any data at all
      // The allQuestions array might have some data from partial fetches, so check it
      if (allQuestions.length === 0) {
        createSampleQuestions(submission);
      } else {
        // Load rubric scores from localStorage if available
        const savedRubricScores = localStorage.getItem(`rubricScores_${submission.id}`);
        let finalQuestions = allQuestions;
        
        if (savedRubricScores) {
          try {
            const parsedScores = JSON.parse(savedRubricScores);
            finalQuestions = allQuestions.map((q) => {
              const savedScores = parsedScores[q.id];
              if (savedScores) {
                return {
                  ...q,
                  rubricScores: { ...q.rubricScores, ...savedScores },
                };
              }
              return q;
            });
          } catch (err) {
            console.error("Failed to parse saved rubric scores:", err);
          }
        }
        
        // We have some questions from partial fetches, use them
        const sortedQuestions = [...finalQuestions].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        setQuestions(sortedQuestions);
        
        // Recalculate total score
        let calculatedTotal = 0;
        sortedQuestions.forEach((q) => {
          const questionTotal = Object.values(q.rubricScores).reduce(
            (sum: number, score: number | undefined) => sum + (score || 0),
            0
          );
          calculatedTotal += questionTotal;
        });
        if (calculatedTotal > 0 || savedRubricScores) {
          setTotalScore(calculatedTotal);
        }
      }
    }
  };

  const createSampleQuestions = (submission: Submission) => {
    const sampleQuestions: QuestionWithRubrics[] = [
      {
        id: 1,
        questionText: "Sample Question 1: Write a program to calculate the sum of two numbers",
        questionNumber: 1,
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
        questionNumber: 2,
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

    const hasGrade = submission.lastGrade > 0;
    sampleQuestions.forEach((q) => {
      q.rubrics.forEach((rubric) => {
        if (hasGrade) {
          const totalMaxScore = q.rubrics.reduce((sum, r) => sum + r.score, 0);
          const questionScore = (submission.lastGrade / 100) * q.score;
          q.rubricScores[rubric.id] = Math.round((rubric.score / totalMaxScore) * questionScore);
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
    let calculatedTotal = 0;
    sampleQuestions.forEach((q) => {
      const questionTotal = Object.values(q.rubricScores).reduce(
        (sum, score) => sum + (score || 0),
        0
      );
      calculatedTotal += questionTotal;
    });
    if (calculatedTotal > 0) {
      setTotalScore(calculatedTotal);
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
    if (isSemesterPassed) {
      message.warning("The semester has ended. You cannot edit grades for past semesters.");
      return;
    }

    try {
      setSaving(true);
      
      // Save feedback to localStorage
      if (submissionId) {
        localStorage.setItem(`feedback_${submissionId}`, JSON.stringify(feedback));
        
        // Save rubric scores to localStorage
        const rubricScoresMap: { [questionId: number]: { [rubricId: number]: number } } = {};
        questions.forEach((q) => {
          rubricScoresMap[q.id] = q.rubricScores;
        });
        localStorage.setItem(`rubricScores_${submissionId}`, JSON.stringify(rubricScoresMap));
      }
      
      // Save total score
      if (submission) {
        await submissionService.updateSubmissionGrade(submission.id, totalScore);
        message.success("Grade and feedback saved successfully");
    router.back();
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
      width: "35%",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: "20%",
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
      width: "20%",
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
      width: "25%",
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
            disabled={isSemesterPassed}
          />
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      {isSemesterPassed && (
        <Alert
          message="Semester Ended"
          description="The semester has ended. You cannot edit grades or feedback for submissions from past semesters."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Card className={styles.headerCard}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <div className={styles.headerActions}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
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
                disabled={isSemesterPassed}
                title={isSemesterPassed ? "The semester has ended. You cannot edit grades for past semesters." : ""}
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
              value={feedback.overallFeedback ?? defaultSampleFeedback.overallFeedback}
              onChange={(e) => handleFeedbackChange("overallFeedback", e.target.value)}
              placeholder="Provide overall feedback on the submission..."
              disabled={isSemesterPassed}
            />
        </div>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Strengths</Title>
                <TextArea
                  rows={5}
                  value={feedback.strengths ?? defaultSampleFeedback.strengths}
                  onChange={(e) => handleFeedbackChange("strengths", e.target.value)}
                  placeholder="List the strengths of the submission..."
                  disabled={isSemesterPassed}
                />
          </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Weaknesses</Title>
                <TextArea
                  rows={5}
                  value={feedback.weaknesses ?? defaultSampleFeedback.weaknesses}
                  onChange={(e) => handleFeedbackChange("weaknesses", e.target.value)}
                  placeholder="List areas that need improvement..."
                  disabled={isSemesterPassed}
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
                  value={feedback.codeQuality ?? defaultSampleFeedback.codeQuality}
                  onChange={(e) => handleFeedbackChange("codeQuality", e.target.value)}
                  placeholder="Evaluate code structure, readability, and maintainability..."
                  disabled={isSemesterPassed}
            />
          </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Algorithm Efficiency</Title>
                <TextArea
                  rows={4}
                  value={feedback.algorithmEfficiency ?? defaultSampleFeedback.algorithmEfficiency}
                  onChange={(e) => handleFeedbackChange("algorithmEfficiency", e.target.value)}
                  placeholder="Comment on time/space complexity and optimization..."
                  disabled={isSemesterPassed}
                />
          </div>
            </Col>
          </Row>

          <div>
            <Title level={5}>Suggestions for Improvement</Title>
            <TextArea
              rows={4}
              value={feedback.suggestionsForImprovement ?? defaultSampleFeedback.suggestionsForImprovement}
              onChange={(e) => handleFeedbackChange("suggestionsForImprovement", e.target.value)}
              placeholder="Provide specific suggestions for improvement..."
              disabled={isSemesterPassed}
            />
        </div>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Best Practices</Title>
                <TextArea
                  rows={3}
                  value={feedback.bestPractices ?? defaultSampleFeedback.bestPractices}
                  onChange={(e) => handleFeedbackChange("bestPractices", e.target.value)}
                  placeholder="Comment on adherence to coding best practices..."
                  disabled={isSemesterPassed}
            />
          </div>
            </Col>
            <Col xs={24} md={12}>
              <div>
                <Title level={5}>Error Handling</Title>
                <TextArea
                  rows={3}
                  value={feedback.errorHandling ?? defaultSampleFeedback.errorHandling}
                  onChange={(e) => handleFeedbackChange("errorHandling", e.target.value)}
                  placeholder="Evaluate error handling and input validation..."
                  disabled={isSemesterPassed}
                />
          </div>
            </Col>
          </Row>
        </Space>
      </Card>

      <ViewExamModal
        visible={viewExamModalVisible}
        onClose={() => setViewExamModalVisible(false)}
        submission={submission}
            />
          </div>
  );
}

// View Exam Modal Component
function ViewExamModal({
  visible,
  onClose,
  submission,
}: {
  visible: boolean;
  onClose: () => void;
  submission: Submission | null;
}) {
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});
  const { Title, Text } = Typography;

  useEffect(() => {
    if (visible && submission) {
      fetchExamData();
    }
  }, [visible, submission]);

  const fetchExamData = async () => {
    try {
      setLoading(true);

      if (!submission) return;

      let assessmentTemplateId: number | null = null;

      // Try to get assessmentTemplateId from gradingGroupId first (most reliable)
      if (submission.gradingGroupId) {
        try {
          const { gradingGroupService } = await import("@/services/gradingGroupService");
          const gradingGroups = await gradingGroupService.getGradingGroups({});
          const gradingGroup = gradingGroups.find((gg) => gg.id === submission.gradingGroupId);
          if (gradingGroup?.assessmentTemplateId) {
            assessmentTemplateId = gradingGroup.assessmentTemplateId;
            console.log("ViewExamModal: Found assessmentTemplateId from gradingGroup:", assessmentTemplateId);
          }
        } catch (err) {
          console.error("ViewExamModal: Failed to fetch from gradingGroup:", err);
        }
      }

      // Try to get assessmentTemplateId from classAssessmentId
      if (!assessmentTemplateId && submission.classAssessmentId) {
        try {
          // First try with classId from localStorage
          const classId = localStorage.getItem("selectedClassId");
          if (classId) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(classId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.id === submission.classAssessmentId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
              console.log("ViewExamModal: Found assessmentTemplateId from classAssessment (localStorage classId):", assessmentTemplateId);
            }
          }

          // If not found, try to fetch classAssessment by ID directly
          if (!assessmentTemplateId) {
            try {
              const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
                pageNumber: 1,
                pageSize: 10000,
              });
              const classAssessment = allClassAssessmentsRes.items.find(
                (ca) => ca.id === submission.classAssessmentId
              );
              if (classAssessment?.assessmentTemplateId) {
                assessmentTemplateId = classAssessment.assessmentTemplateId;
                console.log("ViewExamModal: Found assessmentTemplateId from classAssessment (all classes):", assessmentTemplateId);
              }
            } catch (err) {
              console.error("ViewExamModal: Failed to fetch all class assessments:", err);
            }
          }
        } catch (err) {
          console.error("ViewExamModal: Failed to fetch from classAssessment:", err);
        }
      }

      // Try to get assessmentTemplateId from examSessionId
      if (!assessmentTemplateId && submission.examSessionId) {
        try {
          const { examSessionService } = await import("@/services/examSessionService");
          const examSessions = await examSessionService.getExamSessions({
            pageNumber: 1,
            pageSize: 1000,
          });
          const examSession = examSessions.items.find((es) => es.id === submission.examSessionId);
          if (examSession?.assessmentTemplateId) {
            assessmentTemplateId = examSession.assessmentTemplateId;
            console.log("ViewExamModal: Found assessmentTemplateId from examSession:", assessmentTemplateId);
          }
        } catch (err) {
          console.error("ViewExamModal: Failed to fetch from examSession:", err);
        }
      }

      if (!assessmentTemplateId) {
        console.warn("ViewExamModal: Could not find assessmentTemplateId for submission:", submission.id);
        setLoading(false);
        return;
      }

      // Fetch papers
      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: assessmentTemplateId,
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
              assessmentTemplateId: assessmentTemplateId,
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
                questionNumber: 1,
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
        <div>
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
      </Spin>
    </Modal>
  );
}
