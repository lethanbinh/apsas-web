import { ROLES } from "@/lib/constants";
import { User } from "@/types";
import * as XLSX from "xlsx";

export const validateAccountData = (row: any, rowIndex: number): string | null => {
  const rowNum = rowIndex + 2;


  if (!row["Username"] || !row["Username"].toString().trim()) {
    return `Row ${rowNum}: Username is required`;
  }
  if (row["Username"].toString().trim().length < 3) {
    return `Row ${rowNum}: Username must be at least 3 characters`;
  }
  if (!row["Email"] || !row["Email"].toString().trim()) {
    return `Row ${rowNum}: Email is required`;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(row["Email"].toString().trim())) {
    return `Row ${rowNum}: Invalid email format`;
  }
  if (!row["Phone Number"] || !row["Phone Number"].toString().trim()) {
    return `Row ${rowNum}: Phone Number is required`;
  }
  const phoneRegex = /^[0-9]{10,}$/;
  const phoneDigits = row["Phone Number"].toString().replace(/[\s\-\(\)]/g, '');
  if (!phoneRegex.test(phoneDigits)) {
    return `Row ${rowNum}: Phone Number must be at least 10 digits`;
  }
  if (!row["Full Name"] || !row["Full Name"].toString().trim()) {
    return `Row ${rowNum}: Full Name is required`;
  }
  if (row["Full Name"].toString().trim().length < 2) {
    return `Row ${rowNum}: Full Name must be at least 2 characters`;
  }
  if (!row["Address"] || !row["Address"].toString().trim()) {
    return `Row ${rowNum}: Address is required`;
  }
  if (row["Address"].toString().trim().length < 5) {
    return `Row ${rowNum}: Address must be at least 5 characters`;
  }
  if (row["Gender"] === undefined || row["Gender"] === null || row["Gender"].toString().trim() === "") {
    return `Row ${rowNum}: Gender is required (0=Male, 1=Female)`;
  }
  const gender = parseInt(row["Gender"].toString().trim());
  if (isNaN(gender) || gender < 0 || gender > 1) {
    return `Row ${rowNum}: Gender must be 0 (Male) or 1 (Female)`;
  }
  if (!row["Date of Birth"] || !row["Date of Birth"].toString().trim()) {
    return `Row ${rowNum}: Date of Birth is required (format: YYYY-MM-DD)`;
  }
  const dateOfBirth = new Date(row["Date of Birth"].toString().trim());
  if (isNaN(dateOfBirth.getTime())) {
    return `Row ${rowNum}: Invalid Date of Birth format (use YYYY-MM-DD)`;
  }
  if (!row["Role"] || row["Role"].toString().trim() === "") {
    return `Row ${rowNum}: Role is required (0=Admin, 1=Lecturer, 2=Student, 3=HOD, 4=Examiner)`;
  }
  const role = parseInt(row["Role"].toString().trim());
  if (isNaN(role) || role < 0 || role > 4) {
    return `Row ${rowNum}: Role must be 0-4 (0=Admin, 1=Lecturer, 2=Student, 3=HOD, 4=Examiner)`;
  }

  if (role === ROLES.LECTURER) {
    if (!row["Department"] || !row["Department"].toString().trim()) {
      return `Row ${rowNum}: Department is required for Lecturer role`;
    }
    if (!row["Specialization"] || !row["Specialization"].toString().trim()) {
      return `Row ${rowNum}: Specialization is required for Lecturer role`;
    }
  }
  if (!row["Password"] || !row["Password"].toString().trim()) {
    return `Row ${rowNum}: Password is required`;
  }
  if (row["Password"].toString().trim().length < 6) {
    return `Row ${rowNum}: Password must be at least 6 characters`;
  }

  return null;
};

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error("Failed to parse Excel file. Please check the file format."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };
    reader.readAsArrayBuffer(file);
  });
};

