import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createStorageService, createServiceLogger } from "@tour/services";
import { config } from "@tour/config";
import { getOrgContext } from "@/lib/auth";

const log = createServiceLogger("upload");

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
    // Get form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const rawFolder = (formData.get("folder") as string) || "images";
    const orgSlug = formData.get("orgSlug") as string;

    // Validate org slug is provided
    if (!orgSlug) {
      return NextResponse.json(
        { error: "Organization slug is required" },
        { status: 400 }
      );
    }

    // Validate user has access to this organization
    let orgContext;
    try {
      orgContext = await getOrgContext(orgSlug);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = orgContext.organizationId;

    // SECURITY: Validate folder against whitelist to prevent path traversal
    if (!isAllowedFolder(rawFolder)) {
      log.warn({ folder: rawFolder, organizationId }, "Upload rejected: Invalid folder");
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
    const storageService = createStorageService(organizationId);
    const results = await storageService.uploadMany(files, { folder });

    return NextResponse.json({
      success: true,
      uploads: results,
    });
  } catch (error) {
    log.error({ err: error }, "Upload error");

    // Capture upload failures in Sentry
    Sentry.captureException(error, {
      tags: {
        service: "upload",
        operation: "file-upload",
      },
      extra: {
        fileCount: "unknown", // Can't access formData after error
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const paths = body.paths as string[];
    const orgSlug = body.orgSlug as string;

    // Validate org slug is provided
    if (!orgSlug) {
      return NextResponse.json(
        { error: "Organization slug is required" },
        { status: 400 }
      );
    }

    // Validate user has access to this organization
    let orgContext;
    try {
      orgContext = await getOrgContext(orgSlug);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = orgContext.organizationId;

    if (!paths || paths.length === 0) {
      return NextResponse.json(
        { error: "No paths provided" },
        { status: 400 }
      );
    }

    // Delete files
    const storageService = createStorageService(organizationId);
    await storageService.deleteMany(paths);

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Delete error");

    // Capture delete failures in Sentry
    Sentry.captureException(error, {
      tags: {
        service: "upload",
        operation: "file-delete",
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
