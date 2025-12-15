import { App } from "antd";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { GradingGroup } from "@/services/gradingGroupService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";

export interface GroupedLecturer {
  lecturerId: number;
  lecturerName: string;
  lecturerCode: string | null;
  groups: (GradingGroup & { subs: any[]; semesterCode?: string })[];
}

export interface GroupedTemplate {
  templateId: number;
  templateName: string;
  lecturers: GroupedLecturer[];
}

export interface GroupedCourse {
  courseId: number;
  courseName: string;
  courseCode: string;
  templates: GroupedTemplate[];
}

export const handleDownloadAll = async (
  groupedByCourse: GroupedCourse[],
  message: ReturnType<typeof App.useApp>['message']
) => {
  if (groupedByCourse.length === 0) {
    message.warning("No data to download");
    return;
  }

  try {
    message.loading("Preparing download...", 0);

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const allSubmissionsWithGroups: Array<{
      submission: any;
      gradingGroup: GradingGroup;
      courseName: string;
      courseCode: string;
      semesterCode: string | undefined;
    }> = [];

    groupedByCourse.forEach((course) => {
      course.templates.forEach((template) => {
        template.lecturers.forEach((lecturer) => {
          lecturer.groups.forEach((group) => {
            if (group.subs && Array.isArray(group.subs) && group.subs.length > 0) {
              group.subs.forEach((sub: any) => {
                if (sub && sub.id) {
                  allSubmissionsWithGroups.push({
                    submission: sub,
                    gradingGroup: group,
                    courseName: course.courseName,
                    courseCode: course.courseCode,
                    semesterCode: group.semesterCode,
                  });
                }
              });
            }
          });
        });
      });
    });

    const courseSemesterMap = new Map<string, {
      courseName: string;
      courseCode: string;
      semesterCode: string;
      submissions: typeof allSubmissionsWithGroups;
    }>();

    allSubmissionsWithGroups.forEach((item) => {
      if (!item.semesterCode) {
        console.warn("Submission missing semesterCode:", item);
        return;
      }
      const key = `${item.courseCode}_${item.semesterCode}`;
      if (!courseSemesterMap.has(key)) {
        courseSemesterMap.set(key, {
          courseName: item.courseName,
          courseCode: item.courseCode,
          semesterCode: item.semesterCode,
          submissions: [],
        });
      }
      courseSemesterMap.get(key)!.submissions.push(item);
    });

    for (const group of courseSemesterMap.values()) {
      const folderName = `${group.courseName.replace(/[^a-zA-Z0-9]/g, "_")}_${group.semesterCode}`;
      const groupFolder = zip.folder(folderName);

      if (!groupFolder) continue;

      const uniqueGradingGroups = new Map<number, GradingGroup>();
      group.submissions.forEach((item: any) => {
        if (item.gradingGroup && !uniqueGradingGroups.has(item.gradingGroup.id)) {
          uniqueGradingGroups.set(item.gradingGroup.id, item.gradingGroup);
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
              console.error(`Failed to fetch assessment files:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to generate requirement for template ${gradingGroup.assessmentTemplateId}:`, err);
        }
      }

      const submissionsFolder = groupFolder.folder("Submissions");
      if (submissionsFolder && group.submissions && group.submissions.length > 0) {
        for (let i = 0; i < group.submissions.length; i++) {
          const item = group.submissions[i];
          const sub = item.submission;
          if (!sub || !sub.id) {
            console.warn("Invalid submission item:", item);
            continue;
          }
          
          if (sub.submissionFile?.submissionUrl) {
            try {
              const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(sub.submissionFile.submissionUrl)}`;
              const response = await fetch(proxyUrl);
              
              if (response.ok) {
                const blob = await response.blob();
                const studentCode = sub.studentCode || `student_${sub.studentId || sub.id}`;
                const fileName = `${studentCode}.zip`;
                submissionsFolder.file(fileName, blob);
              } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              if (i < group.submissions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            } catch (err) {
              console.error(`Failed to download submission ${sub.id}:`, err);
              const placeholderContent = `Submission ${sub.id} - Download failed: ${err instanceof Error ? err.message : 'Unknown error'}\nURL: ${sub.submissionFile.submissionUrl}\n\nYou can try downloading this file individually from the submission list.`;
              submissionsFolder.file(`submission_${sub.id}_download_failed.txt`, placeholderContent);
            }
          } else {
            const placeholderContent = `Submission ${sub.id} - No file URL available`;
            submissionsFolder.file(`submission_${sub.id}_no_file.txt`, placeholderContent);
          }
        }
      }
    }

    if (courseSemesterMap.size === 0) {
      message.destroy();
      message.warning("No submissions found to download");
      return;
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const fileSaver = (await import("file-saver")).default;
    fileSaver.saveAs(blob, `Teacher_Assignment_Submissions_${new Date().getTime()}.zip`);

    message.destroy();
    message.success("Download completed successfully!");
  } catch (err: any) {
    console.error("Failed to download:", err);
    console.error("Error stack:", err.stack);
    message.destroy();
    message.error(err.message || "Failed to download files");
  }
};

