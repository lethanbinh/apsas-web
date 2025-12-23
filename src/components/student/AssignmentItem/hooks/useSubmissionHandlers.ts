import { useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useStudent } from "@/hooks/useStudent";
import { useAuth } from "@/hooks/useAuth";
import { studentManagementService } from "@/services/studentManagementService";
import { submissionService } from "@/services/submissionService";
import { gradingService } from "@/services/gradingService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { queryKeys } from "@/lib/react-query";
import { AssignmentData } from "../../data";
import { toVietnamTime, getCurrentVietnamTime } from "../utils";
export const useSubmissionHandlers = (
  data: AssignmentData,
  isLab: boolean,
  lastSubmission: any,
  submissionCount: number
) => {
  const { message } = App.useApp();
  const { studentId } = useStudent();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autoGradingPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (autoGradingPollIntervalRef.current) {
        clearInterval(autoGradingPollIntervalRef.current);
        autoGradingPollIntervalRef.current = null;
      }
    };
  }, []);
  const hasDeadline = () => {
    return !!data.date;
  };
  const hasStartDate = () => {
    return !!data.startAt;
  };
  const isDeadlinePassed = () => {
    if (!data.date) return false;
    const currentTime = getCurrentVietnamTime();
    const deadlineTime = toVietnamTime(data.date);
    return currentTime.isAfter(deadlineTime);
  };
  const isBeforeStartDate = () => {
    if (!data.startAt) return false;
    const currentTime = getCurrentVietnamTime();
    const startTime = toVietnamTime(data.startAt);
    return currentTime.isBefore(startTime);
  };
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
  const pollGradingStatus = async (submissionId: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const sessionsResult = await gradingService.getGradingSessions({
          submissionId: submissionId,
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
            queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
            queryClient.invalidateQueries({
              queryKey: ['gradingSessions', 'bySubmissionId', submissionId],
              exact: false
            });
            queryClient.invalidateQueries({
              queryKey: ['gradeItems'],
              exact: false
            });
            queryClient.refetchQueries({
              queryKey: ['gradingSessions', 'bySubmissionId', submissionId],
              type: 'active'
            });
            queryClient.refetchQueries({
              queryKey: ['gradeItems'],
              type: 'active'
            });
            if (latestSession.status === 1) {
              message.success("Auto grading completed successfully");
              await handleAiFeedback(submissionId);
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
    }, 5000);
    autoGradingPollIntervalRef.current = pollInterval;
    setTimeout(() => {
      if (autoGradingPollIntervalRef.current) {
        clearInterval(autoGradingPollIntervalRef.current);
        autoGradingPollIntervalRef.current = null;
      }
      message.destroy();
    }, 300000);
  };
  const handleAiFeedback = async (submissionId: number) => {
    try {
      message.loading("Getting AI feedback...", 0);
      await gradingService.getFormattedAiFeedback(submissionId, "OpenAI");
      message.destroy();
      message.loading("AI feedback in progress...", 0);
      const feedbackPollInterval = setInterval(async () => {
        try {
          const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
            submissionId: submissionId,
          });
          if (feedbackList && feedbackList.length > 0 && feedbackList[0].feedbackText) {
            clearInterval(feedbackPollInterval);
            message.destroy();
            queryClient.invalidateQueries({ queryKey: ['submissionFeedback', 'bySubmissionId', submissionId] });
            await queryClient.invalidateQueries({
              queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
              exact: false
            });
            await queryClient.invalidateQueries({
              queryKey: ['gradingSessions', 'bySubmissionId', submissionId],
              exact: false
            });
            await queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
            await queryClient.invalidateQueries({
              queryKey: ['gradeItems'],
              exact: false
            });
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
      }, 5000);
      (window as any).aiFeedbackPollInterval = feedbackPollInterval;
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
  };
  const submitMutation = useMutation({
    mutationFn: async ({ file, studentCode, submissionId }: { file: File; studentCode: string; submissionId?: number }) => {
      const newFileName = studentCode ? `${studentCode}.zip` : file.name;
      const renamedFile = new File([file], newFileName, { type: file.type });
      if (isLab) {
        return submissionService.createSubmission({
          StudentId: studentId!,
          ClassAssessmentId: data.classAssessmentId,
          ExamSessionId: data.examSessionId,
          file: renamedFile,
        });
      } else {
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
      await queryClient.invalidateQueries({
        queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
        exact: false
      });
      await queryClient.invalidateQueries({
        queryKey: ['submissions', 'byStudent', studentId],
        exact: false
      });
      await queryClient.invalidateQueries({
        queryKey: ['submissions', 'byClassAssessments'],
        exact: false
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
      await queryClient.refetchQueries({
        queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
        type: 'active'
      });
      await queryClient.refetchQueries({
        queryKey: ['submissions', 'byClassAssessments'],
        type: 'active'
      });
      if (isLab && data.assessmentTemplateId) {
        try {
          const gradingSession = await gradingService.autoGrading({
            submissionId: newSubmission.id,
            assessmentTemplateId: data.assessmentTemplateId,
          });
          if (gradingSession.status === 0) {
            message.loading("Auto grading in progress...", 0);
            await pollGradingStatus(newSubmission.id);
          } else {
            if (gradingSession.status === 1) {
              message.success("Auto grading completed successfully");
              await handleAiFeedback(newSubmission.id);
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
    },
    onError: (err: any) => {
      console.error("Failed to submit assignment:", err);
      message.error(err.message || "Failed to submit assignment. Please try again.");
    },
  });
  const handleSubmit = async (file: File) => {
    if (!studentId) {
      message.warning("Please select a file to submit");
      return;
    }
    const isZip = file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      file.name.toLowerCase().endsWith(".zip");
    if (!isZip) {
      message.error("Only Accept zip's file. Please choose zip's file to submit");
      return;
    }
    if (isLab && submissionCount >= 3) {
      message.error("You have reached the maximum submission limit (3 times).");
      return;
    }
    if (!hasDeadline()) {
      message.error("This assignment does not have a deadline yet. Please wait for the lecturer to set the deadline before submitting.");
      return;
    }
    if (hasStartDate() && isBeforeStartDate()) {
      const startTime = toVietnamTime(data.startAt!);
      message.error(`Submission is not yet open. The submission period starts on ${startTime.format("DD/MM/YYYY HH:mm")}.`);
      return;
    }
    if (isDeadlinePassed()) {
      message.error("The deadline has passed. You can no longer submit.");
      return;
    }
    if (!canSubmit()) {
      message.error("You cannot submit at this time. Please check the submission period.");
      return;
    }
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
    const submissionId = isLab ? undefined : lastSubmission?.id;
    submitMutation.mutate({ file, studentCode, submissionId });
  };
  return {
    handleSubmit,
    canSubmit,
    hasDeadline,
    hasStartDate,
    isDeadlinePassed,
    isBeforeStartDate,
    isSubmitting: submitMutation.isPending,
  };
};