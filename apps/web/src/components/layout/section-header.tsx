import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  align = "left",
}: SectionHeaderProps) {
  const alignment = align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={`mb-10 sm:mb-14 flex flex-col gap-2 ${alignment} ${className ?? ""}`}>
      <div className="flex w-full items-end justify-between gap-4">
        <div className={align === "center" ? "w-full" : ""}>
          {eyebrow ? (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-title">{title}</h2>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-base text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
