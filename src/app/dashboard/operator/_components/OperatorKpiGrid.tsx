import React from "react";
import { DollarSign, Ship, Ticket, Users } from "lucide-react";

import type { IOperatorOverviewKPIs } from "@/types";
import { StatCard } from "@/widgets";

interface OperatorKpiGridProps {
  kpis?: IOperatorOverviewKPIs;
  isLoading: boolean;
}

export function OperatorKpiGrid({ kpis, isLoading }: OperatorKpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Today's Passengers */}
      <StatCard
        title="Today's Passengers"
        value={isLoading ? "..." : (kpis?.todayPassengers?.value ?? 0)}
        icon={Users}
        variant="emerald"
        changePercent={kpis?.todayPassengers?.changePercent}
        trend={kpis?.todayPassengers?.trend as "up" | "down" | "neutral" | undefined}
        comparisonText={
          kpis?.todayPassengers?.changePercent !== undefined && kpis?.todayPassengers?.changePercent !== null
            ? `vs ${kpis.todayPassengers.comparedPeriod || "yesterday"}`
            : "Live passengers"
        }
      />

      {/* 2. Active Ferry */}
      <StatCard
        title="Active Ferry"
        value={
          isLoading
            ? "..."
            : kpis?.activeFleet?.ratio ||
              `${kpis?.activeFleet?.inService ?? 0}/${kpis?.activeFleet?.total ?? 0}`
        }
        icon={Ship}
        variant="blue"
        comparisonText={
          kpis?.activeFleet
            ? `${kpis.activeFleet.inService} of ${kpis.activeFleet.total} vessels in service`
            : "All vessels ready"
        }
      />

      {/* 3. Today's Bookings */}
      <StatCard
        title="Today's Bookings"
        value={isLoading ? "..." : (kpis?.todayBookings?.value ?? 0)}
        icon={Ticket}
        variant="indigo"
        changePercent={kpis?.todayBookings?.changePercent}
        trend={kpis?.todayBookings?.trend as "up" | "down" | "neutral" | undefined}
        comparisonText={
          kpis?.todayBookings?.changePercent !== undefined && kpis?.todayBookings?.changePercent !== null
            ? `vs ${kpis.todayBookings.comparedPeriod || "yesterday"}`
            : "Active reservations"
        }
      />

      {/* 4. Today's Revenue */}
      <StatCard
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
        variant="amber"
        changePercent={kpis?.netRevenue?.changePercent}
        trend={kpis?.netRevenue?.trend as "up" | "down" | "neutral" | undefined}
        comparisonText={
          kpis?.netRevenue?.changePercent !== undefined && kpis?.netRevenue?.changePercent !== null
            ? `vs ${kpis.netRevenue.comparedPeriod || "yesterday"}`
            : "Gross payout"
        }
      />
    </div>
  );
}
