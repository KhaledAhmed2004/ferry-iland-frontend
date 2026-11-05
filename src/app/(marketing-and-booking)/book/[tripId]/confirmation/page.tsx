"use client";

import { formatPortDate, formatPortTime, portZoneLabel } from "@/lib/port-time";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Clock, Loader2, Ship, Ticket, User, XCircle } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { QRCodeSVG } from "qrcode.react";

import { formatCents } from "@/lib/payment";
import { recallBookingEmail, useBookingLookupQuery } from "@/hooks/use-bookings";
import { forgetPendingCheckout, recallPendingCheckout, useSyncPaymentMutation } from "@/hooks/use-payments";
import type { BookingStatus, IBookingDetail } from "@/types";
import { BookingStepperNav, ReturnLegCard } from "@/widgets";
import { AnimatedSection, Button, Card, CardContent } from "@/ui";

interface Step4ConfirmationPageProps {
  params: Promise<{ tripId: string }>;
}

// Spec 0002, AC-6: how the page waits for the server to see the payment.
const POLL_INTERVAL_MS = 2_000;
const SYNC_AFTER_MS = 10_000;
const PENDING_GIVE_UP_MS = 60_000;
const EXPIRED_EXTRA_POLL_MS = 30_000;

const STATUS_BADGE: Record<BookingStatus, string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-600",
  CHECKED_IN: "bg-emerald-500/10 text-emerald-600",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  EXPIRED: "bg-red-500/10 text-red-600",
  CANCELLED: "bg-red-500/10 text-red-600"
};

