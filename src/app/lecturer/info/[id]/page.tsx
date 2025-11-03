"use client";

import ClassInfo from "@/components/student/ClassInfo";
import { ClassInfo as ClassInfoType, classService } from "@/services/classService";
import { useEffect, useState } from "react";

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = params as unknown as { id: string };
  const [classData, setClassData] = useState<ClassInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!resolvedParams.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await classService.getClassById(resolvedParams.id);
        setClassData(data);
      } catch (error) {
        console.error("Failed to fetch class data:", error);
        setClassData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassData();
  }, [resolvedParams.id]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!classData) {
    return <div>Class not found.</div>;
  }

  return (
    <div>
      <ClassInfo classData={classData} />
    </div>
  );
}
