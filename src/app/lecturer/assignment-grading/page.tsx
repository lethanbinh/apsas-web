"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./AssignmentGrading.module.css";

const AssignmentGradingPage = () => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className={styles.container}>
      <div className={styles["header-section"]}>
        <h1 className={styles.title}>Assignments</h1>
        <Link href="/lecturer/dashboard" className={styles["breadcrumb-link"]}>
          Dashboard
        </Link>
      </div>

      <div className={styles["content-card"]}>
        <h2 className={styles["student-name"]}>LeThanhBinh</h2>
        <p className={styles["due-date"]}>Due date: 18/10/2025</p>

        <div className={styles["submitted-file-container"]}>
          <svg
            className={styles["file-link-icon"]}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            ></path>
          </svg>
          <a href="#" className={styles["file-link"]}>
            lethanhbinh.zip
          </a>
        </div>

        <button className={styles["auto-grade-button"]}>Auto grade</button>
      </div>

      <div className={styles["score-feedback-section"]}>
        <h2 className={styles["section-title"]}>Assignment score</h2>
        <div className={styles["score-grid"]}>
          <div className={styles["input-group"]}>
            <label htmlFor="totalScore" className={styles.label}>
              Total score
            </label>
            <input
              type="text"
              id="totalScore"
              defaultValue="5/10"
              className={styles["input-field"]}
            />
          </div>
          <div className={styles["input-group"]}>
            <label htmlFor="feedback" className={styles.label}>
              Feedback
            </label>
            <textarea
              id="feedback"
              defaultValue="Dictumst scelerisque ut commodo dis. Risus ac tellus sapien gravida sit elementum dui eget nunc."
              className={styles["textarea-field"]}
            ></textarea>
          </div>
        </div>

        <h2 className={styles["section-title"]}>Detail result</h2>
        <div className={styles["score-grid"]}>
          <div className={styles["input-group"]}>
            <label htmlFor="criteria1Grade" className={styles.label}>
              Criteria 1 grade
            </label>
            <input
              type="text"
              id="criteria1Grade"
              defaultValue="5/10"
              className={styles["input-field"]}
            />
          </div>
          <div className={styles["input-group"]}>
            <label htmlFor="criteria1Reason" className={styles.label}>
              Reason for this score
            </label>
            <textarea
              id="criteria1Reason"
              defaultValue="Dictumst scelerisque ut commodo dis. Risus ac tellus sapien gravida sit elementum dui eget nunc."
              className={styles["textarea-field"]}
            ></textarea>
          </div>

          <div className={styles["input-group"]}>
            <label htmlFor="criteria2Grade" className={styles.label}>
              Criteria 2 grade
            </label>
            <input
              type="text"
              id="criteria2Grade"
              defaultValue="5/10"
              className={styles["input-field"]}
            />
          </div>
          <div className={styles["input-group"]}>
            <label htmlFor="criteria2Reason" className={styles.label}>
              Reason for this score
            </label>
            <textarea
              id="criteria2Reason"
              defaultValue="Dictumst scelerisque ut commodo dis. Risus ac tellus sapien gravida sit elementum dui eget nunc."
              className={styles["textarea-field"]}
            ></textarea>
          </div>
        </div>

        <h2 className={styles["section-title"]}>Suggestions</h2>
        <div className={styles["suggestions-grid"]}>
          <div className={styles["input-group"]}>
            <label htmlFor="whatToAvoid" className={styles.label}>
              What you should avoid
            </label>
            <textarea
              id="whatToAvoid"
              defaultValue="Dictumst scelerisque ut commodo dis. Risus ac tellus sapien gravida sit elementum dui eget nunc."
              className={styles["textarea-field"]}
            ></textarea>
          </div>
          <div className={styles["input-group"]}>
            <label htmlFor="whatToImprove" className={styles.label}>
              What you should improve
            </label>
            <textarea
              id="whatToImprove"
              defaultValue="Dictumst scelerisque ut commodo dis. Risus ac tellus sapien gravida sit elementum dui eget nunc."
              className={styles["textarea-field"]}
            ></textarea>
          </div>
        </div>

        <button className={styles["save-grade-button"]}>Save grade</button>
      </div>

      <button onClick={handleBack} className={styles["back-button"]}>
        Back
      </button>
    </div>
  );
};

export default AssignmentGradingPage;
