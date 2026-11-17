"use client";

import * as React from "react";

import { Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { downloadAdminCsv } from "@/hooks/use-admin";

import { Button } from "@/ui";
import type { StripeMode } from "@/types";

/** Spec 0006: shared pieces of the admin payments tabs. */

export const TABS = ["payments", "refunds", "payouts"] as const;
export type PaymentsTab = (typeof TABS)[number];

const PRESETS = ["this-month", "last-month", "last-7-days", "all", "custom"] as const;
export type RangePreset = (typeof PRESETS)[number];

const ymd = (date: Date) => format(date, "yyyy-MM-dd");

/** AC-9: dates only, from the browser's today; the server matches them as port local days. */
export function presetRange(preset: RangePreset, custom: { from: string; to: string }) {
  const today = new Date();
  switch (preset) {
    case "this-month":
      return { from: ymd(startOfMonth(today)), to: ymd(today) };
    case "last-month": {
      const last = subMonths(today, 1);
      return { from: ymd(startOfMonth(last)), to: ymd(endOfMonth(last)) };
    }
    case "last-7-days":
      return { from: ymd(subDays(today, 6)), to: ymd(today) };
    case "all":
      return { from: undefined, to: undefined };
    case "custom":
      return { from: custom.from || undefined, to: custom.to || undefined };
  }
}

/** Tab, date range and operator live in the URL so a filtered view can be shared or reloaded. */
export function usePaymentsFilters() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(TABS).withDefault("payments"),
      range: parseAsStringLiteral(PRESETS).withDefault("all"),
      from: parseAsString.withDefault(""),
      to: parseAsString.withDefault(""),
      operator: parseAsString.withDefault("")
    },
    { history: "replace", scroll: false }
  );
  const range = React.useMemo(
    () => presetRange(state.range, { from: state.from, to: state.to }),
    [state.range, state.from, state.to]
  );
  const invalid = !!range.from && !!range.to && range.from > range.to;
  return {
    tab: state.tab,
    preset: state.range,
    from: state.from,
    to: state.to,
    operator: state.operator,
    range,
    invalid,
    params: { ...range, operatorId: state.operator || undefined },
    setState
  };
}

export type PaymentsFilters = ReturnType<typeof usePaymentsFilters>;

/** Integer cents as dollars, e.g. 6150 → $61.50. */
export const money = (cents: number | null | undefined, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    (cents ?? 0) / 100
  );

/** AC-1, AC-3: a short Stripe id with copy and a link to the dashboard in the right mode. */
export function StripeRef({
  id,
  mode,
  kind
}: {
  id: string | null;
  mode: StripeMode;
  kind: "payments" | "refunds";
}) {
  if (!id) return <span className="text-muted-foreground">–</span>;
  const url = `https://dashboard.stripe.com/${mode === "test" ? "test/" : ""}${kind}/${id}`;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-primary inline-flex items-center gap-1 hover:underline"
        title={id}
      >
        {id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id}
        <ExternalLink className="h-3 w-3" aria-hidden />
        <span className="sr-only">Open in Stripe</span>
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(id).then(() => toast.success("Copied"))}
        className="text-muted-foreground hover:text-foreground rounded p-0.5"
        aria-label={`Copy ${id}`}
      >
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}

/** AC-8: downloads all rows that match the current filters. */
export function DownloadCsvButton({
  path,
  params,
  fileName,
  disabled
}: {
  path: string;
  params: object;
  fileName: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-2"
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadAdminCsv(path, params, fileName);
        } catch (error) {
          toast.error((error as Error)?.message || "Could not download the CSV.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download CSV
    </Button>
  );
}
