"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import MyCoursesGrid from "@/components/classes/MyCoursesGrid";
import { Layout } from "@/components/layout/Layout";
import { classService, StudentInClass } from "@/services/classService";
import { SimpleCourseCardProps } from "@/components/classes/SimpleCourseCard";
import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { semesterService, Semester } from "@/services/semesterService";
import { queryKeys } from "@/lib/react-query";
import { Spin } from "antd";

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
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [currentSemesterCode, setCurrentSemesterCode] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);


  const { data: allSemesters = [], isLoading: isLoadingSemesters } = useQuery({
    queryKey: queryKeys.semesters.list(),
    queryFn: async () => {
      const semesters = await semesterService.getSemesters({
        pageNumber: 1,
        pageSize: 1000,
      });


      const now = new Date();
      const activeSemester = semesters.find((sem) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
        return now >= startDate && now <= endDate;
      });
      if (activeSemester) {
        setCurrentSemesterCode(activeSemester.semesterCode);
      } else {

        setCurrentSemesterCode(null);
      }

      return semesters;
    },
  });


  const { data: allCourses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: queryKeys.studentClasses.byStudentId(studentId!),
    queryFn: () => classService.getClassesByStudentId(studentId!),
    enabled: !!user && !!studentId,
  });

  const isLoading = isLoadingSemesters || isLoadingClasses;


  useEffect(() => {
    if (isInitialLoad && allSemesters.length > 0 && allCourses.length > 0) {
      const uniqueSemesterNames = [
        ...new Set(allCourses.map((cls) => cls.semesterName).filter(Boolean)),
      ];

      if (uniqueSemesterNames.length === 0) {
        setIsInitialLoad(false);
        return;
      }


      const semesterMap = new Map<string, Semester>();
      uniqueSemesterNames.forEach((name) => {
        const courseWithName = allCourses.find((cls) => cls.semesterName === name);
        if (courseWithName?.semesterCode) {
          const matchByCode = allSemesters.find((sem) => sem.semesterCode === courseWithName.semesterCode);
          if (matchByCode) {
            semesterMap.set(name, matchByCode);
          }
        }
      });



      let activeSemesterCode = currentSemesterCode;
      if (!activeSemesterCode) {
        const now = new Date();
        const activeSemester = allSemesters.find((sem) => {
          const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
          const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
          return now >= startDate && now <= endDate;
        });
        if (activeSemester) {
          activeSemesterCode = activeSemester.semesterCode;
        }
      }

      if (activeSemesterCode) {

        const exactMatchByCode = allCourses.find(
          (cls) => cls.semesterCode === activeSemesterCode
        );
        if (exactMatchByCode?.semesterName) {
          setSelectedSemester(exactMatchByCode.semesterName);
          setIsInitialLoad(false);
          return;
        }


        const exactMatchByName = allCourses.find(
          (cls) => cls.semesterName === activeSemesterCode
        );
        if (exactMatchByName?.semesterName) {
          setSelectedSemester(exactMatchByName.semesterName);
          setIsInitialLoad(false);
          return;
        }


        const partialMatch = allCourses.find(
          (cls) => cls.semesterName?.includes(activeSemesterCode) ||
                   cls.semesterName?.toLowerCase().includes(activeSemesterCode.toLowerCase()) ||
                   cls.semesterCode?.includes(activeSemesterCode)
        );
        if (partialMatch?.semesterName) {
          setSelectedSemester(partialMatch.semesterName);
          setIsInitialLoad(false);
          return;
        }
      }



      const sortedSemesters = uniqueSemesterNames.sort((a, b) => {
        const semA = semesterMap.get(a);
        const semB = semesterMap.get(b);
        if (semA && semB) {
          const dateA = new Date(semA.startDate.endsWith("Z") ? semA.startDate : semA.startDate + "Z");
          const dateB = new Date(semB.startDate.endsWith("Z") ? semB.startDate : semB.startDate + "Z");
          return dateB.getTime() - dateA.getTime();
        }
        return 0;
      });

      if (sortedSemesters.length > 0) {
        setSelectedSemester(sortedSemesters[0]);
      }

      setIsInitialLoad(false);
    }
  }, [currentSemesterCode, allCourses, allSemesters, isInitialLoad]);

  const semesterOptions = useMemo(() => {
    const uniqueSemesterNames = [
      ...new Set(allCourses.map((cls) => cls.semesterName).filter(Boolean)),
    ];


    const semesterMap = new Map<string, Semester>();


    uniqueSemesterNames.forEach((name) => {

      const courseWithName = allCourses.find((cls) => cls.semesterName === name);
      if (courseWithName?.semesterCode) {
        const matchByCode = allSemesters.find((sem) => sem.semesterCode === courseWithName.semesterCode);
        if (matchByCode) {
          semesterMap.set(name, matchByCode);
          return;
        }
      }


      const exactMatch = allSemesters.find((sem) => sem.semesterCode === name);
      if (exactMatch) {
        semesterMap.set(name, exactMatch);
        return;
      }


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


    const sortedSemesters = uniqueSemesterNames.sort((a, b) => {
      const semA = semesterMap.get(a);
      const semB = semesterMap.get(b);

      if (semA && semB) {
        const dateA = new Date(semA.startDate);
        const dateB = new Date(semB.startDate);
        return dateB.getTime() - dateA.getTime();
      }
      if (semA) return -1;
      if (semB) return 1;

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

    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  };





  if (isAuthLoading || isStudentLoading || (isLoading && allCourses.length === 0 && studentId)) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }




  if (user && !isStudentLoading && !studentId) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>No student profile found.</p>
          <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </Layout>
    );
  }


  if (!user) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>Authentication required. Please log in again.</p>
        </div>
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
