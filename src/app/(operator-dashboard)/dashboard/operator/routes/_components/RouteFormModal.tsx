import * as React from "react";
import { AlertTriangle, Clock, Compass, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateRouteMutation, useUpdateRouteMutation } from "@/hooks";
import type { ICreateRoutePayload, IPort, IRoute, IUpdateRoutePayload, RouteStatus } from "@/types";
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
  ReusableSelect,
  ScrollArea
} from "@/ui";
import { RouteImageUploader } from "@/widgets";
import { formatDuration } from "./routes-columns";

const ROUTE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active (Available for trips)" },
  { value: "INACTIVE", label: "Inactive (Temporarily paused)" }
];

export interface RouteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeToEdit: IRoute | null;
  ports: IPort[];
  isPortsLoading: boolean;
  onSuccess: (savedRoute: IRoute, isNew: boolean) => void;
}

function RouteFormModalDialog({
  isOpen,
  onClose,
  routeToEdit,
  ports,
  isPortsLoading,
  onSuccess
}: RouteFormModalProps) {
  const isEdit = Boolean(routeToEdit);
  const createMutation = useCreateRouteMutation();
  const updateMutation = useUpdateRouteMutation();

  const [formData, setFormData] = React.useState({
    departurePortId: routeToEdit?.departurePortId ?? ports[0]?.id ?? "",
    destinationPortId: routeToEdit?.destinationPortId ?? ports[1]?.id ?? "",
    durationMinutes: routeToEdit?.durationMinutes ?? 60,
    description: routeToEdit?.description ?? "",
    imageUrl: routeToEdit?.imageUrl ?? "",
    isBorderCrossing: routeToEdit?.isBorderCrossing ?? false,
    status: (routeToEdit?.status ?? "ACTIVE") as RouteStatus
  });

  // Port select options
  const portOptions = React.useMemo(() => {
    return ports.map((p) => ({
      value: p.id,
      label: p.name
    }));
  }, [ports]);

  const destinationPortOptions = React.useMemo(() => {
    return portOptions.filter((opt) => opt.value !== formData.departurePortId);
  }, [portOptions, formData.departurePortId]);

  const isSamePort = Boolean(
    !isEdit &&
      formData.departurePortId &&
      formData.destinationPortId &&
      formData.departurePortId === formData.destinationPortId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit) {
      if (!formData.departurePortId || !formData.destinationPortId) {
        toast.error("Please select both Departure Port and Arrival Port.");
        return;
      }

      if (formData.departurePortId === formData.destinationPortId) {
        toast.error("Departure port and arrival port cannot be the same.");
        return;
      }
    }

    if (!formData.durationMinutes || formData.durationMinutes < 1) {
      toast.error("Please enter a valid estimated travel time.");
      return;
    }

    if (!formData.description || !formData.description.trim()) {
      toast.error("Route description is required.");
      return;
    }

    if (!formData.imageUrl || !formData.imageUrl.trim()) {
      toast.error("Route cover photo is required. Please upload an image.");
      return;
    }

    try {
      if (isEdit && routeToEdit) {
        const payload: IUpdateRoutePayload = {
          durationMinutes: Number(formData.durationMinutes),
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          isBorderCrossing: formData.isBorderCrossing,
          status: formData.status
        };

        const res = await updateMutation.mutateAsync({
          id: routeToEdit.id,
          payload
        });

        if (res?.data) {
          onSuccess(res.data, false);
        }
      } else {
        const payload: ICreateRoutePayload = {
          departurePortId: formData.departurePortId,
          destinationPortId: formData.destinationPortId,
          durationMinutes: Number(formData.durationMinutes),
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          isBorderCrossing: formData.isBorderCrossing,
          status: formData.status
        };

        const res = await createMutation.mutateAsync(payload);

        if (res?.data) {
          onSuccess(res.data, true);
        }
      }
      onClose();
    } catch {
      // Handled in mutation onError
    }
  };

  const isPending = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-border/60 border-b px-6 py-4 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {isEdit ? <Edit className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-foreground text-base font-bold">
                {isEdit ? "Edit Ferry Route" : "Add New Ferry Route"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? `${routeToEdit?.departurePort?.name} ➔ ${routeToEdit?.destinationPort?.name}`
                  : "Connect departure and arrival ports, specify estimated travel duration, descriptions, and set route status."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="h-[min(65vh,520px)] w-full">
            <div className="space-y-4 px-6 py-4">
              {/* Departure and Arrival Port selection (for Add Mode only) */}
              {!isEdit && (
                <>
                  {isSamePort && (
                    <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Departure port and arrival port cannot be the same.
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-foreground text-xs font-semibold">From *</Label>
                      {isPortsLoading ? (
                        <div className="text-muted-foreground flex h-9 items-center text-xs">
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Loading ports...
                        </div>
                      ) : (
                        <ReusableSelect
                          value={formData.departurePortId}
                          onValueChange={(val) =>
                            setFormData((prev) => {
                              let nextDest = prev.destinationPortId;
                              if (val === nextDest) {
                                const alternative = ports.find((p) => p.id !== val);
                                nextDest = alternative ? alternative.id : "";
                              }
                              return { ...prev, departurePortId: val, destinationPortId: nextDest };
                            })
                          }
                          options={portOptions}
                          placeholder="Select departure port..."
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-foreground text-xs font-semibold">To *</Label>
                      {isPortsLoading ? (
                        <div className="text-muted-foreground flex h-9 items-center text-xs">
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Loading ports...
                        </div>
                      ) : (
                        <ReusableSelect
                          value={formData.destinationPortId}
                          onValueChange={(val) =>
                            setFormData((prev) => ({ ...prev, destinationPortId: val }))
                          }
                          options={
                            destinationPortOptions.length > 0 ? destinationPortOptions : portOptions
                          }
                          placeholder="Select arrival port..."
                        />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Travel Time */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="route-durationMinutes" className="text-foreground text-xs font-semibold">
                    Estimated Travel Time *
                  </Label>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    ≈ {formatDuration(formData.durationMinutes)}
                  </span>
                </div>
                <div className="relative">
                  <Clock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="route-durationMinutes"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 60"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        durationMinutes: parseInt(e.target.value, 10) || 0
                      }))
                    }
                    required
                    className="h-9 pr-16 pl-9 text-xs"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute top-2.5 right-3 text-xs">
                    minutes
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="route-description" className="text-foreground text-xs font-semibold">
                  Route Description *
                </Label>
                <textarea
                  id="route-description"
                  rows={2}
                  required
                  placeholder="e.g. Direct scenic speed ferry connection between Malé and Maafushi with crystal blue lagoon views."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border p-2.5 text-xs shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Route Cover Photo Uploader */}
              <RouteImageUploader
                label="Route Cover Photo *"
                entityName="route"
                value={formData.imageUrl}
                onChange={(val) => setFormData((prev) => ({ ...prev, imageUrl: val }))}
              />

              {/* Status & Border Crossing */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs font-semibold">Route Status *</Label>
                  <ReusableSelect
                    value={formData.status}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, status: val as RouteStatus }))
                    }
                    options={ROUTE_STATUS_OPTIONS}
                    placeholder="Select route status..."
                  />
                </div>

                <div className="bg-muted/20 border-border/70 flex items-center gap-3 self-end rounded-xl border p-2.5">
                  <input
                    type="checkbox"
                    id="route-borderCrossing"
                    checked={formData.isBorderCrossing}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isBorderCrossing: e.target.checked }))
                    }
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <Label
                      htmlFor="route-borderCrossing"
                      className="text-foreground block cursor-pointer text-xs leading-none font-medium"
                    >
                      Cross-Border / International Route
                    </Label>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                      Requires passport & customs clearance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="shrink-0 border-border/60 bg-muted/40 border-t px-6 py-3.5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isPending ||
                (!isEdit && (ports.length < 2 || isSamePort || !formData.departurePortId || !formData.destinationPortId))
              }
              className="bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {isEdit ? "Saving Changes..." : "Creating Route..."}
                </>
              ) : (
                isEdit ? "Save Changes" : "Create Route"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RouteFormModal(props: RouteFormModalProps) {
  if (!props.isOpen) return null;

  return (
    <RouteFormModalDialog
      key={props.routeToEdit?.id ?? "new-route"}
      {...props}
    />
  );
}
