import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { gradingService } from "@/services/gradingService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { queryKeys } from "@/lib/react-query";
import type { Submission } from "@/services/submissionService";
import type { MessageInstance } from "antd/es/message/interface";

export function useAutoGrading(
  submission: Submission | undefined,
  submissionId: number | null,
  isSemesterPassed: boolean,
  message: MessageInstance
) {
  const [autoGradingLoading, setAutoGradingLoading] = useState(false);
  const autoGradingPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const handleAutoGrading = async () => {
    if (!submissionId || !submission) {
      message.error("No submission selected");
      return;
    }

    // Check if semester has passed
    if (isSemesterPassed) {
      message.warning("Cannot use auto grading when the semester has ended.");
      return;
    }

    try {
      setAutoGradingLoading(true);

      // Get assessmentTemplateId (same logic as fetchQuestionsAndRubrics)
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
          if (!assessmentTemplateId) {
            try {
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

      if (!assessmentTemplateId) {
        message.error("Cannot find assessment template. Please contact administrator.");
        setAutoGradingLoading(false);
        return;
      }

      // Call auto grading API
      const gradingSession = await gradingService.autoGrading({
        submissionId: submission.id,
        assessmentTemplateId: assessmentTemplateId,
      });

      // Invalidate queries to refresh (including grading history modal)
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });

      // If status is 0 (PROCESSING), start polling
      if (gradingSession.status === 0) {
        message.loading("Auto grading in progress...", 0);

        // Poll every 2 seconds until status changes
        const pollInterval = setInterval(async () => {
          try {
            const sessionsResult = await gradingService.getGradingSessions({
              submissionId: submission.id,
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

              // If status is no longer PROCESSING (0), stop polling
              if (latestSession.status !== 0) {
                if (autoGradingPollIntervalRef.current) {
                  clearInterval(autoGradingPollIntervalRef.current);
                  autoGradingPollIntervalRef.current = null;
                }
                message.destroy();
                setAutoGradingLoading(false);

                // Invalidate queries to refresh data (including grading history modal)
                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId, pageNumber: 1, pageSize: 1000 }) });
                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId, pageNumber: 1, pageSize: 100 }) });
                queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
                queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });

                if (latestSession.status === 1) {
                  message.success("Auto grading completed successfully");
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
            setAutoGradingLoading(false);
            message.error(err.message || "Failed to check grading status");
          }
        }, 2000); // Poll every 2 seconds

        autoGradingPollIntervalRef.current = pollInterval;

        // Stop polling after 5 minutes (safety timeout)
        setTimeout(() => {
          if (autoGradingPollIntervalRef.current) {
            clearInterval(autoGradingPollIntervalRef.current);
            autoGradingPollIntervalRef.current = null;
          }
          message.destroy();
          setAutoGradingLoading(false);
        }, 300000); // 5 minutes
      } else {
        // Status is not PROCESSING, grading completed immediately
        setAutoGradingLoading(false);
        // Invalidate queries to refresh data (including grading history modal)
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId, pageNumber: 1, pageSize: 1000 }) });
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId, pageNumber: 1, pageSize: 100 }) });
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
      setAutoGradingLoading(false);
      const errorMessage = err.message || "Failed to start auto grading";
      message.error(errorMessage);
    }
  };

  return {
    autoGradingLoading,
    handleAutoGrading,
  };
}

