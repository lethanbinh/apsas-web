"use client";

import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { FeedbackData } from "@/services/geminiService";
import { gradingService, GradingSession } from "@/services/gradingService";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  HistoryOutlined,
  RobotOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from "antd";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import styles from "./page.module.css";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export default function AssignmentGradingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAiFeedback, setLoadingAiFeedback] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<QuestionWithRubrics[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);
  // Always allow editing - disable semester check
  const [isSemesterPassed, setIsSemesterPassed] = useState(false);
  const [latestGradingSession, setLatestGradingSession] = useState<GradingSession | null>(null);
  const [latestGradeItems, setLatestGradeItems] = useState<GradeItem[]>([]);
  const [gradingHistory, setGradingHistory] = useState<GradingSession[]>([]);
  const [loadingGradingHistory, setLoadingGradingHistory] = useState(false);
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
      // Reset feedback to empty when submissionId changes
      setFeedback({
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      });
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
      // Tạm comment lại chức năng check học kỳ
      // await checkSemesterStatus(sub);

      // Clear any existing feedback in localStorage to prevent sample data
      // Feedback will only be loaded from AI or entered manually
      localStorage.removeItem(`feedback_${submissionId}`);
      
      // Always start with empty feedback (no sample data, no localStorage)
      setFeedback({
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      });

      // Fetch questions and rubrics
      await fetchQuestionsAndRubrics(sub);
      
      // Fetch latest grading session and grade items
      await fetchLatestGradingData(sub.id);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      message.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestGradingData = async (submissionId: number) => {
    try {
      // Fetch latest grading session for this submission
      const gradingSessionsResult = await gradingService.getGradingSessions({
        submissionId: submissionId,
        pageNumber: 1,
        pageSize: 100, // Get multiple to find the latest
      });

      if (gradingSessionsResult.items.length > 0) {
        // Sort by createdAt desc to get the latest session
        const sortedSessions = [...gradingSessionsResult.items].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order
        });
        
        const latestSession = sortedSessions[0];
        setLatestGradingSession(latestSession);
        
        // Fetch grade items for this grading session
        const gradeItemsResult = await gradeItemService.getGradeItems({
          gradingSessionId: latestSession.id,
        pageNumber: 1,
          pageSize: 1000, // Get all grade items
        });
        
        // Filter to get only the latest grade item for each rubricItemDescription
        // Sort by updatedAt descending, then group by rubricItemDescription and take the first one
        const sortedItems = [...gradeItemsResult.items].sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          if (dateB !== dateA) {
            return dateB - dateA; // Descending order by updatedAt
          }
          // If updatedAt is same, sort by createdAt descending
          const createdA = new Date(a.createdAt).getTime();
          const createdB = new Date(b.createdAt).getTime();
          return createdB - createdA;
        });
        
        const latestGradeItemsMap = new Map<string, GradeItem>();
        sortedItems.forEach((item) => {
          const rubricKey = item.rubricItemDescription || "";
          if (!latestGradeItemsMap.has(rubricKey)) {
            latestGradeItemsMap.set(rubricKey, item);
          }
        });
        
        const latestGradeItems = Array.from(latestGradeItemsMap.values());
        setLatestGradeItems(latestGradeItems);
        
        // Map grade items to rubric scores and comments
        if (latestGradeItems.length > 0) {
          setQuestions((prevQuestions) => {
            return prevQuestions.map((question) => {
              const newRubricScores = { ...question.rubricScores };
              const newRubricComments = { ...(question.rubricComments || {}) };
              
              // Find grade items that match this question's rubrics
              let questionComment = "";
              question.rubrics.forEach((rubric) => {
                const matchingGradeItem = latestGradeItems.find(
                  (item) => item.rubricItemId === rubric.id
                );
                if (matchingGradeItem) {
                  newRubricScores[rubric.id] = matchingGradeItem.score;
                  // Get comment from first grade item (all grade items in a question share the same comment)
                  if (!questionComment && matchingGradeItem.comments) {
                    questionComment = matchingGradeItem.comments;
                  }
                }
              });
              
              // Set comment for the question (using question.id as key)
              newRubricComments[question.id] = questionComment;
              
              return { 
                ...question, 
                rubricScores: newRubricScores,
                rubricComments: newRubricComments
              };
            });
          });
          
          // Calculate total score
          const total = latestGradeItems.reduce((sum, item) => sum + item.score, 0);
          setTotalScore(total);
        } else {
          // If no grade items, use the grade from session
          setTotalScore(latestSession.grade);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch latest grading data:", err);
      // Don't show error to user, just log it
    }
  };

  // Tạm comment lại chức năng check học kỳ
  // const checkSemesterStatus = async (submission: Submission) => {
  //   try {
  //     // Default to allowing editing (isSemesterPassed = false)
  //     setIsSemesterPassed(false);
  //     
  //     if (!submission.classAssessmentId) {
  //       console.log("No classAssessmentId, allowing editing");
  //       return;
  //     }

  //     // Get class assessment
  //     const classId = localStorage.getItem("selectedClassId");
  //     if (!classId) {
  //       console.log("No classId in localStorage, allowing editing");
  //       return;
  //     }

  //     const classAssessmentsRes = await classAssessmentService.getClassAssessments({
  //       classId: Number(classId),
  //       pageNumber: 1,
  //       pageSize: 1000,
  //     });

  //     const classAssessment = classAssessmentsRes.items.find(
  //       (ca) => ca.id === submission.classAssessmentId
  //     );

  //     if (!classAssessment) {
  //       console.log("ClassAssessment not found, allowing editing");
  //       return;
  //     }

  //     // Get class info to get semester
  //     const classInfo = await classService.getClassById(classId);
  //     if (!classInfo) {
  //       console.log("ClassInfo not found, allowing editing");
  //       return;
  //     }

  //     // Extract semester code from semesterName (format: "SEMESTER_CODE - ...")
  //     const semesterCode = classInfo.semesterName?.split(" - ")[0];
  //     if (!semesterCode) {
  //       console.log("Semester code not found, allowing editing");
  //       return;
  //     }

  //     // Get semester detail to check end date
  //     const semesterDetail = await semesterService.getSemesterPlanDetail(semesterCode);
  //     if (!semesterDetail?.endDate) {
  //       console.log("Semester end date not found, allowing editing");
  //       return;
  //     }

  //     // Check if semester has passed
  //     const now = new Date();
  //     const semesterEnd = new Date(semesterDetail.endDate.endsWith("Z") ? semesterDetail.endDate : semesterDetail.endDate + "Z");
  //     const hasPassed = now > semesterEnd;
  //     setIsSemesterPassed(hasPassed);
  //     console.log("Semester status check:", { 
  //       semesterCode, 
  //       endDate: semesterDetail.endDate, 
  //       now: now.toISOString(), 
  //       semesterEnd: semesterEnd.toISOString(),
  //       hasPassed 
  //     });
  //   } catch (err) {
  //     console.error("Failed to check semester status:", err);
  //     // On error, allow editing (default to false)
  //     setIsSemesterPassed(false);
  //   }
  // };

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

      // Note: examSessionId is no longer used to fetch templates
      // Templates are now fetched via classAssessmentId or courseElementId through approved assign requests

      if (!assessmentTemplateId) {
        console.warn("Could not find assessmentTemplateId for submission:", submission.id);
        setQuestions([]);
        return;
      }

      // Fetch template
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const template = templates.items.find((t) => t.id === assessmentTemplateId);

      if (!template) {
        setQuestions([]);
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

      // If no papers found, return empty
      if (!papersData || papersData.length === 0) {
        setQuestions([]);
        return;
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

        // If no questions found, skip this paper
        if (!paperQuestions || paperQuestions.length === 0) {
          continue;
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

          // If no rubrics found, skip this question
          if (!questionRubrics || questionRubrics.length === 0) {
            continue;
          }

          // Initialize rubric scores and comments as empty
          const rubricScores: { [rubricId: number]: number } = {};
          const rubricComments: { [rubricId: number]: string } = {};

          allQuestions.push({
            ...question,
            rubrics: questionRubrics,
            rubricScores,
            rubricComments,
          });
        }
      }

      if (allQuestions.length === 0) {
        setQuestions([]);
      } else {
        // Sort questions by questionNumber and ensure rubricComments exists
        const sortedQuestions = [...allQuestions].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        ).map(q => ({
          ...q,
          rubricComments: { ...(q.rubricComments || {}) },
        }));
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
      if (allQuestions.length > 0) {
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
                  rubricComments: { ...(q.rubricComments || {}) },
                };
              }
              return {
                ...q,
                rubricComments: { ...(q.rubricComments || {}) },
              };
            });
          } catch (err) {
            console.error("Failed to parse saved rubric scores:", err);
          }
        }
        
        // We have some questions from partial fetches, use them
        const sortedQuestions = [...finalQuestions].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        ).map(q => ({
          ...q,
          rubricComments: { ...(q.rubricComments || {}) },
        }));
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
        } else {
        setQuestions([]);
      }
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

  const handleRubricCommentChange = (
    questionId: number,
    rubricId: number,
    comment: string
  ) => {
    setQuestions((prev) => {
      return prev.map((q) => {
        if (q.id === questionId) {
          const newRubricComments = { ...(q.rubricComments || {}) };
          newRubricComments[rubricId] = comment;
          return { ...q, rubricComments: newRubricComments };
        }
        return q;
      });
    });
  };

  const handleGetAiFeedback = async () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }

    try {
      setLoadingAiFeedback(true);
      const loadingMessage = message.loading({
        content: "Getting AI feedback...",
        key: "ai-feedback",
        duration: 0 // Keep loading message until we replace it
      });

      const formattedFeedback = await gradingService.getFormattedAiFeedback(submissionId, "OpenAI");

      // Update feedback state with AI feedback
      setFeedback(formattedFeedback);

      // Replace loading with success
      message.success({
        content: "AI feedback retrieved successfully!",
        key: "ai-feedback",
        duration: 3
      });
    } catch (error: any) {
      console.error("Failed to get AI feedback:", error);
      console.error("Error details:", {
        message: error?.message,
        response: error?.response?.data,
        apiResponse: error?.apiResponse,
        isApiError: error?.isApiError
      });

      // Extract error message from API response or use default
      let errorMessage = "Failed to get AI feedback. Please try again.";

      // Check if error has API response data (from our service)
      if (error?.apiResponse?.errorMessages && error.apiResponse.errorMessages.length > 0) {
        errorMessage = error.apiResponse.errorMessages.join(", ");
      }
      // Check if it's an axios error with response data
      else if (error?.response?.data) {
        const apiError = error.response.data;
        if (apiError.errorMessages && apiError.errorMessages.length > 0) {
          errorMessage = apiError.errorMessages.join(", ");
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
      }
      // Check if error has message
      else if (error?.message) {
        errorMessage = error.message;
      }

      // Replace loading message with error message
      message.error({
        content: errorMessage,
        key: "ai-feedback",
        duration: 5
      });
    } finally {
      setLoadingAiFeedback(false);
    }
  };

  const handleOpenGradingHistory = async () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }

    setGradingHistoryModalVisible(true);
    await fetchGradingHistory();
  };

  const fetchGradingHistory = async () => {
    if (!submissionId) {
      console.error("No submissionId for grading history");
      return;
    }

    try {
      setLoadingGradingHistory(true);
      console.log("Fetching grading history for submissionId:", submissionId);
      
      const result = await gradingService.getGradingSessions({
        submissionId: submissionId,
        pageNumber: 1,
        pageSize: 1000, // Get all grading sessions
      });
      
      console.log("Grading history result:", result);
      
      if (result && result.items && result.items.length > 0) {
        // Sort by createdAt desc (newest first)
        const sortedHistory = [...result.items].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order
        });
        
        console.log("Sorted grading history:", sortedHistory);
        setGradingHistory(sortedHistory);
      } else {
        console.log("No grading sessions found");
        setGradingHistory([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch grading history:", err);
      console.error("Error details:", {
        message: err?.message,
        response: err?.response?.data,
        stack: err?.stack
      });
      message.error(err?.message || "Failed to load grading history");
      setGradingHistory([]);
    } finally {
      setLoadingGradingHistory(false);
    }
  };

  // Render feedback fields - always show all input fields (empty or with content)
  const renderFeedbackFields = (feedbackData: FeedbackData) => {
    const fields: Array<{ key: keyof FeedbackData; label: string; rows: number; fullWidth?: boolean }> = [
      { key: "overallFeedback", label: "Overall Feedback", rows: 6, fullWidth: true },
      { key: "strengths", label: "Strengths", rows: 8 },
      { key: "weaknesses", label: "Weaknesses", rows: 8 },
      { key: "codeQuality", label: "Code Quality", rows: 6 },
      { key: "algorithmEfficiency", label: "Algorithm Efficiency", rows: 6 },
      { key: "suggestionsForImprovement", label: "Suggestions for Improvement", rows: 6, fullWidth: true },
      { key: "bestPractices", label: "Best Practices", rows: 5 },
      { key: "errorHandling", label: "Error Handling", rows: 5 },
    ];

    // Always render all fields (empty or with content)
    const fieldsToRender = fields;

    const elements: ReactNode[] = [];
    let currentRow: Array<typeof fields[0]> = [];

    fieldsToRender.forEach((field, index) => {
      const value = feedbackData[field.key] || "";

      if (field.fullWidth) {
        // If there's a pending row, render it first
        if (currentRow.length > 0) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  onChange={(e) => handleFeedbackChange(currentRow[0].key, e.target.value)}
                  placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
                />
              </div>
            );
          } else {
            elements.push(
              <Row gutter={16} key={`row-${index}`}>
                {currentRow.map((f) => (
                  <Col xs={24} md={12} key={f.key}>
                    <div>
                      <Title level={5}>{f.label}</Title>
                      <TextArea
                        rows={f.rows}
                        value={feedbackData[f.key] || ""}
                        onChange={(e) => handleFeedbackChange(f.key, e.target.value)}
                        placeholder={`Enter ${f.label.toLowerCase()}...`}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }

        // Render full-width field
        elements.push(
          <div key={`field-${field.key}`}>
            <Title level={5}>{field.label}</Title>
            <TextArea
              rows={field.rows}
              value={value}
              onChange={(e) => handleFeedbackChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
          </div>
        );
      } else {
        currentRow.push(field);

        // If row is full (2 items) or it's the last item, render the row
        if (currentRow.length === 2 || index === fieldsToRender.length - 1) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  onChange={(e) => handleFeedbackChange(currentRow[0].key, e.target.value)}
                  placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
                />
              </div>
            );
          } else {
            elements.push(
              <Row gutter={16} key={`row-${index}`}>
                {currentRow.map((f) => (
                  <Col xs={24} md={12} key={f.key}>
                    <div>
                      <Title level={5}>{f.label}</Title>
                      <TextArea
                        rows={f.rows}
                        value={feedbackData[f.key] || ""}
                        onChange={(e) => handleFeedbackChange(f.key, e.target.value)}
                        placeholder={`Enter ${f.label.toLowerCase()}...`}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }
      }
    });

    return elements;
  };

  const handleSave = async () => {
    if (!submissionId || !submission) {
      message.error("No submission selected");
      return;
    }

    try {
      setSaving(true);
      
      // Calculate total score from all rubric scores
      let calculatedTotal = 0;
        questions.forEach((q) => {
        const questionTotal = Object.values(q.rubricScores).reduce(
          (sum, score) => sum + (score || 0),
          0
        );
        calculatedTotal += questionTotal;
      });
      setTotalScore(calculatedTotal);

      // Ensure we have a grading session
      let gradingSessionId: number;

      if (latestGradingSession) {
        gradingSessionId = latestGradingSession.id;
      } else {
        // Create new grading session
        let assessmentTemplateId: number | null = null;

        if (submission.gradingGroupId) {
          try {
            const { gradingGroupService } = await import("@/services/gradingGroupService");
            const gradingGroups = await gradingGroupService.getGradingGroups({});
            const gradingGroup = gradingGroups.find((gg) => gg.id === submission.gradingGroupId);
            if (gradingGroup?.assessmentTemplateId) {
              assessmentTemplateId = gradingGroup.assessmentTemplateId;
            }
          } catch (err) {
            console.error("Failed to fetch grading group:", err);
          }
        }

        if (!assessmentTemplateId) {
          message.error("Cannot find assessment template. Please contact administrator.");
          return;
        }

        // Create grading session
        await gradingService.createGrading({
          submissionId: submission.id,
          assessmentTemplateId: assessmentTemplateId,
        });

        // Fetch the newly created session
        const gradingSessionsResult = await gradingService.getGradingSessions({
          submissionId: submission.id,
          pageNumber: 1,
          pageSize: 100,
        });

        if (gradingSessionsResult.items.length > 0) {
          const sortedSessions = [...gradingSessionsResult.items].sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          gradingSessionId = sortedSessions[0].id;
          setLatestGradingSession(sortedSessions[0]);
        } else {
          message.error("Failed to create grading session");
          return;
        }
      }

      // Save all grade items (create or update)
      for (const question of questions) {
        // Get comment for this question (stored with question.id as key)
        const questionComment = question.rubricComments?.[question.id] || "";
        
        for (const rubric of question.rubrics) {
          const score = question.rubricScores[rubric.id] || 0;
          const existingGradeItem = latestGradeItems.find(
            (item) => item.rubricItemId === rubric.id
          );

          if (existingGradeItem) {
            // Update existing grade item
            await gradeItemService.updateGradeItem(existingGradeItem.id, {
              score: score,
              comments: questionComment,
            });
          } else {
            // Create new grade item
            await gradeItemService.createGradeItem({
              gradingSessionId: gradingSessionId,
              rubricItemId: rubric.id,
              score: score,
              comments: questionComment,
            });
          }
        }
      }

      // Update grading session with total score (status defaults to COMPLETED)
      await gradingService.updateGradingSession(gradingSessionId, {
        grade: calculatedTotal,
        status: 1, // COMPLETED
      });

      // Update submission grade
      await submissionService.updateSubmissionGrade(submission.id, calculatedTotal);

      message.success("Grade saved successfully");
      
      // Refresh latest grading data
      await fetchLatestGradingData(submissionId);
    } catch (err: any) {
      console.error("Failed to save grade:", err);
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
      width: "25%",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: "15%",
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
      width: "15%",
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
            step={0.01}
            precision={2}
          />
        );
      },
    },
  ];

  return (
    <App>
    <div className={styles.container}>
        {/* Tạm comment lại check học kỳ */}
        {/* {isSemesterPassed && (
        <Alert
          message="Semester Ended"
          description="The semester has ended. You cannot edit grades or feedback for submissions from past semesters."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )} */}
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
                  icon={<RobotOutlined />}
                  onClick={handleGetAiFeedback}
                  loading={loadingAiFeedback}
                >
                  Get AI Feedback
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

        <Card className={styles.feedbackCard} style={{ marginTop: 24 }}>
          <Collapse
            defaultActiveKey={[]}
            className={`${styles.collapseWrapper} collapse-feedback`}
            items={[
              {
                key: "feedback",
                label: (
                  <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                    Detailed Feedback
                  </Title>
                ),
                children: (
                  <div>
                    <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                      Provide comprehensive feedback for the student's submission
        </Text>
                    <Space direction="vertical" size="large" style={{ width: "100%" }}>
                      {renderFeedbackFields(feedback)}
                    </Space>
                  </div>
                ),
              },
            ]}
          />
        </Card>

        <Card className={styles.questionsCard} style={{ marginTop: 24 }}>
        <Collapse 
            defaultActiveKey={["grading-details"]}
            className={`${styles.collapseWrapper} collapse-grading`}
            items={[
              {
                key: "grading-details",
                label: (
                  <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                    Grading Details
                  </Title>
                ),
                children: (
                  <div>
                    <Row gutter={16}>
                      <Col xs={24} md={8} lg={7}>
                        <div>
                          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                            Total Questions: {questions.length}
                          </Text>
                          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                            Total Max Score: {questions.reduce((sum, q) => sum + q.score, 0)}
                          </Text>
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Button
                              type="primary"
                              icon={<SaveOutlined />}
                              onClick={handleSave}
                              loading={saving}
                              block
                            >
                              Save Grade
                            </Button>
                            <Button
                              type="default"
                              icon={<HistoryOutlined />}
                              onClick={handleOpenGradingHistory}
                              block
                            >
                              Grading History
                            </Button>
                          </Space>
                        </div>
                      </Col>
                      <Col xs={24} md={16} lg={17}>
                        {(() => {
                          const sortedQuestions = [...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

                          const renderQuestionCollapse = (question: QuestionWithRubrics, index: number) => {
            const questionTotalScore = Object.values(question.rubricScores).reduce(
              (sum, score) => sum + (score || 0),
              0
            );
            const questionMaxScore = question.rubrics.reduce(
              (sum, r) => sum + r.score,
              0
            );

            return {
                              key: `question-${index}`,
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
                                    scroll={{ x: "max-content" }}
                                  />
                                  
        <Divider />

                                  <div style={{ marginTop: 16 }}>
                                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                                      Comments
                                    </Text>
            <TextArea
              rows={4}
                                      value={question.rubricComments?.[question.id] || ""}
                                      onChange={(e) =>
                                        handleRubricCommentChange(question.id, question.id, e.target.value)
                                      }
                                      placeholder="Enter comments for this question..."
                                      style={{ width: "100%" }}
            />
        </div>
          </div>
                              ),
                            };
                          };

                          return (
                            <Collapse
                              items={sortedQuestions.map((question, index) => 
                                renderQuestionCollapse(question, index)
                              )}
                            />
                          );
                        })()}
            </Col>
          </Row>
        </div>
                ),
              },
            ]}
          />
      </Card>

      <ViewExamModal
        visible={viewExamModalVisible}
        onClose={() => setViewExamModalVisible(false)}
        submission={submission}
            />

        <GradingHistoryModal
          visible={gradingHistoryModalVisible}
          onClose={() => setGradingHistoryModalVisible(false)}
          gradingHistory={gradingHistory}
          loading={loadingGradingHistory}
          submissionId={submissionId}
        />
          </div>
    </App>
  );
}
function ViewExamModal({
  visible,
  onClose,
  submission,
}: {
  visible: boolean;
  onClose: () => void;
  submission: Submission | null;
}) {
  const { message } = App.useApp();
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

      // Note: examSessionId is no longer used to fetch templates
      // Templates are now fetched via classAssessmentId or courseElementId through approved assign requests

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

      const papersData = papersRes.items.length > 0 ? papersRes.items : [];
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
          : [];

        questionsMap[paper.id] = paperQuestions;

        // Fetch rubrics for each question
        const rubricsMap: { [questionId: number]: RubricItem[] } = {};
        for (const question of paperQuestions) {
          const rubricsRes = await rubricItemService.getRubricsForQuestion({
            assessmentQuestionId: question.id,
            pageNumber: 1,
            pageSize: 100,
          });

          rubricsMap[question.id] = rubricsRes.items.length > 0 ? rubricsRes.items : [];
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

function GradingHistoryModal({
  visible,
  onClose,
  gradingHistory,
  loading,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  gradingHistory: GradingSession[];
  loading: boolean;
  submissionId: number | null;
}) {
  const { message } = App.useApp();
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [sessionGradeItems, setSessionGradeItems] = useState<{ [sessionId: number]: GradeItem[] }>({});

  const { Title, Text } = Typography;

  const getGradingTypeLabel = (type: number) => {
    switch (type) {
      case 0:
        return "AI";
      case 1:
        return "LECTURER";
      case 2:
        return "BOTH";
      default:
        return "UNKNOWN";
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="processing">PROCESSING</Tag>;
      case 1:
        return <Tag color="success">COMPLETED</Tag>;
      case 2:
        return <Tag color="error">FAILED</Tag>;
      default:
        return <Tag>UNKNOWN</Tag>;
    }
  };

  const handleExpandSession = async (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    const isCurrentlyExpanded = newExpanded.has(sessionId);
    
    if (isCurrentlyExpanded) {
      // Collapse
      newExpanded.delete(sessionId);
      setExpandedSessions(newExpanded);
      return;
    }

    // Expand - fetch or use cached data, but always filter duplicates
    if (sessionGradeItems[sessionId]) {
      // Already loaded, just expand (data is already filtered)
      newExpanded.add(sessionId);
      setExpandedSessions(newExpanded);
      return;
    }

    // Fetch grade items for this session
    try {
      const result = await gradeItemService.getGradeItems({
        gradingSessionId: sessionId,
        pageNumber: 1,
        pageSize: 1000,
      });
      
      // Filter to get only the latest grade item for each rubricItemDescription
      // Sort by updatedAt descending (or createdAt if updatedAt is same), then group by rubricItemDescription and take the first one
      const sortedItems = [...result.items].sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        if (dateB !== dateA) {
          return dateB - dateA; // Descending order by updatedAt
        }
        // If updatedAt is same, sort by createdAt descending
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return createdB - createdA;
      });
      
      const latestGradeItemsMap = new Map<string, GradeItem>();
      sortedItems.forEach((item) => {
        const rubricKey = item.rubricItemDescription || "";
        if (!latestGradeItemsMap.has(rubricKey)) {
          latestGradeItemsMap.set(rubricKey, item);
        }
      });
      
      const latestGradeItems = Array.from(latestGradeItemsMap.values());
      
      console.log(`Filtered ${result.items.length} grade items to ${latestGradeItems.length} unique items for session ${sessionId}`);
      
      setSessionGradeItems((prev) => ({
        ...prev,
        [sessionId]: latestGradeItems,
      }));
      
      newExpanded.add(sessionId);
      setExpandedSessions(newExpanded);
    } catch (err: any) {
      console.error("Failed to fetch grade items:", err);
      message.error("Failed to load grade items");
    }
  };

  const [gradeItemHistoryModalVisible, setGradeItemHistoryModalVisible] = useState(false);
  const [selectedGradeItem, setSelectedGradeItem] = useState<GradeItem | null>(null);
  const [gradeItemHistory, setGradeItemHistory] = useState<GradeItem[]>([]);
  const [loadingGradeItemHistory, setLoadingGradeItemHistory] = useState(false);

  const handleOpenGradeItemHistory = async (gradeItem: GradeItem) => {
    setSelectedGradeItem(gradeItem);
    setGradeItemHistoryModalVisible(true);
    await fetchGradeItemHistory(gradeItem.rubricItemDescription, gradeItem.gradingSessionId);
  };

  const fetchGradeItemHistory = async (rubricItemDescription: string, gradingSessionId: number) => {
    setLoadingGradeItemHistory(true);
    try {
      // Fetch all grade items for this session, then filter by rubricItemDescription
      const result = await gradeItemService.getGradeItems({
        gradingSessionId: gradingSessionId,
        pageNumber: 1,
        pageSize: 1000,
      });
      
      // Filter by rubricItemDescription
      const filteredItems = result.items.filter(
        (item) => item.rubricItemDescription === rubricItemDescription
      );
      
      // Sort by updatedAt descending to show latest first
      const sortedHistory = [...filteredItems].sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        if (dateB !== dateA) {
          return dateB - dateA; // Descending order by updatedAt
        }
        // If updatedAt is same, sort by createdAt descending
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return createdB - createdA;
      });
      
      setGradeItemHistory(sortedHistory);
    } catch (err: any) {
      console.error("Failed to fetch grade item history:", err);
      message.error("Failed to load grade item history");
      setGradeItemHistory([]);
    } finally {
      setLoadingGradeItemHistory(false);
    }
  };

  const columns = [
    {
      title: "Rubric Item",
      dataIndex: "rubricItemDescription",
      key: "rubricItemDescription",
      width: "25%",
    },
    {
      title: "Question",
      dataIndex: "questionText",
      key: "questionText",
      width: "15%",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Max Score",
      dataIndex: "rubricItemMaxScore",
      key: "rubricItemMaxScore",
      width: "12%",
      align: "center" as const,
      render: (score: number) => <Tag color="blue">{score}</Tag>,
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      width: "12%",
      align: "center" as const,
      render: (score: number) => <Tag color={score > 0 ? "green" : "default"}>{score.toFixed(2)}</Tag>,
    },
    {
      title: "Comments",
      dataIndex: "comments",
      key: "comments",
      width: "20%",
      render: (text: string) => (
        <Text
          ellipsis={{ tooltip: text }}
          style={{ fontSize: "12px" }}
        >
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: "16%",
      align: "center" as const,
      render: (_: any, record: GradeItem) => {
        // Count how many times this grade item was edited
        // We'll fetch this in the modal, but for now show a button
        return (
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleOpenGradeItemHistory(record)}
          >
            Edit History
          </Button>
        );
      },
    },
  ];

  return (
    <Modal
      title="Grading History"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={1200}
    >
      <Spin spinning={loading}>
        {gradingHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No grading history available</Text>
          </div>
        ) : (
          <Collapse
            items={gradingHistory.map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              let gradeItems = sessionGradeItems[session.id] || [];
              
              // Ensure no duplicates - filter to keep only latest grade item per rubricItemDescription
              if (gradeItems.length > 0) {
                // Sort by updatedAt descending first
                const sorted = [...gradeItems].sort((a, b) => {
                  const dateA = new Date(a.updatedAt).getTime();
                  const dateB = new Date(b.updatedAt).getTime();
                  if (dateB !== dateA) {
                    return dateB - dateA;
                  }
                  const createdA = new Date(a.createdAt).getTime();
                  const createdB = new Date(b.createdAt).getTime();
                  return createdB - createdA;
                });
                
                // Only keep the first occurrence of each rubricItemDescription
                const rubricDescriptionMap = new Map<string, GradeItem>();
                sorted.forEach((item) => {
                  const rubricKey = item.rubricItemDescription || "";
                  if (!rubricDescriptionMap.has(rubricKey)) {
                    rubricDescriptionMap.set(rubricKey, item);
                  }
                });
                
                gradeItems = Array.from(rubricDescriptionMap.values());
              }
              
              const totalScore = gradeItems.reduce((sum, item) => sum + item.score, 0);

              return {
                key: session.id.toString(),
                label: (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <Text strong>Session #{session.id}</Text>
                      <Space style={{ marginLeft: 16 }}>
                        {getStatusLabel(session.status)}
                        <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                        <Tag color="blue">Grade: {session.grade}</Tag>
                        {gradeItems.length > 0 && (
                          <Tag color="green">Total: {totalScore.toFixed(2)}</Tag>
                        )}
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {new Date(session.createdAt).toLocaleString("en-US")}
                    </Text>
                  </div>
                ),
                children: (
                  <div>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Grading Session ID">{session.id}</Descriptions.Item>
                      <Descriptions.Item label="Status">{getStatusLabel(session.status)}</Descriptions.Item>
                      <Descriptions.Item label="Grading Type">
                        <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Grade">{session.grade}</Descriptions.Item>
                      <Descriptions.Item label="Grade Item Count">{session.gradeItemCount}</Descriptions.Item>
                      <Descriptions.Item label="Created At">
                        {new Date(session.createdAt).toLocaleString("en-US")}
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated At">
                        {new Date(session.updatedAt).toLocaleString("en-US")}
                      </Descriptions.Item>
                    </Descriptions>

                    {!isExpanded ? (
                      <Button
                        type="link"
                        onClick={() => handleExpandSession(session.id)}
                        style={{ padding: 0 }}
                      >
                        View grade items details
                      </Button>
                    ) : (
                      <div>
                        <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                          Grade Items ({gradeItems.length})
                        </Title>
                        {gradeItems.length === 0 ? (
                          <Text type="secondary">No grade items</Text>
                        ) : (
                          <Table
                            columns={columns}
                            dataSource={gradeItems}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            scroll={{ x: "max-content" }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        )}
      </Spin>
      
      {/* Grade Item History Modal */}
      <Modal
        title={
          <div>
            <Text strong>Grade Item Edit History</Text>
            {selectedGradeItem && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  Rubric: {selectedGradeItem.rubricItemDescription} | 
                  Total edits: {gradeItemHistory.length}
                </Text>
              </div>
            )}
          </div>
        }
        open={gradeItemHistoryModalVisible}
        onCancel={() => {
          setGradeItemHistoryModalVisible(false);
          setSelectedGradeItem(null);
          setGradeItemHistory([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setGradeItemHistoryModalVisible(false);
            setSelectedGradeItem(null);
            setGradeItemHistory([]);
          }}>
            Close
          </Button>,
        ]}
        width={900}
      >
        <Spin spinning={loadingGradeItemHistory}>
          {gradeItemHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text type="secondary">No edit history available</Text>
            </div>
          ) : (
            <Table
              columns={[
                {
                  title: "Edit #",
                  key: "index",
                  width: "8%",
                  align: "center" as const,
                  render: (_: any, __: any, index: number) => (
                    <Tag color={index === 0 ? "green" : "default"}>
                      {index + 1}
                    </Tag>
                  ),
                },
                {
                  title: "Score",
                  dataIndex: "score",
                  key: "score",
                  width: "15%",
                  align: "center" as const,
                  render: (score: number) => (
                    <Tag color={score > 0 ? "green" : "default"}>
                      {score.toFixed(2)}
                    </Tag>
                  ),
                },
                {
                  title: "Comments",
                  dataIndex: "comments",
                  key: "comments",
                  width: "35%",
                  render: (text: string) => (
                    <Text
                      ellipsis={{ tooltip: text }}
                      style={{ fontSize: "12px" }}
                    >
                      {text || "N/A"}
                    </Text>
                  ),
                },
                {
                  title: "Updated At",
                  dataIndex: "updatedAt",
                  key: "updatedAt",
                  width: "21%",
                  render: (date: string) => (
                    <Text style={{ fontSize: "12px" }}>
                      {new Date(date).toLocaleString("en-US")}
                    </Text>
                  ),
                },
                {
                  title: "Created At",
                  dataIndex: "createdAt",
                  key: "createdAt",
                  width: "21%",
                  render: (date: string) => (
                    <Text style={{ fontSize: "12px" }}>
                      {new Date(date).toLocaleString("en-US")}
                    </Text>
                  ),
                },
              ]}
              dataSource={gradeItemHistory}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
            />
          )}
        </Spin>
      </Modal>
    </Modal>
  );
}
