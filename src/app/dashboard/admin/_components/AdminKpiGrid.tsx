import { DollarSign, Ship, Ticket, Users } from "lucide-react";

import { StatCard } from "@/widgets";
import type { IAdminAnalyticsOverview } from "@/types";

interface AdminKpiGridProps {
  analytics?: IAdminAnalyticsOverview;
  isLoading: boolean;
}

export function AdminKpiGrid({ analytics, isLoading }: AdminKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border-border/60 bg-muted/20 h-28 animate-pulse rounded-xl border p-4"
          />
        ))}
      </div>
    );
  }

  const netRevenue =
    analytics?.kpis?.netRevenue?.value ??
    analytics?.breakdowns?.financials?.platformCommission ??
    0;
  const revenueGrowth =
    analytics?.kpis?.netRevenue?.changePercent ??
    analytics?.breakdowns?.financials?.changePercent ??
    100;

  const totalBookings =
    analytics?.kpis?.totalBookings?.value ??
    analytics?.breakdowns?.bookings?.total ??
    0;
  const bookingsGrowth =
    analytics?.kpis?.totalBookings?.changePercent ??
    analytics?.breakdowns?.bookings?.changePercent ??
    100;

  const totalPassengers =
    analytics?.kpis?.totalPassengers?.value ??
    analytics?.breakdowns?.passengers?.totalPax ??
    0;
  const passengersGrowth =
    analytics?.kpis?.totalPassengers?.changePercent ??
    analytics?.breakdowns?.passengers?.changePercent ??
    100;

  const fleetTotal =
    analytics?.kpis?.fleet?.total ??
    analytics?.breakdowns?.fleet?.total ??
    0;
  const fleetGrowth = analytics?.kpis?.fleet?.changePercent ?? 100;

  const periodLabel = analytics?.period?.label ?? "Last 30 Days";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="NET PLATFORM REVENUE"
        value={`$${netRevenue.toFixed(2)}`}
        icon={DollarSign}
        variant="emerald"
        changePercent={revenueGrowth}
        comparisonText={periodLabel}
      />
      <StatCard
        label="TOTAL BOOKINGS"
        value={totalBookings.toLocaleString()}
        icon={Ticket}
        variant="blue"
        changePercent={bookingsGrowth}
        comparisonText={periodLabel}
      />
      <StatCard
        label="TOTAL PASSENGERS"
        value={totalPassengers.toLocaleString()}
        icon={Users}
        variant="indigo"
        changePercent={passengersGrowth}
        comparisonText={periodLabel}
      />
      <StatCard
        label="FLEET & OPERATORS"
        value={`${fleetTotal} Ferries`}
        icon={Ship}
        variant="purple"
        changePercent={fleetGrowth}
        comparisonText={periodLabel}
      />
    </div>
  );
}
