import { GradingGroup } from "@/services/gradingGroupService";
import { Semester } from "@/services/semesterService";
import { FlatGradingGroup } from "../components/GradingGroupTable";

interface GroupKey {
  courseId: number;
  templateId: number;
  semesterCode: string;
}

interface EnrichedSubmission {
  studentId?: number;
  gradingGroupId?: number;
  submittedAt?: string | null;
  id: number;
}

interface CourseInfo {
  courseId: number;
  courseName: string;
}

const keyToString = (key: GroupKey): string => {
  return `${key.courseId}|${key.templateId}|${key.semesterCode}`;
};

const isSemesterPassed = (endDate: string | null | undefined): boolean => {
  if (!endDate) return false;
  const now = new Date();
  const semesterEnd = new Date(endDate);
  return now > semesterEnd;
};

export function flattenGradingGroups(
  gradingGroups: GradingGroup[],
  gradingGroupToCourseMap: { [groupId: number]: CourseInfo },
  gradingGroupToSemesterMap: { [groupId: number]: string },
  enrichedSubmissions: EnrichedSubmission[],
  semesters: Semester[],
  selectedSemester?: number,
  selectedCourseId?: number,
  selectedTemplateId?: number
): FlatGradingGroup[] {
  const groupedMap = new Map<string, FlatGradingGroup>();


  const allKeys = new Map<string, GroupKey>();
  gradingGroups.forEach((gradingGroup) => {
    const courseInfo = gradingGroupToCourseMap[gradingGroup.id];
    const semesterCode = gradingGroupToSemesterMap[gradingGroup.id];
    const templateId = gradingGroup.assessmentTemplateId;

    if (courseInfo && semesterCode && templateId !== null && templateId !== undefined) {
      const key: GroupKey = {
        courseId: courseInfo.courseId,
        templateId: templateId,
        semesterCode: semesterCode,
      };
      const keyStr = keyToString(key);
      if (!allKeys.has(keyStr)) {
        allKeys.set(keyStr, key);
      }
    }
  });


  allKeys.forEach((key, keyStr) => {

    const matchingGroups = gradingGroups.filter(g => {
      const gCourseInfo = gradingGroupToCourseMap[g.id];
      const gSemesterCode = gradingGroupToSemesterMap[g.id];
      const gTemplateId = g.assessmentTemplateId;

      return gCourseInfo?.courseId === key.courseId &&
        String(gSemesterCode) === String(key.semesterCode) &&
        Number(gTemplateId) === Number(key.templateId);
    });

    if (matchingGroups.length === 0) return;


    const latestGroup = matchingGroups.reduce((latest, current) => {
      const latestDate = latest.createdAt ? new Date(latest.createdAt).getTime() : 0;
      const currentDate = current.createdAt ? new Date(current.createdAt).getTime() : 0;
      return currentDate > latestDate ? current : latest;
    });

    const courseInfo = gradingGroupToCourseMap[latestGroup.id];
    if (!courseInfo) return;


    const matchingGroupIds = matchingGroups.map(g => g.id);


    const studentSubmissions = new Map<number, EnrichedSubmission>();
    enrichedSubmissions.forEach((sub) => {
      if (matchingGroupIds.includes(sub.gradingGroupId || -1) && sub.studentId) {
        const existing = studentSubmissions.get(sub.studentId);
        if (!existing) {
          studentSubmissions.set(sub.studentId, sub);
        } else {
          const existingDate = ((existing as any).updatedAt || existing.submittedAt) ? new Date((existing as any).updatedAt || existing.submittedAt || 0).getTime() : 0;
          const currentDate = ((sub as any).updatedAt || sub.submittedAt) ? new Date((sub as any).updatedAt || sub.submittedAt || 0).getTime() : 0;
          if (currentDate > existingDate || (currentDate === existingDate && sub.id > existing.id)) {
            studentSubmissions.set(sub.studentId, sub);
          }
        }
      }
    });


    const semesterDetail = semesters.find((s) => s.semesterCode === key.semesterCode);
    const semesterEndDate = semesterDetail?.endDate;
    const semesterPassed = isSemesterPassed(semesterEndDate);

    groupedMap.set(keyStr, {
      key: keyStr,
      id: latestGroup.id,
      courseCode: courseInfo.courseName.split(' - ')[0] || courseInfo.courseName,
      courseName: courseInfo.courseName,
      templateName: latestGroup.assessmentTemplateName || `Template ${latestGroup.id}`,
      semesterCode: key.semesterCode,
      submissionCount: studentSubmissions.size,
      gradingGroupIds: matchingGroupIds,
      gradingGroup: latestGroup,
      isSemesterPassed: semesterPassed,
    });
  });


  let filtered = Array.from(groupedMap.values());


  if (selectedSemester !== undefined) {
    const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
    const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
    if (selectedSemesterCode) {
      filtered = filtered.filter(g => g.semesterCode === selectedSemesterCode);
    }
  }


  if (selectedCourseId !== undefined) {
    filtered = filtered.filter(g => {

      const group = gradingGroups.find(gg => g.gradingGroupIds.includes(gg.id));
      if (!group) return false;
      const courseInfo = gradingGroupToCourseMap[group.id];
      return courseInfo?.courseId === selectedCourseId;
    });
  }


  if (selectedTemplateId !== undefined) {
    filtered = filtered.filter(g => {

      const group = gradingGroups.find(gg => g.gradingGroupIds.includes(gg.id));
      return group?.assessmentTemplateId === selectedTemplateId;
    });
  }

  return filtered;
}

