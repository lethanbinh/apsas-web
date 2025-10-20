"use client";

import React, { useState } from 'react';
import LayoutLecturer from '@/components/layout/LayoutLecturer';
import styles from './Tasks.module.css';

const TasksPage = () => {
  const [isCapstoneOpen, setIsCapstoneOpen] = useState(false);
  const [isAssignment01Open, setIsAssignment01Open] = useState(false);
  const [isAssignment02Open, setIsAssignment02Open] = useState(false); // New state for Assignment 02
  const [isQuestion1Open, setIsQuestion1Open] = useState(false);
  const [isQuestion2Open, setIsQuestion2Open] = useState(false); // New state for Question 2
  const [isQuestion3Open, setIsQuestion3Open] = useState(false); // New state for Question 3
  const [isQuestion4Open, setIsQuestion4Open] = useState(false); // New state for Question 4
  const [isCriteria1Open, setIsCriteria1Open] = useState(false); // New state for Criteria 1 of Question 1
  const [isCriteria2Open, setIsCriteria2Open] = useState(false); // New state for Criteria 2 of Question 1
  const [isCriteria3Open, setIsCriteria3Open] = useState(false); // New state for Criteria 3 of Question 1
  const [isCriteria4Open, setIsCriteria4Open] = useState(false); // New state for Criteria 4 of Question 1

  // States for Criteria in other Questions (simplified for now)
  const [isQ2Criteria1Open, setIsQ2Criteria1Open] = useState(false);
  const [isQ3Criteria1Open, setIsQ3Criteria1Open] = useState(false);
  const [isQ4Criteria1Open, setIsQ4Criteria1Open] = useState(false);

  // New states for additional Capstone Projects
  const [isCapstoneProject2Open, setIsCapstoneProject2Open] = useState(false);
  const [isCapstoneProject3Open, setIsCapstoneProject3Open] = useState(false);

  return (
    <LayoutLecturer>
      <div className={styles.container}>
        <h1 className={styles.title}>Tasks</h1>

        {/* Capstone Project 1 Section */}
        <div className={styles['task-section']}>
          <div className={styles['task-header']} onClick={() => setIsCapstoneOpen(!isCapstoneOpen)}>
            <div className={styles['task-title']}>
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
                <polyline points="6 9 12 15 18 9" />
              </svg>
              Capstone Project 
            </div>
            <div className={styles['task-meta']}>
              <span className={styles['status-tag']}>Pending</span>
              <span>5 Questions</span>
              <svg
                className={`${styles['question-dropdown-arrow']} ${isCapstoneOpen ? styles.rotate : ''}`}
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
          </div>
          {isCapstoneOpen && (
            <div className={`${styles['task-content']} ${styles['nested-content']}`}>

              {/* Assignment 01 Section (nested under Capstone Project 1) */}
              <div className={styles['sub-task-section']}>
                <div className={styles['task-header']} onClick={() => setIsAssignment01Open(!isAssignment01Open)}>
                  <div className={styles['task-title']}>
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
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    Assignment 01
                  </div>
                  <button className={styles['export-button']}>Export</button>
                  <svg
                    className={`${styles['question-dropdown-arrow']} ${isAssignment01Open ? styles.rotate : ''}`}
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
                {isAssignment01Open && (
                  <div className={`${styles['task-content']} ${styles['nested-content']}`}>

                    {/* Basic Assignment (nested under Assignment 01) */}
                    <div className={styles['basic-assignment-section']}>
                      <div className={styles['basic-assignment-header']}>
                        <div className={styles['basic-assignment-title']}>
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
                        <button className={styles['import-button']}>Import Database</button>
                      </div>

                      {/* Question 1 (collapsible within Basic Assignment) */}
                      <div className={styles['question-card']}>
                        <div className={styles['question-header']} onClick={() => setIsQuestion1Open(!isQuestion1Open)}>
                          <h3 className={styles['question-title-text']}>Question 1</h3>
                          <svg
                            className={`${styles['question-dropdown-arrow']} ${isQuestion1Open ? styles.rotate : ''}`}
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
                          <div className={styles['question-content-wrapper']}>
                            <div className={styles['question-details-grid']}>
                              <div className={styles['input-group']}>
                                <label htmlFor="title-input" className={styles.label}>Title</label>
                                <input type="text" id="title-input" placeholder="Name of card" className={styles['input-field']} />
                              </div>
                              <div className={styles['input-group']}>
                                <label htmlFor="content-input" className={styles.label}>Content</label>
                                <input type="text" id="content-input" placeholder="Card Number" className={styles['input-field']} />
                              </div>
                              <div className={styles['upload-card']}>
                                <svg
                                  className={styles['upload-icon']}
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
                                <p className={styles['upload-text']}>Click here to Upload</p>
                                <p className={styles['upload-hint']}>Upload Image file. Size must be less than 5Mb</p>
                              </div>
                            </div>

                            {/* Criteria 1 (collapsible within Question 1) */}
                            <div className={styles['criteria-sub-section']}>
                              <div className={styles['criteria-header']} onClick={() => setIsCriteria1Open(!isCriteria1Open)}>
                                <h4 className={styles['criteria-title-text']}>Criteria 1</h4>
                                <svg
                                  className={`${styles['question-dropdown-arrow']} ${isCriteria1Open ? styles.rotate : ''}`}
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
                                <div className={styles['criteria-content']}>
                                  <div className={styles['input-group']}>
                                    <label htmlFor="criteria1-title" className={styles.label}>Title</label>
                                    <input type="text" id="criteria1-title" placeholder="Name of card" className={styles['input-field']} />
                                  </div>
                                  <div className={styles['input-group']}>
                                    <label htmlFor="criteria1-content" className={styles.label}>Content</label>
                                    <input type="text" id="criteria1-content" placeholder="Card Number" className={styles['input-field']} />
                                  </div>
                                  <div className={styles['input-group']}>
                                    <label className={styles.label}>Data type</label>
                                    <div className={styles['radio-group']}>
                                      <div className={styles['radio-option']}>
                                        <input type="radio" id="numeric" name="dataType1_Q1" value="numeric" defaultChecked />
                                        <label htmlFor="numeric" className={styles['radio-label']}>Numeric</label>
                                      </div>
                                      <div className={styles['radio-option']}>
                                        <input type="radio" id="boolean" name="dataType1_Q1" value="boolean" />
                                        <label htmlFor="boolean" className={styles['radio-label']}>Boolean</label>
                                      </div>
                                      <div className={styles['radio-option']}>
                                        <input type="radio" id="string" name="dataType1_Q1" value="string" />
                                        <label htmlFor="string" className={styles['radio-label']}>String</label>
                                      </div>
                                      <div className={styles['radio-option']}>
                                        <input type="radio" id="special" name="dataType1_Q1" value="special" />
                                        <label htmlFor="special" className={styles['radio-label']}>Special</label>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={styles['input-group']}>
                                    <label htmlFor="criteria1-score" className={styles.label}>Score</label>
                                    <input type="number" id="criteria1-score" placeholder="2" className={styles['input-field']} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Criteria 2 (collapsible within Question 1) */}
                            <div className={styles['criteria-sub-section']}>
                              <div className={styles['criteria-header']} onClick={() => setIsCriteria2Open(!isCriteria2Open)}>
                                <h4 className={styles['criteria-title-text']}>Criteria 2</h4>
                                <svg
                                  className={`${styles['question-dropdown-arrow']} ${isCriteria2Open ? styles.rotate : ''}`}
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
                                <div className={styles['criteria-content']}>
                                  <p>Details for Criteria 2...</p>
                                </div>
                              )}
                            </div>

                            {/* Criteria 3 (collapsible within Question 1) */}
                            <div className={styles['criteria-sub-section']}>
                              <div className={styles['criteria-header']} onClick={() => setIsCriteria3Open(!isCriteria3Open)}>
                                <h4 className={styles['criteria-title-text']}>Criteria 3</h4>
                                <svg
                                  className={`${styles['question-dropdown-arrow']} ${isCriteria3Open ? styles.rotate : ''}`}
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
                                <div className={styles['criteria-content']}>
                                  <p>Details for Criteria 3...</p>
                                </div>
                              )}
                            </div>

                            {/* Criteria 4 (collapsible within Question 1) */}
                            <div className={styles['criteria-sub-section']}>
                              <div className={styles['criteria-header']} onClick={() => setIsCriteria4Open(!isCriteria4Open)}>
                                <h4 className={styles['criteria-title-text']}>Criteria 4</h4>
                                <svg
                                  className={`${styles['question-dropdown-arrow']} ${isCriteria4Open ? styles.rotate : ''}`}
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
                                <div className={styles['criteria-content']}>
                                  <p>Details for Criteria 4...</p>
                                </div>
                              )}
                            </div>

                          </div> 
                        )}
                      </div> {/* Close question-card */}

                      {/* Question 2 */}
                      <div className={styles['question-card']}>
                        <div className={styles['question-header']} onClick={() => setIsQuestion2Open(!isQuestion2Open)}>
                          <h3 className={styles['question-title-text']}>Question 2</h3>
                          <svg
                            className={`${styles['question-dropdown-arrow']} ${isQuestion2Open ? styles.rotate : ''}`}
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
                          <div className={styles['question-content-wrapper']}>
                            <p>Details and Criteria for Question 2...</p>
                            <div className={styles['criteria-sub-section']}>
                              <div className={styles['criteria-header']} onClick={() => setIsQ2Criteria1Open(!isQ2Criteria1Open)}>
                                <h4 className={styles['criteria-title-text']}>Criteria 1</h4>
                                <svg
                                  className={`${styles['question-dropdown-arrow']} ${isQ2Criteria1Open ? styles.rotate : ''}`}
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
                                <div className={styles['criteria-content']}>
                                  <p>Details for Question 2 - Criteria 1...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Question 3 */}
                      <div className={styles['question-card']}>
                        <div className={styles['question-header']} onClick={() => setIsQuestion3Open(!isQuestion3Open)}>
                          <h3 className={styles['question-title-text']}>Question 3</h3>
                          <svg
                            className={`${styles['question-dropdown-arrow']} ${isQuestion3Open ? styles.rotate : ''}`}
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
                          <div className={styles['question-content-wrapper']}>
                            <p>Details and Criteria for Question 3...</p>
                            <div className={styles['criteria-sub-section']}>
                              <div className={styles['criteria-header']} onClick={() => setIsQ3Criteria1Open(!isQ3Criteria1Open)}>
                                <h4 className={styles['criteria-title-text']}>Criteria 1</h4>
                                <svg
                                  className={`${styles['question-dropdown-arrow']} ${isQ3Criteria1Open ? styles.rotate : ''}`}
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
                                <div className={styles['criteria-content']}>
                                  <p>Details for Question 3 - Criteria 1...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Question 4 */}
                      <div className={styles['question-card']}>
                        <div className={styles['question-header']} onClick={() => setIsQuestion4Open(!isQuestion4Open)}>
                          <h3 className={styles['question-title-text']}>Question 4</h3>
                          <svg
                            className={`${styles['question-dropdown-arrow']} ${isQuestion4Open ? styles.rotate : ''}`}
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
                          <div className={styles['question-content-wrapper']}>
                            <p>Details and Criteria for Question 4...</p>
                            <div className={styles['criteria-sub-section']}>
                              <div className={styles['criteria-header']} onClick={() => setIsQ4Criteria1Open(!isQ4Criteria1Open)}>
                                <h4 className={styles['criteria-title-text']}>Criteria 1</h4>
                                <svg
                                  className={`${styles['question-dropdown-arrow']} ${isQ4Criteria1Open ? styles.rotate : ''}`}
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
                                <div className={styles['criteria-content']}>
                                  <p>Details for Question 4 - Criteria 1...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>


                    </div>
                  </div>
                )}
              </div>

              {/* Assignment 02 Section (nested under Capstone Project 1) */}
              <div className={styles['sub-task-section']}>
                <div className={styles['task-header']} onClick={() => setIsAssignment02Open(!isAssignment02Open)}>
                  <div className={styles['task-title']}>
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
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    Assignment 02
                  </div>
                  <button className={styles['export-button']}>Export</button>
                  <svg
                    className={`${styles['question-dropdown-arrow']} ${isAssignment02Open ? styles.rotate : ''}`}
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
                {isAssignment02Open && (
                  <div className={`${styles['task-content']} ${styles['nested-content']}`}>
                    {/* Content for Assignment 02 when open */}
                    <p>Details about Assignment 02 go here. You can add more sections like Basic Assignment if needed.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Capstone Project 2 Section */}
        <div className={styles['task-section']}>
          <div className={styles['task-header']} onClick={() => setIsCapstoneProject2Open(!isCapstoneProject2Open)}>
            <div className={styles['task-title']}>
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
                <polyline points="6 9 12 15 18 9" />
              </svg>
              Lab211 Java
            </div>
            <div className={styles['task-meta']}>
              <span className={styles['status-tag']}>New</span>
              <span>3 Questions</span>
              <svg
                className={`${styles['question-dropdown-arrow']} ${isCapstoneProject2Open ? styles.rotate : ''}`}
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
          </div>
          {isCapstoneProject2Open && (
            <div className={`${styles['task-content']} ${styles['nested-content']}`}>
              <p>Details for Capstone Project 2. This can contain nested assignments, questions, and criteria similar to Capstone Project 1 if needed.</p>
            </div>
          )}
        </div>

        {/* Capstone Project 3 Section */}
        <div className={styles['task-section']}>
          <div className={styles['task-header']} onClick={() => setIsCapstoneProject3Open(!isCapstoneProject3Open)}>
            <div className={styles['task-title']}>
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
                <polyline points="6 9 12 15 18 9" />
              </svg>
              PRN391 C#
            </div>
            <div className={styles['task-meta']}>
              <span className={styles['status-tag']}>Completed</span>
              <span>7 Questions</span>
              <svg
                className={`${styles['question-dropdown-arrow']} ${isCapstoneProject3Open ? styles.rotate : ''}`}
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
          </div>
          {isCapstoneProject3Open && (
            <div className={`${styles['task-content']} ${styles['nested-content']}`}>
              <p>Details for Capstone Project 3. This can contain nested assignments, questions, and criteria similar to Capstone Project 1 if needed.</p>
            </div>
          )}
        </div>

      </div>
    </LayoutLecturer>
  );
};

export default TasksPage;
