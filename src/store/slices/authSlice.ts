/**
 * Redux slice for authentication
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginCredentials, RegisterData } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
// Helper function to decode JWT token
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
      
      // Extract token from response
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
      
      // Save token
      localStorage.setItem('auth_token', token);
      console.log('Token saved to localStorage');
      
      // Decode JWT to get user info
      const decoded = decodeJWT(token);
      console.log('Decoded JWT:', decoded);
      
      if (decoded) {
        // Extract user info from JWT
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
          role: decoded.role === 'HOD' ? 3 : decoded.role === 'Lecturer' ? 1 : decoded.role === 'Student' ? 0 : 2,
        };
        
        console.log('👤 User info from JWT:', userInfo);
        console.log('👤 User ID:', userInfo.id);
        console.log('👤 User role:', userInfo.role);
        
        // Save user ID for profile fetching
        localStorage.setItem('user_id', String(userInfo.id));
        console.log('User ID saved:', userInfo.id);
        
        // Return user object and token
        return { user: userInfo, token };
      }
      
      // Fallback: return token only
      return { user: null, token };
    } catch (error: any) {
      console.error('Login error:', error);
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      localStorage.setItem('auth_token', response.token);
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
      localStorage.removeItem('auth_token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
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
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
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
      // Fetch Profile
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
