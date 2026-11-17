"use client";

import * as React from "react";

import {
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  Undo2
} from "lucide-react";
import { format } from "date-fns";

import { useAdminPayoutBookingsQuery, useAdminPayoutsQuery } from "@/hooks/use-admin";

import { StatCard, StatCardGridSkeleton, StatusBadge } from "@/widgets";
import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/ui";
import type { IAdminPayoutRow, StripeMode } from "@/types";

import { DownloadCsvButton, money, StripeRef, type PaymentsFilters } from "./payments-shared";

/** Spec 0006, AC-5, AC-7: earned net per operator for sailed trips, with the bookings behind it. */
export function PayoutsTab({ filters }: { filters: PaymentsFilters }) {
  const { data, isLoading, isFetching, error, refetch } = useAdminPayoutsQuery(
    filters.invalid ? undefined : filters.params
  );
  const [open, setOpen] = React.useState<string | null>(null);
  const totals = data?.totals;
  const rows = data?.data ?? [];
  const mode = data?.meta.stripeMode ?? "test";

  return (
    <div className="space-y-4">
      {isLoading ? (
        <StatCardGridSkeleton
          count={4}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Gross (sailed trips)"
            value={money(totals?.grossCents)}
            icon={ReceiptText}
            variant="emerald"
            comparisonText={`${totals?.bookings ?? 0} bookings`}
          />
          <StatCard
            label="Refunded"
            value={money(totals?.refundedCents)}
            icon={Undo2}
            variant="rose"
            comparisonText="succeeded and pending"
          />
          <StatCard
            label="Platform commission"
            value={money(totals?.commissionNetCents)}
            icon={CircleDollarSign}
            variant="blue"
            comparisonText="after refunds"
          />
          <StatCard
            label="Owed to operators"
            value={money(totals?.operatorNetCents)}
            icon={Landmark}
            variant="indigo"
            comparisonText="earned net, before payouts"
          />
        </div>
      )}

      <div className="bg-card rounded-xl border">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <h2 className="text-base font-semibold">Operator payouts</h2>
            <p className="text-muted-foreground text-xs">
              Paid Stripe bookings on trips that already sailed. Cancelled, expired, MANUAL and seed
              bookings are not counted.
            </p>
          </div>
          <DownloadCsvButton
            path="/admin/payments/payouts"
            params={filters.params}
            fileName="payouts.csv"
            disabled={filters.invalid}
          />
        </div>

        {error ? (
          <div className="text-destructive flex items-center justify-between gap-3 p-4 text-sm">
            Could not load the payouts.
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Operator net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={isFetching && !isLoading ? "opacity-60" : undefined}>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-10 text-center text-sm"
                    >
                      No sailed, paid bookings in this period.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row, idx) => (
                  <PayoutRow
                    key={row.operatorId}
                    serialNumber={idx + 1}
                    row={row}
                    expanded={open === row.operatorId}
                    onToggle={() => setOpen(open === row.operatorId ? null : row.operatorId)}
                    filters={filters}
                    mode={mode}
                  />
                ))}
                {rows.length > 0 && totals && (
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell />
                    <TableCell />
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totals.bookings}</TableCell>
                    <TableCell className="text-right">{money(totals.grossCents)}</TableCell>
                    <TableCell className="text-right">{money(totals.refundedCents)}</TableCell>
                    <TableCell className="text-right">{money(totals.commissionNetCents)}</TableCell>
                    <TableCell className="text-right">{money(totals.operatorNetCents)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutRow({
  serialNumber,
  row,
  expanded,
  onToggle,
  filters,
  mode
}: {
  serialNumber: number;
  row: IAdminPayoutRow;
  expanded: boolean;
  onToggle: () => void;
  filters: PaymentsFilters;
  mode: StripeMode;
}) {
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`Show bookings of ${row.operatorName}`}
            className="hover:bg-muted rounded p-1"
          >
            <Icon className="h-4 w-4" />
          </button>
        </TableCell>
        <TableCell className="w-12 text-center">
          <span className="text-muted-foreground font-mono text-xs font-semibold">
            #{serialNumber}
          </span>
        </TableCell>
        <TableCell className="font-medium">{row.operatorName}</TableCell>
        <TableCell className="text-right">{row.bookings}</TableCell>
        <TableCell className="text-right">{money(row.grossCents)}</TableCell>
        <TableCell className="text-right">{money(row.refundedCents)}</TableCell>
        <TableCell className="text-right text-blue-600 dark:text-blue-400">
          {money(row.commissionNetCents)}
        </TableCell>
        <TableCell className="text-right font-semibold">{money(row.operatorNetCents)}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="bg-muted/30 p-0">
            <PayoutBookings
              operatorId={row.operatorId}
              operatorName={row.operatorName}
              filters={filters}
              mode={mode}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PayoutBookings({
  operatorId,
  operatorName,
  filters,
  mode
}: {
  operatorId: string;
  operatorName: string;
  filters: PaymentsFilters;
  mode: StripeMode;
}) {
  const params = { from: filters.range.from, to: filters.range.to, page: 1, limit: 100 };
  const { data, isLoading, error } = useAdminPayoutBookingsQuery(
    filters.invalid ? null : operatorId,
    params
  );
  const rows = data?.data ?? [];

  return (
    <div className="space-y-2 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          Bookings behind {operatorName}
          {data && data.meta.total > rows.length && (
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              showing {rows.length} of {data.meta.total}, download the CSV for all
            </span>
          )}
        </p>
        <DownloadCsvButton
          path={`/admin/payments/payouts/${operatorId}/bookings`}
          params={{ from: filters.range.from, to: filters.range.to }}
          fileName="payout-bookings.csv"
        />
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <p className="text-destructive text-sm">Could not load the bookings.</p>
      ) : (
        <div className="bg-card overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Lead passenger</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Refunded</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Operator net</TableHead>
                <TableHead>Stripe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b, idx) => (
                <TableRow key={b.bookingId}>
                  <TableCell className="w-12 text-center">
                    <span className="text-muted-foreground font-mono text-xs font-semibold">
                      #{idx + 1}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(b.tripDepartureTime), "EEE d MMM, h:mm a")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <a
                      className="text-primary hover:underline"
                      href={`/dashboard/admin/bookings?search=${encodeURIComponent(b.bookingReference)}`}
                    >
                      {b.bookingReference}
                    </a>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{b.route}</TableCell>
                  <TableCell>{b.leadPassengerName}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-right">{money(b.grossCents)}</TableCell>
                  <TableCell className="text-right">{money(b.refundedCents)}</TableCell>
                  <TableCell className="text-right">{money(b.commissionNetCents)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {money(b.operatorNetCents)}
                  </TableCell>
                  <TableCell>
                    <StripeRef id={b.stripePaymentIntentId} mode={mode} kind="payments" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
