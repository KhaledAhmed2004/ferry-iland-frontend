import * as React from "react";
import Link from "next/link";
import { portZoneLabel, toWallTimeInput, wallTimeToDate } from "@/lib/port-time";
import {
  AlertTriangle,
  Clock,
  Edit,
  Loader2,
  Navigation,
  Ship,
  Ticket
} from "lucide-react";
import { toast } from "sonner";
import type {
  IFerry,
  IOperatorSchedule,
  IRoute,
  IScheduleBundleFares,
  OperatorScheduleStatus
} from "@/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ReusableSelect
} from "@/ui";

const STATUS_OPTIONS: { value: OperatorScheduleStatus; label: string }[] = [
  { value: "ON_TIME", label: "On Time / Scheduled" },
  { value: "BOARDING", label: "Boarding" },
  { value: "DEPARTED", label: "Departed" },
  { value: "DELAYED", label: "Delayed" },
  { value: "ARRIVED", label: "Arrived / Completed" },
  { value: "CANCELLED", label: "Cancelled" }
];

type BundleFareKey = keyof IScheduleBundleFares;

/** Round trip / same day return fares per passenger. Empty = that option is not offered on this trip. */
const BUNDLE_FARE_FIELDS: { key: BundleFareKey; label: string }[] = [
  { key: "adultRoundTripFare", label: "Round Trip · Adult ($)" },
  { key: "childRoundTripFare", label: "Round Trip · Child ($)" },
  { key: "adultSameDayFare", label: "Same Day Return · Adult ($)" },
  { key: "childSameDayFare", label: "Same Day Return · Child ($)" }
];

const EMPTY_BUNDLE_FARES: Record<BundleFareKey, string> = {
  adultRoundTripFare: "",
  childRoundTripFare: "",
  adultSameDayFare: "",
  childSameDayFare: ""
};

export interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSchedule: IOperatorSchedule | null;
  routes: IRoute[];
  ferries: IFerry[];
  isRoutesLoading: boolean;
  isFerriesLoading: boolean;
  onSubmitCreate: (
    data: {
      routeId: string;
      ferryId: string;
      departureTime: string;
      arrivalTime: string;
      adultFare: number;
      childFare?: number;
    } & IScheduleBundleFares
  ) => Promise<void>;
  onSubmitUpdate: (
    data: {
      id: string;
      departureTime: string;
      arrivalTime: string;
      status: OperatorScheduleStatus;
      adultFare: number;
      childFare?: number;
    } & IScheduleBundleFares
  ) => Promise<void>;
  isSubmitting: boolean;
}

