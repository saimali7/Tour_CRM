import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
  onClick?: () => void;
}

const colorClasses = {
  blue: "bg-info/10 text-info",
  green: "bg-success/10 text-success",
  yellow: "bg-warning/10 text-warning",
  red: "bg-destructive/10 text-destructive",
  purple: "bg-primary/10 text-primary",
  gray: "bg-muted text-muted-foreground",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "blue",
  onClick,
}: StatCardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${
        onClick ? "cursor-pointer hover:border-primary transition-colors" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-semibold text-foreground">{value}</p>
            {trend && (
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  trend.direction === "up" ? "text-success" : "text-destructive"
                }`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
