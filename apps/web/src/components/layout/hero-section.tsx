import type { ReactNode } from "react";
import Image from "next/image";

interface HeroSectionProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  children?: ReactNode;
  className?: string;
}

export function HeroSection({
  eyebrow,
  title,
  subtitle,
  imageUrl,
  children,
  className,
}: HeroSectionProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-border bg-surface-dark text-surface-dark-foreground ${className ?? ""}`}
    >
      <div className="relative min-h-[320px]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="hidden object-cover opacity-35 sm:block"
            quality={60}
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-black/30" />
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
          {eyebrow ? (
            <p className="mb-3 text-sm uppercase tracking-[0.16em] text-amber-200">{eyebrow}</p>
          ) : null}
          <h1 className="max-w-3xl font-display text-3xl leading-tight sm:text-5xl">{title}</h1>
          {subtitle ? (
            <p className="mt-4 max-w-2xl text-sm text-amber-50/90 sm:text-base">{subtitle}</p>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
