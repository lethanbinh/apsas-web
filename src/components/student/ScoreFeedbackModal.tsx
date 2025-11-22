"use client";

import { useStudent } from "@/hooks/useStudent";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { courseElementService } from "@/services/courseElementService";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService, GradeItem as GradingServiceGradeItem, GradingSession } from "@/services/gradingService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { CloseOutlined, DownloadOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Checkbox, Col, Collapse, Descriptions, Divider, Input, Modal, Row, Space, Spin, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useEffect, useState } from "react";
import styles from "./ScoreFeedbackModal.module.css";
import { AssignmentData } from "./data";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
  questionComment?: string;
}

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface ScoreFeedbackModalProps {
  open: boolean;
  onCancel: () => void;
  data: AssignmentData;
}

export const ScoreFeedbackModal: React.FC<ScoreFeedbackModalProps> = ({
  open,
  onCancel,
  data,
}) => {
  const { studentId } = useStudent();
  const { message } = App.useApp();
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [latestGradingSession, setLatestGradingSession] = useState<GradingSession | null>(null);
  const [totalScore, setTotalScore] = useState<number>(0);

  // Initialize with empty feedback data (will be populated from API)
  const defaultEmptyFeedback: FeedbackData = {
    overallFeedback: "",
    strengths: "",
    weaknesses: "",
    codeQuality: "",
    algorithmEfficiency: "",
    suggestionsForImprovement: "",
    bestPractices: "",
    errorHandling: "",
  };

  const [feedback, setFeedback] = useState<FeedbackData>(defaultEmptyFeedback);
  const [questions, setQuestions] = useState<QuestionWithRubrics[]>([]);
  const [latestGradeItems, setLatestGradeItems] = useState<GradingServiceGradeItem[]>([]);
  const [hasMappedGradeItems, setHasMappedGradeItems] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setFeedback(defaultEmptyFeedback);
      setQuestions([]);
      setLastSubmission(null);
      setLatestGradingSession(null);
      setTotalScore(0);
      setLatestGradeItems([]);
      setHasMappedGradeItems(false);
      
      // Then try to fetch real data if available
      if (studentId && data.classAssessmentId) {
        fetchSubmissionData();
      } else {
        // If no studentId or classAssessmentId, still try to fetch template questions
        fetchQuestionsAndRubricsForNoSubmission();
      }
    }
  }, [open, studentId, data.classAssessmentId]);

  // Map grade items to questions when both are available (only once)
  useEffect(() => {
    if (questions.length > 0 && latestGradeItems.length > 0 && !hasMappedGradeItems) {
      setQuestions((prevQuestions) => {
        return prevQuestions.map((question) => {
          const newRubricScores = { ...question.rubricScores };
          const newRubricComments = { ...(question.rubricComments || {}) };
          let questionComment = "";

          // Find grade items that match this question's rubrics
          question.rubrics.forEach((rubric) => {
            const matchingGradeItem = latestGradeItems.find(
              (item) => item.rubricItemId === rubric.id
            );
            if (matchingGradeItem) {
              newRubricScores[rubric.id] = matchingGradeItem.score;
              newRubricComments[rubric.id] = matchingGradeItem.comments || "";
              // Get comment from first grade item (all grade items in a question share the same comment)
              if (!questionComment && matchingGradeItem.comments) {
                questionComment = matchingGradeItem.comments;
              }
            }
          });

          return {
            ...question,
            rubricScores: newRubricScores,
            rubricComments: newRubricComments,
            questionComment,
          };
        });
      });
      setHasMappedGradeItems(true);
    }
  }, [questions.length, latestGradeItems.length, hasMappedGradeItems]);

  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      if (!studentId) {
        await fetchQuestionsAndRubricsForNoSubmission();
        return;
      }
      
      const submissions = await submissionService.getSubmissionList({
        studentId: studentId,
        classAssessmentId: data.classAssessmentId ?? undefined,
      });

      if (submissions.length > 0) {
        // Get the most recent submission
        const sorted = submissions.sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );
        const latest = sorted[0];
        setLastSubmission(latest);

        // Fetch latest grading session and grade items (similar to lecturer)
        await fetchLatestGradingData(latest.id);

        // Fetch questions and rubrics
        await fetchQuestionsAndRubrics(latest);
        
        // Fetch feedback independently after main data is loaded
        fetchFeedback(latest.id);
      } else {
        // No submissions found - still try to fetch template questions if template is approved
        await fetchQuestionsAndRubricsForNoSubmission();
      }
    } catch (err) {
      console.error("Failed to fetch submission:", err);
      // On error, try to fetch template questions if template is approved
      await fetchQuestionsAndRubricsForNoSubmission();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Deserialize JSON string to feedback data
   * Returns null if feedback is not JSON format
   */
  const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
    if (!feedbackText || feedbackText.trim() === "") {
      return null;
    }

    try {
      const parsed = JSON.parse(feedbackText);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          overallFeedback: parsed.overallFeedback || "",
          strengths: parsed.strengths || "",
          weaknesses: parsed.weaknesses || "",
          codeQuality: parsed.codeQuality || "",
          algorithmEfficiency: parsed.algorithmEfficiency || "",
          suggestionsForImprovement: parsed.suggestionsForImprovement || "",
          bestPractices: parsed.bestPractices || "",
          errorHandling: parsed.errorHandling || "",
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  /**
   * Fetch existing feedback from API
   */
  const fetchFeedback = async (submissionId: number) => {
    try {
      setLoadingFeedback(true);
      const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });

      if (feedbackList.length > 0) {
        // Get the first feedback (assuming one feedback per submission)
        const existingFeedback = feedbackList[0];
        
        // Try to deserialize feedback
        let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
        
        // If deserialize returns null, it means it's plain text/markdown
        // Use Gemini to parse it into structured format
        if (parsedFeedback === null) {
          try {
            parsedFeedback = await geminiService.formatFeedback(existingFeedback.feedbackText);
          } catch (error: any) {
            console.error("Failed to parse feedback with Gemini:", error);
            // Fallback: put entire text into overallFeedback
            parsedFeedback = {
              overallFeedback: existingFeedback.feedbackText,
              strengths: "",
              weaknesses: "",
              codeQuality: "",
              algorithmEfficiency: "",
              suggestionsForImprovement: "",
              bestPractices: "",
              errorHandling: "",
            };
          }
        }
        
        if (parsedFeedback) {
          setFeedback(parsedFeedback);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch feedback:", error);
      // Don't show error to user, just log it
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Fetch latest grading session and grade items (similar to lecturer logic)
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

        // Use gradeItems from the session response (already included in API response)
        // If gradeItems are not in the response, fetch them separately
        let gradeItems: GradingServiceGradeItem[] = [];

        if (latestSession.gradeItems && latestSession.gradeItems.length > 0) {
          // Use gradeItems from response
          gradeItems = latestSession.gradeItems;
        } else {
          // Fallback: fetch grade items separately if not in response
          try {
            const gradeItemsResult = await gradeItemService.getGradeItems({
              gradingSessionId: latestSession.id,
              pageNumber: 1,
              pageSize: 1000, // Get all grade items
            });
            // Convert GradeItem from gradeItemService to GradingServiceGradeItem format
            gradeItems = gradeItemsResult.items.map((item) => ({
              id: item.id,
              score: item.score,
              comments: item.comments,
              rubricItemId: item.rubricItemId,
              rubricItemDescription: item.rubricItemDescription,
              rubricItemMaxScore: item.rubricItemMaxScore,
            }));
          } catch (err) {
            console.error("Failed to fetch grade items separately:", err);
            gradeItems = [];
          }
        }

        // Filter to get only the latest grade item for each rubricItemId
        // Since gradeItems from API are already the latest, we just need to deduplicate by rubricItemId
        const latestGradeItemsMap = new Map<number, GradingServiceGradeItem>();
        gradeItems.forEach((item) => {
          const rubricId = item.rubricItemId;
          if (!latestGradeItemsMap.has(rubricId)) {
            latestGradeItemsMap.set(rubricId, item);
          }
        });

        const latestGradeItems = Array.from(latestGradeItemsMap.values());
        setLatestGradeItems(latestGradeItems);

        // Calculate total score
        if (latestGradeItems.length > 0) {
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


  const createSampleQuestionsForNoSubmission = () => {
    // Don't create sample questions - just show empty list
    setQuestions([]);
  };

  const fetchQuestionsAndRubricsForNoSubmission = async () => {
    // Use a dummy submission object for fetching template questions
    const dummySubmission: Submission = {
      id: 0,
      studentId: studentId || 0,
      studentName: "",
      studentCode: "",
      classAssessmentId: data.classAssessmentId || 0,
      lastGrade: 0,
      status: 0,
      submissionFile: null,
      submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await fetchQuestionsAndRubrics(dummySubmission, true);
  };

  const fetchQuestionsAndRubrics = async (submission: Submission, skipSampleIfNoTemplate = false) => {
    let templateFound = false; // Flag to track if approved template was found
    try {
      let assessmentTemplateId: number | null = null;

      // First, try to use assessmentTemplateId from data if available
      if (data.assessmentTemplateId) {
        assessmentTemplateId = data.assessmentTemplateId;
        console.log("ScoreFeedbackModal: Using assessmentTemplateId from data:", assessmentTemplateId);
      }

      // Try to get assessmentTemplateId from classAssessmentId
      if (!assessmentTemplateId && data.classAssessmentId && data.classId) {
        try {
          // First try with classId from data
        const classAssessmentsRes = await classAssessmentService.getClassAssessments({
          classId: data.classId,
          pageNumber: 1,
          pageSize: 1000,
        });
        const classAssessment = classAssessmentsRes.items.find(
          (ca) => ca.id === data.classAssessmentId
        );
        if (classAssessment?.assessmentTemplateId) {
          assessmentTemplateId = classAssessment.assessmentTemplateId;
            console.log("ScoreFeedbackModal: Found assessmentTemplateId from classAssessment:", assessmentTemplateId);
          }

          // If not found, try to fetch all class assessments
          if (!assessmentTemplateId) {
            try {
              const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
                pageNumber: 1,
                pageSize: 10000,
              });
              const classAssessment = allClassAssessmentsRes.items.find(
                (ca) => ca.id === data.classAssessmentId
              );
              if (classAssessment?.assessmentTemplateId) {
                assessmentTemplateId = classAssessment.assessmentTemplateId;
                console.log("ScoreFeedbackModal: Found assessmentTemplateId from all class assessments:", assessmentTemplateId);
              }
            } catch (err) {
              console.error("ScoreFeedbackModal: Failed to fetch all class assessments:", err);
            }
          }
        } catch (err) {
          console.error("ScoreFeedbackModal: Failed to fetch from classAssessment:", err);
        }
      }

      // If still not found, try to get from localStorage classId
      if (!assessmentTemplateId && data.classAssessmentId) {
        try {
          const localStorageClassId = localStorage.getItem("selectedClassId");
          if (localStorageClassId && data.classId && localStorageClassId !== data.classId.toString()) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(localStorageClassId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.id === data.classAssessmentId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
              console.log("ScoreFeedbackModal: Found assessmentTemplateId from localStorage classId:", assessmentTemplateId);
            }
          }
        } catch (err) {
          console.error("ScoreFeedbackModal: Failed to fetch from localStorage classId:", err);
        }
      }

      // Try to get assessmentTemplateId from courseElementId via classAssessment
      if (!assessmentTemplateId && data.courseElementId) {
        try {
          const localStorageClassId = localStorage.getItem("selectedClassId");
          if (localStorageClassId) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(localStorageClassId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.courseElementId === data.courseElementId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
              console.log("ScoreFeedbackModal: Found assessmentTemplateId from courseElementId:", assessmentTemplateId);
            }
          }
        } catch (err) {
          console.error("ScoreFeedbackModal: Failed to fetch from courseElementId:", err);
        }
      }

      if (!assessmentTemplateId) {
        console.warn("ScoreFeedbackModal: Could not find assessmentTemplateId. Data:", {
          assessmentTemplateId: data.assessmentTemplateId,
          classAssessmentId: data.classAssessmentId,
          classId: data.classId,
          courseElementId: data.courseElementId,
        });
        if (!skipSampleIfNoTemplate) {
        createSampleQuestions(submission);
        } else {
          setQuestions([]);
        }
        setLoading(false);
        return;
      }

      const finalAssessmentTemplateId = assessmentTemplateId;

      // Fetch approved assign requests (status = 5)
      let approvedAssignRequestIds = new Set<number>();
      try {
        const assignRequestResponse = await assignRequestService.getAssignRequests({
          pageNumber: 1,
          pageSize: 1000,
        });
        // Only include assign requests with status = 5 (Approved/COMPLETED)
        const approvedAssignRequests = assignRequestResponse.items.filter(ar => ar.status === 5);
        approvedAssignRequestIds = new Set(approvedAssignRequests.map(ar => ar.id));
      } catch (err) {
        console.error("ScoreFeedbackModal: Failed to fetch assign requests:", err);
        // Continue without filtering if assign requests cannot be fetched
      }

      // Fetch template and verify it has an approved assign request
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });

      // Only get template if it has an approved assign request (status = 5)
      const template = templates.items.find((t) => {
        if (t.id !== finalAssessmentTemplateId) {
          return false;
        }
        // Check if template has assignRequestId and it's in approved assign requests
        if (!t.assignRequestId) {
          return false; // Skip templates without assignRequestId
        }
        return approvedAssignRequestIds.has(t.assignRequestId);
      });

      // If template is not found or not approved, create sample data and return
      if (!template) {
        console.warn("ScoreFeedbackModal: Template not found or not approved:", finalAssessmentTemplateId);
        if (!skipSampleIfNoTemplate) {
        createSampleQuestions(submission);
        } else {
          setQuestions([]);
        }
        setLoading(false);
        return;
      }

      // Template found and approved - set flag and continue to fetch papers/questions even if empty
      templateFound = true;

      // Fetch papers
      let papersData: any[] = [];
      try {
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: finalAssessmentTemplateId,
        pageNumber: 1,
        pageSize: 100,
      });
        papersData = papersRes.items || [];
        console.log("ScoreFeedbackModal: Fetched papers:", papersData.length);
      } catch (err) {
        console.error("ScoreFeedbackModal: Failed to fetch papers:", err);
        papersData = [];
      }

      // Fetch questions and rubrics for each paper
      const allQuestions: QuestionWithRubrics[] = [];
      
      // Process papers if available, but don't require them
      if (papersData.length === 0) {
        console.warn("ScoreFeedbackModal: No papers found for template:", template.id);
        // Don't return - continue to display template even without papers/questions
        setQuestions([]);
        setLoading(false);
        return;
      }

      for (const paper of papersData) {
        try {
        const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
        });

        const paperQuestions = questionsRes.items.length > 0
          ? [...questionsRes.items].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
            : [];

          console.log(`ScoreFeedbackModal: Fetched ${paperQuestions.length} questions for paper ${paper.id}`);

          // Only process questions if we have real questions (not sample)
          if (paperQuestions.length === 0) {
            console.warn(`ScoreFeedbackModal: No questions found for paper ${paper.id}`);
            continue; // Skip this paper if no questions
          }

        for (const question of paperQuestions) {
            try {
          const rubricsRes = await rubricItemService.getRubricsForQuestion({
            assessmentQuestionId: question.id,
            pageNumber: 1,
            pageSize: 100,
          });

              const questionRubrics = rubricsRes.items || [];
              console.log(`ScoreFeedbackModal: Fetched ${questionRubrics.length} rubrics for question ${question.id}`);

              // Initialize rubric scores and comments (will be populated by useEffect when grade items are available)
          const rubricScores: { [rubricId: number]: number } = {};
              const rubricComments: { [rubricId: number]: string } = {};
              let questionComment = "";

          questionRubrics.forEach((rubric) => {
                rubricScores[rubric.id] = 0;
                rubricComments[rubric.id] = "";
          });

          allQuestions.push({
            ...question,
            rubrics: questionRubrics,
            rubricScores,
                rubricComments,
                questionComment,
              });
            } catch (err) {
              console.error(`ScoreFeedbackModal: Failed to fetch rubrics for question ${question.id}:`, err);
              // Continue with next question even if rubrics fetch fails
              // Add question without rubrics (or with empty rubrics)
              allQuestions.push({
                ...question,
                rubrics: [],
                rubricScores: {},
                rubricComments: {},
          });
        }
      }
        } catch (err) {
          console.error(`ScoreFeedbackModal: Failed to fetch questions for paper ${paper.id}:`, err);
          // Continue with next paper even if questions fetch fails
        }
      }
      if (allQuestions.length === 0) {
        // No questions found - but template is approved, so display empty questions list
        console.warn("ScoreFeedbackModal: No questions found for approved template");
        setQuestions([]);
      } else {
        // Sort questions by questionNumber
        const sortedQuestions = [...allQuestions].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );

        console.log(`ScoreFeedbackModal: Setting ${sortedQuestions.length} questions`);
        setQuestions(sortedQuestions);

        // Grade items will be mapped to questions via useEffect when both are available
      }

      // Try to load feedback from grading session if available
      if (latestGradingSession) {
        // Try to get feedback from grading logs or other sources
        // For now, we'll keep feedback empty if not available
        // The feedback might be stored in grading logs or separate feedback API
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch questions and rubrics:", err);
      // Only create sample data if template was not found/approved
      // If template was found but error happened during fetch papers/questions,
      // display template with empty questions instead of sample data
      if (!templateFound) {
        // Template not found/approved - create sample data only if not skipping
        if (!skipSampleIfNoTemplate) {
      createSampleQuestions(submission);
        } else {
          setQuestions([]);
        }
      } else {
        // Template found but error in fetch papers/questions - display with empty questions
        console.warn("ScoreFeedbackModal: Template approved but error fetching papers/questions, displaying with empty questions");
        setQuestions([]);
      }
      setLoading(false);
    }
  };

  const createSampleQuestions = (submission: Submission) => {
    // Don't create sample questions - just show empty list
    setQuestions([]);
  };


  // Check if score is available
  const hasScore = () => {
    // Check if we have a completed grading session (even with score = 0, it means graded)
    if (latestGradingSession && latestGradingSession.status === 1) {
      return true;
    }
    // Check if we have totalScore (including 0, which means graded but got 0)
    if (totalScore !== undefined && totalScore !== null) {
      return true;
    }
    // Check if we have grade items (even with score = 0, it means graded)
    if (latestGradeItems.length > 0) {
      return true;
    }
    // Check if lastSubmission has grade (including 0)
    if (lastSubmission?.lastGrade !== undefined && lastSubmission?.lastGrade !== null) {
      return true;
    }
    // Check if we have questions with rubric scores (even if 0, means grading was done)
    if (questions.length > 0 && questions.some(q => {
      const scores = Object.values(q.rubricScores || {});
      return scores.length > 0;
    })) {
      return true;
    }
    return false;
  };

  // Check if feedback is available
  const hasFeedback = () => {
    // Check overallFeedback
    if (feedback?.overallFeedback && feedback.overallFeedback.trim() !== "") {
      return true;
    }
    // Check detailed feedback sections
    if (feedback?.strengths || feedback?.weaknesses || feedback?.codeQuality ||
      feedback?.algorithmEfficiency || feedback?.suggestionsForImprovement ||
      feedback?.bestPractices || feedback?.errorHandling) {
      return true;
    }
    // Check old format feedback
    if (data.overallFeedback || data.suggestionsAvoid || data.suggestionsImprove) {
      return true;
    }
    // Check if there are comments in grade items
    if (latestGradeItems.length > 0 && latestGradeItems.some(item => item.comments && item.comments.trim() !== "")) {
      return true;
    }
    return false;
  };

  // Calculate total score from questions or use latest grading session
  const getTotalScoreDisplay = () => {
    // If we have a grading session, use totalScore (even if it's 0)
    if (latestGradingSession && latestGradingSession.status === 1) {
      // Calculate max score from questions
      const maxScore = questions.reduce((sum, q) => sum + q.score, 0);
      if (maxScore > 0) {
        return `${totalScore}/${maxScore}`;
      }
      // If no questions or maxScore is 0, just return the score (even if 0)
      return totalScore.toString();
    }

    // If we have totalScore from state, show it (even if 0 means graded but got 0)
    if (totalScore !== undefined && totalScore !== null) {
      const maxScore = questions.reduce((sum, q) => sum + q.score, 0);
      if (maxScore > 0) {
        return `${totalScore}/${maxScore}`;
      }
      return totalScore.toString();
    }

    // Fallback to lastSubmission.lastGrade if available
    if (lastSubmission?.lastGrade !== undefined && lastSubmission?.lastGrade !== null) {
      return lastSubmission.lastGrade.toString();
    }

    // If we have grade items, calculate total from them
    if (latestGradeItems.length > 0) {
      const calculatedTotal = latestGradeItems.reduce((sum, item) => sum + item.score, 0);
      const maxScore = questions.reduce((sum, q) => sum + q.score, 0);
      if (maxScore > 0) {
        return `${calculatedTotal}/${maxScore}`;
      }
      return calculatedTotal.toString();
    }

    // If we have questions with rubric scores, calculate total
    if (questions.length > 0) {
      const calculatedTotal = questions.reduce((sum, q) => {
        const questionTotal = Object.values(q.rubricScores || {}).reduce((s, score) => s + (score || 0), 0);
        return sum + questionTotal;
      }, 0);
      const maxScore = questions.reduce((sum, q) => sum + q.score, 0);
      if (maxScore > 0 && calculatedTotal > 0) {
        return `${calculatedTotal}/${maxScore}`;
      }
      if (calculatedTotal > 0) {
        return calculatedTotal.toString();
      }
    }

    // If no score available, return null to show message
    return null;
  };

  const getQuestionColumns = (question: QuestionWithRubrics): ColumnsType<RubricItem> => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: 200,
      fixed: "left" as const,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <Text strong style={{ fontSize: "13px" }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: 120,
      render: (text: string) => {
        const displayText = text && text !== "N/A" ? text : "N/A";
        return (
          <Tooltip title={displayText} placement="top">
            <Text
              code
              style={{
                fontSize: "11px",
                display: "block",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayText}
        </Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      width: 120,
      render: (text: string) => {
        const displayText = text && text !== "N/A" ? text : "N/A";
        return (
          <Tooltip title={displayText} placement="top">
            <Text
              code
              style={{
                fontSize: "11px",
                display: "block",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayText}
        </Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Max Score",
      dataIndex: "score",
      key: "maxScore",
      width: 100,
      align: "center",
      render: (score: number) => (
        <Tag color="blue" style={{ margin: 0 }}>
          {score}
        </Tag>
      ),
    },
    {
      title: "Score",
      key: "rubricScore",
      width: 80,
      align: "center",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        const maxScore = record.score;
        const scorePercentage = maxScore > 0 ? (currentScore / maxScore) * 100 : 0;
        const tagColor = scorePercentage >= 80 ? "green" : scorePercentage >= 50 ? "orange" : "red";
        return (
          <Tag color={tagColor} style={{ margin: 0, fontWeight: "bold" }}>
            {currentScore}
          </Tag>
        );
      },
    },
    {
      title: "Comments",
      key: "rubricComments",
      width: 400,
      render: (_: any, record: RubricItem) => {
        const comment = question.rubricComments?.[record.id] || "";
        if (!comment || comment === "-") {
          return <Text type="secondary" style={{ fontSize: "12px" }}>-</Text>;
        }

        // Truncate long comments for display
        const maxLength = 150;
        const isLong = comment.length > maxLength;
        const displayText = isLong ? comment.substring(0, maxLength) + "..." : comment;

        return (
          <Tooltip title={comment} placement="topLeft" overlayStyle={{ maxWidth: "500px" }}>
            <div style={{
              fontSize: "12px",
              lineHeight: "1.5",
              wordBreak: "break-word",
              maxHeight: "100px",
              overflowY: "auto",
              padding: "4px 0"
            }}>
              <Text style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {displayText}
          </Text>
            </div>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0 }}>
          Assignment Score & Feedback
        </Title>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      closeIcon={<CloseOutlined />}
    >
      <Spin spinning={loading}>
        <div className={styles.container}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Submission Information Card */}
            <Card className={styles.headerCard}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Assignment">{data.title}</Descriptions.Item>
                <Descriptions.Item label="Status">{data.status}</Descriptions.Item>
                {lastSubmission && (
                  <>
                    <Descriptions.Item label="Submission ID">{lastSubmission.id}</Descriptions.Item>
                    <Descriptions.Item label="Submitted At">
                      {lastSubmission.submittedAt
                        ? toVietnamTime(lastSubmission.submittedAt).format("DD MMM YYYY, HH:mm")
                        : "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Submission File">
                      {lastSubmission.submissionFile?.name || "N/A"}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="Total Score">
                  {getTotalScoreDisplay() !== null ? (
                  <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                      {getTotalScoreDisplay()}
                  </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: "14px" }}>
                      No score available
                    </Text>
                  )}
                </Descriptions.Item>
                {latestGradingSession && (
                  <>
                    <Descriptions.Item label="Grading Status">
                      <Tag color={
                        latestGradingSession.status === 1 ? "green" :
                          latestGradingSession.status === 2 ? "red" :
                            "orange"
                      }>
                        {latestGradingSession.status === 1 ? "Completed" :
                          latestGradingSession.status === 2 ? "Failed" :
                            "Processing"}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Grading Type">
                      <Tag color={
                        latestGradingSession.gradingType === 0 ? "blue" :
                          latestGradingSession.gradingType === 1 ? "purple" :
                            "cyan"
                      }>
                        {latestGradingSession.gradingType === 0 ? "AI" :
                          latestGradingSession.gradingType === 1 ? "Lecturer" :
                            "Both"}
                      </Tag>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>

            {/* Grading Details Card - Questions and Rubrics */}
            {questions.length > 0 && hasScore() && (
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

                          <Title level={5} style={{ marginBottom: 12 }}>
                            Grading Criteria ({question.rubrics.length})
                          </Title>
                          <div style={{ overflowX: "auto" }}>
                          <Table
                            columns={getQuestionColumns(question)}
                            dataSource={question.rubrics}
                            rowKey="id"
                            pagination={false}
                            size="small"
                              scroll={{ x: 1000 }}
                              className={styles.gradingTable}
                          />
                          </div>
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            )}

            {/* Fallback to old Grade Criteria Card if no questions */}
            {questions.length === 0 && data.gradeCriteria && data.gradeCriteria.length > 0 && (
              <Card className={styles.questionsCard}>
                <Title level={3}>Grading Details</Title>
                <Text type="secondary">
                  Total Criteria: {data.gradeCriteria.length} | Total Score: {data.totalScore}
                </Text>
                <Divider />

                <Collapse
                  defaultActiveKey={data.gradeCriteria.map((_, i) => i.toString())}
                  items={data.gradeCriteria.map((criterion, index) => {
                    return {
                      key: index.toString(),
                      label: (
                        <div className={styles.questionHeader}>
                          <span>
                            <strong>Criteria {index + 1}:</strong> {criterion.name}
                          </span>
                          <Space>
                            <Tag color="blue">
                              Score: {criterion.score}
                            </Tag>
                          </Space>
                        </div>
                      ),
                      children: (
                        <div className={styles.questionContent}>
                          <Title level={5}>Reason for this score</Title>
                          <TextArea
                            rows={4}
                            value={criterion.reason || "No reason provided."}
                            readOnly
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            )}

            <Card className={styles.feedbackCard}>
              <Spin spinning={loadingFeedback}>
              <Title level={3}>Detailed Feedback</Title>
              <Divider />

                {!hasFeedback() && !loadingFeedback ? (
                <Alert
                  message="No feedback available"
                  description="No feedback has been provided for this submission yet. Please wait for the lecturer to review your work."
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              ) : (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Title level={5}>Overall Feedback</Title>
                  <TextArea
                    rows={4}
                      value={feedback?.overallFeedback || data.overallFeedback || ""}
                    readOnly
                    placeholder="No overall feedback provided yet."
                  />
                </div>

                  {/* Show detailed feedback sections only if feedback data exists */}
                  {(feedback?.strengths || feedback?.weaknesses || feedback?.codeQuality || feedback?.algorithmEfficiency || feedback?.suggestionsForImprovement || feedback?.bestPractices || feedback?.errorHandling) && (
                    <>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Strengths</Title>
                      <TextArea
                        rows={5}
                              value={feedback?.strengths || ""}
                        readOnly
                              placeholder="No strengths feedback provided yet."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Weaknesses</Title>
                      <TextArea
                        rows={5}
                              value={feedback?.weaknesses || ""}
                        readOnly
                              placeholder="No weaknesses feedback provided yet."
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
                              value={feedback?.codeQuality || ""}
                        readOnly
                              placeholder="No code quality feedback provided yet."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Algorithm Efficiency</Title>
                      <TextArea
                        rows={4}
                              value={feedback?.algorithmEfficiency || ""}
                        readOnly
                              placeholder="No algorithm efficiency feedback provided yet."
                      />
                    </div>
                  </Col>
                </Row>

                <div>
                  <Title level={5}>Suggestions for Improvement</Title>
                  <TextArea
                    rows={4}
                          value={feedback?.suggestionsForImprovement || ""}
                    readOnly
                          placeholder="No suggestions provided yet."
                  />
                </div>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Best Practices</Title>
                      <TextArea
                        rows={3}
                              value={feedback?.bestPractices || ""}
                        readOnly
                              placeholder="No best practices feedback provided yet."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Error Handling</Title>
                      <TextArea
                        rows={3}
                              value={feedback?.errorHandling || ""}
                        readOnly
                              placeholder="No error handling feedback provided yet."
                      />
                    </div>
                  </Col>
                </Row>
                    </>
                  )}

                {/* Fallback to old format if no detailed feedback and old data exists */}
                {!feedback && data.suggestionsAvoid && (
                  <>
                    <div>
                      <Title level={5}>What you should avoid</Title>
                      <TextArea
                        rows={4}
                        value={data.suggestionsAvoid}
                        readOnly
                      />
                    </div>
                    {data.suggestionsImprove && (
                      <div>
                        <Title level={5}>What you should improve</Title>
                        <TextArea
                          rows={4}
                          value={data.suggestionsImprove}
                          readOnly
                        />
                      </div>
                    )}
                  </>
                )}
              </Space>
              )}
              </Spin>
            </Card>

            {/* Action Buttons */}
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Space>
              <Button type="primary" onClick={onCancel}>
                Close
              </Button>
              </Space>
            </div>
          </Space>
        </div>
      </Spin>

    </Modal>
  );
};
