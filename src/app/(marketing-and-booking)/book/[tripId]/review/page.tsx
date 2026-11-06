"use client";

import { use, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  Info,
  Minus,
  Plus,
  Ship,
  Tag
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { useTripDetailsQuery } from "@/hooks/use-trips";
import { formatTripDate, formatTripTime, tripDateDisplay, useTripLegs } from "@/hooks/use-trip-legs";
import { BookingStepperNav, BookingSummarySidebar } from "@/widgets";
import { AnimatedSection, Button, Card, CardContent } from "@/ui";

interface Step1ReviewPageProps {
  params: Promise<{ tripId: string }>;
}

export default function Step1ReviewPage({ params }: Step1ReviewPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [passengerCount, setPassengerCount] = useQueryState(
    "passengers",
    parseAsInteger.withDefault(1)
  );
  const [departureDate] = useQueryState("departureDate", parseAsString.withDefault(""));
  const [fromPort] = useQueryState("from", parseAsString.withDefault(""));
  const [toPort] = useQueryState("to", parseAsString.withDefault(""));
  const { data: trip, isLoading, isError, error } = useTripDetailsQuery(tripId);
  const legs = useTripLegs(trip);

  // A return trip is limited by the fuller of its two ferries.
  const availableSeats = Math.min(
    trip?.availableSeats ?? 50,
    legs.returnTrip?.availableSeats ?? Number.POSITIVE_INFINITY
  );
  const fare = legs.fare?.adultFare ?? trip?.adultFare ?? 25;
  const isTripTypeOffered = !trip || legs.fare !== null;

  const handleIncrement = () => {
    if (passengerCount < availableSeats) {
      void setPassengerCount(passengerCount + 1);
    }
  };

  const handleDecrement = () => {
    if (passengerCount > 1) {
      void setPassengerCount(passengerCount - 1);
    }
  };

  const handleContinue = () => {
    startTransition(() => {
      router.push(
        `/book/${tripId}/passengers?passengers=${passengerCount}&departureDate=${encodeURIComponent(
          // Port local date of the trip, never the UTC date (spec 0003, AC-4).
          effectiveDate
        )}&from=${encodeURIComponent(trip?.departurePort || fromPort)}&to=${encodeURIComponent(
          trip?.destinationPort || toPort
        )}&${legs.legQuery}`
      );
    });
  };

  // Format date display
  const { effectiveDate, formattedDate, depTimeDisplay, arrTimeDisplay } = tripDateDisplay(
    trip,
    departureDate
  );

  if (isLoading || legs.isReturnLoading) {
    return (
      <div className="dark:bg-background min-h-screen bg-[#F8FAFC] py-20">
        <div className="border-border/60 dark:bg-card border-b bg-white">
          <BookingStepperNav currentStep={1} />
        </div>
        <main className="container mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <Card className="animate-pulse p-6 rounded-2xl border border-border bg-card">
                <div className="h-44 w-full bg-muted/60 rounded-xl" />
              </Card>
            </div>
            <div className="lg:col-span-4">
              <Card className="animate-pulse p-6 rounded-2xl border border-border bg-card">
                <div className="h-64 w-full bg-muted/60 rounded-xl" />
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="dark:bg-background min-h-screen bg-[#F8FAFC] py-20">
        <main className="container mx-auto mt-8 max-w-xl px-4 text-center">
          <Card className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-bold text-foreground">Ferry Trip Not Found</h2>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "The requested sailing could not be retrieved."}
            </p>
            <Button asChild className="rounded-xl">
              <Link href="/ferries">Return to Search</Link>
            </Button>

          </Card>
        </main>
      </div>
    );
  }

  const sidebarTripData = {
    adultFare: fare,
    departurePort: trip.departurePort,
    arrivalPort: trip.destinationPort,
    departureTime: depTimeDisplay,
    duration: trip.duration,
    operator: trip.operator
  };

  const returnLegSummary = legs.returnTrip
    ? {
        route: `${legs.returnTrip.departurePort} → ${legs.returnTrip.destinationPort}`,
        date: formatTripDate(legs.returnTrip.departureTime, legs.returnTrip.departureTimeZone),
        departureTime: formatTripTime(legs.returnTrip.departureTime, legs.returnTrip.departureTimeZone),
      }
    : null;

  return (
    <div className="dark:bg-background min-h-screen bg-[#F8FAFC] py-20">
      {/* 1. Top Stepper Header */}
      <div className="border-border/60 dark:bg-card border-b bg-white">
        <BookingStepperNav currentStep={1} />
      </div>

      {/* 2. Main Content Grid */}
      <main className="container mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Trip Details & Passenger Selector */}
          <AnimatedSection
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="space-y-6 lg:col-span-8"
          >
            {/* Trip Recap Card */}
            <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-6 shadow-sm">
              <CardContent className="space-y-6 p-0">
                <div className="border-border/60 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs font-semibold">
                      Your ferry trip
                    </span>
                    <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                      {trip.departurePort} &rarr; {trip.destinationPort}
                    </h2>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border h-9 rounded-xl px-4 text-xs font-semibold"
                    asChild
                  >
                    <Link
                      href={`/ferries?from=${encodeURIComponent(trip.departurePort)}&to=${encodeURIComponent(
                        trip.destinationPort
                      )}&departureDate=${encodeURIComponent(effectiveDate)}&passengers=${passengerCount}`}
                    >
                      Change Trip
                    </Link>

                  </Button>
                </div>

                {/* Trip Metadata Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="flex items-start gap-3.5">
                    <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-[11px] font-medium">Date</div>
                      <div className="text-foreground text-sm font-bold">{formattedDate}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-[11px] font-medium">Time</div>
                      <div className="text-foreground text-sm font-bold">
                        {depTimeDisplay} &rarr; {arrTimeDisplay}
                      </div>
                      <div className="text-muted-foreground text-xs">{trip.duration}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Ship className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-[11px] font-medium">Operator &amp; Ferry</div>
                      <div className="text-foreground text-sm font-bold">{trip.operator}</div>
                      <div className="text-muted-foreground text-xs">{trip.vessel} ({trip.vesselType || "Speedboat"})</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted-foreground text-[11px] font-medium">
                        {legs.tripTypeLabel} fare
                      </div>
                      <div className="text-foreground text-sm font-bold">
                        ${fare}{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          / passenger{legs.isReturn ? " (both ways)" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Return ferry (Round Trip / Same Day Return) */}
            {legs.isReturn && legs.returnTrip && (
              <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-6 shadow-sm">
                <CardContent className="space-y-3 p-0">
                  <span className="text-muted-foreground text-xs font-semibold">Your return ferry</span>
                  <h2 className="text-foreground text-xl font-bold tracking-tight">
                    {legs.returnTrip.departurePort} &rarr; {legs.returnTrip.destinationPort}
                  </h2>
                  <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span>{formatTripDate(legs.returnTrip.departureTime, legs.returnTrip.departureTimeZone)}</span>
                    <span>
                      {formatTripTime(legs.returnTrip.departureTime, legs.returnTrip.departureTimeZone)} &rarr;{" "}
                      {formatTripTime(legs.returnTrip.arrivalTime, legs.returnTrip.arrivalTimeZone)}
                    </span>
                    <span>{legs.returnTrip.vessel}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isTripTypeOffered && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm font-semibold">
                {legs.tripTypeLabel} is not offered on this trip. Please go back and choose another trip.
              </div>
            )}

            {/* Seats Remaining Blue Banner */}
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-[#EBF5FF] p-4 text-[#003B95] dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="font-bold">{availableSeats} seats remaining</div>
                <div className="text-xs text-blue-900/80 dark:text-blue-200/80">
                  Tickets are confirmed instantly and seat reservations are locked for checkout.
                </div>
              </div>
            </div>

            {/* Tickets / Passenger Counter Card */}
            <Card className="border-border/80 dark:bg-card rounded-2xl border bg-white p-6 shadow-sm">
              <CardContent className="space-y-4 p-0">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-[11px] font-extrabold tracking-wider uppercase">
                    TICKETS
                  </div>
                  <h3 className="text-foreground text-base font-bold">How many passengers?</h3>
                  <p className="text-muted-foreground text-xs">
                    Select the number of passengers travelling on this booking.
                  </p>
                </div>

                {/* Counter Input Box */}
                <div className="border-border/80 bg-card flex max-w-sm items-center justify-between rounded-2xl border p-2 sm:p-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    disabled={passengerCount <= 1}
                    className="border-border/80 bg-muted/50 hover:bg-muted h-10 w-10 rounded-xl"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <span className="text-foreground text-sm font-bold">
                    {passengerCount} {passengerCount === 1 ? "Passenger" : "Passengers"}
                  </span>

                  <Button
                    type="button"
                    size="icon"
                    onClick={handleIncrement}
                    disabled={passengerCount >= availableSeats}
                    className="h-10 w-10 rounded-xl bg-[#003B95] text-white hover:bg-[#002f77]"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Right Column: Sticky Summary Sidebar */}
          <AnimatedSection delay={0.08} className="lg:col-span-4">
            <div className="sticky top-24">
              <BookingSummarySidebar
                trip={sidebarTripData}
                passengerCount={passengerCount}
                departureDate={formattedDate}
                tripTypeLabel={legs.tripTypeLabel}
                returnLeg={returnLegSummary}
                actionButton={
                  <Button
                    onClick={handleContinue}
                    disabled={!isTripTypeOffered}
                    className="h-12 w-full rounded-xl bg-[#003B95] text-xs font-bold text-white shadow-md transition-all hover:bg-[#002f77] sm:text-sm"
                  >
                    Continue to Passenger Details <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                }
              />
            </div>
          </AnimatedSection>
        </div>
      </main>
    </div>
  );
}
