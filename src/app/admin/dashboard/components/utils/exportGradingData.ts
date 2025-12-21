import * as XLSX from "xlsx";
import dayjs from "dayjs";
import type { DashboardOverview, ChartData } from "@/services/adminDashboardService";

export function exportGradingDataToExcel(
  overview: DashboardOverview,
  gradingSessions: any[],
  filteredGradingGroups: any[],
  filteredGradingSessions: any[],
  filteredAssignRequests: any[],
  chartData: ChartData | null
): void {
  const wb = XLSX.utils.book_new();
  const exportData: any[] = [];
  const totalSessions = gradingSessions.length;
  const aiSessions = gradingSessions.filter((s) => s.gradingType === 0).length;
  const lecturerSessions = gradingSessions.filter((s) => s.gradingType === 1).length;
  const bothSessions = gradingSessions.filter((s) => s.gradingType === 2).length;
  const completedSessions = gradingSessions.filter((s) => s.status === 1);
  const processingSessions = gradingSessions.filter((s) => s.status === 0);
  const failedSessions = gradingSessions.filter((s) => s.status === 2);

  exportData.push(["GRADING - KEY STATISTICS"]);
  exportData.push(["Metric", "Value"]);
  exportData.push(["Total Grading Groups", overview.grading.totalGradingGroups]);
  exportData.push(["Total Grading Sessions", overview.grading.totalGradingSessions]);
  exportData.push(["Completed Sessions", overview.grading.completedGradingSessions || 0]);
  exportData.push(["Processing Sessions", processingSessions.length]);
  exportData.push(["Failed Sessions", failedSessions.length]);
  exportData.push(["Pending Assign Requests", overview.grading.pendingAssignRequests]);
  exportData.push(["Average Grading Time (hours)", overview.grading.averageGradingTime?.toFixed(2) || "N/A"]);
  exportData.push([]);

  exportData.push(["GRADING SESSION STATUS DISTRIBUTION"]);
  exportData.push(["Status", "Count", "Percentage"]);
  exportData.push(["Completed", completedSessions.length, totalSessions > 0 ? ((completedSessions.length / totalSessions) * 100).toFixed(2) + "%" : "0%"]);
  exportData.push(["Processing", processingSessions.length, totalSessions > 0 ? ((processingSessions.length / totalSessions) * 100).toFixed(2) + "%" : "0%"]);
  exportData.push(["Failed", failedSessions.length, totalSessions > 0 ? ((failedSessions.length / totalSessions) * 100).toFixed(2) + "%" : "0%"]);
  exportData.push([]);

  exportData.push(["GRADING SESSION TYPE DISTRIBUTION"]);
  exportData.push(["Type", "Count", "Percentage"]);
  exportData.push(["AI", aiSessions, totalSessions > 0 ? ((aiSessions / totalSessions) * 100).toFixed(2) + "%" : "0%"]);
  exportData.push(["Lecturer", lecturerSessions, totalSessions > 0 ? ((lecturerSessions / totalSessions) * 100).toFixed(2) + "%" : "0%"]);
  exportData.push(["Both", bothSessions, totalSessions > 0 ? ((bothSessions / totalSessions) * 100).toFixed(2) + "%" : "0%"]);
  exportData.push([]);

  if (chartData?.gradingPerformance && chartData.gradingPerformance.length > 0) {
    exportData.push(["GRADING PERFORMANCE (LAST 30 DAYS)"]);
    exportData.push(["Date", "Graded", "Pending"]);
    chartData.gradingPerformance.forEach((item) => {
      exportData.push([item.date, item.graded, item.pending]);
    });
    exportData.push([]);
  }

  if (overview.grading.gradingByLecturer && overview.grading.gradingByLecturer.length > 0) {
    exportData.push(["GRADING BY LECTURER"]);
    exportData.push(["Lecturer", "Session Count", "Completed Count"]);
    overview.grading.gradingByLecturer.forEach((item) => {
      exportData.push([item.lecturerName, item.sessionCount, item.completedCount]);
    });
    exportData.push([]);
  }

  exportData.push(["ALL GRADING GROUPS"]);
  exportData.push(["No", "ID", "Lecturer", "Lecturer Code", "Assessment Template", "Submissions", "Created At"]);
  filteredGradingGroups.forEach((group, index) => {
    exportData.push([
      index + 1,
      group.id,
      group.lecturerName || "",
      group.lecturerCode || "",
      group.assessmentTemplateName || "",
      group.submissionCount || 0,
      group.createdAt ? dayjs(group.createdAt).format("YYYY-MM-DD") : "",
    ]);
  });
  exportData.push([]);

  exportData.push(["ALL GRADING SESSIONS"]);
  exportData.push(["No", "ID", "Student Name", "Student Code", "Status", "Type", "Grade", "Created At"]);
  filteredGradingSessions.forEach((session, index) => {
    exportData.push([
      index + 1,
      session.id,
      session.submissionStudentName || "",
      session.submissionStudentCode || "",
      session.status === 0 ? "Processing" : session.status === 1 ? "Completed" : "Failed",
      session.gradingType === 0 ? "AI" : session.gradingType === 1 ? "Lecturer" : "Both",
      session.grade || 0,
      session.createdAt ? dayjs(session.createdAt).format("YYYY-MM-DD HH:mm") : "",
    ]);
  });
  exportData.push([]);


  exportData.push(["ALL ASSIGN REQUESTS"]);
  exportData.push(["No", "ID", "Course Element", "Course", "Assigned Lecturer", "Assigned By HOD", "Status", "Created At"]);
  filteredAssignRequests.forEach((request, index) => {
    exportData.push([
      index + 1,
      request.id,
      request.courseElementName || "",
      request.courseName || "",
      request.assignedLecturerName || "",
      request.assignedByHODName || "",
      request.status === 1 ? "Pending" : request.status === 2 ? "Accepted" : request.status === 3 ? "Rejected" : request.status === 4 ? "In Progress" : request.status === 5 ? "Completed" : "Unknown",
      request.createdAt ? dayjs(request.createdAt).format("YYYY-MM-DD") : "",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, "Grading");

  const fileName = `Grading_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}