import { ROLES } from "@/lib/constants";

export const mapRoleToString = (role: number): string => {
  const roleNumber = typeof role === "string" ? parseInt(role, 10) : role;

  switch (roleNumber) {
    case ROLES.ADMIN:
      return "Admin";
    case ROLES.LECTURER:
      return "Lecturer";
    case ROLES.STUDENT:
      return "Student";
    case ROLES.HOD:
      return "HOD";
    case ROLES.EXAMINER:
      return "Examiner";
    default:
      return `Unknown (${role})`;
  }
};

export const getPaginationItems = (currentPage: number, totalPages: number): (number | string)[] => {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | string)[] = [];
  
  if (currentPage <= 4) {
    // Show: 1, 2, 3, 4, 5, 6, ..., totalPages
    for (let i = 1; i <= 6; i++) {
      items.push(i);
    }
    items.push('...');
    items.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    // Show: 1, ..., totalPages-5, totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
    items.push(1);
    items.push('...');
    for (let i = totalPages - 5; i <= totalPages; i++) {
      items.push(i);
    }
  } else {
    // Show: 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
    items.push(1);
    items.push('...');
    items.push(currentPage - 1);
    items.push(currentPage);
    items.push(currentPage + 1);
    items.push('...');
    items.push(totalPages);
  }

  return items;
};


