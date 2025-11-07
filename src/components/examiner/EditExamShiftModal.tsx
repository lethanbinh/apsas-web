"use client";

import { Alert, App, DatePicker, Form, Input, Modal, Select, Spin } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import { classService } from "@/services/classService";
import {
  ExamSession,
  examSessionService,
  ExamSessionStudent,
  UpdateExamSessionPayload,
} from "@/services/examSessionService";
import {
  SemesterCourse,
  semesterService
} from "@/services/semesterService";
import { Dayjs } from "dayjs";

interface EditExamShiftModalProps {
  open: boolean;
  initialData: ExamSession;
  onCancel: () => void;
  onOk: () => void;
}

const parseUtcDate = (dateString?: string) => {
  if (!dateString) return null;
  return dayjs(dateString.endsWith("Z") ? dateString : dateString + "Z");
};

export const EditExamShiftModal: React.FC<EditExamShiftModalProps> = ({
  open,
  initialData,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [semesterCourses, setSemesterCourses] = useState<SemesterCourse[]>([]);
  const [currentSemesterCourseId, setCurrentSemesterCourseId] = useState<
    number | null
  >(null);
  const [currentExamSessionStudents, setCurrentExamSessionStudents] = useState<
    ExamSessionStudent[]
  >([]);

  const { notification } = App.useApp();

  useEffect(() => {
    if (!open) return;

    const fetchDependencies = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const [templateData, examSessionStudentsData, classData] =
          await Promise.all([
            assessmentTemplateService.getAssessmentTemplates({
              pageNumber: 1,
              pageSize: 1000,
            }),
            examSessionService.getExamSessionStudents(initialData.id),
            classService.getClassById(initialData.classId),
          ]);

        setTemplates(templateData.items);
        setCurrentExamSessionStudents(examSessionStudentsData.students);

        const semesterCode = classData.semesterName.split(" - ")[0];
        const semesterDetail = await semesterService.getSemesterPlanDetail(
          semesterCode
        );

        const matchingCourse = semesterDetail.semesterCourses.find((sc) =>
          sc.classes.some((c) => c.id === initialData.classId)
        );

        if (matchingCourse) {
          setCurrentSemesterCourseId(matchingCourse.id);
          setSemesterCourses(semesterDetail.semesterCourses);
        }

        const currentStudentIds = examSessionStudentsData.students.map(
          (s) => s.studentId
        );

        form.setFieldsValue({
          ...initialData,
          courseInfo: `${initialData.courseName} (${initialData.classCode}) / ${classData.semesterName}`,
          semesterCourseId: matchingCourse?.id,
          assessmentTemplateId: initialData.assessmentTemplateId,
          startAt: parseUtcDate(initialData.startAt),
          endAt: parseUtcDate(initialData.endAt),
          studentIds: currentStudentIds,
        });
      } catch (err) {
        console.error("Failed to load modal data:", err);
        setError("Failed to load required data.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchDependencies();
  }, [open, initialData, form]);

  const studentOptions = useMemo(() => {
    const studentMap = new Map<
      number,
      { id: number; name: string; code: string }
    >();

    // First, add current exam session students to ensure they're always available
    currentExamSessionStudents.forEach((student) => {
      studentMap.set(student.studentId, {
        id: student.studentId,
        name: student.studentName,
        code: student.studentCode,
      });
    });

    // Then, add students from the selected semester course (if any)
    if (currentSemesterCourseId) {
      const semesterCourse = semesterCourses.find(
        (sc) => sc.id === currentSemesterCourseId
      );
      if (semesterCourse) {
        semesterCourse.classes.forEach((cls) => {
          cls.students.forEach((student) => {
            if (!studentMap.has(student.id)) {
              studentMap.set(student.id, {
                id: student.id,
                name: student.account.fullName,
                code: student.account.accountCode,
              });
            }
          });
        });
      }
    }

    return Array.from(studentMap.values()).map((s) => ({
      label: `${s.name} (${s.code})`,
      value: s.id,
    }));
  }, [currentSemesterCourseId, semesterCourses, currentExamSessionStudents]);

  const handleCourseChange = (value: number) => {
    setCurrentSemesterCourseId(value);
    form.setFieldsValue({ studentIds: [] });
  };

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: UpdateExamSessionPayload = {
        assessmentTemplateId: values.assessmentTemplateId,
        startAt: values.startAt.toISOString(),
        endAt: values.endAt.toISOString(),
      };
      await examSessionService.updateExamSession(initialData.id, payload);

      const oldStudentIds = new Set(
        currentExamSessionStudents.map((s) => s.studentId)
      );
      const newStudentIdsArray = (values.studentIds || []) as number[];
      const newStudentIds = new Set(newStudentIdsArray);

      const studentsToAdd = Array.from(newStudentIds).filter(
        (id) => !oldStudentIds.has(id)
      ) as number[];

      const studentsToRemove = Array.from(oldStudentIds).filter(
        (id) => !newStudentIds.has(id)
      ) as number[];

      if (studentsToAdd.length > 0) {
        await examSessionService.addStudentsToExamSession(initialData.id, {
          studentIds: studentsToAdd,
        });
      }

      if (studentsToRemove.length > 0) {
        await examSessionService.removeStudentsFromExamSession(
          initialData.id,
          {
            studentIds: studentsToRemove,
          }
        );
      }

      notification.success({ message: "Exam shift updated successfully!" });
      onOk();
    } catch (err: any) {
      console.error("Failed to save shift:", err);
      setError(err.message || "Failed to save exam shift.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Exam Shift"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      destroyOnHidden
    >
      {isFetching ? (
        <div style={{ textAlign: "center", padding: "30px" }}>
          <Spin />
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item name="courseInfo" label="Course / Class / Semester">
            <Input disabled={true} />
          </Form.Item>

          <Form.Item
            name="semesterCourseId"
            label="Change Course (from same semester)"
            rules={[{ required: true, message: "Please select a course" }]}
          >
            <Select
              placeholder="Select a new course if needed"
              options={semesterCourses.map((sc) => ({
                label: `${sc.course.name} (${sc.course.code})`,
                value: sc.id,
              }))}
              onChange={handleCourseChange}
            />
          </Form.Item>

          <Form.Item
            name="assessmentTemplateId"
            label="Paper / Assessment"
            rules={[{ required: true, message: "Please select a paper" }]}
          >
            <Select
              placeholder="Select paper"
              options={templates.map((t) => ({
                label: t.name,
                value: t.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="studentIds"
            label="Students"
            rules={[{ required: true, message: "Please select students" }]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Select students for this course"
              options={studentOptions}
            />
          </Form.Item>

          <Form.Item
            name="startAt"
            label="Start Date & Time"
            rules={[{ required: true, message: "Please select a start date" }]}
          >
            <DatePicker
              showTime
              style={{ width: "100%" }}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>

          <Form.Item
            name="endAt"
            label="End Date & Time"
            dependencies={["startAt"]}
            rules={[
              { required: true, message: "Please select an end date" },
              ({ getFieldValue }) => ({
                validator(_, value: Dayjs) {
                  const startAt = getFieldValue("startAt");
                  if (!value || !startAt) {
                    return Promise.resolve();
                  }
                  if (value.isBefore(startAt)) {
                    return Promise.reject(
                      new Error("End date must be after start date!")
                    );
                  }
                  const fourHoursInMs = 4 * 60 * 60 * 1000;
                  if (value.diff(startAt) > fourHoursInMs) {
                    return Promise.reject(
                      new Error("Duration cannot exceed 4 hours!")
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker
              showTime
              style={{ width: "100%" }}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
