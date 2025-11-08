// Tên file: components/AssignmentList/data.ts

import dayjs from "dayjs";

export interface RequirementContent {
  type: "heading" | "paragraph" | "image";
  content?: string;
  src?: string;
}

export interface GradeCriterion {
  id: string;
  name: string;
  score: string;
  reason: string;
}

export interface SubmissionItem {
  id: string;
  fileName: string;
  thumbnailUrl: string;
  submissionTime: string;
}

export interface AssignmentData {
  id: string;
  status: string;
  title: string;
  date?: string;
  description: string;
  requirementContent: RequirementContent[];
  requirementFile: string;
  requirementFileUrl?: string;
  databaseFile?: string;
  databaseFileUrl?: string;
  totalScore: string;
  overallFeedback: string;
  gradeCriteria: GradeCriterion[];
  suggestionsAvoid: string;
  suggestionsImprove: string;
  submissions: SubmissionItem[];
  // For deadline update
  classAssessmentId?: number;
  examSessionId?: number;
  courseElementId?: number;
  classId?: number;
  assessmentTemplateId?: number;
  startAt?: string;
}

export const initialAssignmentData: AssignmentData[] = [
  {
    id: "1",
    status: "Basic Assignment",
    title: "Paper Assignment 01",
    date: dayjs().add(1, "day").toISOString(),
    description:
      "TOTC is a platform that allows educators to create online classes...",
    requirementFile: "Requirement 01.pdf",
    databaseFile: "database_schema_01.sql",
    requirementContent: [
      { type: "heading", content: "Question 01: Create a program" },
      { type: "paragraph", content: "..." },
      {
        type: "image",
        src: "https://congnghethongtinaau.com/wp-content/uploads/2024/11/code-la-gi.jpg",
      },
    ],
    totalScore: "5/10",
    overallFeedback: "Well done on addressing the basic requirements...",
    gradeCriteria: [
      { id: "c1", name: "Criteria 1 grade", score: "5/10", reason: "..." },
    ],
    suggestionsAvoid: "Avoid direct manipulation of DOM...",
    suggestionsImprove: "Improve code structuring...",
    submissions: [
      {
        id: "s1",
        fileName: "Binh.zip1",
        thumbnailUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhNxOminnEU8XPuzMXIlD72NmjP_iU-z-OYA&s",
        submissionTime: dayjs().subtract(1, "day").toISOString(),
      },
    ],
  },
  {
    id: "2",
    status: "Advanced Assignment",
    title: "Assignments 02",
    date: dayjs().add(5, "day").toISOString(),
    description: "Description for Assignment 02...",
    requirementFile: "Requirement 02.pdf",
    databaseFile: "database_schema_02.sql",
    requirementContent: [
      { type: "heading", content: "Question 01: Advanced Logic" },
    ],
    totalScore: "N/A",
    overallFeedback: "Still pending grading.",
    gradeCriteria: [],
    suggestionsAvoid: "",
    suggestionsImprove: "",
    submissions: [],
  },
];
