"use client";

import * as React from "react";

import { useMoveBookingMutation } from "@/hooks";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label
} from "@/ui";

import { TripPicker } from "./TripPicker";

/**
 * Spec 0004 (AC-11 to AC-14, AC-18, AC-19): staff move a booking to another trip on the same
 * route with the same operator, for example a passenger who did not show up. Ticket numbers,
 * price, and payment stay the same; an open customer request is closed as rescheduled.
 */
export interface IMoveBookingTarget {
  reference: string;
  leadPassengerName: string;
  passengers: number;
  status: string;
  hasReturn: boolean;
}

interface MoveBookingDialogProps {
  booking: IMoveBookingTarget;
  accent?: "emerald" | "blue";
  onOpenChange: (open: boolean) => void;
}

const REASON_MAX = 500;

/** Bookings that may still move (a move on anything else is refused by the backend). */
export const isMovableBooking = (status: string) =>
  status === "CONFIRMED" || status === "CHECKED_IN";

export function MoveBookingDialog({
  booking,
  accent = "blue",
  onOpenChange
}: MoveBookingDialogProps) {
  const moveMutation = useMoveBookingMutation();
  const [outboundId, setOutboundId] = React.useState<string | null>(null);
  const [returnId, setReturnId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const reasonId = React.useId();

  // The outbound was used once the passenger boarded; only the return may move (AC-12).
  const isBoarded = booking.status === "CHECKED_IN";
  const canSubmit = !moveMutation.isPending && (!!outboundId || !!returnId);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move to another trip</DialogTitle>
          <DialogDescription>
            Booking <span className="text-foreground font-mono font-bold">{booking.reference}</span>{" "}
            · {booking.leadPassengerName} · {booking.passengers} pax. Ticket numbers and the price
            stay the same.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            moveMutation.mutate(
              {
                reference: booking.reference,
                outboundScheduleId: outboundId ?? undefined,
                returnScheduleId: returnId ?? undefined,
                reason: reason.trim() || undefined
              },
              { onSuccess: () => onOpenChange(false) }
            );
          }}
        >
          {isBoarded ? (
            <p className="text-muted-foreground bg-muted/30 rounded-xl p-3 text-xs">
              The passenger already boarded the outbound trip, so only the return trip can move.
            </p>
          ) : (
            <TripPicker
              reference={booking.reference}
              leg="OUTBOUND"
              legend="New outbound trip"
              value={outboundId}
              onChange={setOutboundId}
              allowKeep={booking.hasReturn}
              accent={accent}
              disabled={moveMutation.isPending}
            />
          )}

          {booking.hasReturn && (
            <TripPicker
              reference={booking.reference}
              leg="RETURN"
              legend="New return trip"
              value={returnId}
              onChange={setReturnId}
              allowKeep={!isBoarded}
              accent={accent}
              disabled={moveMutation.isPending}
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor={reasonId} className="text-xs font-bold">
              Reason{" "}
              <span className="text-muted-foreground font-normal">
                (optional, kept in the history)
              </span>
            </Label>
            <textarea
              id={reasonId}
              value={reason}
              maxLength={REASON_MAX}
              rows={2}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example: Passenger missed the 8:00 sailing."
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-xl border px-3 py-2 text-xs focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-semibold"
              >
                Back
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="rounded-xl text-xs font-bold"
            >
              {moveMutation.isPending ? "Moving..." : "Move booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
