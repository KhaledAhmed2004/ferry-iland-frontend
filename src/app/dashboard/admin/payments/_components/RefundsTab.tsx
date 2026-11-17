"use client";

import * as React from "react";

import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";

import { useAdminRefundsQuery, useRetryRefundMutation } from "@/hooks/use-admin";
import { useTableState } from "@/hooks/use-table-state";

import {
  DataTable,
  StatCard,
  StatCardGridSkeleton,
  StatusBadge,
  TableToolbar,
  type DataTableColumn
} from "@/widgets";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ReusableSelect
} from "@/ui";
import type { AdminRefundSortField, IAdminRefundListItem } from "@/types";

import { DownloadCsvButton, money, StripeRef, type PaymentsFilters } from "./payments-shared";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "SUCCEEDED", label: "Succeeded" }
];

const REASON_OPTIONS = [
  { value: "ALL", label: "All reasons" },
  { value: "CUSTOMER_CANCEL", label: "Customer cancel" },
  { value: "ADMIN", label: "Admin" },
  { value: "TRIP_CANCELLED", label: "Trip cancelled" },
  { value: "LATE_PAYMENT", label: "Late payment" }
];

const REASON_LABEL: Record<IAdminRefundListItem["reason"], string> = {
  CUSTOMER_CANCEL: "Customer cancel",
  ADMIN: "Admin",
  TRIP_CANCELLED: "Trip cancelled",
  LATE_PAYMENT: "Late payment"
};

