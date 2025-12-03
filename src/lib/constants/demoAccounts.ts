export interface DemoAccount {
  accountCode: string;
  email: string;
  password: string;
  role: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { accountCode: "STU000001", email: "namle2385@gmail.com", password: "Lenam235", role: "Student" },
  { accountCode: "LEC000001", email: "nguyenvana@example.com", password: "123456", role: "Lecturer" },
  { accountCode: "EXA000001", email: "examiner1@example.com", password: "Lenam2385", role: "Examiner" },
  { accountCode: "HOD000001", email: "Hod1@example.com", password: "Lenam2386", role: "HOD" },
  { accountCode: "LEC000002", email: "Lecturer1@example.com", password: "Lenam2385", role: "Lecturer" },
  { accountCode: "LEC000003", email: "tranthib@example.com", password: "123456", role: "Lecturer" },
  { accountCode: "LEC000004", email: "leminhc@example.com", password: "123456", role: "Lecturer" },
  { accountCode: "LEC000005", email: "phamthid@example.com", password: "123456", role: "Lecturer" },
  { accountCode: "LEC000006", email: "hoangvane@example.com", password: "123456", role: "Lecturer" },
  { accountCode: "LEC000007", email: "ngothif@example.com", password: "123456", role: "Lecturer" },
  { accountCode: "STU000002", email: "dangthig@example.com", password: "123456", role: "Student" },
  { accountCode: "STU000003", email: "vutranh@example.com", password: "123456", role: "Student" },
  { accountCode: "STU000004", email: "doanthij@example.com", password: "123456", role: "Student" },
  { accountCode: "STU000005", email: "phamanhk@example.com", password: "123456", role: "Student" },
  { accountCode: "STU000006", email: "truongthil@example.com", password: "123456", role: "Student" },
  { accountCode: "STU000007", email: "nguyenthanhm@example.com", password: "123456", role: "Student" },
  { accountCode: "ADM000001", email: "admin1@system.com", password: "admin@123", role: "Admin" },
  { accountCode: "SE17331", email: "tranthimai@example.com", password: "Binh123@", role: "Student" },
  { accountCode: "EXA000002", email: "lehongt@example.com", password: "Teach3r!", role: "Examiner" },
];

