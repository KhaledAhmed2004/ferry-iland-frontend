import { DollarSign, Ship, Ticket, Users } from "lucide-react";

import { StatCard, StatCardGridSkeleton } from "@/widgets";
import { formatDollars } from "@/lib/payment";
import type { IAdminAnalyticsOverview, IAdminPeriodInfo } from "@/types";

interface AdminKpiGridProps {
  analytics?: IAdminAnalyticsOverview;
  isLoading: boolean;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * The period a growth figure is compared against, in plain words ("the 30 days before").
 * Not "the previous 30 days": admins read that as the same "last 30 days" the number covers.
 */
export function previousPeriodPhrase(period?: IAdminPeriodInfo): string {
  if (period?.key === "month") return "the month before";
  if (period?.key === "this-month") return "the same days last month";
  const days = period?.days ?? Number.parseInt(period?.key ?? "", 10);
  return Number.isFinite(days) && days > 0 ? `the ${days} days before` : "the period before";
}

/**
 * Growth chips only show a real comparison. When the backend sends null (the previous period
 * had nothing), say what actually happened instead of a made up "+100%".
 */
export function trendProps(
  changePercent: number | null | undefined,
  previousPhrase: string,
  what: string
) {
  if (typeof changePercent === "number") {
    return { changePercent, comparisonText: `vs ${previousPhrase}` };
  }
  // Name what was missing, so it never reads as if this period had none.
  return { changePercent: null, comparisonText: `No ${what} in ${previousPhrase}` };
}

export function AdminKpiGrid({ analytics, isLoading }: AdminKpiGridProps) {
  if (isLoading) {
    return <StatCardGridSkeleton count={4} />;
  }

  const previous = previousPeriodPhrase(analytics?.period);

  const platformEarnings =
    analytics?.kpis?.netRevenue?.value ??
    analytics?.breakdowns?.financials?.platformCommission ??
    0;
  const earningsGrowth =
    analytics?.kpis?.netRevenue?.changePercent ?? analytics?.breakdowns?.financials?.changePercent;

  // Headline counts are what was actually sold (confirmed + checked in), like the revenue.
  // Cancelled bookings are shown in the Booking Status Breakdown below, not here.
  const bookingBreakdown = analytics?.breakdowns?.bookings;
  const confirmedBookings =
    analytics?.kpis?.totalBookings?.value ??
    (bookingBreakdown ? bookingBreakdown.confirmed + bookingBreakdown.checkedIn : 0);
  const bookingsGrowth =
    analytics?.kpis?.totalBookings?.changePercent ?? bookingBreakdown?.changePercent;

  const passengers =
    analytics?.kpis?.totalPassengers?.value ?? analytics?.breakdowns?.passengers?.totalPax ?? 0;
  const passengersGrowth =
    analytics?.kpis?.totalPassengers?.changePercent ??
    analytics?.breakdowns?.passengers?.changePercent;

  // A current snapshot, not a trend: one number and one short line, no growth arrow.
  // Ferry maintenance detail belongs to operators, so it stays off the admin overview.
  const activeOperators = analytics?.breakdowns?.providers?.active ?? 0;
  const fleetTotal = analytics?.breakdowns?.fleet?.total ?? analytics?.kpis?.fleet?.total ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="PLATFORM EARNINGS"
        value={formatDollars(platformEarnings)}
        icon={DollarSign}
        variant="emerald"
        {...trendProps(earningsGrowth, previous, "earnings")}
      />
      <StatCard
        label="CONFIRMED BOOKINGS"
        value={confirmedBookings.toLocaleString()}
        icon={Ticket}
        variant="blue"
        {...trendProps(bookingsGrowth, previous, "bookings")}
      />
      <StatCard
        label="PASSENGERS"
        value={passengers.toLocaleString()}
        icon={Users}
        variant="indigo"
        {...trendProps(passengersGrowth, previous, "passengers")}
      />
      <StatCard
        label="ACTIVE OPERATORS"
        value={activeOperators.toLocaleString()}
        icon={Ship}
        variant="purple"
        comparisonText={`${plural(fleetTotal, "ferry", "ferries")} on the platform`}
      />
    </div>
  );
}
