"use client";

import styles from "./GradingHistory.module.css";

const gradingData = [
  {
    no: "01",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "13/05/2022",
    score: "5/10",
    status: "On time",
  },
  {
    no: "02",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "22/05/2022",
    score: "5/10",
    status: "On time",
  },
  {
    no: "03",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "15/06/2022",
    score: "5/10",
    status: "On time",
  },
  {
    no: "04",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "06/09/2022",
    score: "5/10",
    status: "Late",
  },
  {
    no: "05",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "25/09/2022",
    score: "5/10",
    status: "Late",
  },
  {
    no: "06",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "04/10/2022",
    score: "5/10",
    status: "On time",
  },
  {
    no: "07",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "17/10/2022",
    score: "5/10",
    status: "On time",
  },
  {
    no: "08",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "24/10/2022",
    score: "5/10",
    status: "On time",
  },
  {
    no: "09",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "01/11/2022",
    score: "5/10",
    status: "Late",
  },
  {
    no: "10",
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "22/11/2022",
    score: "5/10",
    status: "Late",
  },
];

const GradingHistoryPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Grading history</h1>

      <div className={styles["table-card"]}>
        <table className={styles.table}>
          <thead>
            <tr className={styles["table-header"]}>
              <th>No</th>
              <th>
                File submit
                {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: '0.25rem', verticalAlign: 'middle' }}
                  >
                    <path d="M7 17l5 5 5-5" />
                    <path d="M7 7l5-5 5 5" />
                  </svg> */}
              </th>
              <th>
                Student
                {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: '0.25rem', verticalAlign: 'middle' }}
                  >
                    <path d="M7 17l5 5 5-5" />
                    <path d="M7 7l5-5 5 5" />
                  </svg> */}
              </th>
              <th>
                Date
                {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: '0.25rem', verticalAlign: 'middle' }}
                  >
                    <path d="M7 17l5 5 5-5" />
                    <path d="M7 7l5-5 5 5" />
                  </svg> */}
              </th>
              <th>
                Score
                {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: '0.25rem', verticalAlign: 'middle' }}
                  >
                    <path d="M7 17l5 5 5-5" />
                    <path d="M7 7l5-5 5 5" />
                  </svg> */}
              </th>
              <th>
                Status
                {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: '0.25rem', verticalAlign: 'middle' }}
                  >
                    <path d="M7 17l5 5 5-5" />
                    <path d="M7 7l5-5 5 5" />
                  </svg> */}
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {gradingData.map((item, index) => (
              <tr key={index} className={styles["table-row"]}>
                <td>{item.no}</td>
                <td>
                  <a
                    href="/lecturer/assignment-grading"
                    className={styles["file-link"]}
                  >
                    {item.fileSubmit}
                  </a>
                </td>
                <td>{item.student}</td>
                <td>{item.date}</td>
                <td>{item.score}</td>
                <td>
                  <span
                    className={`${styles["status-tag"]} ${
                      item.status === "On time"
                        ? styles["on-time"]
                        : styles.late
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td>
                  <button className={styles["action-button"]}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradingHistoryPage;
