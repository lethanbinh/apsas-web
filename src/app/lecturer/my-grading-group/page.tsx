"use client";
import { GradingGroup } from "@/services/gradingGroupService";
import { Submission } from "@/services/submissionService";
import { Alert, App, Card, Space, Spin, Typography } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useMemo, useState } from "react";
import { GradingGroupFilters } from "./components/GradingGroupFilters";
import { GradingGroupTable } from "./components/GradingGroupTable";
import { UploadGradeSheetModal } from "./components/UploadGradeSheetModal";
import { useGradingGroupData } from "./hooks/useGradingGroupData";
import { useGradingGroupMutations } from "./hooks/useGradingGroupMutations";
import styles from "./MySubmissions.module.css";
import { flattenGradingGroups } from "./utils/flattenGradingGroups";
dayjs.extend(utc);
dayjs.extend(timezone);
const { Title, Text } = Typography;
export interface EnrichedSubmission extends Submission {
  courseName?: string;
  courseId?: number;
  semesterCode?: string;
  semesterEndDate?: string;
  isSemesterPassed?: boolean;
  gradingGroup?: GradingGroup;
  totalScore?: number;
}
const MySubmissionsPageContent = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(undefined);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(undefined);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedGradingGroupForUpload, setSelectedGradingGroupForUpload] = useState<GradingGroup | null>(null);
  const {
    error,
    gradingGroups,
    allSubmissions,
    submissionTotalScores,
    assessmentTemplateMap,
    gradingGroupToSemesterMap,
    gradingGroupToCourseMap,
    classAssessments,
    semesters,
    loading,
  } = useGradingGroupData(selectedSemester, setSelectedSemester);
  const { batchGradingMutation, uploadGradeSheetMutation } = useGradingGroupMutations();
  const filteredGradingGroups = useMemo(() => {
    const now = new Date();
    const groupedMap = new Map<string, GradingGroup>();
    gradingGroups.forEach((group) => {
      const semesterCode = gradingGroupToSemesterMap[group.id];
      const assessmentTemplateId = group.assessmentTemplateId;
      const lecturerId = group.lecturerId;
      if (!semesterCode || assessmentTemplateId === null || assessmentTemplateId === undefined) {
        return;
      }
      const semesterDetail = semesters.find((s) => s.semesterCode === semesterCode);
      if (semesterDetail) {
        const startDate = semesterDetail.startDate
          ? new Date(semesterDetail.startDate.endsWith("Z") ? semesterDetail.startDate : semesterDetail.startDate + "Z")
          : null;
        if (startDate && startDate > now) {
          return;
        }
      }
      const key = `${semesterCode}_${assessmentTemplateId}_${lecturerId}`;
      const existing = groupedMap.get(key);
      if (!existing) {
        groupedMap.set(key, group);
      } else {
        const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const currentDate = group.createdAt ? new Date(group.createdAt).getTime() : 0;
        if (currentDate > existingDate) {
          groupedMap.set(key, group);
        }
      }
    });
    return Array.from(groupedMap.values());
  }, [gradingGroups, gradingGroupToSemesterMap, semesters]);
  const filteredGradingGroupIds = useMemo(() => {
    return new Set(filteredGradingGroups.map(g => g.id));
  }, [filteredGradingGroups]);
  const enrichedSubmissions: EnrichedSubmission[] = useMemo(() => {
    return allSubmissions
      .filter((sub: Submission) => {
        return sub.gradingGroupId !== undefined && filteredGradingGroupIds.has(sub.gradingGroupId);
      })
      .map((sub: Submission) => {
        const semesterCode = sub.gradingGroupId !== undefined
          ? gradingGroupToSemesterMap[sub.gradingGroupId]
          : undefined;
        const semesterDetail = semesterCode ? semesters.find((s) => s.semesterCode === semesterCode) : undefined;
        const semesterEndDate = semesterDetail?.endDate;
        const classAssessment = sub.classAssessmentId ? classAssessments[sub.classAssessmentId] : undefined;
        const gradingGroup = sub.gradingGroupId !== undefined
          ? filteredGradingGroups.find((g) => g.id === sub.gradingGroupId)
          : undefined;
        const courseInfo = sub.gradingGroupId !== undefined
          ? gradingGroupToCourseMap[sub.gradingGroupId]
          : undefined;
        const totalScore = submissionTotalScores[sub.id];
        return {
          ...sub,
          courseName: courseInfo?.courseName || classAssessment?.courseName || "N/A",
          courseId: courseInfo?.courseId,
          semesterCode: semesterCode || undefined,
          semesterEndDate,
          isSemesterPassed: false,
          gradingGroup,
          totalScore,
        };
      });
  }, [allSubmissions, classAssessments, semesters, filteredGradingGroups, filteredGradingGroupIds, gradingGroupToSemesterMap, gradingGroupToCourseMap, submissionTotalScores]);
  const availableCourses = useMemo(() => {
    const now = new Date();
    const courseMap = new Map<number, { courseId: number; courseName: string }>();
    gradingGroups.forEach((group) => {
      const courseInfo = gradingGroupToCourseMap[group.id];
      const semesterCode = gradingGroupToSemesterMap[group.id];
      if (!courseInfo) return;
      const semesterDetail = semesterCode ? semesters.find((s) => s.semesterCode === semesterCode) : undefined;
      if (semesterDetail) {
        const startDate = semesterDetail.startDate
          ? new Date(semesterDetail.startDate.endsWith("Z") ? semesterDetail.startDate : semesterDetail.startDate + "Z")
          : null;
        if (startDate && startDate > now) {
          return;
        }
      }
      if (selectedSemester !== undefined) {
        const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
        const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
        if (selectedSemesterCode && semesterCode !== selectedSemesterCode) {
          return;
        }
      }
      if (!courseMap.has(courseInfo.courseId)) {
        courseMap.set(courseInfo.courseId, { courseId: courseInfo.courseId, courseName: courseInfo.courseName });
      }
    });
    return Array.from(courseMap.values());
  }, [gradingGroups, gradingGroupToCourseMap, gradingGroupToSemesterMap, selectedSemester, semesters]);
  const availableTemplates = useMemo(() => {
    const now = new Date();
    const templateMap = new Map<number, { id: number; name: string; assessmentTemplateId: number | null }>();
    gradingGroups.forEach((group) => {
      const courseInfo = gradingGroupToCourseMap[group.id];
      const semesterCode = gradingGroupToSemesterMap[group.id];
      const templateId = group.assessmentTemplateId;
      if (!templateId) return;
      const semesterDetail = semesterCode ? semesters.find((s) => s.semesterCode === semesterCode) : undefined;
      if (semesterDetail) {
        const startDate = semesterDetail.startDate
          ? new Date(semesterDetail.startDate.endsWith("Z") ? semesterDetail.startDate : semesterDetail.startDate + "Z")
          : null;
        if (startDate && startDate > now) {
          return;
        }
      }
      if (selectedSemester !== undefined) {
        const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
        const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
        if (selectedSemesterCode && semesterCode !== selectedSemesterCode) {
          return;
        }
      }
      if (selectedCourseId !== undefined) {
        if (courseInfo?.courseId !== selectedCourseId) {
          return;
        }
      }
      if (!templateMap.has(templateId)) {
        templateMap.set(templateId, {
          id: templateId,
          name: group.assessmentTemplateName || `Template ${templateId}`,
          assessmentTemplateId: templateId,
        });
      }
    });
    return Array.from(templateMap.values());
  }, [gradingGroups, gradingGroupToCourseMap, gradingGroupToSemesterMap, selectedSemester, selectedCourseId, semesters]);
  const handleUploadSubmit = async (gradingGroupId: number, file: File) => {
    uploadGradeSheetMutation.mutate({
      gradingGroupId,
      file,
    });
    setUploadModalVisible(false);
    setSelectedGradingGroupForUpload(null);
  };
  const flatGradingGroups = useMemo(() => {
    return flattenGradingGroups(
      gradingGroups,
      gradingGroupToCourseMap,
      gradingGroupToSemesterMap,
      enrichedSubmissions,
      semesters,
      selectedSemester,
      selectedCourseId,
      selectedTemplateId
    );
  }, [gradingGroups, gradingGroupToCourseMap, gradingGroupToSemesterMap, enrichedSubmissions, selectedSemester, selectedCourseId, selectedTemplateId, semesters]);
  return (
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
            Manage your teacher assignments and submissions
          </Text>
        </div>
        <Space>
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
        <>
          <GradingGroupFilters
            semesters={semesters}
            availableCourses={availableCourses}
            availableTemplates={availableTemplates}
            selectedSemester={selectedSemester}
            selectedCourseId={selectedCourseId}
            selectedTemplateId={selectedTemplateId}
            onSemesterChange={setSelectedSemester}
            onCourseChange={setSelectedCourseId}
            onTemplateChange={setSelectedTemplateId}
          />
          <Card
            title={
              <Space>
                <Text strong style={{ fontSize: 18 }}>Teacher Assignments</Text>
              </Space>
            }
          >
            <GradingGroupTable dataSource={flatGradingGroups} />
          </Card>
        </>
      )}
      <UploadGradeSheetModal
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setSelectedGradingGroupForUpload(null);
        }}
        onOk={handleUploadSubmit}
        gradingGroup={selectedGradingGroupForUpload}
        loading={uploadGradeSheetMutation.isPending}
      />
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