"use client";

import { Typography } from "antd";
import {
  ReadOutlined,
  CalendarOutlined,
  TeamOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { ClassInfo as ClassInfoType } from "@/services/classService";

const { Title } = Typography;

interface ClassInfoHeaderProps {
  classData: ClassInfoType;
  showTotalStudents?: boolean;
}

export const ClassInfoHeader = ({ classData, showTotalStudents = true }: ClassInfoHeaderProps) => {
  return (
    <>
      <Title
        level={2}
        style={{
          fontWeight: 700,
          color: "#2F327D",
          marginBottom: "20px",
          fontSize: "2.2rem",
        }}
      >
        {classData.courseName} ({classData.classCode})
      </Title>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <ReadOutlined style={{ fontSize: "16px", color: "#666" }} />
          <span style={{ fontWeight: 500, marginRight: "4px" }}>Course Code:</span>
          <span>{classData.courseCode}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <CalendarOutlined style={{ fontSize: "16px", color: "#666" }} />
          <span style={{ fontWeight: 500, marginRight: "4px" }}>Semester:</span>
          <span>{classData.semesterName}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
          }}
        >
          <InfoCircleOutlined style={{ fontSize: "16px", color: "#666" }} />
          <span style={{ fontWeight: 500, marginRight: "4px" }}>Class Code:</span>
          <span>{classData.classCode}</span>
        </div>
        {showTotalStudents && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px",
              backgroundColor: "#fafafa",
              borderRadius: "4px",
            }}
          >
            <TeamOutlined style={{ fontSize: "16px", color: "#666" }} />
            <span style={{ fontWeight: 500, marginRight: "4px" }}>Total Students:</span>
            <span>{classData.studentCount}</span>
          </div>
        )}
      </div>
    </>
  );
};

