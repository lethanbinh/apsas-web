import { App } from "antd";
import { FlatGradingGroup } from "../components/GradingGroupTable";
import { handleDownloadAll, GroupedCourse, GroupedTemplate, GroupedLecturer } from "./downloadAll";
export const handleDownloadSelected = async (
  selectedGroups: FlatGradingGroup[],
  allGroupedByCourse: GroupedCourse[],
  message: ReturnType<typeof App.useApp>['message']
) => {
  if (selectedGroups.length === 0) {
    message.warning("Please select at least one group to download");
    return;
  }
  const selectedGroupIds = new Set(selectedGroups.flatMap(g => g.groupIds));
  const filteredGroupedByCourse: GroupedCourse[] = allGroupedByCourse.map((course: GroupedCourse) => ({
    ...course,
    templates: course.templates.map((template: GroupedTemplate) => ({
      ...template,
      lecturers: template.lecturers.map((lecturer: GroupedLecturer) => ({
        ...lecturer,
        groups: lecturer.groups.filter(group => selectedGroupIds.has(group.id)),
      })).filter((lecturer: GroupedLecturer) => lecturer.groups.length > 0),
    })).filter((template: GroupedTemplate) => template.lecturers.length > 0),
  })).filter((course: GroupedCourse) => course.templates.length > 0);
  await handleDownloadAll(filteredGroupedByCourse, message);
};