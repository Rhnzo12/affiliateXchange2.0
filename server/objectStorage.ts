import { v2 as cloudinary } from 'cloudinary';
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getCloudinaryFolder(): string {
    return process.env.CLOUDINARY_FOLDER || "creatorlink/videos";
  }

  getCloudinaryUploadPreset(): string {
    return process.env.CLOUDINARY_UPLOAD_PRESET || "";
  }

  /**
   * Generate Cloudinary upload signature for client-side uploads
   * This allows secure direct uploads from the browser
   */
  async getObjectEntityUploadURL(): Promise<{
    uploadUrl: string;
    uploadPreset?: string;
    signature?: string;
    timestamp?: number;
    apiKey?: string;
    folder?: string;
  }> {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = this.getCloudinaryFolder();
    const uploadPreset = this.getCloudinaryUploadPreset();

    // If upload preset is configured, use unsigned upload (simpler)
    if (uploadPreset) {
      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`,
        uploadPreset,
        folder,
      };
    }

    // Otherwise, use signed upload (more secure)
    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET || ""
    );

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`,
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    };
  }

  /**
   * Upload a file directly to Cloudinary from server
   * Used for server-side uploads
   */
  async uploadFile(
    filePath: string,
    options?: {
      folder?: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      publicId?: string;
    }
  ): Promise<any> {
    const uploadOptions = {
      folder: options?.folder || this.getCloudinaryFolder(),
      resource_type: options?.resourceType || 'auto',
      public_id: options?.publicId,
    };

    return await cloudinary.uploader.upload(filePath, uploadOptions);
  }

  /**
   * Upload a buffer directly to Cloudinary
   */
  async uploadBuffer(
    buffer: Buffer,
    options?: {
      folder?: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      publicId?: string;
    }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder || this.getCloudinaryFolder(),
          resource_type: options?.resourceType || 'auto',
          public_id: options?.publicId,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Get video URL from Cloudinary
   * Supports transformations for adaptive streaming, thumbnails, etc.
   */
  getVideoUrl(
    publicId: string,
    options?: {
      quality?: string;
      format?: string;
      transformation?: any[];
    }
  ): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      quality: options?.quality || 'auto',
      format: options?.format,
      transformation: options?.transformation,
    });
  }

  /**
   * Get video thumbnail URL
   */
  getVideoThumbnail(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 400, height: 300, crop: 'fill' },
        { quality: 'auto' },
      ],
    });
  }

  /**
   * Download object from Cloudinary and stream to response
   * Note: For public videos, clients should use direct Cloudinary URLs
   * This is mainly for private/authenticated access
   */
  async downloadObject(
    publicId: string,
    res: Response,
    cacheTtlSec: number = 3600
  ) {
    try {
      // Get the video URL
      const videoUrl = cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
      });

      // For Cloudinary, we can just redirect to the URL
      // or proxy the content if needed for access control
      res.redirect(videoUrl);
    } catch (error) {
      console.error("Error getting video URL:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  /**
   * Delete a video from Cloudinary
   */
  async deleteVideo(publicId: string): Promise<any> {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
    });
  }

  /**
   * Get video metadata from Cloudinary
   */
  async getVideoInfo(publicId: string): Promise<any> {
    return await cloudinary.api.resource(publicId, {
      resource_type: 'video',
    });
  }

  /**
   * Legacy methods for compatibility with existing code
   * These are simplified for Cloudinary
   */

  async searchPublicObject(filePath: string): Promise<any | null> {
    // With Cloudinary, we work with public_ids instead of file paths
    // This is a compatibility layer
    try {
      const info = await this.getVideoInfo(filePath);
      return info;
    } catch (error) {
      return null;
    }
  }

  async getObjectEntityFile(objectPath: string): Promise<any> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const publicId = objectPath.replace("/objects/", "");

    try {
      const info = await this.getVideoInfo(publicId);
      return info;
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Convert Cloudinary URLs to normalized paths
    if (rawPath.startsWith("https://res.cloudinary.com/")) {
      const url = new URL(rawPath);
      const pathParts = url.pathname.split('/');
      // Cloudinary URL format: /cloud_name/resource_type/upload/v123456/folder/public_id.ext
      const publicIdWithExt = pathParts.slice(-1)[0];
      const publicId = publicIdWithExt.split('.')[0];
      return `/objects/${publicId}`;
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    // Cloudinary handles access control differently
    // Public resources are accessible by default
    // For private resources, you would use authentication tokens
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: any;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    // For now, allow all access
    // In production, implement proper access control based on your requirements
    return true;
  }

  getPublicObjectSearchPaths(): Array<string> {
    // Not used with Cloudinary, but kept for compatibility
    return [this.getCloudinaryFolder()];
  }

  getPrivateObjectDir(): string {
    // Not used with Cloudinary, but kept for compatibility
    return this.getCloudinaryFolder();
  }
}