export const exportUsersToExcel = (users: User[]): void => {
  const roleMap: Record<number, string> = {
    [ROLES.ADMIN]: "Admin",
    [ROLES.LECTURER]: "Lecturer",
    [ROLES.STUDENT]: "Student",
    [ROLES.HOD]: "HOD",
    [ROLES.EXAMINER]: "Examiner",
  };

  const genderMap: Record<number, string> = {
    0: "Male",
    1: "Female",
    2: "Other",
  };

  const excelData = users.map((user, index) => ({
    "No": index + 1,
    "Account Code": user.accountCode || "",
    "Username": user.username || "",
    "Email": user.email || "",
    "Phone Number": user.phoneNumber || "",
    "Full Name": user.fullName || "",
    "Address": user.address || "",
    "Gender": user.gender !== undefined ? genderMap[user.gender] || user.gender.toString() : "",
    "Date of Birth": user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
    "Role": roleMap[user.role] || user.role.toString(),
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "All Accounts");

  ws["!cols"] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 40 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
  ];

  const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const filename = `All_Accounts_${timestamp}.xlsx`;
  XLSX.writeFile(wb, filename);
};

export const generateSampleTemplate = (): void => {
  const sampleAccounts = [];
  const roles = [
    { value: "0", name: "Admin" },
    { value: "1", name: "Lecturer" },
    { value: "2", name: "Student" },
    { value: "3", name: "HOD" },
    { value: "4", name: "Examiner" },
  ];
  const genders = ["0", "1"];
  const departments = ["Computer Science", "Information Technology", "Software Engineering", "Data Science", "Cybersecurity", "Network Engineering", "Artificial Intelligence", "Web Development", "Mobile Development", "Database Systems"];
  const specializations = ["Web Development", "Mobile Development", "Data Science", "Machine Learning", "Cybersecurity", "Cloud Computing", "Database Management", "Software Architecture", "Network Security", "AI & Robotics"];
  const firstNames = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Vo", "Dang", "Bui", "Do"];
  const middleNames = ["Van", "Thi", "Duc", "Minh", "Thanh", "Quang", "Duy", "Hoang", "Tuan", "Anh"];
  const lastNames = ["An", "Binh", "Chi", "Dung", "Em", "Giang", "Hoa", "Khanh", "Linh", "Mai", "Nam", "Oanh", "Phuong", "Quan", "Son", "Thao", "Uyen", "Vy", "Xuan", "Yen"];
  const addresses = [
    "123 Le Loi Street, District 1, Ho Chi Minh City",
    "456 Nguyen Hue Boulevard, District 1, Ho Chi Minh City",
    "789 Tran Hung Dao Street, District 5, Ho Chi Minh City",
    "321 Vo Van Tan Street, District 3, Ho Chi Minh City",
    "654 Ly Tu Trong Street, District 1, Ho Chi Minh City",
    "987 Pasteur Street, District 3, Ho Chi Minh City",
    "147 Dong Khoi Street, District 1, Ho Chi Minh City",
    "258 Hai Ba Trung Street, District 3, Ho Chi Minh City",
    "369 Nguyen Dinh Chieu Street, District 3, Ho Chi Minh City",
    "741 Cach Mang Thang Tam Street, District 10, Ho Chi Minh City"
  ];

  for (let i = 1; i <= 50; i++) {
    const roleIndex = Math.floor((i - 1) / 10);
    const role = roles[roleIndex % roles.length];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${middleName} ${lastName}`;
    const accountCode = `ACC${String(i).padStart(3, "0")}`;
    const username = `user${String(i).padStart(3, "0")}`;
    const email = `user${String(i).padStart(3, "0")}@example.com`;
    const phoneNumber = `0${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`;
    const address = addresses[Math.floor(Math.random() * addresses.length)];


    const year = 1990 + Math.floor(Math.random() * 16);
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const dateOfBirth = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const password = `Pass${i}@123`;

    const accountData: any = {
      "Username": username,
      "Email": email,
      "Phone Number": phoneNumber,
      "Full Name": fullName,
      "Address": address,
      "Gender": gender,
      "Date of Birth": dateOfBirth,
      "Role": role.value,
      "Password": password
    };


    if (role.value === "1") {
      accountData["Department"] = departments[Math.floor(Math.random() * departments.length)];
      accountData["Specialization"] = specializations[Math.floor(Math.random() * specializations.length)];
    }

    sampleAccounts.push(accountData);
  }

  const ws = XLSX.utils.json_to_sheet(sampleAccounts);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Accounts");

  ws["!cols"] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 40 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.writeFile(wb, "Account_Import_Template.xlsx");
};


