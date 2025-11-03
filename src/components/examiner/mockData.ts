export interface ExamShift {
  id: number;
  paper: string;
  name: string;
  startDate: string;
  endDate: string;
  course: string;
  semester: string;
  lecturer: string;
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
  { id: 2, name: "Prof. Kim (Data Structures)" },
  { id: 3, name: "Prof. Chen (Database Design)" },
  { id: 4, name: "Dr. Rodriguez (Network Security)" },
];

export const mockExamShifts: ExamShift[] = [
  {
    id: 1,
    paper: "Paper1",
    name: "Shift1",
    startDate: "2025-05-13T10:00:00Z",
    endDate: "2025-05-13T11:00:00Z",
    course: "DB Design",
    semester: "Fall2025",
    lecturer: "NguyenNT",
  },
  {
    id: 2,
    paper: "Paper1",
    name: "Shift1",
    startDate: "2025-05-13T10:00:00Z",
    endDate: "2025-05-13T11:00:00Z",
    course: "DB Design",
    semester: "Fall2025",
    lecturer: "NguyenNT",
  },
  {
    id: 3,
    paper: "Paper2",
    name: "Shift2",
    startDate: "2025-05-14T14:00:00Z",
    endDate: "2025-05-14T15:00:00Z",
    course: "Data Structures",
    semester: "Fall2025",
    lecturer: "Prof. Kim",
  },
  {
    id: 4,
    paper: "Paper1",
    name: "Shift1",
    startDate: "2024-10-10T09:00:00Z",
    endDate: "2024-10-10T10:00:00Z",
    course: "DB Design",
    semester: "Fall2024",
    lecturer: "NguyenNT",
  },
];
