"use client";

import { useState, useEffect, useMemo } from "react";
import MyCoursesGrid from "@/components/classes/MyCoursesGrid";
import { Layout } from "@/components/layout/Layout";
import { classService, StudentInClass } from "@/services/classService";
import { SimpleCourseCardProps } from "@/components/classes/SimpleCourseCard";
import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";

function mapStudentInClassToCardProps(
  studentClasses: StudentInClass[]
): SimpleCourseCardProps[] {
  return studentClasses.map((studentClass) => ({
    id: studentClass.classId,
    title: studentClass.courseName || studentClass.classCode,
    authorName: studentClass.lecturerName || "Unknown",
    imageUrl: "/classes/class.png",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    href: `/student/class-detail`,
  }));
}

export default function MyClassesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { studentId, isLoading: isStudentLoading } = useStudent();
  const [isLoading, setIsLoading] = useState(true);
  const [allCourses, setAllCourses] = useState<StudentInClass[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || !studentId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const studentClasses = await classService.getClassesByStudentId(
          studentId
        );
        setAllCourses(studentClasses);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
        setAllCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [user, studentId]);

  const semesterOptions = useMemo(() => {
    const uniqueSemesters = [
      ...new Set(allCourses.map((cls) => cls.semesterName).filter(Boolean)),
    ];
    const options = uniqueSemesters.map((semester) => ({
      label: semester,
      value: semester,
    }));
    return [{ label: "All Semesters", value: "all" }, ...options];
  }, [allCourses]);

  const filteredMappedCourses = useMemo(() => {
    const filtered =
      selectedSemester === "all"
        ? allCourses
        : allCourses.filter(
            (cls) => cls.semesterName === selectedSemester
          );
    return mapStudentInClassToCardProps(filtered);
  }, [allCourses, selectedSemester]);

  const handleSemesterChange = (value: string) => {
    setSelectedSemester(value);
  };

  if (isLoading || isAuthLoading || isStudentLoading) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  const userName = user?.fullName || user?.username || "User";

  return (
    <Layout>
      <MyCoursesGrid
        userName={userName}
        courses={filteredMappedCourses}
        semesterOptions={semesterOptions}
        selectedSemester={selectedSemester}
        onSemesterChange={handleSemesterChange}
      />
    </Layout>
  );
}
