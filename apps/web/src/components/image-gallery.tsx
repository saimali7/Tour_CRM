"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Lightbox } from "@/components/lightbox";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (safeImages.length === 0) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-stone-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
          <p className="text-sm font-medium">Photos coming soon</p>
        </div>
      </div>
    );
  }

  const activeImage = safeImages[activeIndex] || safeImages[0]!;

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          className="group relative block aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-muted"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open image gallery"
        >
          <Image
            src={activeImage}
            alt={`${title} image ${activeIndex + 1}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            quality={55}
            sizes="(max-width: 1024px) 100vw, 66vw"
          />
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-1 text-xs text-white backdrop-blur">
            {activeIndex + 1} / {safeImages.length}
          </span>
        </button>

        {safeImages.length > 1 && (
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 md:grid md:grid-cols-5 md:overflow-visible">
            {safeImages.slice(0, 10).map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-[4/3] w-24 flex-none snap-start overflow-hidden rounded-lg border transition md:w-auto ${index === activeIndex
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-border hover:border-primary/50"
                  }`}
                aria-label={`Preview image ${index + 1}`}
              >
                <Image
                  src={image}
                  alt={`${title} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  quality={55}
                  sizes="(max-width: 1024px) 30vw, 16vw"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        images={safeImages}
        title={title}
        index={activeIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onChange={setActiveIndex}
      />
    </>
  );
}
