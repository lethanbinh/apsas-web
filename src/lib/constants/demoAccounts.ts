export interface DemoAccount {
  accountCode: string;
  email: string;
  password: string;
  role: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { accountCode: "STU000001", email: "namle2385@gmail.com", password: "Lenam235", role: "Student" },
  { accountCode: "LEC000001", email: "lethanhbinh6122003@gmail.com", password: "123456", role: "Lecturer" },
  { accountCode: "HOD000001", email: "binhltse173315@fpt.edu.vn", password: "Lenam2386", role: "HOD" },
  { accountCode: "EXM000001", email: "umarusan2609@gmail.com", password: "Lenam2385", role: "Examiner" },
  { accountCode: "ADM000001", email: "binhbeboi123@gmail.com", password: "admin@123", role: "Admin" },
  { accountCode: "STU000002", email: "dangthig@example.com", password: "123456", role: "Student" },
  { accountCode: "LEC000004", email: "phongthai003007@gmail.com", password: "123456", role: "Lecturer" },
];