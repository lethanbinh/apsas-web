export interface Submission {
  id: number;
  fileSubmit: string;
  student: string;
  date: string;
  score: string;
  status: "On time" | "Late";
}
export const mockSubmissions: Submission[] = [
  {
    id: 1,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "2025-05-13T00:00:00Z",
    score: "5/10",
    status: "On time",
  },
  {
    id: 2,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "2025-05-22T00:00:00Z",
    score: "5/10",
    status: "On time",
  },
  {
    id: 3,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "2025-06-15T00:00:00Z",
    score: "5/10",
    status: "On time",
  },
  {
    id: 4,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "2025-06-09T00:00:00Z",
    score: "5/10",
    status: "Late",
  },
  {
    id: 5,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "2025-09-25T00:00:00Z",
    score: "5/10",
    status: "Late",
  },
];
