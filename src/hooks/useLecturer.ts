"use client";
import { lecturerService } from "@/services/lecturerService";
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
export const useLecturer = () => {
  const { user } = useAuth();
  const [lecturerId, setLecturerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const findLecturerId = async () => {
      if (user && user.id) {
        try {
          setIsLoading(true);
          const lecturers = await lecturerService.getLecturerList();
          const currentUserAccountId = String(user.id);
          const matchingLecturer = lecturers.find(
            (lec) => lec.accountId === currentUserAccountId
          );
          if (matchingLecturer) {
            setLecturerId(matchingLecturer.lecturerId);
          } else {
            setLecturerId(null);
          }
        } catch (error) {
          console.error("Failed to fetch lecturer list:", error);
          setLecturerId(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    findLecturerId();
  }, [user]);
  return { lecturerId, isLoading: isLoading };
};