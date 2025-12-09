// Tên file: components/AssignmentList/AssignmentItem.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { App, Typography, Alert, Upload, Modal, List, Tag, Space, Button as AntButton } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  UploadOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { Button } from "../ui/Button";
import styles from "./AssignmentList.module.css";
import { AssignmentData } from "./data";
import { RequirementModal } from "./RequirementModal";
import { ScoreFeedbackModal } from "./ScoreFeedbackModal";
import { DeadlineDisplay } from "./DeadlineDisplay";
import PaperAssignmentModal from "@/components/features/PaperAssignmentModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useStudent } from "@/hooks/useStudent";
import { useAuth } from "@/hooks/useAuth";
import { studentManagementService } from "@/services/studentManagementService";
import { submissionService, Submission } from "@/services/submissionService";
import { gradingService } from "@/services/gradingService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { gradeItemService } from "@/services/gradeItemService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { rubricItemService } from "@/services/rubricItemService";
import { queryKeys } from "@/lib/react-query";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

// Helper function to get current Vietnam time
const getCurrentVietnamTime = () => {
  return dayjs().tz("Asia/Ho_Chi_Minh");
};

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

interface AssignmentItemProps {
  data: AssignmentData;
  isExam?: boolean; // If true, hide requirement details, files, and submission
  isLab?: boolean; // If true, allow submission with max 3 attempts and auto grading
  isPracticalExam?: boolean; // If true, allow submission but only show requirement when deadline is set
}

