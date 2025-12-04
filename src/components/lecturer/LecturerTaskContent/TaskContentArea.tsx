"use client";

import { AssessmentFile } from "@/services/assessmentFileService";
import { AssessmentPaper } from "@/services/assessmentPaperService";
import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import { AssessmentTemplate } from "@/services/assessmentTemplateService";
import { AssignRequestItem } from "@/services/assignRequestService";
import { Alert } from "antd";
import { PaperDetailView } from "./PaperDetailView";
import { QuestionDetailView } from "./QuestionDetailView";
import { TemplateDetailView } from "./TemplateDetailView";

interface TaskContentAreaProps {
  selectedKey: string;
  template: AssessmentTemplate | null;
  papers: AssessmentPaper[];
  files: AssessmentFile[];
  allQuestions: { [paperId: number]: AssessmentQuestion[] };
  isEditable: boolean;
  task: AssignRequestItem;
  onFileChange: () => void;
  onExport: () => void;
  onTemplateDelete: () => void;
  onTemplateChange: () => void;
  onPaperChange: () => void;
  onQuestionChange: (paperId: number) => void;
  onRubricChange: (paperId: number) => void;
  onResetStatus: () => Promise<void>;
}

export function TaskContentArea({
  selectedKey,
  template,
  papers,
  files,
  allQuestions,
  isEditable,
  task,
  onFileChange,
  onExport,
  onTemplateDelete,
  onTemplateChange,
  onPaperChange,
  onQuestionChange,
  onRubricChange,
  onResetStatus,
}: TaskContentAreaProps) {
  if (selectedKey === "template-details") {
    if (!template) {
      return <Alert message="Please select an item from the menu." />;
    }
    return (
      <TemplateDetailView
        template={template}
        papers={papers}
        files={files}
        isEditable={isEditable}
        onFileChange={onFileChange}
        onExport={onExport}
        onTemplateDelete={onTemplateDelete}
        onTemplateChange={onTemplateChange}
        assignedToHODId={task.assignedByHODId}
        task={task}
        onResetStatus={onResetStatus}
      />
    );
  }

  if (selectedKey.startsWith("paper-")) {
    const paperId = Number(selectedKey.split("-")[1]);
    const paper = papers.find((p) => p.id === paperId);
    if (paper) {
      return (
        <PaperDetailView
          paper={paper}
          isEditable={isEditable}
          onPaperChange={onPaperChange}
          onResetStatus={onResetStatus}
        />
      );
    }
  }

  if (selectedKey.startsWith("question-")) {
    const questionId = Number(selectedKey.split("-")[1]);
    let question: AssessmentQuestion | undefined;
    let paperId: number | undefined;

    for (const pId in allQuestions) {
      const found = allQuestions[pId].find((q) => q.id === questionId);
      if (found) {
        question = found;
        paperId = Number(pId);
        break;
      }
    }

    if (question && paperId) {
      return (
        <QuestionDetailView
          question={question}
          isEditable={isEditable}
          onRubricChange={() => onRubricChange(paperId!)}
          onQuestionChange={() => onQuestionChange(paperId!)}
          onResetStatus={onResetStatus}
        />
      );
    }
  }

  return <Alert message="Please select an item from the menu." />;
}