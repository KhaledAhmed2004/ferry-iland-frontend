"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { BookingsDataPoint, TimeRangeFilter } from "@/data";
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

export interface BookingsVolumeChartProps {
  data: BookingsDataPoint[];
  timeRange?: TimeRangeFilter;
  onTimeRangeChange?: (range: TimeRangeFilter) => void;
  className?: string;
  showFilter?: boolean;
}

const chartConfig = {
  bookings: { label: "Bookings", color: "var(--chart-1)" },
  passengers: { label: "Passengers", color: "var(--chart-4)" }
} satisfies ChartConfig;

export function BookingsVolumeChart({
  data,
  timeRange,
  onTimeRangeChange,
  className,
  showFilter = false
}: BookingsVolumeChartProps) {
  const [internalTimeRange, setInternalTimeRange] = React.useState<TimeRangeFilter>("30d");

  const activeRange = timeRange ?? internalTimeRange;
  const handleRangeChange = onTimeRangeChange ?? setInternalTimeRange;

  if (!data || data.length === 0) return null;

  const totalBookings = data.reduce((acc, d) => acc + d.bookings, 0);
  const totalPax = data.reduce((acc, d) => acc + d.passengers, 0);

  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Bookings Volume</CardTitle>
          <Badge variant="secondary" className="px-2 text-[10px]">
            Passenger Flow
          </Badge>
        </div>
        <CardDescription>
          {totalBookings.toLocaleString()} bookings · {totalPax.toLocaleString()} passengers this
          period
        </CardDescription>
        {showFilter && (
          <CardAction>
            <TimeRangeFilterSelect value={activeRange} onChange={handleRangeChange} />
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
          {/* Chart-level barSize keeps the two bars grouped in the middle of each period
              (a per-Bar maxBarSize leaves them stranded at opposite edges of a wide band). */}
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 4, right: 12, top: 8 }}
            barSize={28}
            barGap={6}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} tickMargin={4} width={36} allowDecimals={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} />
            <Bar dataKey="passengers" fill="var(--color-passengers)" radius={4} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
