import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { FeedbackData } from "@/services/geminiService";

dayjs.extend(utc);
dayjs.extend(timezone);

export const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

export const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
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

export const defaultEmptyFeedback: FeedbackData = {
  overallFeedback: "",
  strengths: "",
  weaknesses: "",
  codeQuality: "",
  algorithmEfficiency: "",
  suggestionsForImprovement: "",
  bestPractices: "",
  errorHandling: "",
};

