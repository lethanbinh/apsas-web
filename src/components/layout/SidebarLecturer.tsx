"use client";

import React, { useState } from 'react';
import styles from './SidebarLecturer.module.css';

const SidebarLecturer = () => {
  const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(false);

  return (
    <div className={styles['sidebar-root']}>
      <div className={styles['search-container']}>
        <div className={styles['search-input-wrapper']}>
          <input
            type="text"
            placeholder="Search..."
            className={styles['search-input']}
          />
          <svg
            className={styles['search-icon']}
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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      <nav className={styles['navigation-menu']}>
        <ul>
          {/* <li className={styles['nav-item']}>
            <a href="/lecturer/dashboard" className={styles['nav-link']}>
              <svg
                className="mr-3"
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
                <path d="M3 3v18h18" />
                <path d="M18.7 8.3L12 15 7.1 10.1" />
              </svg>
              Dashboard
            </a>
          </li> */}
          <li className={styles['nav-item']}>
            <a href="#" className={styles['nav-link']}>
              <svg
                className={styles['nav-icon']}
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Info
            </a>
          </li>
          <li className={styles['nav-item']}>
            <div
              className={styles['assignments-toggle']}
              onClick={() => setIsAssignmentsOpen(!isAssignmentsOpen)}
            >
              <svg
                className={styles['nav-icon']}
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
                <path d="M2 12h4l2 5 3-10 3 5 2-5 2 10 4-5" />
              </svg>
              Assignments
              <svg
                className={`${styles['dropdown-arrow']} ${isAssignmentsOpen ? styles.rotate : ''}`}
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
            {isAssignmentsOpen && (
              <ul className={styles['dropdown-menu']}>
                <li className={styles['dropdown-item']}>
                  <a href="/lecturer/detail-assignment" className={styles['dropdown-link']}>
                    Assignments 1
                  </a>
                </li>
                <li className={styles['dropdown-item']}>
                  <a href="#assignments-2" className={styles['dropdown-link']}>
                    Assignments 2
                  </a>
                </li>
              </ul>
            )}
          </li>
          <li className={styles['nav-item']}>
            <a href="/lecturer/grading-history" className={styles['nav-link']}>
              <svg
                className={styles['nav-icon']}
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Grading history
            </a>
          </li>

          <li className={styles['nav-item']}>
            <a href="/lecturer/practical-exam" className={styles['nav-link']}>
              <svg
                className={styles['nav-icon']}
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Practical exam
            </a>
          </li>

          <li className={styles['nav-item']}>
            <a href="/lecturer/tasks" className={styles['nav-link']}>
              <svg
                className={styles['nav-icon']}
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Tasks
            </a>
          </li>

          <li className={styles['nav-item']}>
            <a href="#" className={styles['nav-link']}>
              <svg
                className={styles['nav-icon']}
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Member list
            </a>
          </li>
        </ul>
      </nav>

      <div className={styles['light-mode-container']}>
        <div className={styles['light-mode-text']}>
          <svg
            className={styles['nav-icon']}
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
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          Light mode
        </div>
        <label htmlFor="darkModeToggle" className={styles['toggle-label']}>
          <div className={styles['toggle-relative-wrapper']}>
            <input type="checkbox" id="darkModeToggle" className={styles['toggle-checkbox']} />
            <div className={styles['toggle-track']}></div>
            <div className={styles['toggle-thumb']}></div>
          </div>
        </label>
      </div>
    </div>
  );
};

export default SidebarLecturer;
