import { App } from "antd";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission } from "@/services/submissionService";
import { AssignmentData } from "../data";

export interface AssignmentWithSubmissions {
  assignment: AssignmentData;
  template?: AssessmentTemplate;
  submissions: Submission[];
}

export const handleDownloadAll = async (
  assignments: AssignmentWithSubmissions[],
  message: ReturnType<typeof App.useApp>['message'],
  isLab: boolean = false
) => {
  if (assignments.length === 0) {
    message.warning(`No ${isLab ? 'labs' : 'assignments'} to download`);
    return;
  }

  try {
    message.loading("Preparing download...", 0);

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const { assignment, template, submissions } of assignments) {
      if (!submissions || submissions.length === 0) continue;

      const assignmentFolder = zip.folder(assignment.title.replace(/[^a-zA-Z0-9]/g, "_"));
      if (!assignmentFolder) continue;

      // Download requirement files if template exists
      if (template?.id) {
        try {
          const requirementFolder = assignmentFolder.folder("Requirements");
          if (requirementFolder) {
            // Generate requirement document
            const papersRes = await assessmentPaperService.getAssessmentPapers({
              assessmentTemplateId: template.id,
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
                text: template.name || "Requirement",
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
            const templateName = template.name || `Template_${template.id}`;
            requirementFolder.file(`${templateName.replace(/[^a-zA-Z0-9]/g, "_")}_Requirement.docx`, wordBlob);

            // Download assessment files
            try {
              const filesRes = await assessmentFileService.getFilesForTemplate({
                assessmentTemplateId: template.id,
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
              console.error(`Failed to fetch assessment files for template ${template.id}:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to generate requirement for ${isLab ? 'lab' : 'assignment'} ${assignment.id}:`, err);
        }
      }

      // Download submissions
      const submissionsFolder = assignmentFolder.folder("Submissions");
      if (submissionsFolder) {
        for (const sub of submissions) {
          if (!sub || !sub.id) continue;

          if (sub.submissionFile?.submissionUrl) {
            try {
              const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(sub.submissionFile.submissionUrl)}`;
              const response = await fetch(proxyUrl);
              if (response.ok) {
                const blob = await response.blob();
                const fileName = sub.submissionFile.name || `submission_${sub.id}.zip`;
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
    }

    if (zip.files && Object.keys(zip.files).length === 0) {
      message.destroy();
      message.warning("No files found to download");
      return;
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const saveAs = (await import("file-saver")).default;
    saveAs(blob, `${isLab ? 'Labs' : 'Assignments'}_All.zip`);
    message.destroy();
    message.success(`All ${isLab ? 'labs' : 'assignments'} downloaded successfully`);
  } catch (err: any) {
    console.error("Download all error:", err);
    message.destroy();
    message.error(err.message || `Failed to download all ${isLab ? 'labs' : 'assignments'}`);
  }
};

