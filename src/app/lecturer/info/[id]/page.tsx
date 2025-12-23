"use client";
import ClassInfo from "@/components/student/ClassInfo";
import { ClassInfo as ClassInfoType, classService } from "@/services/classService";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { Spin } from "antd";
export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: classData, isLoading, error } = useQuery({
    queryKey: queryKeys.classes.detail(resolvedParams.id),
    queryFn: () => classService.getClassById(resolvedParams.id),
    enabled: !!resolvedParams.id,
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
        Class not found.
      </div>
    );
  }
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff'
    }}>
      <ClassInfo classData={classData} />
    </div>
  );
}