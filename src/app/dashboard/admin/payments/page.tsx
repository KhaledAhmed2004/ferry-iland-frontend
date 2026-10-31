"use client";

import * as React from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  RefreshCw,
  Search
} from "lucide-react";
import { useAdminPaymentsQuery } from "@/hooks/use-admin";
import type { IAdminPaymentListItem } from "@/types";
import { Button, Input } from "@/ui";
import {
  DashboardTableCard,
  PageHeader,
  PaymentDetailsModal,
  StatCard,
  StatusBadge,
  type TableColumn
} from "@/widgets";

export default function AdminPaymentsPage() {
  const [page, setPage] = React.useState<number>(1);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [selectedPayment, setSelectedPayment] = React.useState<IAdminPaymentListItem | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Live Query from Backend API
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminPaymentsQuery({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined
  });

  const overview = data?.overview ?? {
    totalBookingValue: 0,
    commission: 0,
    providerAmount: 0,
    commissionRate: 10
  };

  const payments = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  const paymentColumns: TableColumn<IAdminPaymentListItem>[] = [
    {
      header: "BOOKING REFERENCE",
      accessorKey: "bookingReference",
      className: "font-mono font-medium text-slate-700 dark:text-slate-300"
    },
    {
      header: "PROVIDER",
      accessorKey: "provider",
      className: "font-medium text-foreground"
    },
    {
      header: "BOOKING AMOUNT",
      className: "font-bold text-foreground",
      cell: (item) => `$${item.bookingAmount.toFixed(2)}`
    },
    {
      header: "COMMISSION",
      className: "font-semibold text-blue-600 dark:text-blue-400",
      cell: (item) => `$${item.commission.toFixed(2)}`
    },
    {
      header: "PROVIDER AMOUNT",
      className: "font-medium text-foreground",
      cell: (item) => `$${item.providerAmount.toFixed(2)}`
    },
    {
      header: "PAYMENT STATUS",
      cell: (item) => <StatusBadge status={item.paymentStatus} />
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (item) => (
        <button
          type="button"
          onClick={() => setSelectedPayment(item)}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold hover:underline transition-colors cursor-pointer"
        >
          View Details
        </button>
      )
    }
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Payments & Commissions"
          description="Live platform revenue splits, provider payouts, and real-time transaction records."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* 3 Stat Cards for Live Revenue Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Booking Value */}
        <StatCard
          label="Total Booking Value"
          value={`$${overview.totalBookingValue.toFixed(2)}`}
          icon={DollarSign}
          variant="emerald"
          changePercent={0}
          trend="neutral"
          comparisonText="collected gross revenue"
        />

        {/* Card 2: FerryGo Commission */}
        <StatCard
          label={`FerryGo Commission (${overview.commissionRate || 10}%)`}
          value={`$${overview.commission.toFixed(2)}`}
          icon={CircleDollarSign}
          variant="blue"
          changePercent={0}
          trend="neutral"
          comparisonText={`${overview.commissionRate || 10}% platform fee`}
        />

        {/* Card 3: Provider Amount */}
        <StatCard
          label={`Provider Amount (${100 - (overview.commissionRate || 10)}%)`}
          value={`$${overview.providerAmount.toFixed(2)}`}
          icon={CreditCard}
          variant="indigo"
          changePercent={0}
          trend="neutral"
          comparisonText={`${100 - (overview.commissionRate || 10)}% net operator payout`}
        />
      </div>

      {/* Filters Bar: Search & Status Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by reference, passenger, or provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-sm font-medium">
              {error instanceof Error ? error.message : "Failed to load live payment transactions."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-rose-300">
            Retry
          </Button>
        </div>
      )}

      {/* Transaction Records Table */}
      <div className="space-y-4">
        <DashboardTableCard
          title="Transaction Records"
          columns={paymentColumns}
          data={payments}
          keyExtractor={(item) => item.id}
          emptyMessage={isLoading ? "Loading live transactions..." : "No payment records found."}
          headerRight={isFetching ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : undefined}
        />

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground">
            <span>
              Showing {payments.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0} to{" "}
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1 || isLoading}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <span className="font-medium text-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages || isLoading}
                className="h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        payment={selectedPayment}
        open={!!selectedPayment}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null);
        }}
      />
    </div>
  );
}
