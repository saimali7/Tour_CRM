"use client";

import { MotionProvider } from "@/components/ui/motion";
import { AnnouncerProvider, SkipLink } from "@/components/ui/accessibility";

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

/**
 * Client-side wrapper that provides accessibility features:
 * - SkipLink for keyboard navigation
 * - MotionProvider for reduced motion preferences
 * - AnnouncerProvider for screen reader announcements
 */
export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  return (
    <MotionProvider>
      <AnnouncerProvider>
        <SkipLink targetId="main-content" />
        {children}
      </AnnouncerProvider>
    </MotionProvider>
  );
}
