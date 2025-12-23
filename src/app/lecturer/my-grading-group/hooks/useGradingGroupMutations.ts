"use client";
import { App } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { gradingService } from "@/services/gradingService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { EnrichedSubmission } from "../page";
export const useGradingGroupMutations = () => {
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();
  const batchGradingMutation = useMutation({
    mutationFn: async (submissions: EnrichedSubmission[]) => {
      const gradingPromises = submissions.map(async (submission) => {
        try {
          const gradingGroup = submission.gradingGroup;
          if (!gradingGroup?.assessmentTemplateId) {
            return {
              success: false,
              submissionId: submission.id,
              error: "Cannot find assessment template for this submission",
            };
          }
          await gradingService.autoGrading({
            submissionId: submission.id,
            assessmentTemplateId: gradingGroup.assessmentTemplateId,
          });
          return { success: true, submissionId: submission.id };
        } catch (err: any) {
          console.error(`Failed to grade submission ${submission.id}:`, err);
          return {
            success: false,
            submissionId: submission.id,
            error: err.message || "Unknown error",
          };
        }
      });
      return Promise.all(gradingPromises);
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      const successfulSubmissionIds = results
        .filter((r) => r.success)
        .map((r) => r.submissionId);
      if (successCount > 0) {
        messageApi.destroy();
        messageApi.loading(
          `Batch grading in progress for ${successCount} submission(s)...`,
          0
        );
        const pollInterval = setInterval(async () => {
          try {
            const sessionPromises = successfulSubmissionIds.map((submissionId) =>
              gradingService
                .getGradingSessions({
                  submissionId: submissionId,
                  pageNumber: 1,
                  pageSize: 100,
                })
                .catch(() => ({ items: [] }))
            );
            const sessionResults = await Promise.all(sessionPromises);
            let allCompleted = true;
            for (const result of sessionResults) {
              if (result.items.length > 0) {
                const latestSession = result.items.sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )[0];
                if (latestSession.status === 0) {
                  allCompleted = false;
                  break;
                }
              } else {
                allCompleted = false;
                break;
              }
            }
            if (allCompleted) {
              clearInterval(pollInterval);
              messageApi.destroy();
              queryClient.invalidateQueries({
                queryKey: queryKeys.grading.sessions.all,
              });
              queryClient.invalidateQueries({ queryKey: ["gradeItems"] });
              queryClient.invalidateQueries({ queryKey: ["submissions"] });
              messageApi.success(
                `Batch grading completed for ${successCount} submission(s)`
              );
            }
          } catch (err: any) {
            console.error("Failed to poll grading status:", err);
          }
        }, 5000);
        (window as any).batchGradingPollInterval = pollInterval;
      }
      if (failCount > 0) {
        messageApi.warning(
          `Failed to start grading for ${failCount} submission(s)`
        );
      }
    },
    onError: (err: any) => {
      console.error("Failed to start batch grading:", err);
      messageApi.error(err.message || "Failed to start batch grading");
    },
  });
  const uploadGradeSheetMutation = useMutation({
    mutationFn: async ({
      gradingGroupId,
      file,
    }: {
      gradingGroupId: number;
      file: File;
    }) => {
      return gradingGroupService.submitGradesToExaminer(gradingGroupId, file);
    },
    onSuccess: () => {
      messageApi.success("Grade sheet uploaded successfully!");
      queryClient.invalidateQueries({
        queryKey: queryKeys.grading.groups.all,
      });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (err: any) => {
      console.error("Failed to upload grade sheet:", err);
      const errorMessage =
        err.message ||
        err.response?.data?.errorMessages?.join(", ") ||
        "Failed to upload grade sheet";
      messageApi.error(errorMessage);
    },
  });
  return {
    batchGradingMutation,
    uploadGradeSheetMutation,
  };
};