export default function Step4ConfirmationPage({ params }: Step4ConfirmationPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const [bookingRef] = useQueryState("ref", parseAsString.withDefault(""));
  // Appended by Stripe after confirmPayment and any 3DS step.
  const [redirectStatus] = useQueryState("redirect_status", parseAsString);
  const bankDeclined = redirectStatus === "failed";

  // The status we have been watching, and since when; drives the sync and give up timers.
  const [watch, setWatch] = useState<{ status: BookingStatus; since: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const elapsed = watch ? now - watch.since : 0;
  const pollingPending = watch?.status === "PENDING" && elapsed < PENDING_GIVE_UP_MS;
  const pollingExpired = watch?.status === "EXPIRED" && elapsed < EXPIRED_EXTRA_POLL_MS;
  const polling = !bankDeclined && (watch === null || pollingPending || pollingExpired);

  const {
    data: booking,
    dataUpdatedAt,
    isLoading,
    isError
  } = useBookingLookupQuery(bankDeclined ? "" : bookingRef, undefined, {
    // Never poll a booking this browser cannot read (wrong or missing email): the error
    // screen would otherwise ask the server every 2 seconds for as long as it stays open.
    refetchInterval: (query) => (query.state.status !== "error" && polling ? POLL_INTERVAL_MS : false)
  });
  const syncMutation = useSyncPaymentMutation();
  const status = booking?.status;

  // Restart the clock whenever the server reports a new status, timed from the read that saw it.
  if (status && watch?.status !== status) {
    setWatch({ status, since: dataUpdatedAt });
  }

  // 3DS failed at the bank: back to the payment page, same booking and intent (AC-6).
  // Only this tab can resume that booking. Without its stored checkout (another tab or
  // browser) the payment page would start a second booking and hold seats twice, so send
  // the customer to Manage booking for this reference instead.
  useEffect(() => {
    if (!bankDeclined) return;
    const checkout = recallPendingCheckout(tripId);
    if (!checkout || checkout.reference !== bookingRef) {
      router.replace(`/manage-booking/${encodeURIComponent(bookingRef)}`);
      return;
    }
    const search = checkout.search ? `${checkout.search}&` : "";
    router.replace(`/book/${tripId}/payment?${search}payment_error=bank_declined`);
  }, [bankDeclined, bookingRef, router, tripId]);

  // A one second tick while waiting, so the timers below advance.
  useEffect(() => {
    if (!pollingPending && !pollingExpired) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pollingPending, pollingExpired]);

  // At most one sync for PENDING (after 10 seconds) and one for EXPIRED (right away).
  const synced = useRef<{ pending: boolean; expired: boolean }>({ pending: false, expired: false });
  const bookingId = booking?.id;
  useEffect(() => {
    if (!bookingId || !watch) return;
    const email = recallBookingEmail(bookingRef);
    if (watch.status === "PENDING" && elapsed >= SYNC_AFTER_MS && !synced.current.pending) {
      synced.current.pending = true;
      syncMutation.mutate({ bookingId, email });
    }
    if (watch.status === "EXPIRED" && !synced.current.expired) {
      synced.current.expired = true;
      syncMutation.mutate({ bookingId, email });
    }
    // mutate is stable; listing the mutation object would rerun on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, bookingRef, elapsed, watch]);

  // The checkout is over once the server has an answer.
  useEffect(() => {
    if (status === "CONFIRMED" || status === "CHECKED_IN" || status === "CANCELLED") {
      forgetPendingCheckout(tripId);
    }
  }, [status, tripId]);

  if (bankDeclined) {
    return <StatusShell icon="wait" title="Returning to payment..." />;
  }

  if (!bookingRef) {
    return (
      <StatusShell icon="error" title="No booking reference" body="This page needs a booking reference.">
        <ManageBookingLink />
      </StatusShell>
    );
  }

  if (isLoading) {
    return <StatusShell icon="wait" title="Loading your booking..." />;
  }

  if (isError || !booking) {
    // Typical after a bank page opened in another browser: no stored email here.
    return (
      <StatusShell
        icon="error"
        title="We could not show this booking here"
        body={`Open Manage booking and enter the lead passenger email to see booking ${bookingRef}.`}
      >
        <ManageBookingLink reference={bookingRef} />
      </StatusShell>
    );
  }

  if (status === "PENDING") {
    return pollingPending ? (
      <StatusShell
        icon="wait"
        title="Confirming your payment..."
        body="This usually takes a few seconds. Please keep this page open."
        reference={booking.reference}
      />
    ) : (
      <StatusShell
        icon="clock"
        title="Your payment is processing"
        body="Refresh in a minute. You can also check the booking any time from Manage booking."
        reference={booking.reference}
      >
        <ManageBookingLink reference={booking.reference} />
      </StatusShell>
    );
  }

  if (status === "EXPIRED") {
    return pollingExpired ? (
      <StatusShell icon="wait" title="Checking your payment..." reference={booking.reference} />
    ) : (
      <StatusShell
        icon="error"
        title="Your seat hold ended"
        // Neutral until scope feature 4 ships the late payment restore and refund. Spec 0002
        // AC-6 then wants: "If you were charged, the booking is restored or the money is
        // refunded automatically."
        body="We have not confirmed a payment for this booking. If your card was charged, contact support with this reference and we will sort it out."
        reference={booking.reference}
      >
        <ManageBookingLink reference={booking.reference} />
      </StatusShell>
    );
  }

  if (status === "CANCELLED") {
    return (
      <StatusShell
        icon="error"
        title="This booking is cancelled"
        body="It no longer holds any seats."
        reference={booking.reference}
      >
        <ManageBookingLink reference={booking.reference} />
      </StatusShell>
    );
  }

  return <ConfirmedBooking booking={booking} />;
}

function ManageBookingLink({ reference }: { reference?: string }) {
  return (
    <Button variant="outline" asChild className="border-border/80 h-11 rounded-xl px-6 text-xs font-semibold">
      <Link href={reference ? `/manage-booking/${encodeURIComponent(reference)}` : "/manage-booking"}>
        Manage booking
      </Link>
    </Button>
  );
}

interface StatusShellProps {
  icon: "wait" | "clock" | "error";
  title: string;
  body?: string;
  reference?: string;
  children?: React.ReactNode;
}

function StatusShell({ icon, title, body, reference, children }: StatusShellProps) {
  const Icon = icon === "wait" ? Loader2 : icon === "clock" ? Clock : icon === "error" ? XCircle : AlertCircle;
  const tone =
    icon === "error" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <div className="dark:bg-background min-h-screen bg-[#F8FAFC] py-20">
      <div className="border-border/60 dark:bg-card border-b bg-white">
        <BookingStepperNav currentStep={4} />
      </div>
      <main className="container mx-auto mt-12 max-w-xl px-4 sm:px-6">
        <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-8 text-center shadow-sm">
          <CardContent className="space-y-4 p-0" role="status" aria-live="polite">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tone}`}>
              <Icon className={`h-6 w-6 ${icon === "wait" ? "animate-spin" : ""}`} aria-hidden="true" />
            </div>
            <h1 className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
            {body && <p className="text-muted-foreground mx-auto max-w-md text-xs sm:text-sm">{body}</p>}
            {reference && (
              <p className="text-muted-foreground text-xs">
                Booking reference{" "}
                <span className="text-foreground font-mono font-bold">{reference}</span>
              </p>
            )}
            {children && <div className="flex justify-center pt-2">{children}</div>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function ConfirmedBooking({ booking }: { booking: IBookingDetail }) {
  const refCode = booking.reference;
  const route = booking.schedule?.route;
  const depPort = route?.departurePort?.name ?? "";
  const arrPort = route?.destinationPort?.name ?? "";
  const operatorName = route?.operator?.companyName ?? "";
  const vesselName = booking.schedule?.ferry?.name ?? "";
  const passengers = booking.tickets ?? [];
  const totalPaid = booking.payment
    ? formatCents(booking.payment.amountCents, booking.payment.currency)
    : formatCents(Math.round(booking.totalAmount * 100));

  // Dock local times; the confirmation is kept, so times name the zone (spec 0003, AC-5).
  const departureZone = booking.schedule?.route?.departurePort?.timeZone;
  const arrivalZone = booking.schedule?.route?.destinationPort?.timeZone;
  const timeOf = (iso: string | undefined, zone: string | undefined) =>
    iso && zone ? `${formatPortTime(iso, zone)} ${portZoneLabel(iso, zone)} (local time)` : "";
  const departureDateDisplay =
    booking.schedule?.departureTime && departureZone
      ? formatPortDate(booking.schedule.departureTime, departureZone, "EEE, d MMM yyyy")
      : "";

  return (
    <div className="dark:bg-background min-h-screen bg-[#F8FAFC] py-20">
      <div className="border-border/60 dark:bg-card border-b bg-white">
        <BookingStepperNav currentStep={4} />
      </div>

      <main className="container mx-auto mt-8 max-w-5xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="space-y-3 text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <Check className="h-5 w-5 stroke-[3]" aria-hidden="true" />
            </div>
          </div>

          <h1 className="text-foreground text-3xl font-black tracking-tight sm:text-4xl">
            Your booking is confirmed!
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md text-xs sm:text-sm">
            Your digital ferry boarding pass is ready. Show your QR code at the pier gate for priority boarding.
          </p>
        </AnimatedSection>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-12">
          <AnimatedSection delay={0.05} className="md:col-span-4">
            <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-6 text-center shadow-sm">
              <CardContent className="space-y-5 p-0">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-[10px] font-extrabold tracking-widest uppercase">
                    BOOKING REFERENCE
                  </div>
                  <div className="font-mono text-3xl font-black tracking-tight text-[#003B95] dark:text-blue-400">
                    {refCode}
                  </div>
                </div>

                <div className="border-border/80 mx-auto flex w-fit items-center justify-center rounded-2xl border bg-white p-4 shadow-inner">
                  <QRCodeSVG
                    value={`https://islandhop.com/tickets/${refCode}`}
                    size={160}
                    level="H"
                    includeMargin={false}
                    aria-label={`QR code for booking ${refCode}`}
                  />
                </div>

                <div className="space-y-2.5 pt-2">
                  <Button
                    asChild
                    className="h-11 w-full rounded-xl bg-[#003B95] text-xs font-bold text-white shadow-md transition-all hover:bg-[#002f77]"
                  >
                    <Link href={`/tickets/${refCode}`}>
                      <Ticket className="mr-2 h-4 w-4" aria-hidden="true" /> View Digital Boarding Pass
                    </Link>
                  </Button>

                  <Button variant="outline" asChild className="border-border/80 h-11 w-full rounded-xl text-xs font-semibold">
                    <Link href={`/manage-booking/${refCode}`}>Manage Booking</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection delay={0.08} className="space-y-6 md:col-span-8">
            <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-6 shadow-sm">
              <CardContent className="space-y-6 p-0">
                <div className="border-border/60 text-foreground flex items-center justify-between border-b pb-4 text-base font-bold">
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-[#003B95]" aria-hidden="true" />
                    <span>Trip Details</span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_BADGE[booking.status]}`}>
                    {booking.status.replace("_", " ")}
                  </span>
                </div>

                <div className="bg-muted/40 flex items-center justify-between rounded-xl p-4">
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground text-[10px] font-bold uppercase">Origin Port</div>
                    <div className="text-foreground text-base font-bold sm:text-lg">{depPort}</div>
                    <div className="text-muted-foreground text-xs font-medium">
                      {timeOf(booking.schedule?.departureTime, departureZone)}
                    </div>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <Ship className="h-4 w-4 text-[#003B95]" aria-hidden="true" />
                    <div className="text-muted-foreground mt-1 text-[11px] font-medium">{departureDateDisplay}</div>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <div className="text-muted-foreground text-[10px] font-bold uppercase">Destination Port</div>
                    <div className="text-foreground text-base font-bold sm:text-lg">{arrPort}</div>
                    <div className="text-muted-foreground text-xs font-medium">
                      {timeOf(booking.schedule?.arrivalTime, arrivalZone)}
                    </div>
                  </div>
                </div>

                <ReturnLegCard tripType={booking.tripType} returnSchedule={booking.returnSchedule} />

                <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <div className="text-muted-foreground text-[11px] font-medium">Operator &amp; Ferry</div>
                    <div className="text-foreground font-bold">{operatorName}</div>
                    <div className="text-muted-foreground text-xs">{vesselName}</div>
                  </div>

                  <div>
                    <div className="text-muted-foreground text-[11px] font-medium">Boarding Gate</div>
                    <div className="text-foreground font-bold">{booking.schedule?.gate || "To be announced"}</div>
                    <div className="text-muted-foreground text-xs">{passengers.length} Registered Pax</div>
                  </div>
                </div>

                <div className="bg-border/60 h-[1px] w-full" />

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-foreground text-sm font-bold">
                    {booking.payment?.status === "COMPLETED" ? "Total Paid" : "Total"}
                  </span>
                  <span className="text-2xl font-black text-emerald-600 sm:text-3xl">{totalPaid}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-6 shadow-sm">
              <CardContent className="space-y-4 p-0">
                <div className="text-foreground flex items-center justify-between text-base font-bold">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#003B95]" aria-hidden="true" />
                    <span>Issued Tickets ({passengers.length})</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {passengers.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="bg-muted/40 text-foreground flex items-center justify-between rounded-xl p-3.5 text-xs font-semibold sm:text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                          <Ticket className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-foreground font-bold">{t.passengerName}</div>
                          <div className="text-muted-foreground text-[11px]">
                            {t.nationality} &bull; ID: {t.passportOrId} &bull; {t.cabinClass}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-xs font-extrabold text-[#003B95] dark:text-blue-400">
                        {t.ticketNumber}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </main>
    </div>
  );
}
