"use client";

import { useState } from "react";
import styles from "./Tasks.module.css";

export const TaskContent = () => {
  const [isQuestion1Open, setIsQuestion1Open] = useState(false);
  const [isQuestion2Open, setIsQuestion2Open] = useState(false);
  const [isQuestion3Open, setIsQuestion3Open] = useState(false);
  const [isQuestion4Open, setIsQuestion4Open] = useState(false);
  const [isCriteria1Open, setIsCriteria1Open] = useState(false);
  const [isCriteria2Open, setIsCriteria2Open] = useState(false);
  const [isCriteria3Open, setIsCriteria3Open] = useState(false);
  const [isCriteria4Open, setIsCriteria4Open] = useState(false);

  const [isQ2Criteria1Open, setIsQ2Criteria1Open] = useState(false);
  const [isQ3Criteria1Open, setIsQ3Criteria1Open] = useState(false);
  const [isQ4Criteria1Open, setIsQ4Criteria1Open] = useState(false);

  return (
    <div className={`${styles["task-content"]} ${styles["nested-content"]}`}>
      <div className={styles["basic-assignment-section"]}>
        <div className={styles["basic-assignment-header"]}>
          <div className={styles["basic-assignment-title"]}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Basic Assignment
          </div>
          <button className={styles["import-button"]}>Import Database</button>
        </div>
        <div className={styles["question-card"]}>
          <div
            className={styles["question-header"]}
            onClick={() => setIsQuestion1Open(!isQuestion1Open)}
          >
            <h3 className={styles["question-title-text"]}>Question 1</h3>
            <svg
              className={`${styles["question-dropdown-arrow"]} ${
                isQuestion1Open ? styles.rotate : ""
              }`}
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {isQuestion1Open && (
            <div className={styles["question-content-wrapper"]}>
              <div className={styles["question-details-grid"]}>
                <div className={styles["input-group"]}>
                  <label htmlFor="title-input" className={styles.label}>
                    Title
                  </label>
                  <input
                    type="text"
                    id="title-input"
                    placeholder="Name of card"
                    className={styles["input-field"]}
                  />
                </div>
                <div className={styles["input-group"]}>
                  <label htmlFor="content-input" className={styles.label}>
                    Content
                  </label>
                  <input
                    type="text"
                    id="content-input"
                    placeholder="Card Number"
                    className={styles["input-field"]}
                  />
                </div>
                <div className={styles["upload-card"]}>
                  <svg
                    className={styles["upload-icon"]}
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
                    <path d="M4 14.89V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.11" />
                    <path d="M12 15l-4-4 4-4 4 4z" />
                    <path d="M12 3v12" />
                  </svg>
                  <p className={styles["upload-text"]}>Click here to Upload</p>
                  <p className={styles["upload-hint"]}>
                    Upload Image file. Size must be less than 5Mb
                  </p>
                </div>
              </div>
              <div className={styles["criteria-sub-section"]}>
                <div
                  className={styles["criteria-header"]}
                  onClick={() => setIsCriteria1Open(!isCriteria1Open)}
                >
                  <h4 className={styles["criteria-title-text"]}>Criteria 1</h4>
                  <svg
                    className={`${styles["question-dropdown-arrow"]} ${
                      isCriteria1Open ? styles.rotate : ""
                    }`}
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isCriteria1Open && (
                  <div className={styles["criteria-content"]}>
                    <div className={styles["input-group"]}>
                      <label htmlFor="criteria1-title" className={styles.label}>
                        Title
                      </label>
                      <input
                        type="text"
                        id="criteria1-title"
                        placeholder="Name of card"
                        className={styles["input-field"]}
                      />
                    </div>
                    <div className={styles["input-group"]}>
                      <label
                        htmlFor="criteria1-content"
                        className={styles.label}
                      >
                        Content
                      </label>
                      <input
                        type="text"
                        id="criteria1-content"
                        placeholder="Card Number"
                        className={styles["input-field"]}
                      />
                    </div>
                    <div className={styles["input-group"]}>
                      <label className={styles.label}>Data type</label>
                      <div className={styles["radio-group"]}>
                        <div className={styles["radio-option"]}>
                          <input
                            type="radio"
                            id="numeric"
                            name="dataType1_Q1"
                            value="numeric"
                            defaultChecked
                          />
                          <label
                            htmlFor="numeric"
                            className={styles["radio-label"]}
                          >
                            Numeric
                          </label>
                        </div>
                        <div className={styles["radio-option"]}>
                          <input
                            type="radio"
                            id="boolean"
                            name="dataType1_Q1"
                            value="boolean"
                          />
                          <label
                            htmlFor="boolean"
                            className={styles["radio-label"]}
                          >
                            Boolean
                          </label>
                        </div>
                        <div className={styles["radio-option"]}>
                          <input
                            type="radio"
                            id="string"
                            name="dataType1_Q1"
                            value="string"
                          />
                          <label
                            htmlFor="string"
                            className={styles["radio-label"]}
                          >
                            String
                          </label>
                        </div>
                        <div className={styles["radio-option"]}>
                          <input
                            type="radio"
                            id="special"
                            name="dataType1_Q1"
                            value="special"
                          />
                          <label
                            htmlFor="special"
                            className={styles["radio-label"]}
                          >
                            Special
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className={styles["input-group"]}>
                      <label htmlFor="criteria1-score" className={styles.label}>
                        Score
                      </label>
                      <input
                        type="number"
                        id="criteria1-score"
                        placeholder="2"
                        className={styles["input-field"]}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className={styles["criteria-sub-section"]}>
                <div
                  className={styles["criteria-header"]}
                  onClick={() => setIsCriteria2Open(!isCriteria2Open)}
                >
                  <h4 className={styles["criteria-title-text"]}>Criteria 2</h4>
                  <svg
                    className={`${styles["question-dropdown-arrow"]} ${
                      isCriteria2Open ? styles.rotate : ""
                    }`}
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isCriteria2Open && (
                  <div className={styles["criteria-content"]}>
                    <p>Details for Criteria 2...</p>
                  </div>
                )}
              </div>
              <div className={styles["criteria-sub-section"]}>
                <div
                  className={styles["criteria-header"]}
                  onClick={() => setIsCriteria3Open(!isCriteria3Open)}
                >
                  <h4 className={styles["criteria-title-text"]}>Criteria 3</h4>
                  <svg
                    className={`${styles["question-dropdown-arrow"]} ${
                      isCriteria3Open ? styles.rotate : ""
                    }`}
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isCriteria3Open && (
                  <div className={styles["criteria-content"]}>
                    <p>Details for Criteria 3...</p>
                  </div>
                )}
              </div>
              <div className={styles["criteria-sub-section"]}>
                <div
                  className={styles["criteria-header"]}
                  onClick={() => setIsCriteria4Open(!isCriteria4Open)}
                >
                  <h4 className={styles["criteria-title-text"]}>Criteria 4</h4>
                  <svg
                    className={`${styles["question-dropdown-arrow"]} ${
                      isCriteria4Open ? styles.rotate : ""
                    }`}
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isCriteria4Open && (
                  <div className={styles["criteria-content"]}>
                    <p>Details for Criteria 4...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles["question-card"]}>
          <div
            className={styles["question-header"]}
            onClick={() => setIsQuestion2Open(!isQuestion2Open)}
          >
            <h3 className={styles["question-title-text"]}>Question 2</h3>
            <svg
              className={`${styles["question-dropdown-arrow"]} ${
                isQuestion2Open ? styles.rotate : ""
              }`}
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {isQuestion2Open && (
            <div className={styles["question-content-wrapper"]}>
              <p>Details and Criteria for Question 2...</p>
              <div className={styles["criteria-sub-section"]}>
                <div
                  className={styles["criteria-header"]}
                  onClick={() => setIsQ2Criteria1Open(!isQ2Criteria1Open)}
                >
                  <h4 className={styles["criteria-title-text"]}>Criteria 1</h4>
                  <svg
                    className={`${styles["question-dropdown-arrow"]} ${
                      isQ2Criteria1Open ? styles.rotate : ""
                    }`}
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isQ2Criteria1Open && (
                  <div className={styles["criteria-content"]}>
                    <p>Details for Question 2 - Criteria 1...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles["question-card"]}>
          <div
            className={styles["question-header"]}
            onClick={() => setIsQuestion3Open(!isQuestion3Open)}
          >
            <h3 className={styles["question-title-text"]}>Question 3</h3>
            <svg
              className={`${styles["question-dropdown-arrow"]} ${
                isQuestion3Open ? styles.rotate : ""
              }`}
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {isQuestion3Open && (
            <div className={styles["question-content-wrapper"]}>
              <p>Details and Criteria for Question 3...</p>
              <div className={styles["criteria-sub-section"]}>
                <div
                  className={styles["criteria-header"]}
                  onClick={() => setIsQ3Criteria1Open(!isQ3Criteria1Open)}
                >
                  <h4 className={styles["criteria-title-text"]}>Criteria 1</h4>
                  <svg
                    className={`${styles["question-dropdown-arrow"]} ${
                      isQ3Criteria1Open ? styles.rotate : ""
                    }`}
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isQ3Criteria1Open && (
                  <div className={styles["criteria-content"]}>
                    <p>Details for Question 3 - Criteria 1...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles["question-card"]}>
          <div
            className={styles["question-header"]}
            onClick={() => setIsQuestion4Open(!isQuestion4Open)}
          >
            <h3 className={styles["question-title-text"]}>Question 4</h3>
            <svg
              className={`${styles["question-dropdown-arrow"]} ${
                isQuestion4Open ? styles.rotate : ""
              }`}
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {isQuestion4Open && (
            <div className={styles["question-content-wrapper"]}>
              <p>Details and Criteria for Question 4...</p>
              <div className={styles["criteria-sub-section"]}>
                <div
                  className={styles["criteria-header"]}
                  onClick={() => setIsQ4Criteria1Open(!isQ4Criteria1Open)}
                >
                  <h4 className={styles["criteria-title-text"]}>Criteria 1</h4>
                  <svg
                    className={`${styles["question-dropdown-arrow"]} ${
                      isQ4Criteria1Open ? styles.rotate : ""
                    }`}
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isQ4Criteria1Open && (
                  <div className={styles["criteria-content"]}>
                    <p>Details for Question 4 - Criteria 1...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
