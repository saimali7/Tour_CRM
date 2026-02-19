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
      <div className="relative min-h-[500px] sm:min-h-[600px] flex flex-col justify-center">
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

        <div className="relative z-10 w-full max-w-[1560px] mx-auto px-6 py-12 sm:px-8 sm:py-20 lg:px-12">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400 drop-shadow-md animate-fade-in">{eyebrow}</p>
            ) : null}
            <h1 className="font-display text-4xl font-bold leading-[1.1] text-white sm:text-6xl lg:text-7xl drop-shadow-lg animate-slide-in">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-6 max-w-2xl text-lg font-medium text-white/90 sm:text-xl drop-shadow-md animate-slide-in" style={{ animationDelay: '100ms' }}>
                {subtitle}
              </p>
            ) : null}

            {/* OTA-style decorative search/action bar */}
            <div className="mt-10 max-w-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl flex flex-col sm:flex-row gap-2 animate-slide-in" style={{ animationDelay: '200ms' }}>
              <div className="flex-1 bg-white/90 backdrop-blur text-foreground rounded-xl px-4 py-3 sm:py-0 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination or Activity</span>
                  <span className="text-sm font-medium">Where to next?</span>
                </div>
              </div>
              <div className="sm:w-[160px] h-14 sm:h-auto rounded-xl">
                {children ? children : (
                  <button className="w-full h-full bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg">
                    Search
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