export function AssignmentItem({ data, isExam = false, isLab = false, isPracticalExam = false }: AssignmentItemProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isRequirementModalVisible, setIsRequirementModalVisible] =
    useState(false);
  const [isScoreModalVisible, setIsScoreModalVisible] = useState(false);
  const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const { message } = App.useApp();
  const { studentId } = useStudent();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autoGradingPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch last submission using TanStack Query
  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
    queryFn: async () => {
      if (!studentId) return [];

      if (data.classAssessmentId) {
        return submissionService.getSubmissionList({
          studentId: studentId,
          classAssessmentId: data.classAssessmentId,
        });
      } else if (data.examSessionId) {
        return submissionService.getSubmissionList({
          studentId: studentId,
          examSessionId: data.examSessionId,
        });
      }
      return [];
    },
    enabled: !!studentId && (!!data.classAssessmentId || !!data.examSessionId),
  });

  // Sort submissions by updatedAt (most recent first) - use updatedAt for submission date
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0);
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0);
      return dateB - dateA;
    });
  }, [submissions]);

  const lastSubmission = sortedSubmissions.length > 0 ? sortedSubmissions[0] : null;
  const submissionCount = submissions.length;
  
  // For labs, get 3 most recent submissions (sorted, most recent first)
  const labSubmissionHistory = isLab ? sortedSubmissions.slice(0, 3) : [];
  const isLoadingSubmission = false; // useQuery handles loading state

  // Fetch grading sessions for each submission in lab history
  const labGradingSessionsQueries = useQueries({
    queries: labSubmissionHistory.map((submission) => ({
      queryKey: ['gradingSessions', 'bySubmissionId', submission.id],
      queryFn: async () => {
        const result = await gradingService.getGradingSessions({
          submissionId: submission.id,
          pageNumber: 1,
          pageSize: 100,
        });
        // Sort by createdAt desc to get latest first
        return {
          ...result,
          items: result.items.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
        };
      },
      enabled: isLab && submission.id > 0,
    })),
  });

  // Fetch grade items for each latest grading session
  const labGradeItemsQueries = useQueries({
    queries: labGradingSessionsQueries.map((sessionsQuery, index) => {
      const submission = labSubmissionHistory[index];
      const latestSession = sessionsQuery.data?.items?.[0];
      return {
        queryKey: ['gradeItems', 'byGradingSessionId', latestSession?.id],
        queryFn: async () => {
          if (!latestSession) return { items: [] };
          
          // Check if gradeItems are already in the session response
          if (latestSession.gradeItems && latestSession.gradeItems.length > 0) {
            return { items: latestSession.gradeItems };
          }
          
          // Fallback: fetch grade items separately
          return await gradeItemService.getGradeItems({
            gradingSessionId: latestSession.id,
            pageNumber: 1,
            pageSize: 1000,
          });
        },
        enabled: isLab && !!latestSession?.id,
      };
    }),
  });

  // Fetch questions and rubrics to calculate maxScore (same as ScoreFeedbackModal)
  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(data.assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: data.assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: isLab && !!data.assessmentTemplateId,
  });

  // Fetch questions for each paper
  const questionsQueries = useQueries({
    queries: (papersData?.items || []).map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: isLab && !!data.assessmentTemplateId && (papersData?.items || []).length > 0,
    })),
  });

  // Fetch rubrics for each question
  const allQuestionIds = useMemo(() => {
    const ids: number[] = [];
    questionsQueries.forEach((query) => {
      if (query.data?.items) {
        query.data.items.forEach((q: any) => ids.push(q.id));
      }
    });
    return ids;
  }, [questionsQueries]);

  const rubricsQueries = useQueries({
    queries: allQuestionIds.map((questionId) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(questionId),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: questionId,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: isLab && !!data.assessmentTemplateId && allQuestionIds.length > 0,
    })),
  });

  // Build questions with rubrics (same structure as ScoreFeedbackModal)
  const questions = useMemo(() => {
    const questionsList: any[] = [];
    let questionIndex = 0;
    
    (papersData?.items || []).forEach((paper, paperIndex) => {
      const paperQuestionsQuery = questionsQueries[paperIndex];
      if (!paperQuestionsQuery?.data?.items) return;

      const paperQuestions = [...paperQuestionsQuery.data.items].sort(
        (a: any, b: any) => (a.questionNumber || 0) - (b.questionNumber || 0)
      );

      paperQuestions.forEach((question: any) => {
        const rubricQuery = rubricsQueries[questionIndex];
        const questionRubrics = rubricQuery?.data?.items || [];
        
        // Calculate question max score from rubrics
        const questionMaxScore = questionRubrics.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
        
        questionsList.push({
          ...question,
          rubrics: questionRubrics,
          score: questionMaxScore, // Question max score (sum of all rubric max scores)
        });
        
        questionIndex++;
      });
    });
    
    return questionsList;
  }, [papersData, questionsQueries, rubricsQueries]);

  // Calculate max score from questions (same as ScoreFeedbackModal)
  const maxScore = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.score || 0), 0);
  }, [questions]);

  // Calculate total scores for each submission in lab history (same logic as ScoreFeedbackModal)
  const labSubmissionScores = useMemo(() => {
    const scoreMap: Record<number, { total: number; max: number }> = {};
    
    labSubmissionHistory.forEach((submission, index) => {
      const gradeItemsQuery = labGradeItemsQueries[index];
      const sessionsQuery = labGradingSessionsQueries[index];
      
      // Calculate total score from grade items (same logic as ScoreFeedbackModal)
      if (gradeItemsQuery?.data?.items && gradeItemsQuery.data.items.length > 0) {
        const totalScore = gradeItemsQuery.data.items.reduce((sum: number, item: any) => sum + (item.score || 0), 0);
        scoreMap[submission.id] = { total: totalScore, max: maxScore };
      } else if (sessionsQuery?.data?.items?.[0]?.grade !== undefined && sessionsQuery.data.items[0].grade !== null) {
        // Fallback to grading session grade
        scoreMap[submission.id] = { total: sessionsQuery.data.items[0].grade, max: maxScore };
      }
    });
    
    return scoreMap;
  }, [labSubmissionHistory, labGradeItemsQueries, labGradingSessionsQueries, maxScore]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (autoGradingPollIntervalRef.current) {
        clearInterval(autoGradingPollIntervalRef.current);
        autoGradingPollIntervalRef.current = null;
      }
    };
  }, []);

  // Check if deadline exists
  const hasDeadline = () => {
    return !!data.date;
  };

  // Check if start date exists
  const hasStartDate = () => {
    return !!data.startAt;
  };

  // Check if deadline has passed (using Vietnam time)
  const isDeadlinePassed = () => {
    if (!data.date) return false;
    const currentTime = getCurrentVietnamTime();
    const deadlineTime = toVietnamTime(data.date);
    return currentTime.isAfter(deadlineTime);
  };

  // Check if start date has not arrived yet (using Vietnam time)
  const isBeforeStartDate = () => {
    if (!data.startAt) return false;
    const currentTime = getCurrentVietnamTime();
    const startTime = toVietnamTime(data.startAt);
    return currentTime.isBefore(startTime);
  };

  // Check if current time is within submission window (between startAt and endAt)
  const isWithinSubmissionWindow = () => {
    if (!data.startAt || !data.date) return false;
    const currentTime = getCurrentVietnamTime();
    const startTime = toVietnamTime(data.startAt);
    const endTime = toVietnamTime(data.date);
    return (currentTime.isAfter(startTime) || currentTime.isSame(startTime, 'minute')) && 
           (currentTime.isBefore(endTime) || currentTime.isSame(endTime, 'minute'));
  };

  const canSubmit = () => {
    if (!hasDeadline()) return false;
    if (hasStartDate() && isBeforeStartDate()) return false;
    if (isDeadlinePassed()) return false;
    return true;
  };

  // Mutation for creating or updating submission
  const submitMutation = useMutation({
    mutationFn: async ({ file, studentCode, submissionId }: { file: File; studentCode: string; submissionId?: number }) => {
      const newFileName = studentCode ? `${studentCode}.zip` : file.name;
      const renamedFile = new File([file], newFileName, { type: file.type });

      // For labs, always create a new submission (max 3 times)
      // For assignments/exams, update existing submission if available, otherwise create new
      if (isLab) {
        return submissionService.createSubmission({
          StudentId: studentId!,
          ClassAssessmentId: data.classAssessmentId,
          ExamSessionId: data.examSessionId,
          file: renamedFile,
        });
      } else {
        // For assignments/exams: update if exists, create if not
      if (submissionId) {
        return submissionService.updateSubmission(submissionId, {
          file: renamedFile,
        });
      } else {
        return submissionService.createSubmission({
          StudentId: studentId!,
          ClassAssessmentId: data.classAssessmentId,
          ExamSessionId: data.examSessionId,
          file: renamedFile,
        });
        }
      }
    },
    onSuccess: async (newSubmission) => {
      // Invalidate and refetch submissions queries - match exact query key
      await queryClient.invalidateQueries({ 
        queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
        exact: false 
      });
      // Also invalidate all submissions queries for this student
      await queryClient.invalidateQueries({ 
        queryKey: ['submissions', 'byStudent', studentId],
        exact: false 
      });
      // Invalidate lecturer pages queries
      await queryClient.invalidateQueries({ 
        queryKey: ['submissions', 'byClassAssessments'],
        exact: false 
      });
      // Invalidate all submissions queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
      
      // Refetch the current query to get latest data immediately
      await queryClient.refetchQueries({ 
        queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
        type: 'active'
      });
      
      // Refetch lecturer pages queries if they're active
      await queryClient.refetchQueries({ 
        queryKey: ['submissions', 'byClassAssessments'],
        type: 'active'
      });

      // For labs, trigger auto grading and AI feedback after submission
      if (isLab && data.assessmentTemplateId) {
        try {
          const gradingSession = await gradingService.autoGrading({
            submissionId: newSubmission.id,
            assessmentTemplateId: data.assessmentTemplateId,
          });

          if (gradingSession.status === 0) {
            message.loading("Auto grading in progress...", 0);

            const pollInterval = setInterval(async () => {
              try {
                const sessionsResult = await gradingService.getGradingSessions({
                  submissionId: newSubmission.id,
                  pageNumber: 1,
                  pageSize: 100,
                });

                if (sessionsResult.items.length > 0) {
                  const sortedSessions = [...sessionsResult.items].sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA;
                  });

                  const latestSession = sortedSessions[0];

                  if (latestSession.status !== 0) {
                    if (autoGradingPollIntervalRef.current) {
                      clearInterval(autoGradingPollIntervalRef.current);
                      autoGradingPollIntervalRef.current = null;
                    }
                    message.destroy();

                    // Invalidate grading queries
                    queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
                    // Invalidate grading sessions for this specific submission (used in submission history)
                    queryClient.invalidateQueries({ 
                      queryKey: ['gradingSessions', 'bySubmissionId', newSubmission.id],
                      exact: false 
                    });
                    // Invalidate all grade items queries
                    queryClient.invalidateQueries({ 
                      queryKey: ['gradeItems'],
                      exact: false 
                    });
                    // Refetch queries to update submission history scores
                    queryClient.refetchQueries({ 
                      queryKey: ['gradingSessions', 'bySubmissionId', newSubmission.id],
                      type: 'active'
                    });
                    queryClient.refetchQueries({ 
                      queryKey: ['gradeItems'],
                      type: 'active'
                    });

                    if (latestSession.status === 1) {
                      message.success("Auto grading completed successfully");
                      
                      // After grading completes, trigger AI feedback
                      try {
                        message.loading("Getting AI feedback...", 0);
                        await gradingService.getFormattedAiFeedback(newSubmission.id, "OpenAI");
                        message.destroy();
                        message.loading("AI feedback in progress...", 0);
                        
                        // Start polling for AI feedback status (check if feedback exists)
                        const feedbackPollInterval = setInterval(async () => {
                          try {
                            const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
                              submissionId: newSubmission.id,
                            });
                            
                            if (feedbackList && feedbackList.length > 0 && feedbackList[0].feedbackText) {
                              clearInterval(feedbackPollInterval);
                              message.destroy();
                              queryClient.invalidateQueries({ queryKey: ['submissionFeedback', 'bySubmissionId', newSubmission.id] });
                              // Refetch submissions to update submission history
                              await queryClient.invalidateQueries({ 
                                queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
                                exact: false 
                              });
                              // Invalidate grading sessions for this specific submission (used in submission history)
                              await queryClient.invalidateQueries({ 
                                queryKey: ['gradingSessions', 'bySubmissionId', newSubmission.id],
                                exact: false 
                              });
                              // Invalidate all grading sessions queries
                              await queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
                              // Invalidate all grade items queries (pattern matching)
                              await queryClient.invalidateQueries({ 
                                queryKey: ['gradeItems'],
                                exact: false 
                              });
                              // Refetch all active queries including submissions, grading sessions, and grade items
                              await queryClient.refetchQueries({ 
                                queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
                                type: 'active'
                              });
                              await queryClient.refetchQueries({ 
                                queryKey: ['gradingSessions', 'bySubmissionId'],
                                type: 'active'
                              });
                              await queryClient.refetchQueries({ 
                                queryKey: ['gradeItems'],
                                type: 'active'
                              });
                              message.success("AI feedback generated successfully!");
                            }
                          } catch (err: any) {
                            console.error("Failed to poll AI feedback status:", err);
                          }
                        }, 5000); // Poll every 5 seconds
                        
                        // Store interval reference
                        (window as any).aiFeedbackPollInterval = feedbackPollInterval;
                        
                        // Timeout after 5 minutes
                        setTimeout(() => {
                          if ((window as any).aiFeedbackPollInterval) {
                            clearInterval((window as any).aiFeedbackPollInterval);
                            (window as any).aiFeedbackPollInterval = null;
                          }
                          message.destroy();
                        }, 300000);
                      } catch (feedbackErr: any) {
                        console.error("Failed to get AI feedback:", feedbackErr);
                        message.destroy();
                        message.warning("Auto grading completed, but AI feedback failed to generate.");
                      }
                    } else if (latestSession.status === 2) {
                      message.error("Auto grading failed");
                    }
                  }
                }
              } catch (err: any) {
                console.error("Failed to poll grading status:", err);
                if (autoGradingPollIntervalRef.current) {
                  clearInterval(autoGradingPollIntervalRef.current);
                  autoGradingPollIntervalRef.current = null;
                }
                message.destroy();
                message.error(err.message || "Failed to check grading status");
              }
            }, 5000); // Poll every 5 seconds

            autoGradingPollIntervalRef.current = pollInterval;

            setTimeout(() => {
              if (autoGradingPollIntervalRef.current) {
                clearInterval(autoGradingPollIntervalRef.current);
                autoGradingPollIntervalRef.current = null;
              }
              message.destroy();
            }, 300000);
          } else {
            if (gradingSession.status === 1) {
              message.success("Auto grading completed successfully");
              
              // Invalidate and refetch queries to update submission history scores
              queryClient.invalidateQueries({ 
                queryKey: ['gradingSessions', 'bySubmissionId', newSubmission.id],
                exact: false 
              });
              queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
              queryClient.invalidateQueries({ 
                queryKey: ['gradeItems'],
                exact: false 
              });
              queryClient.refetchQueries({ 
                queryKey: ['gradingSessions', 'bySubmissionId', newSubmission.id],
                type: 'active'
              });
              queryClient.refetchQueries({ 
                queryKey: ['gradeItems'],
                type: 'active'
              });
              
              // After grading completes, trigger AI feedback
              try {
                message.loading("Getting AI feedback...", 0);
                await gradingService.getFormattedAiFeedback(newSubmission.id, "OpenAI");
                message.destroy();
                message.loading("AI feedback in progress...", 0);
                
                // Start polling for AI feedback status
                const feedbackPollInterval = setInterval(async () => {
                  try {
                    const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
                      submissionId: newSubmission.id,
                    });
                    
                    if (feedbackList && feedbackList.length > 0 && feedbackList[0].feedbackText) {
                      clearInterval(feedbackPollInterval);
                      message.destroy();
                      queryClient.invalidateQueries({ queryKey: ['submissionFeedback', 'bySubmissionId', newSubmission.id] });
                      // Refetch submissions to update submission history
                      await queryClient.invalidateQueries({ 
                        queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
                        exact: false 
                      });
                      // Invalidate grading sessions for this specific submission (used in submission history)
                      await queryClient.invalidateQueries({ 
                        queryKey: ['gradingSessions', 'bySubmissionId', newSubmission.id],
                        exact: false 
                      });
                      // Invalidate all grading sessions queries
                      await queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
                      // Invalidate all grade items queries (pattern matching)
                      await queryClient.invalidateQueries({ 
                        queryKey: ['gradeItems'],
                        exact: false 
                      });
                      // Refetch all active queries including submissions, grading sessions, and grade items
                      await queryClient.refetchQueries({ 
                        queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
                        type: 'active'
                      });
                      await queryClient.refetchQueries({ 
                        queryKey: ['gradingSessions', 'bySubmissionId'],
                        type: 'active'
                      });
                      await queryClient.refetchQueries({ 
                        queryKey: ['gradeItems'],
                        type: 'active'
                      });
                      message.success("AI feedback generated successfully!");
                    }
                  } catch (err: any) {
                    console.error("Failed to poll AI feedback status:", err);
                  }
                }, 5000); // Poll every 5 seconds
                
                // Store interval reference
                (window as any).aiFeedbackPollInterval = feedbackPollInterval;
                
                // Timeout after 5 minutes
                setTimeout(() => {
                  if ((window as any).aiFeedbackPollInterval) {
                    clearInterval((window as any).aiFeedbackPollInterval);
                    (window as any).aiFeedbackPollInterval = null;
                  }
                  message.destroy();
                }, 300000);
              } catch (feedbackErr: any) {
                console.error("Failed to get AI feedback:", feedbackErr);
                message.destroy();
                message.warning("Auto grading completed, but AI feedback failed to generate.");
              }
            } else if (gradingSession.status === 2) {
              message.error("Auto grading failed");
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
          }
        } catch (gradingErr: any) {
          console.error("Failed to start auto grading:", gradingErr);
          message.destroy();
          message.warning("Submission submitted, but auto grading failed to start. Please contact your lecturer.");
        }
      } else {
        message.success("Your assignment has been submitted successfully!");
      }

      setFileList([]);
      setIsSubmitModalVisible(false);
    },
    onError: (err: any) => {
      console.error("Failed to submit assignment:", err);
      message.error(err.message || "Failed to submit assignment. Please try again.");
    },
  });

  const handleSubmit = async () => {
    if (fileList.length === 0 || !studentId) {
      message.warning("Please select a file to submit");
      return;
    }

    const file = fileList[0].originFileObj as File;
    if (!file) {
      message.warning("Please select a valid file");
      return;
    }

    // Validate file type - must be zip
    const isZip = file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      file.name.toLowerCase().endsWith(".zip");
    if (!isZip) {
      message.error("Chỉ chấp nhận file ZIP. Vui lòng chọn file ZIP để nộp.");
      return;
    }

    // Check submission limit for labs (max 3 times)
    if (isLab && submissionCount >= 3) {
      message.error("You have reached the maximum submission limit (3 times).");
      return;
    }

    // Check deadline
    if (!hasDeadline()) {
      message.error("This assignment does not have a deadline yet. Please wait for the lecturer to set the deadline before submitting.");
      return;
    }
    
    // Check start date - if exists, must be after start date
    if (hasStartDate() && isBeforeStartDate()) {
      const startTime = toVietnamTime(data.startAt!);
      message.error(`Submission is not yet open. The submission period starts on ${startTime.format("DD/MM/YYYY HH:mm")}.`);
      return;
    }
    
    // Check end date - must be before deadline
    if (isDeadlinePassed()) {
      message.error("The deadline has passed. You can no longer submit.");
      return;
    }
    
    // Final check
    if (!canSubmit()) {
      message.error("You cannot submit at this time. Please check the submission period.");
      return;
    }

    // Get studentCode
    let studentCode = user?.accountCode || "";
    if (!studentCode) {
      try {
        const students = await studentManagementService.getStudentList();
        const currentUserAccountId = String(user?.id);
        const matchingStudent = students.find(
          (stu) => stu.accountId === currentUserAccountId
        );
        if (matchingStudent) {
          studentCode = matchingStudent.accountCode;
        }
      } catch (err) {
        console.error("Failed to fetch student code:", err);
      }
    }

    // For labs, always create new submission (don't pass submissionId)
    // For assignments/exams, update existing submission if available
    const submissionId = isLab ? undefined : lastSubmission?.id;
    submitMutation.mutate({ file, studentCode, submissionId });
  };

  const isSubmitting = submitMutation.isPending;

  const uploadProps = {
    fileList,
    onRemove: (file: UploadFile) => {
      setFileList((prevList) => prevList.filter((f) => f.uid !== file.uid));
    },
    beforeUpload: (file: File) => {
      // Validate file type - must be zip
      const isZip = file.type === "application/zip" ||
        file.type === "application/x-zip-compressed" ||
        file.name.toLowerCase().endsWith(".zip");
      if (!isZip) {
        message.error("Chỉ chấp nhận file ZIP. Vui lòng chọn file ZIP để nộp.");
        return false;
      }

      // Create UploadFile object with originFileObj
      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file as any, // Cast to any to satisfy RcFile type
      };
      setFileList([uploadFile]);
      return false; // Prevent auto upload
    },
  };

  return (
    <div className={styles.itemContent}>
      {(!isExam || isPracticalExam) && (
        <>
          {/* For practical exam, only show requirements when deadline is set */}
          {(!isPracticalExam || hasDeadline()) && (
            <div className={styles.contentSection}>
              <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
                Requirements
              </Title>
              <div className={styles.requirementButtons}>
                <Button
                  variant="outline"
                  onClick={() => setIsRequirementModalVisible(true)}
                  className={styles.viewRequirementButton}
                  icon={<EyeOutlined />}
                >
                  View Requirement Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsScoreModalVisible(true)}
                  className={styles.viewScoreButton}
                  icon={<EyeOutlined />}
                >
                  View Score & Feedback
                </Button>
              </div>

              <div className={styles.downloadSection}>
                {data.requirementFile && (
                  <Alert
                    message={
                      <a
                        href={data.requirementFileUrl || "#"}
                        download={data.requirementFile}
                        target={data.requirementFileUrl ? "_blank" : undefined}
                        rel={data.requirementFileUrl ? "noopener noreferrer" : undefined}
                      >
                        {data.requirementFile}
                      </a>
                    }
                    type="info"
                    showIcon
                    icon={<FilePdfOutlined />}
                    className={styles.requirementAlert}
                  />
                )}
                {data.databaseFile && (
                  <Alert
                    message={
                      <a
                        href={data.databaseFileUrl || "#"}
                        download={data.databaseFile}
                        target={data.databaseFileUrl ? "_blank" : undefined}
                        rel={data.databaseFileUrl ? "noopener noreferrer" : undefined}
                      >
                        {data.databaseFile}
                      </a>
                    }
                    type="info"
                    showIcon
                    icon={<DatabaseOutlined />}
                    className={styles.requirementAlert}
                  />
                )}
              </div>
            </div>
          )}

          {/* Submission Period - moved above Your Submission */}
          <div className={styles.contentSection} style={{ marginTop: "24px" }}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              {data.startAt ? "Submission Period" : "Deadline"}
            </Title>
            <DeadlineDisplay date={data.date} startDate={data.startAt} />
          </div>

          {/* Lab Submission History - only for labs */}
          {isLab && labSubmissionHistory.length > 0 && (
            <div className={styles.contentSection} style={{ marginTop: "24px" }}>
              <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
                <HistoryOutlined style={{ marginRight: 8 }} />
                Submission History
              </Title>
              <List
                size="small"
                dataSource={labSubmissionHistory}
                renderItem={(submission, index) => (
                  <List.Item
                    style={{
                      padding: "8px 12px",
                      backgroundColor: index === 0 ? "#f0f9ff" : "#fafafa",
                      border: index === 0 ? "1px solid #1890ff" : "1px solid #e8e8e8",
                      borderRadius: "4px",
                      marginBottom: "8px",
                    }}
                    actions={
                      submission.submissionFile?.submissionUrl
                        ? [
                            <AntButton
                              key="download"
                              type="link"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = submission.submissionFile!.submissionUrl;
                                link.download = submission.submissionFile!.name || "submission.zip";
                                link.target = "_blank";
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              Download
                            </AntButton>,
                          ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong style={{ fontSize: "13px" }}>
                            {toVietnamTime(submission.updatedAt || submission.submittedAt).format("DD/MM/YYYY HH:mm")}
                          </Text>
                          {index === 0 && <Tag color="blue">Latest</Tag>}
                          {labSubmissionScores[submission.id] !== undefined && (
                            <Tag color="green">
                              Score: {labSubmissionScores[submission.id].max > 0
                                ? `${Number(labSubmissionScores[submission.id].total).toFixed(2)}/${Number(labSubmissionScores[submission.id].max).toFixed(2)}`
                                : Number(labSubmissionScores[submission.id].total).toFixed(2)}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        submission.submissionFile ? (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            <FileTextOutlined style={{ marginRight: 4 }} />
                            {submission.submissionFile.name}
                          </Text>
                        ) : (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            No file
                          </Text>
                        )
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* Your Submission - full section for assignments */}
          {!isLab && (
            <div className={styles.submissionSection}>
              <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
                Your Submission
              </Title>

              {lastSubmission && (
                <Alert
                  message="Last Submission"
                  description={
                    <div>
                      <Text>
                        Submitted on: {toVietnamTime(lastSubmission.updatedAt || lastSubmission.submittedAt).format("DD MMM YYYY, HH:mm")}
                      </Text>
                      {lastSubmission.submissionFile && (
                        <div style={{ marginTop: "8px" }}>
                          <Text strong>File: </Text>
                          <a
                            href={lastSubmission.submissionFile.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {lastSubmission.submissionFile.name}
                          </a>
                        </div>
                      )}
                    </div>
                  }
                  type="info"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  style={{ marginBottom: "16px" }}
                />
              )}

              {!hasDeadline() ? (
                <Alert
                  message="No Deadline Set"
                  description="This assignment does not have a deadline yet. Please wait for the lecturer to set the deadline before submitting."
                  type="info"
                  showIcon
                  icon={<ClockCircleOutlined />}
                />
              ) : isDeadlinePassed() ? (
                <Alert
                  message="Deadline Passed"
                  description="The submission deadline has passed. You can no longer submit."
                  type="warning"
                  showIcon
                  icon={<ClockCircleOutlined />}
                />
              ) : (
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => setIsSubmitModalVisible(true)}
                  disabled={!canSubmit()}
                  className={styles.submitButton}
                  icon={<UploadOutlined />}
                >
                  {lastSubmission ? "Resubmit Assignment" : "Submit Assignment"}
                </Button>
              )}
            </div>
          )}

          {/* Submit button only for labs */}
          {isLab && (
            <div style={{ marginTop: "16px" }}>
              <Button
                variant="primary"
                size="large"
                onClick={() => setIsSubmitModalVisible(true)}
                disabled={!canSubmit() || submissionCount >= 3}
                className={styles.submitButton}
                icon={<UploadOutlined />}
              >
                {submissionCount >= 3
                  ? "Maximum Submissions Reached"
                  : lastSubmission
                    ? `Resubmit Lab (${submissionCount}/3)`
                    : `Submit Lab (${submissionCount}/3)`}
              </Button>
            </div>
          )}
        </>
      )}

      {isExam && !isPracticalExam && (
        <>
          <div className={styles.contentSection} style={{ marginTop: "24px" }}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              {data.startAt ? "Submission Period" : "Deadline"}
            </Title>
            <DeadlineDisplay date={data.date} startDate={data.startAt} />
          </div>

          <div className={styles.contentSection} style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e6f7ff" }}>
            <Title level={5} style={{ fontWeight: 600, marginBottom: "12px" }}>
              Results
            </Title>
            <Button
              variant="outline"
              onClick={() => setIsScoreModalVisible(true)}
              className={styles.viewScoreButtonExam}
              icon={<EyeOutlined />}
            >
              View Score & Feedback
            </Button>
          </div>
        </>
      )}

      {(!isExam || isPracticalExam) && (
        <RequirementModal
          open={isRequirementModalVisible}
          onCancel={() => setIsRequirementModalVisible(false)}
          title={data.title}
          content={data.requirementContent}
          classAssessmentId={data.classAssessmentId}
          classId={data.classId}
          assessmentTemplateId={data.assessmentTemplateId}
          courseElementId={data.courseElementId}
          examSessionId={data.examSessionId}
        />
      )}

      <ScoreFeedbackModal
        open={isScoreModalVisible}
        onCancel={() => setIsScoreModalVisible(false)}
        data={data}
      />

      {isLab && data.assessmentTemplateId && (
        <PaperAssignmentModal
          isOpen={isPaperModalVisible}
          onClose={() => setIsPaperModalVisible(false)}
          classAssessmentId={data.classAssessmentId}
          classId={data.classId}
        />
      )}

      {/* Submit Modal */}
      <Modal
        title={isLab
          ? (lastSubmission ? `Resubmit Lab (${submissionCount}/3)` : `Submit Lab (${submissionCount}/3)`)
          : (lastSubmission ? "Resubmit Assignment" : "Submit Assignment")
        }
        open={isSubmitModalVisible}
        onCancel={() => {
          setIsSubmitModalVisible(false);
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            {isLab && (
              <div style={{ marginBottom: 8 }}>
                Submission attempts: {submissionCount}/3
                {submissionCount >= 3 && (
                  <span style={{ color: "#ff4d4f", marginLeft: "8px" }}>
                    (Maximum limit reached)
                  </span>
                )}
              </div>
            )}
            {!isLab && lastSubmission && (
              <div style={{ marginBottom: 8 }}>
                You can submit multiple times. The latest submission will be used.
              </div>
            )}
          </Text>
        </div>
        <Dragger {...uploadProps} accept=".zip" disabled={!canSubmit() || (isLab && submissionCount >= 3)}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">
            Drag & drop your ZIP file here, or click to browse
          </p>
          <p className="ant-upload-hint" style={{ color: "#999", fontSize: "12px" }}>
            Chỉ chấp nhận file ZIP
          </p>
        </Dragger>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button
            onClick={() => {
              setIsSubmitModalVisible(false);
              setFileList([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={fileList.length === 0 || !canSubmit() || (isLab && submissionCount >= 3)}
          >
            Submit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
