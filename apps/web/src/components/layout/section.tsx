import type { ElementType, ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  spacing?: "compact" | "default" | "spacious";
  id?: string;
}

const spacingClasses: Record<NonNullable<SectionProps["spacing"]>, string> = {
  compact: "py-12 sm:py-16",
  default: "py-16 sm:py-20",
  spacious: "py-20 sm:py-28",
};

export function Section({
  children,
  className,
  as: Component = "section",
  spacing = "default",
  id,
}: SectionProps) {
  return (
    <Component id={id} className={`${spacingClasses[spacing]} ${className ?? ""}`}>
      {children}
    </Component>
  );
}
