import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentFileService } from "@/services/assessmentFileService";
import type { AssessmentPaper } from "@/services/assessmentPaperService";
import type { AssessmentQuestion } from "@/services/assessmentQuestionService";

interface UseDataRefreshProps {
  templateId: number | null;
  allQuestions: { [paperId: number]: AssessmentQuestion[] };
  setPapers: (papers: AssessmentPaper[]) => void;
  setAllQuestions: (questions: { [paperId: number]: AssessmentQuestion[] } | ((prev: { [paperId: number]: AssessmentQuestion[] }) => { [paperId: number]: AssessmentQuestion[] })) => void;
  setFiles: (files: any[]) => void;
  resetStatusIfRejected: () => Promise<void>;
}

export function useDataRefresh({
  templateId,
  allQuestions,
  setPapers,
  setAllQuestions,
  setFiles,
  resetStatusIfRejected,
}: UseDataRefreshProps) {
  const refreshPapers = async (shouldResetStatus = false) => {
    if (!templateId) return;
    try {
      const paperResponse = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: templateId,
        pageNumber: 1,
        pageSize: 100,
      });
      setPapers(paperResponse.items);
      // Giữ cho questionsMap đồng bộ
      const newQuestionsMap = { ...allQuestions };
      paperResponse.items.forEach((p) => {
        if (!newQuestionsMap[p.id]) {
          newQuestionsMap[p.id] = [];
        }
      });
      setAllQuestions(newQuestionsMap);
      
      // Note: Edit paper does NOT resolve question comments, so we don't reset status here
      // Status reset is handled separately when editing questions/rubrics
    } catch (error) {
      console.error("Failed to refresh papers:", error);
    }
  };

  const refreshQuestions = async (paperId: number, shouldResetStatus = false) => {
    try {
      const questionResponse =
        await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paperId,
          pageNumber: 1,
          pageSize: 100,
        });
      // Sort questions by questionNumber
      const sortedQuestions = [...questionResponse.items].sort((a, b) => 
        (a.questionNumber || 0) - (b.questionNumber || 0)
      );
      setAllQuestions((prev) => ({
        ...prev,
        [paperId]: sortedQuestions,
      }));
      
      // Note: Status reset is handled in QuestionDetailView when editing questions/rubrics
      // This function only refreshes the data
    } catch (error) {
      console.error("Failed to refresh questions:", error);
    }
  };

  const refreshFiles = async (shouldResetStatus = false) => {
    if (!templateId) return;
    try {
      const fileResponse = await assessmentFileService.getFilesForTemplate({
        assessmentTemplateId: templateId,
        pageNumber: 1,
        pageSize: 100,
      });
      setFiles(fileResponse.items);
      
      // Note: Edit file does NOT resolve question comments, so we don't reset status here
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  };

  return {
    refreshPapers,
    refreshQuestions,
    refreshFiles,
  };
}

