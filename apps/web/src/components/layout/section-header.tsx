import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
  align = "left",
}: SectionHeaderProps) {
  const alignment = align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={`mb-8 sm:mb-10 flex flex-col gap-2 ${alignment} ${className ?? ""}`}>
      <div className="flex w-full items-end justify-between gap-4">
        <div className={align === "center" ? "w-full" : ""}>
          <h2 className="font-display text-2xl leading-tight sm:text-[2rem]">{title}</h2>
          {subtitle ? <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
