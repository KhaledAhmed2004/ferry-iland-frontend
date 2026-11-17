"use client";

import * as React from "react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { RevenueDataPoint, TimeRangeFilter } from "@/data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { TimeRangeFilterSelect } from "../time-filter/TimeRangeFilterSelect";

export interface RevenueAnalyticsChartProps {
  data: RevenueDataPoint[];
  timeRange?: TimeRangeFilter;
  onTimeRangeChange?: (range: TimeRangeFilter) => void;
  className?: string;
  showFilter?: boolean;
  /** Real growth vs the previous period from the backend. null/undefined hides the badge. */
  changePercent?: number | null;
}

const chartConfig = {
  revenue: { label: "Gross Revenue", color: "var(--chart-1)" },
  commission: { label: "Platform Fee", color: "#10b981" }
} satisfies ChartConfig;

const currency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const compactCurrency = (value: number) =>
  `$${Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;

export function RevenueAnalyticsChart({
  data,
  timeRange,
  onTimeRangeChange,
  className,
  showFilter = false,
  changePercent
}: RevenueAnalyticsChartProps) {
  const [internalTimeRange, setInternalTimeRange] = React.useState<TimeRangeFilter>("30d");

  const activeRange = timeRange ?? internalTimeRange;
  const handleRangeChange = onTimeRangeChange ?? setInternalTimeRange;

  if (!data || data.length === 0) return null;

  const totalRev = data.reduce((acc, d) => acc + d.revenue, 0);

  return (
    <Card className={cn("border-border/80 gap-4 shadow-xs", className)}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Revenue Analytics</CardTitle>
          {typeof changePercent === "number" && (
            <Badge
              variant="outline"
              title="Change vs the previous period"
              className={cn(
                "gap-1 px-2 text-[10px]",
                changePercent > 0 &&
                  "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                changePercent < 0 &&
                  "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                changePercent === 0 &&
                  "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}
            >
              {changePercent > 0 ? (
                <TrendingUp className="size-3" />
              ) : changePercent < 0 ? (
                <TrendingDown className="size-3" />
              ) : (
                <Activity className="size-3" />
              )}
              {changePercent > 0 ? "+" : ""}
              {changePercent}%
            </Badge>
          )}
        </div>
        <CardDescription>{currency(totalRev)} gross ticket revenue this period</CardDescription>
        {showFilter && (
          <CardAction>
            <TimeRangeFilterSelect value={activeRange} onChange={handleRangeChange} />
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
          <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillCommission" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-commission)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-commission)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={48}
              tickFormatter={compactCurrency}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="min-w-44"
                  formatter={(value, name) => (
                    <>
                      <div
                        className="size-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
                        style={
                          {
                            "--color-bg": `var(--color-${name})`
                          } as React.CSSProperties
                        }
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                        {currency(Number(value))}
                      </span>
                    </>
                  )}
                />
              }
            />
            <Area
              dataKey="revenue"
              type="monotone"
              fill="url(#fillRevenue)"
              fillOpacity={0.4}
              stroke="var(--color-revenue)"
              strokeWidth={2}
            />
            <Area
              dataKey="commission"
              type="monotone"
              fill="url(#fillCommission)"
              fillOpacity={0.4}
              stroke="var(--color-commission)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
