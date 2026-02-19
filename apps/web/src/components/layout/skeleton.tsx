import type { ReactNode } from "react";

interface SkeletonProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonProps) {
  return <div className={`skeleton ${className ?? ""}`} aria-hidden="true" />;
}

export function SkeletonText({ className }: SkeletonProps) {
  return <SkeletonBlock className={`skeleton-text ${className ?? ""}`} />;
}

export function SkeletonImage({ className }: SkeletonProps) {
  return <SkeletonBlock className={`aspect-[4/3] w-full rounded-xl ${className ?? ""}`} />;
}

interface SkeletonCardProps {
  className?: string;
  footer?: ReactNode;
}

export function SkeletonCard({ className, footer }: SkeletonCardProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card ${className ?? ""}`}>
      <SkeletonImage />
      <div className="space-y-3 p-4">
        <SkeletonText className="w-24" />
        <SkeletonText className="w-2/3" />
        <SkeletonText />
        {footer ?? <SkeletonText className="w-1/2" />}
      </div>
    </div>
  );
}
