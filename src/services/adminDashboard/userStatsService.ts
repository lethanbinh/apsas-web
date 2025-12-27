import { ROLES } from '@/lib/constants';
import { adminService } from '../adminService';
import { getDefaultUserStats } from './defaultStats';
import type { UserGrowthData, UserStats } from './types';
export class UserStatsService {
  async getUserStats(): Promise<UserStats> {
    try {
      const { users } = await adminService.getAccountList(1, 1000);
      const now = new Date();
      const byRole = {
        admin: 0,
        lecturer: 0,
        student: 0,
        hod: 0,
      };
      let newThisMonth = 0;
      let active = 0;
      const filteredUsers = users;
      filteredUsers.forEach((user) => {
        if (user.role === ROLES.ADMIN) byRole.admin++;
        else if (user.role === ROLES.LECTURER) byRole.lecturer++;
        else if (user.role === ROLES.STUDENT) byRole.student++;
        else if (user.role === ROLES.HOD) byRole.hod++;
        active++;
      });
      const byGender = {
        male: 0,
        female: 0,
        other: 0,
      };
      let totalAge = 0;
      let ageCount = 0;
      let usersWithAvatar = 0;
      let usersWithoutAvatar = 0;
      let usersWithPhone = 0;
      let usersWithoutPhone = 0;
      let inactive = 0;
      let neverLoggedIn = 0;
      filteredUsers.forEach((user) => {
        if (user.gender === 0) byGender.male++;
        else if (user.gender === 1) byGender.female++;
        else byGender.other++;
        if (user.avatar) usersWithAvatar++;
        else usersWithoutAvatar++;
        if (user.phoneNumber && user.phoneNumber.trim() !== '') usersWithPhone++;
        else usersWithoutPhone++;
        if (user.dateOfBirth) {
          try {
            const birthDate = new Date(user.dateOfBirth);
            const age = now.getFullYear() - birthDate.getFullYear();
            if (age > 0 && age < 100) {
              totalAge += age;
              ageCount++;
            }
          } catch (e) {
          }
        }
      });
      const averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : undefined;
      return {
        total: filteredUsers.length,
        byRole,
        newThisMonth,
        active,
        inactive,
        neverLoggedIn,
        byGender,
        averageAge,
        usersWithAvatar,
        usersWithoutAvatar,
        usersWithPhone,
        usersWithoutPhone,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return getDefaultUserStats();
    }
  }
  async getUserGrowthData(): Promise<UserGrowthData[]> {
    try {
      const { users } = await adminService.getAccountList(1, 1000);
      const monthlyData: Record<string, { total: number; students: number; lecturers: number }> = {};
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[currentMonthKey] = { total: 0, students: 0, lecturers: 0 };
      users.forEach((user) => {
        monthlyData[currentMonthKey].total++;
        if (user.role === ROLES.STUDENT) monthlyData[currentMonthKey].students++;
        if (user.role === ROLES.LECTURER) monthlyData[currentMonthKey].lecturers++;
      });
      return Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          ...data,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      return [];
    }
  }
  async getDetailedUserStats(): Promise<UserStats> {
    return this.getUserStats();
  }
}
export const userStatsService = new UserStatsService();