"use client";

import {
  CreateSemesterPayload,
  semesterService,
  UpdateSemesterPayload,
} from "@/services/semesterService";
import { Semester } from "@/types";
import { Alert, App, DatePicker, Form, Input, Modal, Select } from "antd";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";

interface SemesterCrudModalProps {
  open: boolean;
  initialData: Semester | null;
  existingSemesters: Semester[];
  onCancel: () => void;
  onOk: () => void;
}

const getDatesForSeason = (
  season: string,
  year: number
): { start: moment.Moment; end: moment.Moment } => {
  if (season.toLowerCase() === "spring") {
    return {
      start: moment(new Date(year, 0, 1)),
      end: moment(new Date(year, 3, 30)),
    };
  }
  if (season.toLowerCase() === "summer") {
    return {
      start: moment(new Date(year, 4, 1)),
      end: moment(new Date(year, 7, 31)),
    };
  }
  return {
    start: moment(new Date(year, 8, 1)),
    end: moment(new Date(year, 11, 31)),
  };
};

const allSeasons = [
  { label: "Spring", value: "Spring" },
  { label: "Summer", value: "Summer" },
  { label: "Fall", value: "Fall" },
];

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear + 5; i >= currentYear - 5; i--) {
    years.push({ label: i.toString(), value: i });
  }
  return years;
};

const SemesterCrudModalContent: React.FC<SemesterCrudModalProps> = ({
  open,
  initialData,
  existingSemesters,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notification } = App.useApp();
  const isUpdatingRef = useRef(false);

  const isEditMode = !!initialData;
  const selectedYear = Form.useWatch("academicYear", form);

  const existingSemestersByYear = useMemo(() => {
    const map = new Map<number, string[]>();
    existingSemesters.forEach((s) => {
      if (!map.has(s.academicYear)) {
        map.set(s.academicYear, []);
      }
      map.get(s.academicYear)!.push(s.semesterCode.toLowerCase());
    });
    return map;
  }, [existingSemesters]);

  const yearOptions = useMemo(() => {
    return generateYearOptions().map((year) => ({
      ...year,
      disabled: (existingSemestersByYear.get(year.value) || []).length >= 3,
    }));
  }, [existingSemestersByYear]);

  const seasonOptions = useMemo(() => {
    if (!selectedYear) {
      return [];
    }
    const takenSeasons = (existingSemestersByYear.get(selectedYear) || []).map(
      (code) => code.replace(selectedYear.toString(), "")
    );
    return allSeasons.filter(
      (s) => !takenSeasons.includes(s.value.toLowerCase())
    );
  }, [selectedYear, existingSemestersByYear]);

  useEffect(() => {
    if (open) {
      if (isEditMode && initialData) {

        const season =
          initialData.semesterCode.replace(
            initialData.academicYear.toString(),
            ""
          ) || null;

        form.setFieldsValue({
          ...initialData,
          season: season,
          startDate: moment(
            initialData.startDate.endsWith("Z")
              ? initialData.startDate
              : initialData.startDate + "Z"
          ),
          endDate: moment(
            initialData.endDate.endsWith("Z")
              ? initialData.endDate
              : initialData.endDate + "Z"
          ),
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form, isEditMode]);

  const handleValuesChange = (
    changedValues: any,
    allValues: { academicYear: number; season: string }
  ) => {
    if (isEditMode) return;


    if (isUpdatingRef.current) {
      return;
    }

    if (changedValues.academicYear || changedValues.season) {
      const { academicYear, season } = allValues;


      if (changedValues.academicYear) {
        isUpdatingRef.current = true;
        setTimeout(() => {
          form.setFieldValue("season", null);
          isUpdatingRef.current = false;
        }, 0);
      }


      if (academicYear && season) {
        isUpdatingRef.current = true;
        setTimeout(() => {
          form.setFieldValue("semesterCode", `${season}${academicYear}`);
          const { start, end } = getDatesForSeason(season, academicYear);
          form.setFieldsValue({ startDate: start, endDate: end });
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  };

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: CreateSemesterPayload | UpdateSemesterPayload = {
        semesterCode: values.semesterCode,
        academicYear: values.academicYear,
        note: values.note,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      };

      if (isEditMode) {
        await semesterService.updateSemester(initialData!.id, payload);
        notification.success({
          message: "Semester Updated",
          description: "The semester has been successfully updated.",
        });
      } else {
        await semesterService.createSemester(payload as CreateSemesterPayload);
        notification.success({
          message: "Semester Created",
          description: "The new semester has been successfully created.",
        });
      }
      onOk();
    } catch (err: any) {
      console.error("CRUD Error:", err);
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={isEditMode ? "Edit Semester" : "Create New Semester"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={handleValuesChange}
      >
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form.Item
          name="academicYear"
          label="Academic Year"
          rules={[{ required: true, message: "Please select a year" }]}
        >
          <Select
            placeholder="Select year"
            options={yearOptions}
            disabled={isEditMode}
          />
        </Form.Item>
        <Form.Item
          name="season"
          label="Season"
          rules={[{ required: true, message: "Please select a season" }]}
        >
          <Select
            placeholder="Select season"
            options={isEditMode ? allSeasons : seasonOptions}
            disabled={isEditMode || !selectedYear}
          />
        </Form.Item>
        <Form.Item
          name="semesterCode"
          label="Semester Code"
          rules={[{ required: true, message: "Code is auto-generated" }]}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          name="startDate"
          label="Start Date"
          rules={[{ required: true, message: "Please select a start date" }]}
        >
          <DatePicker
            showTime
            style={{ width: "100%" }}
            disabled={!isEditMode}
          />
        </Form.Item>
        <Form.Item
          name="endDate"
          label="End Date"
          rules={[{ required: true, message: "Please select an end date" }]}
        >
          <DatePicker
            showTime
            style={{ width: "100%" }}
            disabled={!isEditMode}
          />
        </Form.Item>
        <Form.Item
          name="note"
          label="Note"
          rules={[{ required: true, message: "Please enter a note" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const SemesterCrudModal: React.FC<SemesterCrudModalProps> = (props) => (
  <App>
    <SemesterCrudModalContent {...props} />
  </App>
);