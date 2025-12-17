"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import MyCoursesGrid from "@/components/classes/MyCoursesGrid";
import { Layout } from "@/components/layout/Layout";
import { ClassInfo, classService } from "@/services/classService";
import { lecturerService } from "@/services/lecturerService";
import { SimpleCourseCardProps } from "@/components/classes/SimpleCourseCard";
import { useAuth } from "@/hooks/useAuth";
import { semesterService, Semester } from "@/services/semesterService";
import { queryKeys } from "@/lib/react-query";
import { Spin } from "antd";

function mapApiDataToCardProps(classes: ClassInfo[]): SimpleCourseCardProps[] {
  return classes.map((cls) => ({
    id: cls.id,
    title: cls.classCode ? `${cls.classCode} - ${cls.courseName || ''}` : (cls.courseName || cls.classCode),
    authorName: cls.lecturerName,
    imageUrl: "/classes/class.png",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    href: `/lecturer/info/${cls.id}`,
  }));
}

export default function MyClassesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
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


  const { data: lecturers = [] } = useQuery({
    queryKey: queryKeys.lecturers.list(),
    queryFn: () => lecturerService.getLecturerList(),
    enabled: !!user,
  });


  const currentLecturerId = useMemo(() => {
    if (!user || !lecturers.length) return null;
    const currentUserAccountId = String(user.id);
    const matchingLecturer = lecturers.find(
      (lec) => lec.accountId === currentUserAccountId
    );
    if (!matchingLecturer) return null;
    const lecturerId = parseInt(matchingLecturer.lecturerId, 10);
    return isNaN(lecturerId) ? null : lecturerId;
  }, [user, lecturers]);


  const { data: classesResponse, isLoading: isLoadingClasses } = useQuery({
    queryKey: queryKeys.lecturerClasses.byLecturerId(currentLecturerId!),
    queryFn: () => classService.getClassList({
      pageNumber: 1,
      pageSize: 1000,
      lecturerId: currentLecturerId!,
    }),
    enabled: !!currentLecturerId,
  });

  const allCourses = classesResponse?.classes || [];
  const isLoading = isLoadingSemesters || isLoadingClasses;


  useEffect(() => {
    if (isInitialLoad && allSemesters.length > 0 && allCourses.length > 0) {
      const now = new Date();
      const uniqueSemesterNames = [
        ...new Set(allCourses.map((cls) => cls.semesterName).filter(Boolean)),
      ];

      if (uniqueSemesterNames.length === 0) {
        setIsInitialLoad(false);
        return;
      }

      const semesterMap = new Map<string, Semester>();
      uniqueSemesterNames.forEach((name) => {
        const exactMatch = allSemesters.find((sem) => sem.semesterCode === name);
        if (exactMatch) {
          semesterMap.set(name, exactMatch);
        } else {
          const partialMatch = allSemesters.find((sem) =>
            name.includes(sem.semesterCode) ||
            sem.semesterCode.includes(name) ||
            name.toLowerCase().includes(sem.semesterCode.toLowerCase()) ||
            sem.semesterCode.toLowerCase().includes(name.toLowerCase())
          );
          if (partialMatch) {
            semesterMap.set(name, partialMatch);
          }
        }
      });

      const filteredSemesterNames = uniqueSemesterNames.filter((name) => {
        const semester = semesterMap.get(name);
        if (!semester) return true;
        const startDate = new Date(semester.startDate.endsWith("Z") ? semester.startDate : semester.startDate + "Z");
        return startDate <= now;
      });

      if (filteredSemesterNames.length === 0) {
        setIsInitialLoad(false);
        return;
      }

      let activeSemesterCode = currentSemesterCode;
      if (!activeSemesterCode) {
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

        const exactMatch = allCourses.find(
          (cls) => cls.semesterName === activeSemesterCode
        );
        if (exactMatch?.semesterName && filteredSemesterNames.includes(exactMatch.semesterName)) {
          setSelectedSemester(exactMatch.semesterName);
          setIsInitialLoad(false);
          return;
        }


        const partialMatch = allCourses.find(
          (cls) => cls.semesterName?.includes(activeSemesterCode) ||
                   cls.semesterName?.toLowerCase().includes(activeSemesterCode.toLowerCase())
        );
        if (partialMatch?.semesterName && filteredSemesterNames.includes(partialMatch.semesterName)) {
          setSelectedSemester(partialMatch.semesterName);
          setIsInitialLoad(false);
          return;
        }
      }


      const sortedSemesters = filteredSemesterNames.sort((a, b) => {
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
    const now = new Date();
    const uniqueSemesterNames = [
      ...new Set(allCourses.map((cls) => cls.semesterName).filter(Boolean)),
    ];


    const semesterMap = new Map<string, Semester>();


    uniqueSemesterNames.forEach((name) => {

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


    const filteredSemesterNames = uniqueSemesterNames.filter((name) => {
      const semester = semesterMap.get(name);
      if (!semester) return true;
      const startDate = new Date(semester.startDate.endsWith("Z") ? semester.startDate : semester.startDate + "Z");
      return startDate <= now;
    });


    const sortedSemesters = filteredSemesterNames.sort((a, b) => {
      const semA = semesterMap.get(a);
      const semB = semesterMap.get(b);

      if (semA && semB) {
        const dateA = new Date(semA.startDate.endsWith("Z") ? semA.startDate : semA.startDate + "Z");
        const dateB = new Date(semB.startDate.endsWith("Z") ? semB.startDate : semB.startDate + "Z");
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
    const now = new Date();
    
    const filtered =
      selectedSemester === "all"
        ? allCourses
        : allCourses.filter(
            (cls) => cls.semesterName === selectedSemester
          );
    
    const filteredOutFutureSemesters = filtered.filter((cls) => {
      if (!cls.semesterName) return true;
      const semester = allSemesters.find((sem) => sem.semesterCode === cls.semesterName);
      if (!semester) return true;
      const startDate = new Date(semester.startDate.endsWith("Z") ? semester.startDate : semester.startDate + "Z");
      return startDate <= now;
    });
    
    return mapApiDataToCardProps(filteredOutFutureSemesters);
  }, [allCourses, selectedSemester, allSemesters]);

  const handleSemesterChange = (value: string) => {
    setSelectedSemester(value);

    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    if (!isInitialLoad && selectedSemester !== "all" && semesterOptions.length > 0) {
      const validSemesterValues = semesterOptions.map(opt => opt.value);
      if (!validSemesterValues.includes(selectedSemester)) {
        setSelectedSemester("all");
      }
    }
  }, [semesterOptions, selectedSemester, isInitialLoad]);

  if ((isLoading && allCourses.length === 0) || isAuthLoading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (!user || !currentLecturerId) {
    return (
      <Layout>
        <div>No lecturer profile found.</div>
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