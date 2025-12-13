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
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  yellow: "bg-yellow-100 text-yellow-600",
  red: "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
  gray: "bg-gray-100 text-gray-600",
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
      className={`rounded-lg border border-gray-200 bg-white p-4 ${
        onClick ? "cursor-pointer hover:border-primary transition-colors" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  trend.direction === "up" ? "text-green-600" : "text-red-600"
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
