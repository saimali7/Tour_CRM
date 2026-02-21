"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface VideoHeroProps {
  videoSrc?: string | null;
  imageSrc?: string | null;
  posterSrc?: string | null;
  alt: string;
  children: ReactNode;
  overlay?: "left" | "center" | "full";
  height?: "full" | "large" | "medium";
  className?: string;
}

const heightClasses = {
  full: "min-h-screen",
  large: "min-h-[600px] sm:min-h-[700px] lg:min-h-[80vh]",
  medium: "min-h-[480px] sm:min-h-[540px]",
};

const overlayGradients = {
  left: "bg-gradient-to-r from-black/70 via-black/40 to-transparent",
  center: "bg-gradient-to-t from-black/80 via-black/40 to-black/20",
  full: "bg-black/50",
};

export function VideoHero({
  videoSrc,
  imageSrc,
  posterSrc,
  alt,
  children,
  overlay = "left",
  height = "large",
  className,
}: VideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    if (mq.matches) return;

    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Only show video on desktop to save bandwidth
  const showVideo = videoSrc && !prefersReducedMotion;
  const parallaxY = prefersReducedMotion ? 0 : scrollY * 0.3;

  return (
    <section
      className={`relative overflow-hidden ${heightClasses[height]} flex flex-col justify-center ${className ?? ""}`}
    >
      {/* Background media */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translateY(${parallaxY}px)` }}
      >
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            poster={posterSrc ?? undefined}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : imageSrc ? (
          <Image
            src={imageSrc}
            alt={alt}
            fill
            className="object-cover"
            quality={85}
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-stone-900" />
        )}
      </div>

      {/* Overlay gradient */}
      <div className={`absolute inset-0 ${overlayGradients[overlay]}`} />

      {/* Content */}
      <div className="relative z-10 w-full" style={{ maxWidth: "var(--page-max-width, 1400px)", margin: "0 auto", padding: "0 var(--page-gutter, clamp(1rem, 3vw, 2rem))" }}>
        {children}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-float hidden sm:block">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
