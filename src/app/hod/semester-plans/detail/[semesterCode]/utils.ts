import { format } from "date-fns";
export const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};
export const isSemesterEnded = (endDate: string): boolean => {
  if (!endDate) return false;
  const now = new Date();
  const semesterEnd = new Date(endDate.endsWith("Z") ? endDate : endDate + "Z");
  return now > semesterEnd;
};