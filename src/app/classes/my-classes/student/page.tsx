"use client";

import { useState, useEffect, useMemo } from "react";
import MyCoursesGrid from "@/components/classes/MyCoursesGrid";
import { Layout } from "@/components/layout/Layout";
import { classService, StudentInClass } from "@/services/classService";
import { SimpleCourseCardProps } from "@/components/classes/SimpleCourseCard";
import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { semesterService, Semester } from "@/services/semesterService";

function mapStudentInClassToCardProps(
  studentClasses: StudentInClass[]
): SimpleCourseCardProps[] {
  return studentClasses.map((studentClass) => ({
    id: studentClass.classId,
    title: studentClass.classCode ? `${studentClass.classCode} - ${studentClass.courseName || ''}` : (studentClass.courseName || studentClass.classCode),
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
  const [currentSemesterCode, setCurrentSemesterCode] = useState<string | null>(null);
  const [allSemesters, setAllSemesters] = useState<Semester[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch all semesters for sorting
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const semesters = await semesterService.getSemesters({
          pageNumber: 1,
          pageSize: 1000,
        });
        setAllSemesters(semesters);
        
        const now = new Date();
        const activeSemester = semesters.find((sem) => {
          const startDate = new Date(sem.startDate);
          const endDate = new Date(sem.endDate);
          return now >= startDate && now <= endDate;
        });
        if (activeSemester) {
          setCurrentSemesterCode(activeSemester.semesterCode);
        }
      } catch (error) {
        console.error("Failed to fetch semesters:", error);
      }
    };
    fetchSemesters();
  }, []);

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

  // Set default semester to current active semester (only once on initial load)
  useEffect(() => {
    if (isInitialLoad && currentSemesterCode && allCourses.length > 0) {
      // Check if current semester exists in the courses
      // Try matching by semesterName, semesterCode
      const hasCurrentSemester = allCourses.some(
        (cls) => cls.semesterName === currentSemesterCode || 
                 cls.semesterCode === currentSemesterCode ||
                 cls.semesterName?.includes(currentSemesterCode) ||
                 cls.semesterName?.toLowerCase().includes(currentSemesterCode.toLowerCase())
      );
      if (hasCurrentSemester) {
        // Find the matching semester name from courses
        const matchingCourse = allCourses.find(
          (cls) => cls.semesterName === currentSemesterCode || 
                   cls.semesterCode === currentSemesterCode ||
                   cls.semesterName?.includes(currentSemesterCode) ||
                   cls.semesterName?.toLowerCase().includes(currentSemesterCode.toLowerCase())
        );
        if (matchingCourse?.semesterName) {
          setSelectedSemester(matchingCourse.semesterName);
        } else if (matchingCourse?.semesterCode) {
          setSelectedSemester(matchingCourse.semesterCode);
        }
      }
      setIsInitialLoad(false);
    }
  }, [currentSemesterCode, allCourses, isInitialLoad]);

  const semesterOptions = useMemo(() => {
    const uniqueSemesterNames = [
      ...new Set(allCourses.map((cls) => cls.semesterName).filter(Boolean)),
    ];
    
    // Create a map of semesterName to Semester object for sorting
    const semesterMap = new Map<string, Semester>();
    
    // Match semesterName with Semester objects using both semesterName and semesterCode
    uniqueSemesterNames.forEach((name) => {
      // First, try to find match using semesterCode from courses
      const courseWithName = allCourses.find((cls) => cls.semesterName === name);
      if (courseWithName?.semesterCode) {
        const matchByCode = allSemesters.find((sem) => sem.semesterCode === courseWithName.semesterCode);
        if (matchByCode) {
          semesterMap.set(name, matchByCode);
          return;
        }
      }
      
      // Try exact match with semesterCode
      const exactMatch = allSemesters.find((sem) => sem.semesterCode === name);
      if (exactMatch) {
        semesterMap.set(name, exactMatch);
        return;
      }
      
      // Try partial match (semesterName contains semesterCode or vice versa)
      const partialMatch = allSemesters.find((sem) => 
        name.includes(sem.semesterCode) || 
        sem.semesterCode.includes(name) ||
        name.toLowerCase().includes(sem.semesterCode.toLowerCase()) ||
        sem.semesterCode.toLowerCase().includes(name.toLowerCase())
      );
      if (partialMatch) {
        semesterMap.set(name, partialMatch);
      }
    });
    
    // Sort semesters by startDate (newest first)
    const sortedSemesters = uniqueSemesterNames.sort((a, b) => {
      const semA = semesterMap.get(a);
      const semB = semesterMap.get(b);
      
      if (semA && semB) {
        const dateA = new Date(semA.startDate);
        const dateB = new Date(semB.startDate);
        return dateB.getTime() - dateA.getTime(); // Newest first
      }
      if (semA) return -1; // A has date, B doesn't, A comes first
      if (semB) return 1; // B has date, A doesn't, B comes first
      // Both don't have dates, sort alphabetically (reverse for newest first)
      return b.localeCompare(a);
    });
    
    const options = sortedSemesters.map((semester) => ({
      label: semester,
      value: semester,
    }));
    return [{ label: "All Semesters", value: "all" }, ...options];
  }, [allCourses, allSemesters]);

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
    // Mark that user has manually changed the selection
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
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
