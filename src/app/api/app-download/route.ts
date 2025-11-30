/**
 * API Route for App Download Link Management
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/db';
import AppDownloadLink from '@/lib/mongodb/models/AppDownloadLink';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

/**
 * GET - Lấy link download hiện tại (active)
 */
export async function GET() {
  try {
    await connectDB();

    // Tìm document active mới nhất (chỉ có 1 document active tại một thời điểm)
    const link = await AppDownloadLink.findOne({ isActive: true }).sort({ createdAt: -1 });

    if (!link) {
      return NextResponse.json(
        {
          statusCode: 404,
          isSuccess: false,
          errorMessages: ['No download link found'],
          result: null,
        },
        { status: 404 }
      );
    }

    const result = {
      id: link._id.toString(),
      downloadUrl: link.downloadUrl,
      appName: link.appName,
      version: link.version,
      description: link.description,
      isActive: link.isActive,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      createdBy: link.createdBy,
    };

    return NextResponse.json({
      statusCode: 200,
      isSuccess: true,
      errorMessages: [],
      result,
    });
  } catch (error: any) {
    console.error('Error getting download link:', error);
    return NextResponse.json(
      {
        statusCode: 500,
        isSuccess: false,
        errorMessages: [error.message || 'Failed to get download link'],
        result: null,
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Lưu hoặc cập nhật link download
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { downloadUrl, appName, version, description, isActive = true, createdBy } = body;

    // Validation
    if (!downloadUrl || !appName) {
      return NextResponse.json(
        {
          statusCode: 400,
          isSuccess: false,
          errorMessages: ['downloadUrl and appName are required'],
          result: null,
        },
        { status: 400 }
      );
    }

    // Tìm document active hiện tại
    const existingLink = await AppDownloadLink.findOne({ isActive: true }).sort({ createdAt: -1 });

    // Check if this is a new version (different version or different downloadUrl)
    const isNewVersion = existingLink && (
      existingLink.version !== version || 
      existingLink.downloadUrl !== downloadUrl
    );

    if (existingLink && isNewVersion) {
      // Deactivate old version to create history
      existingLink.isActive = false;
      await existingLink.save();
    }

    const updateData: any = {
      downloadUrl,
      appName,
      isActive: true, // Always set to true for new version
      ...(version && { version }),
      ...(description && { description }),
      ...(createdBy && { createdBy }),
    };

    let link;

    if (existingLink && !isNewVersion) {
      // Update existing document if same version and same URL
      existingLink.set(updateData);
      link = await existingLink.save();
    } else {
      // Create new document (either first time or new version)
      link = await AppDownloadLink.create(updateData);
    }

    const result = {
      id: link._id.toString(),
      downloadUrl: link.downloadUrl,
      appName: link.appName,
      version: link.version,
      description: link.description,
      isActive: link.isActive,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      createdBy: link.createdBy,
    };

    return NextResponse.json({
      statusCode: 200,
      isSuccess: true,
      errorMessages: [],
      result,
    });
  } catch (error: any) {
    console.error('Error saving download link:', error);
    return NextResponse.json(
      {
        statusCode: 500,
        isSuccess: false,
        errorMessages: [error.message || 'Failed to save download link'],
        result: null,
      },
      { status: 500 }
    );
  }
}

