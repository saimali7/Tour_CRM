"use client";

import Image from "next/image";
import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  images: string[];
  title: string;
  index: number;
  open: boolean;
  onClose: () => void;
  onChange: (index: number) => void;
}

export function Lightbox({ images, title, index, open, onClose, onChange }: LightboxProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((index + 1) % images.length);
      if (event.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, index, images.length, onChange, onClose]);

  if (!open || images.length === 0) return null;

  const current = images[index] || images[0]!;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl p-4 sm:p-6 animate-fade-in flex flex-col" role="dialog" aria-modal="true" aria-label="Image viewer">
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto mb-4 relative z-10">
        <p className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
          {index + 1} / {images.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-2 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-sm"
          aria-label="Close image viewer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex flex-1 w-full max-w-7xl items-center justify-center relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange((index - 1 + images.length) % images.length); }}
          className="absolute left-2 sm:left-4 z-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-3 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-lg"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>

        <div className="relative h-full max-h-[85vh] w-full overflow-hidden rounded-2xl shadow-2xl">
          <Image
            src={current}
            alt={`${title} image ${index + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange((index + 1) % images.length); }}
          className="absolute right-2 sm:right-4 z-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-3 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-lg"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>
      </div>
    </div>
  );
}
