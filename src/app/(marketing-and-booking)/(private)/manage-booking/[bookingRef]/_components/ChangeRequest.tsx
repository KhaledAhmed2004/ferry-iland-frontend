"use client";

import { useId, useState } from "react";

import { format } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  Hourglass,
  MessageSquareText,
  Undo2,
  XCircle
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Badge,
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
import { TripPicker } from "@/components/widgets/booking-moves/TripPicker";
import type {
  BookingRequestStatus,
  BookingRequestType,
  IBookingRequestView,
  ICreateBookingRequestPayload
} from "@/types";

export type IChangeRequestInput = Pick<
  ICreateBookingRequestPayload,
  "type" | "reason" | "preferredScheduleId" | "preferredReturnScheduleId"
>;

/**
 * Spec 0004 (AC-5, AC-6, AC-18): inside 24 hours a customer asks instead of cancelling. These pieces
 * show the waiting request (with Withdraw), the operator's last answer with its note, and the
 * dialog that sends a new request. What may be asked comes from the backend `cancellation` block.
 */

const REASON_MAX = 500;

const typeLabel: Record<BookingRequestType, string> = {
  CANCEL: "Cancellation",
  RESCHEDULE: "Reschedule"
};

const outcome: Record<
  Exclude<BookingRequestStatus, "PENDING">,
  { label: string; tone: string; icon: typeof CheckCircle2 }
> = {
  CANCELLED: {
    label: "Cancelled by the operator",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2
  },
  RESCHEDULED: {
    label: "Moved to another trip",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2
  },
  REJECTED: {
    label: "Request declined",
    tone: "border-destructive/20 bg-destructive/10 text-destructive",
    icon: XCircle
  },
  WITHDRAWN: {
    label: "You withdrew this request",
    tone: "border-border bg-muted/40 text-muted-foreground",
    icon: Undo2
  }
};

const stamp = (iso: string | null) => (iso ? format(new Date(iso), "d MMM, h:mm a") : null);

interface RequestStatusBlockProps {
  pendingRequest: IBookingRequestView | null;
  lastResolvedRequest: IBookingRequestView | null;
  onWithdraw: (requestId: string) => void;
  isWithdrawing: boolean;
}

export function RequestStatusBlock({
  pendingRequest,
  lastResolvedRequest,
  onWithdraw,
  isWithdrawing
}: RequestStatusBlockProps) {
  if (pendingRequest) {
    const sent = stamp(pendingRequest.createdAt);
    return (
      <div
        role="status"
        className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Hourglass
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <div className="space-y-0.5">
              <div className="text-foreground font-bold">
                {pendingRequest.leg === "RETURN"
                  ? "Return trip change requested"
                  : `${typeLabel[pendingRequest.type]} requested`}
              </div>
              <div className="text-muted-foreground text-[11px]">
                The ferry operator will review it{sent ? `. Sent ${sent}.` : "."}
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-400"
          >
            Request pending
          </Badge>
        </div>
        {pendingRequest.reason && (
          <p className="text-muted-foreground border-l-2 border-amber-500/40 pl-2.5 text-[11px] italic">
            &ldquo;{pendingRequest.reason}&rdquo;
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isWithdrawing}
          onClick={() => onWithdraw(pendingRequest.id)}
          className="h-8 w-full gap-1.5 rounded-xl text-xs font-semibold"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden />
          {isWithdrawing ? "Withdrawing..." : "Withdraw request"}
        </Button>
      </div>
    );
  }

  if (!lastResolvedRequest || lastResolvedRequest.status === "PENDING") return null;

  const view = outcome[lastResolvedRequest.status];
  const Icon = view.icon;
  const answered = stamp(lastResolvedRequest.resolvedAt);
  return (
    <div role="status" className={cn("space-y-2 rounded-2xl border p-3.5 text-xs", view.tone)}>
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="space-y-0.5">
          <div className="font-bold">{view.label}</div>
          <div className="text-muted-foreground text-[11px]">
            Your {typeLabel[lastResolvedRequest.type].toLowerCase()} request
            {answered ? `, answered ${answered}` : ""}.
          </div>
        </div>
      </div>
      {lastResolvedRequest.staffNote && (
        <div className="bg-background/60 text-foreground flex items-start gap-2 rounded-xl p-2.5 text-[11px]">
          <MessageSquareText
            className="text-muted-foreground mt-px h-3.5 w-3.5 shrink-0"
            aria-hidden
          />
          <span>
            <span className="font-semibold">Operator note: </span>
            {lastResolvedRequest.staffNote}
          </span>
        </div>
      )}
    </div>
  );
}

interface ChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: string;
  /** BOOKING: cancel or move the whole booking. RETURN: after boarding, only the return can move. */
  scope: "BOOKING" | "RETURN";
  /** The booking has a return leg, so a return trip may be preferred too. */
  hasReturn: boolean;
  /** A guest proves access to the trip list with the lead passenger email. */
  email?: string;
  isSubmitting: boolean;
  onSubmit: (input: IChangeRequestInput) => void;
}

