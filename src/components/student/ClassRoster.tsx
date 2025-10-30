// Tên file: components/ClassRoster/index.tsx
"use client";

import React, { useState } from "react";
import { Card, Input, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "./ClassRoster.module.css";

const { Title } = Typography;

// Định nghĩa kiểu dữ liệu cho thành viên
interface Member {
  key: string;
  no: number;
  email: string;
  fullName: string;
  date: string;
  role: "Teacher" | "Student";
  class: string;
}

// Dữ liệu mẫu
const memberData: Member[] = [
  { key: "1", no: 1, email: "NguyenNT@fpt.edu.vn", fullName: "Tran Thanh Nguyen", date: "13/05/2022", role: "Teacher", class: "SE1720" },
  { key: "2", no: 2, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "22/05/2022", role: "Student", class: "SE1720" },
  { key: "3", no: 3, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "15/06/2022", role: "Student", class: "SE1720" },
  { key: "4", no: 4, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "06/09/2022", role: "Student", class: "SE1720" },
  { key: "5", no: 5, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "25/09/2022", role: "Student", class: "SE1720" },
  { key: "6", no: 6, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "04/10/2022", role: "Student", class: "SE1720" },
  { key: "7", no: 7, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "17/10/2022", role: "Student", class: "SE1720" },
  { key: "8", no: 8, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "24/10/2022", role: "Student", class: "SE1720" },
  { key: "9", no: 9, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "01/11/2022", role: "Student", class: "SE1720" },
  { key: "10", no: 10, email: "anltse172257@fpt.edu.vn", fullName: "Le Thu An", date: "22/11/2022", role: "Student", class: "SE1720" },
];

// Định nghĩa các cột
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
    sorter: (a, b) => a.date.localeCompare(b.date),
  },
  {
    title: "Role",
    dataIndex: "role",
    key: "role",
    render: (role: Member["role"]) => {
      const color = role === "Teacher" ? "cyan" : "blue";
      return <Tag color={color}>{role.toUpperCase()}</Tag>;
    },
    filters: [
      { text: "Teacher", value: "Teacher" },
      { text: "Student", value: "Student" },
    ],
    onFilter: (value, record) => record.role === value,
  },
  {
    title: "Class",
    dataIndex: "class",
    key: "class",
  },
];

export default function ClassRoster() {
  const [searchText, setSearchText] = useState("");

  // Logic filter
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
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          className={styles.memberTable}
          rowClassName={styles.tableRow}
        />
      </Card>
    </div>
  );
}