"use client";

import * as React from "react";

import { format } from "date-fns";
import { AlertCircle, Clock, Loader2, Ship, Star, Users } from "lucide-react";

import { cn } from "@/lib/utils";

import { useMoveOptionsQuery } from "@/hooks";

import type { BookingLeg } from "@/types";

/**
 * Spec 0004 (AC-15): a radio list of the trips one booking leg may move to. The backend applies
 * every move rule; this only lists what it returns. Used by the staff
 * reschedule and move dialogs and by the customer's preferred trip choice.
 */
interface TripPickerProps {
  reference: string;
  leg: BookingLeg;
  /** The chosen schedule id, or null for "keep the current trip". */
  value: string | null;
  onChange: (scheduleId: string | null) => void;
  legend: string;
  /** A guest proves access with the lead passenger email. */
  email?: string;
  /** The trip the customer asked for, marked in the list. */
  preferredScheduleId?: string | null;
  /** Shows a "keep current trip" choice (needed when either leg may move). */
  allowKeep?: boolean;
  keepLabel?: string;
  accent?: "emerald" | "blue";
  disabled?: boolean;
}

export function TripPicker({
  reference,
  leg,
  value,
  onChange,
  legend,
  email,
  preferredScheduleId,
  allowKeep = false,
  keepLabel = "Keep the current trip",
  accent = "blue",
  disabled = false
}: TripPickerProps) {
  const {
    data: options = [],
    isLoading,
    isError,
    error
  } = useMoveOptionsQuery(reference, leg, {
    email
  });
  const name = React.useId();

  // A preferred trip that is no longer allowed is dropped from the selection.
  React.useEffect(() => {
    if (!isLoading && value && !options.some((o) => o.scheduleId === value)) {
      onChange(null);
    }
  }, [isLoading, options, value, onChange]);

  const selectedClass =
    accent === "emerald"
      ? "border-emerald-500 bg-emerald-500/10"
      : "border-[#003B95] bg-[#F0F7FF] dark:border-blue-400 dark:bg-blue-950/30";

  const choice = (
    key: string,
    checked: boolean,
    onSelect: () => void,
    content: React.ReactNode
  ) => (
    <label
      key={key}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-xs transition-colors",
        "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        checked ? selectedClass : "border-border/80 hover:bg-muted/40"
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="mt-0.5 accent-current"
      />
      {content}
    </label>
  );

  return (
    <fieldset className="space-y-2" aria-busy={isLoading}>
      <legend className="text-foreground mb-2 text-xs font-bold">{legend}</legend>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-3 text-xs" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Finding trips you can move
          to...
        </div>
      ) : isError ? (
        <p className="text-destructive flex items-start gap-1.5 text-xs" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error?.message || "Could not load the trips for this booking."}
        </p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {allowKeep &&
            choice(
              "keep",
              value === null,
              () => onChange(null),
              <span className="text-foreground font-semibold">{keepLabel}</span>
            )}
          {options.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-xs">
              No other trip on this route with this operator has enough seats right now.
            </p>
          ) : (
            options.map((option) => {
              const isPreferred = option.scheduleId === preferredScheduleId;
              return choice(
                option.scheduleId,
                value === option.scheduleId,
                () => onChange(option.scheduleId),
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-foreground flex flex-wrap items-center gap-x-2 font-bold">
                    {format(new Date(option.departureTime), "EEE d MMM")}
                    <span className="flex items-center gap-1 font-mono font-semibold">
                      <Clock className="h-3 w-3" aria-hidden />
                      {format(new Date(option.departureTime), "h:mm a")} to{" "}
                      {format(new Date(option.arrivalTime), "h:mm a")}
                    </span>
                    {isPreferred && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        <Star className="h-2.5 w-2.5" aria-hidden /> Customer&apos;s choice
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Ship className="h-3 w-3" aria-hidden /> {option.ferryName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" aria-hidden /> {option.availableSeats} seats left
                    </span>
                  </span>
                </span>
              );
            })
          )}
        </div>
      )}
    </fieldset>
  );
}
