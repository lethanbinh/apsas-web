import { ROLES } from '@/lib/constants';
import { adminService } from '../adminService';
import type { UserStats, UserGrowthData } from './types';
import { getDefaultUserStats } from './defaultStats';

export class UserStatsService {
  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      // Fetch all users (with pagination if needed)
      const { users, total } = await adminService.getAccountList(1, 1000);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const byRole = {
        admin: 0,
        lecturer: 0,
        student: 0,
        hod: 0,
      };

      let newThisMonth = 0;
      let active = 0;

      // Filter out examiner accounts (role 4) before counting
      const filteredUsers = users.filter((user) => user.role !== 4);

      filteredUsers.forEach((user) => {
        // Count by role
        if (user.role === ROLES.ADMIN) byRole.admin++;
        else if (user.role === ROLES.LECTURER) byRole.lecturer++;
        else if (user.role === ROLES.STUDENT) byRole.student++;
        else if (user.role === ROLES.HOD) byRole.hod++;

        // Count active (assuming all users in list are active)
        active++;
      });

      // Note: newThisMonth calculation would require createdAt field in User interface
      // For now, we'll set it to 0 or calculate from a different source if available

      // Calculate detailed stats
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
        // Count by gender
        if (user.gender === 0) byGender.male++;
        else if (user.gender === 1) byGender.female++;
        else byGender.other++;

        // Count avatars
        if (user.avatar) usersWithAvatar++;
        else usersWithoutAvatar++;

        // Count phone numbers
        if (user.phoneNumber && user.phoneNumber.trim() !== '') usersWithPhone++;
        else usersWithoutPhone++;

        // Calculate age if dateOfBirth is available
        if (user.dateOfBirth) {
          try {
            const birthDate = new Date(user.dateOfBirth);
            const age = now.getFullYear() - birthDate.getFullYear();
            if (age > 0 && age < 100) {
              totalAge += age;
              ageCount++;
            }
          } catch (e) {
            // Invalid date
          }
        }

        // Note: inactive and neverLoggedIn would require lastLoginDate field
        // For now, we'll set them to 0 or calculate from a different source if available
      });

      const averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : undefined;

      return {
        total: filteredUsers.length, // Exclude examiner accounts from total
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

      // Group by month
      // Note: Since User interface doesn't have createdAt, we'll use current month as placeholder
      // In production, this should be calculated from actual createdAt timestamps
      const monthlyData: Record<string, { total: number; students: number; lecturers: number }> = {};
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Aggregate all users into current month (since we don't have createdAt)
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
        .slice(-12); // Last 12 months
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      return [];
    }
  }

  /**
   * Get detailed user statistics
   */
  async getDetailedUserStats(): Promise<UserStats> {
    return this.getUserStats();
  }
}

export const userStatsService = new UserStatsService();

