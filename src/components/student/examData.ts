// Tên file: components/AssignmentList/examData.ts

import dayjs from "dayjs";
import { AssignmentData } from "./data"; // Tái sử dụng interface từ file data.ts

export const initialExamData: AssignmentData[] = [
  {
    id: "exam1",
    status: "Mid-term Exam",
    title: "Practical Exam 01",
    date: dayjs().add(10, "day").toISOString(),
    description:
      "This is the mid-term practical exam. You are required to complete all tasks within the given time frame. Ensure your code is clean and well-documented.",
    requirementFile: "Exam_Requirements_01.pdf",
    databaseFile: "exam_database_01.sql",
    requirementContent: [
      { type: "heading", content: "Task 1: Database Setup" },
      {
        type: "paragraph",
        content:
          "Using the provided SQL file, set up the initial database schema and populate it with the necessary data.",
      },
      { type: "image", src: "/images/code-example.png" },
    ],
    totalScore: "8/10",
    overallFeedback:
      "Good effort. The database setup was flawless, but the API implementation had minor issues with error handling.",
    gradeCriteria: [
      {
        id: "ec1",
        name: "Task 1 Grade",
        score: "9/10",
        reason: "Excellent schema implementation.",
      },
      {
        id: "ec2",
        name: "Task 2 Grade",
        score: "7/10",
        reason: "API logic was correct but missed some edge cases.",
      },
    ],
    suggestionsAvoid: "Avoid hardcoding values in your API responses.",
    suggestionsImprove: "Implement more robust validation for user inputs.",
    submissions: [
      {
        id: "es1",
        fileName: "Exam_Submission_1.zip",
        thumbnailUrl: "https://via.placeholder.com/150",
        submissionTime: dayjs().subtract(2, "day").toISOString(),
      },
    ],
  },
  {
    id: "exam2",
    status: "Final Exam",
    title: "Practical Exam 02",
    date: dayjs().add(30, "day").toISOString(),
    description:
      "This is the final practical exam covering all topics from the semester.",
    requirementFile: "Exam_Requirements_02.pdf",
    requirementContent: [
      { type: "heading", content: "Task 1: Full-stack Feature" },
      {
        type: "paragraph",
        content: "Develop a complete feature from frontend to backend...",
      },
    ],
    totalScore: "N/A",
    overallFeedback: "Not graded yet.",
    gradeCriteria: [],
    suggestionsAvoid: "",
    suggestionsImprove: "",
    submissions: [],
  },
];
