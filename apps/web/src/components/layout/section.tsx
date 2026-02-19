import type { ElementType, ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  spacing?: "compact" | "default" | "spacious";
}

const spacingClasses: Record<NonNullable<SectionProps["spacing"]>, string> = {
  compact: "py-8",
  default: "py-10 sm:py-12",
  spacious: "py-12 sm:py-16",
};

export function Section({
  children,
  className,
  as: Component = "section",
  spacing = "default",
}: SectionProps) {
  return (
    <Component className={`${spacingClasses[spacing]} ${className ?? ""}`}>
      {children}
    </Component>
  );
}
