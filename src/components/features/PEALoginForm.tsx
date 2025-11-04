"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Typography, message } from "antd";
import { FileTextOutlined, CloseOutlined } from "@ant-design/icons";
import styles from "./PEALoginForm.module.css";

const { Text } = Typography;

interface PEALoginFormData {
  testName: string;
  userName: string;
  password: string;
}

export const PEALoginForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<PEALoginFormData>({
    testName: "",
    userName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof PEALoginFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogin = async () => {
    if (!formData.testName || !formData.userName || !formData.password) {
      message.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual login API call
      // For now, simulate login
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Store test session info
      if (typeof window !== "undefined") {
        localStorage.setItem("pea_test_name", formData.testName);
        localStorage.setItem("pea_user_name", formData.userName);
      }

      message.success("Login successful! Redirecting to submission...");
      router.push("/pe/submission");
    } catch (error) {
      message.error("Login failed. Please check your credentials.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    router.push("/");
  };

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <FileTextOutlined className={styles.icon} />
          </div>
          <Text className={styles.title}>PEA Login</Text>
        </div>
        <button className={styles.closeButton} onClick={handleClose}>
          <CloseOutlined />
        </button>
      </div>

      {/* Form Fields */}
      <div className={styles.form}>
        <div className={styles.formItem}>
          <label className={styles.label}>Test name:</label>
          <Input
            value={formData.testName}
            onChange={(e) => handleInputChange("testName", e.target.value)}
            className={styles.input}
            placeholder="Enter test name"
            autoFocus
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.label}>User name:</label>
          <Input
            value={formData.userName}
            onChange={(e) => handleInputChange("userName", e.target.value)}
            className={styles.input}
            placeholder="Enter user name"
          />
        </div>

        <div className={styles.formItem}>
          <label className={styles.label}>Password:</label>
          <Input.Password
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            className={styles.input}
            placeholder="Enter password"
          />
        </div>

        {/* Domain Info */}
        <div className={styles.domainInfo}>
          <Text className={styles.domainText}>
            Domain: <span className={styles.domainLink}>fu.edu.vn</span>
          </Text>
        </div>

        {/* Action Buttons */}
        <div className={styles.buttonGroup}>
          <Button
            type="primary"
            onClick={handleLogin}
            loading={loading}
            className={styles.loginButton}
          >
            Login
          </Button>
          <Button
            onClick={handleExit}
            className={styles.exitButton}
          >
            Exit
          </Button>
        </div>

        {/* Warning Message */}
        <div className={styles.warningMessage}>
          <Text className={styles.warningText}>
            Register the exam may take some minutes! Please wait!
          </Text>
        </div>

        {/* Version Info */}
        <div className={styles.versionInfo}>
          <Text className={styles.versionText}>
            Ver 2.1 (build 11.12.20.20)
          </Text>
        </div>
      </div>
    </div>
  );
};

