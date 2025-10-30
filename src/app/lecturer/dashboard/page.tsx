"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./DashboardLecturer.module.css";

const data = [
  { name: "Phong", score: 2.1 },
  { name: "Binh", score: 5.5 },
  { name: "Tam", score: 2.8 },
  { name: "An", score: 7.5 },
  { name: "Huy", score: 4.8 },
  { name: "Chau", score: 10.0 },
];

const LecturerDashboardPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles["stats-grid"]}>
        {/* Stat Card 1: Students Submit (Purple) */}
        <div className={`${styles["stat-card"]} ${styles.purple}`}>
          <div>
            <div className={`${styles["stat-value"]}`}>20</div>
            <div className={`${styles["stat-label"]}`}>Students Submit</div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["stat-icon"]}.purple`}
          >
            <svg
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
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </div>
        </div>

        {/* Stat Card 2: Pass Assignments (Pink) */}
        <div className={`${styles["stat-card"]} ${styles.pink}`}>
          <div>
            <div className={`${styles["stat-value"]} ${styles.pink}`}>5</div>
            <div className={`${styles["stat-label"]} ${styles.pink}`}>
              Pass Assignments
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["stat-icon"]}.pink`}
          >
            <svg
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        </div>

        {/* Stat Card 3: Students Submit (Purple) - Duplicate for layout */}
        <div className={`${styles["stat-card"]} ${styles.purple}`}>
          <div>
            <div className={`${styles["stat-value"]}`}>20</div>
            <div className={`${styles["stat-label"]}`}>Students Submit</div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["stat-icon"]}.purple`}
          >
            <svg
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
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </div>
        </div>

        {/* Stat Card 4: Pass Assignments (Pink) - Duplicate for layout */}
        <div className={`${styles["stat-card"]} ${styles.pink}`}>
          <div>
            <div className={`${styles["stat-value"]} ${styles.pink}`}>5</div>
            <div className={`${styles["stat-label"]} ${styles.pink}`}>
              Pass Assignments
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["stat-icon"]}.pink`}
          >
            <svg
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        </div>
      </div>

      <div className={styles["average-score-section"]}>
        <h2 className={styles["average-score-title"]}>Average Score</h2>
        <p className={styles["average-score-value"]}>7.5</p>
        <div className={styles["chart-container"]}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e0e0e0"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip />
              <Line
                type="natural"
                dataKey="score"
                stroke="#4A90E2"
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 8,
                  fill: "#4A90E2",
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                fill="url(#colorScore)"
              />
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A90E2" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4A90E2" stopOpacity={0} />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboardPage;
