"use client";

import * as React from "react";

import { AlertCircle, Loader2, RotateCcw, Undo2 } from "lucide-react";

import { formatCents } from "@/lib/payment";
import { cn } from "@/lib/utils";

import { useRetryRefundMutation, type IRetriedRefund } from "@/hooks/use-admin";

import { Button } from "@/ui";
import type { IRefundSummary } from "@/types";

/**
 * Spec 0004 (AC-18, AC-21): the refunds on a booking's payment, newest first. A refund Stripe
 * rejected shows its reason, and an admin can send it again while money is still owed.
 */
interface BookingRefundsListProps {
  refunds: IRefundSummary[];
  currency: string;
  /** Only admins may retry (the backend enforces it too). */
  canRetry: boolean;
}

const STATUS_STYLE: Record<IRefundSummary["status"], string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  SUCCEEDED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  FAILED: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400"
};

const STATUS_LABEL: Record<IRefundSummary["status"], string> = {
  PENDING: "Processing",
  SUCCEEDED: "Refunded",
  FAILED: "Failed"
};

const REASON_LABEL: Record<string, string> = {
  CUSTOMER_CANCEL: "Customer cancel",
  ADMIN: "Admin cancel",
  LATE_PAYMENT: "Late payment",
  TRIP_CANCELLED: "Trip cancelled"
};

export function BookingRefundsList({ refunds, currency, canRetry }: BookingRefundsListProps) {
  const retryMutation = useRetryRefundMutation();
  // The modal shows a snapshot of the booking, so retries made here are added to the list.
  const [retried, setRetried] = React.useState<IRetriedRefund[]>([]);

  const rows: IRefundSummary[] = [
    ...retried.map((r) => ({
      id: r.id,
      amountCents: r.amountCents,
      status: r.status,
      reason: r.reason,
      failureMessage: r.failureMessage,
      createdAt: new Date().toISOString()
    })),
    ...refunds
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (rows.length === 0) return null;

  // Money is still owed only when no refund is on its way or done.
  const hasLiveRefund = rows.some((r) => r.status === "PENDING" || r.status === "SUCCEEDED");
  // One retry button, on the newest failed attempt; older failures stay as history.
  const newestFailedId = rows.find((r) => r.status === "FAILED")?.id;

  return (
    <div className="border-border/70 bg-card space-y-2.5 rounded-xl border p-4">
      <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
        <Undo2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden />
        Refunds ({rows.length})
      </span>
      <ul className="divide-border/60 divide-y">
        {rows.map((refund, index) => {
          const canRetryThis =
            canRetry && !!refund.id && refund.id === newestFailedId && !hasLiveRefund;
          const isRetrying = retryMutation.isPending && retryMutation.variables === refund.id;
          return (
            <li
              key={refund.id ?? `${refund.createdAt}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs first:pt-0 last:pb-0"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground font-bold">
                    {formatCents(refund.amountCents, currency)}
                  </span>
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-px text-[10px] font-bold",
                      STATUS_STYLE[refund.status]
                    )}
                  >
                    {STATUS_LABEL[refund.status]}
                  </span>
                  {refund.reason && (
                    <span className="text-muted-foreground text-[11px]">
                      {REASON_LABEL[refund.reason] ?? refund.reason}
                    </span>
                  )}
                </div>
                {refund.status === "FAILED" && refund.failureMessage && (
                  <p className="flex items-start gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden />
                    {refund.failureMessage}
                  </p>
                )}
              </div>
              {canRetryThis && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={retryMutation.isPending}
                  onClick={() =>
                    retryMutation.mutate(refund.id!, {
                      onSuccess: (response) => {
                        if (response?.data) setRetried((list) => [response.data!, ...list]);
                      }
                    })
                  }
                  className="h-7 gap-1 px-2.5 text-xs font-semibold"
                >
                  {isRetrying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Retry refund
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
