"use client";

import { studentManagementService } from "@/services/studentManagementService";
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

// Helper functions for sessionStorage
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
};

export const useStudent = () => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findStudentId = async () => {
      if (user && user.id) {
        const currentUserAccountId = String(user.id);
        const cacheKey = `studentId_${currentUserAccountId}`;
        
        // Try to get from cache first
        const cachedStudentId = getStorageItem(cacheKey);
        if (cachedStudentId) {
          const parsedId = parseInt(cachedStudentId, 10);
          if (!isNaN(parsedId)) {
            setStudentId(parsedId);
            setIsLoading(false);
            return; // Use cached value, skip API call
          }
        }

        // If not in cache, fetch from API
        try {
          setIsLoading(true);
          const students = await studentManagementService.getStudentList();
          
          const matchingStudent = students.find(
            (stu) => stu.accountId === currentUserAccountId
          );

          if (matchingStudent) {
            const foundStudentId = parseInt(matchingStudent.studentId, 10);
            setStudentId(foundStudentId);
            // Cache the result
            setStorageItem(cacheKey, String(foundStudentId));
          } else {
            setStudentId(null);
            // Cache null result to avoid repeated API calls
            setStorageItem(cacheKey, '');
          }
        } catch (error) {
          console.error("Failed to fetch student list:", error);
          setStudentId(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    findStudentId();
  }, [user]);

  return { studentId, isLoading };
};

