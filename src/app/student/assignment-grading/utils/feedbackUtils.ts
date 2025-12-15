import type { FeedbackData } from "@/services/geminiService";


export function deserializeFeedback(feedbackText: string): FeedbackData | null {
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
}


export function getDefaultFeedback(): FeedbackData {
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

