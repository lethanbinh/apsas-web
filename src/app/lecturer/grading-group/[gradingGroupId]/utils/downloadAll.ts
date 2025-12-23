import { App } from "antd";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { GradingGroup } from "@/services/gradingGroupService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission } from "@/services/submissionService";
export const handleDownloadAll = async (
  submissions: Submission[],
  gradingGroup: GradingGroup,
  message: ReturnType<typeof App.useApp>['message']
) => {
  if (submissions.length === 0) {
    message.warning("No submissions to download");
    return;
  }
  try {
    message.loading("Preparing download...", 0);
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    if (gradingGroup.assessmentTemplateId) {
      try {
        const requirementFolder = zip.folder("Requirements");
        if (requirementFolder) {
          const templateRes = await assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          });
          const template = templateRes.items.find(t => t.id === gradingGroup.assessmentTemplateId);
          if (template) {
            const papersRes = await assessmentPaperService.getAssessmentPapers({
              assessmentTemplateId: gradingGroup.assessmentTemplateId,
              pageNumber: 1,
              pageSize: 100,
            });
            const papers = papersRes.items;
            const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
            const rubricsMap: { [questionId: number]: RubricItem[] } = {};
            for (const paper of papers) {
              const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                assessmentPaperId: paper.id,
                pageNumber: 1,
                pageSize: 100,
              });
              const sortedQuestions = [...questionsRes.items].sort((a, b) =>
                (a.questionNumber || 0) - (b.questionNumber || 0)
              );
              questionsMap[paper.id] = sortedQuestions;
              for (const question of sortedQuestions) {
                const rubricsRes = await rubricItemService.getRubricsForQuestion({
                  assessmentQuestionId: question.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                rubricsMap[question.id] = rubricsRes.items;
              }
            }
            const docxModule = await import("docx");
            const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } = docxModule;
            const docSections = [];
            docSections.push(
              new Paragraph({
                text: template.name || gradingGroup.assessmentTemplateName || "Requirement",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
              })
            );
            if (template.description) {
              docSections.push(
                new Paragraph({ text: template.description, style: "italic" })
              );
            }
            docSections.push(new Paragraph({ text: " " }));
            for (const paper of papers) {
              docSections.push(
                new Paragraph({
                  text: paper.name || `Paper ${paper.id}`,
                  heading: HeadingLevel.HEADING_1,
                })
              );
              if (paper.description) {
                docSections.push(new Paragraph({ text: paper.description }));
              }
              docSections.push(new Paragraph({ text: " " }));
              const questions = questionsMap[paper.id] || [];
              for (const [index, question] of questions.entries()) {
                docSections.push(
                  new Paragraph({
                    text: `Question ${question.questionNumber || index + 1}: ${question.questionText || ""}`,
                    heading: HeadingLevel.HEADING_2,
                  })
                );
                if (question.score) {
                  docSections.push(
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Score: ", bold: true }),
                        new TextRun(question.score.toString()),
                      ],
                    })
                  );
                }
                if (question.questionSampleInput) {
                  docSections.push(new Paragraph({ text: " " }));
                  docSections.push(
                    new Paragraph({
                      children: [new TextRun({ text: "Sample Input: ", bold: true })],
                    })
                  );
                  docSections.push(new Paragraph({ text: question.questionSampleInput }));
                }
                if (question.questionSampleOutput) {
                  docSections.push(new Paragraph({ text: " " }));
                  docSections.push(
                    new Paragraph({
                      children: [new TextRun({ text: "Sample Output: ", bold: true })],
                    })
                  );
                  docSections.push(new Paragraph({ text: question.questionSampleOutput }));
                }
                const rubrics = rubricsMap[question.id] || [];
                if (rubrics.length > 0) {
                  docSections.push(new Paragraph({ text: " " }));
                  docSections.push(
                    new Paragraph({
                      children: [new TextRun({ text: "Rubrics: ", bold: true })],
                    })
                  );
                  for (const rubric of rubrics) {
                    docSections.push(
                      new Paragraph({
                        children: [
                          new TextRun({ text: `- ${rubric.description || ""}`, bold: false }),
                        ],
                      })
                    );
                    if (rubric.input) {
                      docSections.push(
                        new Paragraph({
                          children: [
                            new TextRun({ text: "  Input: ", bold: true }),
                            new TextRun(rubric.input),
                          ],
                        })
                      );
                    }
                    if (rubric.output) {
                      docSections.push(
                        new Paragraph({
                          children: [
                            new TextRun({ text: "  Output: ", bold: true }),
                            new TextRun(rubric.output),
                          ],
                        })
                      );
                    }
                    if (rubric.score) {
                      docSections.push(
                        new Paragraph({
                          children: [
                            new TextRun({ text: "  Score: ", bold: true }),
                            new TextRun(rubric.score.toString()),
                          ],
                        })
                      );
                    }
                  }
                }
                docSections.push(new Paragraph({ text: " " }));
              }
            }
            const doc = new Document({
              sections: [{ properties: {}, children: docSections }],
            });
            const wordBlob = await Packer.toBlob(doc);
            const templateName = gradingGroup.assessmentTemplateName || `Template_${gradingGroup.assessmentTemplateId}`;
            requirementFolder.file(`${templateName.replace(/[^a-zA-Z0-9]/g, "_")}_Requirement.docx`, wordBlob);
            try {
              const filesRes = await assessmentFileService.getFilesForTemplate({
                assessmentTemplateId: gradingGroup.assessmentTemplateId,
                pageNumber: 1,
                pageSize: 1000,
              });
              if (filesRes.items.length > 0) {
                for (const file of filesRes.items) {
                  try {
                    const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(file.fileUrl)}`;
                    const response = await fetch(proxyUrl);
                    if (response.ok) {
                      const blob = await response.blob();
                      requirementFolder.file(file.name, blob);
                    }
                  } catch (err) {
                    console.error(`Failed to download assessment file ${file.name}:`, err);
                  }
                }
              }
            } catch (err) {
              console.error(`Failed to fetch assessment files for template ${gradingGroup.assessmentTemplateId}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to generate requirement for grading group ${gradingGroup.id}:`, err);
      }
    }
    const submissionsFolder = zip.folder("Submissions");
    if (submissionsFolder) {
      for (const sub of submissions) {
        if (!sub || !sub.id) continue;
        if (sub.submissionFile?.submissionUrl) {
          try {
            const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(sub.submissionFile.submissionUrl)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
              const blob = await response.blob();
              const fileName = sub.studentCode ? `${sub.studentCode}.zip` : `submission_${sub.id}.zip`;
              submissionsFolder.file(fileName, blob);
            } else {
              console.error(`Submission ${sub.id} - Download failed: ${response.statusText}`);
            }
          } catch (err: any) {
            console.error(`Submission ${sub.id} - Download failed:`, err);
          }
        } else {
          const placeholderContent = `Submission ${sub.id} - No file URL available`;
          submissionsFolder.file(`submission_${sub.id}_no_file.txt`, placeholderContent);
        }
      }
    }
    if (zip.files && Object.keys(zip.files).length === 0) {
      message.destroy();
      message.warning("No files found to download");
      return;
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const saveAs = (await import("file-saver")).default;
    const fileName = gradingGroup.assessmentTemplateName
      ? `${gradingGroup.assessmentTemplateName.replace(/[^a-zA-Z0-9]/g, "_")}_All.zip`
      : `GradingGroup_${gradingGroup.id}_All.zip`;
    saveAs(blob, fileName);
    message.destroy();
    message.success("All submissions downloaded successfully");
  } catch (err: any) {
    console.error("Download all error:", err);
    message.destroy();
    message.error(err.message || "Failed to download all submissions");
  }
};
export const handleDownloadSelected = async (
  selectedSubmissions: Submission[],
  gradingGroup: GradingGroup,
  message: ReturnType<typeof App.useApp>['message']
) => {
  if (selectedSubmissions.length === 0) {
    message.warning("Please select at least one submission to download");
    return;
  }
  await handleDownloadAll(selectedSubmissions, gradingGroup, message);
};