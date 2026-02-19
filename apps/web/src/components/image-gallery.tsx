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
      <div className="relative aspect-[16/9] rounded-xl border border-dashed border-border bg-muted/50">
        <div className="absolute inset-0 flex items-center justify-center text-6xl">🗺️</div>
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
            priority
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
                className={`relative aspect-[4/3] w-24 flex-none snap-start overflow-hidden rounded-lg border transition md:w-auto ${
                  index === activeIndex
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
