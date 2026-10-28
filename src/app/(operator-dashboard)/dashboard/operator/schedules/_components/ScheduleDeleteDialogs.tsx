import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { AlertTriangle, Clock, Loader2, Ship, Trash2 } from "lucide-react";
import type { IOperatorSchedule } from "@/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/ui";

export interface ScheduleDeleteDialogsProps {
  deletingSchedule: IOperatorSchedule | null;
  isBulkDeleteModalOpen: boolean;
  selectedCount: number;
  isBulkOperating: boolean;
  isDeletingSingle: boolean;
  onCloseSingle: () => void;
  onConfirmSingleDelete: () => void | Promise<void>;
  onCloseBulk: () => void;
  onConfirmBulkDelete: () => void | Promise<void>;
}

export function ScheduleDeleteDialogs({
  deletingSchedule,
  isBulkDeleteModalOpen,
  selectedCount,
  isBulkOperating,
  isDeletingSingle,
  onCloseSingle,
  onConfirmSingleDelete,
  onCloseBulk,
  onConfirmBulkDelete
}: ScheduleDeleteDialogsProps) {
  return (
    <>
      {/* Single Delete Confirmation Modal */}
      <Dialog open={!!deletingSchedule} onOpenChange={(open) => !open && onCloseSingle()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Delete Departure Schedule
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Are you sure you want to delete this scheduled ferry departure?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deletingSchedule && (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-1.5 text-xs">
              <div className="font-semibold text-foreground">
                {deletingSchedule.route?.departurePort?.name ?? "Origin"} ➔ {deletingSchedule.route?.destinationPort?.name ?? "Destination"}
              </div>
              <div className="text-muted-foreground flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                {isValid(parseISO(deletingSchedule.departureTime))
                  ? format(parseISO(deletingSchedule.departureTime), "hh:mm a, dd MMM yyyy")
                  : deletingSchedule.departureTime}
              </div>
              <div className="text-muted-foreground flex items-center gap-1">
                <Ship className="h-3.5 w-3.5 text-blue-600" />
                {deletingSchedule.ferry?.name ?? "Assigned Ferry"}
              </div>
              {(deletingSchedule._count?.bookings ?? 0) > 0 && (
                <div className="mt-2 text-rose-600 font-bold bg-rose-500/10 p-2 rounded-lg">
                  ⚠️ Caution: {deletingSchedule._count?.bookings} passenger bookings are already confirmed on this trip.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingSingle}
              onClick={onCloseSingle}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeletingSingle}
              onClick={onConfirmSingleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
            >
              {isDeletingSingle ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Deleting...
                </>
              ) : (
                "Delete Schedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={(open) => !open && onCloseBulk()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Delete {selectedCount} Departure {selectedCount === 1 ? "Schedule" : "Schedules"}?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This action permanently removes the selected departure slots from the timetable.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <p>
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">
                {selectedCount} selected {selectedCount === 1 ? "schedule" : "schedules"}
              </strong>
              ?
            </p>
            <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              Warning: Any confirmed passenger bookings associated with these departure schedules will require refunds or manual reassignment. This action cannot be reversed.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isBulkOperating}
              onClick={onCloseBulk}
              className="text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isBulkOperating}
              onClick={onConfirmBulkDelete}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 cursor-pointer"
            >
              {isBulkOperating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Yes, Delete {selectedCount} {selectedCount === 1 ? "Schedule" : "Schedules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
