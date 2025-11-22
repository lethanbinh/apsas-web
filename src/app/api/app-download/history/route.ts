/**
 * API Route for App Download Link History
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/db';
import AppDownloadLink from '@/lib/mongodb/models/AppDownloadLink';

/**
 * GET - Lấy lịch sử các version (tạm thời chỉ lấy document hiện tại, có thể mở rộng sau)
 */
export async function GET() {
  try {
    await connectDB();

    // Lấy tất cả documents, sắp xếp theo createdAt descending
    const links = await AppDownloadLink.find({})
      .sort({ createdAt: -1 })
      .limit(50); // Giới hạn 50 records

    const result = links.map((link) => ({
      id: link._id.toString(),
      downloadUrl: link.downloadUrl,
      appName: link.appName,
      version: link.version,
      fileSize: link.fileSize,
      description: link.description,
      isActive: link.isActive,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      createdBy: link.createdBy,
    }));

    return NextResponse.json({
      statusCode: 200,
      isSuccess: true,
      errorMessages: [],
      result,
    });
  } catch (error: any) {
    console.error('Error getting version history:', error);
    return NextResponse.json(
      {
        statusCode: 500,
        isSuccess: false,
        errorMessages: [error.message || 'Failed to get version history'],
        result: [],
      },
      { status: 500 }
    );
  }
}

