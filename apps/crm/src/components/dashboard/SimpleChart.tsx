"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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

const chartConfig = {
  value: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function SimpleChart({
  data,
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

  // Transform data for recharts
  const chartData = data.map((d) => ({
    date: d.date,
    value: d.value,
    // Format the date for display
    formattedDate: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="formattedDate"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => valueFormatter(value)}
            width={60}
          />
          <ChartTooltip
            cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const formattedDate = (item.payload as { formattedDate?: string })?.formattedDate;
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        {formattedDate}
                      </span>
                      <span className="font-semibold text-foreground">
                        {valueFormatter(Number(value))}
                      </span>
                    </div>
                  );
                }}
                hideIndicator
              />
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fill="url(#fillValue)"
            dot={{
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
              r: 6,
            }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
