"use client";

import * as React from "react";

import { CircleDollarSign, Landmark, ReceiptText, Undo2, Wallet } from "lucide-react";
import { format } from "date-fns";

import { useAdminPaymentsQuery } from "@/hooks/use-admin";
import { useTableState } from "@/hooks/use-table-state";

import {
  DataTable,
  StatCard,
  StatCardGridSkeleton,
  StatusBadge,
  TableToolbar,
  type DataTableColumn
} from "@/widgets";
import { ReusableSelect } from "@/ui";
import type { AdminPaymentSortField, IAdminPaymentListItem } from "@/types";

import { DownloadCsvButton, money, StripeRef, type PaymentsFilters } from "./payments-shared";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PARTIALLY_REFUNDED", label: "Partly refunded" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELED", label: "Canceled" }
];

const PROVIDER_LABEL: Record<IAdminPaymentListItem["provider"], string> = {
  STRIPE: "Stripe",
  MANUAL: "Manual",
  LEGACY_SEED: "Seed"
};

/** Spec 0006, AC-1, AC-2: every payment with Stripe links and filter aware cards. */
export function PaymentsTab({ filters }: { filters: PaymentsFilters }) {
  const table = useTableState({
    prefix: "p_",
    defaultPageSize: 20,
    filters: { status: "ALL" },
    defaultSort: { id: "paidAt", desc: true }
  });

  const params = {
    ...filters.params,
    page: table.page,
    limit: table.pageSize,
    search: table.debouncedSearch || undefined,
    status: table.filters.status,
    sortBy: table.sortBy as AdminPaymentSortField | undefined,
    sortOrder: table.sortOrder
  };
  const { data, isLoading, isFetching, error, refetch } = useAdminPaymentsQuery(
    filters.invalid ? undefined : params
  );
  const overview = data?.overview;
  const mode = data?.meta.stripeMode ?? "test";
  const meta = data?.meta ?? { page: 1, limit: table.pageSize, total: 0, totalPages: 1 };

  // Column ids double as the backend `sortBy` values.
  const columns = React.useMemo<DataTableColumn<IAdminPaymentListItem>[]>(
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
        id: "bookingReference",
        header: "Booking",
        accessorKey: "bookingReference",
        cell: ({ row }) => (
          <a
            className="text-primary font-mono text-xs font-medium hover:underline"
            href={`/dashboard/admin/bookings?search=${encodeURIComponent(row.original.bookingReference)}`}
          >
            {row.original.bookingReference}
          </a>
        )
      },
      { id: "operatorName", header: "Operator", accessorKey: "operatorName", enableSorting: false },
      {
        id: "leadPassengerName",
        header: "Lead passenger",
        accessorKey: "leadPassengerName",
        enableSorting: false
      },
      {
        id: "amountCents",
        header: "Amount",
        accessorKey: "amountCents",
        cell: ({ row }) => money(row.original.amountCents, row.original.currency),
        meta: { className: "font-semibold" }
      },
      {
        id: "refundedCents",
        header: "Refunded",
        accessorKey: "refundedCents",
        cell: ({ row }) =>
          row.original.refundedCents ? (
            money(row.original.refundedCents, row.original.currency)
          ) : (
            <span className="text-muted-foreground">–</span>
          )
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />
      },
      {
        id: "provider",
        header: "Provider",
        accessorKey: "provider",
        enableSorting: false,
        cell: ({ row }) => PROVIDER_LABEL[row.original.provider]
      },
      {
        id: "paidAt",
        header: "Paid",
        accessorKey: "paidAt",
        cell: ({ row }) =>
          row.original.paidAt ? (
            <span className="whitespace-nowrap">
              {format(new Date(row.original.paidAt), "EEE d MMM, h:mm a")}
            </span>
          ) : (
            <span className="text-muted-foreground">Not paid</span>
          )
      },
      {
        id: "stripePaymentIntentId",
        header: "Stripe",
        enableSorting: false,
        cell: ({ row }) => (
          <StripeRef id={row.original.stripePaymentIntentId} mode={mode} kind="payments" />
        )
      },
      { id: "route", header: "Route", accessorKey: "route", enableSorting: false },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "createdAt",
        cell: ({ row }) => format(new Date(row.original.createdAt), "EEE d MMM, h:mm a")
      }
    ],
    [mode, meta.page, table.pageSize]
  );

  return (
    <div className="space-y-4">
      {isLoading ? (
        <StatCardGridSkeleton
          count={5}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Collected"
              value={money(overview?.collectedCents)}
              icon={ReceiptText}
              variant="emerald"
              comparisonText="paid through Stripe"
            />
            <StatCard
              label="Refunded"
              value={money(overview?.refundedCents)}
              icon={Undo2}
              variant="rose"
              comparisonText="succeeded and pending"
            />
            <StatCard
              label="Net"
              value={money(overview?.netCents)}
              icon={Wallet}
              variant="default"
              comparisonText="collected minus refunded"
            />
            <StatCard
              label="Commission"
              value={money(overview?.commissionNetCents)}
              icon={CircleDollarSign}
              variant="blue"
              comparisonText="platform share, net"
            />
            <StatCard
              label="Operator share"
              value={money(overview?.operatorNetCents)}
              icon={Landmark}
              variant="indigo"
              comparisonText="by paid date"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Cards count paid Stripe payments for the period, operator and search, whatever the
            status filter. MANUAL and seed payments are listed but not counted.
          </p>
        </div>
      )}

      <DataTable
        title="Payments"
        itemName="payments"
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        emptyMessage="No payments match these filters."
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        manualSorting
        enableColumnVisibility
        storageKey="admin-payments-v2"
        initialColumnVisibility={{ route: false, createdAt: false }}
        headerRight={
          <DownloadCsvButton
            path="/admin/payments"
            params={{ ...params, page: undefined, limit: undefined }}
            fileName="payments.csv"
            disabled={filters.invalid}
          />
        }
        toolbar={
          <TableToolbar
            searchTerm={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search reference, passenger or operator..."
          >
            <ReusableSelect
              value={table.filters.status}
              onValueChange={(value) => table.setFilter("status", value)}
              options={STATUS_OPTIONS}
              className="h-8 w-full text-xs sm:w-[170px]"
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
    </div>
  );
}
