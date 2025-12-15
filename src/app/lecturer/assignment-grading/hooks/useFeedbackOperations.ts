"use client";

import { useState, useEffect, useRef } from "react";
import { App } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { gradingService } from "@/services/gradingService";


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

export const useFeedbackOperations = (submissionId: number | null) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
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


  const processedFeedbackRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const [isFormattingFeedback, setIsFormattingFeedback] = useState(false);


  const { data: feedbackList = [], isLoading: isLoadingFeedback } = useQuery({
    queryKey: ["submissionFeedback", "bySubmissionId", submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const list = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      return list;
    },
    enabled: !!submissionId,
  });


  useEffect(() => {
    if (feedbackList.length > 0) {
      const existingFeedback = feedbackList[0];
      setSubmissionFeedbackId(existingFeedback.id);


      if (processedFeedbackRef.current === existingFeedback.feedbackText) {
        return;
      }

      let parsedFeedback: FeedbackData | null = deserializeFeedback(
        existingFeedback.feedbackText
      );

      if (parsedFeedback === null) {

        if (
          !isProcessingRef.current &&
          processedFeedbackRef.current !== existingFeedback.feedbackText
        ) {
          isProcessingRef.current = true;
          processedFeedbackRef.current = existingFeedback.feedbackText;
          setIsFormattingFeedback(true);


          geminiService
            .formatFeedback(existingFeedback.feedbackText)
            .then((formatted) => {
              setFeedback(formatted);
              isProcessingRef.current = false;
              setIsFormattingFeedback(false);
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
              isProcessingRef.current = false;
              setIsFormattingFeedback(false);
            });
        }
      } else {

        processedFeedbackRef.current = existingFeedback.feedbackText;
        setFeedback(parsedFeedback);
        setIsFormattingFeedback(false);
      }
    } else {

      processedFeedbackRef.current = null;
      isProcessingRef.current = false;
      setIsFormattingFeedback(false);
    }
  }, [feedbackList]);

  const loadingFeedback = isLoadingFeedback || isFormattingFeedback;


  const saveFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: FeedbackData) => {
      if (!submissionId) {
        throw new Error("No submission selected");
      }

      const feedbackText = serializeFeedback(feedbackData);

      if (submissionFeedbackId) {
        return submissionFeedbackService.updateSubmissionFeedback(
          submissionFeedbackId,
          {
            feedbackText: feedbackText,
          }
        );
      } else {
        const newFeedback = await submissionFeedbackService.createSubmissionFeedback({
          submissionId: submissionId,
          feedbackText: feedbackText,
        });
        setSubmissionFeedbackId(newFeedback.id);
        return newFeedback;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["submissionFeedback", "bySubmissionId", submissionId],
      });
      message.success("Feedback saved successfully");
    },
    onError: (error: any) => {
      console.error("Failed to save feedback:", error);
      message.error(error?.message || "Failed to save feedback");
    },
  });

  const saveFeedback = async (feedbackData: FeedbackData) => {
    saveFeedbackMutation.mutate(feedbackData);
  };


  const getAiFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!submissionId) {
        throw new Error("No submission selected");
      }
      return gradingService.getFormattedAiFeedback(submissionId, "OpenAI");
    },
    onSuccess: (formattedFeedback) => {
      setFeedback(formattedFeedback);
      saveFeedbackMutation.mutate(formattedFeedback);
      message.success("AI feedback retrieved and saved successfully!");
    },
    onError: (error: any) => {
      console.error("Failed to get AI feedback:", error);
      let errorMessage = "Failed to get AI feedback. Please try again.";
      if (
        error?.apiResponse?.errorMessages &&
        error.apiResponse.errorMessages.length > 0
      ) {
        errorMessage = error.apiResponse.errorMessages.join(", ");
      } else if (error?.response?.data) {
        const apiError = error.response.data;
        if (apiError.errorMessages && apiError.errorMessages.length > 0) {
          errorMessage = apiError.errorMessages.join(", ");
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      message.error(errorMessage);
    },
  });

  const handleGetAiFeedback = async () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    getAiFeedbackMutation.mutate();
  };

  const handleFeedbackChange = (field: keyof FeedbackData, value: string) => {
    setFeedback((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveFeedback = async () => {
    if (!submissionId) {
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


  useEffect(() => {
    if (submissionId) {
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
    }
  }, [submissionId]);

  return {
    feedback,
    loadingFeedback,
    loadingAiFeedback: getAiFeedbackMutation.isPending,
    handleFeedbackChange,
    handleSaveFeedback,
    handleGetAiFeedback,
  };
};

