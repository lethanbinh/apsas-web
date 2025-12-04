"use client";

import styles from "../../app/admin/manage-users/ManageUsers.module.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  getPaginationItems: () => (number | string)[];
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  onPrevPage,
  onNextPage,
  getPaginationItems,
}: PaginationProps) => {
  return (
    <div className={styles.pagination}>
      <button onClick={onPrevPage} disabled={currentPage === 1}>
        Previous
      </button>
      {getPaginationItems().map((item, index) => {
        if (item === '...') {
          return (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>
              ...
            </span>
          );
        }
        return (
          <button
            key={item}
            onClick={() => onPageChange(item as number)}
            className={currentPage === item ? styles.activePage : ""}
          >
            {item}
          </button>
        );
      })}
      <button onClick={onNextPage} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
  );
};


