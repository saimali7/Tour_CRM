"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Clapperboard, Image as ImageIcon, Play } from "lucide-react";
import { Lightbox, type GalleryMediaItem } from "@/components/lightbox";

interface ImageGalleryProps {
  images?: string[];
  media?: Array<{
    type?: "image" | "short";
    url?: string;
    thumbnailUrl?: string | null;
    title?: string | null;
  }>;
  title: string;
}

export function ImageGallery({ images = [], media = [], title }: ImageGalleryProps) {
  const allItems = useMemo<GalleryMediaItem[]>(() => {
    const cleanedMedia = media
      .filter((item) => item?.url)
      .map<GalleryMediaItem>((item) => ({
        type: item.type === "short" ? "short" : "image",
        url: item.url!.trim(),
        thumbnailUrl: item.thumbnailUrl ?? null,
        title: item.title ?? null,
      }))
      .filter((item) => item.url.length > 0);

    if (cleanedMedia.length > 0) {
      const deduped: GalleryMediaItem[] = [];
      const seen = new Set<string>();
      for (const item of cleanedMedia) {
        const key = `${item.type}:${item.url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
      }
      return deduped;
    }

    return images
      .filter(Boolean)
      .map((url) => ({
        type: "image" as const,
        url,
      }));
  }, [images, media]);

  const [activeFilter, setActiveFilter] = useState<"all" | "photos" | "shorts">("all");
  const filteredItems = useMemo(
    () =>
      allItems.filter((item) =>
        activeFilter === "all"
          ? true
          : activeFilter === "photos"
            ? item.type === "image"
            : item.type === "short"
      ),
    [activeFilter, allItems]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (allItems.length === 0) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-stone-400">
          <ImageIcon className="h-10 w-10" />
          <p className="text-sm font-medium">Media coming soon</p>
        </div>
      </div>
    );
  }

  const photosCount = allItems.filter((item) => item.type === "image").length;
  const shortsCount = allItems.filter((item) => item.type === "short").length;
  const hasFilteredItems = filteredItems.length > 0;
  const safeActiveIndex = hasFilteredItems
    ? Math.min(activeIndex, Math.max(filteredItems.length - 1, 0))
    : 0;
  const activeItem = hasFilteredItems ? (filteredItems[safeActiveIndex] || filteredItems[0]!) : null;

  const mapFilteredIndexToAllIndex = (index: number) => {
    const item = filteredItems[index];
    if (!item) return 0;
    const allIndex = allItems.findIndex(
      (candidate) => candidate.type === item.type && candidate.url === item.url
    );
    return allIndex >= 0 ? allIndex : 0;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            {photosCount} photo{photosCount === 1 ? "" : "s"}
            <span>•</span>
            <Clapperboard className="h-3.5 w-3.5" />
            {shortsCount} short{shortsCount === 1 ? "" : "s"}
          </div>
          <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "photos", label: "Photos" },
              { id: "shorts", label: "Shorts" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setActiveFilter(option.id as "all" | "photos" | "shorts");
                  setActiveIndex(0);
                }}
                className={`rounded-full px-3 py-1 transition-colors ${
                  activeFilter === option.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {activeItem ? (
          <button
            type="button"
            onClick={() => {
              setLightboxOpen(true);
            }}
            className={`group relative block w-full overflow-hidden rounded-2xl border border-border bg-muted ${
              activeItem.type === "short" ? "aspect-[9/16] max-w-[420px] mx-auto" : "aspect-[16/9]"
            }`}
            aria-label="Open tour media gallery"
          >
            {activeItem.type === "short" ? (
              <>
                <video
                  src={activeItem.url}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                  <Play className="h-3 w-3" />
                  Short
                </span>
              </>
            ) : (
              <Image
                src={activeItem.url}
                alt={activeItem.title || `${title} media`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                quality={55}
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            )}
          </button>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No media matches this filter yet.
          </div>
        )}

        {filteredItems.length > 1 && (
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 md:grid md:grid-cols-6 md:overflow-visible">
            {filteredItems.slice(0, 18).map((item, index) => (
              <button
                key={`${item.type}-${item.url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative flex-none snap-start overflow-hidden rounded-xl border transition md:w-auto ${
                  item.type === "short" ? "aspect-[9/16] w-20" : "aspect-[4/3] w-28"
                } ${
                  index === safeActiveIndex
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-border hover:border-primary/50"
                }`}
                aria-label={`Preview media ${index + 1}`}
              >
                {item.type === "short" ? (
                  <>
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                    />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="rounded-full bg-black/55 p-1 text-white">
                        <Play className="h-3.5 w-3.5" />
                      </span>
                    </span>
                  </>
                ) : (
                  <Image
                    src={item.thumbnailUrl || item.url}
                    alt={`${title} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    quality={50}
                    sizes="(max-width: 1024px) 30vw, 16vw"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        items={allItems}
        title={title}
        index={mapFilteredIndexToAllIndex(safeActiveIndex)}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onChange={(nextIndex) => {
          const nextItem = allItems[nextIndex];
          if (!nextItem) {
            setActiveIndex(0);
            return;
          }

          const inFilterIndex = filteredItems.findIndex(
            (item) => item.type === nextItem.type && item.url === nextItem.url
          );

          if (inFilterIndex >= 0) {
            setActiveIndex(inFilterIndex);
            return;
          }

          setActiveFilter("all");
          const allIndex = allItems.findIndex(
            (item) => item.type === nextItem.type && item.url === nextItem.url
          );
          setActiveIndex(allIndex >= 0 ? allIndex : 0);
        }}
      />
    </>
  );
}
