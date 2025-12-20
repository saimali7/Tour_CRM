import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function SettingsSection({
  title,
  description,
  children,
  action,
}: SettingsSectionProps) {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface SettingsCardProps {
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ children, className = "" }: SettingsCardProps) {
  return (
    <div className={`bg-card rounded-lg border border-border p-6 ${className}`}>
      {children}
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function SettingsRow({
  label,
  description,
  children,
  htmlFor,
}: SettingsRowProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

interface SettingsGroupProps {
  title?: string;
  children: ReactNode;
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <div className="space-y-1">
      {title && (
        <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
