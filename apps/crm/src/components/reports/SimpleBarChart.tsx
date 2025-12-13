"use client";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  horizontal?: boolean;
  maxValue?: number;
  formatValue?: (value: number) => string;
}

export function SimpleBarChart({
  data,
  horizontal = false,
  maxValue,
  formatValue = (v) => v.toString(),
}: SimpleBarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-4">
        {data.map((point, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{point.label}</span>
              <span className="text-gray-900 font-semibold">
                {formatValue(point.value)}
              </span>
            </div>
            <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${
                  point.color ?? "bg-primary"
                } transition-all duration-500`}
                style={{ width: `${(point.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2 h-64">
      {data.map((point, index) => (
        <div
          key={index}
          className="flex-1 flex flex-col items-center justify-end gap-2"
        >
          <div className="text-sm font-semibold text-gray-900">
            {formatValue(point.value)}
          </div>
          <div className="relative w-full bg-gray-100 rounded-t overflow-hidden">
            <div
              className={`absolute bottom-0 left-0 right-0 ${
                point.color ?? "bg-primary"
              } transition-all duration-500`}
              style={{ height: `${(point.value / max) * 200}px` }}
            />
          </div>
          <div className="text-xs text-gray-600 text-center truncate w-full px-1">
            {point.label}
          </div>
        </div>
      ))}
    </div>
  );
}
