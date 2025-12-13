"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}

export function SlideOver({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "right",
  className,
}: SlideOverProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn("overflow-y-auto", className)}>
        <SheetHeader className="mb-4">
          <SheetTitle>{title || " "}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

// Context for managing slide-over state globally
interface SlideOverContextValue {
  open: (content: React.ReactNode, options?: { title?: string; description?: string }) => void;
  close: () => void;
}

const SlideOverContext = React.createContext<SlideOverContextValue | null>(null);

export function useSlideOver() {
  const context = React.useContext(SlideOverContext);
  if (!context) {
    throw new Error("useSlideOver must be used within a SlideOverProvider");
  }
  return context;
}

interface SlideOverProviderProps {
  children: React.ReactNode;
}

export function SlideOverProvider({ children }: SlideOverProviderProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [content, setContent] = React.useState<React.ReactNode>(null);
  const [title, setTitle] = React.useState<string | undefined>();
  const [description, setDescription] = React.useState<string | undefined>();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = React.useCallback(
    (
      newContent: React.ReactNode,
      options?: { title?: string; description?: string }
    ) => {
      // Clear any pending close timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setContent(newContent);
      setTitle(options?.title);
      setDescription(options?.description);
      setIsOpen(true);
    },
    []
  );

  const close = React.useCallback(() => {
    setIsOpen(false);
    // Clear content after animation
    timeoutRef.current = setTimeout(() => {
      setContent(null);
      setTitle(undefined);
      setDescription(undefined);
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <SlideOverContext.Provider value={{ open, close }}>
      {children}
      <SlideOver
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={title}
        description={description}
      >
        {content}
      </SlideOver>
    </SlideOverContext.Provider>
  );
}
