"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UnsavedChangesGuardProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function UnsavedChangesGuard({
  hasUnsavedChanges,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UnsavedChangesGuardProps) {
  // Handle browser/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  // Handle Next.js navigation
  useEffect(() => {
    const handleRouteChange = () => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(message);
        if (!confirmed) {
          throw new Error("Route change aborted");
        }
      }
    };

    // Listen for link clicks within the app
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && anchor.href && !anchor.href.startsWith("javascript:")) {
        const isSameOrigin = anchor.href.startsWith(window.location.origin);

        if (isSameOrigin && hasUnsavedChanges) {
          const confirmed = window.confirm(message);
          if (!confirmed) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [hasUnsavedChanges, message]);

  return null;
}

// Hook version for more control
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const message = "You have unsaved changes. Are you sure you want to leave?";

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const confirmNavigation = useCallback(() => {
    if (hasUnsavedChanges) {
      return window.confirm(message);
    }
    return true;
  }, [hasUnsavedChanges]);

  return { confirmNavigation };
}
