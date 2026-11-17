"use client";

import { use, useState } from "react";
import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Edit,
  HelpCircle,
  Info,
  LifeBuoy,
  Phone,
  QrCode,
  Send,
  Shield,
  Ship,
  Ticket,
  User,
  XCircle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { get } from "@/lib/api";
import { bookingQrPayload, downloadBoardingPasses } from "@/lib/boarding-pass";
import { formatCents, paymentStatusLabel } from "@/lib/payment";
import type { ApiResponse, IDigitalPassResponse } from "@/types";
import { CANCELLATION_POLICY_TEXT } from "@/lib/cancellation-policy";
import { format } from "date-fns";

import {
  useBookingLookupQuery,
  useCancelBookingMutation,
  useCreateBookingRequestMutation,
  useWithdrawBookingRequestMutation
} from "@/hooks/use-bookings";

import { ReturnLegCard } from "@/widgets";
import {
  AnimatedSection,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input
} from "@/ui";

import {
  ChangeRequestDialog,
  type IChangeRequestInput,
  RequestStatusBlock
} from "./_components/ChangeRequest";

interface BookingDetailsPageProps {
  params: Promise<{ bookingRef: string }>;
}

export default function BookingDetailsPage({ params }: BookingDetailsPageProps) {
  const { bookingRef } = use(params);

  // Spec 0001: a guest proves access with the lead passenger email; the signed in owner does not need it.
  const [emailInput, setEmailInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | undefined>(undefined);
  const {
    data: booking,
    isLoading,
    isError,
    refetch
  } = useBookingLookupQuery(bookingRef, submittedEmail);
  const cancelBookingMutation = useCancelBookingMutation();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // The hook shows the success or error toast (with the refund amount when one started).
  const createRequestMutation = useCreateBookingRequestMutation();
  const withdrawRequestMutation = useWithdrawBookingRequestMutation();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // One PNG per passenger, each with that ticket's own scannable QR from the backend.
  const handleDownloadAll = async () => {
    if (!booking?.tickets?.length) return;
    setIsDownloading(true);
    try {
      const passes = await Promise.all(
        booking.tickets.map(async (t) => {
          const res = await get<ApiResponse<IDigitalPassResponse>>(
            `/tickets/pass/${encodeURIComponent(t.ticketNumber)}`
          );
          if (!res.data) throw new Error("Missing pass");
          return res.data;
        })
      );
      await downloadBoardingPasses(passes);
    } catch {
      toast.error("Could not download the e-tickets. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendRequest = async (input: IChangeRequestInput) => {
    if (!booking) return;
    try {
      await createRequestMutation.mutateAsync({
        reference: booking.reference,
        email: booking.leadPassengerEmail,
        ...input
      });
      setIsRequestDialogOpen(false);
    } catch {
      // The toast explains a 409 (for example a request already waiting); the refetch shows why.
      setIsRequestDialogOpen(false);
    } finally {
      void refetch();
    }
  };

  const handleWithdrawRequest = (requestId: string) => {
    if (!booking) return;
    withdrawRequestMutation.mutate(
      { reference: booking.reference, requestId, email: booking.leadPassengerEmail },
      { onSettled: () => void refetch() }
    );
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;
    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: booking.id,
        reason: "Customer cancellation from self-service portal",
        email: booking.leadPassengerEmail
      });
    } catch {
      // A 409 (for example the 24h window just passed) is explained by the toast; the
      // refetch below shows the new state.
    } finally {
      setIsCancelDialogOpen(false);
      void refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="dark:bg-background min-h-screen bg-[#F8FAFC] pt-8 pb-24">
        <main className="container mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-muted h-6 w-36 animate-pulse rounded" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <Card className="bg-card border-border h-64 animate-pulse rounded-3xl border" />
            </div>
            <div className="space-y-6 lg:col-span-4">
              <Card className="bg-card border-border h-64 animate-pulse rounded-3xl border" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="dark:bg-background min-h-screen bg-[#F8FAFC] pt-16 pb-24">
        <main className="container mx-auto max-w-xl px-4 text-center">
          <Card className="border-destructive/20 bg-destructive/5 space-y-4 rounded-3xl border p-8">
            <AlertCircle className="text-destructive mx-auto h-12 w-12" />
            <h2 className="text-foreground text-xl font-bold">Booking Not Found</h2>
            <p className="text-muted-foreground text-xs">
              {submittedEmail
                ? `No booking matching reference "${bookingRef}" and that email was found.`
                : "Enter the email address used for this booking to view it."}
            </p>
            <form
              className="mx-auto flex max-w-sm flex-col gap-2 text-left sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (emailInput.trim()) setSubmittedEmail(emailInput.trim());
              }}
            >
              <label htmlFor="booking-email" className="sr-only">
                Booking email address
              </label>
              <Input
                id="booking-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                className="dark:bg-card rounded-xl bg-white"
              />
              <Button type="submit" className="rounded-xl">
                Find booking
              </Button>
            </form>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild className="rounded-xl">
                <Link href="/manage-booking">Search My Bookings</Link>
              </Button>
              <Button variant="outline" asChild className="rounded-xl">
                <Link href="/ferries">Book a Ferry</Link>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const depPort = booking.schedule?.route?.departurePort?.name || "Blowing Point, Anguilla";
  const arrPort = booking.schedule?.route?.destinationPort?.name || "Marigot, Saint Martin";
  const operatorName = booking.schedule?.route?.operator?.companyName || "Makana Ferry Service";
  const vesselName = booking.schedule?.ferry?.name || "Ocean Express";
  const vesselType = booking.schedule?.ferry?.type || "Highspeed Speedboat";
  const tickets = booking.tickets || [];
  const payment = booking.payment;
  const totalLabel = formatCents(
    payment?.amountCents ?? Math.round((booking.totalAmount ?? 0) * 100),
    payment?.currency
  );
  const isPaid = payment?.status === "COMPLETED" || payment?.provider === "LEGACY_SEED";
  // Spec 0004: a refunded booking owes nothing, so it must not read "Total Due".
  const isRefunded = payment?.status === "REFUNDED" || payment?.status === "PARTIALLY_REFUNDED";
  const isCancelled = booking.status === "CANCELLED";
  // Only a sold booking has valid boarding passes (backend getDigitalPass, spec 0001 AC-6).
  const hasValidPasses =
    (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && tickets.length > 0;

  // Spec 0004: the backend's truth table decides what the customer may do; the page only renders it.
  const cancellation = booking.cancellation;
  const canSelfCancel = cancellation?.mode === "SELF_CANCEL";
  const canRequest = cancellation?.mode === "REQUEST";
  const requestScope = cancellation?.requestScope ?? "BOOKING";
  const hasPendingRequest = !!cancellation?.pendingRequest;
  const refundLabel = formatCents(cancellation?.refundCents ?? 0, payment?.currency);
  const cutoffDisplay =
    cancellation?.cutoffAt
      ? `${format(new Date(cancellation.cutoffAt), "EEE, d MMM")} at ${format(new Date(cancellation.cutoffAt), "h:mm a")}`
      : null;
  // Button title and hint per the spec 0004 truth table rows.
  const cancelTitle = isCancelled
    ? "Booking Cancelled"
    : canRequest
      ? requestScope === "RETURN"
        ? "Request a different return trip"
        : "Request cancellation / reschedule"
      : !canSelfCancel
        ? booking.status === "CONFIRMED"
          ? "Contact the operator"
          : "Cannot Be Cancelled Online"
        : (cancellation?.refundCents ?? 0) > 0
          ? `Cancel & get ${refundLabel} refund`
          : booking.status === "CONFIRMED" && cancellation && !cancellation.automaticRefund
            ? "Cancel booking (refund handled by operator)"
            : "Cancel Booking";
  const cancelHint = isCancelled
    ? "This reservation has been released."
    : canSelfCancel
      ? booking.status === "PENDING"
        ? "Release the held seats. Nothing has been charged."
        : cutoffDisplay
          ? `Free cancellation until ${cutoffDisplay}.`
          : "Release seats and cancel itinerary."
      : canRequest
        ? requestScope === "RETURN"
          ? "Ask the operator to move your return sailing."
          : "Less than 24 hours to go. Send a request and the ferry operator decides."
        : "Please contact the operator for help with this booking.";
  const refundStateNotice: Record<string, { text: string; tone: string } | undefined> = {
    PROCESSING: {
      text: "Refund processing. It usually reaches your card in 5 to 10 business days.",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    },
    REFUNDED: {
      text: "Refunded to your card.",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    },
    FAILED: {
      text: "Refund failed, our team has been notified and will retry it.",
      tone: "border-destructive/20 bg-destructive/10 text-destructive"
    }
  };
  const refundNotice = refundStateNotice[cancellation?.refundState ?? "NONE"];
  const departureDateDisplay =
    booking.schedule?.departureTime
      ? format(new Date(booking.schedule.departureTime), "EEE, d MMM yyyy")
      : "Scheduled";
  const departureTimeDisplay =
    booking.schedule?.departureTime
      ? format(new Date(booking.schedule.departureTime), "h:mm a")
      : "TBD";
  const arrivalTimeDisplay =
    booking.schedule?.arrivalTime
      ? format(new Date(booking.schedule.arrivalTime), "h:mm a")
      : "TBD";

  return (
    <div className="dark:bg-background min-h-screen bg-[#F8FAFC] pb-24">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="text-xs font-semibold">
            <Link href="/manage-booking">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to My Bookings
            </Link>
          </Button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Main Column (8 cols) */}
          <AnimatedSection
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="space-y-6 lg:col-span-8"
          >
            {/* 1. Trip Information Card */}
            <Card className="border-border/80 dark:bg-card rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
              <CardContent className="space-y-6 p-0">
                {/* Header */}
                <div className="border-border/60 flex items-center justify-between border-b pb-4">
                  <div className="text-foreground flex items-center gap-2 text-sm font-bold">
                    <Ship className="h-4 w-4 text-[#003B95] dark:text-blue-400" />
                    <span>Trip Information</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isCancelled || booking.status === "EXPIRED"
                        ? "border-destructive/30 bg-destructive/10 text-destructive text-[10px] font-bold"
                        : booking.status === "PENDING"
                          ? "border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-700"
                          : "border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>

                {/* Operator Logo & Name */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003B95] text-white shadow-sm">
                    <Ship className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-lg font-bold">{operatorName}</h3>
                    <p className="text-muted-foreground text-xs">
                      {vesselName} &bull; {vesselType}
                    </p>
                  </div>
                </div>

                {/* Departure / Arrival Timeline */}
                <div className="bg-muted/30 rounded-2xl p-5">
                  <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-12">
                    {/* Departure */}
                    <div className="sm:col-span-5">
                      <div className="text-muted-foreground text-[10px] font-extrabold tracking-wider uppercase">
                        DEPARTURE
                      </div>
                      <div className="text-muted-foreground text-xs font-semibold">
                        {departureDateDisplay}
                      </div>
                      <div className="mt-1 text-2xl font-black tracking-tight text-[#003B95] dark:text-blue-400">
                        {departureTimeDisplay}
                      </div>
                      <div className="text-foreground text-sm font-bold">{depPort}</div>
                    </div>

                    {/* Duration / Arrow Track */}
                    <div className="flex flex-col items-center justify-center sm:col-span-2">
                      <div className="text-muted-foreground text-[10px] font-bold">
                        {booking.schedule?.route?.durationMinutes || 45}m
                      </div>
                      <div className="relative my-2 flex w-full max-w-[80px] items-center">
                        <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                        <div className="border-border h-[1.5px] flex-1 border-t-2 border-dotted" />
                        <Ship className="text-primary h-3.5 w-3.5" />
                        <div className="border-border h-[1.5px] flex-1 border-t-2 border-dotted" />
                        <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                      </div>
                    </div>

                    {/* Arrival */}
                    <div className="sm:col-span-5 sm:text-right">
                      <div className="text-muted-foreground text-[10px] font-extrabold tracking-wider uppercase">
                        ARRIVAL
                      </div>
                      <div className="text-muted-foreground text-xs font-semibold">
                        {departureDateDisplay}
                      </div>
                      <div className="mt-1 text-2xl font-black tracking-tight text-[#003B95] dark:text-blue-400">
                        {arrivalTimeDisplay}
                      </div>
                      <div className="text-foreground text-sm font-bold">{arrPort}</div>
                    </div>
                  </div>
                </div>

                <ReturnLegCard
                  tripType={booking.tripType}
                  returnSchedule={booking.returnSchedule}
                />
              </CardContent>
            </Card>

            {/* 2. Issued Passenger Tickets */}
            <Card className="border-border/80 dark:bg-card rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
              <CardContent className="space-y-4 p-0">
                <div className="border-border/60 text-foreground flex items-center justify-between border-b pb-3 text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#003B95] dark:text-blue-400" />
                    <span>Passengers &amp; Boarding Passes ({tickets.length || 1})</span>
                  </div>
                  <span className="text-muted-foreground text-xs font-normal">
                    Gate: {booking.schedule?.gate || "Pier 1"}
                  </span>
                </div>

                <div className="space-y-3">
                  {tickets.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3.5"
                    >
                      <div className="space-y-0.5">
                        <div className="text-muted-foreground text-[10px] font-extrabold uppercase">
                          PASSENGER {idx + 1}
                        </div>
                        <div className="text-foreground text-sm font-bold">{t.passengerName}</div>
                        <div className="text-muted-foreground text-xs">
                          {t.nationality} &bull; ID: {t.passportOrId} &bull; {t.cabinClass}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-muted-foreground text-[10px] font-extrabold uppercase">
                            TICKET #
                          </div>
                          <div className="font-mono text-xs font-bold text-[#003B95] dark:text-blue-400">
                            {t.ticketNumber}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="gap-1.5 rounded-xl text-xs"
                        >
                          <Link href={`/tickets/${t.ticketNumber}`}>
                            <Ticket className="h-3.5 w-3.5" />
                            <span>Digital Pass</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 3. Master E-Ticket QR */}
            <Card className="border-border/80 dark:bg-card rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
              <CardContent className="space-y-5 p-0">
                <div className="space-y-1">
                  <div className="text-foreground flex items-center gap-2 text-sm font-bold">
                    <QrCode className="h-4 w-4 text-[#003B95] dark:text-blue-400" />
                    <span>Master Boarding Pass QR</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Scan at the terminal gate for immediate party check-in.
                  </p>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  {/* QR Box: the gate scanner boards every passenger on this booking */}
                  {hasValidPasses ? (
                    <div className="border-border/80 flex w-fit items-center justify-center rounded-2xl border bg-white p-3 shadow-inner">
                      <QRCodeSVG
                        value={bookingQrPayload(booking.reference)}
                        size={140}
                        level="H"
                        marginSize={0}
                        aria-label={`Boarding QR for booking ${booking.reference}`}
                      />
                    </div>
                  ) : (
                    <div className="border-border/80 text-muted-foreground flex h-[166px] w-[166px] items-center justify-center rounded-2xl border border-dashed p-4 text-center text-[11px]">
                      {isCancelled || booking.status === "EXPIRED"
                        ? "No boarding pass for this booking."
                        : "Your boarding QR appears once payment is confirmed."}
                    </div>
                  )}

                  {/* Reference & Info Box */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-[10px] font-extrabold tracking-wider uppercase">
                        BOOKING REFERENCE
                      </div>
                      <div className="text-foreground font-mono text-2xl font-black tracking-tight">
                        {booking.reference}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-[#F0F7FF] p-3 text-xs text-[#003B95] dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Show this QR (or the downloaded e-tickets) with official photo ID at boarding.</span>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleDownloadAll}
                      disabled={!hasValidPasses || isDownloading}
                      className="dark:hover:bg-card h-10 rounded-xl border-[#003B95]/40 text-xs font-bold text-[#003B95] hover:bg-blue-50 dark:text-blue-300"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {isDownloading
                        ? "Preparing e-tickets..."
                        : tickets.length > 1
                          ? `Download All E-Tickets (${tickets.length})`
                          : "Download E-Ticket"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Right Sidebar Column (4 cols) */}
          <AnimatedSection delay={0.08} className="space-y-6 lg:col-span-4">
            {/* 1. Payment Summary Card */}
            <Card className="border-border/80 dark:bg-card rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
              <CardContent className="space-y-4 p-0">
                <div className="border-border/60 text-foreground flex items-center gap-2 border-b pb-3 text-sm font-bold">
                  <CreditCard className="h-4 w-4 text-[#003B95] dark:text-blue-400" />
                  <span>Payment Summary</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>Fare ({tickets.length || 1} Passengers)</span>
                    <span className="text-foreground font-semibold">{totalLabel}</span>
                  </div>

                  <div className="border-border/60 flex items-baseline justify-between border-t pt-3">
                    <span className="text-foreground text-sm font-bold">
                      {isRefunded ? "Total Refunded" : isPaid ? "Total Paid" : "Total Due"}
                    </span>
                    <span className="text-2xl font-black text-[#003B95] dark:text-blue-400">
                      {totalLabel}
                    </span>
                  </div>
                </div>

                {/* Payment status: only a collected payment shows as paid (spec 0001) */}
                <div
                  className={
                    isPaid || isRefunded
                      ? "flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400"
                      : "flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"
                  }
                >
                  {isPaid || isRefunded ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-extrabold tracking-wide uppercase">
                      {paymentStatusLabel(payment)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      Ref: {booking.reference}
                    </div>
                  </div>
                </div>

                {refundNotice && (
                  <div
                    role="status"
                    className={`flex items-start gap-2.5 rounded-2xl border p-3 text-xs ${refundNotice.tone}`}
                  >
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{refundNotice.text}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Actions (Change / Cancel Booking) */}
            <Card className="border-border/80 dark:bg-card rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
              <CardContent className="space-y-3 p-0">
                <h4 className="text-foreground text-sm font-bold">Booking Actions</h4>

                {/* Spec 0004: the waiting request, or the operator's last answer (AC-18) */}
                <RequestStatusBlock
                  pendingRequest={cancellation?.pendingRequest ?? null}
                  lastResolvedRequest={cancellation?.lastResolvedRequest ?? null}
                  onWithdraw={handleWithdrawRequest}
                  isWithdrawing={withdrawRequestMutation.isPending}
                />

                <div className="space-y-2">
                  <Link
                    href="/ferries"
                    className="border-border/80 text-foreground hover:bg-muted/40 flex items-center justify-between rounded-2xl border p-3.5 text-xs font-bold transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Edit className="text-muted-foreground h-3.5 w-3.5" />
                        <span>Book Additional Transfers</span>
                      </div>
                      <div className="text-muted-foreground text-[10px] font-normal">
                        Browse all scheduled inter-atoll sailings.
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </Link>

                  {/* While a request waits, the status block above is the action (Withdraw). */}
                  {!hasPendingRequest && (
                    <button
                      type="button"
                      disabled={
                        !(canSelfCancel || canRequest) ||
                        cancelBookingMutation.isPending ||
                        createRequestMutation.isPending
                      }
                      onClick={() =>
                        canRequest ? setIsRequestDialogOpen(true) : setIsCancelDialogOpen(true)
                      }
                      className={`border-border/80 flex w-full cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        canRequest
                          ? "text-[#003B95] hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                          : "text-destructive hover:bg-destructive/5"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {canRequest ? (
                            <Send className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" aria-hidden />
                          )}
                          <span>{cancelTitle}</span>
                        </div>
                        <div className="text-muted-foreground text-[10px] font-normal">
                          {cancelHint}
                        </div>
                      </div>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Spec 0004 policy line (AC-18) */}
                <p className="text-muted-foreground flex items-start gap-1.5 pt-1 text-[10px] leading-relaxed">
                  <Shield className="mt-px h-3 w-3 shrink-0" />
                  <span>{CANCELLATION_POLICY_TEXT}</span>
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>

      {/* Change request inside 24h (spec 0004, AC-5) */}
      <ChangeRequestDialog
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        reference={booking.reference}
        scope={requestScope === "RETURN" ? "RETURN" : "BOOKING"}
        hasReturn={!!booking.returnSchedule}
        email={booking.leadPassengerEmail}
        isSubmitting={createRequestMutation.isPending}
        onSubmit={handleSendRequest}
      />

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel booking{" "}
              <span className="text-foreground font-mono font-bold">{booking.reference}</span>? Your
              seat reservation will be released back to the ferry schedule.
              {(cancellation?.refundCents ?? 0) > 0 && (
                <>
                  {" "}
                  <span className="text-foreground font-semibold">{refundLabel}</span> will be
                  refunded to your card.
                </>
              )}
              {booking.status === "CONFIRMED" && cancellation && !cancellation.automaticRefund && (
                <> The operator will arrange your refund.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                Keep Booking
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelBookingMutation.isPending}
              onClick={handleConfirmCancel}
              className="rounded-xl text-xs font-bold"
            >
              {cancelBookingMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
