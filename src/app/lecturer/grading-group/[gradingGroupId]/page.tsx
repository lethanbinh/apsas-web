"use client";

import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { gradingService, GradingSession } from "@/services/gradingService";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { submissionFeedbackService, SubmissionFeedback } from "@/services/submissionFeedbackService";
import { Alert } from "antd";
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  RobotOutlined,
  SaveOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Collapse,
  Input,
  InputNumber,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Select,
  Divider,
} from "antd";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/hooks/useAuth";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export default function GradingGroupPage() {
  const router = useRouter();
  const params = useParams();
  const gradingGroupId = params?.gradingGroupId ? Number(params.gradingGroupId) : null;
  const { message } = App.useApp();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoGradingLoading, setAutoGradingLoading] = useState(false);
  const [loadingAiFeedback, setLoadingAiFeedback] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [gradingGroup, setGradingGroup] = useState<GradingGroup | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<QuestionWithRubrics[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isSemesterPassed, setIsSemesterPassed] = useState(false);
  const [latestGradingSession, setLatestGradingSession] = useState<GradingSession | null>(null);
  const [latestGradeItems, setLatestGradeItems] = useState<GradeItem[]>([]);
  const [autoGradingPollIntervalRef, setAutoGradingPollIntervalRef] = useState<NodeJS.Timeout | null>(null);
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
  const [submissionFeedbackId, setSubmissionFeedbackId] = useState<number | null>(null);

  useEffect(() => {
    if (gradingGroupId) {
      fetchData();
    }
  }, [gradingGroupId]);

  useEffect(() => {
    if (selectedSubmissionId && submissions.length > 0) {
      const submission = submissions.find(s => s.id === selectedSubmissionId);
      if (submission) {
        setCurrentSubmission(submission);
        // Reset feedback when switching submissions
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
        setSubmissionFeedbackId(null);
        fetchSubmissionData(submission);
      }
    }
  }, [selectedSubmissionId, submissions]);

  const fetchData = async () => {
    if (!gradingGroupId) return;

    try {
      setLoading(true);

      // Fetch grading group
      const gradingGroups = await gradingGroupService.getGradingGroups({});
      const group = gradingGroups.find(g => g.id === gradingGroupId);
      if (!group) {
        message.error("Grading group not found");
        router.back();
        return;
      }
      setGradingGroup(group);

      // Fetch all submissions in this grading group
      const allSubmissions = await submissionService.getSubmissionList({
        gradingGroupId: gradingGroupId,
      });
      
      // Sort by student code for easier navigation
      const sortedSubmissions = [...allSubmissions].sort((a, b) => 
        (a.studentCode || "").localeCompare(b.studentCode || "")
      );
      
      setSubmissions(sortedSubmissions);

      // Select first submission by default
      if (sortedSubmissions.length > 0) {
        setSelectedSubmissionId(sortedSubmissions[0].id);
      }
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      message.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionData = async (submission: Submission) => {
    try {
      // Reset state
      setQuestions([]);
      setTotalScore(0);
      setLatestGradingSession(null);
      setLatestGradeItems([]);

      // Check semester status
      await checkSemesterStatus(submission);

      // Fetch questions and rubrics
      await fetchQuestionsAndRubrics(submission);

      // Fetch latest grading data
      await fetchLatestGradingData(submission.id);

      // Fetch feedback
      await fetchFeedback(submission.id);
    } catch (err: any) {
      console.error("Failed to fetch submission data:", err);
      message.error(err.message || "Failed to load submission data");
    }
  };

  const fetchLatestGradingData = async (submissionId: number) => {
    try {
      const gradingSessionsResult = await gradingService.getGradingSessions({
        submissionId: submissionId,
        pageNumber: 1,
        pageSize: 100,
      });

      if (gradingSessionsResult.items.length > 0) {
        const sortedSessions = [...gradingSessionsResult.items].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

        const latestSession = sortedSessions[0];
        setLatestGradingSession(latestSession);

        const gradeItemsResult = await gradeItemService.getGradeItems({
          gradingSessionId: latestSession.id,
          pageNumber: 1,
          pageSize: 1000,
        });

        const allGradeItems = gradeItemsResult.items;
        setLatestGradeItems(allGradeItems);

        const sortedItems = [...allGradeItems].sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          const createdA = new Date(a.createdAt).getTime();
          const createdB = new Date(b.createdAt).getTime();
          return createdB - createdA;
        });

        const latestGradeItemsMap = new Map<number, GradeItem>();
        sortedItems.forEach((item) => {
          if (item.rubricItemId) {
            if (!latestGradeItemsMap.has(item.rubricItemId)) {
              latestGradeItemsMap.set(item.rubricItemId, item);
            }
          }
        });

        const latestGradeItemsForDisplay = Array.from(latestGradeItemsMap.values());

        if (latestGradeItemsForDisplay.length > 0) {
          setQuestions((prevQuestions) => {
            return prevQuestions.map((question) => {
              const newRubricScores = { ...question.rubricScores };
              const newRubricComments = { ...(question.rubricComments || {}) };

              let questionComment = "";
              question.rubrics.forEach((rubric) => {
                const matchingGradeItem = latestGradeItemsForDisplay.find(
                  (item) => item.rubricItemId === rubric.id
                );
                if (matchingGradeItem) {
                  newRubricScores[rubric.id] = matchingGradeItem.score;
                  if (!questionComment && matchingGradeItem.comments) {
                    questionComment = matchingGradeItem.comments;
                  }
                }
              });

              newRubricComments[question.id] = questionComment;

              return {
                ...question,
                rubricScores: newRubricScores,
                rubricComments: newRubricComments,
              };
            });
          });
        }

        if (allGradeItems.length > 0) {
          const total = allGradeItems.reduce((sum, item) => sum + item.score, 0);
          setTotalScore(total);
        } else {
          setTotalScore(latestSession.grade);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch latest grading data:", err);
    }
  };

  const checkSemesterStatus = async (submission: Submission) => {
    // For grading group, we can skip semester check or implement if needed
    setIsSemesterPassed(false);
  };

  const fetchQuestionsAndRubrics = async (submission: Submission) => {
    const allQuestions: QuestionWithRubrics[] = [];

    try {
      if (!gradingGroup?.assessmentTemplateId) {
        setQuestions([]);
        return;
      }

      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const template = templates.items.find((t) => t.id === gradingGroup.assessmentTemplateId);

      if (!template) {
        setQuestions([]);
        return;
      }

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

      if (!papersData || papersData.length === 0) {
        setQuestions([]);
        return;
      }

      for (const paper of papersData) {
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

        if (!paperQuestions || paperQuestions.length === 0) {
          continue;
        }

        for (const question of paperQuestions) {
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

          if (!questionRubrics || questionRubrics.length === 0) {
            continue;
          }

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
        const sortedQuestions = [...allQuestions].sort((a, b) =>
          (a.questionNumber || 0) - (b.questionNumber || 0)
        ).map(q => ({
          ...q,
          rubricComments: { ...(q.rubricComments || {}) },
        }));
        setQuestions(sortedQuestions);
      }
    } catch (err: any) {
      console.error("Failed to fetch questions and rubrics:", err);
      setQuestions([]);
    }
  };

  const handleSave = async () => {
    if (!currentSubmission || !user?.id) {
      message.error("Submission or User ID not found");
      return;
    }

    if (isSemesterPassed) {
      message.warning("Cannot save grade when the semester has ended");
      return;
    }

    try {
      setSaving(true);

      // Calculate total score from rubric scores
      const calculatedTotal = questions.reduce((sum, question) => {
        const questionTotal = Object.values(question.rubricScores).reduce(
          (qSum, score) => qSum + (score || 0),
          0
        );
        return sum + questionTotal;
      }, 0);

      // Get or create grading session
      let gradingSessionId: number;
      if (latestGradingSession) {
        gradingSessionId = latestGradingSession.id;
      } else {
        // Create new grading session
        if (!gradingGroup?.assessmentTemplateId) {
          message.error("Cannot find assessment template. Please contact administrator.");
          setSaving(false);
          return;
        }

        // Create grading session
        await gradingService.createGrading({
          submissionId: currentSubmission.id,
          assessmentTemplateId: gradingGroup.assessmentTemplateId,
        });

        // Fetch the newly created session
        const gradingSessionsResult = await gradingService.getGradingSessions({
          submissionId: currentSubmission.id,
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
          setSaving(false);
          return;
        }
      }

      // Save all grade items
      for (const question of questions) {
        const questionComment = question.rubricComments?.[question.id] || "";

        for (const rubric of question.rubrics) {
          const score = question.rubricScores[rubric.id] || 0;
          const existingGradeItem = latestGradeItems.find(
            (item) => item.rubricItemId === rubric.id
          );

          if (existingGradeItem) {
            await gradeItemService.updateGradeItem(existingGradeItem.id, {
              score: score,
              comments: questionComment,
            });
          } else {
            await gradeItemService.createGradeItem({
              gradingSessionId: gradingSessionId,
              rubricItemId: rubric.id,
              score: score,
              comments: questionComment,
            });
          }
        }
      }

      // Update grading session
      await gradingService.updateGradingSession(gradingSessionId, {
        grade: calculatedTotal,
        status: 1,
      });

      message.success("Grade saved successfully");

      // Refresh grading data
      await fetchLatestGradingData(currentSubmission.id);
    } catch (err: any) {
      console.error("Failed to save grade:", err);
      message.error(err.message || "Failed to save grade");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoGrading = async () => {
    if (!currentSubmission || !gradingGroup?.assessmentTemplateId) {
      message.error("Submission or assessment template not found");
      return;
    }

    if (isSemesterPassed) {
      message.warning("Cannot use auto grading when the semester has ended");
      return;
    }

    try {
      setAutoGradingLoading(true);
      await gradingService.autoGrading({
        submissionId: currentSubmission.id,
        assessmentTemplateId: gradingGroup.assessmentTemplateId,
      });

      message.success("Auto grading started. Please wait...");

      // Poll for grading completion
      const pollInterval = setInterval(async () => {
        try {
          await fetchLatestGradingData(currentSubmission.id);
          // Check if grading is complete (you may need to adjust this logic)
          // For now, just refresh after a delay
          setTimeout(() => {
            if (autoGradingPollIntervalRef) {
              clearInterval(autoGradingPollIntervalRef);
              setAutoGradingPollIntervalRef(null);
            }
            setAutoGradingLoading(false);
            message.success("Auto grading completed");
          }, 5000);
        } catch (err) {
          console.error("Failed to poll grading status:", err);
        }
      }, 2000);

      setAutoGradingPollIntervalRef(pollInterval);
    } catch (err: any) {
      console.error("Failed to start auto grading:", err);
      message.error(err.message || "Failed to start auto grading");
      setAutoGradingLoading(false);
    }
  };

  // Feedback functions
  const serializeFeedback = (feedbackData: FeedbackData): string => {
    return JSON.stringify(feedbackData);
  };

  const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
    if (!feedbackText || feedbackText.trim() === "") {
      return {
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      };
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
      throw new Error("Parsed result is not an object");
    } catch (error) {
      return null;
    }
  };

  const fetchFeedback = async (submissionId: number) => {
    try {
      setLoadingFeedback(true);
      const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });

      if (feedbackList.length > 0) {
        const existingFeedback = feedbackList[0];
        setSubmissionFeedbackId(existingFeedback.id);
        
        let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
        
        if (parsedFeedback === null) {
          try {
            parsedFeedback = await geminiService.formatFeedback(existingFeedback.feedbackText);
          } catch (error: any) {
            console.error("Failed to parse feedback with Gemini:", error);
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
    } finally {
      setLoadingFeedback(false);
    }
  };

  const saveFeedback = async (feedbackData: FeedbackData) => {
    if (!currentSubmission) {
      throw new Error("No submission selected");
    }

    const feedbackText = serializeFeedback(feedbackData);

    if (submissionFeedbackId) {
      await submissionFeedbackService.updateSubmissionFeedback(submissionFeedbackId, {
        feedbackText: feedbackText,
      });
    } else {
      const newFeedback = await submissionFeedbackService.createSubmissionFeedback({
        submissionId: currentSubmission.id,
        feedbackText: feedbackText,
      });
      setSubmissionFeedbackId(newFeedback.id);
    }
  };

  const handleGetAiFeedback = async () => {
    if (!currentSubmission) {
      message.error("No submission selected");
      return;
    }

    if (isSemesterPassed) {
      message.warning("Cannot use AI feedback when the semester has ended");
      return;
    }

    try {
      setLoadingAiFeedback(true);
      const formattedFeedback = await gradingService.getFormattedAiFeedback(currentSubmission.id, "OpenAI");
      setFeedback(formattedFeedback);
      await saveFeedback(formattedFeedback);
      message.success("AI feedback retrieved and saved successfully!");
    } catch (error: any) {
      console.error("Failed to get AI feedback:", error);
      let errorMessage = "Failed to get AI feedback. Please try again.";
      if (error?.response?.data?.errorMessages) {
        errorMessage = error.response.data.errorMessages.join(", ");
      } else if (error?.message) {
        errorMessage = error.message;
      }
      message.error(errorMessage);
    } finally {
      setLoadingAiFeedback(false);
    }
  };

  const handleFeedbackChange = (field: keyof FeedbackData, value: string) => {
    setFeedback((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveFeedback = async () => {
    if (!currentSubmission) {
      message.error("No submission selected");
      return;
    }

    try {
      await saveFeedback(feedback);
      message.success("Feedback saved successfully");
    } catch (error: any) {
      console.error("Failed to save feedback:", error);
      message.error(error?.message || "Failed to save feedback");
    }
  };

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

    const elements: React.ReactNode[] = [];
    let currentRow: Array<typeof fields[0]> = [];

    fields.forEach((field, index) => {
      const value = feedbackData[field.key] || "";

      if (field.fullWidth) {
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
                  disabled={isSemesterPassed}
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
                        disabled={isSemesterPassed}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }

        elements.push(
          <div key={`field-${field.key}`}>
            <Title level={5}>{field.label}</Title>
            <TextArea
              rows={field.rows}
              value={value}
              onChange={(e) => handleFeedbackChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              disabled={isSemesterPassed}
            />
          </div>
        );
      } else {
        currentRow.push(field);

        if (currentRow.length === 2 || index === fields.length - 1) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  onChange={(e) => handleFeedbackChange(currentRow[0].key, e.target.value)}
                  placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
                  disabled={isSemesterPassed}
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
                        disabled={isSemesterPassed}
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

  const handlePrevious = () => {
    if (!selectedSubmissionId) return;
    const currentIndex = submissions.findIndex(s => s.id === selectedSubmissionId);
    if (currentIndex > 0) {
      setSelectedSubmissionId(submissions[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (!selectedSubmissionId) return;
    const currentIndex = submissions.findIndex(s => s.id === selectedSubmissionId);
    if (currentIndex < submissions.length - 1) {
      setSelectedSubmissionId(submissions[currentIndex + 1].id);
    }
  };

  const getCurrentIndex = () => {
    if (!selectedSubmissionId) return 0;
    return submissions.findIndex(s => s.id === selectedSubmissionId) + 1;
  };

  const updateRubricScore = (questionId: number, rubricId: number, score: number) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((question) => {
        if (question.id === questionId) {
          return {
            ...question,
            rubricScores: {
              ...question.rubricScores,
              [rubricId]: score,
            },
          };
        }
        return question;
      })
    );
  };

  const updateQuestionComment = (questionId: number, comment: string) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((question) => {
        if (question.id === questionId) {
          return {
            ...question,
            rubricComments: {
              ...(question.rubricComments || {}),
              [questionId]: comment,
            },
          };
        }
        return question;
      })
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!gradingGroup || submissions.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="No submissions found in this grading group" type="warning" />
      </div>
    );
  }

  const currentIndex = getCurrentIndex();
  const currentSubmissionData = submissions.find(s => s.id === selectedSubmissionId);

  return (
    <div className={styles.container}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                Back
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                {gradingGroup.assessmentTemplateName || "Grading Group"}
              </Title>
            </Space>
            <Space>
              <Text strong>
                {currentIndex} / {submissions.length}
              </Text>
              <Button
                icon={<LeftOutlined />}
                onClick={handlePrevious}
                disabled={currentIndex <= 1}
              >
                Previous
              </Button>
              <Select
                style={{ width: 200 }}
                value={selectedSubmissionId}
                onChange={(value) => setSelectedSubmissionId(value)}
                placeholder="Select submission"
              >
                {submissions.map((sub) => (
                  <Select.Option key={sub.id} value={sub.id}>
                    {sub.studentCode} - {sub.studentName}
                  </Select.Option>
                ))}
              </Select>
              <Button
                icon={<RightOutlined />}
                onClick={handleNext}
                disabled={currentIndex >= submissions.length}
              >
                Next
              </Button>
            </Space>
          </div>

          {isSemesterPassed && (
            <Alert
              message="Semester has ended. Grading modifications are disabled."
              type="warning"
              showIcon
            />
          )}

          {/* Current Submission Info */}
          {currentSubmissionData && (
            <Card size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <Text type="secondary">Student Code:</Text>
                  <br />
                  <Text strong>{currentSubmissionData.studentCode}</Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Student Name:</Text>
                  <br />
                  <Text strong>{currentSubmissionData.studentName}</Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Submitted At:</Text>
                  <br />
                  <Text>
                    {currentSubmissionData.submittedAt
                      ? dayjs.utc(currentSubmissionData.submittedAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")
                      : "N/A"}
                  </Text>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Total Score:</Text>
                  <br />
                  <Text strong style={{ fontSize: 18, color: "#52c41a" }}>
                    {totalScore.toFixed(2)}
                  </Text>
                </Col>
              </Row>
            </Card>
          )}

          {/* Grading Section */}
          <Card>
            <Collapse
              defaultActiveKey={["grading-details"]}
              items={[
                {
                  key: "grading-details",
                  label: (
                    <Title level={4} style={{ margin: 0 }}>
                      Grading Details
                    </Title>
                  ),
                  children: (
                    <div>
                      <Row gutter={16}>
                        <Col xs={24} md={6} lg={6}>
                          <div>
                            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                              Total Questions: {questions.length}
                            </Text>
                            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                              Total Max Score: {questions.reduce((sum, q) => {
                                return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
                              }, 0).toFixed(2)}
                            </Text>
                            <Space direction="vertical" style={{ width: "100%" }}>
                              <Button
                                type="default"
                                icon={<RobotOutlined />}
                                onClick={handleAutoGrading}
                                loading={autoGradingLoading}
                                disabled={isSemesterPassed}
                                block
                              >
                                Auto Grading
                              </Button>
                              <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={saving}
                                disabled={isSemesterPassed}
                                block
                              >
                                Save Grade
                              </Button>
                              <Button
                                type="default"
                                icon={<RobotOutlined />}
                                onClick={handleGetAiFeedback}
                                loading={loadingAiFeedback}
                                disabled={isSemesterPassed}
                                block
                              >
                                Get AI Feedback
                              </Button>
                            </Space>
                          </div>
                        </Col>
                        <Col xs={24} md={18} lg={18}>
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
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>
                                      <strong>Question {index + 1}:</strong> {question.questionText}
                                    </span>
                                    <Space>
                                      <Tag color="blue">
                                        Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
                                      </Tag>
                                    </Space>
                                  </div>
                                ),
                                children: (
                                  <div>
                                    {question.questionSampleInput && (
                                      <div style={{ marginBottom: 16 }}>
                                        <Text strong>Sample Input:</Text>
                                        <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                                          {question.questionSampleInput}
                                        </pre>
                                      </div>
                                    )}
                                    {question.questionSampleOutput && (
                                      <div style={{ marginBottom: 16 }}>
                                        <Text strong>Sample Output:</Text>
                                        <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                                          {question.questionSampleOutput}
                                        </pre>
                                      </div>
                                    )}
                                    <Divider />
                                    <div style={{ marginBottom: 16 }}>
                                      <Text strong>Criteria:</Text>
                                      <Table
                                        dataSource={question.rubrics}
                                        rowKey="id"
                                        pagination={false}
                                        columns={[
                                          {
                                            title: "Description",
                                            dataIndex: "description",
                                            key: "description",
                                            width: "50%",
                                          },
                                          {
                                            title: "Max Score",
                                            dataIndex: "score",
                                            key: "score",
                                            width: "15%",
                                            render: (score: number) => (
                                              <Tag color="green">{score}</Tag>
                                            ),
                                          },
                                          {
                                            title: "Score",
                                            key: "rubricScore",
                                            width: "20%",
                                            render: (_: any, rubric: RubricItem) => (
                                              <InputNumber
                                                min={0}
                                                max={rubric.score}
                                                value={question.rubricScores[rubric.id] || 0}
                                                onChange={(value) =>
                                                  updateRubricScore(question.id, rubric.id, value || 0)
                                                }
                                                disabled={isSemesterPassed}
                                                style={{ width: "100%" }}
                                              />
                                            ),
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
                                        ]}
                                      />
                                    </div>
                                    <div>
                                      <Text strong>Comments:</Text>
                                      <TextArea
                                        rows={3}
                                        value={question.rubricComments?.[question.id] || ""}
                                        onChange={(e) => updateQuestionComment(question.id, e.target.value)}
                                        disabled={isSemesterPassed}
                                        placeholder="Enter comments for this question..."
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

          {/* Feedback Section */}
          <Card style={{ marginTop: 24 }}>
            <Spin spinning={loadingFeedback || loadingAiFeedback}>
              <Collapse
                defaultActiveKey={[]}
                items={[
                  {
                    key: "feedback",
                    label: (
                      <Title level={4} style={{ margin: 0 }}>
                        Detailed Feedback
                      </Title>
                    ),
                    children: (
                      <div>
                        <Space direction="horizontal" style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }}>
                          <Text type="secondary">
                            Provide comprehensive feedback for the student's submission
                          </Text>
                          <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSaveFeedback}
                            disabled={loadingFeedback || loadingAiFeedback || isSemesterPassed}
                          >
                            Save Feedback
                          </Button>
                        </Space>
                        <Space direction="vertical" size="large" style={{ width: "100%" }}>
                          {renderFeedbackFields(feedback)}
                        </Space>
                      </div>
                    ),
                  },
                ]}
              />
            </Spin>
          </Card>
        </Space>
      </Card>
    </div>
  );
}