export function ScheduleFormModal({
  isOpen,
  onClose,
  editingSchedule,
  routes,
  ferries,
  isRoutesLoading,
  isFerriesLoading,
  onSubmitCreate,
  onSubmitUpdate,
  isSubmitting
}: ScheduleFormModalProps) {
  const isEditing = Boolean(editingSchedule);

  // Form State
  const [routeId, setRouteId] = React.useState("");
  const [ferryId, setFerryId] = React.useState("");
  const [departureDateTime, setDepartureDateTime] = React.useState("");
  const [arrivalDateTime, setArrivalDateTime] = React.useState("");
  const [adultFare, setAdultFare] = React.useState("25");
  const [childFare, setChildFare] = React.useState("15");
  const [status, setStatus] = React.useState<OperatorScheduleStatus>("ON_TIME");
  const [bundleFares, setBundleFares] = React.useState<Record<BundleFareKey, string>>(EMPTY_BUNDLE_FARES);

  // Sync state on open / edit change
  React.useEffect(() => {
    if (editingSchedule) {
      setRouteId(editingSchedule.routeId || "");
      setFerryId(editingSchedule.ferryId || "");
      // The inputs show wall time at each port, never the operator's laptop zone (spec 0003, AC-6).
      const depZone = editingSchedule.route?.departurePort?.timeZone;
      const arrZone = editingSchedule.route?.destinationPort?.timeZone;
      setDepartureDateTime(depZone ? toWallTimeInput(editingSchedule.departureTime, depZone) : "");
      setArrivalDateTime(arrZone ? toWallTimeInput(editingSchedule.arrivalTime, arrZone) : "");
      setAdultFare(String(editingSchedule.adultFare));
      setChildFare(editingSchedule.childFare != null ? String(editingSchedule.childFare) : "");
      setStatus(editingSchedule.status || "ON_TIME");
      setBundleFares({
        adultRoundTripFare: editingSchedule.adultRoundTripFare?.toString() ?? "",
        childRoundTripFare: editingSchedule.childRoundTripFare?.toString() ?? "",
        adultSameDayFare: editingSchedule.adultSameDayFare?.toString() ?? "",
        childSameDayFare: editingSchedule.childSameDayFare?.toString() ?? ""
      });
    } else {
      setRouteId("");
      setFerryId("");
      setDepartureDateTime("");
      setArrivalDateTime("");
      setAdultFare("25");
      setChildFare("15");
      setStatus("ON_TIME");
      setBundleFares(EMPTY_BUNDLE_FARES);
    }
  }, [editingSchedule, isOpen]);

  /** Empty field = null, so the option is not offered (and an edit clears an old fare). */
  const bundleFarePayload = (): Required<IScheduleBundleFares> => ({
    adultRoundTripFare: bundleFares.adultRoundTripFare.trim() === "" ? null : Number(bundleFares.adultRoundTripFare),
    childRoundTripFare: bundleFares.childRoundTripFare.trim() === "" ? null : Number(bundleFares.childRoundTripFare),
    adultSameDayFare: bundleFares.adultSameDayFare.trim() === "" ? null : Number(bundleFares.adultSameDayFare),
    childSameDayFare: bundleFares.childSameDayFare.trim() === "" ? null : Number(bundleFares.childSameDayFare)
  });

  // Dropdown options
  const routeOptions = React.useMemo(() => {
    return routes.map((r) => ({
      value: r.id,
      label: `${r.departurePort?.name ?? "Origin"} ➔ ${r.destinationPort?.name ?? "Dest"} • ${r.durationMinutes} mins trip`
    }));
  }, [routes]);

  const ferryOptions = React.useMemo(() => {
    return ferries
      .filter((f) => {
        const normalized = (f.status || "").toUpperCase();
        return normalized === "IN_SERVICE" || normalized === "IN SERVICE";
      })
      .map((f) => {
        const typeLabel = f.type ? f.type.replace("_", " ") : "Ferry";
        return {
          value: f.id,
          label: `${f.name} • ${f.capacity} Seats (${typeLabel})`
        };
      });
  }, [ferries]);

  const selectedRoute = React.useMemo(() => {
    const targetId = isEditing ? editingSchedule?.routeId : routeId;
    return routes.find((r) => r.id === targetId);
  }, [routes, isEditing, editingSchedule?.routeId, routeId]);

  // Departure is typed in the departure port's zone, arrival in the destination port's zone.
  const departureZone = isEditing
    ? editingSchedule?.route?.departurePort?.timeZone
    : selectedRoute?.departurePort?.timeZone;
  const arrivalZone = isEditing
    ? editingSchedule?.route?.destinationPort?.timeZone
    : selectedRoute?.destinationPort?.timeZone;
  const departurePortName = isEditing
    ? editingSchedule?.route?.departurePort?.name
    : selectedRoute?.departurePort?.name;
  const arrivalPortName = isEditing
    ? editingSchedule?.route?.destinationPort?.name
    : selectedRoute?.destinationPort?.name;

  /** Arrival wall time at the destination port for a departure wall time plus the trip length. */
  const arrivalFor = (
    departureWall: string,
    minutes: number,
    fromZone: string | undefined,
    toZone: string | undefined
  ): string | null => {
    if (!fromZone || !toZone) return null;
    const departure = wallTimeToDate(departureWall, fromZone);
    if (!departure) return null;
    return toWallTimeInput(new Date(departure.getTime() + minutes * 60 * 1000), toZone);
  };

  const selectedFerry = React.useMemo(() => {
    const targetId = isEditing ? editingSchedule?.ferryId : ferryId;
    return ferries.find((f) => f.id === targetId);
  }, [ferries, isEditing, editingSchedule?.ferryId, ferryId]);

  // Departure auto-calculation helper
  const handleDepartureChange = (value: string) => {
    setDepartureDateTime(value);
    if (value && selectedRoute?.durationMinutes) {
      const arrival = arrivalFor(value, selectedRoute.durationMinutes, departureZone, arrivalZone);
      if (arrival) setArrivalDateTime(arrival);
    }
  };

  const handleRouteChange = (val: string) => {
    setRouteId(val);
    const chosenRoute = routes.find((r) => r.id === val);
    if (departureDateTime && chosenRoute?.durationMinutes) {
      const arrival = arrivalFor(
        departureDateTime,
        chosenRoute.durationMinutes,
        chosenRoute.departurePort?.timeZone,
        chosenRoute.destinationPort?.timeZone
      );
      if (arrival) setArrivalDateTime(arrival);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!departureDateTime || !arrivalDateTime) {
      toast.error("Please select departure and arrival times.");
      return;
    }

    // Compare the real moments at each port; the backend checks again (spec 0003, rule 8).
    const depDate = departureZone ? wallTimeToDate(departureDateTime, departureZone) : null;
    const arrDate = arrivalZone ? wallTimeToDate(arrivalDateTime, arrivalZone) : null;
    if (depDate && arrDate && arrDate <= depDate) {
      toast.error("Arrival time must be later than departure time.");
      return;
    }

    const invalidFare = BUNDLE_FARE_FIELDS.find(({ key }) => {
      const value = bundleFares[key].trim();
      return value !== "" && (isNaN(Number(value)) || Number(value) < 0);
    });
    if (invalidFare) {
      toast.error(`${invalidFare.label} must be a positive amount, or empty if not offered.`);
      return;
    }

    if (!isEditing) {
      if (!routeId) {
        toast.error("Please select a ferry route.");
        return;
      }
      if (!ferryId) {
        toast.error("Please select an in-service ferry.");
        return;
      }

      await onSubmitCreate({
        routeId,
        ferryId,
        // Local wall times; the backend reads them in the route's port zones (spec 0003, AC-6).
        departureTime: departureDateTime,
        arrivalTime: arrivalDateTime,
        adultFare: Number(adultFare) || 25,
        childFare: childFare ? Number(childFare) : undefined,
        ...bundleFarePayload()
      });
    } else if (editingSchedule) {
      await onSubmitUpdate({
        id: editingSchedule.id,
        departureTime: departureDateTime,
        arrivalTime: arrivalDateTime,
        status,
        adultFare: Number(adultFare) || 25,
        childFare: childFare ? Number(childFare) : undefined,
        ...bundleFarePayload()
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {isEditing ? <Edit className="h-5 w-5" /> : <Ship className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? "Edit Ferry Schedule" : "Add Ferry Schedule"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? "Update departure timing, live trip status, or passenger ticket prices."
                  : "Plan and publish a scheduled sailing between island ports with assigned ferry and ticket prices."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Real-World Context Card for Edit */}
        {isEditing && editingSchedule && (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-foreground">
                {editingSchedule.route?.departurePort?.name ?? "Origin"} ➔ {editingSchedule.route?.destinationPort?.name ?? "Dest"}
              </span>
              <span className="text-muted-foreground ml-2">
                ({editingSchedule.ferry?.name ?? "Ferry"} • {editingSchedule.ferry?.capacity ?? 0} Seats)
              </span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full self-start sm:self-auto">
              👥 {editingSchedule._count?.bookings ?? 0} Confirmed Bookings
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Prerequisite Warnings for Add */}
          {!isEditing && routes.length === 0 && !isRoutesLoading && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                No active routes are open yet. Routes are set up by the platform admin; ask
                them to add or reopen the route you want to sail.
              </span>
            </div>
          )}

          {!isEditing && ferries.length === 0 && !isFerriesLoading && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                No ferries registered. Please register a ferry in{" "}
                <Link href="/dashboard/operator/ferries" className="underline font-bold">
                  Fleet
                </Link>{" "}
                before scheduling departures.
              </span>
            </div>
          )}

          {/* Real-World Voyage Preview Summary for Add */}
          {!isEditing && selectedRoute && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white text-[11px] font-bold">
                    ➔
                  </div>
                  <span className="font-bold text-xs text-foreground">
                    {selectedRoute.departurePort?.name ?? "Origin"} ➔ {selectedRoute.destinationPort?.name ?? "Destination"}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {selectedRoute.durationMinutes} mins trip
                </span>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/10">
                <span>
                  Ferry:{" "}
                  <strong className="text-foreground font-semibold">
                    {selectedFerry?.name ?? "Selected Ferry"}
                  </strong>{" "}
                  ({selectedFerry?.capacity ?? 0} Seats Capacity)
                </span>
                <span>
                  Maximum Bookings:{" "}
                  <strong className="text-foreground font-semibold">
                    {selectedFerry?.capacity ?? 0} seats
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* 1. Voyage & Schedule Timing */}
          <div className="space-y-3 pt-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-emerald-600" />
              1. Sailing Timing & Ferry
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isEditing && (
                <>
                  {/* Route Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Ferry Route *
                    </Label>
                    {isRoutesLoading ? (
                      <div className="h-9 flex items-center text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading routes...
                      </div>
                    ) : (
                      <ReusableSelect
                        value={routeId}
                        onValueChange={handleRouteChange}
                        options={routeOptions}
                        placeholder="Select ferry route..."
                      />
                    )}
                  </div>

                  {/* Ferry Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Assign Ferry *
                    </Label>
                    {isFerriesLoading ? (
                      <div className="h-9 flex items-center text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading ferries...
                      </div>
                    ) : (
                      <ReusableSelect
                        value={ferryId}
                        onValueChange={setFerryId}
                        options={ferryOptions}
                        placeholder={
                          ferryOptions.length === 0
                            ? "No in-service ferries available"
                            : "Select ferry..."
                        }
                      />
                    )}
                  </div>
                </>
              )}

              {/* Departure DateTime */}
              <div className="space-y-1.5">
                <Label htmlFor="dep-datetime" className="text-xs font-semibold text-foreground">
                  Departure Time *
                </Label>
                <Input
                  id="dep-datetime"
                  type="datetime-local"
                  value={departureDateTime}
                  onChange={(e) => handleDepartureChange(e.target.value)}
                  required
                  className="text-xs h-9 font-mono"
                />
                {departureZone && (
                  <p className="text-[10px] text-muted-foreground">
                    Times are in {departurePortName ?? "the departure port"} local time (
                    {portZoneLabel(new Date(), departureZone)})
                  </p>
                )}
              </div>

              {/* Arrival DateTime */}
              <div className="space-y-1.5">
                <Label htmlFor="arr-datetime" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Arrival Time *</span>
                  {selectedRoute?.durationMinutes && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      ≈ {selectedRoute.durationMinutes} mins trip
                    </span>
                  )}
                </Label>
                <Input
                  id="arr-datetime"
                  type="datetime-local"
                  value={arrivalDateTime}
                  onChange={(e) => setArrivalDateTime(e.target.value)}
                  required
                  className="text-xs h-9 font-mono"
                />
                {arrivalZone && (
                  <p className="text-[10px] text-muted-foreground">
                    Times are in {arrivalPortName ?? "the arrival port"} local time (
                    {portZoneLabel(new Date(), arrivalZone)})
                  </p>
                )}
              </div>

              {/* Live Status when Editing */}
              {isEditing && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Live Departure Status *
                  </Label>
                  <ReusableSelect
                    value={status}
                    onValueChange={(val) => setStatus(val as OperatorScheduleStatus)}
                    options={STATUS_OPTIONS}
                    placeholder="Select status..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. Ticket Prices */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-emerald-600" />
              2. Ticket Prices
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="adultFare" className="text-xs font-semibold text-foreground">
                  Adult Ticket Price ($) *
                </Label>
                <Input
                  id="adultFare"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 25"
                  value={adultFare}
                  onChange={(e) => setAdultFare(e.target.value)}
                  required
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="childFare" className="text-xs font-semibold text-foreground">
                  Child Ticket Price ($)
                </Label>
                <Input
                  id="childFare"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 15"
                  value={childFare}
                  onChange={(e) => setChildFare(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Round Trip & Same Day Return fares for bookings that start on this trip */}
            <div className="space-y-2 pt-1">
              <div>
                <Label className="text-xs font-semibold text-foreground">Return Trip Fares (per passenger)</Label>
                <p className="text-[10px] text-muted-foreground">
                  Price for the whole return journey when a booking starts on this sailing. Leave a fare empty if
                  that option is not offered.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BUNDLE_FARE_FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`schedule-${key}`} className="text-xs font-semibold text-foreground">
                      {label}
                    </Label>
                    <Input
                      id={`schedule-${key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Not offered"
                      value={bundleFares[key]}
                      onChange={(e) => setBundleFares((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                <>
                  <Ship className="h-3.5 w-3.5" /> Schedule Departure
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
