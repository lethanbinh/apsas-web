"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Table, Tag, Typography, Spin, Alert } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../ui/Button";
import styles from "./SubmissionHistory.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useStudent } from "@/hooks/useStudent";
import { classService, ClassInfo, StudentInClass } from "@/services/classService";
import { submissionService, Submission } from "@/services/submissionService";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";
import { queryKeys } from "@/lib/react-query";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

const { Title, Text } = Typography;

interface SubmissionRow {
  key: string;
  no: number;
  fileSubmit: string;
  student: string;
  date: string;
  score: string;
  status: "On time" | "Late";
  submissionUrl?: string;
  fileName?: string;
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
    render: (_, record: SubmissionRow) => {
      const handleDownload = () => {
        if (record.submissionUrl) {
          // Create a temporary anchor element to trigger download
          const link = document.createElement("a");
          link.href = record.submissionUrl;
          link.download = record.fileName || "submission.zip";
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };

      return (
        <Button
          variant="ghost"
          size="small"
          icon={<DownloadOutlined />}
          style={{ border: "none" }}
          onClick={handleDownload}
          disabled={!record.submissionUrl}
        >
          {""}
        </Button>
      );
    },
  },
];

export default function SubmissionHistory() {
  const { studentId, isLoading: isStudentLoading } = useStudent();
  const [searchText, setSearchText] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    const classId = localStorage.getItem("selectedClassId");
    setSelectedClassId(classId);
  }, []);

  // Fetch student classes for validation
  const { data: studentClasses = [] } = useQuery({
    queryKey: queryKeys.studentClasses.byStudentId(studentId!),
    queryFn: () => classService.getClassesByStudentId(studentId!),
    enabled: !!studentId,
  });

  // Fetch class assessments
  const currentClassId = selectedClassId ? parseInt(selectedClassId, 10) : null;
  const { data: classAssessmentRes } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(selectedClassId!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: currentClassId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!selectedClassId && !!currentClassId,
  });

  // Fetch submissions
  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['submissions', 'byStudentAndClass', studentId, currentClassId],
    queryFn: () => submissionService.getSubmissionList({ 
      studentId: studentId!,
      classId: currentClassId!
    }),
    enabled: !!studentId && !!currentClassId,
  });

  // Process data
  const { allClassAssessments, submissionToClassAssessment, error } = useMemo(() => {
    if (!selectedClassId) {
      return { 
        allClassAssessments: new Map(), 
        submissionToClassAssessment: new Map(), 
        error: "No class selected. Please select a class first." 
      };
    }

    const classIds = studentClasses.map((sc) => sc.classId);
    if (!classIds.includes(currentClassId!)) {
      return { 
        allClassAssessments: new Map(), 
        submissionToClassAssessment: new Map(), 
        error: "You are not enrolled in the selected class." 
      };
    }

    const uniqueClassAssessments = (classAssessmentRes?.items || []).filter(
      (ca) => ca.classId === currentClassId
    );
    
    const allClassAssessments = new Map(uniqueClassAssessments.map((ca) => [ca.id, ca]));
    
    const submissionToClassAssessmentMap = new Map<number, number>();
    for (const sub of submissions) {
      if (sub.classAssessmentId) {
        submissionToClassAssessmentMap.set(sub.id, sub.classAssessmentId);
      }
    }

    return { allClassAssessments, submissionToClassAssessment: submissionToClassAssessmentMap, error: null };
  }, [selectedClassId, studentClasses, currentClassId, classAssessmentRes, submissions]);

  // Build rows from all submissions
  const rows = useMemo((): SubmissionRow[] => {
    if (!submissions || submissions.length === 0) {
      return [];
    }

    // For lateness calculation we need classAssessment endAt (using Vietnam time)
    return submissions
      .sort((a, b) => toVietnamTime(b.submittedAt).valueOf() - toVietnamTime(a.submittedAt).valueOf())
      .map((sub, idx): SubmissionRow => {
        let endAt: dayjs.Dayjs | null = null;
        
        // Get endAt from classAssessment and convert to Vietnam time
        const classAssessmentId = submissionToClassAssessment.get(sub.id) || sub.classAssessmentId;
        if (classAssessmentId) {
          const ca = allClassAssessments.get(classAssessmentId);
          if (ca?.endAt) {
            endAt = toVietnamTime(ca.endAt);
          }
        }
        
        const submittedAt = toVietnamTime(sub.submittedAt);
        const onTime = endAt ? submittedAt.isBefore(endAt) || submittedAt.isSame(endAt) : true;

        return {
          key: String(sub.id),
          no: idx + 1,
          fileSubmit: sub.submissionFile?.name || `Submission_${sub.id}`,
          student: sub.studentName || "",
          date: submittedAt.format("YYYY-MM-DD HH:mm"),
          score: typeof sub.lastGrade === "number" ? `${sub.lastGrade}` : "N/A",
          status: onTime ? "On time" : "Late",
          submissionUrl: sub.submissionFile?.submissionUrl,
          fileName: sub.submissionFile?.name,
        };
      });
  }, [submissions, allClassAssessments, submissionToClassAssessment]);

  const loading = (isLoadingSubmissions && submissions.length === 0) || (isStudentLoading && !studentId);

  const filteredRows = useMemo((): SubmissionRow[] => {
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
        {loading ? (
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
