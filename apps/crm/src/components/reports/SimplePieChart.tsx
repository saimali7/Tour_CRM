"use client";

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface SimplePieChartProps {
  data: PieSlice[];
  formatValue?: (value: number) => string;
}

export function SimplePieChart({
  data,
  formatValue = (v) => v.toString(),
}: SimplePieChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="flex flex-col md:flex-row gap-8 items-center">
      {/* Legend */}
      <div className="flex-1 space-y-3">
        {data.map((slice, index) => {
          const percentage = total > 0 ? (slice.value / total) * 100 : 0;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {slice.label}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {formatValue(slice.value)}
                </div>
                <div className="text-xs text-gray-500">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual representation using stacked bars */}
      <div className="w-full md:w-64 space-y-2">
        <div className="relative h-8 bg-gray-100 rounded overflow-hidden flex">
          {data.map((slice, index) => {
            const percentage = total > 0 ? (slice.value / total) * 100 : 0;
            return (
              <div
                key={index}
                className="h-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: slice.color,
                }}
                title={`${slice.label}: ${formatValue(slice.value)} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="text-xs text-gray-500 text-center">
          Total: {formatValue(total)}
        </div>
      </div>
    </div>
  );
}
