export interface ExamShift {
  id: number;
  paper: string;
  name: string;
  startDate: string;
  endDate: string;
  course: string;
  semester: string;
  examiner: string;
}

export interface Semester {
  id: number;
  name: string;
}

export interface Course {
  id: number;
  name: string;
  code: string;
}

export interface Paper {
  id: number;
  name: string;
}

export interface Lecturer {
  id: number;
  name: string;
}

export const mockSemesters: Semester[] = [
  { id: 1, name: "Fall2025" },
  { id: 2, name: "Spring2025" },
  { id: 3, name: "Summer2024" },
  { id: 4, name: "Fall2024" },
];

export const mockCourses: Course[] = [
  { id: 1, name: "Course DB Design", code: "CS201" },
  { id: 2, name: "Course Data Structures", code: "CS105" },
  { id: 3, name: "Course Algorithms", code: "CS106" },
  { id: 4, name: "Course Operating Systems", code: "CS301" },
];

export const mockPapers: Paper[] = [
  { id: 1, name: "Paper 1 (DDMS)" },
  { id: 2, name: "Paper 2 (Data Structures)" },
  { id: 3, name: "Paper 3 (Algorithms)" },
];

export const mockLecturers: Lecturer[] = [
  { id: 1, name: "NguyenNT" },
  { id: 2, name: "Prof. Kim" },
  { id: 3, name: "Prof. Chen" },
  { id: 4, name: "Dr. Rodriguez" },
  { id: 5, name: "Prof. Sharma" },
];

export const mockExamShifts: ExamShift[] = [
  {
    id: 1,
    paper: "Paper1",
    name: "Shift1",
    startDate: "2025-05-13T03:00:00Z", // (10:00 AM GMT+7)
    endDate: "2025-05-13T04:00:00Z", // (11:00 AM GMT+7)
    course: "DB Design",
    semester: "Fall2025",
    examiner: "NguyenNT",
  },
  {
    id: 2,
    paper: "Paper1",
    name: "Shift1",
    startDate: "2025-11-03T10:00:00Z", // (5:00 PM GMT+7 - In Progress)
    endDate: "2025-11-03T13:00:00Z", // (8:00 PM GMT+7 - In Progress)
    course: "DB Design",
    semester: "Fall2025",
    examiner: "NguyenNT",
  },
  {
    id: 3,
    paper: "Paper2",
    name: "Shift2",
    startDate: "2025-11-05T07:00:00Z", // (2:00 PM GMT+7 - Upcoming)
    endDate: "2025-11-05T08:00:00Z", // (3:00 PM GMT+7 - Upcoming)
    course: "Data Structures",
    semester: "Fall2025",
    examiner: "Prof. Kim",
  },
  {
    id: 4,
    paper: "Paper1",
    name: "Shift1",
    startDate: "2024-10-10T02:00:00Z", // (9:00 AM GMT+7 - Finished)
    endDate: "2024-10-10T03:00:00Z", // (10:00 AM GMT+7 - Finished)
    course: "DB Design",
    semester: "Fall2024",
    examiner: "Prof. Chen",
  },
];
