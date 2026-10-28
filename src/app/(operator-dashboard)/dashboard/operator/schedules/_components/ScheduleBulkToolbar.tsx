import * as React from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Ship,
  Users
} from "lucide-react";
import type { OperatorScheduleStatus } from "@/types";
import { BulkActionToolbar } from "@/widgets";

export interface ScheduleBulkToolbarProps {
  selectedCount: number;
  totalCount?: number;
  displayedCount?: number;
  isBulkOperating: boolean;
  bulkActionType: "on_time" | "boarding" | "departed" | "delayed" | "arrived" | "cancelled" | "delete" | null;
  onBulkSetStatus: (status: OperatorScheduleStatus) => void;
  onOpenBulkDelete: () => void;
  onClearSelection: () => void;
}

export function ScheduleBulkToolbar({
  selectedCount,
  totalCount,
  displayedCount,
  isBulkOperating,
  bulkActionType,
  onBulkSetStatus,
  onOpenBulkDelete,
  onClearSelection
}: ScheduleBulkToolbarProps) {
  return (
    <BulkActionToolbar
      selectedCount={selectedCount}
      totalCount={totalCount}
      displayedCount={displayedCount}
      itemLabel="schedules"
      isOperating={isBulkOperating}
      onClearSelection={onClearSelection}
      onDelete={onOpenBulkDelete}
      deleteLabel="Delete"
      isDeleting={isBulkOperating && bulkActionType === "delete"}
      actions={[
        {
          label: "On Time",
          icon: <Clock className="h-3.5 w-3.5" />,
          onClick: () => onBulkSetStatus("ON_TIME"),
          isLoading: isBulkOperating && bulkActionType === "on_time",
          className:
            "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        },
        {
          label: "Boarding",
          icon: <Users className="h-3.5 w-3.5" />,
          onClick: () => onBulkSetStatus("BOARDING"),
          isLoading: isBulkOperating && bulkActionType === "boarding",
          className:
            "border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
        },
        {
          label: "Departed",
          icon: <Ship className="h-3.5 w-3.5" />,
          onClick: () => onBulkSetStatus("DEPARTED"),
          isLoading: isBulkOperating && bulkActionType === "departed",
          className:
            "border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
        },
        {
          label: "Delayed",
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          onClick: () => onBulkSetStatus("DELAYED"),
          isLoading: isBulkOperating && bulkActionType === "delayed",
          className:
            "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
        },
        {
          label: "Arrived",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          onClick: () => onBulkSetStatus("ARRIVED"),
          isLoading: isBulkOperating && bulkActionType === "arrived",
          className:
            "border-teal-200 bg-teal-50/50 text-teal-700 hover:bg-teal-100 hover:text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60"
        },
        {
          label: "Cancel",
          icon: <Ban className="h-3.5 w-3.5" />,
          onClick: () => onBulkSetStatus("CANCELLED"),
          isLoading: isBulkOperating && bulkActionType === "cancelled",
          className:
            "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
        }
      ]}
    />
  );
}
