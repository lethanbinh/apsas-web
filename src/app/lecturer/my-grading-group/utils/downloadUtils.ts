import type { MessageInstance } from "antd/es/message/interface";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { GradingGroup } from "@/services/gradingGroupService";
import { rubricItemService } from "@/services/rubricItemService";
import { EnrichedSubmission } from "../page";

export interface DownloadAllParams {
  groupedByCourse: Array<{
    courseId: number;
    courseName: string;
    semesterCode: string;
    submissions: EnrichedSubmission[];
  }>;
  messageApi: MessageInstance;
}

export async function downloadAllFiles({
  groupedByCourse,
  messageApi,
}: DownloadAllParams) {
  if (groupedByCourse.length === 0) {
    messageApi.warning("No data to download");
    return;
  }

  try {
    messageApi.loading("Preparing download...", 0);


    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();


    for (const group of groupedByCourse) {

      const folderName = `${group.courseName.replace(/[^a-zA-Z0-9]/g, "_")}_${group.semesterCode}`;
      const groupFolder = zip.folder(folderName);

      if (!groupFolder) continue;


      const uniqueGradingGroups = new Map<number, GradingGroup>();
      group.submissions.forEach((sub) => {
        if (sub.gradingGroup && !uniqueGradingGroups.has(sub.gradingGroup.id)) {
          uniqueGradingGroups.set(sub.gradingGroup.id, sub.gradingGroup);
        }
      });


      for (const [gradingGroupId, gradingGroup] of uniqueGradingGroups) {
        if (!gradingGroup.assessmentTemplateId) continue;

        try {

          const templateRes = await assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          });
          const template = templateRes.items.find(t => t.id === gradingGroup.assessmentTemplateId);

          if (!template) continue;


          const papersRes = await assessmentPaperService.getAssessmentPapers({
            assessmentTemplateId: gradingGroup.assessmentTemplateId,
            pageNumber: 1,
            pageSize: 100,
          });
          const papers = papersRes.items;


          const questionsMap: { [paperId: number]: any[] } = {};
          const rubricsMap: { [questionId: number]: any[] } = {};

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
          const templateName = gradingGroup.assessmentTemplateName || `Template_${gradingGroupId}`;
          const requirementFolder = groupFolder.folder(`Requirements_${templateName.replace(/[^a-zA-Z0-9]/g, "_")}`);
          if (requirementFolder) {
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
                    const response = await fetch(file.fileUrl);
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
              console.error(`Failed to fetch assessment files:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to generate requirement for template ${gradingGroup.assessmentTemplateId}:`, err);
        }
      }


      const submissionsFolder = groupFolder.folder("Submissions");
      if (submissionsFolder) {
        for (const sub of group.submissions) {
          if (sub.submissionFile?.submissionUrl) {
            try {

              const response = await fetch(sub.submissionFile.submissionUrl, {
                method: 'GET',
                headers: {
                  'Accept': '*/*',
                },
              });

              if (response.ok) {
                const blob = await response.blob();
                const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_${sub.submissionFile.name || `submission_${sub.id}.zip`}`;
                submissionsFolder.file(fileName, blob);
              } else {
                console.warn(`Failed to download submission ${sub.id}: HTTP ${response.status}`);

                const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_MISSING_${sub.submissionFile.name || `submission_${sub.id}.zip`}`;
                submissionsFolder.file(fileName, new Blob([`Submission file not available. URL: ${sub.submissionFile.submissionUrl}`], { type: 'text/plain' }));
              }
            } catch (err) {
              console.error(`Failed to download submission ${sub.id}:`, err);

              const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_ERROR_${sub.submissionFile.name || `submission_${sub.id}.zip`}`;
              submissionsFolder.file(fileName, new Blob([`Error downloading submission: ${err}`], { type: 'text/plain' }));
            }
          } else {

            const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_NO_FILE.txt`;
            submissionsFolder.file(fileName, new Blob([`No submission file available for submission ID: ${sub.id}`], { type: 'text/plain' }));
          }
        }
      }
    }


    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Grading_${new Date().toISOString().split("T")[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    messageApi.destroy();
    messageApi.success("Download completed successfully");
  } catch (err: any) {
    console.error("Failed to download:", err);
    messageApi.destroy();
    messageApi.error(err.message || "Failed to download files");
    throw err;
  }
}

