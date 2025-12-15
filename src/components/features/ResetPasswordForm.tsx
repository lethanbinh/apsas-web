"use client";

import React, { useState } from "react";
import { Form, Input, Button, App } from "antd";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/authService";
import { accountService } from "@/services/accountService";
import {
  ForgotPasswordRequest,
  VerifyOtpRequest,
  ResetPasswordRequest,
} from "@/types";
import Logo from "../../../public/logo/Logo";

type ResetPasswordStep = "email" | "otp" | "newPassword";

const ResetPasswordFormContent: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState<ResetPasswordStep>("email");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");

  const handleForgotPassword = async (values: ForgotPasswordRequest) => {
    try {
      setIsLoading(true);
      setErrors({});

      const emailExists = await accountService.checkEmailExists(values.email);
      if (!emailExists) {
        const errorMessage = "Email does not exist in the system. Please check your email address.";
        setErrors({ general: errorMessage });
        message.error({
          content: errorMessage,
          duration: 5,
        });
        setIsLoading(false);
        return;
      }

      setEmail(values.email);
      await authService.forgotPassword(values);
      message.success("OTP sent to your email!");
      setCurrentStep("otp");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send OTP";
      setErrors({ general: errorMessage });
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (values: VerifyOtpRequest) => {
    try {
      setIsLoading(true);
      setErrors({});
      await authService.verifyOtp({ email, otp: values.otp });
      message.success("OTP verified successfully!");
      setOtp(values.otp);
      setCurrentStep("newPassword");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to verify OTP";
      setErrors({ general: errorMessage });
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (values: ResetPasswordRequest) => {
    try {
      setIsLoading(true);
      setErrors({});

      await authService.resetPassword({
        email,
        otp,
        newPassword: values.newPassword,
      });
      message.success("Password reset successfully!");
      router.push("/login");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to reset password";
      setErrors({ general: errorMessage });
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleForgotPassword}
      autoComplete="off"
      className="login-form"
    >
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: "Please enter your email" },
          { type: "email", message: "Please enter a valid email" },
        ]}
      >
        <Input
          placeholder="Enter your Email"
          className="reset-password-input"
        />
      </Form.Item>
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
          Send OTP
        </Button>
      </Form.Item>
    </Form>
  );

  const renderOtpStep = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleVerifyOtp}
      autoComplete="off"
      className="login-form"
    >
      <Form.Item
        name="otp"
        label="Type OTP"
        rules={[
          { required: true, message: "Please enter OTP" },
          { len: 6, message: "OTP must be 6 digits" },
        ]}
      >
        <Input
          placeholder="Enter OTP"
          className="reset-password-input"
          maxLength={6}
        />
      </Form.Item>
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
          Verify OTP
        </Button>
      </Form.Item>
    </Form>
  );

  const renderNewPasswordStep = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleResetPassword}
      autoComplete="off"
      className="login-form"
    >
      <Form.Item
        name="newPassword"
        label="New password"
        rules={[
          { required: true, message: "Please enter new password" },
          { min: 6, message: "Password must be at least 6 characters" },
        ]}
      >
        <Input.Password
          placeholder="Enter your Password"
          className="reset-password-input"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="Retype Password"
        dependencies={["newPassword"]}
        rules={[
          { required: true, message: "Please confirm your password" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("newPassword") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("Passwords do not match"));
            },
          }),
        ]}
      >
        <Input.Password
          placeholder="Retype your Password"
          className="login-input"
        />
      </Form.Item>

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
          Reset Password
        </Button>
      </Form.Item>
    </Form>
  );

  const handleGoogleLogin = () => {

    console.log("Google login clicked");
  };

  const getTitle = () => {
    switch (currentStep) {
      case "email":
        return "Reset password";
      case "otp":
        return "Verify OTP";
      case "newPassword":
        return "Set New Password";
      default:
        return "Reset password";
    }
  };

  return (
    <div className="login-form-container">
      <div className="login-logo">
        <Logo />
      </div>

      <div className="reset-password-form-header">
        <h1 className="reset-password-title">{getTitle()}</h1>
        {currentStep === "email" && (
          <p className="login-subtitle">Please enter your email to reset your password.</p>
        )}
        {currentStep === "otp" && (
          <p className="login-subtitle">Please enter the OTP sent to your email.</p>
        )}
        {currentStep === "newPassword" && (
          <p className="login-subtitle">Please enter your new password.</p>
        )}
      </div>

      {currentStep === "email" && renderEmailStep()}
      {currentStep === "otp" && renderOtpStep()}
      {currentStep === "newPassword" && renderNewPasswordStep()}

      <div className="login-footer">
        <p><Link href="/login" className="register-link">Back to Sign in</Link></p>
      </div>
    </div>
  );
};

const ResetPasswordForm: React.FC = () => <ResetPasswordFormContent />;

export default ResetPasswordForm;
