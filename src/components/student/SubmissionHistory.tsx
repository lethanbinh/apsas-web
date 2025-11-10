"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Table, Tag, Typography, Spin, Alert } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./SubmissionHistory.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useStudent } from "@/hooks/useStudent";
import { classService, ClassInfo, StudentInClass } from "@/services/classService";
import { submissionService, Submission } from "@/services/submissionService";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";

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

  // Data sources used to derive filters
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [allClasses, setAllClasses] = useState<Map<number, ClassInfo>>(new Map());
  const [allClassAssessments, setAllClassAssessments] = useState<Map<number, ClassAssessment>>(new Map());
  // Map submission id to classAssessment id
  const [submissionToClassAssessment, setSubmissionToClassAssessment] = useState<Map<number, number>>(new Map());

  // UI state
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load base data: student's submissions via classAssessments in their classes
  useEffect(() => {
    const loadBaseData = async () => {
      if (!studentId) {
        if (!isStudentLoading) setLoading(false);
        return;
      }
      
      // Get selected class ID from localStorage
      const selectedClassId = localStorage.getItem("selectedClassId");
      if (!selectedClassId) {
        setError("No class selected. Please select a class first.");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Use only the selected class ID
        const currentClassId = parseInt(selectedClassId, 10);
        
        // Fetch classes that student is enrolled in (for validation)
        const studentClasses = await classService.getClassesByStudentId(studentId);
        const classIds = studentClasses.map((sc) => sc.classId);
        
        // Verify that the selected class is one of the student's classes
        if (!classIds.includes(currentClassId)) {
          setError("You are not enrolled in the selected class.");
          setLoading(false);
          return;
        }
        
        // Store class info for reference
        const classInfoMap = new Map<number, ClassInfo>();
        for (const sc of studentClasses) {
          classInfoMap.set(sc.classId, {
            id: sc.classId,
            classCode: sc.classCode,
            totalStudent: "",
            description: sc.classDescription || "",
            lecturerId: "",
            semesterCourseId: "",
            createdAt: "",
            updatedAt: "",
            lecturerName: sc.lecturerName,
            lecturerCode: sc.lecturerCode,
            courseName: sc.courseName,
            courseCode: sc.courseCode,
            semesterName: sc.semesterName,
            studentCount: "",
          });
        }
        setAllClasses(classInfoMap);
        
        // Fetch class assessments only for the selected class
        const classAssessmentRes = await classAssessmentService.getClassAssessments({
          classId: currentClassId,
          pageNumber: 1,
          pageSize: 1000,
        }).catch(() => ({ items: [] }));
        
        // Filter to only include assessments from the selected class
        const uniqueClassAssessments = classAssessmentRes.items.filter(
          (ca) => ca.classId === currentClassId
        );
        
        setAllClassAssessments(new Map(uniqueClassAssessments.map((ca) => [ca.id, ca])));

        // Fetch submissions only for the selected class
        // This is necessary because API requires both studentId and classId
        const submissions = await submissionService.getSubmissionList({ 
          studentId: studentId,
          classId: currentClassId
        }).catch(() => []);
        
        // Create map from submission id to classAssessment id
        const submissionToClassAssessmentMap = new Map<number, number>();
        for (const sub of submissions) {
          // Map submission to classAssessment if it has one
          if (sub.classAssessmentId) {
            submissionToClassAssessmentMap.set(sub.id, sub.classAssessmentId);
          }
        }
        
        setSubmissionToClassAssessment(submissionToClassAssessmentMap);
        setSubmissions(submissions);
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

    // For lateness calculation we need classAssessment endAt (using Vietnam time)
    const mapped: SubmissionRow[] = submissions
      .sort((a, b) => toVietnamTime(b.submittedAt).valueOf() - toVietnamTime(a.submittedAt).valueOf())
      .map((sub, idx) => {
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

    setRows(mapped);
  }, [submissions, allClassAssessments, submissionToClassAssessment]);

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
