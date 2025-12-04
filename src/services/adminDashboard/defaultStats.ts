import type { UserStats, AssessmentStats, SubmissionStats } from './types';

export function getDefaultUserStats(): UserStats {
  return {
    total: 0,
    byRole: {
      admin: 0,
      lecturer: 0,
      student: 0,
      hod: 0,
    },
    newThisMonth: 0,
    active: 0,
    inactive: 0,
    neverLoggedIn: 0,
    byGender: { male: 0, female: 0, other: 0 },
    usersWithAvatar: 0,
    usersWithoutAvatar: 0,
    usersWithPhone: 0,
    usersWithoutPhone: 0,
  };
}

export function getDefaultAssessmentStats(): AssessmentStats {
  return {
    totalTemplates: 0,
    totalClassAssessments: 0,
    byType: {
      assignment: 0,
      lab: 0,
      practicalExam: 0,
    },
    assessmentsByStatus: { active: 0, completed: 0, pending: 0 },
    assessmentsByLecturer: [],
    averageSubmissionsPerAssessment: 0,
    assessmentsWithoutSubmissions: 0,
    topAssessmentsBySubmissions: [],
    upcomingDeadlines: [],
  };
}

export function getDefaultSubmissionStats(): SubmissionStats {
  return {
    total: 0,
    graded: 0,
    pending: 0,
    notSubmitted: 0,
    completionRate: 0,
    submissionsByType: { assignment: 0, lab: 0, practicalExam: 0 },
    averageGrade: 0,
    submissionsByGradeRange: { excellent: 0, good: 0, average: 0, belowAverage: 0 },
    lateSubmissions: 0,
    onTimeSubmissions: 0,
    topStudentsBySubmissions: [],
    submissionsByDay: [],
  };
}

