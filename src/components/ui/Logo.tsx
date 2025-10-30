"use client";

import logoWebp from "@/assets/APSAS_logo.webp";
import Image from "next/image";
import React, { useState } from "react";
import styles from "./LogoComponent.module.css";

interface LogoComponentProps {
  size?: "small" | "medium" | "large";
}

export const LogoComponent: React.FC<LogoComponentProps> = ({
  size = "large",
}) => {
  const [imageError, setImageError] = useState(false);

  const getLogoDimensions = () => {
    switch (size) {
      case "small":
        return { width: 64, height: 32 };
      case "medium":
        return { width: 100, height: 40 };
      case "large":
        return { width: 150, height: 60 };
      default:
        return { width: 100, height: 40 };
    }
  };

  const { width, height } = getLogoDimensions();

  if (imageError) {
    // Fallback khi ảnh lỗi
    return (
      <div
        className={`${styles.logoFallback} ${
          size === "small"
            ? styles.small
            : size === "medium"
            ? styles.medium
            : styles.large
        }`}
      >
        <span>APSAS</span>
      </div>
    );
  }

  return (
    <div
      className={`${styles.logoWrapper} ${
        size === "small"
          ? styles.small
          : size === "medium"
          ? styles.medium
          : styles.large
      }`}
    >
      <Image
        src={logoWebp}
        alt="APSAS Logo"
        width={width}
        height={height}
        onError={() => setImageError(true)}
        className={styles.logoImage}
        priority
      />
    </div>
  );
};
