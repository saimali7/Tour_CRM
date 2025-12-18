import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createStorageService } from "@tour/services";
import { config } from "@tour/config";

/**
 * Allowed upload folders - whitelist to prevent path traversal attacks
 * SECURITY: Only these folder paths are allowed for uploads
 */
const ALLOWED_FOLDERS = [
  "images",
  "tours",
  "tours/covers",
  "avatars",
  "documents",
  "waivers",
] as const;

type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

function isAllowedFolder(folder: string): folder is AllowedFolder {
  // Normalize the folder path and check against whitelist
  const normalized = folder.replace(/^\/+|\/+$/g, "").toLowerCase();
  return ALLOWED_FOLDERS.includes(normalized as AllowedFolder);
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const rawFolder = (formData.get("folder") as string) || "images";

    // SECURITY: Validate folder against whitelist to prevent path traversal
    if (!isAllowedFolder(rawFolder)) {
      console.warn(`Upload rejected: Invalid folder "${rawFolder}" from org ${orgId}`);
      return NextResponse.json(
        {
          error: "Invalid upload folder",
          details: [`Folder must be one of: ${ALLOWED_FOLDERS.join(", ")}`],
        },
        { status: 400 }
      );
    }

    const folder = rawFolder;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate files
    const validationErrors: string[] = [];
    for (const file of files) {
      // Check file size
      if (file.size > config.uploads.maxImageSize) {
        validationErrors.push(
          `File "${file.name}" exceeds maximum size of ${config.uploads.maxImageSize / (1024 * 1024)}MB`
        );
      }

      // Check file type
      const allowedTypes = config.uploads.allowedImageTypes as readonly string[];
      if (!allowedTypes.includes(file.type)) {
        validationErrors.push(
          `File "${file.name}" has unsupported type "${file.type}". Allowed: ${allowedTypes.join(", ")}`
        );
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Upload files
    const storageService = createStorageService(orgId);
    const results = await storageService.uploadMany(files, { folder });

    return NextResponse.json({
      success: true,
      uploads: results,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get paths to delete
    const body = await request.json();
    const paths = body.paths as string[];

    if (!paths || paths.length === 0) {
      return NextResponse.json(
        { error: "No paths provided" },
        { status: 400 }
      );
    }

    // Delete files
    const storageService = createStorageService(orgId);
    await storageService.deleteMany(paths);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
