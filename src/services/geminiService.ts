import { GoogleGenAI } from "@google/genai";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-pro";
export interface FeedbackData {
  overallFeedback: string;
  strengths: string;
  weaknesses: string;
  codeQuality: string;
  algorithmEfficiency: string;
  suggestionsForImprovement: string;
  bestPractices: string;
  errorHandling: string;
}
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});
if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not set. Please set it in your .env.local file.");
}
const feedbackCache = new Map<string, FeedbackData>();
const processingCache = new Set<string>();
export class GeminiService {
  private analyzeFeedbackContent(feedback: string): {
    hasOverall: boolean;
    hasStrengths: boolean;
    hasWeaknesses: boolean;
    hasCodeQuality: boolean;
    hasAlgorithmEfficiency: boolean;
    hasSuggestions: boolean;
    hasBestPractices: boolean;
    hasErrorHandling: boolean;
  } {
    const lowerFeedback = feedback.toLowerCase();
    return {
      hasOverall: lowerFeedback.includes("overall") ||
                  lowerFeedback.includes("summary") ||
                  lowerFeedback.includes("general") ||
                  feedback.length > 0,
      hasStrengths: lowerFeedback.includes("strength") ||
                    lowerFeedback.includes("well") ||
                    lowerFeedback.includes("good") ||
                    lowerFeedback.includes("correct") ||
                    lowerFeedback.includes("went well"),
      hasWeaknesses: lowerFeedback.includes("weakness") ||
                     lowerFeedback.includes("improve") ||
                     lowerFeedback.includes("issue") ||
                     lowerFeedback.includes("problem") ||
                     lowerFeedback.includes("error") ||
                     lowerFeedback.includes("wrong"),
      hasCodeQuality: lowerFeedback.includes("code quality") ||
                      lowerFeedback.includes("structure") ||
                      lowerFeedback.includes("readability") ||
                      lowerFeedback.includes("maintainability") ||
                      lowerFeedback.includes("formatting") ||
                      lowerFeedback.includes("clean"),
      hasAlgorithmEfficiency: lowerFeedback.includes("efficiency") ||
                              lowerFeedback.includes("complexity") ||
                              lowerFeedback.includes("optimization") ||
                              lowerFeedback.includes("performance") ||
                              lowerFeedback.includes("time complexity") ||
                              lowerFeedback.includes("space complexity"),
      hasSuggestions: lowerFeedback.includes("suggestion") ||
                     lowerFeedback.includes("recommend") ||
                     lowerFeedback.includes("should") ||
                     lowerFeedback.includes("consider") ||
                     lowerFeedback.includes("improvement"),
      hasBestPractices: lowerFeedback.includes("best practice") ||
                       lowerFeedback.includes("standard") ||
                       lowerFeedback.includes("convention") ||
                       lowerFeedback.includes("practice"),
      hasErrorHandling: lowerFeedback.includes("error handling") ||
                       lowerFeedback.includes("exception") ||
                       lowerFeedback.includes("validation") ||
                       lowerFeedback.includes("try-catch") ||
                       lowerFeedback.includes("error"),
    };
  }
  private generateDynamicPrompt(feedback: string): string {
    const analysis = this.analyzeFeedbackContent(feedback);
    const sections: string[] = [];
    sections.push('  "overallFeedback": "Extract or create a comprehensive overall assessment based on the feedback. If no overall assessment exists, summarize the main points."');
    if (analysis.hasStrengths) {
      sections.push('  "strengths": "Extract and list all strengths mentioned, each on a new line starting with number (e.g., 1. Strength 1\\n2. Strength 2). If no strengths are mentioned, leave empty string."');
    } else {
      sections.push('  "strengths": ""');
    }
    if (analysis.hasWeaknesses) {
      sections.push('  "weaknesses": "Extract and list all weaknesses or areas for improvement mentioned, each on a new line starting with number (e.g., 1. Weakness 1\\n2. Weakness 2). If no weaknesses are mentioned, leave empty string."');
    } else {
      sections.push('  "weaknesses": ""');
    }
    if (analysis.hasCodeQuality) {
      sections.push('  "codeQuality": "Extract detailed assessment of code quality, structure, and maintainability. If not mentioned, leave empty string."');
    } else {
      sections.push('  "codeQuality": ""');
    }
    if (analysis.hasAlgorithmEfficiency) {
      sections.push('  "algorithmEfficiency": "Extract analysis of algorithm efficiency, time/space complexity, and optimization opportunities. If not mentioned, leave empty string."');
    } else {
      sections.push('  "algorithmEfficiency": ""');
    }
    if (analysis.hasSuggestions) {
      sections.push('  "suggestionsForImprovement": "Extract and list all suggestions for improvement, each on a new line starting with number (e.g., 1. Suggestion 1\\n2. Suggestion 2). If no suggestions are mentioned, leave empty string."');
    } else {
      sections.push('  "suggestionsForImprovement": ""');
    }
    if (analysis.hasBestPractices) {
      sections.push('  "bestPractices": "Extract comments on adherence to coding best practices and standards. If not mentioned, leave empty string."');
    } else {
      sections.push('  "bestPractices": ""');
    }
    if (analysis.hasErrorHandling) {
      sections.push('  "errorHandling": "Extract evaluation of error handling, input validation, and robustness. If not mentioned, leave empty string."');
    } else {
      sections.push('  "errorHandling": ""');
    }
    return `You are a code review assistant. Analyze the following feedback and organize it into a structured JSON format.
IMPORTANT INSTRUCTIONS:
- Only extract information that is ACTUALLY PRESENT in the feedback
- If a section is not mentioned in the feedback, set it to an empty string ""
- Do NOT make up or invent information that is not in the feedback
- Extract and organize the existing content into the appropriate fields
- For list items (strengths, weaknesses, suggestions), format each item on a new line starting with a number
Return ONLY a valid JSON object with this structure (no markdown, no code blocks, just pure JSON):
{
${sections.join(",\n")}
}
Feedback to analyze:
${feedback}
Remember:
- Return ONLY the JSON object, no additional text, no markdown formatting, no code blocks
- Use empty string "" for fields that are not present in the feedback
- Only extract what is actually in the feedback, do not create new content`;
  }
  async formatFeedback(rawFeedback: string): Promise<FeedbackData> {
    if (feedbackCache.has(rawFeedback)) {
      return feedbackCache.get(rawFeedback)!;
    }
    if (processingCache.has(rawFeedback)) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (feedbackCache.has(rawFeedback)) {
        return feedbackCache.get(rawFeedback)!;
      }
      return this.fallbackFormatFeedback(rawFeedback);
    }
    processingCache.add(rawFeedback);
    try {
      const prompt = this.generateDynamicPrompt(rawFeedback);
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const generatedText = response.text || "";
      if (!generatedText) {
        throw new Error("No response from Gemini API");
      }
      let cleanedText = generatedText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      const parsedData = JSON.parse(cleanedText) as FeedbackData;
      const formattedFeedback: FeedbackData = {
        overallFeedback: parsedData.overallFeedback || "",
        strengths: parsedData.strengths || "",
        weaknesses: parsedData.weaknesses || "",
        codeQuality: parsedData.codeQuality || "",
        algorithmEfficiency: parsedData.algorithmEfficiency || "",
        suggestionsForImprovement: parsedData.suggestionsForImprovement || "",
        bestPractices: parsedData.bestPractices || "",
        errorHandling: parsedData.errorHandling || "",
      };
      feedbackCache.set(rawFeedback, formattedFeedback);
      processingCache.delete(rawFeedback);
      return formattedFeedback;
    } catch (error: any) {
      processingCache.delete(rawFeedback);
      console.error("Error calling Gemini API:", error);
      if (error?.error?.code === 429 || error?.status === "RESOURCE_EXHAUSTED") {
        const retryDelay = error?.error?.details?.find((d: any) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo")?.retryDelay || "8s";
        const quotaMessage = error?.error?.message || "Quota exceeded for Gemini API";
        throw new Error(`Gemini API quota exceeded. ${quotaMessage} Please retry after ${retryDelay}.`);
      }
      const fallbackFeedback = this.fallbackFormatFeedback(rawFeedback);
      feedbackCache.set(rawFeedback, fallbackFeedback);
      return fallbackFeedback;
    }
  }
  private fallbackFormatFeedback(rawFeedback: string): FeedbackData {
    const sections = rawFeedback.split(/\n\s*\n/);
    return {
      overallFeedback: sections[0] || rawFeedback.substring(0, 500) || "",
      strengths: this.extractSection(rawFeedback, ["strength", "well", "good", "correct"]),
      weaknesses: this.extractSection(rawFeedback, ["weakness", "improve", "issue", "problem"]),
      codeQuality: this.extractSection(rawFeedback, ["code quality", "structure", "readability", "maintainability"]),
      algorithmEfficiency: this.extractSection(rawFeedback, ["efficiency", "complexity", "optimization", "performance"]),
      suggestionsForImprovement: this.extractSection(rawFeedback, ["suggestion", "recommend", "should", "consider"]),
      bestPractices: this.extractSection(rawFeedback, ["best practice", "standard", "convention"]),
      errorHandling: this.extractSection(rawFeedback, ["error", "exception", "validation", "handle"]),
    };
  }
  private extractSection(text: string, keywords: string[]): string {
    const lines = text.split("\n");
    const relevantLines: string[] = [];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (keywords.some((keyword) => lowerLine.includes(keyword.toLowerCase()))) {
        relevantLines.push(line.trim());
      }
    }
    return relevantLines.join("\n") || "";
  }
}
export const geminiService = new GeminiService();