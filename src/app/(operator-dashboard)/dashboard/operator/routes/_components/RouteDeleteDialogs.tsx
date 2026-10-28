import { ArrowRight, Loader2, Trash2 } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/ui";
import type { IRoute } from "@/types";

import { formatDuration } from "./routes-columns";

export interface RouteDeleteDialogsProps {
  deletingRoute: IRoute | null;
  onCloseSingle: () => void;
  onConfirmSingle: () => void;
  isSingleDeleting: boolean;
  isBulkOpen: boolean;
  onCloseBulk: () => void;
  onConfirmBulk: () => void;
  selectedCount: number;
  selectedRoutesList: IRoute[];
  isBulkOperating: boolean;
}

export function RouteDeleteDialogs({
  deletingRoute,
  onCloseSingle,
  onConfirmSingle,
  isSingleDeleting,
  isBulkOpen,
  onCloseBulk,
  onConfirmBulk,
  selectedCount,
  selectedRoutesList,
  isBulkOperating
}: RouteDeleteDialogsProps) {
  return (
    <>
      {/* 1. Single Route Delete Confirmation Modal */}
      <Dialog
        open={!!deletingRoute}
        onOpenChange={(open) => !open && !isSingleDeleting && onCloseSingle()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-base font-bold">
                  Delete Ferry Route
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Are you sure you want to remove this route from your fleet network?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-muted-foreground py-2 text-xs leading-relaxed">
            Route:{" "}
            <span className="text-foreground font-semibold">
              {deletingRoute?.departurePort?.name} ➔ {deletingRoute?.destinationPort?.name}
            </span>
            . Any passenger trips scheduled on this route might be affected or canceled. This action
            cannot be undone.
          </div>

          <DialogFooter className="border-border/60 flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSingleDeleting}
              onClick={onCloseSingle}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSingleDeleting}
              onClick={onConfirmSingle}
              className="bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
            >
              {isSingleDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting Route...
                </>
              ) : (
                "Delete Route"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkOpen} onOpenChange={(open) => !open && !isBulkOperating && onCloseBulk()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-base font-bold">
                  Delete {selectedCount} Ferry {selectedCount === 1 ? "Route" : "Routes"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Are you sure you want to permanently delete {selectedCount} selected routes from
                  your fleet?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Any future passenger trips or active bookings associated with these routes may be
              affected. This action cannot be undone.
            </p>

            <div className="border-border/60 bg-muted/40 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border p-2.5">
              {selectedRoutesList.map((r) => (
                <div
                  key={r.id}
                  className="bg-card/70 border-border/40 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs shadow-2xs"
                >
                  <div className="text-foreground flex items-center gap-1.5 font-medium">
                    <span>{r.departurePort?.name || "Departure"}</span>
                    <ArrowRight className="text-muted-foreground h-3 w-3 shrink-0" />
                    <span>{r.destinationPort?.name || "Arrival"}</span>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">
                    {formatDuration(r.durationMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="border-border/60 flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBulkOperating}
              onClick={onCloseBulk}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBulkOperating}
              onClick={onConfirmBulk}
              className="bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
            >
              {isBulkOperating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting {selectedCount} Routes...
                </>
              ) : (
                `Delete ${selectedCount} ${selectedCount === 1 ? "Route" : "Routes"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
