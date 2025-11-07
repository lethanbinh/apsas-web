"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Table, Tag, Typography, Select, Spin, Alert } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./SubmissionHistory.module.css";
import dayjs from "dayjs";
import { useStudent } from "@/hooks/useStudent";
import { classService, ClassInfo } from "@/services/classService";
import { examSessionService, ExamSession } from "@/services/examSessionService";
import { submissionService, Submission } from "@/services/submissionService";

const { Title, Text } = Typography;

interface SubmissionRow {
  key: string;
  no: number;
  fileSubmit: string;
  student: string;
  date: string;
  score: string;
  status: "On time" | "Late";
}

const columns: TableProps<SubmissionRow>["columns"] = [
  {
    title: "No",
    dataIndex: "no",
    key: "no",
    width: 60,
  },
  {
    title: "File submit",
    dataIndex: "fileSubmit",
    key: "fileSubmit",
    render: (text) => <Text strong>{text}</Text>,
  },
  {
    title: "Student",
    dataIndex: "student",
    key: "student",
    sorter: (a, b) => a.student.localeCompare(b.student),
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    sorter: (a, b) => a.date.localeCompare(b.date),
  },
  {
    title: "Score",
    dataIndex: "score",
    key: "score",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: SubmissionRow["status"]) => {
      const color = status === "On time" ? "success" : "error";
      return <Tag color={color}>{status}</Tag>;
    },
    filters: [
      { text: "On time", value: "On time" },
      { text: "Late", value: "Late" },
    ],
    onFilter: (value, record) => record.status === value,
  },
  {
    title: "Action",
    key: "action",
    align: "center",
    render: () => (
      <Button
        variant="ghost"
        size="small"
        icon={<DownloadOutlined />}
        style={{ border: "none" }}
      >
        {""}
      </Button>
    ),
  },
];

export default function SubmissionHistory() {
  const { studentId, isLoading: isStudentLoading } = useStudent();
  const [searchText, setSearchText] = useState("");

  // Data sources used to derive filters
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [allExamSessions, setAllExamSessions] = useState<Map<number, ExamSession>>(new Map());
  const [allClasses, setAllClasses] = useState<Map<number, ClassInfo>>(new Map());

  // Filters and options
  const [semesterOptions, setSemesterOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [classOptions, setClassOptions] = useState<{ label: string; value: number }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);

  // UI state
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load base data: student's submissions, exam sessions, and classes
  useEffect(() => {
    const loadBaseData = async () => {
      if (!studentId) {
        if (!isStudentLoading) setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [submissionList, sessionRes, classRes] = await Promise.all([
          submissionService.getSubmissionList({ studentId }),
          examSessionService.getExamSessions({ pageNumber: 1, pageSize: 1000 }),
          classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        ]);

        setSubmissions(submissionList);
        setAllExamSessions(new Map(sessionRes.items.map((s) => [s.id, s])));
        setAllClasses(new Map(classRes.classes.map((c) => [c.id, c])));

        // Derive semesters from student's submissions via sessions -> classes
        const semesters = new Set<string>();
        for (const sub of submissionList) {
          const ses = sessionRes.items.find((s) => s.id === sub.examSessionId);
          if (!ses) continue;
          const cls = classRes.classes.find((c) => c.id === ses.classId);
          if (cls && cls.semesterName) semesters.add(cls.semesterName);
        }
        setSemesterOptions(Array.from(semesters).map((s) => ({ label: s, value: s })));
      } catch (err: any) {
        console.error("Failed to load base data:", err);
        setError(err.message || "Failed to load submissions data");
      } finally {
        setLoading(false);
      }
    };

    loadBaseData();
  }, [studentId, isStudentLoading]);

  // Update class options based on selected semester and student's submissions
  useEffect(() => {
    if (!selectedSemester || !submissions) {
      setClassOptions([]);
      setSelectedClassId(undefined);
      return;
    }

    const optionsSet = new Map<number, string>();
    for (const sub of submissions) {
      const ses = allExamSessions.get(sub.examSessionId);
      if (!ses) continue;
      const cls = allClasses.get(ses.classId);
      if (cls && cls.semesterName === selectedSemester) {
        const label = `${cls.courseName} (${cls.classCode})`;
        optionsSet.set(cls.id, label);
      }
    }
    const opts = Array.from(optionsSet.entries()).map(([id, label]) => ({ label, value: id }));
    setClassOptions(opts);
    setSelectedClassId(undefined);
  }, [selectedSemester, submissions, allExamSessions, allClasses]);

  // Build rows based on selected class
  useEffect(() => {
    if (!submissions || !selectedClassId) {
      setRows([]);
      return;
    }

    const filteredSubs = submissions.filter((sub) => {
      const ses = allExamSessions.get(sub.examSessionId);
      return ses?.classId === selectedClassId;
    });

    // For lateness calculation we need session end time
    const mapped: SubmissionRow[] = filteredSubs
      .sort((a, b) => dayjs(a.submittedAt).valueOf() - dayjs(b.submittedAt).valueOf())
      .map((sub, idx) => {
        const ses = allExamSessions.get(sub.examSessionId);
        const endAt = ses ? dayjs(ses.endAt) : null;
        const submittedAt = dayjs(sub.submittedAt);
        const onTime = endAt ? submittedAt.isBefore(endAt) || submittedAt.isSame(endAt) : true;

        return {
          key: String(sub.id),
          no: idx + 1,
          fileSubmit: sub.submissionFile?.name || `Submission_${sub.id}`,
          student: sub.studentName || "",
          date: submittedAt.format("YYYY-MM-DD HH:mm"),
          score: typeof sub.lastGrade === "number" ? `${sub.lastGrade}` : "N/A",
          status: onTime ? "On time" : "Late",
        };
      });

    setRows(mapped);
  }, [submissions, selectedClassId, allExamSessions]);

  const filteredRows = useMemo(() => {
    const q = searchText.toLowerCase();
    return rows.filter(
      (r) => r.fileSubmit.toLowerCase().includes(q) || r.student.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D",
            margin: 0,
          }}
        >
          Submission History
        </Title>
        <Input
          placeholder="Search..."
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchBar}
          prefix={<SearchOutlined />}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Select
          placeholder="Select semester"
          options={semesterOptions}
          value={selectedSemester}
          onChange={setSelectedSemester}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="Select class"
          options={classOptions}
          value={selectedClassId}
          onChange={setSelectedClassId}
          style={{ width: 320 }}
          disabled={!selectedSemester}
          allowClear
        />
      </div>

      <Card className={styles.historyCard}>
        {loading || isStudentLoading ? (
          <Spin size="large" style={{ display: "block", textAlign: "center", padding: 50 }} />
        ) : error ? (
          <Alert type="error" message="Error" description={error} showIcon />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredRows}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            className={styles.historyTable}
          />
        )}
      </Card>
    </div>
  );
}
