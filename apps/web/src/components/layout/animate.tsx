"use client";

import type { CSSProperties, ReactNode } from "react";
import { Children } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  stepMs?: number;
}

function withDelay(delayMs: number): CSSProperties {
  return { animationDelay: `${delayMs}ms` };
}

export function FadeIn({ children, className, delayMs = 0 }: FadeInProps) {
  return (
    <div
      className={`animate-[reveal-up_420ms_var(--ease-out)_both] ${className ?? ""}`}
      style={withDelay(delayMs)}
    >
      {children}
    </div>
  );
}

export function StaggerChildren({ children, className, stepMs = 80 }: StaggerChildrenProps) {
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) => (
        <div
          key={index}
          className="animate-[reveal-up_420ms_var(--ease-out)_both]"
          style={withDelay(index * stepMs)}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
