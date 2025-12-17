

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginCredentials, RegisterData } from '@/types';
import { authService } from '@/services/authService';
import { setCookie, deleteCookie } from '@/lib/utils/cookie';
import { setStorageItem, getStorageItem, removeStorageItem } from '@/lib/utils/storage';
import { clearSessionTimeout } from '@/lib/utils/sessionTimeout';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}



const getInitialState = (): AuthState => {

  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };
  }


  const token = getStorageItem('auth_token');
  const userDataStr = getStorageItem('user_data');

  if (token && userDataStr) {
    try {
      const user = JSON.parse(userDataStr);
      return {
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    } catch (error) {
      console.error('Failed to parse user data from sessionStorage:', error);
    }
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
};

const initialState: AuthState = getInitialState();



const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

export const loginUser = createAsyncThunk(
  'Auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      console.log('Login response:', response);


      let token;

      if (response.result) {
        token = response.result.token;
        console.log('Extracted token from result wrapper');
      } else if (response.token) {
        token = response.token;
        console.log('Extracted token from direct format');
      }

      console.log('Token:', token);

      if (!token) {
        throw new Error('No token in response');
      }


      if (typeof window !== 'undefined') {
        setStorageItem('auth_token', token);
        setCookie('auth_token', token);
      }
      console.log('Token saved to sessionStorage and session cookie');


      const decoded = decodeJWT(token);
      console.log('Decoded JWT:', decoded);

      if (decoded) {

        const userId = decoded.nameid || decoded.sub;
        const userInfo = {
          id: parseInt(userId),
          email: decoded.email || '',
          username: decoded.unique_name || '',
          fullName: decoded.fullName || '',
          accountCode: decoded.accountCode || '',
          phoneNumber: '',
          address: '',
          gender: 0,
          dateOfBirth: '',
          role: decoded.role === 'ADMIN' ? 0
            : decoded.role === 'Admin' ? 0
            : decoded.role === 'STUDENT' ? 2
            : decoded.role === 'Student' ? 2
            : decoded.role === 'LECTURER' ? 1
            : decoded.role === 'Lecturer' ? 1
            : decoded.role === 'HOD' ? 3
            : decoded.role === 'hod' ? 3
            : decoded.role === 'EXAMINER' ? 4
            : decoded.role === 'Examiner' ? 4
            : decoded.role === 'examiner' ? 4
            : 2,
        };

        console.log('👤 User info from JWT:', userInfo);
        console.log('👤 User ID:', userInfo.id);
        console.log('👤 User role:', userInfo.role);


        if (typeof window !== 'undefined') {
          setStorageItem('user_id', String(userInfo.id));
        }
        console.log('User ID saved:', userInfo.id);


        return { user: userInfo, token };
      }


      return { user: null, token };
    } catch (error: any) {

      let errorMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.';

      if (error?.response) {
        const status = error.response.status;
        const errorData = error.response.data;


        if (status === 401) {

          errorMessage = 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';


          if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
            if (errorData.errorMessages && Array.isArray(errorData.errorMessages) && errorData.errorMessages.length > 0) {
              const apiMessage = errorData.errorMessages[0];

              if (apiMessage && !/^[a-zA-Z\s]+$/.test(apiMessage)) {
                errorMessage = apiMessage;
              }
            }
          }
        } else if (status === 403) {
          errorMessage = 'Bạn không có quyền truy cập.';
        } else if (status === 404) {
          errorMessage = 'Không tìm thấy tài khoản.';
        } else if (status >= 500) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        } else {

          if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
            if (errorData.errorMessages && Array.isArray(errorData.errorMessages) && errorData.errorMessages.length > 0) {
              errorMessage = errorData.errorMessages[0];
            }
            else if (errorData.message) {
              errorMessage = errorData.message;
            }
            else if (errorData.error) {
              errorMessage = errorData.error;
            }
          }
        }
      }

      else if (error?.message) {
        errorMessage = error.message;
      }


      return rejectWithValue(errorMessage);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      if (typeof window !== 'undefined') {
        setStorageItem('auth_token', response.token);
        setCookie('auth_token', response.token);
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getProfile();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      if (typeof window !== 'undefined') {
        clearSessionTimeout();
        removeStorageItem('auth_token');
        removeStorageItem('user_data');
        removeStorageItem('user_id');
        deleteCookie('auth_token');
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;


        if (typeof window !== 'undefined') {
          setStorageItem('auth_token', action.payload.token);
          setStorageItem('user_data', JSON.stringify(action.payload.user));
          setCookie('auth_token', action.payload.token);
          console.log('✅ User data saved to sessionStorage and session cookie in loginUser.fulfilled');
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;

        if (typeof window !== 'undefined') {
          removeStorageItem('auth_token');
          removeStorageItem('user_data');
          removeStorageItem('user_id');
          deleteCookie('auth_token');
        }
      })

      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        console.log('User profile fetched successfully:', action.payload);
        console.log('User role:', action.payload.role);
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
