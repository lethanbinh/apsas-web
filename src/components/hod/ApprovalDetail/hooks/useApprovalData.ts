import { useState, useEffect } from "react";
import { App } from "antd";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { lecturerService, Lecturer } from "@/services/lecturerService";
import { ApiAssessmentTemplate } from "@/types";
export const useApprovalData = (template: ApiAssessmentTemplate) => {
  const { message: antMessage } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});
  const [files, setFiles] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [questionComments, setQuestionComments] = useState<{ [questionId: number]: string }>({});
  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        const lecturersData = await lecturerService.getLecturerList();
        setLecturers(lecturersData);
      } catch (err) {
        console.error("Failed to fetch lecturers:", err);
      }
    };
    fetchLecturers();
  }, []);
  useEffect(() => {
    const fetchRequirementData = async () => {
      try {
        setLoading(true);
        try {
          const filesRes = await assessmentFileService.getFilesForTemplate({
            assessmentTemplateId: template.id,
            pageNumber: 1,
            pageSize: 1000,
          });
          setFiles(filesRes.items || []);
        } catch (err) {
          console.error("Failed to fetch assessment files:", err);
          setFiles([]);
        }
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: template.id,
          pageNumber: 1,
          pageSize: 100,
        });
        const papersData = papersRes.items.length > 0 ? papersRes.items : [];
        setPapers(papersData);
        const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
        const rubricsMap: { [questionId: number]: RubricItem[] } = {};
        const commentsMap: { [questionId: number]: string } = {};
        for (const paper of papersData) {
          try {
            const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
              assessmentPaperId: paper.id,
              pageNumber: 1,
              pageSize: 100,
            });
            const sortedQuestions = [...questionsRes.items].sort((a, b) =>
              (a.questionNumber || 0) - (b.questionNumber || 0)
            );
            questionsMap[paper.id] = sortedQuestions;
            sortedQuestions.forEach(q => {
              if (q.reviewerComment) {
                commentsMap[q.id] = q.reviewerComment;
              }
            });
            for (const question of sortedQuestions) {
              try {
                const rubricsRes = await rubricItemService.getRubricsForQuestion({
                  assessmentQuestionId: question.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                rubricsMap[question.id] = rubricsRes.items || [];
              } catch (err) {
                console.error(`Failed to fetch rubrics for question ${question.id}:`, err);
                rubricsMap[question.id] = [];
              }
            }
          } catch (err) {
            console.error(`Failed to fetch questions for paper ${paper.id}:`, err);
            questionsMap[paper.id] = [];
          }
        }
        setQuestions(questionsMap);
        setRubrics(rubricsMap);
        setQuestionComments(commentsMap);
      } catch (err: any) {
        console.error("Failed to fetch requirement data:", err);
        antMessage.error("Failed to load requirement data");
      } finally {
        setLoading(false);
      }
    };
    fetchRequirementData();
  }, [template.id, antMessage]);
  const refreshQuestions = async () => {
    try {
      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: template.id,
        pageNumber: 1,
        pageSize: 100,
      });
      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      const commentsMap: { [questionId: number]: string } = {};
      for (const paper of papersRes.items) {
        try {
          const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
            assessmentPaperId: paper.id,
            pageNumber: 1,
            pageSize: 100,
          });
          const sortedQuestions = [...questionsRes.items].sort((a, b) =>
            (a.questionNumber || 0) - (b.questionNumber || 0)
          );
          questionsMap[paper.id] = sortedQuestions;
          sortedQuestions.forEach(q => {
            if (q.reviewerComment) {
              commentsMap[q.id] = q.reviewerComment;
            }
          });
        } catch (err) {
          console.error(`Failed to fetch questions for paper ${paper.id}:`, err);
        }
      }
      setQuestions(questionsMap);
      setQuestionComments(commentsMap);
    } catch (err) {
      console.error("Failed to refresh questions:", err);
    }
  };
  return {
    loading,
    papers,
    questions,
    rubrics,
    files,
    lecturers,
    questionComments,
    setQuestionComments,
    refreshQuestions,
  };
};