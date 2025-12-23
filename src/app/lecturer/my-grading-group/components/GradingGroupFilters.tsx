"use client";
import { Semester } from "@/services/semesterService";
import { Card, Select, Space, Typography } from "antd";
const { Text } = Typography;
interface CourseOption {
  courseId: number;
  courseName: string;
}
interface TemplateOption {
  id: number;
  name: string;
  assessmentTemplateId: number | null;
}
interface GradingGroupFiltersProps {
  semesters: Semester[];
  availableCourses: CourseOption[];
  availableTemplates: TemplateOption[];
  selectedSemester?: number;
  selectedCourseId?: number;
  selectedTemplateId?: number;
  onSemesterChange: (value: number | undefined) => void;
  onCourseChange: (value: number | undefined) => void;
  onTemplateChange: (value: number | undefined) => void;
}
export function GradingGroupFilters({
  semesters,
  availableCourses,
  availableTemplates,
  selectedSemester,
  selectedCourseId,
  selectedTemplateId,
  onSemesterChange,
  onCourseChange,
  onTemplateChange,
}: GradingGroupFiltersProps) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Text strong style={{ fontSize: 16 }}>Filters</Text>
        <Space wrap>
          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Semester
            </Text>
            <Select
              style={{ width: 200 }}
              placeholder="Select semester"
              value={selectedSemester}
              onChange={(value) => {
                onSemesterChange(value);
                onCourseChange(undefined);
                onTemplateChange(undefined);
              }}
              allowClear
            >
              {semesters.map((sem) => (
                <Select.Option key={sem.id} value={Number(sem.id)}>
                  {sem.semesterCode}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Course
            </Text>
            <Select
              style={{ width: 200 }}
              placeholder="Select course"
              value={selectedCourseId}
              onChange={(value) => {
                onCourseChange(value);
                onTemplateChange(undefined);
              }}
              allowClear
              disabled={selectedSemester === undefined}
            >
              {availableCourses.map((course) => (
                <Select.Option key={course.courseId} value={course.courseId}>
                  {course.courseName}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Template
            </Text>
            <Select
              style={{ width: 200 }}
              placeholder="Select template"
              value={selectedTemplateId}
              onChange={onTemplateChange}
              allowClear
              disabled={selectedCourseId === undefined}
            >
              {availableTemplates.map((template) => (
                <Select.Option key={template.id} value={template.id}>
                  {template.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </Space>
      </Space>
    </Card>
  );
}