"use client";

import * as React from "react";

import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  Clock,
  Gavel,
  Inbox,
  Mail,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Ship,
  XCircle
} from "lucide-react";

import { formatCents } from "@/lib/payment";
import { cn } from "@/lib/utils";

import {
  useBookingRequestsQuery,
  usePendingBookingRequestCount,
  useResolveBookingRequestMutation
} from "@/hooks";

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
  Label,
  Tabs,
  TabsList,
  TabsTrigger
} from "@/ui";
import type { BookingRequestStatus, IBookingRequestLeg, IBookingRequestListItem } from "@/types";

import { TripPicker } from "../../booking-moves/TripPicker";
import {
  DashboardTableCard,
  StatusBadge,
  type TableColumn
} from "../data-table/DashboardTableCard";

/**
 * Spec 0004 (AC-7, AC-8, AC-10, AC-18): the staff Requests tab on the operator and admin Bookings
 * pages. Customers inside 24 hours of departure ask here; staff move the booking to another trip,
 * cancel with a full refund, or reject with a note. The backend scopes the list (an operator sees
 * only their own ferries).
 */

type StatusFilter = BookingRequestStatus | "ALL";
const NOTE_MAX = 500;
const PAGE_SIZE = 10;

/** One tab per final state, so the server does the filtering and paging. */
const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "ALL", label: "All" }
];

const legLine = (leg: IBookingRequestLeg) => ({
  route: `${leg.departurePort.name} → ${leg.destinationPort.name}`,
  when: format(new Date(leg.departureTime), "EEE d MMM, h:mm a")
});

const requestTitle = (item: IBookingRequestListItem) =>
  item.leg === "RETURN"
    ? "Different return trip"
    : item.type === "CANCEL"
      ? "Cancellation"
      : "Reschedule";

export type BookingsView = "bookings" | "requests";

