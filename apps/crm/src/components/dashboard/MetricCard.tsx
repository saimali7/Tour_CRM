interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: "default" | "success" | "warning" | "danger";
}

const colorClasses = {
  default: "text-gray-900",
  success: "text-green-600",
  warning: "text-yellow-600",
  danger: "text-red-600",
};

export function MetricCard({
  label,
  value,
  subtitle,
  color = "default",
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
