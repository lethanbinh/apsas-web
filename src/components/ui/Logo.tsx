"use client";
import logoWebp from "@/assets/APSAS_logo.webp";
import Image from "next/image";
import React, { useState } from "react";
import styles from "./LogoComponent.module.css";
import Logo from "../../../public/logo/Logo";
interface LogoComponentProps {
  size?: "small" | "medium" | "large";
}
export const LogoComponent: React.FC<LogoComponentProps> = ({
  size = "large",
}) => {
  const [imageError, setImageError] = useState(false);
  if (imageError) {
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
      <Logo />
    </div>
  );
};