/** Bookings | Requests switch for the Bookings pages, with the live pending count (AC-18). */
export function BookingsViewSwitch({
  value,
  onChange
}: {
  value: BookingsView;
  onChange: (view: BookingsView) => void;
}) {
  const { pendingCount } = usePendingBookingRequestCount();
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as BookingsView)}>
      <TabsList>
        <TabsTrigger value="bookings" className="text-xs font-semibold">
          Bookings
        </TabsTrigger>
        <TabsTrigger value="requests" className="gap-1.5 text-xs font-semibold">
          Requests
          {pendingCount > 0 && (
            <span
              className="rounded-full bg-amber-500 px-1.5 py-px font-mono text-[10px] font-bold text-white"
              aria-label={`${pendingCount} pending`}
            >
              {pendingCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

interface BookingRequestsPanelProps {
  /** Accent for the reference icon, matching the host page. */
  accent?: "emerald" | "blue";
}

export function BookingRequestsPanel({ accent = "emerald" }: BookingRequestsPanelProps) {
  const [filter, setFilter] = React.useState<StatusFilter>("PENDING");
  const [page, setPage] = React.useState(1);
  const [resolving, setResolving] = React.useState<IBookingRequestListItem | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useBookingRequestsQuery({
    status: filter === "ALL" ? undefined : filter,
    page,
    limit: PAGE_SIZE
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const pendingCount = meta?.pendingCount ?? 0;

  const columns: TableColumn<IBookingRequestListItem>[] = [
    {
      header: "BOOKING",
      cell: (item) => (
        <div className="space-y-0.5">
          <div className="text-foreground font-mono text-xs font-bold">
            {item.booking.reference}
          </div>
          <div className="text-muted-foreground text-[10px]">
            {item.booking.passengers} pax · {item.booking.tripType.replace(/_/g, " ").toLowerCase()}
          </div>
        </div>
      )
    },
    {
      header: "PASSENGER",
      cell: (item) => (
        <div className="max-w-[180px] space-y-0.5">
          <div className="text-foreground truncate text-xs font-bold">
            {item.booking.leadPassengerName}
          </div>
          <div className="text-muted-foreground flex items-center gap-1 truncate font-mono text-[11px]">
            <Mail className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{item.booking.leadPassengerEmail}</span>
          </div>
        </div>
      )
    },
    {
      header: "TRIP",
      cell: (item) => {
        const leg = legLine(
          item.leg === "RETURN" && item.booking.return ? item.booking.return : item.booking.outbound
        );
        return (
          <div className="max-w-[210px] space-y-0.5">
            <div className="text-foreground flex items-center gap-1 truncate text-xs font-medium">
              <MapPin
                className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <span className="truncate">{leg.route}</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-1 pl-4 font-mono text-[11px]">
              <Clock className="h-2.5 w-2.5" aria-hidden />
              <span>{leg.when}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: "REQUEST",
      cell: (item) => (
        <div className="max-w-[220px] space-y-1">
          <div className="text-foreground flex items-center gap-1.5 text-xs font-bold">
            {item.type === "CANCEL" ? (
              <XCircle className="text-destructive h-3.5 w-3.5" aria-hidden />
            ) : (
              <CalendarClock
                className="h-3.5 w-3.5 text-[#003B95] dark:text-blue-400"
                aria-hidden
              />
            )}
            {requestTitle(item)}
          </div>
          {item.reason ? (
            <p className="text-muted-foreground line-clamp-2 text-[11px] italic">
              &ldquo;{item.reason}&rdquo;
            </p>
          ) : (
            <p className="text-muted-foreground/70 text-[11px]">No message</p>
          )}
        </div>
      )
    },
    {
      header: "SENT",
      cell: (item) => (
        <div className="text-muted-foreground font-mono text-[11px]">
          {format(new Date(item.createdAt), "d MMM, h:mm a")}
        </div>
      )
    },
    {
      header: "STATUS",
      cell: (item) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={item.status} />
          {item.overdue && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
              Departed
            </Badge>
          )}
        </div>
      )
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (item) =>
        item.status === "PENDING" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setResolving(item)}
            className="h-7 gap-1 px-2.5 text-xs font-semibold"
          >
            <Gavel className="h-3.5 w-3.5" aria-hidden />
            Resolve
          </Button>
        ) : item.staffNote ? (
          <span
            title={item.staffNote}
            className="text-muted-foreground inline-flex max-w-[160px] items-center gap-1 truncate text-[11px]"
          >
            <MessageSquareText className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{item.staffNote}</span>
          </span>
        ) : (
          <span className="text-muted-foreground text-[11px]">—</span>
        )
    }
  ];

  if (isError) {
    return (
      <div className="border-destructive/20 bg-destructive/10 space-y-4 rounded-2xl border p-8 text-center">
        <AlertCircle className="text-destructive mx-auto h-10 w-10" aria-hidden />
        <h2 className="text-foreground text-lg font-bold">Failed to Load Requests</h2>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          {error?.message || "Could not retrieve change requests. Please verify your connection."}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-[#F0F7FF] p-4 text-xs text-[#003B95] sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
        <div className="flex items-start gap-2.5">
          <Inbox className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Customers inside 24 hours of departure cannot cancel on their own, so they ask here.
            Moving keeps the price and tickets; cancelling refunds the full amount to their card; a
            rejection needs a note they will read.
          </span>
        </div>
      </div>

      <DashboardTableCard
        itemName="requests"
        toolbar={
          <Tabs
            value={filter}
            onValueChange={(value) => {
              setFilter(value as StatusFilter);
              setPage(1);
            }}
          >
            <TabsList className="h-auto flex-wrap">
              {FILTER_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                  {tab.label}
                  {tab.value === "PENDING" && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px font-mono text-[10px] font-bold",
                        pendingCount > 0
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
        title="Change Requests"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isFetching={isFetching}
        keyExtractor={(item) => item.id}
        rowClassName={(item) => (item.overdue ? "bg-amber-500/5" : undefined)}
        pagination={
          meta
            ? {
                page,
                pageSize: PAGE_SIZE,
                totalCount: meta.total,
                totalPages: Math.max(1, meta.totalPages),
                onPageChange: setPage
              }
            : undefined
        }
        emptyMessage={
          filter === "PENDING"
            ? "No requests waiting. Customers who need a change inside 24 hours will show up here."
            : "No change requests yet."
        }
      />

      {resolving && (
        <ResolveRequestDialog
          key={resolving.id}
          request={resolving}
          accent={accent}
          onOpenChange={(open) => {
            if (!open) setResolving(null);
          }}
        />
      )}
    </div>
  );
}

type ResolveAction = "CANCEL" | "RESCHEDULE" | "REJECT";

interface ResolveRequestDialogProps {
  request: IBookingRequestListItem;
  accent: "emerald" | "blue";
  onOpenChange: (open: boolean) => void;
}

function ResolveRequestDialog({ request, accent, onOpenChange }: ResolveRequestDialogProps) {
  const resolveMutation = useResolveBookingRequestMutation();
  const booking = request.booking;
  const isBoarded = booking.status === "CHECKED_IN";
  // Preselect what the customer asked for; staff may still pick any action (AC-9).
  const [action, setAction] = React.useState<ResolveAction>(
    request.type === "RESCHEDULE" ? "RESCHEDULE" : isBoarded ? "REJECT" : "CANCEL"
  );
  // Start from the customer's preferred trips; the picker drops one that is no longer allowed.
  const [outboundId, setOutboundId] = React.useState<string | null>(
    isBoarded ? null : (request.preferredSchedule?.scheduleId ?? null)
  );
  const [returnId, setReturnId] = React.useState<string | null>(
    request.preferredReturnSchedule?.scheduleId ?? null
  );
  const [note, setNote] = React.useState("");
  const noteId = React.useId();
  const noteHintId = React.useId();

  const refundLabel = formatCents(booking.refundCents, booking.currency ?? undefined);
  const noteRequired = action === "REJECT";
  const hasNewTrip = !!outboundId || !!returnId;
  const canSubmit =
    !resolveMutation.isPending &&
    (!noteRequired || note.trim().length > 0) &&
    (action !== "RESCHEDULE" || hasNewTrip);
  const outbound = legLine(booking.outbound);
  const returnLeg = booking.return ? legLine(booking.return) : null;

  const options = [
    {
      value: "RESCHEDULE" as const,
      title: "Move to another trip",
      text: "Pick the new trip below. The price and ticket numbers stay the same, no money moves.",
      icon: CalendarClock,
      disabled: false
    },
    {
      value: "CANCEL" as const,
      title: booking.refundCents > 0 ? `Cancel & refund ${refundLabel}` : "Cancel booking",
      text:
        booking.refundCents > 0
          ? "Seats go back on sale and the full amount is refunded to the card."
          : "Seats go back on sale. This payment was not taken by card, so refund it by hand.",
      icon: XCircle,
      disabled: isBoarded
    },
    {
      value: "REJECT" as const,
      title: "Reject the request",
      text: "The booking stays as it is. The customer sees your note.",
      icon: Ship,
      disabled: false
    }
  ];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve {requestTitle(request).toLowerCase()} request</DialogTitle>
          <DialogDescription>
            Booking <span className="text-foreground font-mono font-bold">{booking.reference}</span>{" "}
            · {booking.leadPassengerName} · {booking.passengers} pax
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 space-y-2 rounded-2xl p-3.5 text-xs">
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Outbound</span>
            <span className="text-foreground text-right font-semibold">
              {outbound.route}
              <span className="text-muted-foreground block font-mono text-[11px] font-normal">
                {outbound.when}
              </span>
            </span>
          </div>
          {returnLeg && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Return</span>
              <span className="text-foreground text-right font-semibold">
                {returnLeg.route}
                <span className="text-muted-foreground block font-mono text-[11px] font-normal">
                  {returnLeg.when}
                </span>
              </span>
            </div>
          )}
          {request.reason && (
            <p className="text-muted-foreground border-border border-t pt-2 italic">
              &ldquo;{request.reason}&rdquo;
            </p>
          )}
          {request.overdue && (
            <p className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> This trip has already departed.
            </p>
          )}
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            resolveMutation.mutate(
              {
                id: request.id,
                action,
                note: note.trim() || undefined,
                ...(action === "RESCHEDULE"
                  ? {
                      outboundScheduleId: outboundId ?? undefined,
                      returnScheduleId: returnId ?? undefined
                    }
                  : {})
              },
              { onSuccess: () => onOpenChange(false) }
            );
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-foreground mb-2 text-xs font-bold">Decision</legend>
            {options.map((option) => {
              const Icon = option.icon;
              const selected = action === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3.5 text-xs transition-colors",
                    "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
                    option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    selected
                      ? accent === "emerald"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[#003B95] bg-[#F0F7FF] dark:border-blue-400 dark:bg-blue-950/30"
                      : "border-border/80 hover:bg-muted/40"
                  )}
                >
                  <input
                    type="radio"
                    name="resolve-action"
                    value={option.value}
                    checked={selected}
                    disabled={option.disabled}
                    onChange={() => setAction(option.value)}
                    className="sr-only"
                  />
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      option.value === "CANCEL"
                        ? "text-destructive"
                        : option.value === "RESCHEDULE"
                          ? "text-[#003B95] dark:text-blue-400"
                          : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="space-y-0.5">
                    <span className="text-foreground block font-bold">{option.title}</span>
                    <span className="text-muted-foreground block text-[11px]">
                      {option.disabled
                        ? "The passenger already boarded, so this booking cannot be cancelled."
                        : option.text}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {action === "RESCHEDULE" && (
            <div className="border-border/80 space-y-4 rounded-2xl border p-3.5">
              {isBoarded ? (
                <p className="text-muted-foreground text-xs">
                  The passenger already boarded the outbound trip, so only the return trip can move.
                </p>
              ) : (
                <TripPicker
                  reference={booking.reference}
                  leg="OUTBOUND"
                  legend="New outbound trip"
                  value={outboundId}
                  onChange={setOutboundId}
                  preferredScheduleId={request.preferredSchedule?.scheduleId}
                  allowKeep={!!booking.return}
                  accent={accent}
                  disabled={resolveMutation.isPending}
                />
              )}
              {booking.return && (
                <TripPicker
                  reference={booking.reference}
                  leg="RETURN"
                  legend="New return trip"
                  value={returnId}
                  onChange={setReturnId}
                  preferredScheduleId={request.preferredReturnSchedule?.scheduleId}
                  allowKeep={!isBoarded}
                  accent={accent}
                  disabled={resolveMutation.isPending}
                />
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={noteId} className="text-xs font-bold">
              Note to the customer{" "}
              <span className="text-muted-foreground font-normal">
                {noteRequired ? "(required)" : "(optional)"}
              </span>
            </Label>
            <textarea
              id={noteId}
              aria-describedby={noteHintId}
              aria-required={noteRequired}
              value={note}
              maxLength={NOTE_MAX}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                noteRequired
                  ? "For example: The later sailings are full today, please keep your booking."
                  : "For example: Approved, sorry you cannot travel."
              }
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-xl border px-3 py-2 text-xs focus-visible:ring-2 focus-visible:outline-none"
            />
            <div id={noteHintId} className="text-muted-foreground text-right text-[10px]">
              {note.length}/{NOTE_MAX}
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
                Back
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              variant={action === "CANCEL" ? "destructive" : "default"}
              disabled={!canSubmit}
              className="rounded-xl text-xs font-bold"
            >
              {resolveMutation.isPending
                ? "Saving..."
                : action === "CANCEL"
                  ? "Cancel booking"
                  : action === "RESCHEDULE"
                    ? "Move booking"
                    : "Reject request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
