"use client";

import React from 'react';
import LayoutAdmin from '@/components/layout/LayoutAdmin';
import styles from './ManageUsers.module.css';

const ManageUsersPage: React.FC = () => {
  const userData = [
    { no: '01', email: 'NguyenNT@fpt.edu.vn', fullName: 'Tran Thanh Nguyen', date: '13/05/2022', roll: 'Teacher', class: 'SET1720' },
    { no: '02', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '22/05/2022', roll: 'Student', class: 'SET1720' },
    { no: '03', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '15/06/2022', roll: 'Student', class: 'SET1720' },
    { no: '04', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '06/09/2022', roll: 'Student', class: 'SET1720' },
    { no: '05', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '25/09/2022', roll: 'Student', class: 'SET1720' },
    { no: '06', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '04/10/2022', roll: 'Student', class: 'SET1720' },
    { no: '07', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '17/10/2022', roll: 'Student', class: 'SET1720' },
    { no: '08', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '24/10/2022', roll: 'Student', class: 'SET1720' },
    { no: '09', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '01/11/2022', roll: 'Student', class: 'SET1720' },
    { no: '10', email: 'anltse172257@fpt.edu.vn', fullName: 'Le Thu An', date: '22/11/2022', roll: 'Student', class: 'SET1720' },
  ];

  const SortIcon = () => (
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
      className={styles['sort-icon']}
    >
      <path d="M7 16l5 5 5-5M12 19V3" />
      <path d="M17 8l-5-5-5 5M12 5v16" />
    </svg>
  );

  return (
    <LayoutAdmin>
      <div className={styles.container}>
        <h1 className={styles.title}>Manage users</h1>
        
          <table className={styles.table}>
            <thead className={styles['table-header']}>
              <tr>
                <th>
                  <span>No</span>
                  
                </th>
                <th>
                  <span>Email</span>
                  
                </th>
                <th>
                  <span>Full name</span>
                  
                </th>
                <th>
                  <span>Date</span>
                  
                </th>
                <th>
                  <span>Roll</span>
                  
                </th>
                <th>
                  <span>Class</span>
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {userData.map((user, index) => (
                <tr key={index} className={styles['table-row']}>
                  <td>{user.no}</td>
                  <td>{user.email}</td>
                  <td>{user.fullName}</td>
                  <td>{user.date}</td>
                  <td>{user.roll}</td>
                  <td>{user.class}</td>
                </tr>
              ))}
            </tbody>
          </table>
        
      </div>
    </LayoutAdmin>
  );
};

export default ManageUsersPage;
