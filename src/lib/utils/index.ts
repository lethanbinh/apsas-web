/**
 * Utility functions for the application
 */

/**
 * Format date to Vietnamese locale
 */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format currency to Vietnamese format
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Generate random ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Extract Google Drive file ID from share link
 */
export const extractGoogleDriveFileId = (shareUrl: string): string | null => {
  try {
    // Pattern 1: https://drive.google.com/file/d/FILE_ID/view
    // Pattern 2: https://drive.google.com/open?id=FILE_ID
    // Pattern 3: https://drive.google.com/file/d/FILE_ID
    // Pattern 4: https://drive.google.com/uc?id=FILE_ID
    
    let match = shareUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
    
    match = shareUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
    
    match = shareUrl.match(/\/uc\?id=([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting Google Drive file ID:', error);
    return null;
  }
};

/**
 * Convert Google Drive share link to direct download link
 */
export const convertGoogleDriveToDirectDownload = (shareUrl: string): string | null => {
  try {
    const fileId = extractGoogleDriveFileId(shareUrl);
    if (!fileId) {
      return null;
    }
    
    // Convert to direct download link
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  } catch (error) {
    console.error('Error converting Google Drive link:', error);
    return null;
  }
};