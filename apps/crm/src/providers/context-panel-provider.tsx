"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

// Panel content types with discriminated unions for type safety
export type PanelContentType = "booking" | "customer" | "tour" | "guide";

export type PanelContent =
  | { type: "booking"; id: string; data?: BookingPreviewData }
  | { type: "customer"; id: string; data?: CustomerPreviewData }
  | { type: "tour"; id: string; data?: TourPreviewData }
  | { type: "guide"; id: string; data?: GuidePreviewData }
  | { type: null; id: null; data?: undefined };

// Preview data types (minimal data for immediate display, full data fetched by panel)
export interface BookingPreviewData {
  referenceNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  totalParticipants: number;
  customer?: {
    firstName: string;
    lastName: string;
    email?: string | null;
  };
  tour?: {
    name: string;
  };
  schedule?: {
    startsAt: Date;
  };
}

export interface CustomerPreviewData {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

export interface TourPreviewData {
  name: string;
  status: string;
  duration: number;
  basePrice: string;
}

export interface GuidePreviewData {
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
}

interface ContextPanelContextType {
  isOpen: boolean;
  content: PanelContent;
  openPanel: (content: Exclude<PanelContent, { type: null }>) => void;
  closePanel: () => void;
  togglePanel: (content: Exclude<PanelContent, { type: null }>) => void;
  /** Last opened content, for reopening with keyboard shortcut */
  lastContent: PanelContent | null;
}

const ContextPanelContext = createContext<ContextPanelContextType | null>(null);

export function ContextPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<PanelContent>({ type: null, id: null });
  const [lastContent, setLastContent] = useState<PanelContent | null>(null);

  const openPanel = useCallback((newContent: Exclude<PanelContent, { type: null }>) => {
    setContent(newContent);
    setLastContent(newContent);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    // Delay clearing content to allow exit animation
    setTimeout(() => {
      setContent({ type: null, id: null });
    }, 200);
  }, []);

  const togglePanel = useCallback((newContent: Exclude<PanelContent, { type: null }>) => {
    // If clicking the same item, close the panel
    if (isOpen && content.type === newContent.type && content.id === newContent.id) {
      closePanel();
    } else {
      openPanel(newContent);
    }
  }, [isOpen, content, openPanel, closePanel]);

  // Keyboard shortcut: Cmd+. or Ctrl+. to toggle panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+. or Ctrl+. to toggle context panel
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();

        if (isOpen) {
          // Close the panel
          closePanel();
        } else if (lastContent && lastContent.type !== null) {
          // Reopen with last content
          openPanel(lastContent as Exclude<PanelContent, { type: null }>);
        }
        // If no last content, do nothing (nothing to reopen)
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, lastContent, openPanel, closePanel]);

  return (
    <ContextPanelContext.Provider value={{ isOpen, content, openPanel, closePanel, togglePanel, lastContent }}>
      {children}
    </ContextPanelContext.Provider>
  );
}

export function useContextPanel() {
  const context = useContext(ContextPanelContext);
  if (!context) {
    throw new Error("useContextPanel must be used within a ContextPanelProvider");
  }
  return context;
}
