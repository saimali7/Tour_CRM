"use client";

import Image from "next/image";
import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";

export interface GalleryMediaItem {
  type: "image" | "short";
  url: string;
  thumbnailUrl?: string | null;
  title?: string | null;
}

interface LightboxProps {
  items: GalleryMediaItem[];
  title: string;
  index: number;
  open: boolean;
  onClose: () => void;
  onChange: (index: number) => void;
}

export function Lightbox({
  items,
  title,
  index,
  open,
  onClose,
  onChange,
}: LightboxProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((index + 1) % items.length);
      if (event.key === "ArrowLeft") onChange((index - 1 + items.length) % items.length);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, index, items.length, onChange, onClose]);

  if (!open || items.length === 0) return null;

  const current = items[index] || items[0]!;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl p-4 sm:p-6 animate-fade-in flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto mb-4 relative z-10">
        <p className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
          {index + 1} / {items.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-2 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-sm"
          aria-label="Close media viewer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex flex-1 w-full max-w-7xl items-center justify-center relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange((index - 1 + items.length) % items.length);
          }}
          className="absolute left-2 sm:left-4 z-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-3 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-lg"
          aria-label="Previous media"
        >
          <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>

        <div
          className={`relative h-full max-h-[85vh] w-full overflow-hidden rounded-2xl shadow-2xl ${
            current.type === "short" ? "max-w-[420px] bg-black" : ""
          }`}
        >
          {current.type === "short" ? (
            <video
              src={current.url}
              controls
              autoPlay
              loop
              playsInline
              className="h-full w-full object-contain bg-black"
            />
          ) : (
            <Image
              src={current.url}
              alt={`${title} image ${index + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          )}

          {current.type === "short" && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
              <Play className="h-3 w-3" />
              Short
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange((index + 1) % items.length);
          }}
          className="absolute right-2 sm:right-4 z-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-3 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-lg"
          aria-label="Next media"
        >
          <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>
      </div>
    </div>
  );
}
