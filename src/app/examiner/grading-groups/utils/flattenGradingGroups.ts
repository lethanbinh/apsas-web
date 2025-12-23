import { GradingGroup } from "@/services/gradingGroupService";
import { FlatGradingGroup } from "../components/GradingGroupTable";
export interface GroupedByCourse {
  courseId: number;
  courseName: string;
  courseCode: string;
  templates: {
    templateId: number;
    templateName: string;
    lecturers: {
      lecturerId: number;
      lecturerName: string;
      lecturerCode: string | null;
      groups: (GradingGroup & { subs: any[]; semesterCode?: string })[];
    }[];
  }[];
}
export function flattenGradingGroups(
  groupedByCourse: GroupedByCourse[]
): FlatGradingGroup[] {
  const groupedMap = new Map<string, FlatGradingGroup>();
  groupedByCourse.forEach((course) => {
    course.templates.forEach((template) => {
      template.lecturers.forEach((lecturer) => {
        lecturer.groups.forEach((group) => {
          const semesterCode = group.semesterCode;
          if (!semesterCode) return;
          const key = `${course.courseId}_${template.templateId}_${lecturer.lecturerId}`;
          const existing = groupedMap.get(key);
          if (!existing) {
            groupedMap.set(key, {
              id: group.id,
              courseCode: course.courseCode,
              courseName: course.courseName,
              templateName: template.templateName,
              lecturerNames: [lecturer.lecturerName],
              lecturerCodes: [lecturer.lecturerCode],
              semesterCode: semesterCode,
              submissionCount: group.subs.length,
              groupIds: [group.id],
              group: group,
            });
          } else {
            const existingDate = existing.group.createdAt ? new Date(existing.group.createdAt).getTime() : 0;
            const currentDate = group.createdAt ? new Date(group.createdAt).getTime() : 0;
            groupedMap.set(key, {
              ...existing,
              submissionCount: existing.submissionCount + group.subs.length,
              groupIds: [...existing.groupIds, group.id],
              group: currentDate > existingDate ? group : existing.group,
              id: currentDate > existingDate ? group.id : existing.id,
            });
          }
        });
      });
    });
  });
  return Array.from(groupedMap.values());
}