/** Spec 0006, AC-3, AC-4: every refund in one list, failed ones retryable. */
export function RefundsTab({ filters }: { filters: PaymentsFilters }) {
  const table = useTableState({
    prefix: "r_",
    defaultPageSize: 20,
    filters: { status: "ALL", reason: "ALL" },
    defaultSort: { id: "createdAt", desc: true }
  });
  const [retrying, setRetrying] = React.useState<IAdminRefundListItem | null>(null);
  const retry = useRetryRefundMutation();

  const params = {
    ...filters.params,
    page: table.page,
    limit: table.pageSize,
    search: table.debouncedSearch || undefined,
    status: table.filters.status,
    reason: table.filters.reason,
    sortBy: table.sortBy as AdminRefundSortField | undefined,
    sortOrder: table.sortOrder
  };
  const { data, isLoading, isFetching, error, refetch } = useAdminRefundsQuery(
    filters.invalid ? undefined : params
  );
  const mode = data?.meta.stripeMode ?? "test";
  const meta = data?.meta ?? { page: 1, limit: table.pageSize, total: 0, totalPages: 1 };
  const byStatus = data?.summary.amountCentsByStatus;

  const columns = React.useMemo<DataTableColumn<IAdminRefundListItem>[]>(
    () => [
      {
        id: "sl",
        header: "#",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "center", className: "w-12", headerClassName: "w-12" },
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs font-semibold">
            #{(meta.page - 1) * table.pageSize + row.index + 1}
          </span>
        )
      },
      {
        id: "createdAt",
        header: "Requested",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {format(new Date(row.original.createdAt), "EEE d MMM, h:mm a")}
          </span>
        )
      },
      {
        id: "bookingReference",
        header: "Booking",
        enableSorting: false,
        cell: ({ row }) => (
          <a
            className="text-primary font-mono text-xs font-medium hover:underline"
            href={`/dashboard/admin/bookings?search=${encodeURIComponent(row.original.bookingReference)}`}
          >
            {row.original.bookingReference}
          </a>
        )
      },
      {
        id: "leadPassengerName",
        header: "Lead passenger",
        accessorKey: "leadPassengerName",
        enableSorting: false
      },
      { id: "operatorName", header: "Operator", accessorKey: "operatorName", enableSorting: false },
      {
        id: "amountCents",
        header: "Amount",
        accessorKey: "amountCents",
        cell: ({ row }) => money(row.original.amountCents, row.original.currency),
        meta: { className: "font-semibold" }
      },
      {
        id: "reason",
        header: "Reason",
        enableSorting: false,
        cell: ({ row }) => REASON_LABEL[row.original.reason]
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge status={row.original.status} />
            {row.original.failureMessage && (
              <p
                className="text-destructive line-clamp-2 max-w-[240px] text-xs break-all whitespace-normal"
                title={row.original.failureMessage}
              >
                {row.original.failureMessage}
              </p>
            )}
          </div>
        )
      },
      {
        id: "stripeRefundId",
        header: "Stripe",
        enableSorting: false,
        cell: ({ row }) => <StripeRef id={row.original.stripeRefundId} mode={mode} kind="refunds" />
      },
      {
        id: "requestedByName",
        header: "Requested by",
        accessorKey: "requestedByName",
        enableSorting: false
      },
      {
        id: "processedAt",
        header: "Processed",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.processedAt ? (
            format(new Date(row.original.processedAt), "EEE d MMM, h:mm a")
          ) : (
            <span className="text-muted-foreground">–</span>
          )
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "right" },
        cell: ({ row }) =>
          row.original.canRetry ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => setRetrying(row.original)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry refund
            </Button>
          ) : null
      }
    ],
    [mode, meta.page, table.pageSize]
  );

  return (
    <div className="space-y-4">
      {isLoading ? (
        <StatCardGridSkeleton count={3} className="grid grid-cols-1 gap-4 sm:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Succeeded"
            value={money(byStatus?.SUCCEEDED)}
            icon={CheckCircle2}
            variant="emerald"
            comparisonText="sent back to cards"
          />
          <StatCard
            label="Pending"
            value={money(byStatus?.PENDING)}
            icon={Clock}
            variant="amber"
            comparisonText="waiting for Stripe"
          />
          <StatCard
            label="Failed"
            value={money(byStatus?.FAILED)}
            icon={AlertTriangle}
            variant="rose"
            comparisonText="need a retry or a check in Stripe"
          />
        </div>
      )}

      <DataTable
        title="Refunds"
        itemName="refunds"
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        emptyMessage="No refunds match these filters."
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        manualSorting
        enableColumnVisibility
        storageKey="admin-refunds"
        initialColumnVisibility={{ processedAt: false, requestedByName: false }}
        headerRight={
          <DownloadCsvButton
            path="/admin/payments/refunds"
            params={{ ...params, page: undefined, limit: undefined }}
            fileName="refunds.csv"
            disabled={filters.invalid}
          />
        }
        toolbar={
          <TableToolbar
            searchTerm={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search reference, passenger or Stripe refund id..."
          >
            <ReusableSelect
              value={table.filters.status}
              onValueChange={(value) => table.setFilter("status", value)}
              options={STATUS_OPTIONS}
              className="h-8 w-full text-xs sm:w-[150px]"
            />
            <ReusableSelect
              value={table.filters.reason}
              onValueChange={(value) => table.setFilter("reason", value)}
              options={REASON_OPTIONS}
              className="h-8 w-full text-xs sm:w-[160px]"
            />
          </TableToolbar>
        }
        pagination={{
          page: meta.page,
          pageSize: table.pageSize,
          totalCount: meta.total,
          totalPages: meta.totalPages,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize
        }}
      />

      <Dialog open={!!retrying} onOpenChange={(open) => !open && setRetrying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry this refund?</DialogTitle>
            <DialogDescription>
              Booking {retrying?.bookingReference}: Stripe rejected it with &ldquo;
              {retrying?.failureMessage ?? "an error"}&rdquo;. A new refund is sent for what is
              still owed to the customer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetrying(null)}>
              Not now
            </Button>
            <Button
              disabled={retry.isPending}
              onClick={() => {
                if (!retrying) return;
                retry.mutate(retrying.id, { onSettled: () => setRetrying(null) });
              }}
            >
              {retry.isPending ? "Sending..." : "Retry refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
