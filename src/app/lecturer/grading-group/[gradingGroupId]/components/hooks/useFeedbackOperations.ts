import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { gradingService } from "@/services/gradingService";
import { geminiService, FeedbackData } from "@/services/geminiService";
import { Submission } from "@/services/submissionService";
import type { MessageInstance } from "antd/es/message/interface";
import { App } from "antd";
function deserializeFeedback(feedbackText: string): FeedbackData | null {
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
}
function serializeFeedback(feedbackData: FeedbackData): string {
  return JSON.stringify(feedbackData);
}
interface UseFeedbackOperationsProps {
  visible: boolean;
  submission: Submission;
  setSubmissionFeedbackId: (id: number | null) => void;
}
export function useFeedbackOperations({
  visible,
  submission,
  setSubmissionFeedbackId,
}: UseFeedbackOperationsProps) {
  const { message } = App.useApp();
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
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingAiFeedback, setLoadingAiFeedback] = useState(false);
  const [submissionFeedbackId, setSubmissionFeedbackIdLocal] = useState<number | null>(null);
  const processedFeedbackRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const { data: feedbackList = [], isLoading: isLoadingFeedback } = useQuery({
    queryKey: ['submissionFeedback', 'bySubmissionId', submission.id],
    queryFn: async () => {
      if (!submission.id) return [];
      return await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submission.id,
      });
    },
    enabled: visible && !!submission.id,
  });
  useEffect(() => {
    if (feedbackList.length > 0) {
      const existingFeedback = feedbackList[0];
      setSubmissionFeedbackIdLocal(existingFeedback.id);
      setSubmissionFeedbackId(existingFeedback.id);
      if (processedFeedbackRef.current === existingFeedback.feedbackText) {
        return;
      }
      let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
      if (parsedFeedback === null) {
        if (!isProcessingRef.current && processedFeedbackRef.current !== existingFeedback.feedbackText) {
          isProcessingRef.current = true;
          processedFeedbackRef.current = existingFeedback.feedbackText;
          setLoadingFeedback(true);
          geminiService.formatFeedback(existingFeedback.feedbackText)
            .then((formatted) => {
              setFeedback(formatted);
              setLoadingFeedback(false);
              isProcessingRef.current = false;
            })
            .catch((error) => {
              console.error("Failed to parse feedback with Gemini:", error);
              setFeedback({
                overallFeedback: existingFeedback.feedbackText,
                strengths: "",
                weaknesses: "",
                codeQuality: "",
                algorithmEfficiency: "",
                suggestionsForImprovement: "",
                bestPractices: "",
                errorHandling: "",
              });
              setLoadingFeedback(false);
              isProcessingRef.current = false;
            });
        }
      } else {
        processedFeedbackRef.current = existingFeedback.feedbackText;
        setFeedback(parsedFeedback);
      }
    } else {
      processedFeedbackRef.current = null;
      isProcessingRef.current = false;
      setSubmissionFeedbackIdLocal(null);
      setSubmissionFeedbackId(null);
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
    }
  }, [feedbackList, submission.id]);
  const saveFeedback = async (feedbackData: FeedbackData) => {
    const feedbackText = serializeFeedback(feedbackData);
    if (submissionFeedbackId) {
      await submissionFeedbackService.updateSubmissionFeedback(submissionFeedbackId, {
        feedbackText: feedbackText,
      });
    } else {
      const newFeedback = await submissionFeedbackService.createSubmissionFeedback({
        submissionId: submission.id,
        feedbackText: feedbackText,
      });
      setSubmissionFeedbackIdLocal(newFeedback.id);
      setSubmissionFeedbackId(newFeedback.id);
    }
  };
  const handleGetAiFeedback = async () => {
    if (!submission) {
      message.error("No submission selected");
      return;
    }
    try {
      setLoadingAiFeedback(true);
      const formattedFeedback = await gradingService.getFormattedAiFeedback(submission.id, "OpenAI");
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
  const handleSaveFeedback = async () => {
    if (!submission) {
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
  return {
    feedback,
    loadingFeedback: loadingFeedback || isLoadingFeedback,
    loadingAiFeedback,
    submissionFeedbackId: submissionFeedbackId,
    setFeedback,
    handleGetAiFeedback,
    handleSaveFeedback,
  };
}