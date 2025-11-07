"use client";

import { studentManagementService } from "@/services/studentManagementService";
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export const useStudent = () => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findStudentId = async () => {
      if (user && user.id) {
        try {
          setIsLoading(true);
          const students = await studentManagementService.getStudentList();
          const currentUserAccountId = String(user.id);

          const matchingStudent = students.find(
            (stu) => stu.accountId === currentUserAccountId
          );

          if (matchingStudent) {
            setStudentId(parseInt(matchingStudent.studentId, 10));
          } else {
            setStudentId(null);
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

