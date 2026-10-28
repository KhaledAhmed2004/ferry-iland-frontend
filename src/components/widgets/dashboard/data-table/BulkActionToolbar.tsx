import * as React from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/ui";
import { cn } from "@/lib/utils";

export interface BulkActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  title?: string;
}

export interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount?: number;
  displayedCount?: number;
  itemLabel?: string;
  isOperating?: boolean;
  operatingLabel?: string;
  onClearSelection: () => void;
  onSelectAllAcrossPages?: () => void;
  isAllAcrossPagesSelected?: boolean;
  actions?: BulkActionButton[];
  onDelete?: () => void;
  deleteLabel?: string;
  isDeleting?: boolean;
  position?: "top" | "bottom";
  className?: string;
  badgeColor?: "emerald" | "blue";
}

export function BulkActionToolbar({
  selectedCount,
  totalCount,
  displayedCount,
  itemLabel = "items",
  isOperating = false,
  operatingLabel,
  onClearSelection,
  onSelectAllAcrossPages,
  isAllAcrossPagesSelected = false,
  actions = [],
  onDelete,
  deleteLabel = "Delete",
  isDeleting = false,
  position = "top",
  className,
  badgeColor = "emerald"
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  const positionClasses =
    position === "top"
      ? "sticky top-4 z-30"
      : "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]";

  const isBlue = badgeColor === "blue";

  return (
    <div
      className={cn(
        "bg-card/95 dark:bg-card/90 animate-in fade-in slide-in-from-top-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-md transition-all duration-200",
        isBlue ? "border-blue-500/30" : "border-emerald-500/30",
        positionClasses,
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white shadow-2xs",
            isBlue ? "bg-blue-600" : "bg-emerald-600"
          )}
        >
          {selectedCount}
        </span>
        <span className="text-foreground text-xs font-semibold whitespace-nowrap">
          {selectedCount === 1 ? `1 ${itemLabel.replace(/s$/, "")} selected` : `${selectedCount} ${itemLabel} selected`}
        </span>

        {totalCount &&
          displayedCount &&
          totalCount > displayedCount &&
          selectedCount < totalCount &&
          onSelectAllAcrossPages &&
          !isAllAcrossPagesSelected && (
            <button
              type="button"
              onClick={onSelectAllAcrossPages}
              className={cn(
                "ml-2 cursor-pointer text-xs font-semibold underline-offset-4 hover:underline whitespace-nowrap",
                isBlue ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              Select all {totalCount} {itemLabel} across all pages
            </button>
          )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((act, idx) => (
          <Button
            key={idx}
            variant={act.variant ?? "outline"}
            size="sm"
            disabled={isOperating || act.disabled}
            onClick={act.onClick}
            title={act.title ?? act.label}
            className={cn("h-8 cursor-pointer gap-1.5 text-xs font-semibold shadow-2xs", act.className)}
          >
            {act.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : act.icon}
            <span>{act.label}</span>
          </Button>
        ))}

        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            disabled={isOperating || isDeleting}
            onClick={onDelete}
            className="h-8 cursor-pointer gap-1.5 bg-rose-600 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700"
            title={`Delete ${selectedCount} selected ${itemLabel}`}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>
              {deleteLabel} ({selectedCount})
            </span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={isOperating}
          onClick={onClearSelection}
          className="text-muted-foreground hover:text-foreground h-8 cursor-pointer gap-1 text-xs"
          title="Deselect all"
        >
          <X className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Deselect</span>
        </Button>

        {isOperating && operatingLabel && (
          <span className="text-[11px] text-muted-foreground animate-pulse flex items-center gap-1.5 shrink-0 pl-1">
            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
            {operatingLabel}
          </span>
        )}
      </div>
    </div>
  );
}
