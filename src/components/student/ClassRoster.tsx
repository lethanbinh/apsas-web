"use client";

import React, { useState, useMemo } from "react";
import { Card, Input, Table, Tag, Typography, Spin } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import styles from "./ClassRoster.module.css";
import { classService } from "@/services/classService";
import { queryKeys } from "@/lib/react-query";

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
    title: "Class",
    dataIndex: "class",
    key: "class",
  },
];

export default function ClassRoster({ classId }: { classId: string | number }) {
  const [searchText, setSearchText] = useState("");

  // Fetch students in class
  const { data: studentGroup = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: queryKeys.studentsInClass.byClassId(classId),
    queryFn: () => classService.getStudentsInClass(classId),
    enabled: !!classId,
  });

  // Fetch student details for all students
  const { data: studentDetails = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ['studentDetails', 'byStudentIds', studentGroup.map(s => s.studentId)],
    queryFn: async () => {
      const detailPromises = studentGroup.map((s) =>
        classService.getStudentById(s.studentId)
      );
      return Promise.all(detailPromises);
    },
    enabled: studentGroup.length > 0,
  });

  const memberData: Member[] = useMemo(() => {
    return studentGroup.map((enrolledStudent, index) => {
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
    });
  }, [studentGroup, studentDetails]);

  const isLoading = (isLoadingStudents && studentGroup.length === 0) || (isLoadingDetails && studentDetails.length === 0);

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
