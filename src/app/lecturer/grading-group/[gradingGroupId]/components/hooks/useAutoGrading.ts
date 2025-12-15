import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { gradingService } from "@/services/gradingService";
import { queryKeys } from "@/lib/react-query";
import { Submission } from "@/services/submissionService";
import { GradingGroup } from "@/services/gradingGroupService";
import type { MessageInstance } from "antd/es/message/interface";

interface UseAutoGradingProps {
  submission: Submission;
  gradingGroup: GradingGroup;
  semesterEnded: boolean;
  isGradeSheetSubmitted: boolean;
  message: MessageInstance;
  queryClient: ReturnType<typeof useQueryClient>;
}

export function useAutoGrading({
  submission,
  gradingGroup,
  semesterEnded,
  isGradeSheetSubmitted,
  message,
  queryClient,
}: UseAutoGradingProps) {
  const [autoGradingLoading, setAutoGradingLoading] = useState(false);
  const autoGradingPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingSessionIdRef = useRef<number | null>(null);
  const hasShownCompletionMessageRef = useRef<boolean>(false);

  const handleAutoGrading = async () => {
    if (!submission || !gradingGroup?.assessmentTemplateId) {
      message.error("Submission or assessment template not found");
      return;
    }

    if (semesterEnded) {
      message.warning("Cannot use auto grading when the semester has ended");
      return;
    }

    if (isGradeSheetSubmitted) {
      message.warning("Cannot use auto grading when the grade sheet has been submitted");
      return;
    }

    if (autoGradingPollIntervalRef.current) {
      clearInterval(autoGradingPollIntervalRef.current);
      autoGradingPollIntervalRef.current = null;
    }

    hasShownCompletionMessageRef.current = false;

    try {
      setAutoGradingLoading(true);

      const gradingSession = await gradingService.autoGrading({
        submissionId: submission.id,
        assessmentTemplateId: gradingGroup.assessmentTemplateId,
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });
      queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
      queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });

      if (gradingSession.status === 0) {
        pollingSessionIdRef.current = gradingSession.id;
        hasShownCompletionMessageRef.current = false;

        const loadingMessageKey = `auto-grading-${gradingSession.id}`;
        message.loading({ content: "Auto grading in progress...", key: loadingMessageKey, duration: 0 });

        const pollInterval = setInterval(async () => {
          if (hasShownCompletionMessageRef.current || pollingSessionIdRef.current !== gradingSession.id) {
            clearInterval(pollInterval);
            autoGradingPollIntervalRef.current = null;
            return;
          }

          try {
            const sessionsResult = await gradingService.getGradingSessions({
              submissionId: submission.id,
              pageNumber: 1,
              pageSize: 100,
            });

            const targetSession = sessionsResult.items.find(s => s.id === pollingSessionIdRef.current);

            if (targetSession && pollingSessionIdRef.current === gradingSession.id) {
              if (targetSession.status !== 0) {
                hasShownCompletionMessageRef.current = true;
                clearInterval(pollInterval);
                autoGradingPollIntervalRef.current = null;
                pollingSessionIdRef.current = null;
                setAutoGradingLoading(false);

                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });
                queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
                queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });

                if (targetSession.status === 1) {
                  message.success({ content: "Auto grading completed successfully", key: loadingMessageKey, duration: 3 });
                } else if (targetSession.status === 2) {
                  message.error({ content: "Auto grading failed", key: loadingMessageKey, duration: 3 });
                }
              }
            } else if (!targetSession) {
              hasShownCompletionMessageRef.current = true;
              clearInterval(pollInterval);
              autoGradingPollIntervalRef.current = null;
              pollingSessionIdRef.current = null;
              message.destroy(loadingMessageKey);
              setAutoGradingLoading(false);
            }
          } catch (err: any) {
            console.error("Failed to poll grading status:", err);
            if (!hasShownCompletionMessageRef.current && pollingSessionIdRef.current === gradingSession.id) {
              hasShownCompletionMessageRef.current = true;
              clearInterval(pollInterval);
              autoGradingPollIntervalRef.current = null;
              message.destroy(loadingMessageKey);
              setAutoGradingLoading(false);
              message.error(err.message || "Failed to check grading status");
            }
          }
        }, 2000);

        autoGradingPollIntervalRef.current = pollInterval;

        setTimeout(() => {
          if (!hasShownCompletionMessageRef.current && pollingSessionIdRef.current === gradingSession.id) {
            hasShownCompletionMessageRef.current = true;
            clearInterval(pollInterval);
            autoGradingPollIntervalRef.current = null;
            pollingSessionIdRef.current = null;
            message.destroy(loadingMessageKey);
            setAutoGradingLoading(false);
            message.warning("Auto grading is taking longer than expected. Please check the status manually.");
          }
        }, 300000);
      } else {
        setAutoGradingLoading(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });
        queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
        queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });

        if (gradingSession.status === 1) {
          message.success("Auto grading completed successfully");
        } else if (gradingSession.status === 2) {
          message.error("Auto grading failed");
        }
      }
    } catch (err: any) {
      console.error("Failed to start auto grading:", err);
      message.error(err.message || "Failed to start auto grading");
      setAutoGradingLoading(false);
    }
  };

  return {
    autoGradingLoading,
    handleAutoGrading,
  };
}

