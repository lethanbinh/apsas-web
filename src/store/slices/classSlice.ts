import { ClassInfo } from '@/services/classService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface ClassState {
  selectedClass: ClassInfo | null;
}

// Helper để lấy state ban đầu từ localStorage
const getInitialState = (): ClassState => {
  // Chỉ chạy ở client
  if (typeof window === 'undefined') {
    return {
      selectedClass: null,
    };
  }

  const classDataStr = localStorage.getItem('selected_class');
  
  if (classDataStr) {
    try {
      const selectedClass = JSON.parse(classDataStr);
      return {
        selectedClass,
      };
    } catch (error) {
      console.error('Failed to parse class data from localStorage:', error);
    }
  }

  return {
    selectedClass: null,
  };
};

const initialState: ClassState = getInitialState();

const classSlice = createSlice({
  name: 'class',
  initialState,
  reducers: {
    setSelectedClass: (state, action: PayloadAction<ClassInfo>) => {
      state.selectedClass = action.payload;
      // Lưu vào localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('selected_class', JSON.stringify(action.payload));
      }
    },

    clearSelectedClass: (state) => {
      state.selectedClass = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_class');
      }
    },
  },
});

export const { setSelectedClass, clearSelectedClass } = classSlice.actions;
export default classSlice.reducer;