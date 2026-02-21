import type { ElementType, ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  spacing?: "compact" | "default" | "spacious";
  variant?: "default" | "dark" | "accent";
  id?: string;
}

const spacingClasses: Record<NonNullable<SectionProps["spacing"]>, string> = {
  compact: "py-12 sm:py-16",
  default: "py-16 sm:py-24",
  spacious: "py-20 sm:py-32",
};

const variantClasses: Record<NonNullable<SectionProps["variant"]>, string> = {
  default: "",
  dark: "bg-stone-950 text-stone-50",
  accent: "bg-stone-100",
};

export function Section({
  children,
  className,
  as: Component = "section",
  spacing = "default",
  variant = "default",
  id,
}: SectionProps) {
  return (
    <Component id={id} className={`${spacingClasses[spacing]} ${variantClasses[variant]} ${className ?? ""}`}>
      {children}
    </Component>
  );
}
