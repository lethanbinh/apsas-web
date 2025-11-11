"use client";

import React from "react";
import LayoutAdmin from "@/components/layout/LayoutAdmin";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import styles from "./DashboardAdmin.module.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const assessmentData = [
  { name: "Fall2025", Asm: 4000, Lab: 2400, PE: 2400 },
  { name: "Summer2025", Asm: 3000, Lab: 1398, PE: 2210 },
  { name: "Spring2025", Asm: 2000, Lab: 9800, PE: 2290 },
];

const coursesData = [
  { name: "Fall2024", Course: 2000, Lab: 3000 },
  { name: "Spring2025", Course: 1500, Lab: 4000 },
  { name: "Fall2025", Course: 2200, Lab: 5000 },
];

const AdminDashboardPage = () => {
  return (
    <>
      <QueryParamsHandler />
      <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles["stats-grid"]}>
        <div className={`${styles["stat-card"]} ${styles.purple}`}>
          <div className={styles["stat-value"]}>20</div>
          <div className={styles["stat-label"]}>Users</div>
          <div className={styles["stat-icon-wrapper"]}>
            <svg
              className={styles["stat-icon"]}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l5.58-5.58c.94-.94.94-2.48 0-3.42L12 2z" />
              <path d="M7 7h.01" />
            </svg>
          </div>
        </div>
        <div className={`${styles["stat-card"]} ${styles.pink}`}>
          <div className={`${styles["stat-value"]} ${styles.pink}`}>5</div>
          <div className={`${styles["stat-label"]} ${styles.pink}`}>
            Teacher
          </div>
          <div className={styles["stat-icon-wrapper"]}>
            <svg
              className={`${styles["stat-icon"]} ${styles.pink}`}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 19H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z" />
              <line x1="7" y1="17" x2="7" y2="13" />
              <line x1="17" y1="17" x2="17" y2="13" />
              <line x1="12" y1="17" x2="12" y2="13" />
              <line x1="7" y1="9" x2="17" y2="9" />
            </svg>
          </div>
        </div>
        <div className={`${styles["stat-card"]} ${styles.purple}`}>
          <div className={styles["stat-value"]}>20</div>
          <div className={styles["stat-label"]}>Active</div>
          <div className={styles["stat-icon-wrapper"]}>
            <svg
              className={styles["stat-icon"]}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l5.58-5.58c.94-.94.94-2.48 0-3.42L12 2z" />
              <path d="M7 7h.01" />
            </svg>
          </div>
        </div>
        <div className={`${styles["stat-card"]} ${styles.pink}`}>
          <div className={`${styles["stat-value"]} ${styles.pink}`}>5</div>
          <div className={`${styles["stat-label"]} ${styles.pink}`}>Banded</div>
          <div className={styles["stat-icon-wrapper"]}>
            <svg
              className={`${styles["stat-icon"]} ${styles.pink}`}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 19H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z" />
              <line x1="7" y1="17" x2="7" y2="13" />
              <line x1="17" y1="17" x2="17" y2="13" />
              <line x1="12" y1="17" x2="12" y2="13" />
              <line x1="7" y1="9" x2="17" y2="9" />
            </svg>
          </div>
        </div>
      </div>

      <div className={styles["charts-grid"]}>
        <div className={styles["chart-card"]}>
          <h2 className={styles["chart-title"]}>Assessment number</h2>
          <div className={styles["legend-items"]}>
            <span className={styles["legend-item"]}>
              <span className={`${styles.dot} ${styles.asm}`}></span> Asm
            </span>
            <span className={styles["legend-item"]}>
              <span className={`${styles.dot} ${styles.lab}`}></span> Lab
            </span>
            <span className={styles["legend-item"]}>
              <span className={`${styles.dot} ${styles.pe}`}></span> PE
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assessmentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                width={80}
              />
              <Tooltip />
              <Bar dataKey="Asm" fill="#2563EB" barSize={10} />
              <Bar dataKey="Lab" fill="#10B981" barSize={10} />
              <Bar dataKey="PE" fill="#6D28D9" barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles["chart-card"]}>
          <h2 className={styles["chart-title"]}>Courses</h2>
          <div className={styles["legend-items"]}>
            <span className={styles["legend-item"]}>
              <span className={`${styles.dot} ${styles.course}`}></span> Course
            </span>
            <span className={styles["legend-item"]}>
              <span className={`${styles.dot} ${styles.lab}`}></span> Lab
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coursesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#888888" fontSize={12} />
              <YAxis stroke="#888888" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Course" fill="#6D28D9" barSize={10} />
              <Bar dataKey="Lab" fill="#10B981" barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminDashboardPage;
