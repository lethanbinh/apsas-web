import { classService } from '../classService';
import { adminService } from '../adminService';
import { courseElementService } from '../courseElementService';
import type { AcademicStats } from './types';
export class AcademicStatsService {
  async getSemesterStats(): Promise<{ total: number; active: number }> {
    try {
      const semesters = await adminService.getPaginatedSemesters(1, 100);
      const now = new Date();
      const active = semesters.filter((s) => {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        return now >= start && now <= end;
      }).length;
      return { total: semesters.length, active };
    } catch (error) {
      console.error('Error fetching semester stats:', error);
      return { total: 0, active: 0 };
    }
  }
  async getClassStats(): Promise<{ total: number }> {
    try {
      const { total } = await classService.getClassList({
        pageNumber: 1,
        pageSize: 1,
      });
      return { total };
    } catch (error) {
      console.error('Error fetching class stats:', error);
      return { total: 0 };
    }
  }
  async getDetailedAcademicStats(): Promise<Partial<AcademicStats>> {
    try {
      const { classes } = await classService.getClassList({
        pageNumber: 1,
        pageSize: 1000,
      });
      const semesters = await adminService.getPaginatedSemesters(1, 100);
      const courseElements = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      });
      const totalStudents = classes.reduce(
        (sum, cls) => sum + (parseInt(cls.studentCount) || 0),
        0
      );
      const averageStudentsPerClass =
        classes.length > 0 ? totalStudents / classes.length : 0;
      const classesWithoutStudents = classes.filter(
        (cls) => !parseInt(cls.studentCount) || parseInt(cls.studentCount) === 0
      ).length;
      const classesOverloaded = classes.filter(
        (cls) => parseInt(cls.studentCount) > 50
      ).length;
      const topClassesByStudents = classes
        .map((cls) => ({
          id: cls.id,
          classCode: cls.classCode,
          courseName: cls.courseName,
          studentCount: parseInt(cls.studentCount) || 0,
          lecturerName: cls.lecturerName,
        }))
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 10);
      const semesterMap = new Map<string, {
        semesterCode: string;
        semesterName: string;
        classCount: number;
        studentCount: number;
        lecturerSet: Set<string>;
      }>();
      const uniqueCourses = new Set<string>();
      classes.forEach((cls) => {
        if (cls.courseName) uniqueCourses.add(cls.courseName);
      });
      const uniqueLecturers = new Set<string>();
      classes.forEach((cls) => {
        if (cls.lecturerId) uniqueLecturers.add(cls.lecturerId);
      });
      classes.forEach((cls) => {
        const semesterKey = cls.semesterName || 'Unknown';
        if (!semesterMap.has(semesterKey)) {
          semesterMap.set(semesterKey, {
            semesterCode: semesterKey,
            semesterName: semesterKey,
            classCount: 0,
            studentCount: 0,
            lecturerSet: new Set(),
          });
        }
        const data = semesterMap.get(semesterKey)!;
        data.classCount++;
        data.studentCount += parseInt(cls.studentCount || '0', 10);
        if (cls.lecturerId) {
          data.lecturerSet.add(cls.lecturerId);
        }
      });
      const classesBySemester = Array.from(semesterMap.values())
        .filter((item) => item.classCount > 0)
        .sort((a, b) => a.semesterCode.localeCompare(b.semesterCode))
        .map((item) => ({
          semesterCode: item.semesterCode,
          semesterName: item.semesterName,
          classCount: item.classCount,
          studentCount: item.studentCount,
          lecturerCount: item.lecturerSet.size,
        }));
      const lecturerWorkloadMap = new Map<string, {
        lecturerId: string;
        lecturerName: string;
        classCount: number;
        studentCount: number;
      }>();
      classes.forEach((cls) => {
        if (cls.lecturerId && cls.lecturerName) {
          if (!lecturerWorkloadMap.has(cls.lecturerId)) {
            lecturerWorkloadMap.set(cls.lecturerId, {
              lecturerId: cls.lecturerId,
              lecturerName: cls.lecturerName,
              classCount: 0,
              studentCount: 0,
            });
          }
          const lecturer = lecturerWorkloadMap.get(cls.lecturerId)!;
          lecturer.classCount++;
          lecturer.studentCount += parseInt(cls.studentCount || '0', 10);
        }
      });
      const lecturerWorkload = Array.from(lecturerWorkloadMap.values())
        .sort((a, b) => b.classCount - a.classCount)
        .slice(0, 20);
      const studentToLecturerRatio = uniqueLecturers.size > 0
        ? Math.round((totalStudents / uniqueLecturers.size) * 10) / 10
        : 0;
      const now = new Date();
      const activeSemesters = semesters.filter((s) => {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        return now >= start && now <= end;
      }).length;
      return {
        totalCourseElements: courseElements.length || 0,
        totalCourses: uniqueCourses.size,
        totalStudents,
        totalLecturers: uniqueLecturers.size,
        classesOverloaded,
        classesBySemester,
        averageStudentsPerClass: Math.round(averageStudentsPerClass * 100) / 100,
        classesWithoutStudents,
        topClassesByStudents,
        semesterCourses: uniqueCourses.size,
        lecturerWorkload,
        studentToLecturerRatio,
      };
    } catch (error) {
      console.error('Error fetching detailed academic stats:', error);
      return {};
    }
  }
}
export const academicStatsService = new AcademicStatsService();