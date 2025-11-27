"use client";

import { examinerService } from "@/services/examinerService";
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export const useExaminer = () => {
  const { user } = useAuth();
  const [examinerId, setExaminerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findExaminerId = async () => {
      if (user && user.id) {
        try {
          setIsLoading(true);
          const examiners = await examinerService.getExaminerList();
          const currentUserAccountId = String(user.id);

          const matchingExaminer = examiners.find(
            (ex) => ex.accountId === currentUserAccountId
          );

          if (matchingExaminer) {
            setExaminerId(Number(matchingExaminer.examinerId));
          } else {
            setExaminerId(null);
          }
        } catch (error) {
          console.error("Failed to fetch examiner list:", error);
          setExaminerId(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    findExaminerId();
  }, [user]);

  return { examinerId, isLoading };
};

