"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  Search,
  Ship,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";

import { parseBoardingScan } from "@/lib/boarding-pass";

import {
  useBoardPassengerMutation,
  useOperatorSchedulesQuery,
  useTripManifestQuery,
  useUnboardPassengerMutation
} from "@/hooks";

import {
  DashboardTableCard,
  isMovableBooking,
  MoveBookingDialog,
  StatusBadge,
  type IMoveBookingTarget,
  type TableColumn
} from "@/widgets";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ReusableSelect,
  Tabs,
  TabsList,
  TabsTrigger
} from "@/ui";
import type { IManifestPassengerRecord, OperatorScheduleStatus } from "@/types";

function ManifestLoadingFallback() {
  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Card className="border-border/80 bg-card p-12 text-center shadow-xs">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground text-xs font-semibold">
            Loading official passenger manifest & boarding roll call...
          </p>
        </div>
      </Card>
    </div>
  );
}

function ManifestContent() {
  const searchParams = useSearchParams();
  const urlTripId = searchParams.get("tripId");

  const [selectedTripId, setSelectedTripId] = React.useState<string>(urlTripId || "");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<string>("ALL");
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [scanInput, setScanInput] = React.useState("");
  const [operatingTicketId, setOperatingTicketId] = React.useState<string | null>(null);
  const [movingBooking, setMovingBooking] = React.useState<IMoveBookingTarget | null>(null);

  // 1. Fetch available schedules for operator to switch between trips
  const { data: schedulesData, isLoading: isSchedulesLoading } = useOperatorSchedulesQuery({
    limit: 50
  });

  const schedules = schedulesData?.schedules ?? [];

  // If selectedTripId is empty or invalid, auto-pick the first schedule from the list
  React.useEffect(() => {
    if (!selectedTripId && schedules.length > 0) {
      setSelectedTripId(schedules[0].id);
    }
  }, [selectedTripId, schedules]);

  // Keep state synced if URL parameter changes
  React.useEffect(() => {
    if (urlTripId && urlTripId !== selectedTripId) {
      setSelectedTripId(urlTripId);
    }
  }, [urlTripId]);

  // 2. Query: Live trip manifest from backend
  const {
    data: manifestData,
    isLoading: isManifestLoading,
    isFetching: isManifestFetching,
    isError: isManifestError,
    error: manifestError,
    refetch: refetchManifest
  } = useTripManifestQuery({
    tripId: selectedTripId,
    search: searchTerm,
    boardingStatus: activeTab === "ALL" ? undefined : activeTab
  });

  // 3. Mutations: Board & Unboard
  const boardMutation = useBoardPassengerMutation();
  const unboardMutation = useUnboardPassengerMutation();

  const tripInfo = manifestData?.tripInfo;
  const rawPassengers = manifestData?.passengers ?? [];

  // Lock manifest if vessel has already departed or arrived
  const isTripLocked =
    tripInfo?.tripStatus === "DEPARTED" ||
    tripInfo?.tripStatus === "ARRIVED" ||
    tripInfo?.tripStatus === "CANCELLED";

  // Filter passengers locally by search term for instant responsiveness
  const passengers = React.useMemo(() => {
    if (!searchTerm.trim()) return rawPassengers;
    const q = searchTerm.toLowerCase();
    return rawPassengers.filter(
      (p) =>
        p.passengerName.toLowerCase().includes(q) ||
        p.ticketNumber.toLowerCase().includes(q) ||
        p.bookingReference.toLowerCase().includes(q) ||
        p.passportOrId.toLowerCase().includes(q) ||
        p.nationality.toLowerCase().includes(q)
    );
  }, [rawPassengers, searchTerm]);

  // Passenger boarding toggle
  const handleToggleBoarding = async (item: IManifestPassengerRecord) => {
    if (isTripLocked) {
      toast.error(
        `This trip is marked as ${tripInfo?.tripStatus ?? "DEPARTED"}. Manifest is locked for Coast Guard compliance.`
      );
      return;
    }

    setOperatingTicketId(item.ticketId);
    try {
      if (item.boardingStatus === "BOARDED") {
        await unboardMutation.mutateAsync(item.ticketId);
      } else {
        await boardMutation.mutateAsync({ ticketId: item.ticketId });
      }
    } finally {
      setOperatingTicketId(null);
    }
  };

  // Quick QR / Manual Ticket Boarding Handler
  const handleScannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    // Handheld scanners type the QR content: `PASS:<ticket>:<ref>` (one passenger) or
    // `BOOKING:<ref>` (whole party). A typed ticket number, reference or passport also works.
    const scan = parseBoardingScan(scanInput);
    const eq = (a: string | undefined, b: string) => !!a && a.toUpperCase() === b.toUpperCase();

    let matches: typeof rawPassengers = [];
    if (scan.kind === "ticket") {
      matches = rawPassengers.filter(
        (p) => eq(p.ticketNumber, scan.ticketNumber) && (!scan.reference || eq(p.bookingReference, scan.reference))
      );
    } else if (scan.kind === "booking") {
      matches = rawPassengers.filter((p) => eq(p.bookingReference, scan.reference));
    } else {
      const ticket = rawPassengers.find(
        (p) => eq(p.ticketNumber, scan.value) || eq(p.passportOrId, scan.value)
      );
      matches = ticket
        ? [ticket]
        : rawPassengers.filter((p) => eq(p.bookingReference, scan.value));
    }

    if (matches.length === 0) {
      toast.error("This pass is not on the selected departure's manifest.");
      return;
    }

    const toBoard = matches.filter((p) => p.boardingStatus !== "BOARDED");
    if (toBoard.length === 0) {
      toast.info(
        matches.length === 1
          ? `Passenger ${matches[0].passengerName} is ALREADY marked as Boarded.`
          : `All ${matches.length} passengers on this booking are already boarded.`
      );
      setScanInput("");
      return;
    }

    try {
      for (const p of toBoard) {
        await boardMutation.mutateAsync({ ticketId: p.ticketId });
      }
      toast.success(
        toBoard.length === 1
          ? `Passenger ${toBoard[0].passengerName} confirmed boarded!`
          : `${toBoard.length} passengers confirmed boarded!`
      );
      setScanInput("");
      setIsScannerOpen(false);
    } catch {
      // toast handled in mutation
    }
  };

  // Trip selection options for dropdown
  const tripOptions = React.useMemo(() => {
    return schedules.map((s) => {
      const timeStr =
        isValid(parseISO(s.departureTime))
          ? format(new Date(s.departureTime), "dd MMM, hh:mm a")
          : s.departureTime;
      const origin = s.route?.departurePort?.name ?? "Origin";
      const dest = s.route?.destinationPort?.name ?? "Dest";
      const ferry = s.ferry?.name ?? "Ferry";
      return {
        value: s.id,
        label: `${origin} ➔ ${dest} • ${ferry} (${timeStr})`
      };
    });
  }, [schedules]);

  // Passenger Table Columns
  const passengerColumns: TableColumn<IManifestPassengerRecord>[] = [
    {
      header: "TICKET #",
      className: "font-mono font-bold text-foreground text-xs",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-foreground font-mono font-bold">{item.ticketNumber}</span>
          <span className="text-muted-foreground font-mono text-[10px]">
            Ref: {item.bookingReference}
          </span>
        </div>
      )
    },
    {
      header: "PASSENGER NAME",
      className: "text-xs",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-foreground text-xs font-bold">{item.passengerName}</span>
          <span className="text-muted-foreground font-mono text-[10px]">
            {item.passportOrId ? `ID: ${item.passportOrId}` : "Passport / ID: On file"}
          </span>
        </div>
      )
    },
    {
      header: "NATIONALITY",
      accessorKey: "nationality",
      className: "text-xs text-muted-foreground font-medium"
    },
    {
      header: "CABIN / SEAT",
      className: "text-xs font-semibold text-foreground",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            {item.cabinClass || "Standard"}
          </Badge>
          {item.luggageCount > 0 && (
            <span className="text-muted-foreground text-[10px]">
              🧳 {item.luggageCount} {item.luggageCount === 1 ? "bag" : "bags"}
            </span>
          )}
        </div>
      )
    },
    {
      header: "BOARDING STATUS",
      cell: (item) => {
        const isBoarded = item.boardingStatus === "BOARDED";
        return (
          <div className="flex flex-col gap-0.5">
            <StatusBadge
              status={
                isBoarded
                  ? "Boarded"
                  : item.boardingStatus === "CHECKED_IN"
                    ? "Checked In"
                    : "Pending"
              }
            />
            {item.boardedAt && (
              <span className="text-muted-foreground font-mono text-[9px]">
                {isValid(new Date(item.boardedAt))
                  ? format(new Date(item.boardedAt), "hh:mm a")
                  : ""}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "ACTION",
      align: "right",
      headerClassName: "text-right",
      cell: (item) => {
        const isBoarded = item.boardingStatus === "BOARDED";
        const isOperating = operatingTicketId === item.ticketId;

        // A passenger not boarded (for example a no show) can be moved, even after departure.
        const canMove = item.boardingStatus === "PENDING" && isMovableBooking(item.booking.status);

        return (
          <div className="flex items-center justify-end gap-1.5">
            {canMove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setMovingBooking({
                    reference: item.bookingReference,
                    leadPassengerName: item.booking.leadPassengerName,
                    passengers: item.booking.passengers,
                    status: item.booking.status,
                    hasReturn: item.booking.hasReturn
                  })
                }
                className="text-muted-foreground hover:text-foreground h-7 cursor-pointer gap-1 px-2 text-xs font-semibold print:hidden"
                title="Move this booking to another trip"
              >
                <CalendarClock className="h-3 w-3" />
                Move
              </Button>
            )}
            <Button
              variant={isBoarded ? "outline" : "default"}
              size="sm"
              disabled={isTripLocked || isOperating}
              onClick={() => void handleToggleBoarding(item)}
              className={
                isBoarded
                  ? "text-muted-foreground border-border hover:bg-muted/50 h-7 cursor-pointer px-2.5 text-xs"
                  : "h-7 cursor-pointer bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700"
              }
            >
              {isOperating ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : isBoarded ? (
                <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
              ) : (
                <UserCheck className="mr-1 h-3 w-3" />
              )}
              {isBoarded ? "Undo Boarding" : "Confirm Boarded"}
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
            >
              <Link href="/dashboard/operator/schedules">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back to Schedules
              </Link>
            </Button>
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Passenger Manifest & Boarding Roll Call
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Official maritime compliance manifest, passenger head-count, and live boarding gate
            verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <Button
            size="sm"
            disabled={isTripLocked}
            onClick={() => setIsScannerOpen(true)}
            className="flex h-9 items-center gap-1.5 bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <QrCode className="h-3.5 w-3.5" />
            Scan / Fast Board
          </Button>
        </div>
      </div>

      {/* Select Trip Schedule Bar */}
      <Card className="border-border/80 bg-card shadow-xs print:hidden">
        <CardContent className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="text-foreground text-xs font-bold">Select Ferry Departure:</span>
          </div>

          <div className="w-full md:w-96">
            {isSchedulesLoading ? (
              <div className="text-muted-foreground flex h-9 items-center text-xs">
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading schedules...
              </div>
            ) : tripOptions.length === 0 ? (
              <div className="text-muted-foreground py-1 text-xs">
                No scheduled ferry departures available.
              </div>
            ) : (
              <ReusableSelect
                value={selectedTripId}
                onValueChange={(val) => setSelectedTripId(val)}
                options={tripOptions}
                placeholder="Choose a sailing trip..."
              />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchManifest()}
            disabled={isManifestFetching || !selectedTripId}
            className="h-9 shrink-0 px-3 text-xs"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isManifestFetching ? "animate-spin" : ""}`}
            />
            Refresh Roll Call
          </Button>
        </CardContent>
      </Card>

      {/* Coast Guard Lockout Banner (When Departed or Arrived) */}
      {isTripLocked && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 shadow-2xs dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span className="font-bold">Maritime Safety Notice: </span>
            This voyage is currently marked as{" "}
            <span className="font-extrabold uppercase">{tripInfo?.tripStatus}</span>. Passenger
            manifest is permanently locked for Coast Guard inspection and passenger safety auditing.
          </div>
        </div>
      )}

      {/* Current Voyage Overview Card */}
      {tripInfo && (
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground text-base font-extrabold sm:text-lg">
                    {tripInfo.departurePort} ➔ {tripInfo.destinationPort}
                  </span>
                  <StatusBadge status={tripInfo.tripStatus.replace(/_/g, " ")} />
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-foreground flex items-center gap-1 font-semibold">
                    <Ship className="h-3.5 w-3.5 text-emerald-600" />
                    Vessel: {tripInfo.vesselName}
                  </span>
                  {tripInfo.captain && <span>Duty Captain: {tripInfo.captain}</span>}
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    Departure:{" "}
                    {isValid(new Date(tripInfo.departureTime))
                      ? format(new Date(tripInfo.departureTime), "dd MMM yyyy, hh:mm a")
                      : String(tripInfo.departureTime)}
                  </span>
                </div>
              </div>

              {/* Boarding Counter Progress */}
              <div className="border-border/60 flex items-center gap-6 self-start border-t pt-3 lg:self-auto lg:border-t-0 lg:pt-0">
                <div className="text-left lg:text-right">
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Boarding Progress
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {tripInfo.boardedPassengers}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      / {tripInfo.totalPassengers} Boarded
                    </span>
                  </div>
                </div>

                {/* Circular / Visual ratio */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-emerald-500/20 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {tripInfo.totalPassengers > 0
                    ? `${Math.round((tripInfo.boardedPassengers / tripInfo.totalPassengers) * 100)}%`
                    : "0%"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Passenger Roll Call */}
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center print:hidden">
          {/* Status Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="ALL" className="text-xs">
                All ({tripInfo?.totalPassengers ?? 0})
              </TabsTrigger>
              <TabsTrigger value="BOARDED" className="text-xs">
                Boarded ({tripInfo?.boardedPassengers ?? 0})
              </TabsTrigger>
              <TabsTrigger value="PENDING" className="text-xs">
                Awaiting Boarding (
                {Math.max(0, (tripInfo?.totalPassengers ?? 0) - (tripInfo?.boardedPassengers ?? 0))}
                )
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search by passenger, ticket, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-card h-9 pl-8 text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Content Table / Loading / Empty */}
        {isManifestLoading ? (
          <Card className="border-border/80 bg-card p-12 text-center shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-muted-foreground text-xs font-semibold">
                Connecting to Coast Guard manifest database...
              </p>
            </div>
          </Card>
        ) : isManifestError ? (
          <Card className="border-destructive/20 bg-destructive/5 p-8 text-center shadow-xs">
            <div className="bg-destructive/10 text-destructive mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-foreground text-base font-bold">Failed to load manifest</h3>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-xs">
              {manifestError instanceof Error
                ? manifestError.message
                : "Unable to retrieve trip passenger manifest from the server."}
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => void refetchManifest()}
                className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Retry
              </Button>
            </div>
          </Card>
        ) : !selectedTripId ? (
          <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-xl border px-4 py-16 text-center">
            <Ship className="text-muted-foreground/60 mb-2 h-10 w-10" />
            <h3 className="text-foreground text-sm font-bold">No sailing trip selected</h3>
            <p className="text-muted-foreground mt-0.5 max-w-sm text-xs">
              Please choose a scheduled ferry departure from the dropdown above to view its
              passenger roll call.
            </p>
          </div>
        ) : passengers.length === 0 ? (
          <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-xl border px-4 py-16 text-center">
            <Users className="text-muted-foreground/60 mb-2 h-10 w-10" />
            <h3 className="text-foreground text-sm font-bold">
              {searchTerm ? "No matching passengers found" : "No booked passengers on this trip"}
            </h3>
            <p className="text-muted-foreground mt-0.5 max-w-sm text-xs">
              {searchTerm
                ? `No passenger found matching "${searchTerm}". Try another search term.`
                : "No customer bookings have been confirmed yet for this scheduled sailing."}
            </p>
          </div>
        ) : (
          <DashboardTableCard
            title={`Passenger Roll Call (${passengers.length} Registered)`}
            columns={passengerColumns}
            data={passengers}
            keyExtractor={(item) => item.ticketId}
          />
        )}
      </div>

      {/* Fast Board / QR Pass Modal */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-base font-bold">
                  Fast Board / QR Pass Entry
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Scan barcode, QR payload, or enter Ticket Number / Booking Reference.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleScannerSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="scanInput" className="text-foreground text-xs font-semibold">
                Ticket Number / Reference *
              </Label>
              <Input
                id="scanInput"
                placeholder="e.g. TKT-98321 or BK-3498"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoFocus
                required
                className="h-9 font-mono text-xs uppercase"
              />
              <p className="text-muted-foreground text-[10px]">
                Point handheld scanner here or type ticket number and press Enter.
              </p>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScannerOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={boardMutation.isPending || !scanInput.trim()}
                className="flex items-center gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {boardMutation.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                )}
                Confirm Boarding
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Spec 0004: move a booking to another trip (AC-18) */}
      {movingBooking && (
        <MoveBookingDialog
          key={movingBooking.reference}
          booking={movingBooking}
          accent="emerald"
          onOpenChange={(open) => {
            if (!open) setMovingBooking(null);
          }}
        />
      )}
    </div>
  );
}

export default function OperatorManifestPage() {
  return (
    <React.Suspense fallback={<ManifestLoadingFallback />}>
      <ManifestContent />
    </React.Suspense>
  );
}
