"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { AssignSubmissionsModal } from "@/components/examiner/AssignSubmissionsModal";
import { CreateGradingGroupModal } from "@/components/examiner/CreateGradingGroupModal";
import { queryKeys } from "@/lib/react-query";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import {
  GradingGroup,
  gradingGroupService,
} from "@/services/gradingGroupService";
import { lecturerService } from "@/services/lecturerService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { semesterService } from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { GradingGroupFilters } from "./components/GradingGroupFilters";
import { GradingGroupTable, FlatGradingGroup } from "./components/GradingGroupTable";
import { flattenGradingGroups } from "./utils/flattenGradingGroups";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect, useMemo, useState } from "react";
import styles from "./GradingGroups.module.css";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string | null) => {
  if (!dateString) return null;
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

const { Title, Text } = Typography;

const GradingGroupsPageContent = () => {
  const queryClient = useQueryClient();
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<number | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GradingGroup | null>(null);

  const { message } = App.useApp();

  // Fetch grading groups using TanStack Query
  const { data: allGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: queryKeys.grading.groups.all,
    queryFn: () => gradingGroupService.getGradingGroups({}),
  });

  // Fetch lecturers
  const { data: allLecturers = [] } = useQuery({
    queryKey: queryKeys.lecturers.list(),
    queryFn: () => lecturerService.getLecturerList(),
  });

  // Fetch semesters
  const { data: allSemesters = [] } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
  });

  // Fetch submissions for all grading groups
  const gradingGroupIds = allGroups.map(g => g.id);
  const { data: allSubmissionsData } = useQuery({
    queryKey: ['submissions', 'byGradingGroups', gradingGroupIds],
    queryFn: async () => {
      if (gradingGroupIds.length === 0) return [];
      const allSubmissionPromises = gradingGroupIds.map(groupId =>
        submissionService.getSubmissionList({ gradingGroupId: groupId }).catch(() => [])
      );
      const allSubmissionResults = await Promise.all(allSubmissionPromises);
      return allSubmissionResults.flat();
    },
    enabled: gradingGroupIds.length > 0,
  });

  const allSubmissions = allSubmissionsData || [];

  // Get unique classAssessmentIds from submissions
  const classAssessmentIds = Array.from(
    new Set(allSubmissions.filter(s => s.classAssessmentId).map(s => s.classAssessmentId!))
  );

  // Fetch class assessments
  const { data: allClassAssessmentsRes } = useQuery({
    queryKey: queryKeys.classAssessments.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => classAssessmentService.getClassAssessments({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });

  const allClassAssessments = useMemo(() => {
    const map = new Map<number, ClassAssessment>();
    (allClassAssessmentsRes?.items || []).forEach(ca => {
      if (classAssessmentIds.includes(ca.id)) {
        map.set(ca.id, ca);
      }
    });
    return map;
  }, [allClassAssessmentsRes, classAssessmentIds]);

  // Get unique assessmentTemplateIds
  const assessmentTemplateIdsFromClassAssessments = Array.from(
    new Set(Array.from(allClassAssessments.values()).map(ca => ca.assessmentTemplateId))
  );
  const assessmentTemplateIdsFromGroups = Array.from(
    new Set(allGroups.filter(g => g.assessmentTemplateId !== null).map(g => g.assessmentTemplateId!))
  );
  const allAssessmentTemplateIds = Array.from(
    new Set([...assessmentTemplateIdsFromClassAssessments, ...assessmentTemplateIdsFromGroups])
  );

  // Fetch assessment templates
  const { data: allAssessmentTemplatesRes } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });

  const allAssessmentTemplates = useMemo(() => {
    const map = new Map<number, AssessmentTemplate>();
    (allAssessmentTemplatesRes?.items || []).forEach(template => {
      if (allAssessmentTemplateIds.includes(template.id)) {
        map.set(template.id, template);
      }
    });
    return map;
  }, [allAssessmentTemplatesRes, allAssessmentTemplateIds]);

  // Get unique courseElementIds
  const courseElementIds = Array.from(
    new Set(Array.from(allAssessmentTemplates.values()).map(t => t.courseElementId))
  );

  // Fetch course elements
  const { data: allCourseElementsRes = [] } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });

  const allCourseElements = useMemo(() => {
    const map = new Map<number, CourseElement>();
    allCourseElementsRes.forEach(element => {
      if (courseElementIds.includes(element.id)) {
        map.set(element.id, element);
      }
    });
    return map;
  }, [allCourseElementsRes, courseElementIds]);

  // Map grading groups to semester codes
  const gradingGroupToSemesterMap = useMemo(() => {
    const map = new Map<number, string>();
    allGroups.forEach(group => {
      if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
        const assessmentTemplate = allAssessmentTemplates.get(Number(group.assessmentTemplateId));
        if (assessmentTemplate) {
          const courseElement = allCourseElements.get(Number(assessmentTemplate.courseElementId));
          if (courseElement && courseElement.semesterCourse && courseElement.semesterCourse.semester) {
            const semesterCode = courseElement.semesterCourse.semester.semesterCode;
            map.set(Number(group.id), semesterCode);
          }
        }
      }
    });
    return map;
  }, [allGroups, allAssessmentTemplates, allCourseElements]);

  // Get unique classIds
  const classIds = Array.from(new Set(Array.from(allClassAssessments.values()).map(ca => ca.classId)));

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'byIds', classIds],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const classPromises = classIds.map(classId =>
        classService.getClassById(classId).catch(() => null)
      );
      const classResults = await Promise.all(classPromises);
      return classResults.filter(cls => cls !== null) as ClassInfo[];
    },
    enabled: classIds.length > 0,
  });

  const allClasses = useMemo(() => {
    const map = new Map<number, ClassInfo>();
    (classesData || []).forEach(cls => {
      if (cls) map.set(cls.id, cls);
    });
    return map;
  }, [classesData]);

  const loading = isLoadingGroups && allGroups.length === 0; // Only show loading if fetching and no data yet
  const error = null; // useQuery handles errors

  // Map submission to enriched data with submission URL
  const enrichedSubmissionsMap = useMemo(() => {
    const map = new Map<number, Submission & { submissionUrl?: string; fileName?: string }>();

    allSubmissions.forEach(sub => {
      map.set(sub.id, {
        ...sub,
        submissionUrl: sub.submissionFile?.submissionUrl,
        fileName: sub.submissionFile?.name,
      });
    });

    return map;
  }, [allSubmissions]);

  // Get available semesters from semesterService, sorted from newest to oldest
  const availableSemesters = useMemo(() => {
    // Sort by startDate descending (newest first)
    const sorted = [...allSemesters].sort((a, b) => {
      const dateA = new Date(a.startDate.endsWith("Z") ? a.startDate : a.startDate + "Z").getTime();
      const dateB = new Date(b.startDate.endsWith("Z") ? b.startDate : b.startDate + "Z").getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    return sorted.map(sem => sem.semesterCode);
  }, [allSemesters]);

  // Set default to current semester (semester that is currently active)
  useEffect(() => {
    if (allSemesters.length > 0 && selectedSemester === null) {
      const now = new Date();
      // Find the current semester (where now is between startDate and endDate)
      const currentSemester = allSemesters.find((sem) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
        return now >= startDate && now <= endDate;
      });

      if (currentSemester) {
        setSelectedSemester(currentSemester.semesterCode);
      } else {
        // If no current semester, fallback to latest semester
        const latestSemester = [...allSemesters].sort((a, b) => {
          const dateA = new Date(a.startDate.endsWith("Z") ? a.startDate : a.startDate + "Z").getTime();
          const dateB = new Date(b.startDate.endsWith("Z") ? b.startDate : b.startDate + "Z").getTime();
          return dateB - dateA; // Descending order (newest first)
        })[0];
        if (latestSemester) {
          setSelectedSemester(latestSemester.semesterCode);
        }
      }
    }
  }, [allSemesters, selectedSemester]);

  // Get available courses from course elements (filtered by semester if selected)
  const availableCourses = useMemo(() => {
    const courseMap = new Map<number, { id: number; name: string; code: string }>();
    allCourseElements.forEach(ce => {
      if (ce.semesterCourse?.course && ce.semesterCourse?.semester) {
        // Filter by semester if selected (not null and not "all")
        if (selectedSemester !== null && selectedSemester !== "all" && ce.semesterCourse.semester.semesterCode !== selectedSemester) {
          return;
        }
        const course = ce.semesterCourse.course;
        if (!courseMap.has(course.id)) {
          courseMap.set(course.id, {
            id: course.id,
            name: course.name,
            code: course.code,
          });
        }
      }
    });
    return Array.from(courseMap.values());
  }, [allCourseElements, selectedSemester]);

  // Get available templates from assessment templates
  const availableTemplates = useMemo(() => {
    return Array.from(allAssessmentTemplates.values()).map(t => ({
      id: t.id,
      name: t.name,
    }));
  }, [allAssessmentTemplates]);

  // Get available lecturers
  const availableLecturers = useMemo(() => {
    return allLecturers.map(l => ({
      id: Number(l.lecturerId),
      name: l.fullName,
      code: l.accountCode,
    }));
  }, [allLecturers]);

  // Group assignments by Course -> Template -> Lecturer
  const groupedByCourse = useMemo(() => {
    const courseMap = new Map<number, {
      courseId: number;
      courseName: string;
      courseCode: string;
      templates: Map<number, {
        templateId: number;
        templateName: string;
        lecturers: Map<number, {
          lecturerId: number;
          lecturerName: string;
          lecturerCode: string | null;
          groups: (GradingGroup & { subs: any[]; semesterCode?: string })[];
        }>;
      }>;
    }>();

    // Loop qua TẤT CẢ groups
    allGroups.forEach((group) => {
      // Get assessment template
      const template = group.assessmentTemplateId
        ? allAssessmentTemplates.get(Number(group.assessmentTemplateId))
        : null;

      if (!template) return;

      // Get course element
      const courseElement = allCourseElements.get(Number(template.courseElementId));
      if (!courseElement?.semesterCourse?.course) return;

      const course = courseElement.semesterCourse.course;
      const courseId = course.id;

      // Get semester code for this group
      const groupSemester = gradingGroupToSemesterMap.get(Number(group.id));

      // Filter by selected semester
      if (selectedSemester !== null && selectedSemester !== "all") {
        if (!groupSemester || groupSemester !== selectedSemester) {
          return;
        }
      }

      // Filter by selected course
      if (selectedCourseId !== null && courseId !== selectedCourseId) {
        return;
      }

      // Filter by selected template
      if (selectedTemplateId !== null && template.id !== selectedTemplateId) {
        return;
      }

      // Filter by selected lecturer
      if (selectedLecturerId !== null && group.lecturerId !== selectedLecturerId) {
        return;
      }

      // Get enriched submissions for this group
      const groupSubmissions = allSubmissions.filter(s => s.gradingGroupId === group.id);

      // Convert to enriched format
      const subs = groupSubmissions.map((sub) => {
        const enriched = enrichedSubmissionsMap.get(sub.id);
        return {
          id: sub.id,
          studentId: sub.studentId,
          studentName: sub.studentName,
          studentCode: sub.studentCode,
          gradingGroupId: group.id,
          lecturerName: group.lecturerName || undefined,
          submittedAt: sub.submittedAt || "",
          status: sub.status,
          lastGrade: sub.lastGrade,
          submissionFile: {
            ...sub.submissionFile,
            submissionUrl: enriched?.submissionUrl || sub.submissionFile?.submissionUrl,
            name: enriched?.fileName || sub.submissionFile?.name,
          },
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        };
      });

      // Initialize course if not exists
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          courseId,
          courseName: course.name,
          courseCode: course.code,
          templates: new Map(),
        });
      }

      const courseData = courseMap.get(courseId)!;
      const templateId = template.id;

      // Initialize template if not exists
      if (!courseData.templates.has(templateId)) {
        courseData.templates.set(templateId, {
          templateId,
          templateName: template.name,
          lecturers: new Map(),
        });
      }

      const templateData = courseData.templates.get(templateId)!;
      const lecturerId = group.lecturerId;

      // Initialize lecturer if not exists
      if (!templateData.lecturers.has(lecturerId)) {
        templateData.lecturers.set(lecturerId, {
          lecturerId,
          lecturerName: group.lecturerName || "Unknown",
          lecturerCode: group.lecturerCode,
          groups: [],
        });
      }

      const lecturerData = templateData.lecturers.get(lecturerId)!;
      lecturerData.groups.push({ ...group, subs, semesterCode: groupSemester });
    });

    // Convert to array structure
    return Array.from(courseMap.values()).map(course => ({
      ...course,
      templates: Array.from(course.templates.values()).map(template => ({
        ...template,
        lecturers: Array.from(template.lecturers.values()),
      })),
    }));
  }, [
    allGroups,
    allSubmissions,
    enrichedSubmissionsMap,
    selectedSemester,
    selectedCourseId,
    selectedTemplateId,
    selectedLecturerId,
    gradingGroupToSemesterMap,
    allAssessmentTemplates,
    allCourseElements,
  ]);


  const handleOpenAssign = (group: GradingGroup) => {
    setSelectedGroup(group);
    setIsAssignModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsCreateModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedGroup(null);
  };

  // Mutation for deleting grading group
  const deleteGradingGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return gradingGroupService.deleteGradingGroup(groupId);
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroups'] });
      message.success("Assignment deleted successfully");
    },
    onError: (err: any) => {
      console.error("Failed to delete grading group:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to delete assignment.";
      message.error(errorMsg);
    },
  });

  const handleModalOk = () => {
    setIsCreateModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedGroup(null);
    // Queries will automatically refetch
  };

  const handleDeleteGroup = async (group: GradingGroup) => {
    deleteGradingGroupMutation.mutate(group.id);
  };

  const handleDownloadAll = async () => {
    if (groupedByCourse.length === 0) {
      message.warning("No data to download");
      return;
    }

    try {
      message.loading("Preparing download...", 0);

      // Dynamic import JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Flatten all submissions from nested structure
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
              group.subs.forEach((sub) => {
                allSubmissionsWithGroups.push({
                  submission: sub,
                  gradingGroup: group,
                  courseName: course.courseName,
                  courseCode: course.courseCode,
                  semesterCode: group.semesterCode,
                });
              });
            });
          });
        });
      });

      // Group by course and semester
      const courseSemesterMap = new Map<string, {
        courseName: string;
        courseCode: string;
        semesterCode: string;
        submissions: typeof allSubmissionsWithGroups;
      }>();

      allSubmissionsWithGroups.forEach((item) => {
        if (!item.semesterCode) return;
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

      // Process each group (course + semester)
      for (const group of courseSemesterMap.values()) {
        // Create folder name: CourseName_SemesterCode
        const folderName = `${group.courseName.replace(/[^a-zA-Z0-9]/g, "_")}_${group.semesterCode}`;
        const groupFolder = zip.folder(folderName);

        if (!groupFolder) continue;

        // Get unique grading groups for this course+semester
        const uniqueGradingGroups = new Map<number, GradingGroup>();
        group.submissions.forEach((item) => {
          if (item.gradingGroup && !uniqueGradingGroups.has(item.gradingGroup.id)) {
            uniqueGradingGroups.set(item.gradingGroup.id, item.gradingGroup);
          }
        });

        // Generate requirement Word file for each grading group (template)
        for (const [gradingGroupId, gradingGroup] of uniqueGradingGroups) {
          if (!gradingGroup.assessmentTemplateId) continue;

          try {
            // Fetch template details
            const templateRes = await assessmentTemplateService.getAssessmentTemplates({
              pageNumber: 1,
              pageSize: 1000,
            });
            const template = templateRes.items.find(t => t.id === gradingGroup.assessmentTemplateId);

            if (!template) continue;

            // Fetch papers
            const papersRes = await assessmentPaperService.getAssessmentPapers({
              assessmentTemplateId: gradingGroup.assessmentTemplateId,
              pageNumber: 1,
              pageSize: 100,
            });
            const papers = papersRes.items;

            // Fetch questions and rubrics for each paper
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

            // Generate Word document
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

            // Add papers, questions, and rubrics
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

                // Add rubrics
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

              // Also download assessment files if any
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

        // Download submissions for this group
        const submissionsFolder = groupFolder.folder("Submissions");
        if (submissionsFolder) {
          for (const item of group.submissions) {
            const sub = item.submission;
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
                  const placeholderContent = `Submission ${sub.id} - Download failed (HTTP ${response.status})`;
                  submissionsFolder.file(`submission_${sub.id}_download_failed.txt`, placeholderContent);
                }
              } catch (err) {
                console.error(`Failed to download submission ${sub.id}:`, err);
                const placeholderContent = `Submission ${sub.id} - Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
                submissionsFolder.file(`submission_${sub.id}_download_failed.txt`, placeholderContent);
              }
            } else {
              const placeholderContent = `Submission ${sub.id} - No file URL available`;
              submissionsFolder.file(`submission_${sub.id}_no_file.txt`, placeholderContent);
            }
          }
        }
      }

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const fileSaver = (await import("file-saver")).default;
      fileSaver.saveAs(blob, `Teacher_Assignment_Submissions_${new Date().getTime()}.zip`);

      message.destroy();
      message.success("Download completed successfully!");
    } catch (err: any) {
      console.error("Failed to download:", err);
      message.destroy();
      message.error(err.message || "Failed to download files");
    }
  };


  if (loading) {
    return (
      <div className={styles.spinner}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all })}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <QueryParamsHandler />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <Title
              level={2}
              style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}
            >
              Teacher Assignment
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Assign submissions to teachers for grading
            </Text>
          </div>
          <Space>
            {groupedByCourse.length > 0 && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadAll}
                size="large"
              >
                Download All
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalOpen(true)}
              size="large"
            >
              Assign Teacher
            </Button>
          </Space>
        </div>

        <GradingGroupFilters
          availableSemesters={availableSemesters}
          availableCourses={availableCourses}
          availableTemplates={availableTemplates}
          availableLecturers={availableLecturers}
          selectedSemester={selectedSemester}
          selectedCourseId={selectedCourseId}
          selectedTemplateId={selectedTemplateId}
          selectedLecturerId={selectedLecturerId}
          onSemesterChange={setSelectedSemester}
          onCourseChange={setSelectedCourseId}
          onTemplateChange={setSelectedTemplateId}
          onLecturerChange={setSelectedLecturerId}
          filterTemplatesByCourse={(templateId) => {
            if (selectedCourseId === null) return false;
            const template = allAssessmentTemplates.get(templateId);
            if (!template) return false;
            const courseElement = allCourseElements.get(Number(template.courseElementId));
            return courseElement?.semesterCourse?.courseId === selectedCourseId;
          }}
        />

        {/* Main Content - Flat Table Design */}
        <Card
          title={
            <Space>
              <Text strong style={{ fontSize: 18 }}>Grading Groups</Text>
            </Space>
          }
        >
          <GradingGroupTable
            dataSource={flattenGradingGroups(groupedByCourse)}
            onAssign={handleOpenAssign}
            onDelete={handleDeleteGroup}
          />
        </Card>

        {isCreateModalOpen && (
          <CreateGradingGroupModal
            open={isCreateModalOpen}
            onCancel={handleModalCancel}
            onOk={handleModalOk}
            allLecturers={allLecturers}
            existingGroups={allGroups}
            gradingGroupToSemesterMap={gradingGroupToSemesterMap}
            assessmentTemplatesMap={allAssessmentTemplates}
            courseElementsMap={allCourseElements}
          />
        )}

        {isAssignModalOpen && selectedGroup && (
          <AssignSubmissionsModal
            open={isAssignModalOpen}
            onCancel={handleModalCancel}
            onOk={handleModalOk}
            group={selectedGroup}
            allGroups={allGroups}
          />
        )}
      </div>
    </>
  );
};

export default function GradingGroupsPage() {
  return (
    <App>
      <GradingGroupsPageContent />
    </App>
  );
}
