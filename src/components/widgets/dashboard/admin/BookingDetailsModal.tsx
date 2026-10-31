"use client";

import * as React from "react";
import {
  Anchor,
  ArrowRight,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Landmark,
  Loader2,
  Luggage,
  Mail,
  MapPin,
  Phone,
  Ship,
  Ticket,
  User,
  Users,
  X
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import type { IAdminBookingItem } from "@/types";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator
} from "@/ui";
import { StatusBadge } from "../index";
import { useCancelBookingMutation } from "@/hooks/use-bookings";
import { formatCents, paymentProviderLabel, paymentStatusLabel } from "@/lib/payment";

export interface BookingDetailsModalProps {
  booking: IAdminBookingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCancelled?: () => void;
  onCheckIn?: (booking: IAdminBookingItem) => void;
  isCheckingIn?: boolean;
}

export function BookingDetailsModal({
  booking,
  open,
  onOpenChange,
  onBookingCancelled,
  onCheckIn,
  isCheckingIn
}: BookingDetailsModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const cancelMutation = useCancelBookingMutation();

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === text ? null : prev));
    }, 2000);
  };

  if (!booking) {
    if (!open) return null;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-8 rounded-2xl flex flex-col items-center justify-center space-y-3">
          <DialogTitle className="sr-only">Loading reservation</DialogTitle>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading booking reservation...</p>
        </DialogContent>
      </Dialog>
    );
  }

  const schedule = booking.schedule;
  const route = schedule?.route;
  const departurePort = route?.departurePort?.name || "Departure Hub";
  const destinationPort = route?.destinationPort?.name || "Arrival Hub";
  const operatorName = route?.operator?.companyName || "Commercial Carrier";
  const ferryName = schedule?.ferry?.name || "Express Ferry";
  const ferryReg = schedule?.ferry?.registration;

  const departureDate = schedule?.departureTime
    ? new Date(schedule.departureTime)
    : null;
  const arrivalDate = schedule?.arrivalTime ? new Date(schedule.arrivalTime) : null;
  const totalPax = (booking.adultsCount || 0) + (booking.childrenCount || 0);
  const isGroupBooking = totalPax > 1;

  // Spec 0001: every figure comes from the stored payment cents; no hard coded commission fallback.
  const payment = booking.payment;
  const paymentCurrency = payment?.currency || "usd";
  const totalCents = payment?.amountCents ?? Math.round(Number(booking.totalAmount || 0) * 100);
  const platformCommissionCents = payment?.platformCommissionCents ?? 0;
  const operatorPayoutCents = payment?.operatorPayoutCents ?? 0;
  const commissionRateLabel =
    payment?.commissionRate !== undefined ? `${payment.commissionRate}%` : "n/a";
  const isPaid = payment?.status === "COMPLETED" || payment?.provider === "LEGACY_SEED";

  const transactionId = payment?.stripePaymentIntentId ?? null;
  const paymentGateway = {
    label: paymentProviderLabel(payment?.provider),
    isLocal: false,
    isStripe: payment?.provider === "STRIPE",
  };

  const handleConfirmCancel = () => {
    cancelMutation.mutate(
      {
        bookingId: booking.id,
        reason: "Administrative cancellation by Platform Administrator"
      },
      {
        onSuccess: () => {
          setShowCancelConfirm(false);
          onOpenChange(false);
          if (onBookingCancelled) onBookingCancelled();
        }
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden"
          closeButtonClassName="text-white/80 hover:text-white hover:bg-white/20 rounded-full"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white relative shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md text-white shadow-xs">
                  <Ticket className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle asChild>
                    <span className="font-mono text-base font-bold tracking-tight text-white">
                      {booking.reference}
                    </span>
                  </DialogTitle>
                  <DialogDescription asChild>
                    <p className="text-xs text-white/80">
                      Booked on{" "}
                      {booking.createdAt
                        ? format(new Date(booking.createdAt), "MMM dd, yyyy • hh:mm a")
                        : "—"}
                    </p>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 mr-9 shrink-0">
                <StatusBadge status={booking.status} className="border-white/30 bg-white/20 text-white font-bold" />
              </div>
            </div>
          </div>

          <ScrollArea className="h-[min(70vh,600px)] w-full">
            <div className="p-6 space-y-6">
            {/* Voyage / Sailing Route Card */}
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Ship className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Trip & Ferry Details
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border/70 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-[11px] font-medium text-muted-foreground">Operator:</span>
                  <span className="font-semibold text-foreground truncate max-w-[220px]" title={operatorName}>
                    {operatorName}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-2 border-y border-border/50">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">From</span>
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{departurePort}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {departureDate ? format(departureDate, "hh:mm a") : "—"}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center px-2">
                  <span className="text-[10px] text-muted-foreground font-medium mb-1">
                    {route?.durationMinutes ? `${route.durationMinutes} mins` : "Direct Sailing"}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <div className="h-0.5 w-12 bg-border sm:w-20" />
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">To</span>
                  <div className="font-bold text-sm text-foreground flex items-center justify-end gap-1.5">
                    <span>{destinationPort}</span>
                    <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {arrivalDate ? format(arrivalDate, "hh:mm a") : "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px]">Travel Date</span>
                  <p className="font-semibold text-foreground">
                    {departureDate ? format(departureDate, "MMM dd, yyyy") : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Ferry Info</span>
                  <p className="font-semibold text-foreground">
                    {ferryName} {ferryReg ? `(${ferryReg})` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Gate / Pier</span>
                  <p className="font-semibold text-foreground font-mono">
                    {schedule?.gate || "Pier 1"}
                  </p>
                </div>
              </div>
            </div>

            {/* Passenger & Financials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lead Passenger */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    {isGroupBooking ? "Lead Passenger" : "Passenger Details"}
                  </span>
                  {isGroupBooking && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                      Primary Contact
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-foreground">
                    {booking.leadPassengerName}
                  </p>
                  <a
                    href={`mailto:${booking.leadPassengerEmail}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-mono truncate"
                    title="Send email"
                  >
                    <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{booking.leadPassengerEmail}</span>
                  </a>
                  {booking.leadPassengerPhone ? (
                    <a
                      href={`tel:${booking.leadPassengerPhone}`}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-mono"
                      title="Call passenger"
                    >
                      <Phone className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span>{booking.leadPassengerPhone}</span>
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic flex items-center gap-1.5 font-mono">
                      <Phone className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      <span>No phone provided</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 font-medium text-foreground">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {totalPax} {totalPax === 1 ? "Passenger" : "Passengers"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {booking.adultsCount} {booking.adultsCount === 1 ? "Adult" : "Adults"}
                    {booking.childrenCount > 0 &&
                      `, ${booking.childrenCount} ${
                        booking.childrenCount === 1 ? "Child" : "Children"
                      }`}
                  </span>
                </div>
              </div>

              {/* Financials Breakdown */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Payment Details
                    </span>
                    <StatusBadge status={paymentStatusLabel(payment)} />
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {isPaid ? "Total Paid:" : "Total Price:"}
                    </span>
                    <span className="text-2xl font-black text-foreground">
                      {formatCents(totalCents, paymentCurrency)}
                      <span className="text-xs font-bold text-muted-foreground ml-1">
                        {paymentCurrency.toUpperCase()}
                      </span>
                    </span>
                  </div>

                  {payment?.lastFailureMessage && (
                    <div className="flex items-center justify-between text-[11px] pt-1.5">
                      <span className="text-muted-foreground font-medium">Last failure:</span>
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        {payment.lastFailureMessage}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1.5">
                    <span className="text-muted-foreground font-medium">Payment Gateway:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
                        paymentGateway.isLocal
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : paymentGateway.isStripe
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                          : "bg-muted text-foreground border-border"
                      }`}
                    >
                      {paymentGateway.isLocal ? (
                        <Landmark className="h-3 w-3" />
                      ) : (
                        <CreditCard className="h-3 w-3" />
                      )}
                      <span>{paymentGateway.label}</span>
                    </span>
                  </div>

                  {transactionId && (
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-muted-foreground font-medium">Stripe payment:</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(transactionId, "Stripe payment reference")}
                        className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Click to copy Stripe payment reference"
                      >
                        <span>{transactionId}</span>
                        {copiedKey === transactionId ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground/60" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-foreground font-medium truncate">
                      {booking.adultsCount} × Adult{schedule?.adultFare ? ` ($${schedule.adultFare})` : ""}
                      {booking.childrenCount > 0 &&
                        ` + ${booking.childrenCount} × Child${
                          schedule?.childFare ? ` ($${schedule.childFare})` : ""
                        }`}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                      Standard Fare
                    </span>
                  </div>

                  {/* Financial Breakdown: Platform Fee & Net Payout */}
                  <div className="space-y-1.5 text-[11px] bg-muted/40 rounded-lg p-2.5 border border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Platform Fee ({commissionRateLabel}):</span>
                      <span className="font-semibold text-foreground">
                        {formatCents(platformCommissionCents, paymentCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Net Payout (Operator):</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCents(operatorPayoutCents, paymentCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Issued E-Tickets List */}
            {booking.tickets && booking.tickets.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-blue-600" />
                    Issued Passenger Tickets ({booking.tickets.length})
                  </span>
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card overflow-hidden">
                  {booking.tickets.map((t, idx) => (
                    <div
                      key={t.id || t.ticketNumber || idx}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-foreground">{t.passengerName}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCopy(t.ticketNumber, "Ticket number")}
                              className="font-mono font-medium hover:text-foreground inline-flex items-center gap-1 text-muted-foreground transition-colors cursor-pointer"
                              title="Click to copy ticket number"
                            >
                              <span>{t.ticketNumber}</span>
                              {copiedKey === t.ticketNumber ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 text-muted-foreground/60" />
                              )}
                            </button>
                            <span>•</span>
                            <span>{t.cabinClass || "Standard"}</span>
                            {t.luggageCount !== undefined && t.luggageCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Luggage className="h-3 w-3 text-muted-foreground/80" />
                                  <span>
                                    {t.luggageCount} {t.luggageCount === 1 ? "bag" : "bags"}
                                  </span>
                                </span>
                              </>
                            )}
                            {t.passportOrId && (
                              <>
                                <span>•</span>
                                <span className="font-mono">ID: {t.passportOrId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.boardingStatus === "BOARDED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {t.boardingStatus || "CONFIRMED"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </ScrollArea>

          {/* Modal Footer (only when cancelable or checkable-in) */}
          {booking.status !== "CANCELLED" && (
            <div className="border-t border-border/70 bg-muted/20 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
              {onCheckIn && booking.status === "CONFIRMED" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onCheckIn(booking)}
                  disabled={isCheckingIn}
                  className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isCheckingIn ? "Checking In..." : "Check In Passenger"}</span>
                </Button>
              ) : (
                <div />
              )}

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelMutation.isPending}
                className="gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel Reservation</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Cancel Booking {booking.reference}?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this reservation for{" "}
              <strong className="text-foreground">{booking.leadPassengerName}</strong>?
              This will restore booked seats ({booking.adultsCount + booking.childrenCount} passengers)
              back to the sailing inventory and flag issued tickets as CANCELLED.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={cancelMutation.isPending}
              onClick={() => setShowCancelConfirm(false)}
            >
              Keep Active
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="font-semibold"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
