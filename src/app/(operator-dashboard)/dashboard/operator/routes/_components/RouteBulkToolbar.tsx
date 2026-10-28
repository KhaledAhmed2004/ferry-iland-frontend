import * as React from "react";
import { AlertTriangle, Check } from "lucide-react";
import { BulkActionToolbar } from "@/widgets";

export interface RouteBulkToolbarProps {
  selectedCount: number;
  totalCount: number;
  displayedCount: number;
  isAllCurrentPageSelected: boolean;
  onSelectAllAcrossPages: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onOpenBulkDelete: () => void;
  onClearSelection: () => void;
  isBulkOperating: boolean;
  bulkActionType: "activate" | "deactivate" | "delete" | null;
}

export function RouteBulkToolbar({
  selectedCount,
  totalCount,
  displayedCount,
  onSelectAllAcrossPages,
  onBulkActivate,
  onBulkDeactivate,
  onOpenBulkDelete,
  onClearSelection,
  isBulkOperating,
  bulkActionType
}: RouteBulkToolbarProps) {
  return (
    <BulkActionToolbar
      selectedCount={selectedCount}
      totalCount={totalCount}
      displayedCount={displayedCount}
      itemLabel="routes"
      isOperating={isBulkOperating}
      onClearSelection={onClearSelection}
      onSelectAllAcrossPages={onSelectAllAcrossPages}
      onDelete={onOpenBulkDelete}
      deleteLabel="Delete"
      isDeleting={isBulkOperating && bulkActionType === "delete"}
      actions={[
        {
          label: "Activate",
          icon: <Check className="h-3.5 w-3.5 stroke-[2.5]" />,
          onClick: onBulkActivate,
          isLoading: isBulkOperating && bulkActionType === "activate",
          className:
            "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        },
        {
          label: "Pause",
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          onClick: onBulkDeactivate,
          isLoading: isBulkOperating && bulkActionType === "deactivate",
          className:
            "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
        }
      ]}
    />
  );
}
