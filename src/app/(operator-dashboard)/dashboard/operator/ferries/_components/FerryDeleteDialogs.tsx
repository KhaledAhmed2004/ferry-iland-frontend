import * as React from "react";
import { AlertTriangle, Loader2, Ship, Trash2 } from "lucide-react";
import type { IFerry } from "@/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/ui";

export interface FerryDeleteDialogsProps {
  deletingFerry: IFerry | null;
  isBulkDeleteModalOpen: boolean;
  selectedCount: number;
  isBulkOperating: boolean;
  isDeletingSingle: boolean;
  onCloseSingle: () => void;
  onConfirmSingleDelete: () => void | Promise<void>;
  onCloseBulk: () => void;
  onConfirmBulkDelete: () => void | Promise<void>;
}

export function FerryDeleteDialogs({
  deletingFerry,
  isBulkDeleteModalOpen,
  selectedCount,
  isBulkOperating,
  isDeletingSingle,
  onCloseSingle,
  onConfirmSingleDelete,
  onCloseBulk,
  onConfirmBulkDelete
}: FerryDeleteDialogsProps) {
  return (
    <>
      {/* Single Delete Confirmation Modal */}
      <Dialog open={!!deletingFerry} onOpenChange={(open) => !open && onCloseSingle()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Remove Ferry
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Are you sure you want to remove this vessel from your registered fleet?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deletingFerry && (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-1.5 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Ship className="h-4 w-4 text-emerald-600" />
                <span>{deletingFerry.name}</span>
                <span className="font-mono text-muted-foreground">({deletingFerry.registration})</span>
              </div>
              <div className="text-muted-foreground text-[11px]">
                Capacity: {deletingFerry.capacity} passengers • Type: {deletingFerry.type}
              </div>
              <div className="mt-2 text-rose-600 font-semibold text-[11px] bg-rose-500/10 p-2 rounded-lg">
                ⚠️ Notice: If this ferry is currently assigned to future scheduled departures, deletion may be restricted by the database.
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingSingle}
              onClick={onCloseSingle}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeletingSingle}
              onClick={onConfirmSingleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              {isDeletingSingle ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Removing...
                </>
              ) : (
                "Yes, Remove Ferry"
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
                  Remove {selectedCount} {selectedCount === 1 ? "Ferry" : "Ferries"}?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This action removes the selected vessels from your fleet.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <p>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">
                {selectedCount} selected {selectedCount === 1 ? "ferry" : "ferries"}
              </strong>
              ?
            </p>
            <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              Warning: Any vessels currently assigned to active departure schedules will remain protected from deletion.
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
              Yes, Remove {selectedCount} {selectedCount === 1 ? "Ferry" : "Ferries"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
