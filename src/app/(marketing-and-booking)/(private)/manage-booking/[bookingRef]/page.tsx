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
  Shield,
  Ship,
  Ticket,
  User,
  XCircle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { useBookingLookupQuery, useCancelBookingMutation } from "@/hooks/use-bookings";
import { formatCents, paymentStatusLabel } from "@/lib/payment";
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

interface BookingDetailsPageProps {
  params: Promise<{ bookingRef: string }>;
}

export default function BookingDetailsPage({ params }: BookingDetailsPageProps) {
  const { bookingRef } = use(params);

  // Spec 0001: a guest proves access with the lead passenger email; the signed in owner does not need it.
  const [emailInput, setEmailInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | undefined>(undefined);
  const { data: booking, isLoading, isError, refetch } = useBookingLookupQuery(
    bookingRef,
    submittedEmail
  );
  const cancelBookingMutation = useCancelBookingMutation();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const handleConfirmCancel = async () => {
    if (!booking) return;
    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: booking.id,
        reason: "Customer cancellation from self-service portal",
        email: booking.leadPassengerEmail
      });
      toast.success("Booking cancelled successfully", {
        description: "Your reservation has been released."
      });
      setIsCancelDialogOpen(false);
      void refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not cancel booking at this time.";
      toast.error("Cancellation failed", {
        description: message
      });
    }

  };

  if (isLoading) {
    return (
      <div className="dark:bg-background min-h-screen bg-[#F8FAFC] pb-24 pt-8">
        <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="h-6 w-36 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <Card className="h-64 rounded-3xl bg-card border border-border animate-pulse" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Card className="h-64 rounded-3xl bg-card border border-border animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="dark:bg-background min-h-screen bg-[#F8FAFC] pb-24 pt-16">
        <main className="container mx-auto max-w-xl px-4 text-center">
          <Card className="p-8 rounded-3xl border border-destructive/20 bg-destructive/5 space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-bold text-foreground">Booking Not Found</h2>
            <p className="text-xs text-muted-foreground">
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
                className="rounded-xl bg-white dark:bg-card"
              />
              <Button type="submit" className="rounded-xl">
                Find booking
              </Button>
            </form>
            <div className="pt-2 flex justify-center gap-3">
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

  const depPort = booking.schedule?.route?.departurePort?.name || "Malé Ferry Terminal";
  const arrPort = booking.schedule?.route?.destinationPort?.name || "Maafushi Jetty";
  const operatorName = booking.schedule?.route?.operator?.companyName || "Atoll Ferries";
  const vesselName = booking.schedule?.ferry?.name || "Ocean Express";
  const vesselType = booking.schedule?.ferry?.type || "Highspeed Speedboat";
  const tickets = booking.tickets || [];
  const payment = booking.payment;
  const totalLabel = formatCents(
    payment?.amountCents ?? Math.round((booking.totalAmount ?? 0) * 100),
    payment?.currency
  );
  const isPaid = payment?.status === "COMPLETED" || payment?.provider === "LEGACY_SEED";
  const isCancelled = booking.status === "CANCELLED";
  // Only PENDING and CONFIRMED bookings can be cancelled (spec 0001, AC-5).
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";

  const departureDateDisplay = booking.schedule?.departureTime
    ? new Date(booking.schedule.departureTime).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "Scheduled";

  const departureTimeDisplay = booking.schedule?.departureTime
    ? new Date(booking.schedule.departureTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : "TBD";

  const arrivalTimeDisplay = booking.schedule?.arrivalTime
    ? new Date(booking.schedule.arrivalTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
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
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 text-[10px] font-bold"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold"
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
                    <p className="text-muted-foreground text-xs">{vesselName} &bull; {vesselType}</p>
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
                  <span className="text-xs text-muted-foreground font-normal">
                    Gate: {booking.schedule?.gate || "Pier 1"}
                  </span>
                </div>

                <div className="space-y-3">
                  {tickets.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl border border-border/70 bg-card"
                    >
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-extrabold uppercase text-muted-foreground">
                          PASSENGER {idx + 1}
                        </div>
                        <div className="text-sm font-bold text-foreground">{t.passengerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.nationality} &bull; ID: {t.passportOrId} &bull; {t.cabinClass}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] font-extrabold uppercase text-muted-foreground">TICKET #</div>
                          <div className="font-mono text-xs font-bold text-[#003B95] dark:text-blue-400">
                            {t.ticketNumber}
                          </div>
                        </div>

                        <Button size="sm" variant="outline" asChild className="rounded-xl text-xs gap-1.5">
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
                  {/* QR Box */}
                  <div className="border-border/80 flex w-fit items-center justify-center rounded-2xl border bg-white p-3 shadow-inner">
                    <QRCodeSVG
                      value={`https://islandhop.com/tickets/${booking.reference}`}
                      size={140}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

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
                      <span>Carry digital or printed QR pass along with official photo ID.</span>
                    </div>

                    <Button
                      variant="outline"
                      asChild
                      className="dark:hover:bg-card h-10 rounded-xl border-[#003B95]/40 text-xs font-bold text-[#003B95] hover:bg-blue-50 dark:text-blue-300"
                    >
                      <Link href={`/tickets/${booking.reference}`}>
                        <Download className="mr-2 h-4 w-4" /> Download All E-Tickets
                      </Link>
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
                    <span className="text-foreground font-semibold">
                      {totalLabel}
                    </span>
                  </div>

                  <div className="border-border/60 flex items-baseline justify-between border-t pt-3">
                    <span className="text-foreground text-sm font-bold">
                      {isPaid ? "Total Paid" : "Total Due"}
                    </span>
                    <span className="text-2xl font-black text-[#003B95] dark:text-blue-400">
                      {totalLabel}
                    </span>
                  </div>
                </div>

                {/* Payment status: only a collected payment shows as paid (spec 0001) */}
                <div
                  className={
                    isPaid
                      ? "flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400"
                      : "flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"
                  }
                >
                  {isPaid ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-extrabold tracking-wide uppercase">
                      {paymentStatusLabel(payment)}
                    </div>
                    <div className="text-muted-foreground text-[11px]">Ref: {booking.reference}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Actions (Change / Cancel Booking) */}
            <Card className="border-border/80 dark:bg-card rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
              <CardContent className="space-y-3 p-0">
                <h4 className="text-foreground text-sm font-bold">Booking Actions</h4>

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

                  <button
                    type="button"
                    disabled={!canCancel || cancelBookingMutation.isPending}
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="border-border/80 text-destructive hover:bg-destructive/5 flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>
                          {isCancelled
                            ? "Booking Cancelled"
                            : canCancel
                              ? "Cancel Booking"
                              : "Cannot Be Cancelled"}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[10px] font-normal">
                        Release seats and cancel itinerary.
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel booking{" "}
              <span className="text-foreground font-mono font-bold">{booking.reference}</span>? Your
              seat reservation will be released back to the ferry schedule.
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
