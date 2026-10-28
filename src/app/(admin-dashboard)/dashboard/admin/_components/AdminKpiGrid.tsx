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

  const activeOperatorsCount = analytics?.providers?.active ?? 0;
  const inServiceFleetsCount = analytics?.fleet?.inService ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="GROSS REVENUE"
        value={`$${(analytics?.financials?.grossSales ?? 0).toFixed(2)}`}
        icon={DollarSign}
        variant="emerald"
        changePercent={analytics?.financials?.changePercent ?? analytics?.growth?.revenuePercent}
        comparisonText={analytics?.period?.label}
      />
      <StatCard
        label="TOTAL BOOKINGS"
        value={(analytics?.bookings?.total ?? 0).toLocaleString()}
        icon={Ticket}
        variant="blue"
        changePercent={analytics?.bookings?.changePercent ?? analytics?.growth?.bookingsPercent}
        comparisonText={analytics?.period?.label}
      />
      <StatCard
        label="TOTAL PASSENGERS"
        value={(analytics?.passengers?.totalPax ?? 0).toLocaleString()}
        icon={Users}
        variant="indigo"
        changePercent={analytics?.passengers?.changePercent ?? analytics?.growth?.passengersPercent}
        comparisonText={analytics?.period?.label}
      />
      <StatCard
        label="FLEET & OPERATORS"
        value={`${analytics?.fleet?.total ?? 0} Ferries`}
        icon={Ship}
        variant="purple"
        comparisonText={`${activeOperatorsCount} Active ${activeOperatorsCount === 1 ? "Operator" : "Operators"} • ${inServiceFleetsCount} In Service`}
      />
    </div>
  );
}
