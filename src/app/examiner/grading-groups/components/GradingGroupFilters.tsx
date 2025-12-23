"use client";
import { Select, Space } from "antd";
interface GradingGroupFiltersProps {
  availableSemesters: string[];
  availableCourses: Array<{ id: number; name: string; code: string }>;
  availableTemplates: Array<{ id: number; name: string }>;
  availableLecturers: Array<{ id: number; name: string; code: string | null }>;
  selectedSemester: string | null;
  selectedCourseId: number | null;
  selectedTemplateId: number | null;
  selectedLecturerId: number | null;
  onSemesterChange: (value: string | null) => void;
  onCourseChange: (value: number | null) => void;
  onTemplateChange: (value: number | null) => void;
  onLecturerChange: (value: number | null) => void;
  filterTemplatesByCourse?: (templateId: number) => boolean;
}
export function GradingGroupFilters({
  availableSemesters,
  availableCourses,
  availableTemplates,
  availableLecturers,
  selectedSemester,
  selectedCourseId,
  selectedTemplateId,
  selectedLecturerId,
  onSemesterChange,
  onCourseChange,
  onTemplateChange,
  onLecturerChange,
  filterTemplatesByCourse,
}: GradingGroupFiltersProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <Space wrap>
        <Select
          style={{ width: 200 }}
          placeholder="Filter by Semester"
          value={selectedSemester}
          onChange={(value) => {
            onSemesterChange(value);
            onCourseChange(null);
            onTemplateChange(null);
            onLecturerChange(null);
          }}
          allowClear
          options={[
            { label: "All Semesters", value: "all" },
            ...availableSemesters.map(sem => ({ label: sem, value: sem }))
          ]}
        />
        <Select
          style={{ width: 200 }}
          placeholder="Filter by Course"
          allowClear
          value={selectedCourseId}
          onChange={(value) => {
            onCourseChange(value);
            onTemplateChange(null);
            onLecturerChange(null);
          }}
          disabled={selectedSemester === null || selectedSemester === "all"}
          options={availableCourses.map(course => ({
            label: `${course.code} - ${course.name}`,
            value: course.id,
          }))}
        />
        <Select
          style={{ width: 200 }}
          placeholder="Filter by Template"
          allowClear
          value={selectedTemplateId}
          onChange={(value) => {
            onTemplateChange(value);
            onLecturerChange(null);
          }}
          disabled={selectedCourseId === null}
          options={availableTemplates
            .filter(t => filterTemplatesByCourse ? filterTemplatesByCourse(t.id) : true)
            .map(t => ({
              label: t.name,
              value: t.id,
            }))}
        />
        <Select
          style={{ width: 200 }}
          placeholder="Filter by Lecturer"
          allowClear
          value={selectedLecturerId}
          onChange={onLecturerChange}
          disabled={selectedTemplateId === null}
          options={availableLecturers.map(lecturer => ({
            label: `${lecturer.code} - ${lecturer.name}`,
            value: lecturer.id,
          }))}
        />
      </Space>
    </div>
  );
}