"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Typography, message } from "antd";
import { FileTextOutlined, CloseOutlined } from "@ant-design/icons";
import { authService } from "@/services/authService";
import { examSessionService } from "@/services/examSessionService";
import { ExamSession } from "@/services/examSessionService";
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
      // Step 1: Login to get student information
      message.loading({ content: "Logging in...", key: "login" });
      const loginResponse = await authService.login({
        email: formData.userName,
        password: formData.password,
      });

      // Extract token and user info
      let token: string;
      if (loginResponse.result?.token) {
        token = loginResponse.result.token;
      } else if (loginResponse.token) {
        token = loginResponse.token;
      } else {
        throw new Error("No token in login response");
      }

      // Save token
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", token);
      }

      // Decode JWT to get user ID
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const decoded = JSON.parse(jsonPayload);
      const studentId = parseInt(decoded.nameid || decoded.sub);

      if (!studentId) {
        throw new Error("Could not extract student ID from token");
      }

      // Step 2: Enroll in exam session
      message.loading({
        content: "Enrolling in exam session...",
        key: "enroll",
      });
      await examSessionService.enrollExamSession({
        studentId: studentId,
        enrollmentCode: formData.testName,
      });

      // Step 3: Get exam session details
      // Retry logic: sometimes the exam session might not appear immediately after enrollment
      message.loading({
        content: "Loading exam session...",
        key: "loadSession",
      });
      
      let examSession: ExamSession | undefined;
      const maxRetries = 3;
      let retryCount = 0;
      
      while (!examSession && retryCount < maxRetries) {
        if (retryCount > 0) {
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        
        const examSessionsResponse = await examSessionService.getExamSessions({
          studentId: studentId,
          pageNumber: 1,
          pageSize: 100,
        });

        // Find the exam session with matching enrollment code
        examSession = examSessionsResponse.items.find(
          (session: ExamSession) => session.enrollmentCode === formData.testName
        );
        
        retryCount++;
      }

      if (!examSession) {
        throw new Error("Could not find exam session after enrollment. Please try again.");
      }

      // Store exam session info
      if (typeof window !== "undefined") {
        localStorage.setItem("pea_exam_session_id", examSession.id.toString());
        localStorage.setItem(
          "pea_exam_session",
          JSON.stringify(examSession)
        );
        localStorage.setItem("pea_student_id", studentId.toString());
        localStorage.setItem("pea_test_name", formData.testName);
        localStorage.setItem("pea_user_name", formData.userName);
      }

      message.success({
        content: "Login and enrollment successful! Redirecting...",
        key: "loadSession",
      });
      router.push("/pe/submission");
    } catch (error: any) {
      console.error("Login/Enroll error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Login or enrollment failed. Please check your credentials and enrollment code.";
      message.error({
        content: errorMessage,
        key: "login",
        duration: 5,
      });
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

