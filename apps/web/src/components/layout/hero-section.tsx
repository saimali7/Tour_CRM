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
      className={`relative overflow-hidden border-b border-border bg-surface-dark text-surface-dark-foreground ${className ?? ""}`}
    >
      <div className="relative min-h-[480px] sm:min-h-[540px] flex flex-col justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover opacity-60 transition-transform duration-[20s] ease-out hover:scale-105"
            quality={85}
            priority
            sizes="(max-width: 768px) 100vw, 100vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/50 sm:to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 drop-shadow-md animate-fade-in">{eyebrow}</p>
            ) : null}
            <h1 className="font-display text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-[3.5rem] drop-shadow-lg animate-slide-in">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-white/85 sm:text-lg drop-shadow-md animate-slide-in" style={{ animationDelay: '100ms' }}>
                {subtitle}
              </p>
            ) : null}

            {children ? (
              <div className="mt-8 animate-slide-in" style={{ animationDelay: '200ms' }}>
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
