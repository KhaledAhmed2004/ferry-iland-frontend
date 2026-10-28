"use client";

import { AlertCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useOperatorOverviewQuery } from "@/hooks";
import { DashboardTableCard } from "@/widgets";
import { Button } from "@/ui";
import { OperatorKpiGrid } from "./_components/OperatorKpiGrid";
import { bookingColumns, scheduleColumns } from "./_components/overview-columns";

export default function OperatorOverviewPage() {
  const { user } = useAuth();
  const { data: overviewData, isLoading, isError, error, refetch } = useOperatorOverviewQuery();

  const departures = overviewData?.todayDepartures ?? [];
  const bookings = overviewData?.recentBookings ?? [];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Modern, Clean & Professional Header */}
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Operator Overview
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Welcome back,{" "}
          <strong className="text-foreground font-semibold">
            {user?.name || "Operator Partner"}
          </strong>
        </p>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="text-sm">
              <span className="font-semibold">Failed to load overview data:</span>{" "}
              {error?.message || "Please check network or backend connection."}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
            className="border-rose-300 bg-white text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900 dark:text-rose-200"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 4 Provider Stat Cards */}
      <OperatorKpiGrid kpis={overviewData?.kpis} isLoading={isLoading} />

      {/* Today's Ferry Trips */}
      <DashboardTableCard
        title="Today's Ferry Trips"
        viewAllHref="/dashboard/operator/schedules"
        columns={scheduleColumns}
        data={departures}
        keyExtractor={(item) => item.id}
        emptyMessage="No ferry departures scheduled for today."
      />

      {/* Recent Passenger Bookings */}
      <DashboardTableCard
        title="Recent Ticket Reservations"
        viewAllHref="/dashboard/operator/bookings"
        columns={bookingColumns}
        data={bookings}
        keyExtractor={(item) => item.id}
        emptyMessage="No recent passenger bookings found."
      />
    </div>
  );
}
