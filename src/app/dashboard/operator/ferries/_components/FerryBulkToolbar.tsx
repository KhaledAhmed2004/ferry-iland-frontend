import * as React from "react";
import { Check, Wrench } from "lucide-react";
import type { VesselStatus } from "@/types";
import { BulkActionToolbar } from "@/widgets";

export interface FerryBulkToolbarProps {
  selectedCount: number;
  totalCount?: number;
  displayedCount?: number;
  isBulkOperating: boolean;
  bulkActionType: "in_service" | "maintenance" | "delete" | null;
  onBulkSetStatus: (status: VesselStatus) => void;
  onOpenBulkDelete: () => void;
  onClearSelection: () => void;
}

export function FerryBulkToolbar({
  selectedCount,
  totalCount,
  displayedCount,
  isBulkOperating,
  bulkActionType,
  onBulkSetStatus,
  onOpenBulkDelete,
  onClearSelection
}: FerryBulkToolbarProps) {
  return (
    <BulkActionToolbar
      selectedCount={selectedCount}
      totalCount={totalCount}
      displayedCount={displayedCount}
      itemLabel="ferries"
      isOperating={isBulkOperating}
      onClearSelection={onClearSelection}
      onDelete={onOpenBulkDelete}
      deleteLabel="Delete"
      isDeleting={isBulkOperating && bulkActionType === "delete"}
      actions={[
        {
          label: "In Service",
          icon: <Check className="h-3.5 w-3.5 stroke-[2.5]" />,
          onClick: () => onBulkSetStatus("IN_SERVICE"),
          isLoading: isBulkOperating && bulkActionType === "in_service",
          className:
            "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        },
        {
          label: "Maintenance",
          icon: <Wrench className="h-3.5 w-3.5" />,
          onClick: () => onBulkSetStatus("MAINTENANCE"),
          isLoading: isBulkOperating && bulkActionType === "maintenance",
          className:
            "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
        }
      ]}
    />
  );
}
