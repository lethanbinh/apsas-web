import dayjs from "dayjs";
export interface RequirementContent {
  type: "heading" | "paragraph" | "image";
  content?: string;
  src?: string;
}
export interface CriteriaData {
  id: string;
  title: string;
  details: {
    Name: string;
    Content: string;
    DataType: string;
    Score: number;
  };
}
export interface QuestionData {
  id: string;
  title: string;
  name: string;
  content: string;
  imageUrl: string;
  criteria?: CriteriaData[];
}
export interface SubmissionItem {
  id: string;
  fileName: string;
  thumbnailUrl: string;
  submissionTime: string;
}
export interface GradeCriteria {
  id: string;
  name: string;
  score: string;
  reason?: string;
}
export interface AssignmentApprovalDetails {
  id: string;
  type: string;
  statusLabel: string;
  date: string;
  questions: QuestionData[];
  databaseFileUrl?: string;
  exportUrl?: string;
  totalScore: string;
  overallFeedback: string;
  gradeCriteria: GradeCriteria[];
  suggestionsAvoid: string;
  suggestionsImprove: string;
  submissions: SubmissionItem[];
}
export interface CourseApprovalData {
  id: string;
  title: string;
  status: "Pending" | "Approved" | "Rejected";
  assignments: AssignmentApprovalDetails[];
}
export const approvalListData: CourseApprovalData[] = [
  {
    id: "capstone",
    title: "Capstone Project",
    status: "Pending",
    assignments: [
      {
        id: "capstone_assign01",
        type: "Basic Assignment",
        statusLabel: "Assignment 01 - NguyenNT",
        date: "13/05/2022",
        questions: [
          {
            id: "q1",
            title: "Question 1",
            name: "Name of card",
            content: "Card Number",
            imageUrl:
              "https://congnghethongtinaau.com/wp-content/uploads/2024/11/code-la-gi.jpg",
            criteria: [
              {
                id: "c1",
                title: "Criteria 1",
                details: {
                  Name: "Name",
                  Content: "Learn about the various elements...",
                  DataType: "Numeric",
                  Score: 2,
                },
              },
              {
                id: "c2",
                title: "Criteria 2",
                details: {
                  Name: "Detail 2",
                  Content: "...",
                  DataType: "String",
                  Score: 3,
                },
              },
            ],
          },
          {
            id: "q2",
            title: "Question 2",
            name: "Q2 Name",
            content: "Q2 Content",
            imageUrl: "https://via.placeholder.com/300",
            criteria: [],
          },
        ],
        databaseFileUrl: "#",
        exportUrl: "#",
        totalScore: "5/10",
        overallFeedback: "Good start.",
        gradeCriteria: [
          {
            id: "c1",
            name: "Criteria 1 grade",
            score: "5/10",
            reason: "Logic correct but...",
          },
        ],
        suggestionsAvoid: "Avoid magic numbers.",
        suggestionsImprove: "Use constants.",
        submissions: [
          {
            id: "s1",
            fileName: "Binh.zip1",
            thumbnailUrl: "https://via.placeholder.com/150",
            submissionTime: dayjs().subtract(1, "day").toISOString(),
          },
        ],
      },
      {
        id: "capstone_assign02",
        type: "Advanced Task",
        statusLabel: "Assignment 02 - Review",
        date: "20/05/2022",
        questions: [
          {
            id: "q3",
            title: "Question 3",
            name: "Q3 Name",
            content: "Q3 Content",
            imageUrl: "https://via.placeholder.com/300",
          },
        ],
        totalScore: "N/A",
        overallFeedback: "Pending",
        gradeCriteria: [],
        suggestionsAvoid: "",
        suggestionsImprove: "",
        submissions: [],
      },
    ],
  },
  {
    id: "lab211",
    title: "Lab211 Java",
    status: "Approved",
    assignments: [
      {
        id: "lab211_assign01",
        type: "Lab Work",
        statusLabel: "Lab 01 - Java Basics",
        date: "01/06/2022",
        questions: [],
        totalScore: "9/10",
        overallFeedback: "Excellent",
        gradeCriteria: [],
        suggestionsAvoid: "",
        suggestionsImprove: "",
        submissions: [],
      },
    ],
  },
];