"use client";

import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { ROLES } from "@/lib/constants";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { gradeItemService } from "@/services/gradeItemService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import {
  Semester,
  SemesterPlanDetail,
  semesterService
} from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Collapse,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import styles from "./MySubmissions.module.css";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  try {
    return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
  } catch (error) {
    return null;
  }
};

interface EnrichedSubmission extends Submission {
  courseName?: string;
  courseId?: number;
  semesterCode?: string;
  semesterEndDate?: string;
  gradingGroup?: GradingGroup;
  totalScore?: number;
}

const MySubmissionsPageContent = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingGroups, setGradingGroups] = useState<GradingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  const { user, isLoading: authLoading } = useAuth();
  const { studentId, isLoading: studentLoading } = useStudent();

  const [semesters, setSemesters] = useState<SemesterPlanDetail[]>([]);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [classAssessments, setClassAssessments] = useState<Map<number, ClassAssessment>>(new Map());
  const [classes, setClasses] = useState<Map<number, ClassInfo>>(new Map());
  const [gradingGroupToSemesterMap, setGradingGroupToSemesterMap] = useState<Map<number, string>>(new Map());
  const [gradingGroupToCourseMap, setGradingGroupToCourseMap] = useState<Map<number, { courseId: number; courseName: string }>>(new Map());
  const [submissionTotalScores, setSubmissionTotalScores] = useState<Map<number, number>>(new Map());

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(
    undefined
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(
    undefined
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (authLoading || studentLoading) return;
    if (!user || user.role !== ROLES.STUDENT) {
      setError("You do not have permission to access this page.");
      setLoading(false);
      return;
    }
    if (!studentId) {
      setError("Student information not found for this account.");
      setLoading(false);
      return;
    }
  }, [user, authLoading, studentId, studentLoading]);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch all submissions for this student
        const allSubmissions = await submissionService.getSubmissionList({});
        const studentSubmissions = allSubmissions.filter(
          (sub) => sub.studentId === studentId && sub.gradingGroupId !== undefined
        );
        setSubmissions(studentSubmissions);

        // Get unique gradingGroupIds from student submissions
        const gradingGroupIds = Array.from(
          new Set(
            studentSubmissions
              .filter((s) => s.gradingGroupId !== undefined)
              .map((s) => Number(s.gradingGroupId))
          )
        );

        // Fetch grading groups
        const groups: GradingGroup[] = [];
        for (const groupId of gradingGroupIds) {
          try {
            const group = await gradingGroupService.getGradingGroupById(groupId);
            if (group) {
              groups.push(group);
            }
          } catch (err) {
            console.warn(`Failed to fetch grading group ${groupId}:`, err);
          }
        }
        setGradingGroups(groups);

        // Get unique assessmentTemplateIds from grading groups
        const assessmentTemplateIds = Array.from(
          new Set(
            groups
              .filter((g) => g.assessmentTemplateId !== null && g.assessmentTemplateId !== undefined)
              .map((g) => Number(g.assessmentTemplateId))
          )
        );

        // Fetch assessment templates
        const assessmentTemplateMap = new Map<number, AssessmentTemplate>();
        if (assessmentTemplateIds.length > 0) {
          const allAssessmentTemplatesRes = await assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => ({ items: [] }));

          allAssessmentTemplatesRes.items.forEach((template) => {
            if (assessmentTemplateIds.includes(template.id)) {
              assessmentTemplateMap.set(template.id, template);
            }
          });
        }

        // Get unique courseElementIds from assessment templates
        const courseElementIds = Array.from(
          new Set(Array.from(assessmentTemplateMap.values()).map((t) => t.courseElementId))
        );

        // Fetch course elements
        const courseElementMap = new Map<number, CourseElement>();
        if (courseElementIds.length > 0) {
          const allCourseElementsRes = await courseElementService.getCourseElements({
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => []);

          allCourseElementsRes.forEach((element) => {
            if (courseElementIds.includes(element.id)) {
              courseElementMap.set(element.id, element);
            }
          });
        }

        // Map grading groups to semester codes and courses using assessmentTemplateId
        const groupToSemesterMap = new Map<number, string>();
        const groupToCourseMap = new Map<number, { courseId: number; courseName: string }>();
        groups.forEach((group) => {
          if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
            const assessmentTemplate = assessmentTemplateMap.get(Number(group.assessmentTemplateId));
            if (assessmentTemplate) {
              const courseElement = courseElementMap.get(Number(assessmentTemplate.courseElementId));
              if (courseElement) {
                if (courseElement.semesterCourse && courseElement.semesterCourse.semester) {
                  const semesterCode = courseElement.semesterCourse.semester.semesterCode;
                  groupToSemesterMap.set(Number(group.id), semesterCode);
                }
                if (courseElement.semesterCourse && courseElement.semesterCourse.course) {
                  const courseId = courseElement.semesterCourse.course.id;
                  const courseName = courseElement.semesterCourse.course.name;
                  groupToCourseMap.set(Number(group.id), { courseId, courseName });
                }
              }
            }
          }
        });
        setGradingGroupToSemesterMap(groupToSemesterMap);
        setGradingGroupToCourseMap(groupToCourseMap);

        // Fetch all submissions from all grading groups
        const allSubmissionPromises = groups.map((group) =>
          submissionService.getSubmissionList({
            gradingGroupId: group.id,
          }).catch(() => [])
        );
        const allSubmissionResults = await Promise.all(allSubmissionPromises);
        const allSubmissionsFromGroups = allSubmissionResults.flat();
        
        // Filter to only include submissions from this student
        const studentSubmissionsFromGroups = allSubmissionsFromGroups.filter(
          (sub) => sub.studentId === studentId
        );
        setSubmissions(studentSubmissionsFromGroups);

        // Fetch grading sessions and calculate total scores for each submission
        const totalScoreMap = new Map<number, number>();
        const gradingSessionPromises = studentSubmissionsFromGroups.map(async (submission) => {
          try {
            const gradingSessionsResult = await gradingService.getGradingSessions({
              submissionId: submission.id,
              pageNumber: 1,
              pageSize: 100,
            });

            if (gradingSessionsResult.items.length > 0) {
              // Sort by createdAt desc to get the latest session
              const sortedSessions = [...gradingSessionsResult.items].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA; // Descending order
              });

              const latestSession = sortedSessions[0];

              // Fetch grade items for this grading session
              try {
                const gradeItemsResult = await gradeItemService.getGradeItems({
                  gradingSessionId: latestSession.id,
                  pageNumber: 1,
                  pageSize: 1000,
                });

                // Calculate total score from grade items
                if (gradeItemsResult.items.length > 0) {
                  const totalScore = gradeItemsResult.items.reduce((sum, item) => sum + item.score, 0);
                  totalScoreMap.set(submission.id, totalScore);
                } else if (latestSession.grade !== undefined && latestSession.grade !== null) {
                  // Fallback to session grade if no grade items
                  totalScoreMap.set(submission.id, latestSession.grade);
                }
              } catch (err) {
                console.error(`Failed to fetch grade items for submission ${submission.id}:`, err);
                // Fallback to session grade if grade items fetch fails
                if (latestSession.grade !== undefined && latestSession.grade !== null) {
                  totalScoreMap.set(submission.id, latestSession.grade);
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch grading sessions for submission ${submission.id}:`, err);
          }
        });

        // Wait for all grading session fetches to complete
        await Promise.allSettled(gradingSessionPromises);
        setSubmissionTotalScores(totalScoreMap);

        // Fetch class assessments for submissions
        const classAssessmentIds = Array.from(
          new Set(studentSubmissionsFromGroups.filter((s) => s.classAssessmentId).map((s) => s.classAssessmentId!))
        );
        
        const classAssessmentMap = new Map<number, ClassAssessment>();
        if (classAssessmentIds.length > 0) {
          const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => ({ items: [] }));
          
          allClassAssessmentsRes.items.forEach((ca) => {
            if (classAssessmentIds.includes(ca.id)) {
              classAssessmentMap.set(ca.id, ca);
            }
          });
        }
        setClassAssessments(classAssessmentMap);

        // Get unique classIds from class assessments
        const classIds = Array.from(new Set(Array.from(classAssessmentMap.values()).map((ca) => ca.classId)));
        
        // Fetch classes
        const classMap = new Map<number, ClassInfo>();
        if (classIds.length > 0) {
          const classPromises = classIds.map((classId) =>
            classService.getClassById(classId.toString()).catch(() => null)
          );
          const classResults = await Promise.all(classPromises);
          classResults.forEach((cls) => {
            if (cls) {
              classMap.set(cls.id, cls);
            }
          });
        }
        setClasses(classMap);

        // Fetch semesters
        const semesterList = await semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 });
        setAllSemesters(semesterList);

        const semesterDetails = await Promise.all(
          semesterList.map((sem) =>
            semesterService.getSemesterPlanDetail(sem.semesterCode)
          )
        );
        setSemesters(semesterDetails);
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [studentId]);

  // Filter grading groups: in the same semester, same assessment template, same lecturer, keep only the latest one
  const filteredGradingGroups = useMemo(() => {
    const groupedMap = new Map<string, GradingGroup>();
    
    gradingGroups.forEach((group) => {
      const semesterCode = gradingGroupToSemesterMap.get(group.id);
      const assessmentTemplateId = group.assessmentTemplateId;
      const lecturerId = group.lecturerId;
      
      // Skip if missing required data
      if (!semesterCode || assessmentTemplateId === null || assessmentTemplateId === undefined) {
        return;
      }
      
      const key = `${semesterCode}_${assessmentTemplateId}_${lecturerId}`;
      const existing = groupedMap.get(key);
      
      if (!existing) {
        groupedMap.set(key, group);
      } else {
        // Compare createdAt - keep the one with the latest date
        const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const currentDate = group.createdAt ? new Date(group.createdAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          groupedMap.set(key, group);
        }
      }
    });
    
    return Array.from(groupedMap.values());
  }, [gradingGroups, gradingGroupToSemesterMap]);

  // Get set of filtered grading group IDs for quick lookup
  const filteredGradingGroupIds = useMemo(() => {
    return new Set(filteredGradingGroups.map(g => g.id));
  }, [filteredGradingGroups]);

  const enrichedSubmissions: EnrichedSubmission[] = useMemo(() => {
    return submissions
      .filter((sub) => {
        // Only include submissions from filtered grading groups
        return sub.gradingGroupId !== undefined && filteredGradingGroupIds.has(sub.gradingGroupId);
      })
      .map((sub) => {
        // Get semester code from grading group
        const semesterCode = sub.gradingGroupId !== undefined 
          ? gradingGroupToSemesterMap.get(sub.gradingGroupId) 
          : undefined;
        
        // Find semester from SemesterPlanDetail to get end date
        const semesterDetail = semesterCode ? semesters.find((s) => s.semesterCode === semesterCode) : undefined;
        const semesterEndDate = semesterDetail?.endDate;
        
        // Get class assessment for this submission
        const classAssessment = sub.classAssessmentId ? classAssessments.get(sub.classAssessmentId) : undefined;
        
        // Find grading group for this submission
        const gradingGroup = sub.gradingGroupId !== undefined 
          ? filteredGradingGroups.find((g) => g.id === sub.gradingGroupId)
          : undefined;

        // Get course info from grading group
        const courseInfo = sub.gradingGroupId !== undefined
          ? gradingGroupToCourseMap.get(sub.gradingGroupId)
          : undefined;

        // Get total score from map
        const totalScore = submissionTotalScores.get(sub.id);

        return {
          ...sub,
          courseName: courseInfo?.courseName || classAssessment?.courseName || "N/A",
          courseId: courseInfo?.courseId,
          semesterCode: semesterCode || undefined,
          semesterEndDate,
          gradingGroup,
          totalScore,
        };
      });
  }, [submissions, classAssessments, semesters, filteredGradingGroups, filteredGradingGroupIds, gradingGroupToSemesterMap, gradingGroupToCourseMap, submissionTotalScores]);

  // Get available courses based on selected semester
  const availableCourses = useMemo(() => {
    if (selectedSemester === undefined) {
      // If no semester selected, return all unique courses
      const courseMap = new Map<number, { courseId: number; courseName: string }>();
      enrichedSubmissions.forEach((sub) => {
        if (sub.courseId && sub.courseName) {
          courseMap.set(sub.courseId, { courseId: sub.courseId, courseName: sub.courseName });
        }
      });
      return Array.from(courseMap.values());
    }

    const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
    const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
    if (!selectedSemesterCode) return [];

    const courseMap = new Map<number, { courseId: number; courseName: string }>();
    enrichedSubmissions.forEach((sub) => {
      if (sub.semesterCode === selectedSemesterCode && sub.courseId && sub.courseName) {
        courseMap.set(sub.courseId, { courseId: sub.courseId, courseName: sub.courseName });
      }
    });
    return Array.from(courseMap.values());
  }, [enrichedSubmissions, selectedSemester, semesters]);

  // Get available templates based on selected semester and course
  const availableTemplates = useMemo(() => {
    let filteredGroups = filteredGradingGroups;

    if (selectedSemester !== undefined) {
      const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
      const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
      if (selectedSemesterCode) {
        filteredGroups = filteredGroups.filter((g) => {
          const semesterCode = gradingGroupToSemesterMap.get(g.id);
          return semesterCode === selectedSemesterCode;
        });
      }
    }

    if (selectedCourseId !== undefined) {
      filteredGroups = filteredGroups.filter((g) => {
        const courseInfo = gradingGroupToCourseMap.get(g.id);
        return courseInfo?.courseId === selectedCourseId;
      });
    }

    return filteredGroups.map((g) => ({
      id: g.id,
      name: g.assessmentTemplateName || `Template ${g.id}`,
      assessmentTemplateId: g.assessmentTemplateId,
    }));
  }, [filteredGradingGroups, selectedSemester, selectedCourseId, semesters, gradingGroupToSemesterMap, gradingGroupToCourseMap]);

  const filteredData = useMemo(() => {
    // First, filter by semester, course, template, and search text
    let filtered = enrichedSubmissions.filter((sub) => {
      // Filter by semester - compare semesterCode from grading group
      let semesterMatch = true;
      if (selectedSemester !== undefined) {
        const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
        const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
        semesterMatch = selectedSemesterCode !== undefined && 
                       sub.semesterCode !== undefined && 
                       sub.semesterCode === selectedSemesterCode;
      }

      // Filter by course
      let courseMatch = true;
      if (selectedCourseId !== undefined) {
        courseMatch = sub.courseId === selectedCourseId;
      }

      // Filter by template (grading group)
      let templateMatch = true;
      if (selectedTemplateId !== undefined) {
        templateMatch = sub.gradingGroupId === selectedTemplateId;
      }

      // Filter by search text
      const searchMatch =
        sub.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.studentCode.toLowerCase().includes(searchText.toLowerCase()) ||
        (sub.submissionFile?.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());

      return semesterMatch && courseMatch && templateMatch && searchMatch;
    });

    // Group by (studentCode, gradingGroupId) and keep only the latest submission in each group
    const groupedMap = new Map<string, EnrichedSubmission>();
    
    filtered.forEach((sub) => {
      const studentKey = sub.studentCode || sub.studentId?.toString() || 'unknown';
      const key = `${studentKey}_${sub.gradingGroupId || 'unknown'}`;
      const existing = groupedMap.get(key);
      
      if (!existing) {
        groupedMap.set(key, sub);
      } else {
        // Compare submittedAt - keep the one with the latest date
        const existingDate = existing.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
        const currentDate = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          groupedMap.set(key, sub);
        } else if (currentDate < existingDate) {
          // Do nothing, keep existing
        } else {
          // Dates are equal, keep the one with the largest ID (newest)
          if (sub.id > existing.id) {
            groupedMap.set(key, sub);
          }
        }
      }
    });

    // Convert map back to array and sort by submittedAt (newest first)
    const result = Array.from(groupedMap.values());
    result.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

    return result;
  }, [
    enrichedSubmissions,
    searchText,
    selectedSemester,
    selectedCourseId,
    selectedTemplateId,
    semesters,
  ]);

  // Group filtered submissions by course and semester
  const groupedByCourse = useMemo(() => {
    const groupMap = new Map<string, { courseId: number; courseName: string; semesterCode: string; submissions: EnrichedSubmission[] }>();
    
    filteredData.forEach((sub) => {
      if (sub.courseId && sub.semesterCode) {
        const key = `${sub.courseId}_${sub.semesterCode}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            courseId: sub.courseId,
            courseName: sub.courseName || "N/A",
            semesterCode: sub.semesterCode,
            submissions: [],
          });
        }
        groupMap.get(key)!.submissions.push(sub);
      }
    });

    // Convert to array and sort by semester (newest first) and then by course name
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      // Find semester details for comparison
      const semesterA = semesters.find((s) => s.semesterCode === a.semesterCode);
      const semesterB = semesters.find((s) => s.semesterCode === b.semesterCode);
      
      // Sort by semester end date (newest first), then by course name
      if (semesterA && semesterB) {
        const dateA = new Date(semesterA.endDate || 0).getTime();
        const dateB = new Date(semesterB.endDate || 0).getTime();
        if (dateB !== dateA) {
          return dateB - dateA; // Newest first
        }
      }
      
      // If same semester or no date, sort by course name
      return a.courseName.localeCompare(b.courseName);
    });

    return groups;
  }, [filteredData, semesters]);

  const handleViewDetail = (submission: EnrichedSubmission) => {
    localStorage.setItem("selectedSubmissionId", submission.id.toString());
    router.push(`/student/assignment-grading`);
  };

  const handleDownloadAll = async () => {
    if (groupedByCourse.length === 0) {
      messageApi.warning("No data to download");
      return;
    }

    try {
      messageApi.loading("Preparing download...", 0);
      
      // Dynamic import JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Process each group (course + semester)
      for (const group of groupedByCourse) {
        // Create folder name: CourseName_SemesterCode
        const folderName = `${group.courseName.replace(/[^a-zA-Z0-9]/g, "_")}_${group.semesterCode}`;
        const groupFolder = zip.folder(folderName);
        
        if (!groupFolder) continue;

        // Get unique grading groups for this course+semester
        const uniqueGradingGroups = new Map<number, GradingGroup>();
        group.submissions.forEach((sub) => {
          if (sub.gradingGroup && !uniqueGradingGroups.has(sub.gradingGroup.id)) {
            uniqueGradingGroups.set(sub.gradingGroup.id, sub.gradingGroup);
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
            }

            // Also download requirement files if any
            try {
              const filesRes = await assessmentFileService.getFilesForTemplate({
                assessmentTemplateId: gradingGroup.assessmentTemplateId,
                pageNumber: 1,
                pageSize: 1000,
              });

              if (requirementFolder && filesRes.items.length > 0) {
                for (const file of filesRes.items) {
                  try {
                    const response = await fetch(file.fileUrl);
                    if (response.ok) {
                      const blob = await response.blob();
                      requirementFolder.file(file.name, blob);
                    }
                  } catch (err) {
                    console.error(`Failed to download requirement file ${file.name}:`, err);
                  }
                }
              }
            } catch (err) {
              console.error(`Failed to fetch requirement files:`, err);
            }
          } catch (err) {
            console.error(`Failed to generate requirement for template ${gradingGroup.assessmentTemplateId}:`, err);
          }
        }

        // Download submissions for this group
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
      fileSaver.saveAs(blob, `PE_Submissions_${new Date().getTime()}.zip`);

      messageApi.destroy();
      messageApi.success("Download completed successfully!");
    } catch (err: any) {
      console.error("Failed to download:", err);
      messageApi.destroy();
      messageApi.error(err.message || "Failed to download files");
    }
  };

  const columns: ColumnsType<EnrichedSubmission> = [
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Submission File",
      dataIndex: "submissionFile",
      key: "fileSubmit",
      render: (file: Submission["submissionFile"]) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          <span>{file?.name || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date: string) => {
        const vietnamTime = toVietnamTime(date);
        if (!vietnamTime || !vietnamTime.isValid()) return "N/A";
        return vietnamTime.format("DD/MM/YYYY HH:mm");
      },
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Grade",
      key: "grade",
      render: (_: any, record: EnrichedSubmission) => {
        const totalScore = record.totalScore;
        if (totalScore !== undefined && totalScore !== null) {
          return (
            <span style={{ fontWeight: 600, color: "#52c41a" }}>
              {totalScore.toFixed(2)}
            </span>
          );
        }
        return (
          <span style={{ fontWeight: 600, color: "#999" }}>
            Not graded
          </span>
        );
      },
    },
    {
      title: "Template",
      key: "template",
      render: (_: any, record: EnrichedSubmission) => (
        <span>{record.gradingGroup?.assessmentTemplateName || "N/A"}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: EnrichedSubmission) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{ margin: 0, fontWeight: 700, color: "rgb(47, 50, 125)" }}
        >
          PE - Practical Exams
        </Title>
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
        </Space>
      </div>
      <div style={{ marginBottom: 16, marginTop: 16 }}>
        <Space wrap>
          <Select
            allowClear
            value={selectedSemester}
            onChange={(value) => {
              setSelectedSemester(value);
              setSelectedCourseId(undefined);
              setSelectedTemplateId(undefined);
            }}
            style={{ width: 200 }}
            placeholder="Filter by Semester"
            options={semesters.map((s) => ({
              label: s.semesterCode,
              value: Number(s.id),
            }))}
          />
          <Select
            allowClear
            value={selectedCourseId}
            onChange={(value) => {
              setSelectedCourseId(value);
              setSelectedTemplateId(undefined);
            }}
            disabled={selectedSemester === undefined}
            style={{ width: 200 }}
            placeholder="Filter by Course"
            options={availableCourses.map((c) => ({
              label: c.courseName,
              value: c.courseId,
            }))}
          />
          <Select
            allowClear
            value={selectedTemplateId}
            onChange={(value) => {
              setSelectedTemplateId(value);
            }}
            disabled={selectedCourseId === undefined}
            style={{ width: 250 }}
            placeholder="Filter by Template"
            options={availableTemplates.map((t) => ({
              label: t.name,
              value: t.id,
            }))}
          />
          <Input
            placeholder="Search student or file..."
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Space>
      </div>

      {loading ? (
        <div className={styles.spinner}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <div>
          {groupedByCourse.map((group, index) => {
            const groupKey = `${group.courseId}_${group.semesterCode}_${index}`;

            return (
              <Collapse key={groupKey} style={{ marginBottom: 16 }}>
                <Collapse.Panel
                  header={
                    <span style={{ fontWeight: 600 }}>
                      {group.courseName} - {group.semesterCode} ({group.submissions.length} submissions)
                    </span>
                  }
                  key={groupKey}
                >
                  <Table
                    columns={columns}
                    dataSource={group.submissions}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    className={styles.table}
                  />
                </Collapse.Panel>
              </Collapse>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function MySubmissionsPage() {
  return (
    <App>
      <MySubmissionsPageContent />
    </App>
  );
}
