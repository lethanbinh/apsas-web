"use client";

import ClassInfo from "@/components/student/ClassInfo";
import { ClassInfo as ClassInfoType, classService } from "@/services/classService";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { Spin } from "antd";

export default function ClassDetailPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    const storedClassId = localStorage.getItem("selectedClassId");
    setSelectedClassId(storedClassId);
  }, []);

  const { data: classData, isLoading, error } = useQuery({
    queryKey: queryKeys.classes.detail(selectedClassId!),
    queryFn: () => classService.getClassById(selectedClassId!),
    enabled: !!selectedClassId,
  });

  if (isLoading && !classData) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#ffffff'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        padding: '24px'
      }}>
        Class not found. Please select a class from My Classes.
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff'
    }}>
      <ClassInfo classData={classData} showTotalStudents={false} />
    </div>
  );
}
