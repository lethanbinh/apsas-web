"use client";

import React, { useState, useEffect } from "react";
import { Card, Input, Table, Tag, Typography, Spin } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "./ClassRoster.module.css";
import { classService } from "@/services/classService";

const { Title } = Typography;

interface Member {
  key: string;
  no: number;
  email: string;
  fullName: string;
  date: string;
  role: "Student";
  class: string;
}

const columns: TableProps<Member>["columns"] = [
  {
    title: "No",
    dataIndex: "no",
    key: "no",
    width: 60,
  },
  {
    title: "Email",
    dataIndex: "email",
    key: "email",
  },
  {
    title: "Full name",
    dataIndex: "fullName",
    key: "fullName",
    sorter: (a, b) => a.fullName.localeCompare(b.fullName),
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  },
  {
    title: "Role",
    dataIndex: "role",
    key: "role",
    render: (role: Member["role"]) => {
      const color = "blue";
      return <Tag color={color}>{role.toUpperCase()}</Tag>;
    },
    filters: [{ text: "Student", value: "Student" }],
    onFilter: (value, record) => record.role === value,
  },
  {
    title: "Class",
    dataIndex: "class",
    key: "class",
  },
];

export default function ClassRoster({ classId }: { classId: string | number }) {
  const [searchText, setSearchText] = useState("");
  const [memberData, setMemberData] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!classId) return;

      try {
        setIsLoading(true);
        const studentGroup = await classService.getStudentsInClass(classId);

        const detailPromises = studentGroup.map((s) =>
          classService.getStudentById(s.studentId)
        );
        const studentDetails = await Promise.all(detailPromises);

        const combinedData: Member[] = studentGroup.map(
          (enrolledStudent, index) => {
            const detail = studentDetails.find(
              (d) => d.studentId === enrolledStudent.studentId.toString()
            );

            return {
              key: enrolledStudent.id.toString(),
              no: index + 1,
              email: detail ? detail.email : "N/A",
              fullName: detail ? detail.fullName : enrolledStudent.studentName,
              date: enrolledStudent.enrollmentDate.split(" ")[0],
              role: "Student",
              class: enrolledStudent.classCode,
            };
          }
        );

        setMemberData(combinedData);
      } catch (error) {
        console.error("Failed to fetch class members:", error);
        setMemberData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [classId]);

  const filteredData = memberData.filter((member) =>
    member.fullName.toLowerCase().includes(searchText.toLowerCase())
  );

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
          Class Members
        </Title>
        <Input
          placeholder="Search members..."
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchBar}
          prefix={<SearchOutlined />}
        />
      </div>

      <Card className={styles.rosterCard}>
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            className={styles.memberTable}
            rowClassName={styles.tableRow}
          />
        </Spin>
      </Card>
    </div>
  );
}
