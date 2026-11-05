"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";

export interface BookingStatusDonutChartProps {
  confirmed: number;
  checkedIn: number;
  cancelled: number;
  periodLabel?: string;
  className?: string;
}

// Status colours are semantic (green = good, red = cancelled), so they stay fixed
// instead of using the monochrome --chart-* palette.
const chartConfig = {
  count: { label: "Bookings" },
  confirmed: { label: "Confirmed", color: "#10b981" },
  checkedIn: { label: "Checked In", color: "var(--chart-1)" },
  cancelled: { label: "Cancelled", color: "#f43f5e" }
} satisfies ChartConfig;

/** Booking lifecycle split as a donut. Counts come straight from the analytics breakdown. */
export function BookingStatusDonutChart({
  confirmed,
  checkedIn,
  cancelled,
  periodLabel,
  className
}: BookingStatusDonutChartProps) {
  const data = React.useMemo(
    () => [
      { status: "confirmed", count: confirmed, fill: "var(--color-confirmed)" },
      { status: "checkedIn", count: checkedIn, fill: "var(--color-checkedIn)" },
      { status: "cancelled", count: cancelled, fill: "var(--color-cancelled)" }
    ],
    [confirmed, checkedIn, cancelled]
  );
  const total = confirmed + checkedIn + cancelled;

  if (total === 0) return null;

  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <CardHeader>
        <CardTitle>Booking Status Mix</CardTitle>
        <CardDescription>
          {periodLabel ? `Share of reservations (${periodLabel})` : "Share of reservations"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[260px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="status" hideLabel />} />
            <Pie data={data} dataKey="count" nameKey="status" innerRadius={60} strokeWidth={5}>
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {total.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 24}
                        className="fill-muted-foreground"
                      >
                        Bookings
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="status" />}
              className="flex-wrap gap-2 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
