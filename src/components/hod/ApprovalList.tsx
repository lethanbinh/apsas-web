"use client";

import React, { useState } from "react";
import { Card, Input, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "./ApprovalList.module.css";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography; // Added Text import

interface ApprovalItem {
  key: string;
  no: number;
  name: string;
  teacher: string;
  date: string;
  semester: string;
  status: "Approved" | "Rejected" | "Pending";
}

const approvalData: ApprovalItem[] = [
  { key: "1", no: 1, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "13/05/2022", semester: "Fall2025", status: "Approved" },
  { key: "2", no: 2, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "22/05/2022", semester: "Fall2025", status: "Rejected" },
  { key: "3", no: 3, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "15/06/2022", semester: "Fall2025", status: "Pending" },
  { key: "4", no: 4, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "06/09/2022", semester: "Fall2025", status: "Pending" },
  { key: "5", no: 5, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "25/09/2022", semester: "Fall2025", status: "Pending" },
  { key: "6", no: 6, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "04/10/2022", semester: "Fall2025", status: "Approved" },
  { key: "7", no: 7, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "17/10/2022", semester: "Fall2025", status: "Approved" },
  { key: "8", no: 8, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "24/10/2022", semester: "Fall2025", status: "Approved" },
  { key: "9", no: 9, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "01/11/2022", semester: "Fall2025", status: "Rejected" },
  { key: "10", no: 10, name: "Assignment 01 - NguyenNT", teacher: "Tran Thanh Nguyen", date: "22/11/2022", semester: "Fall2025", status: "Rejected" },
];


const columns: TableProps<ApprovalItem>["columns"] = [
  {
    title: "No",
    dataIndex: "no",
    key: "no",
    width: 60,
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
    render: (text) => <Text strong>{text}</Text>,
  },
  {
    title: "Teacher",
    dataIndex: "teacher",
    key: "teacher",
    sorter: (a, b) => a.teacher.localeCompare(b.teacher),
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    sorter: (a, b) => a.date.localeCompare(b.date),
  },
  {
    title: "Semester",
    dataIndex: "semester",
    key: "semester",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: ApprovalItem["status"]) => {
      let color;
      switch (status) {
        case "Approved":
          color = "success";
          break;
        case "Rejected":
          color = "error";
          break;
        case "Pending":
          color = "warning";
          break;
        default:
          color = "default";
      }
      return <Tag color={color} className={styles.statusTag}>{status}</Tag>;
    },
    filters: [
      { text: "Approved", value: "Approved" },
      { text: "Rejected", value: "Rejected" },
      { text: "Pending", value: "Pending" },
    ],
    onFilter: (value, record) => record.status === value,
  },
];

export default function ApprovalList() {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  const filteredData = approvalData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.teacher.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleRowClick = (record: ApprovalItem) => {
    router.push(`/hod/approval/${record.key}`);
  };

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
          Approval
        </Title>
        <Input
          placeholder="Search..."
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchBar}
          prefix={<SearchOutlined />}
        />
      </div>

      <Card className={styles.approvalCard}>
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          className={styles.approvalTable}
          onRow={(record) => {
            return {
              onClick: () => handleRowClick(record),
              style: { cursor: "pointer" },
            };
          }}
        />
      </Card>
    </div>
  );
}