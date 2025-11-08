"use client";

import ClassInfo from "@/components/student/ClassInfo";
import { ClassInfo as ClassInfoType, classService } from "@/services/classService";
import { useEffect, useState } from "react";

export default function ClassDetailPage() {
  const [classData, setClassData] = useState<ClassInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClassData = async () => {
      let storedClassId = localStorage.getItem("selectedClassId");
      
      if (!storedClassId) {
        console.error("No class ID found in localStorage");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("selectedClassId", storedClassId);

      try {
        setIsLoading(true);
        const data = await classService.getClassById(storedClassId);
        setClassData(data);
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
    </div>
  );
}
