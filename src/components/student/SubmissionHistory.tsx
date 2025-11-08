"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Table, Tag, Typography, Spin, Alert } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./SubmissionHistory.module.css";
import dayjs from "dayjs";
import { useStudent } from "@/hooks/useStudent";
import { classService, ClassInfo } from "@/services/classService";
import { examSessionService, ExamSession } from "@/services/examSessionService";
import { submissionService, Submission } from "@/services/submissionService";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";

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
  const [allClassAssessments, setAllClassAssessments] = useState<Map<number, ClassAssessment>>(new Map());
  // Map submission id to classAssessment id
  const [submissionToClassAssessment, setSubmissionToClassAssessment] = useState<Map<number, number>>(new Map());

  // UI state
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load base data: student's submissions via classAssessments and examSessions
  useEffect(() => {
    const loadBaseData = async () => {
      if (!studentId) {
        if (!isStudentLoading) setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all classes first to get classIds
        const classRes = await classService.getClassList({ pageNumber: 1, pageSize: 1000 });
        setAllClasses(new Map(classRes.classes.map((c) => [c.id, c])));
        
        // Fetch class assessments for all classes that student might be in
        // We'll fetch by classId for each class, or try fetching by studentId
        const classIds = classRes.classes.map((c) => c.id);
        const classAssessmentPromises = classIds.map((classId) =>
          classAssessmentService.getClassAssessments({
            classId: classId,
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => ({ items: [] }))
        );
        
        // Also try fetching by studentId
        const studentClassAssessmentRes = await classAssessmentService.getClassAssessments({
          studentId: studentId,
          pageNumber: 1,
          pageSize: 1000,
        }).catch(() => ({ items: [] }));
        
        // Combine all class assessments
        const allClassAssessmentResults = await Promise.all(classAssessmentPromises);
        const allClassAssessmentsList = [
          ...studentClassAssessmentRes.items,
          ...allClassAssessmentResults.flatMap((r) => r.items),
        ];
        
        // Remove duplicates by id
        const uniqueClassAssessments = Array.from(
          new Map(allClassAssessmentsList.map((ca) => [ca.id, ca])).values()
        );
        
        setAllClassAssessments(new Map(uniqueClassAssessments.map((ca) => [ca.id, ca])));
        
        // Fetch exam sessions
        const sessionRes = await examSessionService.getExamSessions({ pageNumber: 1, pageSize: 1000 });
        setAllExamSessions(new Map(sessionRes.items.map((s) => [s.id, s])));

        // Fetch submissions via classAssessmentIds
        const classAssessmentIds = uniqueClassAssessments.map((ca) => ca.id);
        const submissionPromises = classAssessmentIds.map(async (id) => {
          const subs = await submissionService.getSubmissionList({ 
            studentId: studentId,
            classAssessmentId: id 
          }).catch(() => []);
          return { classAssessmentId: id, submissions: subs };
        });
        
        // Also fetch submissions via examSessionIds for exams
        const examSessionIds = sessionRes.items.map((s) => s.id);
        const examSubmissionPromises = examSessionIds.map((id) =>
          submissionService.getSubmissionList({ 
            studentId: studentId,
            examSessionId: id 
          }).catch(() => [])
        );
        
        const [classAssessmentResults, examSubmissions] = await Promise.all([
          Promise.all(submissionPromises),
          Promise.all(examSubmissionPromises),
        ]);
        
        // Create map from submission id to classAssessment id
        const submissionToClassAssessmentMap = new Map<number, number>();
        for (const result of classAssessmentResults) {
          for (const sub of result.submissions) {
            submissionToClassAssessmentMap.set(sub.id, result.classAssessmentId);
          }
        }
        setSubmissionToClassAssessment(submissionToClassAssessmentMap);
        
        // Combine all submissions and remove duplicates by id
        const classAssessmentSubmissions = classAssessmentResults.flatMap(r => r.submissions);
        const allSubmissions = [
          ...classAssessmentSubmissions,
          ...examSubmissions.flat(),
        ];
        const uniqueSubmissions = Array.from(
          new Map(allSubmissions.map((s) => [s.id, s])).values()
        );
        
        setSubmissions(uniqueSubmissions);
      } catch (err: any) {
        console.error("Failed to load base data:", err);
        setError(err.message || "Failed to load submissions data");
      } finally {
        setLoading(false);
      }
    };

    loadBaseData();
  }, [studentId, isStudentLoading]);

  // Build rows from all submissions
  useEffect(() => {
    if (!submissions) {
      setRows([]);
      return;
    }

    // For lateness calculation we need classAssessment endAt or session endAt
    const mapped: SubmissionRow[] = submissions
      .sort((a, b) => dayjs(b.submittedAt).valueOf() - dayjs(a.submittedAt).valueOf())
      .map((sub, idx) => {
        let endAt: dayjs.Dayjs | null = null;
        
        // Try to get endAt from classAssessment first
        const classAssessmentId = submissionToClassAssessment.get(sub.id);
        if (classAssessmentId) {
          const ca = allClassAssessments.get(classAssessmentId);
          if (ca?.endAt) {
            endAt = dayjs(ca.endAt);
          }
        }
        
        // Fallback to examSession endAt
        if (!endAt && sub.examSessionId) {
          const ses = allExamSessions.get(sub.examSessionId);
          if (ses?.endAt) {
            endAt = dayjs(ses.endAt);
          }
        }
        
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
  }, [submissions, allExamSessions, allClassAssessments, submissionToClassAssessment]);

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
