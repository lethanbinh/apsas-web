"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Table,
  Spin,
  App,
  Space,
  Typography,
  Input,
  Tag,
  Button,
  Alert,
  Select,
} from "antd";
import type { TableProps } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { format } from "date-fns";
import styles from "./MySubmissions.module.css";
import { submissionService, Submission } from "@/services/submissionService";
import { lecturerService, Lecturer } from "@/services/lecturerService";
import { ExamSession, examSessionService } from "@/services/examSessionService";
import {
  Semester,
  semesterService,
  SemesterPlanDetail,
  SemesterCourse,
} from "@/services/semesterService";
import { classService, ClassInfo } from "@/services/classService";
import { useAuth } from "@/hooks/useAuth";
import { Role, ROLES } from "@/lib/constants";
import { useRouter } from "next/navigation";

const { Title } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

const getStatusTag = (status: number) => {
  if (status === 0) {
    return <Tag color="green">On time</Tag>;
  }
  return <Tag color="red">Late</Tag>;
};

interface EnrichedSubmission extends Submission {
  courseName?: string;
  semesterName?: string;
}

const MySubmissionsPageContent = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  const { user, isLoading: authLoading } = useAuth();
  const [currentLecturerId, setCurrentLecturerId] = useState<number | null>(
    null
  );

  const [semesters, setSemesters] = useState<SemesterPlanDetail[]>([]);
  const [examSessions, setExamSessions] = useState<Map<number, ExamSession>>(
    new Map()
  );
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(
    undefined
  );
  const [selectedCourse, setSelectedCourse] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== ROLES.LECTURER) {
      setError("Bạn không có quyền truy cập trang này.");
      setLoading(false);
      return;
    }

    const fetchLecturerId = async () => {
      try {
        const lecturerList = await lecturerService.getLecturerList();
        const currentLecturer = lecturerList.find(
          (l) => l.accountId === user.id.toString()
        );
        if (currentLecturer) {
          setCurrentLecturerId(Number(currentLecturer.lecturerId));
        } else {
          setError("Không tìm thấy thông tin giảng viên cho tài khoản này.");
        }
      } catch (err: any) {
        setError(err.message || "Lỗi khi tải dữ liệu giảng viên.");
      }
    };

    fetchLecturerId();
  }, [user, authLoading]);

  const classIdToSemesterNameMap = useMemo(() => {
    return new Map(
      classes.map((cls) => [cls.id.toString(), cls.semesterName.split(" - ")[0]])
    );
  }, [classes]);

  useEffect(() => {
    if (!currentLecturerId) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [
          submissionResponse,
          sessionResponse,
          semesterList,
          classResponse,
        ] = await Promise.all([
          submissionService.getSubmissionList({
            gradingGroupId: currentLecturerId,
          }),
          examSessionService.getExamSessions({
            pageNumber: 1,
            pageSize: 1000,
          }),
          semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
          classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        ]);

        setSubmissions(submissionResponse);
        setClasses(classResponse.classes);

        const sessionMap = new Map(sessionResponse.items.map((s) => [s.id, s]));
        setExamSessions(sessionMap);

        const semesterDetails = await Promise.all(
          semesterList.map((sem) =>
            semesterService.getSemesterPlanDetail(sem.semesterCode)
          )
        );
        setSemesters(semesterDetails);
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [currentLecturerId]);

  const enrichedSubmissions: EnrichedSubmission[] = useMemo(() => {
    return submissions.map((sub) => {
      const session = sub.examSessionId ? examSessions.get(sub.examSessionId) : undefined;
      const semesterName = session
        ? classIdToSemesterNameMap.get(session.classId.toString())
        : "N/A";
      console.log(semesterName);

      return {
        ...sub,
        courseName: session?.courseName || "N/A",
        semesterName: semesterName || "N/A",
      };
    });
  }, [submissions, examSessions, classIdToSemesterNameMap]);

  const filteredData = useMemo(() => {
    return enrichedSubmissions.filter((sub) => {
      const semester = semesters.find((s) => s.id === selectedSemester);

      const semesterMatch =
        !selectedSemester || sub.semesterName === semester?.semesterCode;
      const courseMatch =
        !selectedCourse ||
        sub.courseName ===
          semester?.semesterCourses.find((sc) => sc.id === selectedCourse)
            ?.course.name;

      const searchMatch =
        sub.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.studentCode.toLowerCase().includes(searchText.toLowerCase()) ||
        (sub.submissionFile?.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());
      console.log(sub, semester);

      return semesterMatch && courseMatch && searchMatch;
    });
  }, [
    enrichedSubmissions,
    searchText,
    selectedSemester,
    selectedCourse,
    semesters,
  ]);
  console.log(filteredData);

  const courseOptions = useMemo(() => {
    if (!selectedSemester) return [];
    const semester = semesters.find((s) => s.id === selectedSemester);
    return (
      semester?.semesterCourses.map((sc) => ({
        label: `${sc.course.name} (${sc.course.code})`,
        value: sc.id,
      })) || []
    );
  }, [selectedSemester, semesters]);

  const columns: TableProps<EnrichedSubmission>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "File Submit",
      dataIndex: "submissionFile",
      key: "fileSubmit",
      render: (file: Submission["submissionFile"]) => file?.name || "N/A",
    },
    {
      title: "Student",
      dataIndex: "studentName",
      key: "student",
      render: (name, record) => (
        <span>
          {name} ({record.studentCode})
        </span>
      ),
    },
    {
      title: "Course",
      dataIndex: "courseName",
      key: "courseName",
    },
    {
      title: "Semester",
      dataIndex: "semesterName",
      key: "semesterName",
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
      sorter: (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    },
    {
      title: "Score",
      dataIndex: "lastGrade",
      key: "lastGrade",
      render: (score) => `${score}/100`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="text"
          icon={<DownloadOutlined />}
          disabled={!record.submissionFile}
          href={record.submissionFile?.submissionUrl}
          target="_blank"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{ margin: 0, fontWeight: 700, color: "rgb(47, 50, 125)" }}
        >
          Grading History
        </Title>
        <Space>
          <Select
            allowClear
            value={selectedSemester}
            onChange={(value) => {
              setSelectedSemester(value);
              setSelectedCourse(undefined);
            }}
            style={{ width: 200 }}
            placeholder="Filter by Semester"
            options={semesters.map((s) => ({
              label: s.semesterCode,
              value: s.id,
            }))}
          />
          <Select
            allowClear
            value={selectedCourse}
            onChange={setSelectedCourse}
            style={{ width: 240 }}
            placeholder="Filter by Course"
            disabled={!selectedSemester}
            options={courseOptions}
          />
          <Input
            placeholder="Search student or file..."
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Space>
      </div>

      {loading ? (
        <div className={styles.spinner}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className={styles.table}
          onRow={(record) => {
            return {
              onClick: () => {
                router.push(`/lecturer/assignment-grading`);
              },
              className: styles.clickableRow,
            };
          }}
        />
      )}
    </div>
  );
};

export default function MySubmissionsPage() {
  return (
    <App>
      <MySubmissionsPageContent />
    </App>
  );
}
