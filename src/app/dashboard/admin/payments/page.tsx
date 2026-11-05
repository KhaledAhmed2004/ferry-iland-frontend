"use client";

import * as React from "react";
import { CircleDollarSign, CreditCard, DollarSign, Eye, RefreshCw } from "lucide-react";

import { useAdminPaymentsQuery } from "@/hooks/use-admin";
import { useTableState } from "@/hooks/use-table-state";
import type { AdminPaymentSortField, IAdminPaymentListItem } from "@/types";
import { Button, ReusableSelect } from "@/ui";
import {
  DataTable,
  PageHeader,
  PaymentDetailsModal,
  StatCard,
  StatCardGridSkeleton,
  StatusBadge,
  TableToolbar,
  type DataTableColumn,
  DataTableRowActions
} from "@/widgets";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "CANCELED", label: "Canceled" }
];

const money = (value: number) => `$${value.toFixed(2)}`;

export default function AdminPaymentsPage() {
  const table = useTableState({
    filters: { status: "ALL" },
    defaultSort: { id: "createdAt", desc: true }
  });
  const [selectedPayment, setSelectedPayment] = React.useState<IAdminPaymentListItem | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useAdminPaymentsQuery({
    page: table.page,
    limit: table.pageSize,
    search: table.debouncedSearch || undefined,
    status: table.filters.status,
    sortBy: table.sortBy as AdminPaymentSortField | undefined,
    sortOrder: table.sortOrder
  });

  const overview = data?.overview ?? {
    totalBookingValue: 0,
    commission: 0,
    providerAmount: 0,
    commissionRate: 10
  };
  const commissionRate = overview.commissionRate || 10;
  const payments = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: table.pageSize, total: 0, totalPages: 1 };

  // Column ids double as the backend `sortBy` values.
  const columns = React.useMemo<DataTableColumn<IAdminPaymentListItem>[]>(
    () => [
      {
        id: "bookingReference",
        header: "Booking Reference",
        accessorKey: "bookingReference",
        meta: { className: "font-mono font-medium text-slate-700 dark:text-slate-300" }
      },
      {
        id: "provider",
        header: "Provider",
        accessorKey: "provider",
        enableSorting: false,
        meta: { className: "font-medium" }
      },
      {
        id: "passenger",
        header: "Passenger",
        accessorKey: "passenger",
        enableSorting: false
      },
      {
        id: "bookingAmount",
        header: "Booking Amount",
        accessorKey: "bookingAmount",
        cell: ({ row }) => money(row.original.bookingAmount),
        meta: { className: "font-bold" }
      },
      {
        id: "commission",
        header: "Commission",
        accessorKey: "commission",
        cell: ({ row }) => money(row.original.commission),
        meta: { className: "font-semibold text-blue-600 dark:text-blue-400" }
      },
      {
        id: "providerAmount",
        header: "Provider Amount",
        accessorKey: "providerAmount",
        cell: ({ row }) => money(row.original.providerAmount),
        meta: { className: "font-medium" }
      },
      {
        id: "paymentStatus",
        header: "Payment Status",
        accessorKey: "paymentStatus",
        cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              { label: "View details", icon: Eye, onSelect: () => setSelectedPayment(row.original) }
            ]}
          />
        )
      }
    ],
    []
  );

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <StatCardGridSkeleton count={3} className="grid grid-cols-1 gap-4 sm:grid-cols-3" />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Booking Value"
          value={money(overview.totalBookingValue)}
          icon={DollarSign}
          variant="emerald"
          changePercent={0}
          trend="neutral"
          comparisonText="collected gross revenue"
        />
        <StatCard
          label={`FerryGo Commission (${commissionRate}%)`}
          value={money(overview.commission)}
          icon={CircleDollarSign}
          variant="blue"
          changePercent={0}
          trend="neutral"
          comparisonText={`${commissionRate}% platform fee`}
        />
        <StatCard
          label={`Provider Amount (${100 - commissionRate}%)`}
          value={money(overview.providerAmount)}
          icon={CreditCard}
          variant="indigo"
          changePercent={0}
          trend="neutral"
          comparisonText={`${100 - commissionRate}% net operator payout`}
        />
      </div>
      )}

      <DataTable
        title="Transaction Records"
        itemName="records"
        columns={columns}
        data={payments}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        emptyMessage="No payment records found."
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        enableColumnVisibility
        storageKey="admin-payments"
        initialColumnVisibility={{ passenger: false }}
        toolbar={
          <TableToolbar
            searchTerm={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search by reference, passenger, or provider..."
          >
            <ReusableSelect
              value={table.filters.status}
              onValueChange={(value) => table.setFilter("status", value)}
              options={STATUS_OPTIONS}
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
