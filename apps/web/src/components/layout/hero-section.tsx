import type { ReactNode } from "react";
import Image from "next/image";

interface HeroSectionProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  children?: ReactNode;
  className?: string;
  size?: "default" | "large";
}

export function HeroSection({
  eyebrow,
  title,
  subtitle,
  imageUrl,
  children,
  className,
  size = "default",
}: HeroSectionProps) {
  const minHeight = size === "large"
    ? "min-h-[600px] sm:min-h-[700px] lg:min-h-[80vh]"
    : "min-h-[480px] sm:min-h-[540px]";

  return (
    <section
      className={`relative overflow-hidden bg-stone-950 text-white ${minHeight} flex flex-col justify-center ${className ?? ""}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover opacity-50"
          quality={85}
          priority
          sizes="100vw"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

      <div
        className="relative z-10 w-full mx-auto px-[var(--page-gutter)]"
        style={{ maxWidth: "var(--page-max-width, 1400px)" }}
      >
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary drop-shadow-md animate-fade-in">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-hero text-white drop-shadow-lg animate-slide-in">
            {title}
          </h1>
          {subtitle ? (
            <p
              className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-white/85 drop-shadow-md animate-slide-in"
              style={{ animationDelay: "100ms" }}
            >
              {subtitle}
            </p>
          ) : null}

          {children ? (
            <div className="mt-8 animate-slide-in" style={{ animationDelay: "200ms" }}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
