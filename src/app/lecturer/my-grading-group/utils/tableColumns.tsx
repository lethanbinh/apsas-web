import { Submission } from "@/services/submissionService";
import { EnrichedSubmission } from "../page";
import { ColumnsType } from "antd/es/table";
import { FileTextOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/navigation";

dayjs.extend(utc);
dayjs.extend(timezone);

const toVietnamTime = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  try {
    return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
  } catch (error) {
    return null;
  }
};

const formatUtcDate = (dateString: string | null | undefined, formatStr: string) => {
  if (!dateString) return "N/A";
  const vietnamTime = toVietnamTime(dateString);
  if (!vietnamTime || !vietnamTime.isValid()) return "N/A";
  return vietnamTime.format(formatStr);
};

const getStatusTag = (status: number) => {
  switch (status) {
    case 0:
      return <Tag color="default">Not graded</Tag>;
    case 1:
      return <Tag color="processing">Grading</Tag>;
    case 2:
      return <Tag color="success">Graded</Tag>;
    default:
      return <Tag>Unknown</Tag>;
  }
};

export function getTableColumns(router: ReturnType<typeof useRouter>): ColumnsType<EnrichedSubmission> {
  return [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => a.id - b.id,
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Submission File",
      dataIndex: "submissionFile",
      key: "fileSubmit",
      render: (file: Submission["submissionFile"]) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          <span>{file?.name || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date: string | null | undefined) => formatUtcDate(date, "DD/MM/YYYY HH:mm:ss"),
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Course",
      dataIndex: "courseName",
      key: "courseName",
    },
    {
      title: "Semester",
      dataIndex: "semesterCode",
      key: "semesterCode",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => getStatusTag(status),
    },
    {
      title: "Total Score",
      dataIndex: "totalScore",
      key: "totalScore",
      render: (score: number | undefined) => {
        if (score === undefined || score === null) return "N/A";
        return score.toFixed(2);
      },
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => {
        const scoreA = a.totalScore ?? 0;
        const scoreB = b.totalScore ?? 0;
        return scoreA - scoreB;
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: EnrichedSubmission) => (
        <a
          onClick={() => {
            localStorage.setItem("selectedSubmissionId", record.id.toString());
            router.push("/lecturer/assignment-grading");
          }}
        >
          Grade
        </a>
      ),
    },
  ];
}

