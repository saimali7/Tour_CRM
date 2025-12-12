import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Storage bucket name for tour images
const BUCKET_NAME = "tour-images";

export interface UploadResult {
  url: string;
  path: string;
}

export interface StorageError {
  message: string;
  code?: string;
}

/**
 * Storage service for handling file uploads to Supabase Storage
 * Organization-scoped: files are stored in {bucket}/{organizationId}/ paths
 */
export class StorageService {
  private supabase: SupabaseClient;
  private organizationId: string;

  constructor(organizationId: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL and Service Role Key must be set");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.organizationId = organizationId;
  }

  /**
   * Upload a file to Supabase Storage
   * Files are stored under: {bucket}/{organizationId}/{folder}/{filename}
   */
  async upload(
    file: File | Blob,
    options: {
      folder?: string;
      filename?: string;
      contentType?: string;
    } = {}
  ): Promise<UploadResult> {
    const { folder = "images", filename, contentType } = options;

    // Generate unique filename if not provided
    const uniqueFilename = filename || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const extension = this.getFileExtension(file, contentType);
    const fullFilename = extension && !uniqueFilename.includes(".")
      ? `${uniqueFilename}.${extension}`
      : uniqueFilename;

    // Construct storage path: {orgId}/{folder}/{filename}
    const storagePath = `${this.organizationId}/${folder}/${fullFilename}`;

    const { data, error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: contentType || (file instanceof File ? file.type : undefined),
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  }

  /**
   * Upload multiple files
   */
  async uploadMany(
    files: Array<File | Blob>,
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

    const { error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
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

    const { error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string = "images"): Promise<Array<{
    name: string;
    url: string;
    path: string;
    createdAt: string;
    size: number;
  }>> {
    const folderPath = `${this.organizationId}/${folder}`;

    const { data, error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (error) {
      throw new Error(`List failed: ${error.message}`);
    }

    return (data || []).map((file) => {
      const filePath = `${folderPath}/${file.name}`;
      const { data: urlData } = this.supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        name: file.name,
        url: urlData.publicUrl,
        path: filePath,
        createdAt: file.created_at || "",
        size: file.metadata?.size || 0,
      };
    });
  }

  /**
   * Extract file path from a public URL
   */
  extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      return pathMatch?.[1] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get file extension from file or content type
   */
  private getFileExtension(file: File | Blob, contentType?: string): string | null {
    const mimeType = contentType || (file instanceof File ? file.type : null);

    if (!mimeType) return null;

    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
    };

    return mimeToExt[mimeType] || null;
  }
}

/**
 * Create a storage service instance for an organization
 */
export function createStorageService(organizationId: string): StorageService {
  return new StorageService(organizationId);
}
