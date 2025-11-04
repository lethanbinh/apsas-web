"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Select, Input, Button, Table, Typography } from "antd";
import { SearchOutlined, LogoutOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { useAuth } from "@/hooks/useAuth";
import styles from "./StudentGradeLookup.module.css";

const { Title } = Typography;
const { Option } = Select;

interface GradeData {
  key: string;
  course: string;
  midtermScore: string;
  finalScore1: string;
  finalScore2: string;
  totalScore: string;
}

const mockData: GradeData[] = [
  {
    key: "1",
    course: "Database Design (CS201)",
    midtermScore: "Fall 2024",
    finalScore1: "85",
    finalScore2: "90",
    totalScore: "87.5",
  },
  {
    key: "2",
    course: "Data Structures (CS105)",
    midtermScore: "Fall 2024",
    finalScore1: "78",
    finalScore2: "88",
    totalScore: "83",
  },
  {
    key: "3",
    course: "Algorithms (CS106)",
    midtermScore: "Spring 2025",
    finalScore1: "92",
    finalScore2: "95",
    totalScore: "91",
  },
  {
    key: "4",
    course: "Network Security (CS402)",
    midtermScore: "Spring 2025",
    finalScore1: "80",
    finalScore2: "82",
    totalScore: "81",
  },
  {
    key: "5",
    course: "Operating Systems (8301)",
    midtermScore: "Summer 2024",
    finalScore1: "88",
    finalScore2: "79",
    totalScore: "83.5",
  },
];

const columns: TableProps<GradeData>["columns"] = [
  {
    title: "Course",
    dataIndex: "course",
    key: "course",
  },
  {
    title: "Midterm Score",
    dataIndex: "midtermScore",
    key: "midtermScore",
  },
  {
    title: "Final Score",
    dataIndex: "finalScore1",
    key: "finalScore1",
  },
  {
    title: "Final Score",
    dataIndex: "finalScore2",
    key: "finalScore2",
  },
  {
    title: "Total Score",
    dataIndex: "totalScore",
    key: "totalScore",
  },
];

export default function StudentGradeLookupPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState<string>("Fall 2024");
  const [selectedCourse, setSelectedCourse] = useState<string>("Database Design (CS201)");
  const [filteredData, setFilteredData] = useState<GradeData[]>(mockData);

  const handleSearch = () => {
    // Filter logic can be added here
    // For now, just show all data
    setFilteredData(mockData);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className={styles.wrapper}>
      {/* Header Section */}
      <div className={styles.header}>
        <Title level={1} className={styles.title}>
          Student Grade Lookup
        </Title>
        <div className={styles.branding}>
          <Image
            src="/APSAS_logo.webp"
            alt="APSA-S"
            width={120}
            height={40}
            className={styles.logo}
          />
          <Button
            type="default"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Search/Filter Section */}
      <div className={styles.searchSection}>
        <div className={styles.searchItem}>
          <label className={styles.label}>Semester</label>
          <Select
            value={selectedSemester}
            onChange={setSelectedSemester}
            className={styles.selectInput}
            suffixIcon={<span className={styles.dropdownIcon}>▼</span>}
          >
            <Option value="Fall 2024">Fall 2024</Option>
            <Option value="Spring 2025">Spring 2025</Option>
            <Option value="Summer 2024">Summer 2024</Option>
          </Select>
        </div>
        <div className={styles.searchItem}>
          <label className={styles.label}>Course</label>
          <Input
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className={styles.courseInput}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            className={styles.searchButton}
          >
            Search
          </Button>
        </div>
      </div>

      {/* Results Table */}
      <div className={styles.tableWrapper}>
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={false}
          className={styles.gradeTable}
          rowClassName={(_, index) =>
            index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
          }
        />
      </div>
    </div>
  );
}

