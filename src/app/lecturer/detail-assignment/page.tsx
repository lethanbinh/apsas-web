"use client";

import React, { useState } from 'react';
import LayoutLecturer from '@/components/layout/LayoutLecturer';
import Link from 'next/link';
import styles from './DetailAsm.module.css';
import PaperAssignmentModal from '@/components/features/PaperAssignmentModal';
import DatePickerModal from '@/components/features/DatePickerModal';
import { format } from 'date-fns';
// Recharts imports removed
// const data array removed

const DetailAssignmentPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date('2021-03-13')); // Initialize with the default date

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const openDatePicker = () => setIsDatePickerOpen(true);
  const closeDatePicker = () => setIsDatePickerOpen(false);
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <LayoutLecturer>
      <div className={styles.container}>
        <div className={styles['header-section']}>
          <h1 className={styles.title}>Assignments Detail</h1>
          <Link href="/lecturer/dashboard" className={styles['dashboard-link']}>
            Dashboard
          </Link>
        </div>

        <div className={styles['content-card']}>
          <h2 className={styles['assignment-title']} onClick={openModal} style={{ cursor: 'pointer' }}>Assignments 01</h2>
          
          <div className={styles['date-info']} onClick={openDatePicker} style={{ cursor: 'pointer' }}>
            <svg
              className={styles['date-icon']}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            {selectedDate ? format(selectedDate, 'dd MMMM yyyy') : 'Select Date'}
          </div>

          <div className={styles['requirement-link-container']}>
            <svg
              className={styles['link-icon']}
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
            <a href="#" className={styles['requirement-link']}>
              Requirement 01.pdf
            </a>
          </div>

          <div className={styles['description-text-background']}>
            <p className={styles['description-text']}>
              TOTC is a platform that allows educators to create online classes
              whereby they can store the course materials online; manage
              assignments, quizzes and exams; monitor due dates; grade
              results and provide students with feedback all in one place.
              TOTC is a platform that allows educators to create online classes
              whereby they can store the course materials online; manage
              course materials online; manage assignments, quizzes and exams; monitor due dates; grade
              results and provide students with feedback all in one place.
            </p>
          </div>

          <div className={styles['submissions-section']}>
          <h2 className={styles['submissions-title']}>Submissions</h2>
          
          <div className={styles['submission-item']}>
            <div className={styles['submission-info']}>
              <div className={styles['file-icon-wrapper']}>
                <svg
                  className={styles['file-icon']}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <div className={styles['submission-details']}>
                <span className={styles['student-name']}>
                  <Link href="/lecturer/assignment-grading" className={styles['student-name-link']}>Lethanhbinh</Link>
                </span>
                <span className={styles['file-name']}>lethanhbinh-asm.zip</span>
              </div>
            </div>
            <svg
              className={styles['download-icon']}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
          </div>

          <div className={styles['submission-item']}>
            <div className={styles['submission-info']}>
              <div className={styles['file-icon-wrapper']}>
                <svg
                  className={styles['file-icon']}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <div className={styles['submission-details']}>
                <span className={styles['student-name']}>
                  <Link href="/lecturer/assignment-grading" className={styles['student-name-link']}>Lethanhbinh</Link>
                </span>
                <span className={styles['file-name']}>lethanhbinh-asm.zip</span>
              </div>
            </div>
            <svg
              className={styles['download-icon']}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
          </div>

          <div className={styles['submission-item']}>
            <div className={styles['submission-info']}>
              <div className={styles['file-icon-wrapper']}>
                <svg
                  className={styles['file-icon']}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <div className={styles['submission-details']}>
                <span className={styles['student-name']}>
                  <Link href="/lecturer/assignment-grading" className={styles['student-name-link']}>Lethanhbinh</Link>
                </span>
                <span className={styles['file-name']}>lethanhbinh-asm.zip</span>
              </div>
            </div>
            <svg
              className={styles['download-icon']}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
          </div>

          <div className={styles['submission-item']}>
            <div className={styles['submission-info']}>
              <div className={styles['file-icon-wrapper']}>
                <svg
                  className={styles['file-icon']}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <div className={styles['submission-details']}>
                <span className={styles['student-name']}>
                  <Link href="/lecturer/assignment-grading" className={styles['student-name-link']}>Lethanhbinh</Link>
                </span>
                <span className={styles['file-name']}>lethanhbinh-asm.zip</span>
              </div>
            </div>
            <svg
              className={styles['download-icon']}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
          </div>

          <div className={styles['submission-item']}>
            <div className={styles['submission-info']}>
              <div className={styles['file-icon-wrapper']}>
                <svg
                  className={styles['file-icon']}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <div className={styles['submission-details']}>
                <span className={styles['student-name']}>
                  <Link href="/lecturer/assignment-grading" className={styles['student-name-link']}>Lethanhbinh</Link>
                </span>
                <span className={styles['file-name']}>lethanhbinh-asm.zip</span>
              </div>
            </div>
            <svg
              className={styles['download-icon']}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
          </div>

        </div>
        </div> {/* Close content-card */}
      </div> {/* Close styles.container */}

      <PaperAssignmentModal isOpen={isModalOpen} onClose={closeModal} />
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={closeDatePicker}
        onDateSelect={handleDateSelect}
        selectedDate={selectedDate}
      />
    </LayoutLecturer>
  );
};

export default DetailAssignmentPage;
