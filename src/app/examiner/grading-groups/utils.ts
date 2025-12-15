import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export const toVietnamTime = (dateString: string | null) => {
  if (!dateString) return null;
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

