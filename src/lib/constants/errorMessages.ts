// Helper function to format error messages in English
export const formatErrorMessage = (errorMsg: string): string => {
  if (!errorMsg) return "Login failed. Please check your credentials and try again.";

  const lowerMsg = errorMsg.toLowerCase().trim();

  // Common error message mappings
  const errorMessages: { [key: string]: string } = {
    "invalid email or password": "Invalid email or password. Please try again.",
    "invalid email": "Invalid email address.",
    "invalid password": "Invalid password.",
    "email or password is incorrect": "Email or password is incorrect. Please try again.",
    "incorrect email or password": "Email or password is incorrect. Please try again.",
    "login failed": "Login failed. Please check your credentials and try again.",
    "unauthorized": "Invalid email or password. Please try again.",
    "forbidden": "You do not have permission to access.",
    "not found": "Account not found.",
    "account not found": "Account not found.",
    "user not found": "User not found.",
    "server error": "Server error. Please try again later.",
    "internal server error": "Server error. Please try again later.",
    "network error": "Network error. Please check your connection.",
    "timeout": "Request timeout. Please try again.",
  };

  // Check for exact match or partial match
  for (const [key, value] of Object.entries(errorMessages)) {
    if (lowerMsg.includes(key)) {
      return value;
    }
  }

  // Return original message if no match found
  return errorMsg;
};

// Default error messages for different scenarios
export const DEFAULT_ERROR_MESSAGES = {
  LOGIN_FAILED: "Login failed. Please check your credentials and try again.",
  GOOGLE_LOGIN_FAILED: "Google login failed. Account not registered or an error occurred.",
  INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
  NO_PERMISSION: "You do not have permission to access.",
  ACCOUNT_NOT_FOUND: "Account not found.",
  SERVER_ERROR: "Server error. Please try again later.",
  GOOGLE_ACCOUNT_NOT_REGISTERED: "Google account not registered or invalid.",
} as const;

