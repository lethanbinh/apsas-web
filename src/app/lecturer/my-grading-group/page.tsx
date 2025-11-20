"use client";

import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { lecturerService } from "@/services/lecturerService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import {
  Semester,
  SemesterPlanDetail,
  semesterService
} from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  RobotOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Collapse,
  Divider,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import styles from "./MySubmissions.module.css";

const { Title, Text, Paragraph } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

const getStatusTag = (status: number) => {
  switch (status) {
    case 0:
      return <Tag color="default">Not graded</Tag>;
    case 1:
      return <Tag color="processing">Grading</Tag>;
    case 2:
      return <Tag color="success">Graded</Tag>;
    default:
      return <Tag>Unknown</Tag>;
  }
};

interface EnrichedSubmission extends Submission {
  courseName?: string;
  semesterCode?: string;
  semesterEndDate?: string;
  isSemesterPassed?: boolean;
  gradingGroup?: GradingGroup;
}

const MySubmissionsPageContent = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingGroups, setGradingGroups] = useState<GradingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [selectedGradingGroup, setSelectedGradingGroup] = useState<GradingGroup | null>(null);
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  const { user, isLoading: authLoading } = useAuth();
  const [currentLecturerId, setCurrentLecturerId] = useState<number | null>(
    null
  );

  const [semesters, setSemesters] = useState<SemesterPlanDetail[]>([]);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [classAssessments, setClassAssessments] = useState<Map<number, ClassAssessment>>(new Map());
  const [classes, setClasses] = useState<Map<number, ClassInfo>>(new Map());
  const [gradingGroupToSemesterMap, setGradingGroupToSemesterMap] = useState<Map<number, string>>(new Map());

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(
    undefined
  );
  const [selectedGradingGroupId, setSelectedGradingGroupId] = useState<number | undefined>(
    undefined
  );
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
  const [batchGradingLoading, setBatchGradingLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== ROLES.LECTURER) {
      setError("Bạn không có quyền truy cập trang này.");
      setLoading(false);
      return;
    }

    const fetchLecturerId = async () => {
      try {
        const lecturerList = await lecturerService.getLecturerList();
        const currentLecturer = lecturerList.find(
          (l) => l.accountId === user.id.toString()
        );
        if (currentLecturer) {
          setCurrentLecturerId(Number(currentLecturer.lecturerId));
        } else {
          setError("Không tìm thấy thông tin giảng viên cho tài khoản này.");
        }
      } catch (err: any) {
        setError(err.message || "Lỗi khi tải dữ liệu giảng viên.");
      }
    };

    fetchLecturerId();
  }, [user, authLoading]);


  useEffect(() => {
    if (!currentLecturerId) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch grading groups for this lecturer
        const groups = await gradingGroupService.getGradingGroups({
          lecturerId: currentLecturerId,
        });
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

        // Map grading groups to semester codes using assessmentTemplateId
        const groupToSemesterMap = new Map<number, string>();
        groups.forEach((group) => {
          if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
            const assessmentTemplate = assessmentTemplateMap.get(Number(group.assessmentTemplateId));
            if (assessmentTemplate) {
              const courseElement = courseElementMap.get(Number(assessmentTemplate.courseElementId));
              if (courseElement && courseElement.semesterCourse && courseElement.semesterCourse.semester) {
                const semesterCode = courseElement.semesterCourse.semester.semesterCode;
                groupToSemesterMap.set(Number(group.id), semesterCode);
              }
            }
          }
        });
        setGradingGroupToSemesterMap(groupToSemesterMap);

        // Fetch all submissions from all grading groups
        const allSubmissionPromises = groups.map((group) =>
          submissionService.getSubmissionList({
            gradingGroupId: group.id,
          }).catch(() => [])
        );
        const allSubmissionResults = await Promise.all(allSubmissionPromises);
        const allSubmissions = allSubmissionResults.flat();
        setSubmissions(allSubmissions);

        // Fetch class assessments for submissions
        const classAssessmentIds = Array.from(
          new Set(allSubmissions.filter((s) => s.classAssessmentId).map((s) => s.classAssessmentId!))
        );
        
        const classAssessmentMap = new Map<number, ClassAssessment>();
        if (classAssessmentIds.length > 0) {
          // Fetch all class assessments (we need to get them by classId, so we'll fetch all and filter)
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
  }, [currentLecturerId]);

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
        // Tạm comment lại check học kỳ
        // const isPassed = isSemesterPassed(semesterEndDate);
        
        // Get class assessment for this submission
        const classAssessment = sub.classAssessmentId ? classAssessments.get(sub.classAssessmentId) : undefined;
        
        // Find grading group for this submission
        const gradingGroup = sub.gradingGroupId !== undefined 
          ? filteredGradingGroups.find((g) => g.id === sub.gradingGroupId)
          : undefined;

      return {
        ...sub,
          courseName: classAssessment?.courseName || "N/A",
          semesterCode: semesterCode || undefined,
          semesterEndDate,
          // Tạm comment lại check học kỳ
          isSemesterPassed: false, // isPassed,
          gradingGroup,
      };
    });
  }, [submissions, classAssessments, semesters, filteredGradingGroups, filteredGradingGroupIds, gradingGroupToSemesterMap]);

  const filteredData = useMemo(() => {
    // First, filter by semester, grading group, and search text
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

      // Filter by grading group
      let gradingGroupMatch = true;
      if (selectedGradingGroupId !== undefined) {
        gradingGroupMatch = sub.gradingGroupId !== undefined && 
                           sub.gradingGroupId === selectedGradingGroupId;
      }

      // Filter by search text
      const searchMatch =
        sub.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.studentCode.toLowerCase().includes(searchText.toLowerCase()) ||
        (sub.submissionFile?.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());

      return semesterMatch && gradingGroupMatch && searchMatch;
    });

    // Group by (semesterCode, studentId, gradingGroupId) and keep only the latest submission in each group
    const groupedMap = new Map<string, EnrichedSubmission>();
    
    filtered.forEach((sub) => {
      const key = `${sub.semesterCode || 'unknown'}_${sub.studentId}_${sub.gradingGroupId || 'unknown'}`;
      const existing = groupedMap.get(key);
      
      if (!existing) {
        groupedMap.set(key, sub);
      } else {
        // Compare submittedAt - keep the one with the latest date
        const existingDate = existing.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
        const currentDate = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          groupedMap.set(key, sub);
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
    selectedGradingGroupId,
    semesters,
  ]);


  const handleViewDetail = (submission: EnrichedSubmission) => {
    localStorage.setItem("selectedSubmissionId", submission.id.toString());
    router.push(`/lecturer/assignment-grading`);
  };

  const handleBatchGrading = async () => {
    if (filteredData.length === 0) {
      messageApi.warning("No submissions to grade");
      return;
    }

    try {
      setBatchGradingLoading(true);
      messageApi.loading(`Starting batch grading for ${filteredData.length} submission(s)...`, 0);

      // Call auto grading for each submission
      const gradingPromises = filteredData.map(async (submission) => {
        try {
          // Get assessmentTemplateId from grading group
          const gradingGroup = submission.gradingGroup;
          if (!gradingGroup?.assessmentTemplateId) {
            return { 
              success: false, 
              submissionId: submission.id, 
              error: "Cannot find assessment template for this submission" 
            };
          }

          await gradingService.autoGrading({
            submissionId: submission.id,
            assessmentTemplateId: gradingGroup.assessmentTemplateId,
          });
          return { success: true, submissionId: submission.id };
        } catch (err: any) {
          console.error(`Failed to grade submission ${submission.id}:`, err);
          return { 
            success: false, 
            submissionId: submission.id, 
            error: err.message || "Unknown error" 
          };
        }
      });

      const results = await Promise.all(gradingPromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      messageApi.destroy();
      setBatchGradingLoading(false);

      if (successCount > 0) {
        messageApi.success(`Batch grading started for ${successCount}/${filteredData.length} submission(s)`);
        // Refresh data after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      if (failCount > 0) {
        messageApi.warning(`Failed to start grading for ${failCount} submission(s)`);
      }
    } catch (err: any) {
      console.error("Failed to start batch grading:", err);
      messageApi.destroy();
      setBatchGradingLoading(false);
      messageApi.error(err.message || "Failed to start batch grading");
    }
  };


  const handleExportExcel = async () => {
    try {
      messageApi.info("Preparing export data...");

      const exportData: any[] = [];
      
      for (const sub of submissions) {
        // Only export submissions from filtered grading groups
        if (!sub.gradingGroupId || !filteredGradingGroupIds.has(sub.gradingGroupId)) {
          continue;
        }

        // Load feedback from localStorage
        let feedback: any = {};
        try {
          const savedFeedback = localStorage.getItem(`feedback_${sub.id}`);
          if (savedFeedback) {
            feedback = JSON.parse(savedFeedback);
          } else {
            feedback = {
              overallFeedback: "Sample overall feedback",
              strengths: "Sample strengths",
              weaknesses: "Sample weaknesses",
              codeQuality: "Sample code quality feedback",
              algorithmEfficiency: "Sample algorithm efficiency feedback",
              suggestionsForImprovement: "Sample suggestions",
              bestPractices: "Sample best practices feedback",
              errorHandling: "Sample error handling feedback",
            };
          }
        } catch (err) {
          console.error(`Failed to load feedback for submission ${sub.id}:`, err);
        }

        const baseRow: any = {
          "No.": exportData.length + 1,
          "Submission ID": sub.id,
          "Student Code": sub.studentCode,
          "Student Name": sub.studentName,
          "Submission File": sub.submissionFile?.name || "N/A",
          "Submitted At": sub.submittedAt
            ? new Date(sub.submittedAt).toLocaleString("en-US")
            : "N/A",
          "Total Grade": sub.lastGrade > 0 ? `${sub.lastGrade}/100` : "Not graded",
          "Status":
            sub.status === 0
              ? "Not graded"
              : sub.status === 1
              ? "Grading"
              : "Graded",
        };

        exportData.push(baseRow);

        // Add feedback rows
        const feedbackRows = [
          { "Feedback Category": "Overall Feedback", "Feedback Content": feedback.overallFeedback || "N/A" },
          { "Feedback Category": "Strengths", "Feedback Content": feedback.strengths || "N/A" },
          { "Feedback Category": "Weaknesses", "Feedback Content": feedback.weaknesses || "N/A" },
          { "Feedback Category": "Code Quality", "Feedback Content": feedback.codeQuality || "N/A" },
          { "Feedback Category": "Algorithm Efficiency", "Feedback Content": feedback.algorithmEfficiency || "N/A" },
          { "Feedback Category": "Suggestions for Improvement", "Feedback Content": feedback.suggestionsForImprovement || "N/A" },
          { "Feedback Category": "Best Practices", "Feedback Content": feedback.bestPractices || "N/A" },
          { "Feedback Category": "Error Handling", "Feedback Content": feedback.errorHandling || "N/A" },
        ];

        feedbackRows.forEach((row) => {
          exportData.push({
            ...baseRow,
            "No.": "",
            "Feedback Category": row["Feedback Category"],
            "Feedback Content": row["Feedback Content"],
          });
        });

        // Fetch questions and rubrics for this submission's grading group
        const gradingGroup = filteredGradingGroups.find((g) => g.id === sub.gradingGroupId);
        if (gradingGroup?.assessmentTemplateId) {
          try {
            const papersRes = await assessmentPaperService.getAssessmentPapers({
              assessmentTemplateId: gradingGroup.assessmentTemplateId,
              pageNumber: 1,
              pageSize: 100,
            });
            const papers = papersRes.items;

            for (const paper of papers) {
              const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                assessmentPaperId: paper.id,
                pageNumber: 1,
                pageSize: 100,
              });
              const questions = questionsRes.items;

              for (const question of questions) {
                const rubricsRes = await rubricItemService.getRubricsForQuestion({
                  assessmentQuestionId: question.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                const rubrics = rubricsRes.items;

                for (const rubric of rubrics) {
                  exportData.push({
                    ...baseRow,
                    "No.": "",
                    "Feedback Category": "",
                    "Feedback Content": "",
                    "Question": question.questionText || "N/A",
                    "Criteria": rubric.description || "N/A",
                    "Score": rubric.score || 0,
                    "Description": rubric.description || "N/A",
                  });
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch questions/rubrics for submission ${sub.id}:`, err);
          }
        }
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Grading Report");

      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      const colWidths: { [key: string]: number } = {
        A: 10, // No.
        B: 15, // Submission ID
        C: 15, // Student Code
        D: 25, // Student Name
        E: 30, // Submission File
        F: 20, // Submitted At
        G: 15, // Total Grade
        H: 15, // Status
        I: 25, // Feedback Category
        J: 50, // Feedback Content
        K: 50, // Question
        L: 50, // Criteria
        M: 10, // Score
        N: 50, // Description
      };

      ws["!cols"] = Object.keys(colWidths).map((col) => ({
        wch: colWidths[col],
      }));

      // Apply wrap text to text-heavy columns
      const textColumns = ["J", "K", "L", "N"]; // Feedback Content, Question, Criteria, Description
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (const col of textColumns) {
          const cellAddress = XLSX.utils.encode_cell({ c: col.charCodeAt(0) - 65, r: R });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            alignment: { wrapText: true, vertical: "top" },
          };
        }
      }

      for (let R = 0; R <= range.e.r; ++R) {
        if (!ws["!rows"]) ws["!rows"] = [];
        ws["!rows"][R] = { hpt: 30 };
      }

      const fileName = `Grading_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      messageApi.success("Export successful");
    } catch (err: any) {
      console.error("Export error:", err);
      messageApi.error("Export failed");
    }
  };

  const handleViewExam = (gradingGroup: GradingGroup) => {
    setSelectedGradingGroup(gradingGroup);
    setViewExamModalVisible(true);
  };

  const columns: ColumnsType<EnrichedSubmission> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => a.id - b.id,
    },
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
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    },
    {
      title: "Grade",
      dataIndex: "lastGrade",
      key: "lastGrade",
      render: (grade: number) => (
        <span style={{ fontWeight: 600, color: grade > 0 ? "#52c41a" : "#999" }}>
          {grade > 0 ? `${grade}/100` : "Not graded"}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => getStatusTag(status),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: EnrichedSubmission) => (
        <Space>
        <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleViewDetail(record)}
            // Tạm comment lại check học kỳ
            // disabled={record.isSemesterPassed}
            // title={record.isSemesterPassed ? "Không thể chỉnh sửa điểm của kỳ học đã qua" : ""}
        />
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
          Grading
        </Title>
        <Space>
          {filteredGradingGroups.length > 0 && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleViewExam(filteredGradingGroups[0])}
              size="large"
            >
              View Exam
            </Button>
          )}
          {filteredData.length > 0 && (
            <Button
              icon={<RobotOutlined />}
              onClick={handleBatchGrading}
              loading={batchGradingLoading}
              size="large"
              type="primary"
            >
              Batch Grade
            </Button>
          )}
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            size="large"
          >
            Export Excel
          </Button>
        </Space>
      </div>
      <div style={{ marginBottom: 16, marginTop: 16 }}>
        <Space>
          <Select
            allowClear
            value={selectedSemester}
            onChange={(value) => {
              setSelectedSemester(value);
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
            value={selectedGradingGroupId}
            onChange={(value) => {
              setSelectedGradingGroupId(value);
            }}
            style={{ width: 250 }}
            placeholder="Filter by Assessment Template"
            options={filteredGradingGroups.map((g) => ({
              label: g.assessmentTemplateName || `Grading Group ${g.id}`,
              value: g.id,
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
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className={styles.table}
        />
      )}

      <ViewExamModal
        visible={viewExamModalVisible}
        onClose={() => {
          setViewExamModalVisible(false);
          setSelectedGradingGroup(null);
        }}
        gradingGroup={selectedGradingGroup}
        />

    </div>
  );
};

// View Exam Modal Component
function ViewExamModal({
  visible,
  onClose,
  gradingGroup,
}: {
  visible: boolean;
  onClose: () => void;
  gradingGroup: GradingGroup | null;
}) {
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});

  useEffect(() => {
    if (visible && gradingGroup?.assessmentTemplateId) {
      fetchExamData();
    }
  }, [visible, gradingGroup]);

  const fetchExamData = async () => {
    if (!gradingGroup?.assessmentTemplateId) return;
    
    setLoading(true);
    try {
      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: gradingGroup.assessmentTemplateId,
        pageNumber: 1,
        pageSize: 100,
      });
      const papersData = papersRes.items;
      setPapers(papersData);

      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      const rubricsMap: { [questionId: number]: RubricItem[] } = {};

      for (const paper of papersData) {
        const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
        });
        // Sort questions by questionNumber
        const questionsData = [...questionsRes.items].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        questionsMap[paper.id] = questionsData;

        for (const question of questionsData) {
          const rubricsRes = await rubricItemService.getRubricsForQuestion({
            assessmentQuestionId: question.id,
            pageNumber: 1,
            pageSize: 100,
          });
          const rubricsData = rubricsRes.items;
          rubricsMap[question.id] = rubricsData;
        }
      }

      setQuestions(questionsMap);
      setRubrics(rubricsMap);
    } catch (err) {
      console.error("Failed to fetch exam data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionColumns = (): ColumnsType<RubricItem> => {
    return [
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (text: string) => <Text>{text || "N/A"}</Text>,
      },
      {
        title: "Input",
        dataIndex: "input",
        key: "input",
        render: (text: string) => <Text>{text || "N/A"}</Text>,
      },
      {
        title: "Output",
        dataIndex: "output",
        key: "output",
        render: (text: string) => <Text>{text || "N/A"}</Text>,
      },
      {
        title: "Score",
        dataIndex: "score",
        key: "score",
        render: (score: number) => <Text strong>{score}</Text>,
      },
    ];
  };

  return (
    <Modal
      title="View Exam"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
    >
      <Spin spinning={loading}>
        {gradingGroup && (
          <div>
            <Title level={4} style={{ marginBottom: "16px" }}>
              {gradingGroup.assessmentTemplateName || "Exam"}
            </Title>
            <Paragraph
              ellipsis={{
                rows: 3,
                expandable: true,
                symbol: "Read more",
              }}
              style={{
                fontSize: "1rem",
                lineHeight: 1.6,
                color: "#555",
                marginBottom: "24px",
              }}
            >
              {gradingGroup.assessmentTemplateDescription || "No description"}
            </Paragraph>
            <Divider style={{ marginBottom: "24px" }} />
            
            {papers.length === 0 ? (
              <Text type="secondary">No papers found.</Text>
            ) : (
              <Collapse>
                {papers.map((paper) => (
                  <Collapse.Panel key={paper.id} header={paper.name || `Paper ${paper.id}`}>
                    <Paragraph
                      ellipsis={{
                        rows: 2,
                        expandable: true,
                        symbol: "Read more",
                      }}
                      style={{
                        fontSize: "0.95rem",
                        lineHeight: 1.6,
                        color: "#555",
                        marginBottom: "16px",
                      }}
                    >
                      {paper.description || "No description"}
                    </Paragraph>
                    {questions[paper.id] && questions[paper.id].length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        {questions[paper.id].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((question) => (
                          <div key={question.id} style={{ marginBottom: 24 }}>
                            <Title level={5}>Question {question.id}</Title>
                            <Text>{question.questionText}</Text>
                            {rubrics[question.id] && rubrics[question.id].length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <Table
                                  columns={getQuestionColumns()}
                                  dataSource={rubrics[question.id]}
                                  rowKey="id"
                                  pagination={false}
                                  size="small"
                                />
                              </div>
                            )}
                            <Divider />
                          </div>
                        ))}
                      </div>
                    )}
                  </Collapse.Panel>
                ))}
              </Collapse>
            )}
          </div>
        )}
      </Spin>
    </Modal>
  );
}

export default function MySubmissionsPage() {
  return (
    <App>
      <MySubmissionsPageContent />
    </App>
  );
}
