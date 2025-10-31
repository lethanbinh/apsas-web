"use client";

import { useState, useEffect, useMemo } from "react";
import MyCoursesGrid from "@/components/classes/MyCoursesGrid";
import { Layout } from "@/components/layout/Layout";
import { ClassInfo, classService } from "@/services/classService";
import { lecturerService } from "@/services/lecturerService";
import { SimpleCourseCardProps } from "@/components/classes/SimpleCourseCard";
import { useAuth } from "@/hooks/useAuth";

function mapApiDataToCardProps(classes: ClassInfo[]): SimpleCourseCardProps[] {
  return classes.map((cls) => ({
    id: cls.id,
    title: cls.courseName || cls.classCode,
    authorName: cls.lecturerName,
    imageUrl: "/classes/class.png",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    href: `/lecturer/info/${cls.id}`,
  }));
}

export default function MyClassesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [allCourses, setAllCourses] = useState<ClassInfo[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        return;
      }

      try {
        setIsLoading(true);

        const lecturers = await lecturerService.getLecturerList();
        const currentUserAccountId = String(user.id);

        const matchingLecturer = lecturers.find(
          (lec) => lec.accountId === currentUserAccountId
        );

        if (!matchingLecturer) {
          console.error("No matching lecturer profile found for account ID.");
          setAllCourses([]);
          return;
        }

        const currentLecturerId = parseInt(matchingLecturer.lecturerId, 10);

        if (isNaN(currentLecturerId)) {
          console.error("Invalid lecturer ID.");
          setAllCourses([]);
          return;
        }

        const { classes } = await classService.getClassList({
          pageNumber: 1,
          pageSize: 1000,
          lecturerId: currentLecturerId,
        });

        setAllCourses(classes);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  const semesterOptions = useMemo(() => {
    const uniqueSemesters = [
      ...new Set(allCourses.map((cls) => cls.semesterName)),
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
    return mapApiDataToCardProps(filtered);
  }, [allCourses, selectedSemester]);

  const handleSemesterChange = (value: string) => {
    setSelectedSemester(value);
  };

  if (isLoading || isAuthLoading) {
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