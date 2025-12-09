"use client";

import { useAuth } from "@/hooks/useAuth";
import { config } from "@/lib/config";
import { Role } from "@/lib/constants";
import { DEMO_ACCOUNTS } from "@/lib/constants/demoAccounts";
import { formatErrorMessage, DEFAULT_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import { deleteCookie, setCookie } from "@/lib/utils/cookie";
import { removeStorageItem, setStorageItem } from "@/lib/utils/storage";
import { authService } from "@/services/authService";
import { fetchUserProfile, logout } from "@/store/slices/authSlice";
import { AppDispatch } from "@/store/store";
import { LoginCredentials } from "@/types";
import { App, Button, Checkbox, Form, Input, Modal, Select } from "antd";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Logo from "../../../public/logo/Logo";
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
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedDemoAccount, setSelectedDemoAccount] = useState<string | null>(null);

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
        removeStorageItem('auth_token');
        removeStorageItem('user_data');
        removeStorageItem('user_id');
        deleteCookie('auth_token');
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
        0: "/admin/manage-users", // Admin
        1: "/classes/my-classes/lecturer", // Lecturer
        2: "/classes/my-classes/student", // Student
        3: "/hod/semester-plans", // HOD
        4: "/examiner/grading-groups", // Examiner
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

      // Check if there's a redirect parameter from URL
      const redirectParam = searchParams.get("redirect");
      let redirectPath = roleRedirects[userRole] || "/classes/my-classes/student";
      
      // If redirect parameter exists, validate it's allowed for this role
      if (redirectParam) {
        try {
          const decodedRedirect = decodeURIComponent(redirectParam);
          // Define allowed routes for each role (same as middleware)
          const roleRoutes: Record<number, string[]> = {
            0: ["/admin", "/profile"],
            1: ["/lecturer", "/classes/my-classes/lecturer", "/profile"],
            2: ["/student", "/classes/my-classes/student", "/profile"],
            3: ["/hod", "/profile"],
            4: ["/examiner", "/profile"],
          };
          
          const allowedPaths = roleRoutes[userRole] || [];
          // Check if decoded redirect is allowed for this role
          const isAllowed = allowedPaths.some(path => 
            decodedRedirect === path || decodedRedirect.startsWith(path + "/")
          );
          
          // Also check that redirect doesn't contain another role's identifier
          const roleIdentifiers: Record<number, string> = {
            0: "admin", 1: "lecturer", 2: "student", 3: "hod", 4: "examiner",
          };
          const userRoleIdentifier = roleIdentifiers[userRole];
          const pathSegments = decodedRedirect.split("/").filter(Boolean);
          const hasOtherRole = Object.entries(roleIdentifiers).some(([roleNum, identifier]) => {
            const otherRole = Number(roleNum);
            return otherRole !== userRole && (
              decodedRedirect.startsWith(`/${identifier}`) || 
              pathSegments.includes(identifier)
            );
          });
          
          if (isAllowed && !hasOtherRole) {
            redirectPath = decodedRedirect;
          }
        } catch (e) {
          console.error("Failed to decode redirect parameter:", e);
        }
      }

      console.log("Redirecting to:", redirectPath);
      console.log("User role is:", userRole, "which maps to:", redirectPath);

      // Use window.location.href for a full page reload to ensure clean state
      window.location.href = redirectPath;
      onSuccess?.();
    } catch (error: any) {
      if (typeof window !== 'undefined') {
        removeStorageItem('auth_token');
        removeStorageItem('user_data');
        removeStorageItem('user_id');
        deleteCookie('auth_token');
      }

      dispatch(logout());

      // Extract error message from API response
      let errorMessage: string = DEFAULT_ERROR_MESSAGES.LOGIN_FAILED;

      // When Redux thunk rejects with rejectWithValue and .unwrap() is called,
      // it throws the payload directly. So we need to check multiple possible structures:

      // 1. Error is a string (direct payload from rejectWithValue)
      if (typeof error === 'string') {
        errorMessage = formatErrorMessage(error);
      }
      // 2. Error is an object - check common properties
      else if (error && typeof error === 'object') {
        // Check for Redux SerializedError payload (when rejectWithValue is used)
        if (error.payload !== undefined) {
          if (typeof error.payload === 'string') {
            errorMessage = formatErrorMessage(error.payload);
          } else if (error.payload?.message) {
            errorMessage = formatErrorMessage(error.payload.message);
          }
        }
        // Check for Axios error response
        else if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;

          // Handle specific status codes first
          if (status === 401) {
            errorMessage = DEFAULT_ERROR_MESSAGES.INVALID_CREDENTIALS;
          } else if (status === 403) {
            errorMessage = DEFAULT_ERROR_MESSAGES.NO_PERMISSION;
          } else if (status === 404) {
            errorMessage = DEFAULT_ERROR_MESSAGES.ACCOUNT_NOT_FOUND;
          } else if (status >= 500) {
            errorMessage = DEFAULT_ERROR_MESSAGES.SERVER_ERROR;
          }

          // Check for errorMessages array (common API format)
          if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
            if (errorData.errorMessages && Array.isArray(errorData.errorMessages) && errorData.errorMessages.length > 0) {
              errorMessage = formatErrorMessage(errorData.errorMessages[0]);
            }
            // Check for message string
            else if (errorData.message) {
              errorMessage = formatErrorMessage(errorData.message);
            }
            // Check for error string
            else if (errorData.error) {
              errorMessage = formatErrorMessage(errorData.error);
            }
          }
        }
        // Check for error message property
        else if (error.message) {
          errorMessage = formatErrorMessage(error.message);
        }
        // Check if error itself is the message (sometimes Redux throws the payload directly as error)
        else if (error.toString && error.toString() !== '[object Object]') {
          const errorStr = error.toString();
          if (errorStr && errorStr !== '[object Object]') {
            errorMessage = formatErrorMessage(errorStr);
          }
        }
      }

      // Ensure toast message is displayed
      setErrors({ general: errorMessage });
      message.error(errorMessage, 4); // Show for 4 seconds
      onError?.(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };


  const handleLogoClick = () => {
    setIsDemoModalOpen(true);
    setSelectedDemoAccount(null);
  };

  const handleDemoModalClose = () => {
    setIsDemoModalOpen(false);
    setSelectedDemoAccount(null);
  };

  const handleDemoAccountSelect = (accountCode: string) => {
    setSelectedDemoAccount(accountCode);
    const account = DEMO_ACCOUNTS.find((acc) => acc.accountCode === accountCode);
    if (account) {
      form.setFieldsValue({
        email: account.email,
        password: account.password,
      });
      setIsDemoModalOpen(false);
      setSelectedDemoAccount(null);
      // Auto submit after a short delay to ensure form is updated
      setTimeout(() => {
        form.submit();
      }, 100);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setErrors({});

      if (typeof window !== 'undefined') {
        removeStorageItem('auth_token');
        removeStorageItem('user_data');
        removeStorageItem('user_id');
        deleteCookie('auth_token');
      }
      dispatch(logout());

      const result = await signInWithPopup(auth, provider);
      console.log("result:", result);

      if (!result || !result.user) {
        throw new Error(
          "Google authentication failed: No user information received"
        );
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleIdToken =
        credential?.idToken ||
        (result as any)?._tokenResponse?.oauthIdToken ||
        null;

      if (!googleIdToken) {
        throw new Error("Google authentication failed: No Google ID token received");
      }

      console.log("Google ID Token:", googleIdToken);

      console.log("Sending ID Token to backend:", googleIdToken);
      const response = await authService.googleLogin({ idToken: googleIdToken });
      console.log("Backend response for Google Login:", response);

      if (!response || !response.result || !response.result.token) {
        throw new Error("Google login failed: Invalid response from server");
      }

      setStorageItem("auth_token", response.result.token);
      setCookie("auth_token", response.result.token); // Session cookie

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
        0: "/admin/manage-users", // Admin
        1: "/classes/my-classes/lecturer", // Lecturer
        2: "/classes/my-classes/student", // Student
        3: "/hod/semester-plans", // HOD
      };

      const userRole = mapRoleToNumber(decoded?.role || 2);
      const rawUserId =
        decoded?.nameid ||
        decoded?.sub ||
        decoded?.userId ||
        decoded?.id ||
        result.user?.uid;
      const userIdNumber = rawUserId ? parseInt(rawUserId, 10) || rawUserId : null;

      const userInfo = {
        id: typeof userIdNumber === "number" ? userIdNumber : 0,
        accountCode: decoded?.accountCode || "",
        username: decoded?.unique_name || decoded?.username || "",
        email: decoded?.email || result.user?.email || "",
        phoneNumber: decoded?.phoneNumber || "",
        fullName: decoded?.fullName || result.user?.displayName || "",
        avatar: decoded?.avatar || result.user?.photoURL || "",
        address: decoded?.address || "",
        gender: typeof decoded?.gender === "number" ? decoded.gender : 0,
        dateOfBirth: decoded?.dateOfBirth || "",
        role: userRole,
      };

      if (typeof window !== "undefined") {
        if (rawUserId) {
          setStorageItem("user_id", String(rawUserId));
        }
        setStorageItem("user_data", JSON.stringify(userInfo));
      }

      try {
        await dispatch(fetchUserProfile()).unwrap();
      } catch (profileError: any) {
        console.warn("Could not refresh profile after Google login:", profileError);
      }
      console.log(
        "Decoded role from JWT:",
        decoded?.role,
        "Mapped to:",
        userRole
      );

      // Check if there's a redirect parameter from URL
      const redirectParam = searchParams.get("redirect");
      let redirectPath = roleRedirects[userRole] || "/classes/my-classes/student";
      
      // If redirect parameter exists, validate it's allowed for this role
      if (redirectParam) {
        try {
          const decodedRedirect = decodeURIComponent(redirectParam);
          // Define allowed routes for each role (same as middleware)
          const roleRoutes: Record<number, string[]> = {
            0: ["/admin", "/profile"],
            1: ["/lecturer", "/classes/my-classes/lecturer", "/profile"],
            2: ["/student", "/classes/my-classes/student", "/profile"],
            3: ["/hod", "/profile"],
            4: ["/examiner", "/profile"],
          };
          
          const allowedPaths = roleRoutes[userRole] || [];
          // Check if decoded redirect is allowed for this role
          const isAllowed = allowedPaths.some(path => 
            decodedRedirect === path || decodedRedirect.startsWith(path + "/")
          );
          
          // Also check that redirect doesn't contain another role's identifier
          const roleIdentifiers: Record<number, string> = {
            0: "admin", 1: "lecturer", 2: "student", 3: "hod", 4: "examiner",
          };
          const userRoleIdentifier = roleIdentifiers[userRole];
          const pathSegments = decodedRedirect.split("/").filter(Boolean);
          const hasOtherRole = Object.entries(roleIdentifiers).some(([roleNum, identifier]) => {
            const otherRole = Number(roleNum);
            return otherRole !== userRole && (
              decodedRedirect.startsWith(`/${identifier}`) || 
              pathSegments.includes(identifier)
            );
          });
          
          if (isAllowed && !hasOtherRole) {
            redirectPath = decodedRedirect;
          }
        } catch (e) {
          console.error("Failed to decode redirect parameter:", e);
        }
      }

      console.log("Redirecting to:", redirectPath);
      // Use window.location.href for a full page reload to ensure clean state
      window.location.href = redirectPath;
      onSuccess?.();
    } catch (error: any) {
      console.error("Google login failed:", error);

      if (typeof window !== 'undefined') {
        removeStorageItem('auth_token');
        removeStorageItem('user_data');
        removeStorageItem('user_id');
        deleteCookie('auth_token');
      }

      dispatch(logout());

      // Extract error message from API response
      let errorMessage: string = DEFAULT_ERROR_MESSAGES.GOOGLE_LOGIN_FAILED;

      // When Redux thunk rejects with rejectWithValue and .unwrap() is called,
      // it throws the payload directly. So we need to check multiple possible structures:

      // 1. Error is a string (direct payload from rejectWithValue)
      if (typeof error === 'string') {
        errorMessage = formatErrorMessage(error);
      }
      // 2. Error is an object - check common properties
      else if (error && typeof error === 'object') {
        // Check for Redux SerializedError payload (when rejectWithValue is used)
        if (error.payload !== undefined) {
          if (typeof error.payload === 'string') {
            errorMessage = formatErrorMessage(error.payload);
          } else if (error.payload?.message) {
            errorMessage = formatErrorMessage(error.payload.message);
          }
        }
        // Check for Axios error response
        else if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;

          // Handle specific status codes first
          if (status === 401) {
            errorMessage = DEFAULT_ERROR_MESSAGES.GOOGLE_ACCOUNT_NOT_REGISTERED;
          } else if (status === 403) {
            errorMessage = DEFAULT_ERROR_MESSAGES.NO_PERMISSION;
          } else if (status === 404) {
            errorMessage = DEFAULT_ERROR_MESSAGES.ACCOUNT_NOT_FOUND;
          } else if (status >= 500) {
            errorMessage = DEFAULT_ERROR_MESSAGES.SERVER_ERROR;
          }

          // Check for errorMessages array (common API format)
          if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
            if (errorData.errorMessages && Array.isArray(errorData.errorMessages) && errorData.errorMessages.length > 0) {
              errorMessage = formatErrorMessage(errorData.errorMessages[0]);
            }
            // Check for message string
            else if (errorData.message) {
              errorMessage = formatErrorMessage(errorData.message);
            }
            // Check for error string
            else if (errorData.error) {
              errorMessage = formatErrorMessage(errorData.error);
            }
          }
        }
        // Check for error message property
        else if (error.message) {
          errorMessage = formatErrorMessage(error.message);
        }
        // Check if error itself is the message (sometimes Redux throws the payload directly as error)
        else if (error.toString && error.toString() !== '[object Object]') {
          const errorStr = error.toString();
          if (errorStr && errorStr !== '[object Object]') {
            errorMessage = formatErrorMessage(errorStr);
          }
        }
      }

      // Ensure toast message is displayed
      setErrors({ general: errorMessage });
      message.error(errorMessage, 4); // Show for 4 seconds
      onError?.(errorMessage);
    }
  };

  return (
    <div className="login-form-container">
      {/* Logo */}
      <div className="login-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
        <Logo />
      </div>

      <div className="login-form-header">
        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Please login to continue to your account.</p>
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
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Invalid email address" },
          ]}
        >
          <Input placeholder="Enter your Email" className="login-input" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please enter your password" },
            { min: 6, message: "Password must be at least 6 characters" },
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
            <Checkbox>Keep me logged in</Checkbox>
          </Form.Item>
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
            loading={isLoggingIn || isLoading}
            className="login-button"
          >
            Sign in
          </Button>
        </Form.Item>
      </Form>

      <div className="login-divider">
        <div className="divider-line"></div>
        <span className="divider-text">or</span>
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
        Sign in with Google
      </Button>

      <div className="login-footer">
        <p>Forgot your password? <Link href="/reset-password" className="register-link">Reset it</Link></p>
      </div>

      {/* Demo Account Modal */}
      <Modal
        title="Select Demo Account"
        open={isDemoModalOpen}
        onCancel={handleDemoModalClose}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="Select a demo account to login"
            style={{ width: "100%" }}
            size="large"
            value={selectedDemoAccount}
            onChange={handleDemoAccountSelect}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={DEMO_ACCOUNTS.map((account) => ({
              label: `${account.accountCode} - ${account.email} (${account.role})`,
              value: account.accountCode,
            }))}
          />
        </div>
        <div style={{ marginTop: 16, fontSize: "12px", color: "#666" }}>
          <p>Select an account from the list to login automatically</p>
        </div>
      </Modal>
    </div>
  );
};
