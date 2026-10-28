import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Ticket, Users } from "lucide-react";
import type { IAdminAnalyticsOverview } from "@/types";

interface AdminOverviewCardsProps {
  analytics?: IAdminAnalyticsOverview;
  isLoading: boolean;
}

export function AdminOverviewCards({ analytics, isLoading }: AdminOverviewCardsProps) {
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
                ? `Passenger reservations (${analytics.period.label})`
                : "Live passenger reservations"}
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
                  {analytics?.bookings?.confirmed ?? 0}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Live active
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
                  {analytics?.bookings?.checkedIn ?? 0}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Boarded passengers
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
                  {analytics?.bookings?.cancelled ?? 0}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  Voided bookings
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
              Platform Financials & Revenue
            </h2>
            <span className="text-muted-foreground text-[11px] font-medium">
              {analytics?.period?.label
                ? `Gross volume & operator payout (${analytics.period.label})`
                : "Gross sales volume & operator payout"}
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
            {/* Gross Booking Volume Card */}
            <div className="bg-muted/30 border-border/60 flex flex-col justify-between rounded-xl border p-3.5 dark:bg-zinc-800/30">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Gross Sales
              </p>
              <div className="mt-2">
                <p className="text-foreground text-2xl font-extrabold tracking-tight">
                  ${(analytics?.financials?.grossSales ?? 0).toFixed(2)}
                </p>
                <span className="text-muted-foreground mt-0.5 inline-block text-[10px] font-medium">
                  {analytics?.period?.label ? `${analytics.period.label} volume` : "Total volume"}
                </span>
              </div>
            </div>

            {/* Platform Commission Card */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-200/60 bg-blue-500/5 p-3.5 dark:border-blue-800/40 dark:bg-blue-950/20">
              <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase dark:text-blue-400">
                Platform Cut
              </p>
              <div className="mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                  ${(analytics?.financials?.platformCommission ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Operator Net Payout Card */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-200/60 bg-emerald-500/5 p-3.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                Operator Payout
              </p>
              <div className="mt-2">
                <p className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  ${(analytics?.financials?.providerPayout ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
