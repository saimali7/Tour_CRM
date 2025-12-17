interface ChartDataPoint {
  date: string;
  value: number;
}

interface SimpleChartProps {
  data: ChartDataPoint[];
  type: "line" | "bar";
  title: string;
  valueFormatter?: (value: number) => string;
  height?: number;
}

export function SimpleChart({
  data,
  type,
  title,
  valueFormatter = (v) => v.toString(),
  height = 200,
}: SimpleChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-lg border border-border bg-card p-6"
        style={{ height: height + 100 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground pr-2">
          <span>{valueFormatter(maxValue)}</span>
          <span>{valueFormatter((maxValue + minValue) / 2)}</span>
          <span>{valueFormatter(minValue)}</span>
        </div>

        {/* Chart area */}
        <div className="ml-16 h-full flex items-end gap-1">
          {data.map((point, index) => {
            const heightPercent =
              range > 0 ? ((point.value - minValue) / range) * 100 : 50;

            return (
              <div key={index} className="flex-1 flex flex-col items-center group">
                {/* Bar or Line Point */}
                <div className="relative w-full flex items-end justify-center h-full">
                  {type === "bar" ? (
                    <div
                      className="w-full bg-primary hover:bg-primary/80 rounded-t transition-all"
                      style={{ height: `${heightPercent}%` }}
                      title={`${point.date}: ${valueFormatter(point.value)}`}
                    />
                  ) : (
                    <div
                      className="absolute bottom-0 w-2 h-2 bg-primary rounded-full"
                      style={{ bottom: `${heightPercent}%` }}
                      title={`${point.date}: ${valueFormatter(point.value)}`}
                    />
                  )}
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-foreground text-background text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {valueFormatter(point.value)}
                  </div>
                </div>

                {/* X-axis label */}
                {index % Math.ceil(data.length / 6) === 0 && (
                  <span className="text-xs text-muted-foreground mt-2 transform -rotate-45 origin-top-left">
                    {new Date(point.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Line connecting points for line chart */}
        {type === "line" && data.length > 1 && (
          <svg
            className="absolute top-0 left-16 pointer-events-none"
            style={{ width: "calc(100% - 4rem)", height: "100%" }}
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
              points={data
                .map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y =
                    100 - (range > 0 ? ((point.value - minValue) / range) * 100 : 50);
                  return `${x}%,${y}%`;
                })
                .join(" ")}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
