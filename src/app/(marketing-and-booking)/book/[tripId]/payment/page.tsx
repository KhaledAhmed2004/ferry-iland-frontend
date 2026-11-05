"use client";

import { use, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Clock, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

import { env } from "@/env";
import { get, patch } from "@/lib/api";
import { formatCents } from "@/lib/payment";
import { useTripDetailsQuery } from "@/hooks/use-trips";
import { formatTripDate, formatTripTime, tripDateDisplay, useTripLegs } from "@/hooks/use-trip-legs";
import { recallBookingEmail, useCreateBookingMutation } from "@/hooks/use-bookings";
import {
  forgetPendingCheckout,
  paymentConflictOf,
  recallPendingCheckout,
  rememberPendingCheckout,
  useCreatePaymentIntentMutation,
  type IPendingCheckout
} from "@/hooks/use-payments";
import type { ApiResponse, IBookingDetail, ICreateBookingPayload, IPaymentIntent } from "@/types";
import { BookingStepperNav, BookingSummarySidebar } from "@/widgets";
import { AnimatedSection, Button, Card, CardContent } from "@/ui";

interface Step3PaymentPageProps {
  params: Promise<{ tripId: string }>;
}

// Spec 0002: card data goes from the browser straight to Stripe's iframe (PCI SAQ A).
// Loaded once per page load; null when the key is not configured.
const stripePromise = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

/** Set by the confirmation page when the bank's 3DS check failed (AC-6). */
const BANK_DECLINED_MESSAGE = "Your bank did not approve the payment, try again or use another card.";
/** Shown before a "start again" link to the review page: "Your hold expired, start again." */
const HOLD_EXPIRED_LEAD = "Your hold expired,";

/**
 * Identifies what a booking was made with: passenger count, trip type and return ferry
 * (legQuery), and the stored passenger details.
 */
function passengersKeyFor(tripId: string, passengerCount: number, legQuery: string): string {
  try {
    return `${passengerCount}|${legQuery}|${window.sessionStorage.getItem(`booking_${tripId}_passengers`) ?? ""}`;
  } catch {
    return `${passengerCount}|${legQuery}|`;
  }
}

type StoredPassengers = {
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  passengers?: Array<Record<string, unknown>>;
};

type Phase =
  /** Nothing booked yet: the customer sees "Continue to pay". */
  | { kind: "review" }
  /** Creating the booking, or loading or resuming its intent. */
  | { kind: "loading" }
  /** The Payment Element is shown for this intent. */
  | { kind: "pay"; intent: IPaymentIntent; clockOffsetMs: number }
  /** The hold ended: the customer starts again from the trip review page. */
  | { kind: "expired" }
  /** The booking can no longer be paid (cancelled, expired before reload). */
  | { kind: "closed"; message: string }
  /** Stripe or the server could not be reached; the booking keeps its hold, so a retry is safe. */
  | { kind: "retry"; checkout: IPendingCheckout; message: string };

function readStoredPassengers(tripId: string): StoredPassengers | null {
  try {
    const raw = window.sessionStorage.getItem(`booking_${tripId}_passengers`);
    return raw ? (JSON.parse(raw) as StoredPassengers) : null;
  } catch {
    return null;
  }
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Step3PaymentPage({ params }: Step3PaymentPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [passengerCount] = useQueryState("passengers", parseAsInteger.withDefault(1));
  const [departureDate] = useQueryState("departureDate", parseAsString.withDefault(""));
  const [fromPort] = useQueryState("from", parseAsString.withDefault(""));
  const [toPort] = useQueryState("to", parseAsString.withDefault(""));
  const [paymentError, setPaymentError] = useQueryState("payment_error", parseAsString);

  const { data: trip } = useTripDetailsQuery(tripId);
  const legs = useTripLegs(trip);
  const createBookingMutation = useCreateBookingMutation();
  const createIntentMutation = useCreatePaymentIntentMutation();

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(
    paymentError === "bank_declined" ? BANK_DECLINED_MESSAGE : null
  );
  const [now, setNow] = useState(() => Date.now());

  const queryString = `passengers=${passengerCount}&departureDate=${encodeURIComponent(
    departureDate
  )}&from=${encodeURIComponent(fromPort)}&to=${encodeURIComponent(toPort)}&${legs.legQuery}`;
  const reviewHref = `/book/${tripId}/review?${queryString}`;

  const goToConfirmation = useCallback(
    (reference: string) => {
      startTransition(() => {
        router.push(`/book/${tripId}/confirmation?ref=${encodeURIComponent(reference)}`);
      });
    },
    [router, tripId]
  );

  /** Asks the server for the booking's one intent and moves the page to the matching state. */
  const loadIntent = useCallback(
    async (checkout: IPendingCheckout) => {
      setPhase({ kind: "loading" });
      try {
        const intent = await createIntentMutation.mutateAsync({
          bookingId: checkout.bookingId,
          email: recallBookingEmail(checkout.reference)
        });
        // offset = serverNow − browser now at response time (AC-5).
        const clockOffsetMs = new Date(intent.serverNow).getTime() - Date.now();
        setPhase({ kind: "pay", intent, clockOffsetMs });
      } catch (error) {
        const conflict = paymentConflictOf(error);
        if (conflict) {
          if (
            conflict.code === "PAYMENT_SUCCEEDED" ||
            conflict.code === "PAYMENT_PROCESSING" ||
            conflict.bookingStatus === "CONFIRMED" ||
            conflict.bookingStatus === "CHECKED_IN"
          ) {
            goToConfirmation(conflict.bookingReference);
            return;
          }
          forgetPendingCheckout(tripId);
          if (conflict.code === "HOLD_EXPIRED" || conflict.bookingStatus === "EXPIRED") {
            setPhase({ kind: "expired" });
          } else {
            setPhase({ kind: "closed", message: `This booking is ${conflict.bookingStatus.toLowerCase()}.` });
          }
          return;
        }
        setPhase({
          kind: "retry",
          checkout,
          message: error instanceof Error ? error.message : "Payment service unavailable, try again"
        });
      }
    },
    // mutateAsync is stable; listing the mutation object would rerun on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goToConfirmation, tripId]
  );

  // On load: resume a booking this tab already started, so a reload makes no second hold (AC-3).
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;

    (async () => {
      const checkout = recallPendingCheckout(tripId);
      if (!checkout) {
        setPhase({ kind: "review" });
        return;
      }

      // The customer went back and changed the passengers: the stored booking no longer
      // matches what they want to pay for. Release its seats and start over.
      if (
        checkout.passengersKey &&
        checkout.passengersKey !== passengersKeyFor(tripId, passengerCount, legs.legQuery)
      ) {
        forgetPendingCheckout(tripId);
        const email = recallBookingEmail(checkout.reference);
        await patch(`/bookings/${checkout.bookingId}/cancel`, email ? { email } : {}).catch(() => {
          // Best effort: the server's hold expiry still frees the seats.
        });
        setPhase({ kind: "review" });
        return;
      }

      try {
        const email = recallBookingEmail(checkout.reference);
        const response = await get<ApiResponse<IBookingDetail>>(
          `/bookings/manage/${encodeURIComponent(checkout.reference)}`,
          { params: email ? { email } : {} }
        );
        const booking = response.data;
        const holdLeft = booking?.holdExpiresAt
          ? new Date(booking.holdExpiresAt).getTime() > Date.now()
          : false;

        if (booking?.status === "PENDING" && holdLeft) {
          await loadIntent(checkout);
        } else if (booking?.status === "CONFIRMED" || booking?.status === "CHECKED_IN") {
          goToConfirmation(checkout.reference);
        } else {
          forgetPendingCheckout(tripId);
          if (booking?.status === "PENDING" || booking?.status === "EXPIRED") {
            setPhase({ kind: "expired" });
          } else {
            setPhase({ kind: "review" });
          }
        }
      } catch {
        // The stored booking cannot be read (other device, cleared storage): start fresh.
        forgetPendingCheckout(tripId);
        setPhase({ kind: "review" });
      }
    })();
  }, [goToConfirmation, loadIntent, passengerCount, tripId]);

  // Countdown tick while the Payment Element is shown.
  const isPaying = phase.kind === "pay";
  useEffect(() => {
    if (!isPaying) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isPaying]);

  const holdRemainingMs =
    phase.kind === "pay"
      ? new Date(phase.intent.holdExpiresAt).getTime() - (now + phase.clockOffsetMs)
      : 0;
  const holdOver = phase.kind === "pay" && holdRemainingMs <= 0;

  // At zero the Pay button is disabled; the server's 409 and the expiry job stay the authority (AC-5).
  useEffect(() => {
    if (holdOver) forgetPendingCheckout(tripId);
  }, [holdOver, tripId]);

  const handleContinueToPay = async () => {
    setInlineError(null);
    const stored = readStoredPassengers(tripId);
    if (!stored?.leadEmail || !stored.leadName || !stored.passengers?.length) {
      setPhase({
        kind: "closed",
        message: "Passenger details are missing. Go back and enter them again."
      });
      return;
    }

    const payload: ICreateBookingPayload = {
      scheduleId: tripId,
      tripType: legs.bookingTripType,
      ...(legs.returnTripId ? { returnScheduleId: legs.returnTripId } : {}),
      leadPassengerName: stored.leadName,
      leadPassengerEmail: stored.leadEmail,
      leadPassengerPhone: stored.leadPhone,
      adultsCount: passengerCount,
      childrenCount: 0,
      passengers: stored.passengers.map((p) => ({
        passengerName: String(p.fullName ?? p.passengerName ?? ""),
        nationality: String(p.nationality ?? ""),
        passportOrId: String(p.passportOrId ?? ""),
        cabinClass: (p.cabinClass as ICreateBookingPayload["passengers"][number]["cabinClass"]) ?? "STANDARD",
        luggageCount: typeof p.luggageCount === "number" ? p.luggageCount : 0
      }))
    };

    setPhase({ kind: "loading" });
    let booking: IBookingDetail | undefined;
    try {
      booking = (await createBookingMutation.mutateAsync(payload)).data;
    } catch {
      // The booking hook already showed the server's message.
      setPhase({ kind: "review" });
      return;
    }
    if (!booking) {
      setPhase({ kind: "review" });
      return;
    }

    // Payments off, or a free booking: nothing to charge.
    if (booking.status !== "PENDING") {
      forgetPendingCheckout(tripId);
      goToConfirmation(booking.reference);
      return;
    }

    const checkout = {
      bookingId: booking.id,
      reference: booking.reference,
      search: queryString,
      passengersKey: passengersKeyFor(tripId, passengerCount, legs.legQuery)
    };
    rememberPendingCheckout(tripId, checkout);
    await loadIntent(checkout);
  };

  const { effectiveDate, formattedDate, depTimeDisplay } = tripDateDisplay(
    trip,
    departureDate
  );

  const returnLegSummary = legs.returnTrip
    ? {
        route: `${legs.returnTrip.departurePort} → ${legs.returnTrip.destinationPort}`,
        date: formatTripDate(legs.returnTrip.departureTime, legs.returnTrip.departureTimeZone),
        departureTime: formatTripTime(legs.returnTrip.departureTime, legs.returnTrip.departureTimeZone),
      }
    : null;

  const sidebarTripData = {
    adultFare: legs.fare?.adultFare ?? trip?.adultFare,
    // Once an intent exists, the total shown is the server's amount, never a browser calculation.
    ...(phase.kind === "pay" ? { totalPrice: phase.intent.amountCents / 100 } : {}),
    departurePort: trip?.departurePort || fromPort,
    arrivalPort: trip?.destinationPort || toPort,
    departureTime: depTimeDisplay,
    duration: trip?.duration,
    operator: trip?.operator
  };

  const payLabel =
    phase.kind === "pay" ? `Pay ${formatCents(phase.intent.amountCents, phase.intent.currency)}` : "";

  const primaryButtonClass =
    "h-12 w-full rounded-xl bg-[#003B95] text-xs font-bold text-white shadow-md transition-all hover:bg-[#002f77] sm:text-sm disabled:opacity-50";

  const actionButton = (() => {
    switch (phase.kind) {
      case "review":
        return (
          <Button type="button" onClick={handleContinueToPay} className={primaryButtonClass}>
            Continue to pay
          </Button>
        );
      case "loading":
        return (
          <Button type="button" disabled className={primaryButtonClass}>
            Reserving your seats...
          </Button>
        );
      case "pay":
        return (
          <Button
            type="submit"
            form="payment-form"
            disabled={submitting || holdOver || !stripePromise}
            className={primaryButtonClass}
          >
            {submitting ? "Processing payment..." : payLabel}
          </Button>
        );
      case "retry":
        return (
          <Button type="button" onClick={() => loadIntent(phase.checkout)} className={primaryButtonClass}>
            Try again
          </Button>
        );
      case "expired":
        return (
          <Button asChild className={primaryButtonClass}>
            <Link href={reviewHref}>Start again</Link>
          </Button>
        );
      default:
        return null;
    }
  })();

  const appearance: Appearance = {
    theme: "stripe",
    variables: { colorPrimary: "#003B95", borderRadius: "12px" }
  };

  return (
    <div className="dark:bg-background min-h-screen bg-[#F8FAFC] py-20">
      <div className="border-border/60 dark:bg-card border-b bg-white">
        <BookingStepperNav currentStep={3} />
      </div>

      <main className="container mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <AnimatedSection
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="space-y-6 lg:col-span-8"
          >
            <div className="space-y-1">
              <h1 className="text-foreground text-3xl font-black tracking-tight sm:text-4xl">
                Complete your booking
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Your seats are held while you pay. Digital boarding passes are issued once the payment is confirmed.
              </p>
            </div>

            {phase.kind === "pay" && (
              <div
                role="status"
                aria-live="polite"
                className={
                  holdOver
                    ? "flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                    : "flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                }
              >
                <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
                {holdOver ? (
                  <span className="text-xs font-semibold sm:text-sm">
                    {HOLD_EXPIRED_LEAD}{" "}
                    <Link href={reviewHref} className="underline underline-offset-2">
                      start again
                    </Link>
                    .
                  </span>
                ) : (
                  <span className="text-xs font-semibold sm:text-sm">
                    Seats held for{" "}
                    <span className="font-mono" aria-label={`${formatCountdown(holdRemainingMs)} remaining`}>
                      {formatCountdown(holdRemainingMs)}
                    </span>
                  </span>
                )}
              </div>
            )}

            <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-6 shadow-sm">
              <CardContent className="space-y-5 p-0">
                <div className="text-foreground flex items-center justify-between text-base font-bold">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#003B95]" aria-hidden="true" />
                    <span>Credit or Debit Card</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Secured by Stripe</span>
                  </div>
                </div>

                {inlineError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 sm:text-sm"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{inlineError}</span>
                  </div>
                )}

                {phase.kind === "review" && (
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Press <span className="text-foreground font-semibold">Continue to pay</span> to reserve your
                    seats. You then enter your card details here.
                  </p>
                )}

                {phase.kind === "loading" && (
                  <div className="space-y-3" aria-busy="true" aria-label="Loading payment form">
                    <div className="bg-muted h-11 animate-pulse rounded-xl" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted h-11 animate-pulse rounded-xl" />
                      <div className="bg-muted h-11 animate-pulse rounded-xl" />
                    </div>
                  </div>
                )}

                {phase.kind === "pay" &&
                  (stripePromise ? (
                    <Elements
                      stripe={stripePromise}
                      options={{ clientSecret: phase.intent.clientSecret, appearance }}
                    >
                      <CardPaymentForm
                        returnUrl={`${env.NEXT_PUBLIC_SITE_URL}/book/${tripId}/confirmation?ref=${encodeURIComponent(
                          phase.intent.bookingReference
                        )}`}
                        disabled={holdOver}
                        onSubmittingChange={setSubmitting}
                        onError={(message) => {
                          setInlineError(message);
                          if (paymentError) void setPaymentError(null);
                        }}
                      />
                    </Elements>
                  ) : (
                    <p role="alert" className="text-xs font-medium text-red-600 sm:text-sm">
                      Card payments are not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
                    </p>
                  ))}

                {phase.kind === "expired" && (
                  <p role="alert" className="text-xs font-semibold text-red-600 sm:text-sm">
                    {HOLD_EXPIRED_LEAD}{" "}
                    <Link href={reviewHref} className="underline underline-offset-2">
                      start again
                    </Link>
                    .
                  </p>
                )}

                {phase.kind === "closed" && (
                  <p role="alert" className="text-xs font-semibold text-red-600 sm:text-sm">
                    {phase.message}
                  </p>
                )}

                {phase.kind === "retry" && (
                  <p role="alert" className="text-xs font-semibold text-red-600 sm:text-sm">
                    {phase.message}. Your seats are still held.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-[#F0F7FF] p-4 text-[#003B95] dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
              <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Your card details never touch our servers</span>
                <div className="text-muted-foreground text-xs">
                  Card numbers go straight to Stripe. Your booking is confirmed only once Stripe tells us the payment
                  succeeded.
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.08} className="lg:col-span-4">
            <div className="sticky top-24">
              <BookingSummarySidebar
                trip={sidebarTripData}
                passengerCount={passengerCount}
                departureDate={formattedDate}
                title="Booking Summary"
                tripTypeLabel={legs.tripTypeLabel}
                returnLeg={returnLegSummary}
                actionButton={actionButton}
                secondaryButton={
                  phase.kind === "review" || phase.kind === "closed" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/book/${tripId}/passengers?${queryString}`)}
                      className="border-border/80 text-muted-foreground hover:text-foreground h-11 w-full rounded-xl text-xs font-semibold"
                    >
                      <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" /> Back to Passengers
                    </Button>
                  ) : undefined
                }
              />
            </div>
          </AnimatedSection>
        </div>
      </main>
    </div>
  );
}

interface CardPaymentFormProps {
  returnUrl: string;
  disabled: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onError: (message: string | null) => void;
}

/** The Payment Element and its submit handler. Submitted by the Pay button in the sidebar. */
function CardPaymentForm({ returnUrl, disabled, onSubmittingChange, onError }: CardPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || disabled) return;

    onError(null);
    onSubmittingChange(true);
    // On success (and after any 3DS step) Stripe redirects to returnUrl. We only get here
    // with an error, for example a declined card; the same intent takes another card (AC-4).
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl }
    });
    onSubmittingChange(false);
    if (error) {
      onError(error.message ?? "Your payment could not be completed, try another card.");
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
    </form>
  );
}