export function ChangeRequestDialog({
  open,
  onOpenChange,
  reference,
  scope,
  hasReturn,
  email,
  isSubmitting,
  onSubmit
}: ChangeRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {scope === "RETURN" ? "Request a different return trip" : "Request a change"}
          </DialogTitle>
          <DialogDescription>
            Booking <span className="text-foreground font-mono font-bold">{reference}</span> departs
            in less than 24 hours, so the ferry operator decides. You will see their answer on this
            page.
          </DialogDescription>
        </DialogHeader>

        {/* The form mounts with the dialog content, so every open starts fresh. */}
        <ChangeRequestForm
          reference={reference}
          scope={scope}
          hasReturn={hasReturn}
          email={email}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function ChangeRequestForm({
  reference,
  scope,
  hasReturn,
  email,
  isSubmitting,
  onSubmit
}: Omit<ChangeRequestDialogProps, "open" | "onOpenChange">) {
  const [type, setType] = useState<BookingRequestType>(
    scope === "RETURN" ? "RESCHEDULE" : "CANCEL"
  );
  const [reason, setReason] = useState("");
  // Optional: the trip the customer would like; the operator still decides (AC-5).
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [preferredReturnId, setPreferredReturnId] = useState<string | null>(null);
  const reasonId = useId();
  const counterId = useId();

  const options: {
    value: BookingRequestType;
    title: string;
    text: string;
    icon: typeof XCircle;
  }[] =
    scope === "RETURN"
      ? [
          {
            value: "RESCHEDULE",
            title: "A different return trip",
            text: "The operator moves your return to another sailing on the same route.",
            icon: CalendarClock
          }
        ]
      : [
          {
            value: "CANCEL",
            title: "Cancel my booking",
            text: "If the operator approves, you get a full refund to your card.",
            icon: XCircle
          },
          {
            value: "RESCHEDULE",
            title: "Move to another trip",
            text: "The operator moves you to another sailing on the same route.",
            icon: CalendarClock
          }
        ];

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const isReschedule = type === "RESCHEDULE";
        onSubmit({
          type,
          reason: reason.trim() || undefined,
          preferredScheduleId: isReschedule && preferredId ? preferredId : undefined,
          preferredReturnScheduleId:
            isReschedule && preferredReturnId ? preferredReturnId : undefined
        });
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-foreground mb-2 text-xs font-bold">What would you like?</legend>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = type === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-xs transition-colors",
                "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
                selected
                  ? "border-[#003B95] bg-[#F0F7FF] dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-border/80 hover:bg-muted/40"
              )}
            >
              <input
                type="radio"
                name="request-type"
                value={option.value}
                checked={selected}
                onChange={() => setType(option.value)}
                className="sr-only"
              />
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  selected ? "text-[#003B95] dark:text-blue-400" : "text-muted-foreground"
                )}
                aria-hidden
              />
              <span className="space-y-0.5">
                <span className="text-foreground block font-bold">{option.title}</span>
                <span className="text-muted-foreground block text-[11px]">{option.text}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {type === "RESCHEDULE" && (
        <div className="border-border/80 space-y-4 rounded-2xl border p-3.5">
          {scope === "BOOKING" && (
            <TripPicker
              reference={reference}
              leg="OUTBOUND"
              legend="Preferred outbound trip (optional)"
              email={email}
              value={preferredId}
              onChange={setPreferredId}
              allowKeep
              keepLabel="No preference"
              disabled={isSubmitting}
            />
          )}
          {(scope === "RETURN" || hasReturn) && (
            <TripPicker
              reference={reference}
              leg="RETURN"
              legend="Preferred return trip (optional)"
              email={email}
              value={preferredReturnId}
              onChange={setPreferredReturnId}
              allowKeep
              keepLabel="No preference"
              disabled={isSubmitting}
            />
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={reasonId} className="text-xs font-bold">
          Message to the operator{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <textarea
          id={reasonId}
          aria-describedby={counterId}
          value={reason}
          maxLength={REASON_MAX}
          rows={3}
          onChange={(event) => setReason(event.target.value)}
          placeholder={
            type === "RESCHEDULE"
              ? "For example: I would prefer the afternoon sailing tomorrow."
              : "For example: I am unwell and cannot travel."
          }
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-xl border px-3 py-2 text-xs focus-visible:ring-2 focus-visible:outline-none"
        />
        <div id={counterId} className="text-muted-foreground text-right text-[10px]">
          {reason.length}/{REASON_MAX}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold"
          >
            Not now
          </Button>
        </DialogClose>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="rounded-xl text-xs font-bold"
        >
          {isSubmitting ? "Sending..." : "Send request"}
        </Button>
      </DialogFooter>
    </form>
  );
}
