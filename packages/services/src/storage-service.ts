import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./lib/logger";

// Default bucket name
const DEFAULT_BUCKET = "tour-images";

export interface UploadResult {
  url: string;
  path: string;
}

export interface StorageError {
  message: string;
  code?: string;
}

export interface FileInfo {
  name: string;
  url: string;
  path: string;
  createdAt: string;
  size: number;
}

export interface S3Config {
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  region?: string;
  publicUrl?: string;
}

/**
 * Get S3 configuration from environment variables
 */
function getS3Config(): S3Config {
  return {
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET || DEFAULT_BUCKET,
    region: process.env.S3_REGION || "us-east-1",
    publicUrl: process.env.S3_PUBLIC_URL,
  };
}

/**
 * Create an S3 client with the provided or environment configuration
 */
function createS3Client(config?: S3Config): S3Client {
  const cfg = config || getS3Config();

  if (!cfg.endpoint || !cfg.accessKey || !cfg.secretKey) {
    throw new Error(
      "S3 storage not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY environment variables."
    );
  }

  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region || "us-east-1",
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
    forcePathStyle: true, // Required for MinIO and other S3-compatible services
  });
}

/**
 * Storage service for handling file uploads to S3-compatible storage (MinIO/AWS S3)
 * Organization-scoped: files are stored in {bucket}/{organizationId}/ paths
 */
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;
  private organizationId: string;

  constructor(organizationId: string, config?: S3Config) {
    const cfg = config || getS3Config();
    this.s3 = createS3Client(cfg);
    this.bucket = cfg.bucket || DEFAULT_BUCKET;
    this.publicUrl = cfg.publicUrl || cfg.endpoint || "";
    this.organizationId = organizationId;
  }

  /**
   * Upload a file to S3/MinIO storage
   * Files are stored under: {bucket}/{organizationId}/{folder}/{filename}
   */
  async upload(
    file: File | Blob | Buffer | Uint8Array,
    options: {
      folder?: string;
      filename?: string;
      contentType?: string;
    } = {}
  ): Promise<UploadResult> {
    const { folder = "images", filename, contentType } = options;

    // Generate unique filename if not provided
    const uniqueFilename =
      filename || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const extension = this.getFileExtension(file, contentType);
    const fullFilename =
      extension && !uniqueFilename.includes(".")
        ? `${uniqueFilename}.${extension}`
        : uniqueFilename;

    // Construct storage path: {orgId}/{folder}/{filename}
    const storagePath = `${this.organizationId}/${folder}/${fullFilename}`;

    // Convert file to buffer if needed
    let body: Buffer | Uint8Array;
    if (file instanceof Blob || file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      body = Buffer.from(arrayBuffer);
    } else {
      body = file;
    }

    // Determine content type
    const mimeType =
      contentType || (file instanceof File ? file.type : "application/octet-stream");

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
        Body: body,
        ContentType: mimeType,
      })
    );

    // Construct public URL
    const url = this.getPublicUrl(storagePath);

    return {
      url,
      path: storagePath,
    };
  }

  /**
   * Upload multiple files
   */
  async uploadMany(
    files: Array<File | Blob | Buffer>,
    options: {
      folder?: string;
    } = {}
  ): Promise<UploadResult[]> {
    const results = await Promise.all(
      files.map((file) => this.upload(file, options))
    );
    return results;
  }

  /**
   * Delete a file from storage
   */
  async delete(path: string): Promise<void> {
    // Ensure path starts with org folder (security)
    if (!path.startsWith(`${this.organizationId}/`)) {
      throw new Error("Cannot delete files outside organization folder");
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
      })
    );
  }

  /**
   * Delete multiple files
   */
  async deleteMany(paths: string[]): Promise<void> {
    // Verify all paths belong to organization
    for (const path of paths) {
      if (!path.startsWith(`${this.organizationId}/`)) {
        throw new Error("Cannot delete files outside organization folder");
      }
    }

    if (paths.length === 0) return;

    await this.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: paths.map((path) => ({ Key: path })),
        },
      })
    );
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    // Security: Ensure path belongs to this organization
    if (!path.startsWith(`${this.organizationId}/`)) {
      throw new Error("Cannot access files outside organization folder");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    const signedUrl = await getSignedUrl(this.s3, command, {
      expiresIn,
    });

    return signedUrl;
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string = "images"): Promise<FileInfo[]> {
    const prefix = `${this.organizationId}/${folder}/`;

    const response = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    );

    const files: FileInfo[] = (response.Contents || []).map((object) => {
      const key = object.Key || "";
      const name = key.split("/").pop() || key;

      return {
        name,
        url: this.getPublicUrl(key),
        path: key,
        createdAt: object.LastModified?.toISOString() || "",
        size: object.Size || 0,
      };
    });

    return files;
  }

  /**
   * Check if storage is configured and accessible
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      await this.s3.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        })
      );
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the public URL for a file path
   */
  getPublicUrl(path: string): string {
    // Use configured public URL (CDN) or construct from endpoint
    const baseUrl = this.publicUrl.replace(/\/$/, "");
    return `${baseUrl}/${this.bucket}/${path}`;
  }

  /**
   * Extract file path from a public URL
   */
  extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Handle both /bucket/path and just /path formats
      const pathname = urlObj.pathname;
      const bucketPrefix = `/${this.bucket}/`;
      if (pathname.startsWith(bucketPrefix)) {
        return pathname.slice(bucketPrefix.length);
      }
      return pathname.slice(1); // Remove leading slash
    } catch (error) {
      logger.debug({ err: error, url }, "Failed to extract path from URL");
      return null;
    }
  }

  /**
   * Get file extension from file or content type
   */
  private getFileExtension(
    file: File | Blob | Buffer | Uint8Array,
    contentType?: string
  ): string | null {
    const mimeType = contentType || (file instanceof File ? file.type : null);

    if (!mimeType) return null;

    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "application/json": "json",
    };

    return mimeToExt[mimeType] || null;
  }
}

/**
 * Create a storage service instance for an organization
 */
export function createStorageService(
  organizationId: string,
  config?: S3Config
): StorageService {
  return new StorageService(organizationId, config);
}

/**
 * Check if S3/MinIO storage is configured
 */
export function isStorageConfigured(): boolean {
  const cfg = getS3Config();
  return !!cfg.endpoint && !!cfg.accessKey && !!cfg.secretKey;
}

/**
 * Perform a health check on the S3/MinIO storage
 */
export async function checkStorageHealth(): Promise<{
  healthy: boolean;
  message?: string;
  latency?: number;
}> {
  if (!isStorageConfigured()) {
    return { healthy: false, message: "S3 storage not configured" };
  }

  const startTime = Date.now();

  try {
    const cfg = getS3Config();
    const s3 = createS3Client(cfg);

    await s3.send(
      new HeadBucketCommand({
        Bucket: cfg.bucket || DEFAULT_BUCKET,
      })
    );

    return {
      healthy: true,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : "Unknown error",
      latency: Date.now() - startTime,
    };
  }
}
