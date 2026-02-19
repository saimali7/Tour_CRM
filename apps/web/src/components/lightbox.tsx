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
    <div className="fixed inset-0 z-[80] bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Close image viewer"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-full max-w-6xl items-center justify-center">
        <button
          type="button"
          onClick={() => onChange((index - 1 + images.length) % images.length)}
          className="mr-2 hidden rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:inline-flex"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="relative h-[78vh] w-full overflow-hidden rounded-xl border border-white/20">
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
          onClick={() => onChange((index + 1) % images.length)}
          className="ml-2 hidden rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:inline-flex"
          aria-label="Next image"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
        {index + 1} / {images.length}
      </p>
    </div>
  );
}
