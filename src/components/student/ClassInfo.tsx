"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Avatar, Typography, Descriptions, Divider, Button, Modal, Checkbox, App, Space } from "antd";
import {
  ReadOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  InfoCircleOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import styles from "./ClassInfo.module.css";
import { ClassInfo as ClassInfoType } from "@/services/classService";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";
import { useStudent } from "@/hooks/useStudent";
import { exportGradeReportToExcel, GradeReportData } from "@/utils/exportGradeReport";
import { submissionService } from "@/services/submissionService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { courseElementService } from "@/services/courseElementService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { rubricItemService } from "@/services/rubricItemService";
import { gradingService } from "@/services/gradingService";
import { gradeItemService } from "@/services/gradeItemService";
import { classService } from "@/services/classService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { lecturerService } from "@/services/lecturerService";
import { assessmentTemplateService, AssessmentTemplate } from "@/services/assessmentTemplateService";
import { CourseElement } from "@/services/courseElementService";
import { Submission } from "@/services/submissionService";
import { FeedbackData } from "@/services/geminiService";

const { Title, Paragraph, Text } = Typography;

export default function ClassInfo({ classData }: { classData: ClassInfoType }) {
  const { user } = useAuth();
  const { studentId } = useStudent();
  const { message: messageApi } = App.useApp();
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportTypes, setExportTypes] = useState<{
    assignment: boolean;
    lab: boolean;
    practicalExam: boolean;
  }>({
    assignment: true,
    lab: true,
    practicalExam: true,
  });
  const [gradingGroups, setGradingGroups] = useState<GradingGroup[]>([]);

  // Fetch grading groups for lecturer
  useEffect(() => {
    const fetchGradingGroups = async () => {
      if (user?.role === ROLES.LECTURER && user?.id) {
        try {
          const groups = await gradingGroupService.getGradingGroups({
            lecturerId: Number(user.id),
          });
          setGradingGroups(groups);
        } catch (err) {
          console.error("Failed to fetch grading groups:", err);
        }
      }
    };
    fetchGradingGroups();
  }, [user]);

  const handleExportReport = () => {
    setExportModalVisible(true);
  };

  const handleConfirmExport = async () => {
    try {
      // Check if at least one type is selected
      if (!exportTypes.assignment && !exportTypes.lab && !exportTypes.practicalExam) {
        messageApi.warning("Please select at least one type to export");
        return;
      }

      messageApi.info("Preparing report...");
      setExportModalVisible(false);

      if (user?.role === ROLES.LECTURER) {
        // Lecturer export: all students in the class
        const selectedClassId = classData.id.toString();
        if (!selectedClassId) {
          messageApi.error("Class ID not found");
          return;
        }

        // Fetch all course elements for the class
        const courseElementsRes = await courseElementService.getCourseElements({
          pageNumber: 1,
          pageSize: 1000,
        });

        // Fetch all class assessments
        const classAssessmentRes = await classAssessmentService.getClassAssessments({
          classId: Number(selectedClassId),
          pageNumber: 1,
          pageSize: 1000,
        });

        // Get all course elements for this class (excluding PE, elementType === 2)
        const allCourseElements = courseElementsRes.filter(ce => {
          const classAssessment = classAssessmentRes.items.find(ca => ca.courseElementId === ce.id);
          return classAssessment && classAssessment.classId === Number(selectedClassId) && ce.elementType !== 2; // Exclude PE (2)
        });

        const reportData: GradeReportData[] = [];

        // Process PE separately from grading groups (if selected)
        if (exportTypes.practicalExam && user?.id) {
          try {
            // Get lecturerId from user
            const lecturerList = await lecturerService.getLecturerList();
            const currentLecturer = lecturerList.find(
              (l) => l.accountId === user.id.toString()
            );
            
            if (currentLecturer) {
              const lecturerId = Number(currentLecturer.lecturerId);
              
              // Fetch all grading groups for this lecturer
              const allGradingGroups = await gradingGroupService.getGradingGroups({
                lecturerId: lecturerId,
              });

              // Fetch all submissions from all grading groups
              const allPESubmissions: Submission[] = [];
              for (const group of allGradingGroups) {
                const groupSubmissions = await submissionService.getSubmissionList({
                  gradingGroupId: group.id,
                }).catch(() => []);
                allPESubmissions.push(...groupSubmissions);
              }

              // Get unique assessmentTemplateIds from grading groups
              const assessmentTemplateIds = Array.from(
                new Set(
                  allGradingGroups
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

              // Group submissions by grading group and process
              for (const group of allGradingGroups) {
                const groupSubmissions = allPESubmissions.filter(s => s.gradingGroupId === group.id);
                if (groupSubmissions.length === 0) continue;

                const assessmentTemplate = group.assessmentTemplateId ? assessmentTemplateMap.get(Number(group.assessmentTemplateId)) : null;
                if (!assessmentTemplate) continue;

                const courseElement = courseElementMap.get(Number(assessmentTemplate.courseElementId));
                if (!courseElement) continue;

                // Fetch questions and rubrics
                let questions: any[] = [];
                const rubrics: { [questionId: number]: any[] } = {};

                try {
                  const papersRes = await assessmentPaperService.getAssessmentPapers({
                    assessmentTemplateId: assessmentTemplate.id,
                    pageNumber: 1,
                    pageSize: 100,
                  });

                  for (const paper of papersRes.items) {
                    const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                      assessmentPaperId: paper.id,
                      pageNumber: 1,
                      pageSize: 100,
                    });
                    questions = [...questions, ...questionsRes.items];

                    for (const question of questionsRes.items) {
                      const rubricsRes = await rubricItemService.getRubricsForQuestion({
                        assessmentQuestionId: question.id,
                        pageNumber: 1,
                        pageSize: 100,
                      });
                      rubrics[question.id] = rubricsRes.items;
                    }
                  }
                } catch (err) {
                  console.error(`Failed to fetch questions/rubrics for PE ${courseElement.id}:`, err);
                }

                // Process all submissions in this grading group
                for (const submission of groupSubmissions) {
                  let gradingSession = null;
                  let gradeItems: any[] = [];

                  try {
                    const gradingSessionsResult = await gradingService.getGradingSessions({
                      submissionId: submission.id,
                    });
                    if (gradingSessionsResult.items.length > 0) {
                      gradingSession = gradingSessionsResult.items.sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )[0];
                      
                      const gradeItemsResult = await gradeItemService.getGradeItems({
                        gradingSessionId: gradingSession.id,
                      });
                      gradeItems = gradeItemsResult.items;
                    }
                  } catch (err) {
                    console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
                  }

                  reportData.push({
                    submission,
                    gradingSession,
                    gradeItems,
                    questions,
                    rubrics,
                    feedback: {
                      overallFeedback: "",
                      strengths: "",
                      weaknesses: "",
                      codeQuality: "",
                      algorithmEfficiency: "",
                      suggestionsForImprovement: "",
                      bestPractices: "",
                      errorHandling: "",
                    },
                    courseElementName: courseElement.name,
                    assignmentType: "Practical Exam",
                  });
                }
              }
            }
          } catch (err) {
            console.error("Failed to fetch PE data:", err);
          }
        }

        // Process each course element (Assignment and Lab only)
        for (const courseElement of allCourseElements) {
          const classAssessment = classAssessmentRes.items.find(ca => ca.courseElementId === courseElement.id);
          if (!classAssessment) continue;

          // Determine assignment type
          let assignmentType: "Assignment" | "Lab" | "Practical Exam" = "Assignment";
          if (courseElement.elementType === 1) { // 1: Lab
            assignmentType = "Lab";
          }

          // Filter by selected export types
          if (assignmentType === "Assignment" && !exportTypes.assignment) continue;
          if (assignmentType === "Lab" && !exportTypes.lab) continue;

          // Fetch all students in the class
          const allStudents = await classService.getStudentsInClass(Number(selectedClassId)).catch(() => []);
          
          // Fetch submissions for this class assessment
          const submissions = await submissionService.getSubmissionList({
            classAssessmentId: classAssessment.id,
          }).catch(() => []);

          // Create a map of studentId to submission for quick lookup
          const submissionMap = new Map<number, Submission>();
          for (const submission of submissions) {
            if (submission.studentId) {
              submissionMap.set(submission.studentId, submission);
            }
          }

          // Fetch questions and rubrics ONCE per course element (not per student)
          let questions: any[] = [];
          const rubrics: { [questionId: number]: any[] } = {};

          try {
            let assessmentTemplateId: number | null = classAssessment.assessmentTemplateId || null;
            
            // If no template from class assessment, try grading group (from any submission)
            if (!assessmentTemplateId && submissions.length > 0) {
              const firstSubmission = submissions[0];
              if (firstSubmission.gradingGroupId) {
                const gradingGroup = gradingGroups.find(g => g.id === firstSubmission.gradingGroupId);
                assessmentTemplateId = gradingGroup?.assessmentTemplateId || null;
              }
            }

            if (assessmentTemplateId !== null) {
              // Fetch papers
              const papersRes = await assessmentPaperService.getAssessmentPapers({
                assessmentTemplateId: assessmentTemplateId,
                pageNumber: 1,
                pageSize: 100,
              });

              // Fetch questions for each paper
              for (const paper of papersRes.items) {
                const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                  assessmentPaperId: paper.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                questions = [...questions, ...questionsRes.items];

                // Fetch rubrics for each question
                for (const question of questionsRes.items) {
                  const rubricsRes = await rubricItemService.getRubricsForQuestion({
                    assessmentQuestionId: question.id,
                    pageNumber: 1,
                    pageSize: 100,
                  });
                  rubrics[question.id] = rubricsRes.items;
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch questions/rubrics for course element ${courseElement.id}:`, err);
          }

          // Process ALL students in the class (not just those with submissions)
          for (const student of allStudents) {
            const submission = submissionMap.get(student.studentId) || null;
            // Fetch latest grading session (only if submission exists)
            let gradingSession = null;
            let gradeItems: any[] = [];

            if (submission) {
              try {
                const gradingSessionsResult = await gradingService.getGradingSessions({
                  submissionId: submission.id,
                });
                if (gradingSessionsResult.items.length > 0) {
                  gradingSession = gradingSessionsResult.items.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )[0];
                  
                  // Fetch grade items
                  const gradeItemsResult = await gradeItemService.getGradeItems({
                    gradingSessionId: gradingSession.id,
                  });
                  gradeItems = gradeItemsResult.items;
                }
              } catch (err) {
                console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
              }
            }

            // Determine assignment type from course element name
            const assignmentTypeFromName = (() => {
              const nameLower = (courseElement.name || "").toLowerCase();
              if (nameLower.includes("lab") || nameLower.includes("thực hành")) {
                return "Lab";
              } else if (nameLower.includes("exam") || nameLower.includes("pe") || nameLower.includes("practical") || 
                         nameLower.includes("thi thực hành") || nameLower.includes("kiểm tra thực hành")) {
                return "Practical Exam";
              }
              return "Assignment";
            })();

            // Create a submission object if it doesn't exist (for students without submission)
            const submissionData: Submission = submission || {
              id: 0,
              studentId: student.studentId,
              studentCode: student.studentCode || "",
              studentName: student.studentName || "",
              classAssessmentId: classAssessment.id,
              submittedAt: "",
              lastGrade: 0,
              status: 0,
              createdAt: "",
              updatedAt: "",
              submissionFile: null,
            };

            reportData.push({
              submission: submissionData,
              gradingSession,
              gradeItems,
              questions,
              rubrics,
              feedback: {
                overallFeedback: "",
                strengths: "",
                weaknesses: "",
                codeQuality: "",
                algorithmEfficiency: "",
                suggestionsForImprovement: "",
                bestPractices: "",
                errorHandling: "",
              },
              courseElementName: courseElement.name,
              assignmentType: assignmentTypeFromName,
            });
          }
        }

        if (reportData.length === 0) {
          messageApi.warning("No data available to export");
          return;
        }

        console.log("Exporting report with", reportData.length, "submissions");
        await exportGradeReportToExcel(reportData, "Full_Grade_Report");
        messageApi.success("Full grade report exported successfully");
      } else if (user?.role === ROLES.STUDENT) {
        // Student export: only their own data
        if (!studentId) {
          messageApi.error("Student ID not found");
          return;
        }

        const reportData: GradeReportData[] = [];

        // Fetch all submissions for the student
        const allSubmissions = await submissionService.getSubmissionList({
          studentId: studentId,
        });

        // Separate PE submissions (have gradingGroupId) from other submissions
        const peSubmissions = allSubmissions.filter(s => s.gradingGroupId !== null && s.gradingGroupId !== undefined);
        const otherSubmissions = allSubmissions.filter(s => !s.gradingGroupId);

        // Group other submissions by classAssessmentId to get course elements (Assignment and Lab)
        const classAssessmentIds = Array.from(
          new Set(otherSubmissions.map((s) => s.classAssessmentId).filter((id) => id !== null && id !== undefined))
        );

        // Fetch all class assessments to get course element info
        const classId = classData.id.toString();
        if (!classId) {
          messageApi.error("Class ID not found");
          return;
        }

        const classAssessmentsRes = await classAssessmentService.getClassAssessments({
          classId: Number(classId),
          pageNumber: 1,
          pageSize: 1000,
        }).catch(() => ({ items: [] }));

        // Fetch all course elements
        const courseElementsRes = await courseElementService.getCourseElements({
          pageNumber: 1,
          pageSize: 1000,
        }).catch(() => []);

        const courseElementMap = new Map(courseElementsRes.map(ce => [ce.id, ce]));

        // Group submissions by course element (classAssessmentId -> courseElementId) for Assignment and Lab
        const courseElementSubmissionsMap = new Map<number, Submission[]>();
        for (const classAssessmentId of classAssessmentIds) {
          if (!classAssessmentId) continue;

          // Find class assessment
          const classAssessment = classAssessmentsRes.items.find(ca => ca.id === classAssessmentId);
          if (!classAssessment) continue;

          // Get course element from map
          const courseElement = courseElementMap.get(classAssessment.courseElementId || 0);
          if (!courseElement) continue;

          // Determine assignment type from course element name
          const assignmentType: "Assignment" | "Lab" | "Practical Exam" = (() => {
            const nameLower = (courseElement.name || "").toLowerCase();
            if (nameLower.includes("lab") || nameLower.includes("thực hành")) {
              return "Lab";
            }
            return "Assignment";
          })();

          // Filter by selected export types
          if (assignmentType === "Assignment" && !exportTypes.assignment) continue;
          if (assignmentType === "Lab" && !exportTypes.lab) continue;

          // Get submissions for this class assessment
          const submissions = otherSubmissions.filter((s) => s.classAssessmentId === classAssessmentId);
          
          // Group by course element ID
          const courseElementId = courseElement.id;
          if (!courseElementSubmissionsMap.has(courseElementId)) {
            courseElementSubmissionsMap.set(courseElementId, []);
          }
          courseElementSubmissionsMap.get(courseElementId)!.push(...submissions);
        }

        // Process each course element (similar to lecturer export)
        for (const [courseElementId, submissions] of courseElementSubmissionsMap.entries()) {
          const courseElement = courseElementMap.get(courseElementId);
          if (!courseElement) continue;

          // Find class assessment for this course element
          const classAssessment = classAssessmentsRes.items.find(ca => ca.courseElementId === courseElementId);
          if (!classAssessment) continue;

          // Determine assignment type
          const assignmentType: "Assignment" | "Lab" | "Practical Exam" = (() => {
            const nameLower = (courseElement.name || "").toLowerCase();
            if (nameLower.includes("lab") || nameLower.includes("thực hành")) {
              return "Lab";
            } else if (nameLower.includes("exam") || nameLower.includes("pe") || nameLower.includes("practical") || 
                       nameLower.includes("thi thực hành") || nameLower.includes("kiểm tra thực hành")) {
              return "Practical Exam";
            }
            return "Assignment";
          })();

          // Fetch questions and rubrics ONCE per course element (not per submission)
          let questions: any[] = [];
          const rubrics: { [questionId: number]: any[] } = {};

          try {
            let assessmentTemplateId: number | null = classAssessment.assessmentTemplateId || null;

            if (assessmentTemplateId !== null) {
              // Fetch papers
              const papersRes = await assessmentPaperService.getAssessmentPapers({
                assessmentTemplateId: assessmentTemplateId,
                pageNumber: 1,
                pageSize: 100,
              });

              // Fetch questions for each paper
              for (const paper of papersRes.items) {
                const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                  assessmentPaperId: paper.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                questions = [...questions, ...questionsRes.items];

                // Fetch rubrics for each question
                for (const question of questionsRes.items) {
                  const rubricsRes = await rubricItemService.getRubricsForQuestion({
                    assessmentQuestionId: question.id,
                    pageNumber: 1,
                    pageSize: 100,
                  });
                  rubrics[question.id] = rubricsRes.items;
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch questions/rubrics for course element ${courseElementId}:`, err);
          }

          // Process all submissions for this course element - find latest grading session
          // Only use gradeItems from the latest grading session to avoid duplicates
          let latestSubmission: Submission | null = null;
          let allGradeItems: any[] = [];
          let latestGradingSession = null;
          let latestSubmissionWithGrading: Submission | null = null;

          // Find the submission with the latest grading session
          for (const submission of submissions) {
            // Keep track of latest submission
            if (submission.submittedAt && submission.submittedAt !== "") {
              if (!latestSubmission || new Date(submission.submittedAt).getTime() > new Date(latestSubmission.submittedAt).getTime()) {
                latestSubmission = submission;
              }
            } else if (!latestSubmission) {
              latestSubmission = submission;
            }

            // Fetch latest grading session for this submission
            try {
              const gradingSessionsResult = await gradingService.getGradingSessions({
                submissionId: submission.id,
              });
              if (gradingSessionsResult.items.length > 0) {
                const gradingSession = gradingSessionsResult.items.sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
                
                // Keep latest grading session across all submissions
                if (!latestGradingSession || new Date(gradingSession.createdAt).getTime() > new Date(latestGradingSession.createdAt).getTime()) {
                  latestGradingSession = gradingSession;
                  latestSubmissionWithGrading = submission;
                }
              }
            } catch (err) {
              console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
            }
          }

          // Only fetch gradeItems from the latest grading session (not from all submissions)
          if (latestGradingSession && latestSubmissionWithGrading) {
            try {
              const gradeItemsResult = await gradeItemService.getGradeItems({
                gradingSessionId: latestGradingSession.id,
              });
              allGradeItems = gradeItemsResult.items;
            } catch (err) {
              console.error(`Failed to fetch grade items for grading session ${latestGradingSession.id}:`, err);
            }
          }

          // Use latest submission or first submission if no latest
          const submissionToUse = latestSubmission || submissions[0];
          if (!submissionToUse) continue;

          reportData.push({
            submission: submissionToUse,
            gradingSession: latestGradingSession,
            gradeItems: allGradeItems, // Grade items from latest grading session only (no duplicates)
            questions,
            rubrics,
            feedback: {
              overallFeedback: "",
              strengths: "",
              weaknesses: "",
              codeQuality: "",
              algorithmEfficiency: "",
              suggestionsForImprovement: "",
              bestPractices: "",
              errorHandling: "",
            },
            courseElementName: courseElement.name,
            assignmentType,
          });
        }

        // Process PE submissions separately (if selected)
        if (exportTypes.practicalExam && peSubmissions.length > 0) {
          try {
            // Get unique grading group IDs
            const gradingGroupIds = Array.from(
              new Set(peSubmissions.map(s => s.gradingGroupId).filter(id => id !== null && id !== undefined))
            );

            // Fetch grading groups
            const allGradingGroups = await Promise.all(
              gradingGroupIds.map(id => 
                gradingGroupService.getGradingGroups({}).then(groups => 
                  groups.find(g => g.id === id)
                ).catch(() => null)
              )
            );
            const gradingGroupsMap = new Map<number, GradingGroup>();
            allGradingGroups.forEach(group => {
              if (group) {
                gradingGroupsMap.set(group.id, group);
              }
            });

            // Get unique assessmentTemplateIds from grading groups
            const assessmentTemplateIds = Array.from(
              new Set(
                Array.from(gradingGroupsMap.values())
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
            const peCourseElementMap = new Map<number, CourseElement>();
            if (courseElementIds.length > 0) {
              const allCourseElementsRes = await courseElementService.getCourseElements({
                pageNumber: 1,
                pageSize: 1000,
              }).catch(() => []);

              allCourseElementsRes.forEach((element) => {
                if (courseElementIds.includes(element.id)) {
                  peCourseElementMap.set(element.id, element);
                }
              });
            }

            // Group PE submissions by grading group and process
            const peSubmissionsByGroup = new Map<number, Submission[]>();
            for (const submission of peSubmissions) {
              if (!submission.gradingGroupId) continue;
              if (!peSubmissionsByGroup.has(submission.gradingGroupId)) {
                peSubmissionsByGroup.set(submission.gradingGroupId, []);
              }
              peSubmissionsByGroup.get(submission.gradingGroupId)!.push(submission);
            }

            for (const [gradingGroupId, groupSubmissions] of peSubmissionsByGroup.entries()) {
              const gradingGroup = gradingGroupsMap.get(gradingGroupId);
              if (!gradingGroup || !gradingGroup.assessmentTemplateId) continue;

              const assessmentTemplate = assessmentTemplateMap.get(Number(gradingGroup.assessmentTemplateId));
              if (!assessmentTemplate) continue;

              const courseElement = peCourseElementMap.get(Number(assessmentTemplate.courseElementId));
              if (!courseElement) continue;

              // Fetch questions and rubrics
              let questions: any[] = [];
              const rubrics: { [questionId: number]: any[] } = {};

              try {
                const papersRes = await assessmentPaperService.getAssessmentPapers({
                  assessmentTemplateId: assessmentTemplate.id,
                  pageNumber: 1,
                  pageSize: 100,
                });

                for (const paper of papersRes.items) {
                  const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                    assessmentPaperId: paper.id,
                    pageNumber: 1,
                    pageSize: 100,
                  });
                  questions = [...questions, ...questionsRes.items];

                  for (const question of questionsRes.items) {
                    const rubricsRes = await rubricItemService.getRubricsForQuestion({
                      assessmentQuestionId: question.id,
                      pageNumber: 1,
                      pageSize: 100,
                    });
                    rubrics[question.id] = rubricsRes.items;
                  }
                }
              } catch (err) {
                console.error(`Failed to fetch questions/rubrics for PE ${courseElement.id}:`, err);
              }

              // Process all submissions in this grading group - find latest grading session
              let latestSubmission: Submission | null = null;
              let allGradeItems: any[] = [];
              let latestGradingSession = null;
              let latestSubmissionWithGrading: Submission | null = null;

              for (const submission of groupSubmissions) {
                // Keep track of latest submission
                if (submission.submittedAt && submission.submittedAt !== "") {
                  if (!latestSubmission || new Date(submission.submittedAt).getTime() > new Date(latestSubmission.submittedAt).getTime()) {
                    latestSubmission = submission;
                  }
                } else if (!latestSubmission) {
                  latestSubmission = submission;
                }

                // Fetch latest grading session for this submission
                try {
                  const gradingSessionsResult = await gradingService.getGradingSessions({
                    submissionId: submission.id,
                  });
                  if (gradingSessionsResult.items.length > 0) {
                    const gradingSession = gradingSessionsResult.items.sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];
                    
                    // Keep latest grading session across all submissions
                    if (!latestGradingSession || new Date(gradingSession.createdAt).getTime() > new Date(latestGradingSession.createdAt).getTime()) {
                      latestGradingSession = gradingSession;
                      latestSubmissionWithGrading = submission;
                    }
                  }
                } catch (err) {
                  console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
                }
              }

              // Only fetch gradeItems from the latest grading session
              if (latestGradingSession && latestSubmissionWithGrading) {
                try {
                  const gradeItemsResult = await gradeItemService.getGradeItems({
                    gradingSessionId: latestGradingSession.id,
                  });
                  allGradeItems = gradeItemsResult.items;
                } catch (err) {
                  console.error(`Failed to fetch grade items for grading session ${latestGradingSession.id}:`, err);
                }
              }

              // Use latest submission or first submission if no latest
              const submissionToUse = latestSubmission || groupSubmissions[0];
              if (!submissionToUse) continue;

              reportData.push({
                submission: submissionToUse,
                gradingSession: latestGradingSession,
                gradeItems: allGradeItems,
                questions,
                rubrics,
                feedback: {
                  overallFeedback: "",
                  strengths: "",
                  weaknesses: "",
                  codeQuality: "",
                  algorithmEfficiency: "",
                  suggestionsForImprovement: "",
                  bestPractices: "",
                  errorHandling: "",
                },
                courseElementName: courseElement.name,
                assignmentType: "Practical Exam",
              });
            }
          } catch (err) {
            console.error("Failed to fetch PE data:", err);
          }
        }

        if (reportData.length === 0) {
          messageApi.warning("No data available to export");
          return;
        }

        console.log("Exporting report for student:", studentId);
        await exportGradeReportToExcel(reportData, `Grade_Report_${studentId}`);
        messageApi.success("Report exported successfully");
      }
    } catch (err: any) {
      console.error("Export error:", err);
      messageApi.error(err.message || "Export failed. Please check browser console for details.");
    }
  };
  return (
    <div className={styles.pageWrapper}>
      {/* 1. Ảnh Banner */}
      <div className={styles.imageWrapper}>
        <Image
          src="/classes/class-info.png"
          alt="Class Banner"
          width={1200}
          height={400}
          className={styles.image}
        />
      </div>

      {/* 2. Nội dung */}
      <div className={styles.contentWrapper}>
        {/* Tiêu đề chính */}
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D",
            marginBottom: "20px",
            fontSize: "2.2rem",
          }}
        >
          {classData.courseName} ({classData.classCode})
        </Title>

        {/* 6. Phần chi tiết (Đã sửa lỗi 'icon') */}
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2 }}
          className={styles.descriptions}
        >
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <ReadOutlined style={{ marginRight: 8 }} />
                Course Code
              </span>
            }
            span={1}
          >
            {classData.courseCode}
          </Descriptions.Item>
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Semester
              </span>
            }
            span={1}
          >
            {classData.semesterName}
          </Descriptions.Item>
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <InfoCircleOutlined style={{ marginRight: 8 }} />
                Class Code
              </span>
            }
            span={1}
          >
            {classData.classCode}
          </Descriptions.Item>
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <TeamOutlined style={{ marginRight: 8 }} />
                Total Students
              </span>
            }
            span={1}
          >
            {classData.studentCount}
          </Descriptions.Item>
        </Descriptions>

        {/* 7. Phần mô tả */}
        <Title level={4} style={{ marginTop: "30px" }}>
          Class Description
        </Title>
        <Paragraph
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "30px",
          }}
        >
          {classData.description}
        </Paragraph>

        <Divider />

        {/* 9. Tác giả (Giảng viên) */}
        <div className={styles.authorBox}>
          <Avatar
            src="/classes/avatar-teacher.png"
            size={50}
            style={{ marginRight: "15px" }}
            icon={<UserOutlined />}
          />
          <div>
            <Text type="secondary" style={{ fontSize: "0.9rem" }}>
              Lecturer
            </Text>
            <Text
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "1.1rem",
                color: "#333",
              }}
            >
              {classData.lecturerName}
            </Text>
          </div>
        </div>
      </div>

    </div>
  );
}
