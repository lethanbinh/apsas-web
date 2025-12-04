import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

export const isSemesterPassed = (endDate: string | null | undefined): boolean => {
  if (!endDate) return false;
  const now = dayjs().tz("Asia/Ho_Chi_Minh");
  const semesterEnd = toVietnamTime(endDate);
  if (!semesterEnd || !semesterEnd.isValid()) return false;
  return now.isAfter(semesterEnd, 'day');
};

