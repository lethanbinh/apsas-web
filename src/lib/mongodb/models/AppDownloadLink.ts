/**
 * MongoDB Model for App Download Link
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAppDownloadLink extends Document {
  downloadUrl: string;
  appName: string;
  version?: string;
  fileSize?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

const AppDownloadLinkSchema = new Schema<IAppDownloadLink>(
  {
    downloadUrl: {
      type: String,
      required: true,
    },
    appName: {
      type: String,
      required: true,
      default: 'APSAS App',
    },
    version: {
      type: String,
    },
    fileSize: {
      type: String,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
    collection: 'appDownloadLinks',
    _id: true, // Keep _id field
  }
);

// Index for faster queries
AppDownloadLinkSchema.index({ isActive: 1, createdAt: -1 });

const AppDownloadLink =
  mongoose.models.AppDownloadLink ||
  mongoose.model<IAppDownloadLink>('AppDownloadLink', AppDownloadLinkSchema);

export default AppDownloadLink;

