"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  Save,
  AlertCircle,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default function BrandingPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: organization, isLoading } = trpc.organization.get.useQuery();
  const utils = trpc.useUtils();

  const updateBrandingMutation = trpc.organization.updateBranding.useMutation({
    onSuccess: () => {
      utils.organization.get.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save branding");
    },
  });

  const [brandingForm, setBrandingForm] = useState({
    logoUrl: "",
    primaryColor: "#0f766e",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  // Initialize form when data loads
  useEffect(() => {
    if (organization) {
      setBrandingForm({
        logoUrl: organization.logoUrl || "",
        primaryColor: organization.primaryColor || "#0f766e",
      });
      if (organization.logoUrl) {
        setLogoPreview(organization.logoUrl);
      }
    }
  }, [organization]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setUploadError("");

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size must be less than 2MB");
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setBrandingForm((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setBrandingForm((prev) => ({ ...prev, logoUrl: "" }));
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // For logoUrl, if it starts with "data:", it's a base64 image
    // Otherwise, it's a URL - both are valid
    updateBrandingMutation.mutate({
      logoUrl: brandingForm.logoUrl || undefined,
      primaryColor: brandingForm.primaryColor,
    });
  };

  const isSubmitting = updateBrandingMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branding</h1>
          <p className="text-muted-foreground mt-1">Customize your brand appearance</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Branding saved successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Logo Section */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Logo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your company logo to personalize emails and booking pages
            </p>
          </div>

          {/* File Upload Area */}
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {!logoPreview ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, SVG up to 2MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-h-32 max-w-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLogo();
                      }}
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            {/* Fallback URL Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Or enter logo URL
              </label>
              <input
                type="url"
                value={brandingForm.logoUrl.startsWith("data:") ? "" : brandingForm.logoUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  setBrandingForm((prev) => ({ ...prev, logoUrl: url }));
                  if (url) {
                    setLogoPreview(url);
                  }
                }}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Logo Preview Sizes */}
          {logoPreview && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-4">Preview Sizes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Original</p>
                  <div className="bg-muted rounded-lg p-6 flex items-center justify-center min-h-[120px]">
                    <img
                      src={logoPreview}
                      alt="Logo original size"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Thumbnail (emails)</p>
                  <div className="bg-muted rounded-lg p-6 flex items-center justify-center min-h-[120px]">
                    <img
                      src={logoPreview}
                      alt="Logo thumbnail"
                      className="max-h-12 max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Colors Section */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Colors</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Define your brand colors for a consistent look
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Primary Color
            </label>
            <div className="flex gap-3 items-start">
              <input
                type="color"
                value={brandingForm.primaryColor}
                onChange={(e) =>
                  setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
                className="h-12 w-20 rounded-lg border border-input cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={brandingForm.primaryColor}
                  onChange={(e) =>
                    setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#0f766e"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for buttons, links, and accents
                </p>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Color Preview</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div
                    className="h-16 rounded-lg border border-border"
                    style={{ backgroundColor: brandingForm.primaryColor }}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">100%</p>
                </div>
                <div className="flex-1">
                  <div
                    className="h-16 rounded-lg border border-border"
                    style={{ backgroundColor: brandingForm.primaryColor, opacity: 0.7 }}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">70%</p>
                </div>
                <div className="flex-1">
                  <div
                    className="h-16 rounded-lg border border-border"
                    style={{ backgroundColor: brandingForm.primaryColor, opacity: 0.3 }}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">30%</p>
                </div>
              </div>
            </div>

            {/* Sample Button */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Button Preview</p>
              <button
                type="button"
                className="px-6 py-2 rounded-lg text-white font-medium transition-colors"
                style={{
                  backgroundColor: brandingForm.primaryColor,
                }}
                onMouseEnter={(e) => {
                  const color = brandingForm.primaryColor;
                  e.currentTarget.style.backgroundColor = `${color}dd`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = brandingForm.primaryColor;
                }}
              >
                Sample Button
              </button>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            See how your branding appears in booking confirmations
          </p>

          {/* Mock Email Preview */}
          <div className="bg-muted/50 rounded-lg p-6 border border-border">
            <div className="bg-white rounded-lg shadow-sm max-w-2xl mx-auto overflow-hidden">
              {/* Email Header */}
              <div
                className="p-6 border-b"
                style={{
                  backgroundColor: `${brandingForm.primaryColor}10`,
                  borderBottomColor: `${brandingForm.primaryColor}20`
                }}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="h-12 object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Your logo will appear here</span>
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Booking Confirmed!
                </h3>
                <p className="text-sm text-gray-600">
                  Thank you for your booking. Here are the details:
                </p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tour:</span>
                    <span className="font-medium text-gray-900">City Walking Tour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">Jan 15, 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-900">10:00 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Guests:</span>
                    <span className="font-medium text-gray-900">2 adults</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full px-6 py-3 rounded-lg text-white font-medium text-sm"
                  style={{ backgroundColor: brandingForm.primaryColor }}
                >
                  View Booking Details
                </button>

                <p className="text-xs text-gray-500 text-center pt-2">
                  We look forward to seeing you!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Branding
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
