"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send, X } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-media-query";
import { GuideForm } from "./guide-form";

const FORM_ID = "guide-creator-form";

interface GuideCreatorProps {
  guide?: Parameters<typeof GuideForm>[0]["guide"];
  onSuccess?: () => void;
}

export function GuideCreator({ guide, onSuccess }: GuideCreatorProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [showMobileActions, setShowMobileActions] = useState(false);
  const isEditing = !!guide;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Sticky Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors touch-target"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                {isEditing ? "Edit Guide" : "Add Guide"}
              </h1>
              {isEditing && guide && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {guide.firstName} {guide.lastName}
                </p>
              )}
              {!isEditing && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Create a new guide profile
                </p>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={FORM_ID}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" />
              {isEditing ? "Update Guide" : "Create Guide"}
            </button>
          </div>

          {/* Mobile Save Button */}
          <button
            type="button"
            onClick={() => setShowMobileActions(true)}
            className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground touch-target"
            aria-label="Save options"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <GuideForm
            guide={guide}
            onSuccess={onSuccess}
            formId={FORM_ID}
            hideActions
          />
        </div>
      </div>

      {/* Mobile Actions Sheet */}
      {showMobileActions && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileActions(false)}
          />

          <div className="mobile-sheet">
            <div className="mobile-sheet-handle" />

            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {isEditing ? "Save Guide" : "Create Guide"}
                </h3>
                <button
                  onClick={() => setShowMobileActions(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors touch-target"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <button
                type="submit"
                form={FORM_ID}
                onClick={() => setShowMobileActions(false)}
                className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Send className="h-5 w-5" />
                {isEditing ? "Update Guide" : "Create Guide"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileActions(false);
                  router.back();
                }}
                className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
