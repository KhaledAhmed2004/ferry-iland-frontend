"use client";

import * as React from "react";

import { AlertCircle, RefreshCw } from "lucide-react";

import { useAdminAnalyticsQuery, useAdminBookingByRefQuery } from "@/hooks/use-admin";

import {
  BookingDetailsModal,
  BookingStatusDonutChart,
  BookingsVolumeChart,
  DashboardTableCard,
  PageHeader,
  RevenueAnalyticsChart,
  TimeRangeFilterSelect
} from "@/widgets";
import { Button } from "@/ui";

import { AdminKpiGrid } from "./_components/AdminKpiGrid";
import { ChartEmptyState } from "./_components/ChartEmptyState";
import { AdminOverviewCards } from "./_components/AdminOverviewCards";
import { getRecentBookingColumns } from "./_components/overview-columns";

export type { TimeRangeFilter } from "@/data";
import type { TimeRangeFilter } from "@/data";

export default function AdminPage() {
  const [globalTimeRange, setGlobalTimeRange] = React.useState<TimeRangeFilter>("30d");
  const [selectedBookingRef, setSelectedBookingRef] = React.useState<string | null>(null);

  // Fetch full booking details when a booking is selected for in-place quick-view modal
  const { data: selectedBooking } = useAdminBookingByRefQuery(selectedBookingRef);

  const bookingColumns = React.useMemo(() => {
    return getRecentBookingColumns((booking) => {
      setSelectedBookingRef(booking.reference);
    });
  }, []);

  // Primary Live Overview Query mediated by TanStack Query hook
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch
  } = useAdminAnalyticsQuery(globalTimeRange);

  // Chart series come only from the backend. No made up split when they are missing (AGENTS.md: no mock data).
  const revenueChartData = analytics?.charts?.revenueTrend?.revenue ?? [];
  const bookingsChartData = analytics?.charts?.revenueTrend?.bookings ?? [];
  const bookingBreakdown = analytics?.breakdowns?.bookings;
  const bookingStatusTotal =
    (bookingBreakdown?.confirmed ?? 0) +
    (bookingBreakdown?.checkedIn ?? 0) +
    (bookingBreakdown?.cancelled ?? 0);

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
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-xs font-medium sm:inline-block">
              Filter Period:
            </span>
            <TimeRangeFilterSelect value={globalTimeRange} onChange={setGlobalTimeRange} />
          </div>
        }
      />

      {/* Top 4 Stat Cards */}
      <AdminKpiGrid analytics={analytics} isLoading={isLoading} />

      {/* Overview Cards Row (Booking Status Breakdown & Financials Overview) */}
      <AdminOverviewCards analytics={analytics} isLoading={isLoading} />

      {/* Analytical Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {revenueChartData.length > 0 ? (
          <RevenueAnalyticsChart
            className="xl:col-span-2"
            data={revenueChartData}
            changePercent={analytics?.breakdowns?.financials?.changePercent}
          />
        ) : (
          <div className="xl:col-span-2">
            <ChartEmptyState title="Revenue Analytics" isLoading={isLoading} />
          </div>
        )}
        {bookingStatusTotal > 0 ? (
          <BookingStatusDonutChart
            confirmed={bookingBreakdown?.confirmed ?? 0}
            checkedIn={bookingBreakdown?.checkedIn ?? 0}
            cancelled={bookingBreakdown?.cancelled ?? 0}
            periodLabel={analytics?.period?.label}
          />
        ) : (
          <ChartEmptyState title="Booking Status Mix" isLoading={isLoading} />
        )}
        {bookingsChartData.length > 0 ? (
          <BookingsVolumeChart className="xl:col-span-3" data={bookingsChartData} />
        ) : (
          <div className="xl:col-span-3">
            <ChartEmptyState title="Bookings Volume" isLoading={isLoading} />
          </div>
        )}
      </div>

      {/* Recent Bookings Table */}
      <DashboardTableCard
        title="Recent Bookings"
        viewAllHref="/dashboard/admin/bookings"
        columns={bookingColumns}
        data={analytics?.recent?.bookings ?? []}
        keyExtractor={(item) => item.id}
        emptyMessage="No recent bookings found."
        isLoading={isLoading}
      />

      {/* In-Place Quick-View Modal */}
      <BookingDetailsModal
        booking={selectedBooking ?? null}
        open={Boolean(selectedBookingRef)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedBookingRef(null);
        }}
        onBookingCancelled={() => {
          refetch();
        }}
      />
    </div>
  );
}
