"use client";

import React, { useState } from 'react';
import styles from './SidebarAdmin.module.css';

const SidebarAdmin = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleToggleChange = () => {
    setIsDarkMode(!isDarkMode);
    // Implement actual theme change logic here if needed
    console.log("Dark mode toggled: ", !isDarkMode);
  };

  return (
    <div className={styles['sidebar-root']}>
      <nav className={styles['navigation-menu']}>
        <ul>
          <li className={styles['nav-item']}>
            <a href="/admin/dashboard" className={styles['nav-link']}>
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
              Dashboard
            </a>
          </li>
          <li className={styles['nav-item']}>
            <a href="/admin/manage-users" className={styles['nav-link']}>
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
                <path d="M3 3v18h18" />
                <path d="M18.7 8.3L12 15 7.1 10.1" />
              </svg>
              Manage users
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
        <label htmlFor="darkModeToggleAdmin" className={styles['toggle-label']}>
          <div className={styles['toggle-relative-wrapper']}>
            <input
              type="checkbox"
              id="darkModeToggleAdmin"
              className={styles['toggle-checkbox']}
              checked={isDarkMode}
              onChange={handleToggleChange}
            />
            <div className={styles['toggle-track']}></div>
            <div className={styles['toggle-thumb']}></div>
          </div>
        </label>
      </div>
    </div>
  );
};

export default SidebarAdmin;
