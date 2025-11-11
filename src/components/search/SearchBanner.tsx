"use client";

import React from "react";
import { Input } from "antd";
import { Button } from "../ui/Button";
import styles from "./SearchBanner.module.css";

const { Search } = Input;

// Định nghĩa Props (Giữ nguyên)
export interface SearchBannerProps {
  backgroundImageUrl: string;
  categories: string[];
  onSearch: (value: string) => void;
  onCategoryClick: (category: string) => void;
  placeholder?: string;
}

export const SearchBanner: React.FC<SearchBannerProps> = ({
  backgroundImageUrl,
  categories,
  onSearch,
  onCategoryClick,
  placeholder = "Search your favourite course",
}) => {
  return (
    <div
      className={styles.bannerWrapper}
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
      }}
    >
      <div className={styles.overlay} />

      <div className={styles.contentWrapper}>
        <Search
          placeholder={placeholder}
          enterButton="Search"
          size="large"
          onSearch={onSearch}
          className={styles.searchBar}
        />

        <div className={styles.categoryWrapper}>
          {categories.map((category) => (
            // 4. Sử dụng Button tùy chỉnh cho categories
            <Button
              key={category}
              className={styles.categoryButton}
              shape="round"
              size="large"
              onClick={() => onCategoryClick(category)}
              // Dùng 'variant' nếu cần, nhưng CSS module đã style nó
              // variant="default" (hoặc không cần)
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
