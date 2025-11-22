/**
 * Service to manage App Download Link using MongoDB via Next.js API Routes
 */

import { apiService } from '@/services/api';
import { API_ENDPOINTS } from '@/lib/constants';

export interface AppDownloadLink {
  id?: string;
  downloadUrl: string; // Direct download link from uploaded file
  appName: string;
  version?: string;
  fileSize?: string; // e.g., "100MB"
  description?: string;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string; // User ID
}

interface ApiResponse<T> {
  statusCode: number;
  isSuccess: boolean;
  errorMessages?: string[];
  result: T;
}

/**
 * Helper function to call internal API routes (no baseURL)
 */
async function callInternalApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      response: {
        status: response.status,
        data: errorData,
      },
      message: errorData.errorMessages?.join(', ') || 'Request failed',
    };
  }

  return response.json();
}

export class AppDownloadService {
  /**
   * Get current active download link
   */
  async getCurrentDownloadLink(): Promise<AppDownloadLink | null> {
    try {
      const response = await callInternalApi<AppDownloadLink | null>(
        API_ENDPOINTS.APP_DOWNLOAD.GET_CURRENT
      );

      if (response.isSuccess && response.result) {
        // Convert date strings to Date objects if needed
        const link = response.result;
        return {
          ...link,
          createdAt: link.createdAt ? new Date(link.createdAt) : undefined,
          updatedAt: link.updatedAt ? new Date(link.updatedAt) : undefined,
        } as AppDownloadLink;
      }

      return null;
    } catch (error: any) {
      console.error('Error getting download link:', error);
      
      // If 404, it means no configuration exists yet - return null instead of throwing
      if (error?.response?.status === 404) {
        return null;
      }
      
      throw new Error(error?.response?.data?.errorMessages?.join(', ') || 'Failed to get download link');
    }
  }

  /**
   * Save or update download link
   */
  async saveDownloadLink(
    linkData: Omit<AppDownloadLink, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AppDownloadLink> {
    try {
      const response = await callInternalApi<AppDownloadLink>(
        API_ENDPOINTS.APP_DOWNLOAD.SAVE,
        {
          method: 'POST',
          body: JSON.stringify(linkData),
        }
      );

      if (response.isSuccess && response.result) {
        const saved = response.result;
        return {
          ...saved,
          createdAt: saved.createdAt ? new Date(saved.createdAt) : new Date(),
          updatedAt: saved.updatedAt ? new Date(saved.updatedAt) : new Date(),
        } as AppDownloadLink;
      }

      throw new Error(
        response.errorMessages?.join(', ') || 'Failed to save download link'
      );
    } catch (error: any) {
      console.error('Error saving download link:', error);
      
      const errorMessage = 
        error?.response?.data?.errorMessages?.join(', ') || 
        error?.message || 
        'Failed to save download link. Please try again.';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get version history
   */
  async getVersionHistory(): Promise<AppDownloadLink[]> {
    try {
      const response = await callInternalApi<AppDownloadLink[]>(
        API_ENDPOINTS.APP_DOWNLOAD.HISTORY
      );

      if (response.isSuccess && response.result) {
        // Convert date strings to Date objects
        return response.result.map((link) => ({
          ...link,
          createdAt: link.createdAt ? new Date(link.createdAt) : new Date(),
          updatedAt: link.updatedAt ? new Date(link.updatedAt) : new Date(),
        }));
      }

      return [];
    } catch (error: any) {
      console.error('Error getting version history:', error);
      
      // If 404, return empty array instead of throwing
      if (error?.response?.status === 404) {
        return [];
      }
      
      throw new Error(
        error?.response?.data?.errorMessages?.join(', ') || 'Failed to get version history'
      );
    }
  }

  /**
   * Convert Google Drive share link to direct download link
   */
  convertGoogleDriveLink(shareUrl: string): { downloadUrl: string; originalUrl: string } | null {
    const { convertGoogleDriveToDirectDownload } = require('@/lib/utils');
    const downloadUrl = convertGoogleDriveToDirectDownload(shareUrl);
    
    if (!downloadUrl) {
      return null;
    }
    
    return {
      downloadUrl,
      originalUrl: shareUrl,
    };
  }
}

export const appDownloadService = new AppDownloadService();

