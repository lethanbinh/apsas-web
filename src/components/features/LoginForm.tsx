"use client";

import { useAuth } from "@/hooks/useAuth";
import { config } from "@/lib/config";
import { Role } from "@/lib/constants";
import { authService } from "@/services/authService";
import { logout } from "@/store/slices/authSlice";
import { LoginCredentials } from "@/types";
import { Button, Checkbox, Form, Input, message } from "antd";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

const mapRoleToNumber = (role: string | number): Role => {
  if (typeof role === "number") {
    return role as Role;
  }
  const roleLower = role.toLowerCase();
  if (roleLower === "admin") return 0;
  if (roleLower === "lecturer") return 1;
  if (roleLower === "student") return 2;
  if (roleLower === "hod") return 3;
  if (roleLower === "examiner") return 4;
  return 2; // Default to Student
};

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const [form] = Form.useForm();
  const { login, isLoading } = useAuth();
  const dispatch = useDispatch();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  let app;
  if (getApps().length === 0) {
    app = initializeApp(config.firebase);
  } else {
    app = getApps()[0];
  }
  const auth = getAuth(app);

  useEffect(() => { }, []);

  const handleSubmit = async (values: LoginCredentials) => {
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      setErrors({});

      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_id');
      }

      dispatch(logout());

      const result = await login(values);

      if (!result) {
        throw new Error("Login failed: No response received");
      }

      if (!result.token) {
        throw new Error("Login failed: Invalid response from server");
      }

      console.log("Login successful!");

      const roleRedirects: { [key: number]: string } = {
        0: "/admin/dashboard", // Admin
        1: "/classes/my-classes/lecturer", // Lecturer
        2: "/classes/my-classes/student", // Student
        3: "/hod/semester-plans", // HOD
        4: "/examiner/exam-shifts", // examiner
      };

      let userRole: Role = 2;

      try {
        const decoded = decodeJWT(result.token);
        if (!decoded) {
          throw new Error("Failed to decode authentication token");
        }
        userRole = mapRoleToNumber(decoded?.role || 2);
      } catch (decodeError: any) {
        console.error("Token decode error:", decodeError);
        throw new Error("Failed to process authentication token");
      }

      const redirectPath = roleRedirects[userRole] || "/home/student";

      console.log("Redirecting to:", redirectPath);
      console.log("User role is:", userRole, "which maps to:", redirectPath);

      router.push(redirectPath);
      onSuccess?.();
    } catch (error: any) {
      console.error("Login error:", error);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_id');
      }

      dispatch(logout());

      const errorMessage =
        "Login failed. Please check your credentials and try again.";
      setErrors({ general: errorMessage });
      message.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setErrors({});

      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_id');
      }

      const result = await signInWithPopup(auth, provider);
      console.log("result:", result);

      if (!result || !result.user) {
        throw new Error(
          "Google authentication failed: No user information received"
        );
      }

      const idToken = await result.user.getIdToken();
      console.log("Google ID Token:", idToken);

      if (!idToken) {
        throw new Error("Google authentication failed: No ID token received");
      }

      console.log("Sending ID Token to backend:", idToken);
      const response = await authService.googleLogin({ idToken });
      console.log("Backend response for Google Login:", response);

      if (!response || !response.result || !response.result.token) {
        throw new Error("Google login failed: Invalid response from server");
      }

      localStorage.setItem("auth_token", response.result.token);

      const token = response.result.token;

      let decoded;
      try {
        decoded = decodeJWT(token);
        if (!decoded) {
          throw new Error("Failed to decode authentication token");
        }
      } catch (decodeError: any) {
        console.error("Token decode error:", decodeError);
        throw new Error("Failed to process authentication token");
      }

      const roleRedirects: { [key: number]: string } = {
        0: "/admin/dashboard", // Admin
        1: "/classes/my-classes/lecturer", // Lecturer
        2: "/classes/my-classes/student", // Student
        3: "/hod/semester-plans", // HOD
        4: "/examiner/exam-shifts", // examiner
      };

      const userRole = mapRoleToNumber(decoded?.role || 2);
      console.log(
        "Decoded role from JWT:",
        decoded?.role,
        "Mapped to:",
        userRole
      );

      const redirectPath = roleRedirects[userRole] || "/home/student";
      console.log("Redirecting to:", redirectPath);
      router.push(redirectPath);
      onSuccess?.();
    } catch (error: any) {
      console.error("Google login failed:", error);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_id');
      }

      dispatch(logout());

      const errorMessage =
        "Account is not registered or an error occurred during Google login.";
      setErrors({ general: errorMessage });
      message.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  return (
    <div className="login-form-container">
      <div className="login-form-header">
        <h1 className="login-title">Login to APSAS!</h1>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onFinishFailed={() => { }}
        autoComplete="off"
        className="login-form"
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Vui lòng nhập email" },
            { type: "email", message: "Email không hợp lệ" },
          ]}
        >
          <Input placeholder="Enter your Email" className="login-input" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu" },
            { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
          ]}
        >
          <Input.Password
            placeholder="Enter your Password"
            className="login-input"
          />
        </Form.Item>

        <div className="login-options">
          <Form.Item
            name="remember"
            valuePropName="checked"
            className="remember-checkbox"
          >
            <Checkbox>Remember me</Checkbox>
          </Form.Item>
          <Link href="/reset-password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </div>

        {errors.general && (
          <div className="error-message">
            <p className="error-text">{errors.general}</p>
          </div>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            className="login-button"
          >
            Login
          </Button>
        </Form.Item>
      </Form>

      <div className="login-divider">
        <div className="divider-line"></div>
        <span className="divider-text">Or login with</span>
        <div className="divider-line"></div>
      </div>

      <Button
        onClick={handleGoogleLogin}
        className="google-login-button"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        }
      >
        Login With Google
      </Button>
    </div>
  );
};
