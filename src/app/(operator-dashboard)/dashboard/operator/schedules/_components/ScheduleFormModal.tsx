import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
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

export interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSchedule: IOperatorSchedule | null;
  routes: IRoute[];
  ferries: IFerry[];
  isRoutesLoading: boolean;
  isFerriesLoading: boolean;
  onSubmitCreate: (data: {
    routeId: string;
    ferryId: string;
    departureTime: string;
    arrivalTime: string;
    adultFare: number;
    childFare?: number;
  }) => Promise<void>;
  onSubmitUpdate: (data: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    status: OperatorScheduleStatus;
    adultFare: number;
    childFare?: number;
  }) => Promise<void>;
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

  // Sync state on open / edit change
  React.useEffect(() => {
    if (editingSchedule) {
      setRouteId(editingSchedule.routeId || "");
      setFerryId(editingSchedule.ferryId || "");
      try {
        const dep = parseISO(editingSchedule.departureTime);
        const arr = parseISO(editingSchedule.arrivalTime);
        setDepartureDateTime(format(dep, "yyyy-MM-dd'T'HH:mm"));
        setArrivalDateTime(format(arr, "yyyy-MM-dd'T'HH:mm"));
      } catch {
        setDepartureDateTime(editingSchedule.departureTime.slice(0, 16));
        setArrivalDateTime(editingSchedule.arrivalTime.slice(0, 16));
      }
      setAdultFare(String(editingSchedule.adultFare));
      setChildFare(editingSchedule.childFare != null ? String(editingSchedule.childFare) : "");
      setStatus(editingSchedule.status || "ON_TIME");
    } else {
      setRouteId("");
      setFerryId("");
      setDepartureDateTime("");
      setArrivalDateTime("");
      setAdultFare("25");
      setChildFare("15");
      setStatus("ON_TIME");
    }
  }, [editingSchedule, isOpen]);

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

  const selectedFerry = React.useMemo(() => {
    const targetId = isEditing ? editingSchedule?.ferryId : ferryId;
    return ferries.find((f) => f.id === targetId);
  }, [ferries, isEditing, editingSchedule?.ferryId, ferryId]);

  // Departure auto-calculation helper
  const handleDepartureChange = (value: string) => {
    setDepartureDateTime(value);
    if (value && selectedRoute?.durationMinutes) {
      const depDate = new Date(value);
      if (!isNaN(depDate.getTime())) {
        const arrDate = new Date(depDate.getTime() + selectedRoute.durationMinutes * 60 * 1000);
        setArrivalDateTime(format(arrDate, "yyyy-MM-dd'T'HH:mm"));
      }
    }
  };

  const handleRouteChange = (val: string) => {
    setRouteId(val);
    const chosenRoute = routes.find((r) => r.id === val);
    if (departureDateTime && chosenRoute?.durationMinutes) {
      const depDate = new Date(departureDateTime);
      if (!isNaN(depDate.getTime())) {
        const arrDate = new Date(depDate.getTime() + chosenRoute.durationMinutes * 60 * 1000);
        setArrivalDateTime(format(arrDate, "yyyy-MM-dd'T'HH:mm"));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!departureDateTime || !arrivalDateTime) {
      toast.error("Please select departure and arrival times.");
      return;
    }

    const depDate = new Date(departureDateTime);
    const arrDate = new Date(arrivalDateTime);
    if (arrDate <= depDate) {
      toast.error("Arrival time must be later than departure time.");
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
        departureTime: depDate.toISOString(),
        arrivalTime: arrDate.toISOString(),
        adultFare: Number(adultFare) || 25,
        childFare: childFare ? Number(childFare) : undefined
      });
    } else if (editingSchedule) {
      await onSubmitUpdate({
        id: editingSchedule.id,
        departureTime: depDate.toISOString(),
        arrivalTime: arrDate.toISOString(),
        status,
        adultFare: Number(adultFare) || 25,
        childFare: childFare ? Number(childFare) : undefined
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
                No active routes registered. Please add a ferry route in{" "}
                <Link href="/dashboard/operator/routes" className="underline font-bold">
                  Route Management
                </Link>{" "}
                before scheduling departures.
              </span>
            </div>
          )}

          {!isEditing && ferries.length === 0 && !isFerriesLoading && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                No ferries registered. Please register a ferry in{" "}
                <Link href="/dashboard/operator/ferries" className="underline font-bold">
                  Ferry Management
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
