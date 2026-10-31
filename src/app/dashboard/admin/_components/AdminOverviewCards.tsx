import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Ticket, Users } from "lucide-react";
import type { IAdminAnalyticsOverview } from "@/types";

interface AdminOverviewCardsProps {
  analytics?: IAdminAnalyticsOverview;
  isLoading: boolean;
}

export function AdminOverviewCards({ analytics, isLoading }: AdminOverviewCardsProps) {
  const grossSales = analytics?.breakdowns?.financials?.grossSales ?? 0;
  const platformCommission = analytics?.breakdowns?.financials?.platformCommission ?? 0;
  const providerPayout = analytics?.breakdowns?.financials?.providerPayout ?? 0;

  // Spec 0001 AC-10: the share is derived from stored figures only. With no sales there is no
  // real share to show, so the chip is hidden instead of falling back to a guessed 10% / 90%.
  const commissionPct =
    grossSales > 0 ? Math.round((platformCommission / grossSales) * 100) : null;
  const payoutPct =
    grossSales > 0 ? Math.round((providerPayout / grossSales) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Booking Overview Section */}
      <div className="bg-card text-card-foreground border-border/80 rounded-xl border p-5 shadow-xs md:p-6 lg:col-span-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-sm font-bold tracking-tight">
              Booking Status Breakdown
            </h2>
            <span className="text-muted-foreground text-[11px] font-medium">
              {analytics?.period?.label
                ? `${analytics.breakdowns?.bookings?.total ?? 0} total reservations (${analytics.period.label})`
                : "Reservation lifecycle overview"}
            </span>
          </div>
          <Link
            href="/dashboard/admin/bookings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            <span>Manage</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-border/40 bg-muted/20 h-24 animate-pulse rounded-xl border"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Confirmed Bookings Card */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-200/60 bg-emerald-500/5 p-3.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                  Confirmed
                </p>
                <div className="rounded-md bg-emerald-100 p-1 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CalendarCheck className="h-3 w-3" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {analytics?.breakdowns?.bookings?.confirmed ?? 0}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Active reservations
                </span>
              </div>
            </div>

            {/* Checked In Bookings Card */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-200/60 bg-blue-500/5 p-3.5 dark:border-blue-800/40 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase dark:text-blue-400">
                  Checked In
                </p>
                <div className="rounded-md bg-blue-100 p-1 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                  <Users className="h-3 w-3" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                  {analytics?.breakdowns?.bookings?.checkedIn ?? 0}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Checked-in at pier
                </span>
              </div>
            </div>

            {/* Cancelled Bookings Card */}
            <div className="flex flex-col justify-between rounded-xl border border-rose-200/60 bg-rose-500/5 p-3.5 dark:border-rose-800/40 dark:bg-rose-950/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-wider text-rose-700 uppercase dark:text-rose-400">
                  Cancelled
                </p>
                <div className="rounded-md bg-rose-100 p-1 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                  <Ticket className="h-3 w-3" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                  {analytics?.breakdowns?.bookings?.cancelled ?? 0}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Cancelled bookings
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financials Overview Section */}
      <div className="bg-card text-card-foreground border-border/80 rounded-xl border p-5 shadow-xs md:p-6 lg:col-span-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-sm font-bold tracking-tight">
              Platform Financials
            </h2>
            <span className="text-muted-foreground text-[11px] font-medium">
              {analytics?.period?.label
                ? `Total ticket sales, platform fee & operator payouts (${analytics.period.label})`
                : "Total ticket sales, platform fee & operator payouts"}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-border/40 bg-muted/20 h-24 animate-pulse rounded-xl border"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* 1. Total Ticket Sales Card */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-200/60 bg-blue-500/5 p-3.5 dark:border-blue-800/40 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase dark:text-blue-400">
                  Total Ticket Sales
                </p>
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Total
                </span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                  ${grossSales.toFixed(2)}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Paid by passengers
                </span>
              </div>
            </div>

            {/* 2. Platform Fee Card */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-200/60 bg-emerald-500/5 p-3.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                  Platform Fee
                </p>
                {commissionPct !== null && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    {commissionPct}%
                  </span>
                )}
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  ${platformCommission.toFixed(2)}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Our platform earnings
                </span>
              </div>
            </div>

            {/* 3. Operator Payout Card */}
            <div className="bg-muted/30 border-border/60 flex flex-col justify-between rounded-xl border p-3.5 dark:bg-zinc-800/30">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Operator Payout
                </p>
                {payoutPct !== null && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground border border-border/50">
                    {payoutPct}%
                  </span>
                )}
              </div>
              <div className="mt-2">
                <p className="text-foreground text-2xl font-extrabold tracking-tight">
                  ${providerPayout.toFixed(2)}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Paid to ferry operators
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
