import React from "react";
import { DollarSign, Ship, Ticket, TrendingDown, TrendingUp, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { IOperatorOverviewKPIs } from "@/types";
import { OperatorStatCard } from "@/widgets";

// Safely format KPI Trend percentages avoiding "+-100%"
function renderKpiTrend(
  metric?: { changePercent?: number; trend?: string; comparedPeriod?: string },
  fallbackText = "Live"
) {
  if (!metric || metric.changePercent === undefined || metric.changePercent === null) {
    return <span className="text-muted-foreground text-[11px]">{fallbackText}</span>;
  }

  const { changePercent, comparedPeriod = "yesterday" } = metric;
  const isDown = metric.trend === "down" || changePercent < 0;
  const isNeutral = metric.trend === "neutral" || Math.abs(changePercent) < 0.001;

  if (isNeutral) {
    return (
      <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold">
        <span>0.0% vs {comparedPeriod}</span>
      </div>
    );
  }

  const formattedPercent = changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[11px] font-semibold",
        isDown ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {isDown ? (
        <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
      ) : (
        <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      )}
      <span>
        {formattedPercent} vs {comparedPeriod}
      </span>
    </div>
  );
}

interface OperatorKpiGridProps {
  kpis?: IOperatorOverviewKPIs;
  isLoading: boolean;
}

export function OperatorKpiGrid({ kpis, isLoading }: OperatorKpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Today's Passengers */}
      <OperatorStatCard
        title="Today's Passengers"
        value={isLoading ? "..." : (kpis?.todayPassengers?.value ?? 0)}
        icon={Users}
        iconColorClasses="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        footerNode={renderKpiTrend(kpis?.todayPassengers, "Live passengers")}
      />

      {/* 2. Active Ferry */}
      <OperatorStatCard
        title="Active Ferry"
        value={
          isLoading
            ? "..."
            : kpis?.activeFleet?.ratio ||
              `${kpis?.activeFleet?.inService ?? 0}/${kpis?.activeFleet?.total ?? 0}`
        }
        icon={Ship}
        iconColorClasses="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        footerNode={
          <p className="text-muted-foreground text-[11px] font-medium">
            {kpis?.activeFleet
              ? `${kpis.activeFleet.inService} of ${kpis.activeFleet.total} vessels in service`
              : "All vessels ready"}
          </p>
        }
      />

      {/* 3. Today's Bookings */}
      <OperatorStatCard
        title="Today's Bookings"
        value={isLoading ? "..." : (kpis?.todayBookings?.value ?? 0)}
        icon={Ticket}
        iconColorClasses="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        footerNode={renderKpiTrend(kpis?.todayBookings, "Active reservations")}
      />

      {/* 4. Today's Revenue */}
      <OperatorStatCard
        title="Today's Net Revenue"
        value={
          isLoading
            ? "..."
            : `$${(kpis?.netRevenue?.value ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`
        }
        icon={DollarSign}
        iconColorClasses="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        footerNode={renderKpiTrend(kpis?.netRevenue, "Gross payout")}
      />
    </div>
  );
}
