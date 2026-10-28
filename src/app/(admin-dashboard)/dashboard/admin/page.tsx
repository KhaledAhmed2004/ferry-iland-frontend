"use client";

import * as React from "react";

import { AlertCircle, RefreshCw } from "lucide-react";

import { useAdminAnalyticsQuery } from "@/hooks/use-admin";

import {
  BookingsVolumeChart,
  DashboardTableCard,
  PageHeader,
  RevenueAnalyticsChart,
  TimeRangeFilterSelect
} from "@/widgets";
import { Button } from "@/ui";

import { AdminKpiGrid } from "./_components/AdminKpiGrid";
import { AdminOverviewCards } from "./_components/AdminOverviewCards";
import { recentBookingColumns } from "./_components/overview-columns";

export type TimeRangeFilter = "7d" | "15d" | "30d" | "month";

export default function AdminPage() {
  const [globalTimeRange, setGlobalTimeRange] = React.useState<TimeRangeFilter>("30d");
  const [revenueTimeRange, setRevenueTimeRange] = React.useState<TimeRangeFilter>("30d");
  const [bookingsTimeRange, setBookingsTimeRange] = React.useState<TimeRangeFilter>("30d");

  // Primary Live Overview Query mediated by TanStack Query hook
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch
  } = useAdminAnalyticsQuery(globalTimeRange);

  // Independent chart queries when chart-level time range differs from global filter
  const { data: revenueAnalytics } = useAdminAnalyticsQuery(revenueTimeRange);
  const { data: bookingsAnalytics } = useAdminAnalyticsQuery(bookingsTimeRange);

  // Handler for global time range change that also syncs the charts
  const handleGlobalTimeRangeChange = (range: TimeRangeFilter) => {
    setGlobalTimeRange(range);
    setRevenueTimeRange(range);
    setBookingsTimeRange(range);
  };

  // Generate dynamic chart data points from real backend totals or bucketing
  const revenueChartData = React.useMemo(() => {
    const active = revenueTimeRange === globalTimeRange ? analytics : revenueAnalytics;
    if (active?.chartData?.revenue && active.chartData.revenue.length > 0) {
      return active.chartData.revenue;
    }

    const gross = active?.financials?.grossSales ?? 0;
    const comm = active?.financials?.platformCommission ?? 0;
    const payout = active?.financials?.providerPayout ?? 0;

    // Graceful fallback if no chartData is present
    return [
      { label: "W1", revenue: gross * 0.15, commission: comm * 0.15, payout: payout * 0.15 },
      { label: "W2", revenue: gross * 0.25, commission: comm * 0.25, payout: payout * 0.25 },
      { label: "W3", revenue: gross * 0.28, commission: comm * 0.28, payout: payout * 0.28 },
      { label: "W4", revenue: gross * 0.32, commission: comm * 0.32, payout: payout * 0.32 }
    ];
  }, [analytics, revenueAnalytics, revenueTimeRange, globalTimeRange]);

  const bookingsChartData = React.useMemo(() => {
    const active = bookingsTimeRange === globalTimeRange ? analytics : bookingsAnalytics;
    if (active?.chartData?.bookings && active.chartData.bookings.length > 0) {
      return active.chartData.bookings;
    }

    const totalB = active?.bookings?.total ?? 0;
    const totalP = active?.passengers?.totalPax ?? 0;

    return [
      { label: "W1", bookings: Math.round(totalB * 0.18), passengers: Math.round(totalP * 0.18) },
      { label: "W2", bookings: Math.round(totalB * 0.24), passengers: Math.round(totalP * 0.24) },
      { label: "W3", bookings: Math.round(totalB * 0.28), passengers: Math.round(totalP * 0.28) },
      { label: "W4", bookings: Math.round(totalB * 0.3), passengers: Math.round(totalP * 0.3) }
    ];
  }, [analytics, bookingsAnalytics, bookingsTimeRange, globalTimeRange]);

  if (isError) {
    return (
      <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="border-destructive/20 bg-destructive/10 space-y-4 rounded-2xl border p-8 text-center">
          <AlertCircle className="text-destructive mx-auto h-10 w-10" />
          <h2 className="text-foreground text-lg font-bold">Failed to Load Dashboard Metrics</h2>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">
            {error?.message ||
              "Could not connect to the live backend service. Please verify server connectivity."}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header with Title and Filter Dropdown */}
      <PageHeader
        title="Dashboard"
        description="Overview of FerryGo platform activity and real-time operations."
        actions={
          <>
            <span className="text-muted-foreground hidden text-xs font-medium lg:inline-block">
              Filter Period:
            </span>
            <TimeRangeFilterSelect value={globalTimeRange} onChange={handleGlobalTimeRangeChange} />
          </>
        }
      />

      {/* Top 4 Stat Cards */}
      <AdminKpiGrid analytics={analytics} isLoading={isLoading} />

      {/* Overview Cards Row (Booking Status Breakdown & Financials Overview) */}
      <AdminOverviewCards analytics={analytics} isLoading={isLoading} />

      {/* Analytical Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RevenueAnalyticsChart
          data={revenueChartData}
          timeRange={revenueTimeRange}
          onTimeRangeChange={setRevenueTimeRange}
        />
        <BookingsVolumeChart
          data={bookingsChartData}
          timeRange={bookingsTimeRange}
          onTimeRangeChange={setBookingsTimeRange}
        />
      </div>

      {/* Recent Bookings Table */}
      {isLoading ? (
        <div className="border-border/60 bg-muted/20 h-72 animate-pulse rounded-xl border p-4" />
      ) : (
        <DashboardTableCard
          title="Recent Bookings"
          viewAllHref="/dashboard/admin/bookings"
          columns={recentBookingColumns}
          data={analytics?.recentBookings ?? []}
          keyExtractor={(item) => item.id}
          emptyMessage="No recent bookings found."
        />
      )}
    </div>
  );
}
