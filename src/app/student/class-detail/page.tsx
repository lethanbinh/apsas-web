"use client";

import ClassInfo from "@/components/student/ClassInfo";
import MemberList from "@/components/student/MemberList";
import React, { useEffect, useState } from "react";
import { ClassInfo as ClassInfoType, classService } from "@/services/classService";

export default function ClassDetailPage() {
  const [classData, setClassData] = useState<ClassInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClassData = async () => {
      // Get classId from localStorage or URL params if available
      let storedClassId = localStorage.getItem("selectedClassId");
      
      // If no classId in localStorage, check if we can get it from somewhere else
      // For now, we'll require it to be set
      if (!storedClassId) {
        console.error("No class ID found in localStorage");
        setIsLoading(false);
        return;
      }

      // Ensure classId is stored in localStorage
      localStorage.setItem("selectedClassId", storedClassId);

      try {
        setIsLoading(true);
        const data = await classService.getClassById(storedClassId);
        setClassData(data);
        // Ensure classId is set after fetching
        localStorage.setItem("selectedClassId", storedClassId);
      } catch (error) {
        console.error("Failed to fetch class data:", error);
        setClassData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassData();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!classData) {
    return <div>Class not found. Please select a class from My Classes.</div>;
  }

  return (
    <div>
      <ClassInfo classData={classData} />
      <MemberList />
    </div>
  );
}
