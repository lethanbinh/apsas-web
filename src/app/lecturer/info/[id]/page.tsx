"use client";

import { Layout } from "@/components/layout/Layout";
import ClassInfo from "@/components/student/ClassInfo";
import ClassRoster from "@/components/student/ClassRoster";
import { ClassInfo as ClassInfoType, classService } from "@/services/classService";
import { useEffect, useState } from "react";

export default function ClassDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [classData, setClassData] = useState<ClassInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!params.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await classService.getClassById(params.id);
        setClassData(data);
      } catch (error) {
        console.error("Failed to fetch class data:", error);
        setClassData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassData();
  }, [params.id]);

  if (isLoading) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  if (!classData) {
    return (
      <Layout>
        <div>Class not found.</div>
      </Layout>
    );
  }

  return (
    <div>
      <ClassInfo classData={classData} />
      <ClassRoster classId={classData.id} />
    </div>
  );
}
